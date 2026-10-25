/**
 * Single-Player Game Session Service
 * Traceability: EP04-01, EP04-03, AC-13.1, AC-13.2, AC-13.3, AC-15.1, AC-15.2, AC-15.3
 */

const crypto = require('node:crypto');
const { getDb } = require('../../db');

class SessionService {
  constructor(db) {
    this.db = db || getDb();
    this.ensureSchemaColumns();
  }

  ensureSchemaColumns() {
    try {
      this.db.run('ALTER TABLE game_sessions ADD COLUMN player_id TEXT;');
    } catch (_) {}
    try {
      this.db.run('ALTER TABLE game_sessions ADD COLUMN score INTEGER DEFAULT 0;');
    } catch (_) {}
    try {
      this.db.run('ALTER TABLE game_sessions ADD COLUMN state_json TEXT;');
    } catch (_) {}
    try {
      this.db.run('ALTER TABLE game_sessions ADD COLUMN restart_count INTEGER DEFAULT 0;');
    } catch (_) {}
  }

  /**
   * Create and begin a single-player game session
   * Traceability: EP04-01, AC-13.1, AC-13.2
   * @param {Object} params
   * @param {string} params.gameId
   * @param {string} params.playerId (optional for guests)
   * @param {string} params.mode ('single_player')
   */
  createSinglePlayerSession({
    gameId,
    playerId = null,
    mode = 'single_player',
    initialWave = 1,
    initialScore = 0,
    customState = {}
  }) {
    // 1. Fetch game configuration and capacity rules
    const game = this.db.get(
      'SELECT id, title, slug, min_players, max_players, is_published FROM games WHERE id = ?',
      [gameId]
    );

    if (!game) {
      const err = new Error('Game not found.');
      err.status = 404;
      throw err;
    }

    // AC-13.2: Given the chosen game does not support solo mode, Then mode is unavailable with clear explanation
    if (game.min_players > 1) {
      const err = new Error(
        `Solo mode is unavailable: "${game.title}" requires a minimum of ${game.min_players} players (AC-13.2).`
      );
      err.status = 400;
      err.code = 'SOLO_MODE_NOT_SUPPORTED';
      err.details = { minPlayers: game.min_players, maxPlayers: game.max_players };
      throw err;
    }

    // 2. Terminate any previous active session for this player/game to maintain clean state
    if (playerId) {
      this.db.run(
        `UPDATE game_sessions 
         SET status = 'ended', ended_at = CURRENT_TIMESTAMP 
         WHERE player_id = ? AND game_id = ? AND status = 'active'`,
        [playerId, gameId]
      );
    }

    // 3. Create new single-player session (AC-13.1, AC-24.1)
    const sessionId = 'ses-' + crypto.randomUUID();
    const parsedWave = Math.max(1, parseInt(initialWave, 10) || 1);
    const parsedScore = Math.max(0, parseInt(initialScore, 10) || 0);

    const initialState = {
      wave: parsedWave,
      lives: 3,
      score: parsedScore,
      resumed: parsedWave > 1,
      startTime: new Date().toISOString(),
      ...customState
    };

    this.db.run(
      `INSERT INTO game_sessions (
        id, game_id, player_id, mode, status, score, state_json, restart_count, created_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?, 0, CURRENT_TIMESTAMP)`,
      [sessionId, gameId, playerId || 'guest', mode, parsedScore, JSON.stringify(initialState)]
    );

    return this.getSession(sessionId);
  }

  /**
   * Retrieve session by ID
   */
  getSession(sessionId) {
    const row = this.db.get(
      `SELECT s.id, s.game_id, s.player_id, s.mode, s.status, s.score, s.state_json, s.restart_count,
              s.created_at, s.ended_at,
              g.title as game_title, g.slug as game_slug, g.launch_url as game_launch_url,
              g.min_players, g.max_players, g.is_premium
       FROM game_sessions s
       JOIN games g ON s.game_id = g.id
       WHERE s.id = ?`,
      [sessionId]
    );

    if (!row) {
      const err = new Error(`Session with ID '${sessionId}' not found.`);
      err.status = 404;
      throw err;
    }

    let parsedState = {};
    try {
      parsedState = row.state_json ? JSON.parse(row.state_json) : {};
    } catch (_) {}

    return {
      sessionId: row.id,
      gameId: row.game_id,
      gameTitle: row.game_title,
      gameSlug: row.game_slug,
      gameLaunchUrl: row.game_launch_url,
      playerId: row.player_id,
      mode: row.mode,
      status: row.status,
      isActive: row.status === 'active',
      score: row.score || 0,
      state: parsedState,
      restartCount: row.restart_count || 0,
      createdAt: row.created_at,
      endedAt: row.ended_at
    };
  }

  /**
   * Restart an active or game-over session
   * Traceability: EP04-03, AC-15.1, AC-15.2, AC-15.3
   */
  restartSession(sessionId) {
    const session = this.db.get('SELECT * FROM game_sessions WHERE id = ?', [sessionId]);

    // AC-15.2: Given no restartable session exists, When player requests restart, Then no new session is created
    if (!session) {
      const err = new Error(`No restartable session exists for ID '${sessionId}' (AC-15.2).`);
      err.status = 404;
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }

    if (session.status === 'ended') {
      const err = new Error(`Cannot restart terminated session '${sessionId}'. Please start a new session (AC-15.2).`);
      err.status = 400;
      err.code = 'SESSION_ALREADY_ENDED';
      throw err;
    }

    // AC-15.1 & AC-15.3: Reset session state and zero score
    const resetState = {
      wave: 1,
      lives: 3,
      score: 0,
      restartedAt: new Date().toISOString()
    };

    const newRestartCount = (session.restart_count || 0) + 1;

    this.db.run(
      `UPDATE game_sessions 
       SET status = 'active', score = 0, state_json = ?, restart_count = ?
       WHERE id = ?`,
      [JSON.stringify(resetState), newRestartCount, sessionId]
    );

    return this.getSession(sessionId);
  }

  /**
   * Update live session score and state telemetry
   */
  updateSessionProgress(sessionId, { score = 0, state = {} }) {
    const session = this.db.get('SELECT status FROM game_sessions WHERE id = ?', [sessionId]);
    if (!session || session.status !== 'active') {
      return null;
    }

    this.db.run(
      'UPDATE game_sessions SET score = ?, state_json = ? WHERE id = ?',
      [parseInt(score, 10) || 0, JSON.stringify(state), sessionId]
    );

    return this.getSession(sessionId);
  }

  /**
   * End an active session
   * Traceability: EP04-01, AC-13.3
   */
  endSession(sessionId) {
    const session = this.db.get('SELECT id, status FROM game_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      const err = new Error(`Session '${sessionId}' not found.`);
      err.status = 404;
      throw err;
    }

    // AC-13.3: Mark ended so it is no longer presented as active
    this.db.run(
      `UPDATE game_sessions 
       SET status = 'ended', ended_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [sessionId]
    );

    return this.getSession(sessionId);
  }
}

let instance = null;
function getSessionService(customDb) {
  if (!instance || customDb) {
    instance = new SessionService(customDb);
  }
  return instance;
}

module.exports = {
  SessionService,
  getSessionService
};
