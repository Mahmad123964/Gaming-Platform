const { AuthService, getAuthService } = require('./authService');
const { requireAuth, optionalAuth, parseCookies } = require('./middleware');
const { RateLimiter, authRateLimiter } = require('./rateLimiter');
const { hashPassword, verifyPassword, generateToken, hashToken, constantTimeDummyWork, generateId } = require('./crypto');
const { validateEmail, validatePassword, validateDisplayName } = require('./validation');
const { emailService, EmailService } = require('./emailService');
const authRouter = require('./routes');

module.exports = {
  AuthService,
  getAuthService,
  requireAuth,
  optionalAuth,
  parseCookies,
  RateLimiter,
  authRateLimiter,
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  constantTimeDummyWork,
  generateId,
  validateEmail,
  validatePassword,
  validateDisplayName,
  emailService,
  EmailService,
  authRouter
};
