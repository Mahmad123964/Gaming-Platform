const { ContentAdminService, getContentAdminService } = require('./contentAdminService');
const { requireAdminRole } = require('./middleware');
const { adminRouter } = require('./routes');

// Eagerly initialize default admin account and baseline licensing records
try {
  getContentAdminService();
} catch (e) {
  console.error('[ContentAdmin] Failed eager init:', e.message);
}

module.exports = {
  ContentAdminService,
  getContentAdminService,
  requireAdminRole,
  adminRouter
};
