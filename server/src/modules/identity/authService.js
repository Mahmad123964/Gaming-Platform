const { getDb } = require('../../db');
const { hashPassword, verifyPassword, generateToken, generateId } = require('./crypto');
const { validateEmail, validatePassword, validateDisplayName } = require('./validation');
const { authRateLimiter } = require('./rateLimiter');

class AuthService {
  constructor(db) {
    this.db = db || getDb();
  }

  register({ email, password, displayName }) {
    // Input validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      const err = new Error(emailValidation.message);
      err.status = 400;
      throw err;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const err = new Error(passwordValidation.message);
      err.status = 400;
      throw err;
    }

    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.valid) {
      const err = new Error(displayNameValidation.message);
      err.status = 400;
      throw err;
    }

    const cleanEmail = emailValidation.value;
    const cleanDisplayName = displayNameValidation.value;

    // Check duplicate email
    const existing = this.db.get('SELECT id FROM players WHERE email = ?', [cleanEmail]);
    if (existing) {
      const err = new Error('An account with this email address already exists');
      err.status = 409;
      throw err;
    }

    const playerId = generateId('usr');
    const passwordHash = hashPassword(password);

    this.db.run(
      `INSERT INTO players (id, email, password_hash, display_name, role, status)
       VALUES (?, ?, ?, ?, 'player', 'active')`,
      [playerId, cleanEmail, passwordHash, cleanDisplayName]
    );

    // Create initial 24h session
    const sessionToken = generateToken();
    const sessionId = generateId('ses');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    this.db.run(
      `INSERT INTO auth_sessions (id, player_id, token, expires_at, revoked)
       VALUES (?, ?, ?, ?, 0)`,
      [sessionId, playerId, sessionToken, expiresAt]
    );

    return {
      user: {
        id: playerId,
        email: cleanEmail,
        displayName: cleanDisplayName,
        role: 'player'
      },
      token: sessionToken,
      expiresAt
    };
  }

  login({ email, password, ip = '127.0.0.1' }) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.status = 400;
      throw err;
    }

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rateKey = authRateLimiter.getKey(ip, cleanEmail);

    // Check rate limit
    const limitStatus = authRateLimiter.checkLimit(rateKey);
    if (!limitStatus.allowed) {
      const err = new Error('Too many failed authentication attempts. Account access is temporarily locked.');
      err.status = 429;
      err.retryAfter = limitStatus.retryAfterSeconds;
      err.lockedUntil = limitStatus.lockedUntil;
      throw err;
    }

    const player = this.db.get(
      'SELECT id, email, password_hash, display_name, role, status FROM players WHERE email = ?',
      [cleanEmail]
    );

    // Security requirement AC-2.3: Use constant-time verification & uniform error message
    // If player does not exist, verify against a dummy hash to prevent timing oracle attacks
    const dummyHash = '00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    let isPasswordValid = false;

    if (player) {
      try {
        isPasswordValid = verifyPassword(password, player.password_hash);
      } catch (e) {
        isPasswordValid = false;
      }
    } else {
      try {
        verifyPassword(password, dummyHash);
      } catch (e) {
        // dummy verify failed
      }
    }

    if (!player || !isPasswordValid) {
      const failureResult = authRateLimiter.recordFailure(rateKey);
      const err = new Error('Invalid email or password');
      err.status = 401;
      err.remainingAttempts = failureResult.remainingAttempts;
      if (!failureResult.allowed) {
        err.status = 429;
        err.message = 'Too many failed authentication attempts. Account access is temporarily locked.';
        err.retryAfter = failureResult.retryAfterSeconds;
        err.lockedUntil = failureResult.lockedUntil;
      }
      throw err;
    }

    if (player.status !== 'active') {
      const err = new Error('Account is inactive or suspended');
      err.status = 403;
      throw err;
    }

    // Reset rate limiter on successful authentication
    authRateLimiter.resetLimit(rateKey);

    // Issue new 24h session token (concurrent sessions allowed across devices per AC-2.1)
    const sessionToken = generateToken();
    const sessionId = generateId('ses');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    this.db.run(
      `INSERT INTO auth_sessions (id, player_id, token, expires_at, revoked)
       VALUES (?, ?, ?, ?, 0)`,
      [sessionId, player.id, sessionToken, expiresAt]
    );

    return {
      user: {
        id: player.id,
        email: player.email,
        displayName: player.display_name,
        role: player.role
      },
      token: sessionToken,
      expiresAt
    };
  }

  logout(token) {
    if (!token) {
      const err = new Error('Session token is required');
      err.status = 400;
      throw err;
    }

    const result = this.db.run(
      'UPDATE auth_sessions SET revoked = 1 WHERE token = ?',
      [token]
    );

    return {
      success: true,
      message: 'Successfully logged out and session revoked'
    };
  }

  forgotPassword({ email, ip = '127.0.0.1' }) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      const err = new Error(emailValidation.message);
      err.status = 400;
      throw err;
    }

    const cleanEmail = emailValidation.value;
    const rateKey = authRateLimiter.getKey(ip, `reset:${cleanEmail}`);
    const limitStatus = authRateLimiter.checkLimit(rateKey);
    if (!limitStatus.allowed) {
      const err = new Error('Too many password reset requests. Please try again later.');
      err.status = 429;
      err.retryAfter = limitStatus.retryAfterSeconds;
      throw err;
    }

    const player = this.db.get('SELECT id FROM players WHERE email = ?', [cleanEmail]);
    let resetToken = null;

    if (player) {
      resetToken = generateToken();
      const resetId = generateId('rst');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15-minute validity per AC-3.1

      this.db.run(
        `INSERT INTO password_resets (id, player_id, token, expires_at, used)
         VALUES (?, ?, ?, ?, 0)`,
        [resetId, player.id, resetToken, expiresAt]
      );
    }

    // Anti-enumeration response: always return identical success message (AC-3.1)
    const response = {
      success: true,
      message: 'If this email is registered, password reset instructions have been sent.'
    };

    // In non-production environments, expose reset token to facilitate automated testing / staging verification
    if (process.env.NODE_ENV !== 'production' && resetToken) {
      response.resetToken = resetToken;
    }

    return response;
  }

  resetPassword({ token, newPassword }) {
    if (!token || typeof token !== 'string') {
      const err = new Error('Password reset token is required');
      err.status = 400;
      throw err;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      const err = new Error(passwordValidation.message);
      err.status = 400;
      throw err;
    }

    const resetRecord = this.db.get(
      'SELECT id, player_id, expires_at, used FROM password_resets WHERE token = ?',
      [token.trim()]
    );

    if (!resetRecord || resetRecord.used === 1) {
      const err = new Error('Password reset token is invalid or has already been used');
      err.status = 400;
      throw err;
    }

    const now = new Date();
    const expiresAt = new Date(resetRecord.expires_at);
    if (expiresAt < now) {
      const err = new Error('Password reset token has expired. Please request a new reset link.');
      err.status = 400;
      throw err;
    }

    const newPasswordHash = hashPassword(newPassword);

    // Update password
    this.db.run(
      'UPDATE players SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, resetRecord.player_id]
    );

    // Mark token as used
    this.db.run(
      'UPDATE password_resets SET used = 1 WHERE id = ?',
      [resetRecord.id]
    );

    // AC-3.3: Immediately revoke all existing active sessions for this player across all devices
    this.db.run(
      'UPDATE auth_sessions SET revoked = 1 WHERE player_id = ?',
      [resetRecord.player_id]
    );

    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new credentials.'
    };
  }

  validateSession(token) {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();

    const row = this.db.get(
      `SELECT s.id as session_id, s.token, s.expires_at, s.revoked,
              p.id as player_id, p.email, p.display_name, p.role, p.status
       FROM auth_sessions s
       JOIN players p ON s.player_id = p.id
       WHERE s.token = ?`,
      [cleanToken]
    );

    if (!row || row.revoked === 1) {
      return null;
    }

    if (new Date(row.expires_at) < new Date()) {
      return null;
    }

    if (row.status !== 'active') {
      return null;
    }

    return {
      id: row.player_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      sessionId: row.session_id,
      token: row.token
    };
  }
}

let authServiceInstance = null;

function getAuthService(customDb) {
  if (!authServiceInstance || customDb) {
    authServiceInstance = new AuthService(customDb);
  }
  return authServiceInstance;
}

module.exports = {
  AuthService,
  getAuthService
};
