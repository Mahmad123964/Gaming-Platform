const { getAuthService } = require('./authService');
const { verifyCsrfBinding } = require('./crypto');

function parseCookies(req) {
  const list = {};
  const rc = req.headers['cookie'];
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift().trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

function validateOrigin(req) {
  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  const target = origin || referer;
  if (!target) return true; // Standard same-origin or non-browser client

  try {
    const url = new URL(target);
    const hostHeader = (req.headers['host'] || '').split(':')[0].toLowerCase();
    const targetHost = url.hostname.toLowerCase();

    // Allow current host, loopback, and official domain
    if (
      targetHost === hostHeader ||
      targetHost === 'localhost' ||
      targetHost === '127.0.0.1' ||
      targetHost === 'nexusplay.gg' ||
      targetHost.endsWith('.nexusplay.gg')
    ) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const authHeader = req.headers['authorization'];
  let token = null;
  let isCookieAuth = false;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (cookies.nexusplay_session) {
    token = cookies.nexusplay_session;
    isCookieAuth = true;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. No session token or cookie provided.',
      timestamp: new Date().toISOString()
    });
  }

  // 1. Origin / Referer Validation for ambient cookie mutating requests
  if (isCookieAuth && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase())) {
    if (!validateOrigin(req)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Untrusted Cross-Origin Request. Origin or Referer header rejected.',
        timestamp: new Date().toISOString()
      });
    }
  }

  const authService = getAuthService();
  const player = authService.validateSession(token);

  if (!player) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid, revoked, or expired session token.',
      timestamp: new Date().toISOString()
    });
  }

  // 2. Session-Bound CSRF Token Validation
  if (isCookieAuth && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase())) {
    const clientCsrf = req.headers['x-csrf-token'];
    const cookieCsrf = cookies.nexusplay_csrf;

    if (!clientCsrf || !cookieCsrf || clientCsrf !== cookieCsrf) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF token validation failed. Missing or invalid X-CSRF-Token header.',
        timestamp: new Date().toISOString()
      });
    }

    // Cryptographic session-binding check: Ensures CSRF token was issued specifically for this session
    const isSessionBound = verifyCsrfBinding(clientCsrf, player.rawToken) || (player.csrfToken && player.csrfToken === clientCsrf);
    if (!isSessionBound) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cross-session CSRF token rejected. Token is not bound to this authenticated session.',
        timestamp: new Date().toISOString()
      });
    }
  }

  req.player = player;
  req.user = player;
  req.sessionToken = token;
  next();
}

function optionalAuth(req, res, next) {
  const cookies = parseCookies(req);
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (cookies.nexusplay_session) {
    token = cookies.nexusplay_session;
  }

  if (!token) {
    req.player = null;
    req.user = null;
    return next();
  }

  const authService = getAuthService();
  const player = authService.validateSession(token);
  req.player = player || null;
  req.user = player || null;
  req.sessionToken = token;
  next();
}

module.exports = {
  parseCookies,
  validateOrigin,
  requireAuth,
  optionalAuth
};
