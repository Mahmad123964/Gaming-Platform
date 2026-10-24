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
