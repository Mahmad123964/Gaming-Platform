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
    try {
      this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    } catch (e) {}
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
      this.db.exec('ALTER TABLE lobbies ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0;');
    } catch (e) {}
    try {
      this.db.exec("ALTER TABLE lobbies ADD COLUMN bot_difficulty TEXT DEFAULT 'medium';");
    } catch (e) {}
    try {
      this.db.exec('ALTER TABLE game_sessions ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0;');
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
    try {
      this.db.exec('ALTER TABLE subscription_plans ADD COLUMN is_popular INTEGER NOT NULL DEFAULT 0;');
    } catch (e) {}
    try {
      const plans = [
        {
          id: 'plan-free',
          name: 'Free Explorer',
          price_cents: 0,
          currency: 'USD',
          interval: 'monthly',
          features_json: JSON.stringify([
            'Access to all Free Catalog Games',
            'Standard Online Multiplayer',
            'Community Text Chat & Avatars',
            'Single Device Progress Save'
          ]),
          is_popular: 0
        },
        {
          id: 'plan-pro-monthly',
          name: 'Nexus Pro',
          price_cents: 999,
          currency: 'USD',
          interval: 'monthly',
          features_json: JSON.stringify([
            'All Premium Catalog Titles (Solar Siege, Quantum Break)',
            'Priority Real-time Matchmaking',
            'Cloud Save Sync Across Devices',
            'Exclusive Obsidian Pro Badges',
            '24/7 Priority Discord & Ticket Support'
          ]),
          is_popular: 1
        },
        {
          id: 'plan-ultimate-monthly',
          name: 'Nexus Ultimate',
          price_cents: 1999,
          currency: 'USD',
          interval: 'monthly',
          features_json: JSON.stringify([
            'Everything included in Nexus Pro',
            'Competitive Tournament Access & Prize Ladders',
            'Zero-Latency AI Bot Opponents & Scrims',
            'Exclusive VIP Discord Role & Emotes',
            'Developer SDK & Early Access Game Previews'
          ]),
          is_popular: 0
        }
      ];
      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO subscription_plans (id, name, price_cents, currency, interval, features_json, is_popular)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const p of plans) {
        stmt.run(p.id, p.name, p.price_cents, p.currency, p.interval, p.features_json, p.is_popular);
      }
    } catch (e) {}

    // Business Model, Regional Pricing & Licensing Migrations (Tasks 2, 4, 6, 7, 9)
    try { this.db.exec("ALTER TABLE games ADD COLUMN commercial_model TEXT NOT NULL DEFAULT 'FREE';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN external_store_url TEXT;"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN external_store_name TEXT;"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN publisher TEXT DEFAULT 'NexusPlay Studios';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN developer TEXT DEFAULT 'NexusPlay Engineering';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN content_rating TEXT DEFAULT 'PEGI-3 / ESRB-E';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN supported_platforms_json TEXT DEFAULT '[\"browser\"]';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN region_restrictions_json TEXT DEFAULT '[]';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN default_currency TEXT DEFAULT 'USD';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN default_price_minor INTEGER DEFAULT 0;"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN integration_type TEXT NOT NULL DEFAULT 'SELF_HOSTED';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN iframe_sandbox_json TEXT DEFAULT '[\"allow-scripts\",\"allow-same-origin\",\"allow-popups\",\"allow-forms\"]';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE games ADD COLUMN allowed_iframe_hosts_json TEXT DEFAULT '[\"html5.gamedistribution.com\",\"html5games.com\"]';"); } catch (e) {}
    try { this.db.exec("UPDATE games SET integration_type = 'EXTERNAL_REDIRECT' WHERE commercial_model = 'EXTERNAL_STORE';"); } catch (e) {}

    try { this.db.exec("ALTER TABLE licensing_approvals ADD COLUMN rights_type TEXT DEFAULT 'PROPRIETARY_FIRST_PARTY';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE licensing_approvals ADD COLUMN permitted_channels_json TEXT DEFAULT '[\"web_hosted\"]';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE licensing_approvals ADD COLUMN commercial_conditions TEXT DEFAULT 'Full free distribution authorized';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE licensing_approvals ADD COLUMN expires_at DATETIME;"); } catch (e) {}

    try { this.db.exec("ALTER TABLE players ADD COLUMN country TEXT DEFAULT 'US';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE players ADD COLUMN currency_preference TEXT DEFAULT 'USD';"); } catch (e) {}
    try { this.db.exec("ALTER TABLE players ADD COLUMN email_verified INTEGER DEFAULT 0;"); } catch (e) {}
    try { this.db.exec("ALTER TABLE players ADD COLUMN birth_date DATE;"); } catch (e) {}
    try { this.db.exec("ALTER TABLE players ADD COLUMN parental_consent_verified INTEGER DEFAULT 0;"); } catch (e) {}

    // Ensure game_regional_prices and game_entitlements exist
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS game_regional_prices (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            country_code TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            price_minor INTEGER NOT NULL,
            price_display TEXT NOT NULL,
            effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
            effective_to DATETIME,
            tax_inclusive INTEGER NOT NULL DEFAULT 1,
            publisher_min_minor INTEGER NOT NULL DEFAULT 0,
            promotional_discount_percent INTEGER NOT NULL DEFAULT 0,
            refund_period_days INTEGER NOT NULL DEFAULT 14,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(game_id, country_code)
        );
        CREATE TABLE IF NOT EXISTS game_entitlements (
            id TEXT PRIMARY KEY,
            player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            entitlement_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            payment_ref TEXT,
            purchase_price_minor INTEGER,
            currency_code TEXT,
            billing_country TEXT,
            source TEXT NOT NULL DEFAULT 'PURCHASE_VERIFIED',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(player_id, game_id)
        );
        CREATE INDEX IF NOT EXISTS idx_game_regional_prices_lookup ON game_regional_prices(game_id, country_code);
        CREATE INDEX IF NOT EXISTS idx_game_entitlements_player ON game_entitlements(player_id, game_id, status);
      `);
    } catch (e) {}

    // Sync commercial models for existing games based on is_premium
    try {
      this.db.exec("UPDATE games SET commercial_model = 'PAID_ONE_TIME', default_price_minor = 399, default_currency = 'USD' WHERE is_premium = 1 AND commercial_model = 'FREE';");
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

  exec(sql) {
    return this.db.exec(sql);
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
