/**
 * Regional Pricing & Game Entitlement Service
 * Traceability: Tasks 2, 7, 8, 9, 10
 */

const crypto = require('node:crypto');
const { getDb } = require('../../db');

// Supported Country to Default Currency mapping
const COUNTRY_CURRENCY_MAP = {
  PK: 'PKR',
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  CA: 'CAD',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  EU: 'EUR'
};

class PricingService {
  constructor(db) {
    this.db = db || getDb();
    this.seedDefaultRegionalPrices();
  }

  /**
   * Seed baseline regional pricing for commercial paid games
   */
  seedDefaultRegionalPrices() {
    try {
      const paidGames = this.db.query("SELECT id, slug FROM games WHERE commercial_model = 'PAID_ONE_TIME' OR is_premium = 1");
      const defaultTiers = [
        { country: 'PK', currency: 'PKR', minor: 25000, display: 'PKR 250', minMinor: 20000 },
        { country: 'IN', currency: 'INR', minor: 14900, display: '₹149', minMinor: 10000 },
        { country: 'US', currency: 'USD', minor: 399, display: '$3.99', minMinor: 299 },
        { country: 'GB', currency: 'GBP', minor: 299, display: '£2.99', minMinor: 249 },
        { country: 'CA', currency: 'CAD', minor: 499, display: 'CAD 4.99', minMinor: 399 },
        { country: 'EU', currency: 'EUR', minor: 349, display: '€3.49', minMinor: 299 }
      ];

      for (const game of paidGames) {
        for (const tier of defaultTiers) {
          const id = `price-${game.id}-${tier.country.toLowerCase()}`;
          this.db.run(`
            INSERT OR IGNORE INTO game_regional_prices (
              id, game_id, country_code, currency_code, price_minor, price_display,
              publisher_min_minor, tax_inclusive, promotional_discount_percent, refund_period_days
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 14)
          `, [id, game.id, tier.country, tier.currency, tier.minor, tier.display, tier.minMinor]);
        }
      }
    } catch (err) {
      console.error('[PricingService] Error seeding default regional prices:', err.message);
    }
  }

  /**
   * Determine default currency from country code
   */
  getCurrencyForCountry(countryCode) {
    if (!countryCode) return 'USD';
    const code = countryCode.trim().toUpperCase();
    return COUNTRY_CURRENCY_MAP[code] || 'USD';
  }

  /**
   * Get authoritative regional price for a game in a specific country
   */
  getRegionalPrice(gameIdOrSlug, countryCode = 'US') {
    const cleanIdOrSlug = (gameIdOrSlug || '').trim();
    const cleanCountry = (countryCode || 'US').trim().toUpperCase();

    const game = this.db.get(
      'SELECT id, title, slug, commercial_model, is_premium, default_currency, default_price_minor, external_store_url, external_store_name, region_restrictions_json FROM games WHERE id = ? OR LOWER(slug) = LOWER(?)',
      [cleanIdOrSlug, cleanIdOrSlug]
    );

    if (!game) {
      const err = new Error(`Game '${cleanIdOrSlug}' not found.`);
      err.status = 404;
      err.code = 'GAME_NOT_FOUND';
      throw err;
    }

    // Check regional restriction
    let restrictions = [];
    try {
      restrictions = JSON.parse(game.region_restrictions_json || '[]');
    } catch (e) {
      restrictions = [];
    }

    const isRestrictedInCountry = restrictions.includes(cleanCountry);

    // Free titles
    if (game.commercial_model === 'FREE' || game.commercial_model === 'FREE_TO_PLAY_WITH_PURCHASES') {
      return {
        gameId: game.id,
        slug: game.slug,
        title: game.title,
        commercialModel: game.commercial_model,
        country: cleanCountry,
        currency: this.getCurrencyForCountry(cleanCountry),
        priceMinor: 0,
        priceDisplay: 'Free to Play',
        isFree: true,
        isRestricted: isRestrictedInCountry,
        taxInclusive: true,
        refundPeriodDays: 0
      };
    }

    // External store titles
    if (game.commercial_model === 'EXTERNAL_STORE') {
      return {
        gameId: game.id,
        slug: game.slug,
        title: game.title,
        commercialModel: 'EXTERNAL_STORE',
        country: cleanCountry,
        isExternalStore: true,
        externalStoreName: game.external_store_name || 'Official Store',
        externalStoreUrl: game.external_store_url,
        isRestricted: isRestrictedInCountry,
        notice: 'Game must be purchased or played on the external official platform.'
      };
    }

    // Unavailable titles
    if (game.commercial_model === 'UNAVAILABLE_PENDING_LICENSE') {
      return {
        gameId: game.id,
        slug: game.slug,
        title: game.title,
        commercialModel: 'UNAVAILABLE_PENDING_LICENSE',
        country: cleanCountry,
        isAvailable: false,
        notice: 'Distribution rights pending licensing clearance.'
      };
    }

    // Paid one-time or subscription optional
    let priceRow = this.db.get(
      'SELECT * FROM game_regional_prices WHERE game_id = ? AND country_code = ?',
      [game.id, cleanCountry]
    );

    // Fallback to EU if European country
    if (!priceRow && ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'GR'].includes(cleanCountry)) {
      priceRow = this.db.get('SELECT * FROM game_regional_prices WHERE game_id = ? AND country_code = "EU"', [game.id]);
    }

