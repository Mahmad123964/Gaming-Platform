const express = require('express');
const crypto = require('node:crypto');
const { getAuthService } = require('./authService');
const { requireAuth } = require('./middleware');
const { emailService } = require('./emailService');
const { getClientIp, isSecureRequest } = require('../../config');

const router = express.Router();

function setAuthCookies(req, res, sessionToken, csrfToken) {
  const isSecure = isSecureRequest(req);

  const sessionCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours (86,400,000 ms)
    secure: isSecure
  };

  const csrfCookieOptions = {
    httpOnly: false, // Accessible by JavaScript to supply in X-CSRF-Token header
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
    secure: isSecure
  };

  res.cookie('nexusplay_session', sessionToken, sessionCookieOptions);
  res.cookie('nexusplay_csrf', csrfToken, csrfCookieOptions);
}

function clearAuthCookies(req, res) {
  const isSecure = isSecureRequest(req);
  const secureAttr = isSecure ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `nexusplay_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureAttr}`,
    `nexusplay_csrf=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax${secureAttr}`
  ]);
}

// POST /api/v1/auth/register (EP01-01)
router.post('/register', (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    const authService = getAuthService();
    const result = authService.register({ email, password, displayName });

    setAuthCookies(req, res, result.token, result.csrfToken);

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: statusCode === 409 ? 'Conflict' : (statusCode === 400 ? 'Bad Request' : 'Internal Server Error'),
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/auth/login (EP01-02 & EP11-01)
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const ip = getClientIp(req);
    const authService = getAuthService();
    const result = authService.login({ email, password, ip });

    setAuthCookies(req, res, result.token, result.csrfToken);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const statusCode = err.status || 500;
    if (statusCode === 429 && err.retryAfter) {
      res.setHeader('Retry-After', String(err.retryAfter));
    }

    res.status(statusCode).json({
      error: statusCode === 429 ? 'Too Many Requests' : (statusCode === 401 ? 'Unauthorized' : 'Bad Request'),
      message: err.message,
      remainingAttempts: err.remainingAttempts,
      retryAfterSeconds: err.retryAfter,
      lockedUntil: err.lockedUntil,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/auth/logout (EP01-02) - Guarded by requireAuth (enforces CSRF and Origin checks)
router.post('/logout', requireAuth, (req, res) => {
  try {
    const authService = getAuthService();
    const result = authService.logout(req.sessionToken);

    clearAuthCookies(req, res);

    res.status(200).json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: 'Logout Error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/auth/forgot-password (EP01-03)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const ip = getClientIp(req);
    const authService = getAuthService();
    const result = await authService.forgotPassword({ email, ip });

    res.status(200).json({
      success: true,
      message: result.message,
      ...(result.resetToken ? { resetToken: result.resetToken } : {}),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const statusCode = err.status || 500;
    if (statusCode === 429 && err.retryAfter) {
      res.setHeader('Retry-After', String(err.retryAfter));
    }
    res.status(statusCode).json({
      error: statusCode === 429 ? 'Too Many Requests' : 'Bad Request',
      message: err.message,
      retryAfterSeconds: err.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/auth/reset-password (EP01-03)
router.post('/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    const authService = getAuthService();
    const result = authService.resetPassword({ token, newPassword });

    clearAuthCookies(req, res);

    res.status(200).json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: 'Bad Request',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/auth/me (Identity context verification)
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.player,
    timestamp: new Date().toISOString()
  });
});

// Staging & Test Email Outbox Inspection (Strictly Denied in Production; Key Required in Staging)
router.get('/test/outbox', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Outbox inspection endpoint is permanently disabled in production environments',
      timestamp: new Date().toISOString()
    });
  }

  const configuredKey = process.env.INTERNAL_TEST_KEY;
  if (!configuredKey || typeof configuredKey !== 'string' || configuredKey.trim() === '') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: Internal QA outbox access is not configured in this environment',
      timestamp: new Date().toISOString()
    });
  }

  const providedKey = req.headers['x-internal-test-key'];
  if (!providedKey || typeof providedKey !== 'string') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: Valid X-Internal-Test-Key header required for outbox inspection',
      timestamp: new Date().toISOString()
    });
  }

  // Timing-safe secret comparison to prevent side-channel timing leaks
  const providedBuffer = Buffer.from(providedKey);
  const configuredBuffer = Buffer.from(configuredKey);
  const isMatch = providedBuffer.length === configuredBuffer.length && crypto.timingSafeEqual(providedBuffer, configuredBuffer);

  if (!isMatch) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: Valid X-Internal-Test-Key header required for outbox inspection',
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    success: true,
    outbox: emailService.getOutbox(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
