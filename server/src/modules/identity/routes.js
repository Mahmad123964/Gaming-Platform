const express = require('express');
const { getAuthService } = require('./authService');
const { requireAuth, parseCookies } = require('./middleware');
const { generateToken } = require('./crypto');
const { emailService } = require('./emailService');

const router = express.Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function setAuthCookies(req, res, sessionToken) {
  const isProd = process.env.NODE_ENV === 'production';
  const isSecure = isProd || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const csrfToken = generateToken();

  const sessionCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours (86,400,000 ms)
    secure: isSecure
  };

  const csrfCookieOptions = {
    httpOnly: false, // Accessible by JavaScript to read and include in X-CSRF-Token header
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
    secure: isSecure
  };

  res.cookie('nexusplay_session', sessionToken, sessionCookieOptions);
  res.cookie('nexusplay_csrf', csrfToken, csrfCookieOptions);

  return csrfToken;
}

function clearAuthCookies(res) {
  res.setHeader('Set-Cookie', [
    'nexusplay_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax',
    'nexusplay_csrf=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax'
  ]);
}

// POST /api/v1/auth/register (EP01-01)
router.post('/register', (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    const authService = getAuthService();
    const result = authService.register({ email, password, displayName });

    const csrfToken = setAuthCookies(req, res, result.token);

    res.status(201).json({
      success: true,
      data: {
        ...result,
        csrfToken
      },
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

    const csrfToken = setAuthCookies(req, res, result.token);

    res.status(200).json({
      success: true,
      data: {
        ...result,
        csrfToken
      },
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

// POST /api/v1/auth/logout (EP01-02)
router.post('/logout', (req, res) => {
  try {
    const cookies = parseCookies(req);
    let token = req.body?.token;
    const authHeader = req.headers['authorization'];

    if (!token && authHeader) {
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    }
    if (!token && cookies.nexusplay_session) {
      token = cookies.nexusplay_session;
    }

    if (!token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Session token or cookie is required to log out',
        timestamp: new Date().toISOString()
      });
    }

    // CSRF verification if logging out via cookie
    if (cookies.nexusplay_session) {
      const clientCsrf = req.headers['x-csrf-token'];
      if (!clientCsrf || !cookies.nexusplay_csrf || clientCsrf !== cookies.nexusplay_csrf) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token validation failed. Missing or invalid X-CSRF-Token header.',
          timestamp: new Date().toISOString()
        });
      }
    }

    const authService = getAuthService();
    const result = authService.logout(token);

    clearAuthCookies(res);

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

    clearAuthCookies(res);

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

// Staging & Test Email Outbox Inspection (Non-Production Only)
if (process.env.NODE_ENV !== 'production') {
  router.get('/test/outbox', (req, res) => {
    res.status(200).json({
      success: true,
      outbox: emailService.getOutbox(),
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = router;
