/**
 * NexusPlay — Player Profile Express Router
 * Traceability: EP01-04 (Player Profile Management)
 * Acceptance Criteria: AC-4.1, AC-4.2, AC-4.3
 */

const express = require('express');
const { getProfileService } = require('./profileService');
const { requireAuth } = require('./middleware');

const router = express.Router();
const profileService = getProfileService();

/**
 * GET /api/v1/profile
 * Retrieve authenticated player's profile
 * Traceability: EP01-04, AC-4.1
 */
router.get('/', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const profile = profileService.getProfile(player.id, player.id);
    return res.status(200).json({
      success: true,
      profile,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'ProfileError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/profile/me
 * Explicit alias for current authenticated player profile
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const profile = profileService.getProfile(player.id, player.id);
    return res.status(200).json({
      success: true,
      profile,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'ProfileError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/profile
 * Update authenticated player's profile settings
 * Traceability: EP01-04, AC-4.1, AC-4.2, AC-4.3
 */
router.put('/', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const result = profileService.updateProfile(player.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: result.message,
      profile: result.profile,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'ProfileUpdateError',
      message: err.message,
      details: err.details || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/profile
 * Partial update alias for profile settings
 */
router.patch('/', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const result = profileService.updateProfile(player.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: result.message,
      profile: result.profile,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'ProfileUpdateError',
      message: err.message,
      details: err.details || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/profile/:playerId
 * Retrieve public/sanitized profile for any player ID
 * Enforces privacy mode isolation
 */
router.get('/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const requestingPlayer = req.player || req.user;
    const requestingId = requestingPlayer ? requestingPlayer.id : null;

    const profile = profileService.getProfile(playerId, requestingId);
    return res.status(200).json({
      success: true,
      profile,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'ProfileError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
