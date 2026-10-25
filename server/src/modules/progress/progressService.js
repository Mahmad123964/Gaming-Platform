/**
 * NexusPlay — Progress, History, and Achievements Service
 * Traceability: EP07-01, EP07-02, EP07-03, EP07-04
 * Acceptance Criteria: AC-23.1..23.3, AC-24.1..24.3, AC-25.1..25.3, AC-26.1..26.3
 */

const crypto = require('node:crypto');
const { getDb } = require('../../db');

class ProgressService {
  constructor(db) {
    this.db = db || getDb();
    this.ensureTablesAndIndexes();
    this.seedDefaultAchievements();
  }

  ensureTablesAndIndexes() {
    // 1. Ensure game_history table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS game_history (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        game_id TEXT NOT NULL REFERENCES games(id),
        session_id TEXT UNIQUE REFERENCES game_sessions(id),
        score INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        duration_seconds INTEGER DEFAULT 0,
        verification_status TEXT NOT NULL DEFAULT 'verified',
        details_json TEXT,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Ensure achievements table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id),
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 10,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Ensure player_achievements table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_achievements (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        game_id TEXT NOT NULL REFERENCES games(id),
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        UNIQUE(player_id, achievement_id)
      )
    `);

    // 4. Ensure indexes
    try {
      this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_game_progress_player_game ON game_progress(player_id, game_id)');
    } catch (_) {}
    try {
      this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_game_history_session ON game_history(session_id)');
    } catch (_) {}
  }

  seedDefaultAchievements() {
    const cyberInvaders = this.db.get("SELECT id FROM games WHERE slug = 'cyber-invaders'");
    const gameId = cyberInvaders ? cyberInvaders.id : 'game-001';

    const defaultAchievements = [
      {
        id: 'ach-first-blood',
        gameId,
        code: 'FIRST_CONTACT',
        title: 'First Contact',
        description: 'Destroy your first alien invader and register telemetry score.',
        points: 10,
        icon: 'target'
      },
      {
        id: 'ach-wave-survivor',
        gameId,
        code: 'GRID_SENTINEL',
        title: 'Grid Sentinel',
        description: 'Successfully neutralize an entire alien armada and advance to Wave 2.',
        points: 20,
        icon: 'shield'
      },
      {
        id: 'ach-sharpshooter',
        gameId,
        code: 'DEADEYE_GUNNER',
        title: 'Deadeye Gunner',
        description: 'Achieve a score of 500 or more in a single tactical mission.',
        points: 30,
        icon: 'zap'
      },
      {
        id: 'ach-veteran-pilot',
        gameId,
        code: 'MAINFRAME_LEGEND',
        title: 'Mainframe Legend',
        description: 'Achieve a score of 1,000 or more in a single tactical mission.',
        points: 50,
        icon: 'award'
      },
      {
        id: 'ach-iron-hull',
        gameId,
        code: 'BUNKER_GUARDIAN',
        title: 'Bunker Guardian',
        description: 'Complete a wave with all defensive bunker blocks intact.',
        points: 40,
        icon: 'lock'
      }
    ];

    for (const ach of defaultAchievements) {
      this.db.run(
        `INSERT OR IGNORE INTO achievements (id, game_id, code, title, description, points, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ach.id, ach.gameId, ach.code, ach.title, ach.description, ach.points, ach.icon]
      );
    }
  }

  /**
   * Save completed game session score and history record
   * Traceability: EP07-01, AC-23.1, AC-23.2, AC-23.3
   */
  recordCompletedGame({
    playerId,
    gameId,
    sessionId = null,
    score = 0,
    level = 1,
    durationSeconds = 0,
    state = {}
  }) {
    // 1. Authenticated player validation (AC-23.1)
    if (!playerId || playerId === 'guest') {
      const err = new Error('Authentication required: Game progress and scores can only be persisted for authenticated player accounts (AC-23.1).');
      err.status = 401;
      err.code = 'AUTHENTICATION_REQUIRED';
      throw err;
    }

    // Verify player exists
    const player = this.db.get('SELECT id, display_name FROM players WHERE id = ?', [playerId]);
    if (!player) {
      const err = new Error('Player account not found.');
      err.status = 404;
      err.code = 'PLAYER_NOT_FOUND';
      throw err;
    }

    // 2. Score Range Validation (Fail-Fast Boundary Defense, SEC-01)
    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 0) {
      const err = new Error('Invalid score: Score must be a non-negative integer (AC-23.1).');
      err.status = 400;
      err.code = 'INVALID_SCORE_RANGE';
      throw err;
    }

    if (parsedScore > 1000000) {
      const err = new Error('Invalid score: Score exceeds maximum plausible simulation ceiling (AC-23.1).');
      err.status = 400;
      err.code = 'SCORE_CEILING_EXCEEDED';
      throw err;
    }

    // 3. Session Validation & Idempotency / Duplicate Protection (AC-23.3, SEC-03)
    let session = null;
    if (sessionId) {
      session = this.db.get('SELECT * FROM game_sessions WHERE id = ?', [sessionId]);
      if (!session) {
        const err = new Error(`Game session '${sessionId}' not found.`);
        err.status = 404;
        err.code = 'SESSION_NOT_FOUND';
        throw err;
      }

      // Enforce player isolation on session (AC-23.2)
      if (session.player_id && session.player_id !== 'guest' && session.player_id !== playerId) {
        const err = new Error('Access denied: You cannot record game progress for another player\'s session (AC-23.2).');
        err.status = 403;
        err.code = 'UNAUTHORIZED_SESSION_ACCESS';
        throw err;
      }

      // Ended session check: If session was already marked ended before score was recorded, reject
      if (session.status === 'ended') {
        const err = new Error('Cannot record score: The target game session has already ended or terminated (AC-23.1).');
        err.status = 400;
        err.code = 'SESSION_ALREADY_COMPLETED';
        throw err;
      }

      // AC-23.3: Given the same game result is reported twice, When the result is processed, Then score is not duplicated
      const existingRecord = this.db.get('SELECT * FROM game_history WHERE session_id = ?', [sessionId]);
      if (existingRecord) {
        const resolvedTitle = session.game_title || 'Cyber Invaders';
        return {
          status: 'SUCCESS',
          duplicate: true,
          historyId: existingRecord.id,
          score: existingRecord.score,
          level: existingRecord.level,
          verificationStatus: existingRecord.verification_status,
          message: 'Game result already recorded for this session. Score was not duplicated (AC-23.3).',
          history: this.formatHistoryRecord(existingRecord, resolvedTitle),
          newAchievements: []
        };
      }
    }

    // 4. Resolve Game Record
    const effectiveGameId = gameId || (session ? session.game_id : null) || 'cyber-invaders';
    const game = this.db.get('SELECT id, title, slug FROM games WHERE id = ? OR slug = ?', [effectiveGameId, effectiveGameId]);
    if (!game) {
      const err = new Error('Game not found.');
      err.status = 404;
      err.code = 'GAME_NOT_FOUND';
      throw err;
    }
    const resolvedGameId = game.id;

    // 5. Level Bounds Validation (AC-24.1, bounds [1, 99])
    const parsedLevel = Math.max(1, Math.min(99, parseInt(level, 10) || 1));

    // 6. Score Trust Model & Heuristic Verification Status
    // Max legitimate points velocity in Cyber Invaders: ~100 points/sec
    const safeDuration = Math.max(1, parseInt(durationSeconds, 10) || 1);
    const velocity = parsedScore / safeDuration;
    const isVerified = velocity <= 120 && parsedScore <= 500000;
    const verificationStatus = isVerified ? 'verified' : 'unverified';

    // 7. Record Game Completion in game_history (AC-23.1)
    const historyId = 'gh-' + crypto.randomUUID();
    this.db.run(
      `INSERT INTO game_history (
        id, player_id, game_id, session_id, score, level, duration_seconds, verification_status, details_json, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        historyId,
        playerId,
        resolvedGameId,
        sessionId,
        parsedScore,
        parsedLevel,
        safeDuration,
        verificationStatus,
        JSON.stringify(state || {})
      ]
    );

    // 8. Update Session State to completed
    if (sessionId) {
      this.db.run(
        `UPDATE game_sessions 
         SET status = 'completed', score = ?, ended_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [parsedScore, sessionId]
      );
    }

    // 9. Update / Upsert Saved Checkpoint Progress (EP07-02, AC-24.1)
    this.saveProgress({
      playerId,
      gameId: resolvedGameId,
      score: parsedScore,
      level: parsedLevel,
      state
    });

    // 10. Evaluate & Award Achievements (EP07-04, AC-26.1)
    const newAchievements = this.evaluateMilestones({
      playerId,
      gameId: resolvedGameId,
      score: parsedScore,
      level: parsedLevel,
      state,
      sessionId
    });

    const recordedRow = this.db.get('SELECT * FROM game_history WHERE id = ?', [historyId]);
    return {
      status: 'SUCCESS',
      duplicate: false,
      historyId,
      score: parsedScore,
      level: parsedLevel,
      verificationStatus,
      message: 'Game score and session history recorded successfully (AC-23.1).',
      history: this.formatHistoryRecord(recordedRow, game.title),
      newAchievements
    };
  }

  /**
   * Save or update player checkpoint progress
   * Traceability: EP07-02, AC-24.1
   */
  saveProgress({ playerId, gameId, score = 0, level = 1, state = {} }) {
    if (!playerId || playerId === 'guest') {
      const err = new Error('Authentication required: Saved progress is tied to authenticated player accounts (AC-24.1).');
      err.status = 401;
      err.code = 'AUTHENTICATION_REQUIRED';
      throw err;
    }

    const game = this.db.get('SELECT id FROM games WHERE id = ? OR slug = ?', [gameId, gameId]);
    if (!game) {
      const err = new Error('Game not found.');
      err.status = 404;
      err.code = 'GAME_NOT_FOUND';
      throw err;
    }
    const resolvedGameId = game.id;

    const parsedLevel = Math.max(1, Math.min(99, parseInt(level, 10) || 1));
    const parsedScore = Math.max(0, parseInt(score, 10) || 0);

    // Check existing progress
    const existing = this.db.get(
      'SELECT id, score, level FROM game_progress WHERE player_id = ? AND game_id = ?',
      [playerId, resolvedGameId]
    );

    if (existing) {
      // Update existing checkpoint if level >= current or higher score
      const newLevel = Math.max(existing.level, parsedLevel);
      const newScore = Math.max(existing.score, parsedScore);
      this.db.run(
        `UPDATE game_progress 
         SET score = ?, level = ?, state_json = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newScore, newLevel, JSON.stringify(state || {}), existing.id]
      );
    } else {
      const progressId = 'prog-' + crypto.randomUUID();
      this.db.run(
        `INSERT INTO game_progress (id, player_id, game_id, score, level, state_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [progressId, playerId, resolvedGameId, parsedScore, parsedLevel, JSON.stringify(state || {})]
      );
    }

    return this.getProgress(playerId, resolvedGameId);
  }

  /**
   * Retrieve saved checkpoint progress for a player
   * Traceability: EP07-02, AC-24.1, AC-24.2, AC-24.3
   */
  getProgress(requestingPlayerId, targetPlayerId, gameIdOrSlug) {
    // If only 2 arguments passed, requestingPlayerId is targetPlayerId
    let reqId = requestingPlayerId;
    let targetId = targetPlayerId;
    let gameParam = gameIdOrSlug;

    if (gameParam === undefined) {
      gameParam = targetPlayerId;
      targetId = requestingPlayerId;
    }

    // AC-24.3: Given a different player requests another player's saved level, access is denied
    if (reqId && targetId && reqId !== targetId) {
      const err = new Error('Access denied: You cannot view or resume another player\'s saved level (AC-24.3).');
      err.status = 403;
      err.code = 'UNAUTHORIZED_PROGRESS_ACCESS';
      throw err;
    }

    const game = this.db.get('SELECT id, title, slug FROM games WHERE id = ? OR slug = ?', [gameParam, gameParam]);
    if (!game) {
      const err = new Error('Game not found.');
      err.status = 404;
      err.code = 'GAME_NOT_FOUND';
      throw err;
    }

    const row = this.db.get(
      `SELECT p.id, p.player_id, p.game_id, p.score, p.level, p.state_json, p.updated_at,
              g.title as game_title, g.slug as game_slug
       FROM game_progress p
       JOIN games g ON p.game_id = g.id
       WHERE p.player_id = ? AND p.game_id = ?`,
      [targetId, game.id]
    );

    // AC-24.2: Given the player has no saved level, When resume is requested, Then an appropriate no-saved-progress state is shown
    if (!row) {
      return {
        hasSavedProgress: false,
        gameId: game.id,
        gameTitle: game.title,
        gameSlug: game.slug,
        progress: null,
        message: `No saved progress found for "${game.title}". You can start a new mission from Level 1 (AC-24.2).`
      };
    }

    let parsedState = {};
    try {
      parsedState = row.state_json ? JSON.parse(row.state_json) : {};
    } catch (_) {}

    return {
      hasSavedProgress: true,
      gameId: row.game_id,
      gameTitle: row.game_title,
      gameSlug: row.game_slug,
      progress: {
        id: row.id,
        playerId: row.player_id,
        level: row.level,
        score: row.score,
        state: parsedState,
        updatedAt: row.updated_at
      }
    };
  }

  /**
   * Retrieve recent completed game sessions (Last 10 completed)
   * Traceability: EP07-03, AC-25.1, AC-25.2, AC-25.3, AC-23.2
   */
  getRecentHistory(requestingPlayerId, targetPlayerId = null, limit = 10) {
    const targetId = targetPlayerId || requestingPlayerId;

    // AC-23.2: Given a different player accesses score history, Then first player's private records are not exposed
    if (requestingPlayerId && targetId && requestingPlayerId !== targetId) {
      const err = new Error('Access denied: You cannot view another player\'s private game history (AC-23.2).');
      err.status = 403;
      err.code = 'UNAUTHORIZED_HISTORY_ACCESS';
      throw err;
    }

    // AC-25.1: If > 10 completed sessions, exactly 10 are displayed (LIMIT 10)
    // Order by completed_at DESC, id DESC to break identical timestamp ties
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const rows = this.db.query(
      `SELECT h.id, h.player_id, h.game_id, h.session_id, h.score, h.level, h.duration_seconds,
              h.verification_status, h.details_json, h.completed_at,
              g.title as game_title, g.slug as game_slug
       FROM game_history h
       JOIN games g ON h.game_id = g.id
       WHERE h.player_id = ?
       ORDER BY h.completed_at DESC, h.id DESC
       LIMIT ?`,
      [targetId, parsedLimit]
    );

    const totalCompleted = this.db.get(
      'SELECT COUNT(*) as count FROM game_history WHERE player_id = ?',
      [targetId]
    )?.count || 0;

    return {
      totalCompleted,
      count: rows.length,
      limit: parsedLimit,
      history: rows.map(r => this.formatHistoryRecord(r, r.game_title)),
      // AC-25.3: Empty state indication
      isEmpty: rows.length === 0,
      emptyMessage: 'No completed game sessions recorded yet. Play a mission to build your gaming record (AC-25.3)!'
    };
  }

  /**
   * Evaluate milestone criteria and award achievements
   * Traceability: EP07-04, AC-26.1, AC-26.3
   */
  evaluateMilestones({ playerId, gameId, score, level, state = {}, sessionId = null }) {
    const awarded = [];

    const checkAndAward = (achCode) => {
      const ach = this.db.get('SELECT id, title, description, points, icon FROM achievements WHERE code = ?', [achCode]);
      if (!ach) return;

      const alreadyUnlocked = this.db.get(
        'SELECT id FROM player_achievements WHERE player_id = ? AND achievement_id = ?',
        [playerId, ach.id]
      );

      if (!alreadyUnlocked) {
        const id = 'pach-' + crypto.randomUUID();
        this.db.run(
          `INSERT INTO player_achievements (id, player_id, achievement_id, game_id, session_id, unlocked_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [id, playerId, ach.id, gameId, sessionId]
        );
        awarded.push({
          id: ach.id,
          code: achCode,
          title: ach.title,
          description: ach.description,
          points: ach.points,
          icon: ach.icon
        });
      }
    };

    // Rule 1: First Contact (Score >= 10)
    if (score >= 10) {
      checkAndAward('FIRST_CONTACT');
    }

    // Rule 2: Grid Sentinel (Level/Wave >= 2)
    if (level >= 2) {
      checkAndAward('GRID_SENTINEL');
    }

    // Rule 3: Deadeye Gunner (Score >= 500)
    if (score >= 500) {
      checkAndAward('DEADEYE_GUNNER');
    }

    // Rule 4: Mainframe Legend (Score >= 1,000)
    if (score >= 1000) {
      checkAndAward('MAINFRAME_LEGEND');
    }

    // Rule 5: Bunker Guardian (Bunkers preserved)
    if (state && state.bunkersIntact === true) {
      checkAndAward('BUNKER_GUARDIAN');
    }

    return awarded;
  }

  /**
   * Retrieve achievements list with player unlock status
   * Traceability: EP07-04, AC-26.1, AC-26.2, AC-26.3
   */
  getPlayerAchievements(requestingPlayerId, targetPlayerId = null, gameIdOrSlug = null) {
    const targetId = targetPlayerId || requestingPlayerId;

    // AC-26.3: Player viewing achievements cannot see another player's private status
    if (requestingPlayerId && targetId && requestingPlayerId !== targetId) {
      const err = new Error('Access denied: You cannot view another player\'s private achievements (AC-26.3).');
      err.status = 403;
      err.code = 'UNAUTHORIZED_ACHIEVEMENT_ACCESS';
      throw err;
    }

    let gameCondition = '';
    const params = [targetId];

    if (gameIdOrSlug) {
      const game = this.db.get('SELECT id FROM games WHERE id = ? OR slug = ?', [gameIdOrSlug, gameIdOrSlug]);
      if (game) {
        gameCondition = 'WHERE a.game_id = ?';
        params.push(game.id);
      }
    }

    const sql = `
      SELECT a.id, a.code, a.title, a.description, a.points, a.icon,
             g.title as game_title, g.slug as game_slug,
             pa.unlocked_at,
             CASE WHEN pa.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked
      FROM achievements a
      JOIN games g ON a.game_id = g.id
      LEFT JOIN player_achievements pa ON a.id = pa.achievement_id AND pa.player_id = ?
      ${gameCondition}
      ORDER BY is_unlocked DESC, a.points ASC
    `;

    const rows = this.db.query(sql, params);

    const unlockedCount = rows.filter(r => r.is_unlocked === 1).length;
    const totalPoints = rows
      .filter(r => r.is_unlocked === 1)
      .reduce((sum, r) => sum + r.points, 0);

    return {
      totalAchievements: rows.length,
      unlockedCount,
      totalPoints,
      // AC-26.2: Empty state indicator
      isEmpty: unlockedCount === 0,
      emptyMessage: 'No achievements earned yet (AC-26.2). Complete mission objectives and eliminate cyber invaders to earn badges!',
      achievements: rows.map(r => ({
        id: r.id,
        code: r.code,
        title: r.title,
        description: r.description,
        points: r.points,
        icon: r.icon,
        gameTitle: r.game_title,
        gameSlug: r.game_slug,
        unlocked: r.is_unlocked === 1,
        unlockedAt: r.unlocked_at
      }))
    };
  }

  formatHistoryRecord(row, gameTitle) {
    let details = {};
    try {
      details = row.details_json ? JSON.parse(row.details_json) : {};
    } catch (_) {}

    return {
      id: row.id,
      playerId: row.player_id,
      gameId: row.game_id,
      gameTitle: gameTitle || row.game_title || 'Cyber Invaders',
      sessionId: row.session_id,
      score: row.score,
      level: row.level,
      durationSeconds: row.duration_seconds,
      verificationStatus: row.verification_status,
      details,
      completedAt: row.completed_at
    };
  }
}

let instance = null;
function getProgressService(customDb) {
  if (!instance || customDb) {
    instance = new ProgressService(customDb);
  }
  return instance;
}

module.exports = {
  ProgressService,
  getProgressService
};
