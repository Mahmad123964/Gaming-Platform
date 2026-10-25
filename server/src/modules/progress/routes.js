/**
 * Progress, History, and Achievements Express Router
 * Traceability: EP07-01, EP07-02, EP07-03, EP07-04
 * Acceptance Criteria: AC-23.1..23.3, AC-24.1..24.3, AC-25.1..25.3, AC-26.1..26.3
 */

const express = require('express');
const { getProgressService } = require('./progressService');
const { requireAuth } = require('../identity/middleware');

const router = express.Router();
const progressService = getProgressService();

/**
 * POST /api/v1/progress/complete
 * Record completed game score and update player history (AC-23.1, AC-23.3)
 */
router.post('/complete', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { gameId, gameIdOrSlug, sessionId, score, level, durationSeconds, state, stateData } = req.body;

    const result = progressService.recordCompletedGame({
      playerId: player.id,
      gameId: gameId || gameIdOrSlug,
      sessionId,
      score,
      level,
      durationSeconds,
      state: state || stateData || {}
    });

    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'RecordGameError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/progress/history
 * Retrieve current player's recent 10 completed game sessions (AC-25.1..25.3)
 */
router.get('/history', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const limit = parseInt(req.query.limit, 10) || 10;
    const history = progressService.getRecentHistory(player.id, player.id, limit);
    return res.status(200).json(history);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'GetHistoryError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/progress/history/:playerId
 * Retrieve history for a specified player ID, strictly enforcing isolation (AC-23.2)
 */
router.get('/history/:playerId', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { playerId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    // AC-23.2: Given a different player accesses score history, Then first player's private records are not exposed
    if (player.id !== playerId && player.role !== 'admin') {
      return res.status(403).json({
        error: 'UNAUTHORIZED_HISTORY_ACCESS',
        message: 'Access denied: You cannot view another player\'s private game history (AC-23.2).',
        timestamp: new Date().toISOString()
      });
    }

    const history = progressService.getRecentHistory(player.id, playerId, limit);
    return res.status(200).json(history);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'GetHistoryError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/progress/checkpoint
 * Save or update player checkpoint level for supported games (AC-24.1)
 */
router.post('/checkpoint', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { gameId, gameIdOrSlug, level, score, state, stateData } = req.body;

    const progressData = progressService.saveProgress({
      playerId: player.id,
      gameId: gameId || gameIdOrSlug || 'cyber-invaders',
      level,
      score,
      state: state || stateData || {}
    });

    return res.status(200).json(progressData);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'SaveProgressError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/progress/checkpoint/:gameIdOrSlug
 * Retrieve current player's saved level progress for a game (AC-24.1, AC-24.2)
 */
router.get('/checkpoint/:gameIdOrSlug', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { gameIdOrSlug } = req.params;
    const progress = progressService.getProgress(player.id, player.id, gameIdOrSlug);
    return res.status(200).json(progress);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'GetProgressError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/progress/checkpoint/:gameIdOrSlug/:playerId
 * Retrieve saved progress with cross-player access isolation (AC-24.3)
 */
router.get('/checkpoint/:gameIdOrSlug/:playerId', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { gameIdOrSlug, playerId } = req.params;

    // AC-24.3: Given a different player requests another player's saved level, access is denied
    if (player.id !== playerId && player.role !== 'admin') {
      return res.status(403).json({
        error: 'UNAUTHORIZED_PROGRESS_ACCESS',
        message: 'Access denied: You cannot view or resume another player\'s saved level (AC-24.3).',
        timestamp: new Date().toISOString()
      });
    }

    const progress = progressService.getProgress(player.id, playerId, gameIdOrSlug);
    return res.status(200).json(progress);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'GetProgressError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/progress/achievements
 * Retrieve achievements and unlock milestones for current player (AC-26.1, AC-26.2)
 */
router.get('/achievements', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const gameIdOrSlug = req.query.gameIdOrSlug || null;
    const achievements = progressService.getPlayerAchievements(player.id, player.id, gameIdOrSlug);
    return res.status(200).json(achievements);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'GetAchievementsError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/progress/achievements/:playerId
 * Retrieve achievements with cross-player data isolation (AC-26.3)
 */
router.get('/achievements/:playerId', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { playerId } = req.params;
    const gameIdOrSlug = req.query.gameIdOrSlug || null;

    // AC-26.3: Player viewing achievements cannot see another player's private status
    if (player.id !== playerId && player.role !== 'admin') {
      return res.status(403).json({
        error: 'UNAUTHORIZED_ACHIEVEMENT_ACCESS',
        message: 'Access denied: You cannot view another player\'s private achievements (AC-26.3).',
        timestamp: new Date().toISOString()
      });
    }

    const achievements = progressService.getPlayerAchievements(player.id, playerId, gameIdOrSlug);
    return res.status(200).json(achievements);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'GetAchievementsError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
