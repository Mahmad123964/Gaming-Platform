const { getDb } = require('../../db');

class RateLimiter {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 5;
    this.windowMs = options.windowMs || (15 * 60 * 1000); // 15 minutes
    this.lockoutMs = options.lockoutMs || (15 * 60 * 1000); // 15 minutes
    this.globalEmailMaxAttempts = options.globalEmailMaxAttempts || 10; // distributed attack defense
    this.records = new Map();
  }

  getDbInstance() {
    try {
      return getDb();
    } catch (e) {
      return null;
    }
  }

  getKey(ip, email = '') {
    const cleanIp = (ip || 'unknown').replace(/^.*:/, ''); // normalize IPv6 mapped
    const cleanEmail = (email || '').trim().toLowerCase();
    return `${cleanIp}:${cleanEmail}`;
  }

  getEmailTargetKey(email = '') {
    const cleanEmail = (email || '').trim().toLowerCase();
    return `target_email:${cleanEmail}`;
  }

  // Load record from DB or in-memory map (survives restarts)
  getRecord(key) {
    const now = Date.now();
    let record = this.records.get(key);

    if (!record) {
      const db = this.getDbInstance();
      if (db) {
        try {
          const row = db.get('SELECT * FROM auth_rate_limits WHERE key = ?', [key]);
          if (row) {
            record = {
              attemptCount: row.attempt_count,
              firstAttemptAt: new Date(row.first_attempt_at).getTime(),
              lastAttemptAt: new Date(row.last_attempt_at).getTime(),
              lockedUntil: row.locked_until ? new Date(row.locked_until).getTime() : null
            };
            this.records.set(key, record);
          }
        } catch (e) {
          // ignore DB error, fallback to memory
        }
      }
    }

    return record;
  }

  saveRecord(key, record) {
    this.records.set(key, record);

    const db = this.getDbInstance();
    if (db) {
      try {
        const firstIso = new Date(record.firstAttemptAt).toISOString();
        const lastIso = new Date(record.lastAttemptAt).toISOString();
        const lockedIso = record.lockedUntil ? new Date(record.lockedUntil).toISOString() : null;

        db.run(
          `INSERT INTO auth_rate_limits (key, attempt_count, first_attempt_at, last_attempt_at, locked_until)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             attempt_count = excluded.attempt_count,
             first_attempt_at = excluded.first_attempt_at,
             last_attempt_at = excluded.last_attempt_at,
             locked_until = excluded.locked_until`,
          [key, record.attemptCount, firstIso, lastIso, lockedIso]
        );
      } catch (e) {
        // ignore DB error
      }
    }
  }

  deleteRecord(key) {
    this.records.delete(key);
    const db = this.getDbInstance();
    if (db) {
      try {
        db.run('DELETE FROM auth_rate_limits WHERE key = ?', [key]);
      } catch (e) {
        // ignore
      }
    }
  }

  checkLimit(key, isTargetEmail = false) {
    const now = Date.now();
    const threshold = isTargetEmail ? this.globalEmailMaxAttempts : this.maxAttempts;
    const record = this.getRecord(key);

    if (!record) {
      return { allowed: true, remainingAttempts: threshold };
    }

    // Check if currently locked out
    if (record.lockedUntil && record.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds,
        lockedUntil: new Date(record.lockedUntil).toISOString()
      };
    }

    // If window expired, reset counter
    if (now - record.firstAttemptAt > this.windowMs) {
      this.deleteRecord(key);
      return { allowed: true, remainingAttempts: threshold };
    }

    const remainingAttempts = Math.max(0, threshold - record.attemptCount);
    return {
      allowed: remainingAttempts > 0,
      remainingAttempts
    };
  }

  recordFailure(key, isTargetEmail = false) {
    const now = Date.now();
    const threshold = isTargetEmail ? this.globalEmailMaxAttempts : this.maxAttempts;
    let record = this.getRecord(key);

    if (!record || (now - record.firstAttemptAt > this.windowMs && !record.lockedUntil)) {
      record = {
        attemptCount: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        lockedUntil: null
      };
    } else {
      record.attemptCount += 1;
      record.lastAttemptAt = now;
    }

    if (record.attemptCount >= threshold) {
      record.lockedUntil = now + this.lockoutMs;
    }

    this.saveRecord(key, record);
    return this.checkLimit(key, isTargetEmail);
  }

  resetLimit(key) {
    this.deleteRecord(key);
  }

  clearAll() {
    this.records.clear();
    const db = this.getDbInstance();
    if (db) {
      try {
        db.run('DELETE FROM auth_rate_limits');
      } catch (e) {
        // ignore
      }
    }
  }
}

const authRateLimiter = new RateLimiter();

module.exports = {
  RateLimiter,
  authRateLimiter
};