    // Fallback to US default if country pricing not set
    if (!priceRow) {
      priceRow = this.db.get('SELECT * FROM game_regional_prices WHERE game_id = ? AND country_code = "US"', [game.id]);
    }

    const priceMinor = priceRow ? priceRow.price_minor : (game.default_price_minor || 399);
    const currency = priceRow ? priceRow.currency_code : (game.default_currency || 'USD');
    const priceDisplay = priceRow ? priceRow.price_display : `$${(priceMinor / 100).toFixed(2)}`;

    return {
      gameId: game.id,
      slug: game.slug,
      title: game.title,
      commercialModel: game.commercial_model,
      country: cleanCountry,
      currency,
      priceMinor,
      priceDisplay,
      isFree: false,
      isRestricted: isRestrictedInCountry,
      taxInclusive: Boolean(priceRow ? priceRow.tax_inclusive : 1),
      publisherMinMinor: priceRow ? priceRow.publisher_min_minor : 0,
      promotionalDiscountPercent: priceRow ? priceRow.promotional_discount_percent : 0,
      refundPeriodDays: priceRow ? priceRow.refund_period_days : 14
    };
  }

  /**
   * Authoritative Game Purchase (One-time ownership grant)
   * Enforces server-side price calculation and rejects client tampering
   */
  purchaseGame({ playerId, gameIdOrSlug, countryCode, clientPriceMinor, currency, paymentMethod = 'sandbox_card', envOverride }) {
    if (!playerId) {
      const err = new Error('Authentication required to purchase games.');
      err.status = 401;
      throw err;
    }

    const player = this.db.get('SELECT id, email, display_name, country FROM players WHERE id = ?', [playerId]);
    if (!player) {
      const err = new Error('Player account not found.');
      err.status = 404;
      throw err;
    }

    const effectiveCountry = (countryCode || player.country || 'US').trim().toUpperCase();
    const authoritativePrice = this.getRegionalPrice(gameIdOrSlug, effectiveCountry);

    // Reject purchase on external or unapproved games
    if (authoritativePrice.commercialModel === 'EXTERNAL_STORE') {
      const err = new Error(`Cannot purchase directly on NexusPlay: "${authoritativePrice.title}" is hosted externally on ${authoritativePrice.externalStoreName}.`);
      err.status = 400;
      err.code = 'EXTERNAL_STORE_ONLY';
      throw err;
    }

    if (authoritativePrice.commercialModel === 'UNAVAILABLE_PENDING_LICENSE') {
      const err = new Error(`Cannot purchase: "${authoritativePrice.title}" is pending distribution licensing clearance.`);
      err.status = 422;
      err.code = 'GAME_UNAVAILABLE_PENDING_LICENSE';
      throw err;
    }

    if (authoritativePrice.isRestricted) {
      const err = new Error(`Purchase Blocked: "${authoritativePrice.title}" is not available in your region (${effectiveCountry}).`);
      err.status = 403;
      err.code = 'GEO_RESTRICTED';
      throw err;
    }

    // Currency mismatch validation
    if (currency && currency.trim().toUpperCase() !== authoritativePrice.currency.trim().toUpperCase()) {
      const err = new Error(`Currency mismatch detected: submitted currency (${currency}) does not match regional currency (${authoritativePrice.currency}) for country ${effectiveCountry}.`);
      err.status = 400;
      err.code = 'CURRENCY_MISMATCH_DETECTED';
      throw err;
    }

    // Anti-Tampering Check: Client cannot specify a lower or mismatched price
    if (clientPriceMinor !== undefined && clientPriceMinor !== null) {
      const submitted = parseInt(clientPriceMinor, 10);
      if (submitted !== authoritativePrice.priceMinor) {
        const err = new Error(`Price tampering detected: submitted price (${submitted}) does not match authoritative server price (${authoritativePrice.priceMinor} ${authoritativePrice.currency}).`);
        err.status = 400;
        err.code = 'PRICE_TAMPERING_DETECTED';
        throw err;
      }
    }

    // Critical Production Guard
    const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production' || envOverride === 'production';
    if (isProduction) {
      const err = new Error('Live payment gateway is not configured for production. Purchases via simulation are strictly prohibited in production environment.');
      err.status = 501;
      err.code = 'PAYMENT_GATEWAY_NOT_CONFIGURED';
      throw err;
    }

    // Execute atomic entitlement grant in SQLite
    const entitlementId = `ent-${crypto.randomUUID()}`;
    const txId = `tx-${crypto.randomUUID()}`;
    const gatewayRef = `sim-pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    this.db.transaction(() => {
      this.db.run(`
        INSERT OR REPLACE INTO game_entitlements (
          id, player_id, game_id, entitlement_type, status,
          purchase_price_minor, currency_code, billing_country,
          payment_ref, source, granted_at
        ) VALUES (?, ?, ?, 'OWNED_GAME_LICENSE', 'ACTIVE', ?, ?, ?, ?, 'PURCHASE_VERIFIED', CURRENT_TIMESTAMP)
      `, [
        entitlementId, playerId, authoritativePrice.gameId,
        authoritativePrice.priceMinor, authoritativePrice.currency,
        effectiveCountry, gatewayRef
      ]);

      this.db.run(`
        INSERT INTO payment_transactions (
          id, player_id, gateway_ref, amount_cents, currency, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
      `, [txId, playerId, gatewayRef, authoritativePrice.priceMinor, authoritativePrice.currency]);

      // Record audit event
      const eventId = `audit-${crypto.randomUUID()}`;
      this.db.run(`
        INSERT INTO audit_events (id, actor_id, action, resource, details_json, created_at)
        VALUES (?, ?, 'GAME_PURCHASE_COMPLETED', ?, ?, CURRENT_TIMESTAMP)
      `, [
        eventId, playerId, `game:${authoritativePrice.gameId}`,
        JSON.stringify({
          gameId: authoritativePrice.gameId,
          slug: authoritativePrice.slug,
          priceMinor: authoritativePrice.priceMinor,
          currency: authoritativePrice.currency,
          billingCountry: effectiveCountry,
          gatewayRef,
          isSimulated: true
        })
      ]);
    });

    return {
      status: 'SUCCESS',
      message: `Successfully purchased permanent license for "${authoritativePrice.title}".`,
      isSimulated: true,
      simulationNotice: 'Non-production test simulation: No real financial transaction was executed.',
      entitlement: {
        id: entitlementId,
        gameId: authoritativePrice.gameId,
        gameSlug: authoritativePrice.slug,
        title: authoritativePrice.title,
        entitlementType: 'OWNED_GAME_LICENSE',
        status: 'ACTIVE',
        billingCountry: effectiveCountry,
        priceMinor: authoritativePrice.priceMinor,
        currency: authoritativePrice.currency,
        priceDisplay: authoritativePrice.priceDisplay
      },
      receipt: {
        transactionId: txId,
        gatewayRef,
        amountMinor: authoritativePrice.priceMinor,
        currency: authoritativePrice.currency,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Refund / Revoke Game Entitlement (Admin / Testing)
   */
  refundGame({ actorId, playerId, gameIdOrSlug, reason = 'Customer requested refund within policy' }) {
    const game = this.db.get('SELECT id, title, slug FROM games WHERE id = ? OR LOWER(slug) = LOWER(?)', [gameIdOrSlug, gameIdOrSlug]);
    if (!game) {
      const err = new Error(`Game '${gameIdOrSlug}' not found.`);
      err.status = 404;
      throw err;
    }

    const existing = this.db.get('SELECT id, status FROM game_entitlements WHERE player_id = ? AND game_id = ?', [playerId, game.id]);
    if (!existing || existing.status !== 'ACTIVE') {
      const err = new Error(`No active entitlement found for player '${playerId}' and game '${game.title}'.`);
      err.status = 404;
      throw err;
    }

    this.db.transaction(() => {
      this.db.run(
        "UPDATE game_entitlements SET status = 'REFUNDED' WHERE player_id = ? AND game_id = ?",
        [playerId, game.id]
      );

      const eventId = `audit-${crypto.randomUUID()}`;
      this.db.run(`
        INSERT INTO audit_events (id, actor_id, action, resource, details_json, created_at)
        VALUES (?, ?, 'GAME_ENTITLEMENT_REFUNDED', ?, ?, CURRENT_TIMESTAMP)
      `, [
        eventId, actorId || 'admin', `entitlement:${existing.id}`,
        JSON.stringify({ playerId, gameId: game.id, reason, previousStatus: existing.status, newStatus: 'REFUNDED' })
      ]);
    });

    return {
      status: 'SUCCESS',
      message: `Entitlement for "${game.title}" refunded and revoked successfully.`,
      gameId: game.id,
      playerId,
      entitlementStatus: 'REFUNDED',
      entitlement: {
        id: existing.id,
        gameId: game.id,
        status: 'REFUNDED'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if player has an active entitlement for a game
   */
  hasGameEntitlement(playerId, gameId) {
    if (!playerId || !gameId) return false;
    const row = this.db.get(
      'SELECT id, entitlement_type, status FROM game_entitlements WHERE player_id = ? AND game_id = ? AND status = "ACTIVE"',
      [playerId, gameId]
    );
    return Boolean(row);
  }

  /**
   * List all game entitlements for a player
   */
  getPlayerEntitlements(playerId) {
    if (!playerId) return [];
    return this.db.query(`
      SELECT e.id, e.game_id, e.entitlement_type, e.status, e.granted_at,
             g.title as game_title, g.slug as game_slug, g.commercial_model, g.is_premium
      FROM game_entitlements e
      JOIN games g ON e.game_id = g.id
      WHERE e.player_id = ? AND e.status = 'ACTIVE'
      ORDER BY e.granted_at DESC
    `, [playerId]);
  }
}

let pricingServiceInstance = null;

function getPricingService(db) {
  if (!pricingServiceInstance || db) {
    pricingServiceInstance = new PricingService(db);
  }
  return pricingServiceInstance;
}

module.exports = {
  PricingService,
  getPricingService
};
