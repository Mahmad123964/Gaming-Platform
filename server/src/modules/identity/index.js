const { AuthService, getAuthService } = require('./authService');
const { requireAuth, optionalAuth } = require('./middleware');
const { RateLimiter, authRateLimiter } = require('./rateLimiter');
const { hashPassword, verifyPassword, generateToken, generateId } = require('./crypto');
const { validateEmail, validatePassword, validateDisplayName } = require('./validation');
const authRouter = require('./routes');

module.exports = {
  AuthService,
  getAuthService,
  requireAuth,
  optionalAuth,
  RateLimiter,
  authRateLimiter,
  hashPassword,
  verifyPassword,
  generateToken,
  generateId,
  validateEmail,
  validatePassword,
  validateDisplayName,
  authRouter
};
