const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath || (process.env.NODE_ENV === 'test' 
      ? ':memory:' 
      : path.join(__dirname, '..', '..', 'data', `platform-${process.env.NODE_ENV || 'development'}.db`));
    
    // Ensure data directory exists if writing to file
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(this.dbPath);
    this.init();
  }

  init() {
    const schemaFile = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaFile, 'utf8');
    // DatabaseSync exec supports executing entire scripts
    this.db.exec(sql);
    try {
      this.db.exec('ALTER TABLE auth_sessions ADD COLUMN csrf_token TEXT;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE game_sessions ADD COLUMN player_id TEXT NOT NULL DEFAULT "guest";');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE game_sessions ADD COLUMN score INTEGER NOT NULL DEFAULT 0;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE game_sessions ADD COLUMN state_json TEXT;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE game_sessions ADD COLUMN restart_count INTEGER NOT NULL DEFAULT 0;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE player_achievements ADD COLUMN verification_type TEXT NOT NULL DEFAULT "PROVISIONAL";');
    } catch (e) {}
    try {
      this.db.exec("UPDATE game_history SET verification_status = 'PLAUSIBILITY_CHECK_PASSED' WHERE verification_status = 'verified';");
    } catch (e) {}
    try {
      this.db.exec("INSERT OR IGNORE INTO player_profiles (id, player_id, display_name) SELECT 'prof-' || id, id, display_name FROM players;");
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE lobbies ADD COLUMN expires_at DATETIME;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE lobbies ADD COLUMN started_at DATETIME;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE lobbies ADD COLUMN ended_at DATETIME;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE lobby_participants ADD COLUMN disconnected_at DATETIME;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE lobby_participants ADD COLUMN reconnect_deadline DATETIME;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE lobbies ADD COLUMN board_state_json TEXT;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE lobbies ADD COLUMN is_matchmaking INTEGER NOT NULL DEFAULT 0;');
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE lobbies ADD COLUMN winner_id TEXT REFERENCES players(id);');
    } catch (e) {}
    try {
      this.db.exec(`CREATE TABLE IF NOT EXISTS lobby_participants (
        id TEXT PRIMARY KEY,
        lobby_id TEXT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES players(id),
        role TEXT NOT NULL DEFAULT 'guest',
        status TEXT NOT NULL DEFAULT 'connected',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        disconnected_at DATETIME,
        reconnect_deadline DATETIME,
        UNIQUE(lobby_id, player_id)
      );`);
    } catch (e) {}
  }

  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK;');
      } catch (_) {}
      throw err;
    }
  }

  query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  healthCheck() {
    try {
      const result = this.get('SELECT 1 as healthy');
      return result && result.healthy === 1;
    } catch (err) {
      return false;
    }
  }

  close() {
    try {
      this.db.close();
    } catch (e) {
      // ignore
    }
  }
}

let instance = null;

function getDb(customPath) {
  if (!instance || customPath) {
    instance = new DatabaseManager(customPath);
  }
  return instance;
}

module.exports = {
  DatabaseManager,
  getDb
};
