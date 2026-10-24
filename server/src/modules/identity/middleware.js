const { getAuthService } = require('./authService');

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

  // CSRF Protection: When ambient browser cookies are used for mutating operations,
  // enforce double-submit X-CSRF-Token validation
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

  req.player = player;
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
    return next();
  }

  const authService = getAuthService();
  const player = authService.validateSession(token);
  req.player = player || null;
  req.sessionToken = token;
  next();
}

module.exports = {
  parseCookies,
  requireAuth,
  optionalAuth
};
