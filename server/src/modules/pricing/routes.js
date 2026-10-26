const express = require('express');
const { getPricingService } = require('./pricingService');
const { requireAuth, optionalAuth } = require('../identity/middleware');

const router = express.Router();

/**
 * GET /api/v1/pricing/:gameIdOrSlug
 * GET /api/v1/pricing/games/:gameIdOrSlug
 * Returns authoritative regional pricing for a game
 */
router.get(['/:gameIdOrSlug', '/games/:gameIdOrSlug'], optionalAuth, (req, res) => {
  try {
    const { gameIdOrSlug } = req.params;
    const country = req.query.country || (req.player && req.player.country) || 'US';
    const pricingService = getPricingService();
    const pricing = pricingService.getRegionalPrice(gameIdOrSlug, country);

    res.status(200).json({
      status: 'SUCCESS',
      pricing,
      ...pricing,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.code || 'PricingError',
      code: err.code || 'PricingError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/store/purchase
 * Authoritative game purchase endpoint with anti-tampering validation
 */
router.post('/purchase', requireAuth, (req, res) => {
  try {
    const playerId = req.player?.id || req.user?.id;
    const gameIdOrSlug = req.body.gameIdOrSlug || req.body.gameId || req.body.slug;
    const countryCode = req.body.countryCode || req.body.country;
    const clientPriceMinor = req.body.clientPriceMinor !== undefined ? req.body.clientPriceMinor : req.body.offeredPriceMinor;
    const paymentMethod = req.body.paymentMethod || 'SANDBOX_SIMULATION';
    const currency = req.body.currency || req.body.currencyCode;
    const envOverride = req.headers['x-environment'] || req.body.env;

    if (!gameIdOrSlug) {
      return res.status(400).json({
        error: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: 'gameIdOrSlug is required.',
        timestamp: new Date().toISOString()
      });
    }

    const pricingService = getPricingService();
    const result = pricingService.purchaseGame({
      playerId,
      gameIdOrSlug,
      countryCode,
      clientPriceMinor,
      currency,
      paymentMethod,
      envOverride
    });

    res.status(201).json({
      ...result,
      entitlement: result.entitlement,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.code || 'PurchaseError',
      code: err.code || 'PurchaseError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/store/entitlements/me
 * Returns player's owned game entitlements
 */
router.get('/entitlements/me', requireAuth, (req, res) => {
  try {
    const playerId = req.player?.id || req.user?.id;
    const pricingService = getPricingService();
    const entitlements = pricingService.getPlayerEntitlements(playerId);

    res.status(200).json({
      status: 'SUCCESS',
      count: entitlements.length,
      entitlements,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'EntitlementError',
      code: 'ENTITLEMENT_ERROR',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/store/refund
 * Refund and revoke game entitlement
 */
router.post('/refund', requireAuth, (req, res) => {
  try {
    const actorId = req.player?.id || req.user?.id;
    let { playerId, gameIdOrSlug, entitlementId, reason } = req.body;

    const pricingService = getPricingService();
    if (!gameIdOrSlug && entitlementId) {
      const ent = pricingService.db.get('SELECT game_id, player_id FROM game_entitlements WHERE id = ?', [entitlementId]);
      if (ent) {
        gameIdOrSlug = ent.game_id;
        if (!playerId) {
          playerId = ent.player_id;
        }
      }
    }

    // Strict Authorization Guard: Non-administrators cannot modify or refund entitlements belonging to other players
    const isAdmin = req.player?.role === 'admin' || req.user?.role === 'admin';
    if (playerId && playerId !== actorId && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'UNAUTHORIZED_ACCOUNT_CHANGE',
        message: 'Non-administrators are not authorized to modify or refund entitlements belonging to other accounts.',
        timestamp: new Date().toISOString()
      });
    }

    const targetPlayerId = (isAdmin && playerId) ? playerId : actorId;
    const result = pricingService.refundGame({
      actorId,
      playerId: targetPlayerId,
      gameIdOrSlug,
      reason
    });

    res.status(200).json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Store Refund Error]', err);
    res.status(err.status || 500).json({
      error: err.code || 'RefundError',
      code: err.code || 'RefundError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
