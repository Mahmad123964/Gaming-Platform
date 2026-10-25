/**
 * Subscription Service
 * Traceability: EP08-01, EP08-02, EP08-03, EP08-04
 * Acceptance Criteria: AC-27.1, AC-27.2, AC-27.3, AC-28.1, AC-28.2, AC-28.3, AC-29.1, AC-29.2, AC-29.3, AC-30.1, AC-30.2, AC-30.3
 */

const crypto = require('node:crypto');
const { getDb } = require('../../db');

class SubscriptionService {
  constructor(db) {
    this.db = (db && db.prepare) ? db : (db?.db || getDb().db || getDb());
  }

  /**
   * Get all available subscription plans with comparison matrix
   * Traceability: EP08-01, AC-27.1, AC-27.2, AC-27.3
   */
  getPlans() {
    const rows = this.db.prepare(
      `SELECT id, name, price_cents, currency, interval, features_json, is_popular
       FROM subscription_plans
       WHERE id IN ('plan-free', 'plan-pro-monthly', 'plan-ultimate-monthly')
       ORDER BY price_cents ASC`
    ).all();

    return rows.map((row) => {
      let features = [];
      try {
        features = JSON.parse(row.features_json || '[]');
      } catch (e) {
        features = [];
      }

      return {
        id: row.id,
        name: row.name,
        priceCents: row.price_cents,
        priceFormatted: `$${(row.price_cents / 100).toFixed(2)}`,
        currency: row.currency || 'USD',
        interval: row.interval || 'monthly',
        features,
        isPopular: Boolean(row.is_popular) || row.id === 'plan-pro-monthly',
        tier: row.id.includes('ultimate') ? 'ultimate' : (row.id.includes('pro') ? 'pro' : 'free')
      };
    });
  }

  /**
   * Get player's current subscription status, tier name, and expiry date
   * Traceability: EP08-03, AC-29.1, AC-29.2, AC-29.3
   */
  getSubscription(playerId) {
    if (!playerId) {
      return {
        tier: 'Free Explorer',
        planId: 'plan-free',
        status: 'free',
        isActive: false,
        currentPeriodEnd: null,
        renewalDate: null,
        features: [
          'Access to all Free Catalog Games',
          'Standard Online Multiplayer',
          'Community Text Chat & Avatars',
          'Single Device Progress Save'
        ]
      };
    }

    const row = this.db.prepare(
      `SELECT s.id, s.player_id, s.plan_id, s.status, s.current_period_end, s.created_at,
              p.name as plan_name, p.price_cents, p.currency, p.interval, p.features_json
       FROM subscriptions s
       LEFT JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.player_id = ?
       ORDER BY s.created_at DESC
       LIMIT 1`
    ).get(playerId);

    if (!row || row.plan_id === 'plan-free') {
      return {
        tier: 'Free Explorer',
        planId: 'plan-free',
        status: 'free',
        isActive: false,
        currentPeriodEnd: null,
        renewalDate: null,
        features: [
          'Access to all Free Catalog Games',
          'Standard Online Multiplayer',
          'Community Text Chat & Avatars',
          'Single Device Progress Save'
        ]
      };
    }

    const expiry = new Date(row.current_period_end);
    const now = new Date();
    const isExpired = expiry.getTime() < now.getTime() || row.status === 'expired' || row.status === 'cancelled';
    const status = isExpired ? 'expired' : row.status;

    let features = [];
    try {
      features = JSON.parse(row.features_json || '[]');
    } catch (e) {
      features = [];
    }

    return {
      tier: row.plan_name || 'Nexus Pro',
      planId: row.plan_id,
      status,
      isActive: status === 'active',
      currentPeriodEnd: expiry.toISOString(),
      renewalDate: expiry.toISOString(),
      features
    };
  }

  /**
   * Subscribe or upgrade a player to a chosen plan
   * Simulates payment gateway processing and activates entitlement
   * Traceability: EP08-02, EP08-04, AC-28.1, AC-30.2
   */
  subscribe({ playerId, planId, paymentMethod = 'simulated_card' }) {
    if (!playerId) {
      const err = new Error('Player ID is required to create or modify a subscription.');
      err.status = 400;
      throw err;
    }

    if (!planId) {
      const err = new Error('Plan identifier is required.');
      err.status = 400;
      throw err;
    }

    const plan = this.db.prepare(
      `SELECT id, name, price_cents, currency, interval, features_json
       FROM subscription_plans
       WHERE id = ?`
    ).get(planId);

    if (!plan) {
      const err = new Error(`Subscription plan '${planId}' does not exist.`);
      err.status = 404;
      throw err;
    }

    if (plan.id === 'plan-free') {
      // Downgrade / cancel to free tier
      this.cancelSubscription(playerId);
      return this.getSubscription(playerId);
    }

    // Critical Security Guard: Simulated payment strictly disallowed in production environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
    if (isProduction) {
      const err = new Error('Live payment gateway is not configured for production. Subscription upgrades via simulation are prohibited in production environment.');
      err.status = 501;
      err.code = 'PAYMENT_GATEWAY_NOT_CONFIGURED';
      throw err;
    }

    // 30 days entitlement duration
    const durationDays = plan.interval === 'yearly' ? 365 : 30;
    const currentPeriodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const existingSub = this.db.prepare(
      `SELECT id FROM subscriptions WHERE player_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(playerId);

    const subId = existingSub ? existingSub.id : `sub-${crypto.randomUUID()}`;
    const txId = `tx-${crypto.randomUUID()}`;
    const gatewayRef = `gw-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    if (existingSub) {
      this.db.prepare(
        `UPDATE subscriptions
         SET plan_id = ?, status = 'active', current_period_end = ?
         WHERE id = ?`
      ).run(plan.id, currentPeriodEnd, existingSub.id);
    } else {
      this.db.prepare(
        `INSERT INTO subscriptions (id, player_id, plan_id, status, current_period_end)
         VALUES (?, ?, ?, 'active', ?)`
      ).run(subId, playerId, plan.id, currentPeriodEnd);
    }

    // Record audit payment transaction
    try {
      this.db.prepare(
        `INSERT INTO payment_transactions (id, player_id, gateway_ref, amount_cents, currency, status)
         VALUES (?, ?, ?, ?, ?, 'succeeded')`
      ).run(txId, playerId, gatewayRef, plan.price_cents, plan.currency || 'USD');
    } catch (e) {
      // Ignore transaction insert error if table locked
    }

    return this.getSubscription(playerId);
  }

  /**
   * Cancel active subscription
   * Traceability: EP08-03, AC-29.3
   */
  cancelSubscription(playerId) {
    if (!playerId) return;

    this.db.prepare(
      `UPDATE subscriptions
       SET status = 'cancelled'
       WHERE player_id = ?`
    ).run(playerId);

    return this.getSubscription(playerId);
  }
}

let subscriptionServiceInstance = null;

function getSubscriptionService(db) {
  if (!subscriptionServiceInstance || db) {
    subscriptionServiceInstance = new SubscriptionService(db);
  }
  return subscriptionServiceInstance;
}

module.exports = {
  SubscriptionService,
  getSubscriptionService
};
