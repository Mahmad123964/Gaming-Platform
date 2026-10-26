const express = require('express');
const { getContentAdminService } = require('./contentAdminService');
const { requireAdminRole } = require('./middleware');
const { getDb } = require('../../db');

const adminRouter = express.Router();

// Apply requireAdminRole to all endpoints in this router
adminRouter.use(requireAdminRole);

/**
 * GET /api/v1/admin/categories
 * Returns all available game categories for metadata selection
 */
adminRouter.get('/categories', (req, res) => {
  const db = getDb();
  const categories = db.query(
    'SELECT id, name, slug, description FROM game_categories ORDER BY name ASC'
  );
  res.status(200).json({
    categories,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/admin/games
 * List all games (both published and drafts) with licensing approval status
 * Query params: search, category, status (all|published|draft), licensingStatus, page, limit
 * Traceability: EP03-02, EP10-01, EP10-02, EP10-03
 */
adminRouter.get('/games', (req, res) => {
  try {
    const adminService = getContentAdminService();
    const result = adminService.listAllGames({
      search: req.query.search,
      category: req.query.category,
      status: req.query.status,
      licensingStatus: req.query.licensingStatus,
      page: req.query.page,
      limit: req.query.limit
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'QueryError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/admin/games/:id
 * Retrieve details of a specific game including category and licensing info
 * Traceability: EP10-01, EP10-03, AC-37.1
 */
adminRouter.get('/games/:id', (req, res) => {
  try {
    const adminService = getContentAdminService();
    const game = adminService.getGameById(req.params.id);
    res.status(200).json({
      game,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.status === 404 ? 'NotFound' : 'Error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/admin/games
 * Register a new game with launch URL and metadata
 * Defaults to unpublished draft and pending licensing
 * Traceability: EP03-02, AC-10.1, AC-10.2, AC-10.3, AC-40.1
 */
adminRouter.post('/games', (req, res) => {
  try {
    const adminService = getContentAdminService();
    const game = adminService.createGame(req.body, req.admin.id);
    res.status(201).json({
      message: 'Game registered successfully as draft pending licensing review.',
      game,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.status === 409 ? 'Conflict' : (err.status === 400 ? 'ValidationError' : 'Error'),
      message: err.message,
      validationErrors: err.validationErrors || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/admin/games/:id
 * Edit game title, category, description, and metadata
 * Traceability: EP10-01, AC-35.1, AC-35.2, AC-40.1
 */
adminRouter.put('/games/:id', (req, res) => {
  try {
    const adminService = getContentAdminService();
    const game = adminService.updateGame(req.params.id, req.body, req.admin.id);
    res.status(200).json({
      message: 'Game metadata updated successfully.',
      game,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.status === 409 ? 'Conflict' : (err.status === 400 ? 'ValidationError' : (err.status === 404 ? 'NotFound' : 'Error')),
      message: err.message,
      validationErrors: err.validationErrors || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/admin/games/:id/publish
 * Publish or unpublish an individual game
 * Enforces licensing clearance gate (must be 'approved' to publish)
 * Traceability: EP10-02, AC-36.1, AC-36.2, AC-37.2, AC-40.1
 */
adminRouter.patch('/games/:id/publish', (req, res) => {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Request body must contain boolean field `isPublished`',
        timestamp: new Date().toISOString()
      });
    }

    const adminService = getContentAdminService();
    const result = adminService.setPublicationStatus(req.params.id, isPublished, req.admin.id);
    res.status(200).json({
      message: isPublished ? 'Game published successfully to public catalog.' : 'Game unpublished successfully and removed from public discovery.',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.code || (err.status === 404 ? 'NotFound' : (err.status === 422 ? 'LicensingBlocked' : 'Error')),
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/admin/games/:id/licensing
 * Update licensing approval status for a game
 * Auto-unpublishes the game if status is set away from 'approved'
 * Traceability: EP10-03, AC-37.1, AC-37.3, AC-40.1
 */
adminRouter.put('/games/:id/licensing', (req, res) => {
  try {
    const { status, notes, rightsType, permittedChannels, commercialConditions, expiresAt } = req.body || {};
    const adminService = getContentAdminService();
    const result = adminService.setLicensingStatus(
      req.params.id,
      { status, notes, rightsType, permittedChannels, commercialConditions, expiresAt },
      req.admin.id
    );
    res.status(200).json({
      message: `Licensing status updated to '${status}'.${result.autoUnpublished ? ' Game automatically unpublished due to loss of distribution approval.' : ''}`,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.status === 400 ? 'ValidationError' : (err.status === 404 ? 'NotFound' : 'Error'),
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Guard: Audit logs are strictly immutable and append-only (Task 4)
 * Rejects DELETE, PUT, POST, PATCH on /audit-events with HTTP 405 Method Not Allowed
 */
adminRouter.all(['/audit-events', '/audit-events/:id', '/audit-events/*'], (req, res, next) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'MethodNotAllowed',
      message: 'Audit ledger is strictly immutable and append-only. Modification or deletion of historical audit logs is prohibited.',
      timestamp: new Date().toISOString()
    });
  }
  next();
});

/**
 * GET /api/v1/admin/audit-events
 * Retrieve administrative audit events
 * Traceability: EP11-02, AC-40.3
 */
adminRouter.get('/audit-events', (req, res) => {
  try {
    const adminService = getContentAdminService();
    const result = adminService.getAuditEvents({
      limit: req.query.limit,
      offset: req.query.offset,
      action: req.query.action,
      resource: req.query.resource,
      actorId: req.query.actorId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });
    res.status(200).json({
      events: result.events,
      count: result.count,
      totalCount: result.totalCount,
      limit: result.limit,
      offset: result.offset,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'QueryError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = {
  adminRouter
};
