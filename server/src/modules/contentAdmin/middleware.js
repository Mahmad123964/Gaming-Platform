const { requireAuth } = require('../identity/middleware');
const { getContentAdminService } = require('./contentAdminService');
const { getDb } = require('../../db');

/**
 * Middleware: Enforce Administrator Role
 * Traceability: EP11-02, AC-39.1, AC-39.2, AC-39.3, AC-40.2
 */
function requireAdminRole(req, res, next) {
  // First verify valid session and CSRF using standard identity middleware
  requireAuth(req, res, () => {
    const db = getDb();
    const adminService = getContentAdminService();

    // AC-39.3: Live check against players table to guarantee revoked roles take effect instantly
    const playerRecord = db.get(
      'SELECT id, email, display_name, role, status FROM players WHERE id = ?',
      [req.player.id]
    );

    if (!playerRecord || playerRecord.status !== 'active') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account session is no longer active or valid.',
        timestamp: new Date().toISOString()
      });
    }

    // AC-39.2: Player lacks content-management role -> 403 Forbidden
    if (playerRecord.role !== 'admin') {
      // AC-40.2: Audit rejected unauthorized attempt
      adminService.logAuditEvent({
        actorId: req.player.id,
        action: 'ACCESS_DENIED',
        resource: req.originalUrl,
        details: {
          method: req.method,
          playerEmail: playerRecord.email,
          currentRole: playerRecord.role,
          requiredRole: 'admin',
          reason: 'Insufficient permissions for content administration.'
        }
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Content administration requires an authorized administrator role.',
        timestamp: new Date().toISOString()
      });
    }

    // AC-39.1: Permitted action allowed
    req.admin = {
      id: playerRecord.id,
      email: playerRecord.email,
      displayName: playerRecord.display_name,
      role: playerRecord.role
    };

    next();
  });
}

module.exports = {
  requireAdminRole
};
