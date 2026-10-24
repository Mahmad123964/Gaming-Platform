class RateLimiter {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 5;
    this.windowMs = options.windowMs || (15 * 60 * 1000); // 15 minutes
    this.lockoutMs = options.lockoutMs || (15 * 60 * 1000); // 15 minutes
    this.records = new Map();
  }

  getKey(ip, email = '') {
    const cleanIp = (ip || 'unknown').replace(/^.*:/, ''); // normalize IPv6 mapped
    const cleanEmail = (email || '').trim().toLowerCase();
    return `${cleanIp}:${cleanEmail}`;
  }

  checkLimit(key) {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record) {
      return { allowed: true, remainingAttempts: this.maxAttempts };
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
      this.records.delete(key);
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    const remainingAttempts = Math.max(0, this.maxAttempts - record.attemptCount);
    return {
      allowed: remainingAttempts > 0,
      remainingAttempts
    };
  }

  recordFailure(key) {
    const now = Date.now();
    let record = this.records.get(key);

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

    if (record.attemptCount >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutMs;
    }

    this.records.set(key, record);
    return this.checkLimit(key);
  }

  resetLimit(key) {
    this.records.delete(key);
  }

  clearAll() {
    this.records.clear();
  }
}

const authRateLimiter = new RateLimiter();

module.exports = {
  RateLimiter,
  authRateLimiter
};
