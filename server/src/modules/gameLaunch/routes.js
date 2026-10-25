/**
 * Game Launch & Session REST API Routes
 * Traceability: EP03-01, EP03-03, EP03-04, EP04-01, EP04-03
 * Acceptance Criteria: AC-9.1..9.3, AC-11.1..11.3, AC-12.1..12.3, AC-13.1..13.3, AC-15.1..15.3
 */

const express = require('express');
const { getGameLaunchService } = require('./gameLaunchService');
const { getSessionService } = require('./sessionService');
const { optionalAuth } = require('../identity/middleware');

const gameLaunchRouter = express.Router();

/**
 * POST /api/v1/games/:idOrSlug/launch
 * Validate eligibility, start single-player session, and issue secure launch ticket
 * Traceability: EP03-01, EP03-03, EP03-04, EP04-01, AC-9.1, AC-9.2, AC-9.3, AC-11.1, AC-12.2, AC-13.1
 */
gameLaunchRouter.post('/games/:idOrSlug/launch', optionalAuth, (req, res) => {
  try {
    const launchService = getGameLaunchService();
    const userAgent = req.headers['user-agent'] || '';
    const clientCapabilities = req.body.clientCapabilities || null;
    const resume = req.body.resume === true || req.query.resume === 'true';

    const result = launchService.launchGame({
      gameIdOrSlug: req.params.idOrSlug,
      user: req.player,
      clientCapabilities,
      resume,
      userAgent,
      ip: req.ip
    });

    res.status(200).json({
      status: 'SUCCESS',
      ...result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.code || 'LaunchError',
      message: err.message,
      details: err.details || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/games/:idOrSlug/launch-status
 * Pre-flight check for launch eligibility without starting a session
 * Traceability: EP03-01, EP03-03, EP03-04, AC-9.1, AC-9.2, AC-11.1, AC-12.1
 */
gameLaunchRouter.get('/games/:idOrSlug/launch-status', optionalAuth, (req, res) => {
  try {
    const launchService = getGameLaunchService();
    const userAgent = req.headers['user-agent'] || '';

    const result = launchService.validateLaunchEligibility({
      gameIdOrSlug: req.params.idOrSlug,
      user: req.player,
      userAgent
    });

    res.status(200).json({
      eligible: true,
      gameId: result.game.id,
      title: result.game.title,
      slug: result.game.slug,
      isPremium: result.isPremium,
      compatibility: result.compatibility,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      eligible: false,
      error: err.code || 'EligibilityError',
      message: err.message,
      details: err.details || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/sessions/:sessionId
 * Retrieve details and state of a game session
 * Traceability: EP04-01, AC-13.1
 */
gameLaunchRouter.get('/sessions/:sessionId', (req, res) => {
  try {
    const sessionService = getSessionService();
    const session = sessionService.getSession(req.params.sessionId);
    res.status(200).json({ session });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.code || 'SessionError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/sessions/:sessionId/restart
 * Restart an active session, resetting in-session score to 0 and reinitializing state
 * Traceability: EP04-03, AC-15.1, AC-15.2, AC-15.3
 */
gameLaunchRouter.post('/sessions/:sessionId/restart', (req, res) => {
  try {
    const sessionService = getSessionService();
    const updatedSession = sessionService.restartSession(req.params.sessionId);
    res.status(200).json({
      status: 'RESTARTED',
      session: updatedSession,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.code || 'RestartError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/sessions/:sessionId/progress
 * Update real-time score and session state
 */
gameLaunchRouter.post('/sessions/:sessionId/progress', (req, res) => {
  try {
    const sessionService = getSessionService();
    const { score = 0, state = {} } = req.body;
    const session = sessionService.updateSessionProgress(req.params.sessionId, { score, state });
    res.status(200).json({ session });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.code || 'ProgressError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/sessions/:sessionId/end
 * End an active session so it is no longer presented as active
 * Traceability: EP04-01, AC-13.3
 */
gameLaunchRouter.post('/sessions/:sessionId/end', (req, res) => {
  try {
    const sessionService = getSessionService();
    const endedSession = sessionService.endSession(req.params.sessionId);
    res.status(200).json({
      status: 'ENDED',
      session: endedSession,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.code || 'EndSessionError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/games/verify-ticket
 * Validates a launch ticket
 * Traceability: EP03-04, AC-12.1
 */
gameLaunchRouter.get('/games/verify-ticket', (req, res) => {
  const launchService = getGameLaunchService();
  const ticket = req.query.ticket;
  const result = launchService.validateLaunchTicket(ticket);

  if (!result.valid) {
    return res.status(403).json({
      valid: false,
      error: 'InvalidTicket',
      message: result.reason,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    valid: true,
    payload: result.payload,
    timestamp: new Date().toISOString()
  });
});

/**
 * Guard Middleware: Direct Launch URL Authorization Guard (EP03-04, AC-12.1)
 * Prevents unauthorized or direct URL access to game destinations without valid launch ticket
 */
function directLaunchGuard(req, res, next) {
  const launchService = getGameLaunchService();
  const ticket = req.query.ticket;

  if (!ticket) {
    return res.status(403).json({
      error: 'DirectLaunchDenied',
      message: 'Direct launch access denied. A valid, unexpired session launch ticket is required to access game assets directly (AC-12.1).',
      timestamp: new Date().toISOString()
    });
  }

  const verification = launchService.validateLaunchTicket(ticket);
  if (!verification.valid) {
    return res.status(403).json({
      error: 'DirectLaunchDenied',
      message: `Direct launch access denied: ${verification.reason} (AC-12.1).`,
      timestamp: new Date().toISOString()
    });
  }

  req.launchTicketPayload = verification.payload;
  next();
}

module.exports = {
  gameLaunchRouter,
  directLaunchGuard
};
