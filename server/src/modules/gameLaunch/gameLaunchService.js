/**
 * Game Launch Service
 * Traceability: EP03-01, EP03-03, EP03-04, EP04-01, EP11-02
 * Acceptance Criteria: AC-9.1, AC-9.2, AC-9.3, AC-11.1..11.3, AC-12.1..12.3, AC-13.1..13.3
 */

const crypto = require('node:crypto');
const { getDb } = require('../../db');
const { getCompatibilityService } = require('./compatibilityService');
const { getSessionService } = require('./sessionService');

// Secret for HMAC-signing launch tickets
const TICKET_SECRET = process.env.LAUNCH_TICKET_SECRET || 'nexusplay-launch-secret-key-2026';

class GameLaunchService {
  constructor(db) {
    this.db = db || getDb();
    this.compatService = getCompatibilityService();
    this.sessionService = getSessionService(this.db);
    this.activeTickets = new Map(); // ticket -> { sessionId, gameId, playerId, expiresAt }
  }

  /**
   * Validate launch eligibility across existence, publication, licensing, compatibility, and entitlement
   * Traceability: EP03-01, EP03-03, EP03-04, AC-9.1, AC-9.2, AC-9.3, AC-11.1..11.3, AC-12.1..12.3
   */
  validateLaunchEligibility({ gameIdOrSlug, user = null, clientCapabilities = null, userAgent = '' }) {
    if (!gameIdOrSlug || typeof gameIdOrSlug !== 'string' || gameIdOrSlug.trim().length === 0) {
      const err = new Error('Game identifier or slug is required.');
      err.status = 400;
      throw err;
    }

    const cleanIdOrSlug = gameIdOrSlug.trim();

    // 1. Verify existence (AC-9.3)
    const sql = `
      SELECT g.id, g.title, g.slug, g.description, g.category_id, g.launch_url,
             g.is_published, g.is_premium, g.min_players, g.max_players, g.supports_bots,
             c.name as category_name, c.slug as category_slug,
             l.status as licensing_status, l.notes as licensing_notes
      FROM games g
      LEFT JOIN game_categories c ON g.category_id = c.id
      LEFT JOIN licensing_approvals l ON g.id = l.game_id
      WHERE g.id = ? OR LOWER(g.slug) = LOWER(?)
    `;

    const game = this.db.get(sql, [cleanIdOrSlug, cleanIdOrSlug]);

    if (!game) {
      const err = new Error(`Game '${cleanIdOrSlug}' not found or unavailable (AC-9.3).`);
      err.status = 404;
      err.code = 'GAME_NOT_FOUND';
      throw err;
    }

    // 2. Publication Gate (EP03-04, AC-12.1, AC-12.3)
    // Unpublished games cannot be launched under any circumstances
    if (game.is_published !== 1) {
      const err = new Error(
        `Launch Denied: "${game.title}" is currently an unpublished draft and restricted from public launch (AC-12.1, AC-12.3).`
      );
      err.status = 403;
      err.code = 'GAME_UNPUBLISHED';
      throw err;
    }

    // 3. Licensing Gate (Strict Resolution of Legacy Missing Record Behavior)
    // A game MUST have explicit status = 'approved' in licensing_approvals.
    // Missing licensing records or non-approved status strictly blocks launch.
    if (!game.licensing_status || game.licensing_status !== 'approved') {
      const err = new Error(
        `Launch Blocked: "${game.title}" lacks distribution licensing approval (current status: '${game.licensing_status || 'unrecorded'}'). Distribution clearance is strictly required before launch.`
      );
      err.status = 422;
      err.code = 'LICENSING_APPROVAL_REQUIRED';
      err.details = {
        licensingStatus: game.licensing_status || 'none',
        requiredStatus: 'approved'
      };
      throw err;
    }

    // 4. Device and Browser Compatibility Evaluation (EP03-03, AC-11.1..11.3)
    const compat = this.compatService.checkCompatibility({ userAgent, clientCapabilities });
    if (!compat.supported) {
      const err = new Error(compat.message);
      err.status = 400;
      err.code = compat.code;
      err.details = compat.details;
      throw err;
    }

    // 5. Access Tier & Entitlement Enforcement (EP03-01, EP08-02, AC-9.2, AC-28.1, AC-28.2, AC-28.3, AC-30.1)
    if (game.is_premium === 1) {
      if (!user) {
        const err = new Error(
          `Premium Membership Required: "${game.title}" requires an active Nexus Pro or Nexus Ultimate membership. Upgrade your account to launch (AC-28.2, AC-30.1).`
        );
        err.status = 403;
        err.code = 'AUTHENTICATION_REQUIRED';
        err.details = {
          requiredPlan: 'Nexus Pro',
          gameTitle: game.title,
          currentTier: 'Unauthenticated Guest',
          upgradeUrl: '/plans'
        };
        throw err;
      }

      // Allow admin role bypass for administrative SRE testing
      if (user.role !== 'admin') {
        const sub = this.db.get(
          `SELECT s.id, s.plan_id, s.status, s.current_period_end, p.name as plan_name
           FROM subscriptions s
           LEFT JOIN subscription_plans p ON s.plan_id = p.id
           WHERE s.player_id = ?
           ORDER BY s.created_at DESC LIMIT 1`,
          [user.id]
        );

        if (!sub || sub.plan_id === 'plan-free') {
          const err = new Error(
            `Premium Membership Required: "${game.title}" requires an active Nexus Pro or Nexus Ultimate membership. Upgrade your account to launch (AC-28.2, AC-30.1).`
          );
          err.status = 403;
          err.code = 'ENTITLEMENT_REQUIRED';
          err.details = {
            requiredPlan: 'Nexus Pro',
            gameTitle: game.title,
            currentTier: 'Free Explorer',
            upgradeUrl: '/plans'
          };
          throw err;
        }

        const now = new Date();
        const expiry = new Date(sub.current_period_end);

        if (expiry.getTime() < now.getTime() || sub.status === 'expired' || sub.status === 'cancelled') {
          const formattedDate = expiry.toISOString().split('T')[0];
          const err = new Error(
            `Premium Membership Expired: Your subscription expired on ${formattedDate}. Please renew your membership to launch "${game.title}" (AC-28.3).`
          );
          err.status = 403;
          err.code = 'ENTITLEMENT_EXPIRED';
          err.details = {
            requiredPlan: sub.plan_name || 'Nexus Pro',
            gameTitle: game.title,
            expiredAt: expiry.toISOString(),
            upgradeUrl: '/plans'
          };
          throw err;
        }
      }
    }

    return {
      game,
      compatibility: compat,
      isPremium: game.is_premium === 1,
      accessGranted: true
    };
  }

