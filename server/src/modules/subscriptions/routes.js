/**
 * Subscription REST API Routes
 * Traceability: EP08-01, EP08-02, EP08-03, EP08-04
 * Acceptance Criteria: AC-27.1, AC-27.2, AC-27.3, AC-28.1, AC-28.2, AC-28.3, AC-29.1, AC-29.2, AC-29.3, AC-30.1, AC-30.2, AC-30.3
 */

const express = require('express');
const { getSubscriptionService } = require('./subscriptionService');
const { requireAuth, optionalAuth } = require('../identity/middleware');

const subscriptionRouter = express.Router();

/**
 * GET /api/v1/subscriptions/plans
 * Public plan comparison matrix: Free Explorer, Nexus Pro, Nexus Ultimate
 * Accessible without authentication (AC-27.3)
 * Traceability: EP08-01, AC-27.1, AC-27.2, AC-27.3
 */
subscriptionRouter.get('/plans', (req, res) => {
  try {
    const subService = getSubscriptionService();
    const plans = subService.getPlans();

    res.status(200).json({
      status: 'SUCCESS',
      count: plans.length,
      plans,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'PlanFetchError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/subscriptions/me
 * Returns authenticated player's membership tier, status, and ISO 8601 renewal date
 * Traceability: EP08-03, AC-29.1, AC-29.2, AC-29.3
 */
subscriptionRouter.get('/me', requireAuth, (req, res) => {
  try {
    const subService = getSubscriptionService();
    const playerId = req.player?.id || req.user?.id;
    const subscription = subService.getSubscription(playerId);

    res.status(200).json({
      status: 'SUCCESS',
      subscription,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'SubscriptionFetchError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/subscriptions/subscribe
 * Subscribe or upgrade player to a chosen plan
 * Traceability: EP08-02, EP08-04, AC-28.1, AC-30.2
 */
subscriptionRouter.post('/subscribe', requireAuth, (req, res) => {
  try {
    const subService = getSubscriptionService();
    const playerId = req.player?.id || req.user?.id;
    const { planId, paymentMethod } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'planId is required to subscribe.',
        timestamp: new Date().toISOString()
      });
    }

    const subscription = subService.subscribe({
      playerId,
      planId,
      paymentMethod: paymentMethod || 'simulated_card'
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: `Successfully subscribed to ${subscription.tier}`,
      subscription,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'SubscriptionError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/subscriptions/cancel
 * Cancel current subscription
 * Traceability: EP08-03, AC-29.3
 */
subscriptionRouter.post('/cancel', requireAuth, (req, res) => {
  try {
    const subService = getSubscriptionService();
    const playerId = req.player?.id || req.user?.id;

    const subscription = subService.cancelSubscription(playerId);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Subscription successfully cancelled.',
      subscription,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'SubscriptionCancelError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = {
  subscriptionRouter
};
