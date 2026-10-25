const crypto = require('node:crypto');
const { getDb } = require('../../db');

// Code generation characters avoiding visually ambiguous characters (0, O, 1, I)
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOBBY_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes lifetime

class LobbyCodeRateLimiter {
  constructor(db) {
    this.db = db;
    this.maxAttempts = 5;
    this.windowMs = 5 * 60 * 1000; // 5-minute sliding window
    this.lockoutMs = 5 * 60 * 1000; // 5-minute lockout
    this.records = new Map();
  }

  getKey(type, identifier) {
    const clean = (identifier || 'unknown').toString().trim().toLowerCase().replace(/^.*:/, '');
    return `lobby_code:${type}:${clean}`;
  }

  getRecord(key) {
    let record = this.records.get(key);
    if (!record && this.db) {
      try {
        const row = this.db.prepare('SELECT * FROM auth_rate_limits WHERE key = ?').get(key);
        if (row) {
          record = {
            attemptCount: row.attempt_count,
            firstAttemptAt: new Date(row.first_attempt_at).getTime(),
            lastAttemptAt: new Date(row.last_attempt_at).getTime(),
            lockedUntil: row.locked_until ? new Date(row.locked_until).getTime() : null
          };
          this.records.set(key, record);
        }
      } catch (e) {}
    }
    return record;
  }

  saveRecord(key, record) {
    this.records.set(key, record);
    if (this.db) {
      try {
        const firstIso = new Date(record.firstAttemptAt).toISOString();
        const lastIso = new Date(record.lastAttemptAt).toISOString();
        const lockedIso = record.lockedUntil ? new Date(record.lockedUntil).toISOString() : null;
        this.db.prepare(
          `INSERT INTO auth_rate_limits (key, attempt_count, first_attempt_at, last_attempt_at, locked_until)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             attempt_count = excluded.attempt_count,
             first_attempt_at = excluded.first_attempt_at,
             last_attempt_at = excluded.last_attempt_at,
             locked_until = excluded.locked_until`
        ).run(key, record.attemptCount, firstIso, lastIso, lockedIso);
      } catch (e) {}
    }
  }

  checkLimit(ip, playerId) {
    const now = Date.now();
    const keys = [];
    if (ip) keys.push(this.getKey('ip', ip));
    if (playerId) keys.push(this.getKey('account', playerId));

    for (const k of keys) {
      const rec = this.getRecord(k);
      if (rec && rec.lockedUntil && now < rec.lockedUntil) {
        const retryAfterSeconds = Math.ceil((rec.lockedUntil - now) / 1000);
        const err = new Error(`Too many invalid invitation code attempts. Please wait ${retryAfterSeconds} seconds before trying again.`);
        err.status = 429;
        err.code = 'TOO_MANY_FAILED_ATTEMPTS';
        err.retryAfterSeconds = retryAfterSeconds;
        throw err;
      }
    }
  }

  recordFailure(ip, playerId) {
    const now = Date.now();
    const keys = [];
    if (ip) keys.push(this.getKey('ip', ip));
    if (playerId) keys.push(this.getKey('account', playerId));

    for (const k of keys) {
      let rec = this.getRecord(k);
      if (!rec || (now - rec.firstAttemptAt) > this.windowMs) {
        rec = { attemptCount: 1, firstAttemptAt: now, lastAttemptAt: now, lockedUntil: null };
      } else {
        rec.attemptCount += 1;
        rec.lastAttemptAt = now;
      }

      if (rec.attemptCount >= this.maxAttempts) {
        rec.lockedUntil = now + this.lockoutMs;
      }
      this.saveRecord(k, rec);
    }
  }

  recordSuccess(ip, playerId) {
    const keys = [];
    if (ip) keys.push(this.getKey('ip', ip));
    if (playerId) keys.push(this.getKey('account', playerId));

    for (const k of keys) {
      this.records.delete(k);
      if (this.db) {
        try {
          this.db.prepare('DELETE FROM auth_rate_limits WHERE key = ?').run(k);
        } catch (e) {}
      }
    }
  }
}

class LobbyService {
  constructor(dbManager) {
    this.dbManager = dbManager || getDb();
    this.db = this.dbManager.db;
    this.rateLimiter = new LobbyCodeRateLimiter(this.db);
  }