  /**
   * Launch game: Validate eligibility, start single-player session, and issue secure launch ticket
   * Traceability: EP03-01, EP03-04, EP04-01, AC-9.1, AC-12.2, AC-13.1
   */
  launchGame({ gameIdOrSlug, user = null, clientCapabilities = null, userAgent = '', ip = '127.0.0.1', resume = false }) {
    // 1. Perform validation checks
    const { game, compatibility } = this.validateLaunchEligibility({
      gameIdOrSlug,
      user,
      clientCapabilities,
      userAgent
    });

    // Check for saved progress if resume requested (EP07-02, AC-24.1, AC-24.2)
    let initialWave = 1;
    let initialScore = 0;
    let customState = {};
    let resumptionInfo = null;

    if (resume && user) {
      const saved = this.db.get(
        'SELECT level, score, state_json FROM game_progress WHERE player_id = ? AND game_id = ?',
        [user.id, game.id]
      );
      if (saved) {
        initialWave = saved.level || 1;
        initialScore = saved.score || 0;
        try { customState = saved.state_json ? JSON.parse(saved.state_json) : {}; } catch (_) {}
        resumptionInfo = {
          resumed: true,
          level: initialWave,
          score: initialScore
        };
      } else {
        resumptionInfo = {
          resumed: false,
          message: 'No saved progress found. Starting from Level 1 (AC-24.2).'
        };
      }
    }

    // 2. Create single-player session record in database (AC-13.1, AC-24.1)
    const session = this.sessionService.createSinglePlayerSession({
      gameId: game.id,
      playerId: user ? user.id : 'guest',
      mode: 'single_player',
      initialWave,
      initialScore,
      customState
    });

    // 3. Issue cryptographically signed, short-lived launch ticket (expires in 15 mins)
    const ticketPayload = {
      sessionId: session.sessionId,
      gameId: game.id,
      gameSlug: game.slug,
      playerId: user ? user.id : 'guest',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    };

    const signature = crypto
      .createHmac('sha256', TICKET_SECRET)
      .update(JSON.stringify(ticketPayload))
      .digest('hex');

    const launchTicket = `ltkt-${Buffer.from(JSON.stringify(ticketPayload)).toString('base64url')}.${signature}`;

    // Store in active tickets map for fast in-memory validation
    this.activeTickets.set(launchTicket, ticketPayload);

    // 4. Log audit event
    try {
      this.db.run(
        `INSERT INTO audit_events (id, actor_id, action, resource, details_json, created_at)
         VALUES (?, ?, 'GAME_LAUNCHED', ?, ?, CURRENT_TIMESTAMP)`,
        [
          'audit-' + crypto.randomUUID(),
          user ? user.id : 'guest',
          `game:${game.id}`,
          JSON.stringify({
            gameId: game.id,
            gameTitle: game.title,
            sessionId: session.sessionId,
            isPremium: game.is_premium === 1,
            compatibilityStatus: compatibility.status
          })
        ]
      );
    } catch (_) {}

    return {
      launchTicket,
      sessionId: session.sessionId,
      session,
      resumption: resumptionInfo,
      game: {
        id: game.id,
        title: game.title,
        slug: game.slug,
        description: game.description,
        launchUrl: game.launch_url,
        isPremium: game.is_premium === 1,
        category: {
          id: game.category_id,
          name: game.category_name,
          slug: game.category_slug
        },
        minPlayers: game.min_players,
        maxPlayers: game.max_players,
        supportsBots: game.supports_bots === 1
      },
      compatibility,
      launchDestination: `${game.launch_url}?ticket=${launchTicket}&session=${session.sessionId}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verify launch ticket validity
   * Enforces that direct game execution requires a valid, unexpired ticket
   * Traceability: EP03-04, AC-12.1
   */
  validateLaunchTicket(ticketString) {
    if (!ticketString || typeof ticketString !== 'string' || !ticketString.startsWith('ltkt-')) {
      return { valid: false, reason: 'Missing or malformed launch ticket' };
    }

    try {
      const parts = ticketString.slice(5).split('.');
      if (parts.length !== 2) {
        return { valid: false, reason: 'Invalid launch ticket structure' };
      }

      const [encodedPayload, providedSignature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', TICKET_SECRET)
        .update(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
        .digest('hex');

      if (providedSignature !== expectedSignature) {
        return { valid: false, reason: 'Launch ticket signature verification failed' };
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      if (Date.now() > payload.expiresAt) {
        return { valid: false, reason: 'Launch ticket has expired' };
      }

      // Check session is still active in database
      const session = this.db.get('SELECT status FROM game_sessions WHERE id = ?', [payload.sessionId]);
      if (!session || session.status !== 'active') {
        return { valid: false, reason: 'Session associated with launch ticket is no longer active' };
      }

      return { valid: true, payload };
    } catch (err) {
      return { valid: false, reason: 'Ticket decoding failure' };
    }
  }
}

let instance = null;
function getGameLaunchService(customDb) {
  if (!instance || customDb) {
    instance = new GameLaunchService(customDb);
  }
  return instance;
}

module.exports = {
  GameLaunchService,
  getGameLaunchService
};
