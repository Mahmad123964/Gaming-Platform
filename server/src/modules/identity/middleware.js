const { getAuthService } = require('./authService');

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Missing Authorization header.',
      timestamp: new Date().toISOString()
    });
  }

  const authService = getAuthService();
  const player = authService.validateSession(authHeader);

  if (!player) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid, revoked, or expired session token.',
      timestamp: new Date().toISOString()
    });
  }

  req.player = player;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    req.player = null;
    return next();
  }

  const authService = getAuthService();
  const player = authService.validateSession(authHeader);
  req.player = player || null;
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