  /**
   * Generates a 6-character cryptographically random uppercase invitation code.
   */
  generateInvitationCode() {
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    }
    return code;
  }

  /**
   * Log an audit event for security and traceability.
   */
  logAuditEvent({ actorId, action, resource, details = {} }) {
    try {
      const id = 'audit-' + crypto.randomUUID();
      this.db.prepare(
        `INSERT INTO audit_events (id, actor_id, action, resource, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).run(id, actorId || 'system', action, resource, JSON.stringify(details));
    } catch (err) {
      console.error('[LOBBY_AUDIT_ERROR] Failed to record audit event:', err.message);
    }
  }

  /**
   * EP05-01 / AC-16.1 & AC-16.2: Create a two-player private lobby.
   */
  createLobby({ gameIdOrSlug, hostPlayerId }) {
    if (!hostPlayerId) {
      const err = new Error('Host player ID is required to create a lobby.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // 1. Verify host exists
    const host = this.db.prepare('SELECT id, email, display_name, status FROM players WHERE id = ?').get(hostPlayerId);
    if (!host || host.status !== 'active') {
      const err = new Error('Host player account is inactive or not found.');
      err.status = 403;
      err.code = 'PLAYER_INACTIVE';
      throw err;
    }

    // 2. Query target game
    const game = this.db.prepare(
      `SELECT g.id, g.slug, g.title, g.is_published, g.min_players, g.max_players, g.is_premium,
              COALESCE(l.status, 'pending') as licensing_status
       FROM games g
       LEFT JOIN licensing_approvals l ON g.id = l.game_id
       WHERE g.id = ? OR g.slug = ?`
    ).get(gameIdOrSlug, gameIdOrSlug);

    if (!game) {
      const err = new Error(`Game '${gameIdOrSlug}' does not exist.`);
      err.status = 404;
      err.code = 'GAME_NOT_FOUND';
      throw err;
    }

    // AC-16.2: Given the game is not eligible for private lobbies, creation is denied.
    // Requirements for two-player private lobby eligibility:
    // a. Must be published (is_published === 1)
    // b. Licensing must be approved (licensing_status === 'approved')
    // c. Must support at least 2 players (max_players >= 2)
    const isMultiplayerEligible = game.is_published === 1 &&
      game.licensing_status === 'approved' &&
      game.max_players >= 2;

    if (!isMultiplayerEligible) {
      let reason = 'Game is not eligible for two-player private lobbies.';
      if (game.max_players < 2) {
        reason = `Game '${game.title}' is a single-player game (max players: ${game.max_players}) and does not support multiplayer lobbies (AC-16.2).`;
      } else if (game.is_published !== 1) {
        reason = `Game '${game.title}' is in draft status and cannot be launched in multiplayer mode.`;
      } else if (game.licensing_status !== 'approved') {
        reason = `Game '${game.title}' has pending licensing review and is gated from multiplayer creation.`;
      }

      const err = new Error(reason);
      err.status = 422; // Unprocessable Entity
      err.code = 'GAME_NOT_ELIGIBLE_FOR_MULTIPLAYER';
      err.eligibilityDetails = {
        title: game.title,
        maxPlayers: game.max_players,
        isPublished: game.is_published === 1,
        licensingStatus: game.licensing_status
      };
      throw err;
    }

    // 3. Generate unique invitation code
    let code = this.generateInvitationCode();
    let collisionCheck = this.db.prepare("SELECT id FROM lobbies WHERE code = ? AND status IN ('waiting', 'full')").get(code);
    while (collisionCheck) {
      code = this.generateInvitationCode();
      collisionCheck = this.db.prepare("SELECT id FROM lobbies WHERE code = ? AND status IN ('waiting', 'full')").get(code);
    }

    const lobbyId = 'lobby-' + crypto.randomUUID().slice(0, 8);
    const expiresAt = new Date(Date.now() + LOBBY_EXPIRY_MS).toISOString();

    // AC-18.1: Given a lobby has an unfilled slot, waiting is shown
    const initialStatus = 'waiting';
    const maxPlayers = 2; // Strict two-player capacity for EP05-01

    // 4. Atomic transaction: create lobby and insert host participant
    this.dbManager.transaction(() => {
      this.db.prepare(
        `INSERT INTO lobbies (id, game_id, host_player_id, code, max_players, status, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).run(lobbyId, game.id, hostPlayerId, code, maxPlayers, initialStatus, expiresAt);

      const participantId = 'part-' + crypto.randomUUID().slice(0, 8);
      this.db.prepare(
        `INSERT INTO lobby_participants (id, lobby_id, player_id, role, status, joined_at)
         VALUES (?, ?, ?, 'host', 'connected', CURRENT_TIMESTAMP)`
      ).run(participantId, lobbyId, hostPlayerId);
    });

    this.logAuditEvent({
      actorId: hostPlayerId,
      action: 'LOBBY_CREATED',
      resource: `lobby:${lobbyId}`,
      details: { gameId: game.id, gameTitle: game.title, code, maxPlayers }
    });

    return this.getLobby(lobbyId);
  }

  /**
   * Retrieves complete lobby details including game, participants, and real-time state.
   */
  getLobby(lobbyId) {
    const lobby = this.db.prepare(
      `SELECT l.id, l.game_id, l.host_player_id, l.code, l.max_players, l.status,
              l.expires_at, l.started_at, l.ended_at, l.created_at,
              g.title as game_title, g.slug as game_slug, g.category_id
       FROM lobbies l
       JOIN games g ON l.game_id = g.id
       WHERE l.id = ?`
    ).get(lobbyId);

    if (!lobby) {
      const err = new Error(`Lobby '${lobbyId}' not found.`);
      err.status = 404;
      err.code = 'LOBBY_NOT_FOUND';
      throw err;
    }

    // Check expiry
    const now = Date.now();
    const expiryTime = lobby.expires_at ? new Date(lobby.expires_at).getTime() : 0;
    if (lobby.status === 'waiting' && expiryTime > 0 && now >= expiryTime) {
      this.db.prepare("UPDATE lobbies SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(lobbyId);
      lobby.status = 'ended';
      lobby.ended_at = new Date().toISOString();
    }

    // Retrieve participants
    const participants = this.db.prepare(
      `SELECT lp.id, lp.player_id, lp.role, lp.status, lp.joined_at,
              p.display_name, p.email,
              COALESCE(pp.avatar, 'pilot-cyan') as avatar
       FROM lobby_participants lp
       JOIN players p ON lp.player_id = p.id
       LEFT JOIN player_profiles pp ON p.id = pp.player_id
       WHERE lp.lobby_id = ? AND lp.status != 'left'
       ORDER BY lp.joined_at ASC`
    ).all(lobbyId);

    const playerCount = participants.length;

    return {
      id: lobby.id,
      code: lobby.code,
      status: lobby.status, // 'waiting', 'full', 'active', 'ended'
      game: {
        id: lobby.game_id,
        slug: lobby.game_slug,
        title: lobby.game_title,
        categoryId: lobby.category_id
      },
      hostPlayerId: lobby.host_player_id,
      maxPlayers: lobby.max_players,
      playerCount,
      isFull: playerCount >= lobby.max_players,
      isResumable: false,
      participants: participants.map(p => ({
        id: p.id,
        playerId: p.player_id,
        displayName: p.display_name,
        avatar: p.avatar,
        role: p.role,
        status: p.status,
        joinedAt: p.joined_at
      })),
      expiresAt: lobby.expires_at,
      startedAt: lobby.started_at,
      endedAt: lobby.ended_at,
      createdAt: lobby.created_at
    };
  }

  /**
   * Safe pre-authorization lobby preview that redacts participant identities and PII.
   */
  getLobbyPreview(lobbyId) {
    const lobby = this.getLobby(lobbyId);
    const hostUser = this.db.prepare('SELECT display_name FROM players WHERE id = ?').get(lobby.hostPlayerId);

    return {
      id: lobby.id,
      code: lobby.code,
      status: lobby.status,
      game: lobby.game,
      maxPlayers: lobby.maxPlayers,
      playerCount: lobby.playerCount,
      isFull: lobby.isFull,
      hostDisplayName: hostUser ? hostUser.display_name : 'Host',
      participants: [], // Redacted before authorization to prevent PII exposure
      expiresAt: lobby.expiresAt,
      createdAt: lobby.createdAt
    };
  }

  /**
   * Retrieves lobby by invitation code (case-insensitive).
   * Supports privacy preview for unjoined players and IP/account rate limiting.
   */
  getLobbyByCode(code, options = {}) {
    if (!code || typeof code !== 'string') return null;
    const cleanCode = code.trim().toUpperCase();
    const { ip = null, playerId = null, previewOnly = false } = options;

    if (ip) {
      this.rateLimiter.checkLimit(ip, playerId);
    }

    const row = this.db.prepare('SELECT id FROM lobbies WHERE UPPER(code) = ?').get(cleanCode);
    if (!row) {
      if (ip) {
        this.rateLimiter.recordFailure(ip, playerId);
      }
      return null;
    }

    if (previewOnly) {
      return this.getLobbyPreview(row.id);
    }
    return this.getLobby(row.id);
  }

  /**
   * EP05-02: Join lobby via invitation code.
   * Enforces AC-17.1 (valid code joins), AC-17.2 (invalid/expired code), AC-17.3 / AC-16.3 (full capacity).
   * Enforces rate limiting on failed attempts and duplicate join protection.
   */
  joinLobby({ code, playerId, ip = 'unknown' }) {
    if (!playerId) {
      const err = new Error('Authenticated player identity is required to join a lobby.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // Rate limiting check: check IP and account lockouts before processing code
    this.rateLimiter.checkLimit(ip, playerId);

    if (!code || typeof code !== 'string' || !code.trim()) {
      const err = new Error('Invitation code is required.');
      err.status = 400;
      err.code = 'INVALID_INVITATION_CODE';
      throw err;
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Verify player exists
    const player = this.db.prepare('SELECT id, display_name, status FROM players WHERE id = ?').get(playerId);
    if (!player || player.status !== 'active') {
      const err = new Error('Player account is inactive or not found.');
      err.status = 403;
      err.code = 'PLAYER_INACTIVE';
      throw err;
    }

    // 2. Query lobby by code
    const lobbyRow = this.db.prepare(
      `SELECT id, max_players, status, expires_at, host_player_id FROM lobbies WHERE UPPER(code) = ?`
    ).get(cleanCode);

    // AC-17.2: Non-existent code
    if (!lobbyRow) {
      this.rateLimiter.recordFailure(ip, playerId);
      const err = new Error(`Invitation code '${cleanCode}' is invalid or does not exist.`);
      err.status = 404;
      err.code = 'INVALID_INVITATION_CODE';
      throw err;
    }

    // AC-17.2: Expired code or ended lobby
    const now = Date.now();
    const expiryTime = lobbyRow.expires_at ? new Date(lobbyRow.expires_at).getTime() : 0;
    const isExpired = expiryTime > 0 && now >= expiryTime;

    if (isExpired || lobbyRow.status === 'ended') {
      if (lobbyRow.status !== 'ended') {
        this.db.prepare("UPDATE lobbies SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(lobbyRow.id);
      }
      this.rateLimiter.recordFailure(ip, playerId);
      const err = new Error(`Invitation code '${cleanCode}' has expired. Lobbies expire after 30 minutes.`);
      err.status = 410; // Gone
      err.code = 'INVITATION_CODE_EXPIRED';
      throw err;
    }

    // Check if player is already in this lobby (duplicate join protection)
    const existing = this.db.prepare(
      'SELECT id, role, status FROM lobby_participants WHERE lobby_id = ? AND player_id = ?'
    ).get(lobbyRow.id, playerId);

    if (existing && existing.status !== 'left') {
      // Already an active member; return current lobby representation without error
      this.rateLimiter.recordSuccess(ip, playerId);
      return this.getLobby(lobbyRow.id);
    }

    // Add guest participant atomically under BEGIN IMMEDIATE write lock
    const participantId = existing ? existing.id : ('part-' + crypto.randomUUID().slice(0, 8));

    this.dbManager.transaction(() => {
      // 1. Re-query current lobby state under transaction lock
      const currentLobby = this.db.prepare(
        "SELECT id, max_players, status FROM lobbies WHERE id = ?"
      ).get(lobbyRow.id);

      // 2. Re-check active participants count under transaction lock
      const activeParticipants = this.db.prepare(
        "SELECT COUNT(*) as count FROM lobby_participants WHERE lobby_id = ? AND status != 'left'"
      ).get(lobbyRow.id);

      const currentCount = activeParticipants ? activeParticipants.count : 0;

      // AC-16.3 & AC-17.3: Check capacity ceiling atomically
      if (currentCount >= currentLobby.max_players || currentLobby.status === 'full' || currentLobby.status === 'active') {
        const err = new Error(`Lobby '${cleanCode}' is already at maximum capacity (${currentLobby.max_players}/${currentLobby.max_players} players). Additional players cannot join (AC-16.3, AC-17.3).`);
        err.status = 409; // Conflict
        err.code = 'LOBBY_FULL';
        err.capacityDetails = {
          maxPlayers: currentLobby.max_players,
          currentCount,
          status: currentLobby.status
        };
        throw err;
      }

      if (existing) {
        this.db.prepare(
          "UPDATE lobby_participants SET status = 'connected', joined_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(participantId);
      } else {
        this.db.prepare(
          `INSERT INTO lobby_participants (id, lobby_id, player_id, role, status, joined_at)
           VALUES (?, ?, ?, 'guest', 'connected', CURRENT_TIMESTAMP)`
        ).run(participantId, lobbyRow.id, playerId);
      }

      // AC-18.2: When lobby reaches allowed capacity (2), update status to 'full'
      const updatedCount = currentCount + 1;
      if (updatedCount >= currentLobby.max_players) {
        this.db.prepare("UPDATE lobbies SET status = 'full' WHERE id = ?").run(lobbyRow.id);
      }
    });

    this.logAuditEvent({
      actorId: playerId,
      action: 'LOBBY_JOINED',
      resource: `lobby:${lobbyRow.id}`,
      details: { code: cleanCode, role: 'guest' }
    });

    this.rateLimiter.recordSuccess(ip, playerId);

    return this.getLobby(lobbyRow.id);
  }

  /**
   * Leave a lobby.
   */
  leaveLobby({ lobbyId, playerId }) {
    const lobby = this.getLobby(lobbyId);
    const participant = this.db.prepare(
      "SELECT id, role FROM lobby_participants WHERE lobby_id = ? AND player_id = ? AND status != 'left'"
    ).get(lobbyId, playerId);

    if (!participant) {
      return lobby;
    }

    this.dbManager.transaction(() => {
      this.db.prepare("UPDATE lobby_participants SET status = 'left' WHERE id = ?").run(participant.id);

      // Recalculate remaining active players
      const remaining = this.db.prepare(
        "SELECT COUNT(*) as count FROM lobby_participants WHERE lobby_id = ? AND status != 'left'"
      ).get(lobbyId);

      const count = remaining ? remaining.count : 0;

      if (count === 0) {
        this.db.prepare("UPDATE lobbies SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(lobbyId);
      } else if (lobby.status === 'full' && count < lobby.max_players) {
        // AC-18.1: Given a lobby has an unfilled slot, waiting is shown
        this.db.prepare("UPDATE lobbies SET status = 'waiting' WHERE id = ?").run(lobbyId);
      }
    });

    this.logAuditEvent({
      actorId: playerId,
      action: 'LOBBY_LEFT',
      resource: `lobby:${lobbyId}`,
      details: { role: participant.role }
    });

    return this.getLobby(lobbyId);
  }

  /**
   * EP05-03 / AC-18.3: Start match in a full lobby.
   */
  startMatch({ lobbyId, hostPlayerId }) {
    const lobby = this.getLobby(lobbyId);

    if (lobby.hostPlayerId !== hostPlayerId) {
      const err = new Error('Only the designated lobby host can start the match.');
      err.status = 403;
      err.code = 'HOST_ONLY';
      throw err;
    }

    if (lobby.status !== 'full' && lobby.status !== 'active') {
      const err = new Error(`Cannot start match: lobby status is '${lobby.status}'. Two connected players are required before starting (AC-18.2, AC-18.3).`);
      err.status = 400;
      err.code = 'LOBBY_NOT_FULL';
      throw err;
    }

    const sessionId = 'sess-mp-' + crypto.randomUUID().slice(0, 8);

    this.dbManager.transaction(() => {
      // AC-18.3: Given a match begins in a lobby, active is shown
      this.db.prepare(
        "UPDATE lobbies SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(lobbyId);

      // Create linked game session
      this.db.prepare(
        `INSERT INTO game_sessions (id, game_id, player_id, mode, status, score, state_json, created_at)
         VALUES (?, ?, ?, 'multiplayer', 'active', 0, ?, CURRENT_TIMESTAMP)`
      ).run(
        sessionId,
        lobby.game.id,
        hostPlayerId,
        JSON.stringify({
          lobbyId,
          code: lobby.code,
          participants: lobby.participants.map(p => ({ playerId: p.playerId, displayName: p.displayName, role: p.role })),
          boardState: 'INITIAL',
          currentTurn: hostPlayerId
        })
      );
    });

    this.logAuditEvent({
      actorId: hostPlayerId,
      action: 'MATCH_STARTED',
      resource: `lobby:${lobbyId}`,
      details: { sessionId, gameId: lobby.game.id, code: lobby.code }
    });

    const updated = this.getLobby(lobbyId);
    updated.sessionId = sessionId;
    return updated;
  }
}

let lobbyServiceInstance = null;
function getLobbyService(dbManager) {
  if (!lobbyServiceInstance || dbManager) {
    lobbyServiceInstance = new LobbyService(dbManager);
  }
  return lobbyServiceInstance;
}

module.exports = {
  LobbyService,
  getLobbyService,
  LOBBY_EXPIRY_MS
};
