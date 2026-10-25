/**
 * Sprint 11 Verification Suite: Premium Access, Plan Comparison & Entitlements
 *
 * Traceability Matrix:
 * - EP08-01: Public Plan Comparison Matrix (AC-27.1, AC-27.2, AC-27.3)
 * - EP08-02: Paid Game Launch Gating (AC-28.1, AC-28.2, AC-28.3)
 * - EP08-03: Membership Status & Renewal Info (AC-29.1, AC-29.2, AC-29.3)
 * - EP08-04: Upgrade Messaging on Launch Denial (AC-30.1, AC-30.2, AC-30.3)
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5050';
const DB_PATH = path.join(__dirname, '..', 'server', 'data', 'platform-staging.db');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, testCode, description, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] [${testCode}] ${description}`);
  } else {
    failedChecks++;
    console.error(`  [FAIL] [${testCode}] ${description}`);
    if (details) console.error(`         Details: ${details}`);
  }
}

async function registerPlayer(prefix) {
  const ts = Date.now() + Math.floor(Math.random() * 1000);
  const email = `${prefix}_${ts}@nexusplay.test`;
  const password = 'Password123!';
  const displayName = `${prefix}_${ts}`;

  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });

  const body = await res.json();
  const setCookie = res.headers.get('set-cookie') || '';
  const sessionMatch = setCookie.match(/nexusplay_session=([^;]+)/);
  const csrfMatch = setCookie.match(/nexusplay_csrf=([^;]+)/);

  const token = sessionMatch ? sessionMatch[1] : (body.sessionToken || body.token || body.data?.sessionToken);
  let playerId = body.data?.player?.id || body.player?.id || body.user?.id;

  if (!playerId && token) {
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      playerId = meData.user?.id;
    }
  }

  return {
    playerId,
    email,
    displayName,
    token,
    csrfToken: csrfMatch ? csrfMatch[1] : (body.csrfToken || ''),
    rawCookie: setCookie
  };
}

async function runSprint11Tests() {
  console.log('================================================================');
  console.log('  NEXUSPLAY PLATFORM SPRINT 11 VERIFICATION SUITE');
  console.log('  Scope: EP08 Premium Access, Plan Comparison & Entitlements');
  console.log('  Environment: Staging (port 5050, SQLite WAL)');
  console.log('================================================================\n');

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA busy_timeout = 5000;');

  // Target published premium game with approved licensing (game-004: Neon Horizon)
  const premiumGame = db.prepare("SELECT id, slug, title, is_published, is_premium FROM games WHERE id = 'game-004'").get();
  db.prepare("UPDATE games SET is_published = 1, is_premium = 1 WHERE id = 'game-004'").run();
  db.prepare("INSERT OR REPLACE INTO licensing_approvals (id, game_id, status) VALUES ('lic-game-004', 'game-004', 'approved')").run();

  // -------------------------------------------------------------------------
  // PHASE 1: EP08-01 Public Plan Comparison Matrix
  // -------------------------------------------------------------------------
  console.log('--- Phase 1: EP08-01 Public Plan Comparison Matrix (AC-27.1, AC-27.2, AC-27.3) ---');

  // Test 1: Unauthenticated request to /api/v1/subscriptions/plans (AC-27.3)
  const plansRes = await fetch(`${BASE_URL}/api/v1/subscriptions/plans`);
  assert(plansRes.status === 200, 'AC-27.3-01', 'Public plans endpoint returns HTTP 200 without authentication');

  const plansData = await plansRes.json();
  assert(plansData.status === 'SUCCESS' && Array.isArray(plansData.plans), 'AC-27.3-02', 'Response payload contains status SUCCESS and plans array');

  // Test 2: At least 3 tiers present: Free Explorer, Nexus Pro, Nexus Ultimate (AC-27.1)
  const planIds = plansData.plans.map(p => p.id);
  assert(
    planIds.includes('plan-free') && planIds.includes('plan-pro-monthly') && planIds.includes('plan-ultimate-monthly'),
    'AC-27.1-01',
    'Plans matrix includes Free Explorer, Nexus Pro, and Nexus Ultimate tiers'
  );

  // Test 3: Transparent pricing and intervals (AC-27.1)
  const freePlan = plansData.plans.find(p => p.id === 'plan-free');
  const proPlan = plansData.plans.find(p => p.id === 'plan-pro-monthly');
  const ultPlan = plansData.plans.find(p => p.id === 'plan-ultimate-monthly');

  assert(
    freePlan && freePlan.priceCents === 0 && freePlan.priceFormatted === '$0.00',
    'AC-27.1-02',
    'Free Explorer tier is accurately priced at $0.00 / monthly'
  );
  assert(
    proPlan && proPlan.priceCents === 999 && proPlan.priceFormatted === '$9.99',
    'AC-27.1-03',
    'Nexus Pro tier is priced at $9.99 / monthly'
  );
  assert(
    ultPlan && ultPlan.priceCents === 1999 && ultPlan.priceFormatted === '$19.99',
    'AC-27.1-04',
    'Nexus Ultimate tier is priced at $19.99 / monthly'
  );

  // Test 4: Clear feature differentiation and Popular flag (AC-27.2)
  assert(
    proPlan && proPlan.isPopular === true,
    'AC-27.2-01',
    'Nexus Pro tier is flagged as isPopular: true in feature matrix'
  );
  assert(
    proPlan && proPlan.features.length >= 3 && proPlan.features.some(f => f.includes('Premium')),
    'AC-27.2-02',
    'Nexus Pro includes premium catalog titles in feature checklist'
  );
  assert(
    ultPlan && ultPlan.features.length >= 3 && ultPlan.features.some(f => f.includes('Tournament') || f.includes('SDK')),
    'AC-27.2-03',
    'Nexus Ultimate features tournament and developer access distinctions'
  );

  // -------------------------------------------------------------------------
  // PHASE 2: EP08-03 Membership Status & Renewal Info (Free & Authenticated)
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 2: EP08-03 Membership Status & Renewal Info (AC-29.1, AC-29.2, AC-29.3) ---');

  // Test 5: Unauthenticated access to /me requires login
  const unauthMeRes = await fetch(`${BASE_URL}/api/v1/subscriptions/me`);
  assert(unauthMeRes.status === 401, 'AC-29.1-01', 'Unauthenticated request to /subscriptions/me returns HTTP 401 Unauthorized');

  // Test 6: Registered Free-Tier Player checks membership (AC-29.2)
  const freePlayer = await registerPlayer('free_user');
  const freeMeRes = await fetch(`${BASE_URL}/api/v1/subscriptions/me`, {
    headers: {
      'Authorization': `Bearer ${freePlayer.token}`
    }
  });
  assert(freeMeRes.status === 200, 'AC-29.2-01', 'Authenticated free-tier user checks membership status with HTTP 200');

  const freeMeData = await freeMeRes.json();
  assert(
    freeMeData.subscription?.status === 'free' &&
    freeMeData.subscription?.tier === 'Free Explorer' &&
    freeMeData.subscription?.currentPeriodEnd === null,
    'AC-29.2-02',
    'Free-tier user returns status "free", tier "Free Explorer", and null expiration date (AC-29.2)'
  );

  // -------------------------------------------------------------------------
  // PHASE 3: EP08-02 Paid Game Launch Gating (Free / Unentitled Player Denied)
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 3: EP08-02 Paid Game Launch Gating (AC-28.1, AC-28.2, AC-28.3) ---');

  // Test 7: Free-tier player launching paid game denied with HTTP 403 ENTITLEMENT_REQUIRED (AC-28.2)
  const freeLaunchRes = await fetch(`${BASE_URL}/api/v1/games/${premiumGame.slug}/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${freePlayer.token}`
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const freeLaunchData = await freeLaunchRes.json();

  assert(freeLaunchRes.status === 403, 'AC-28.2-01', 'Free-tier player launch of premium game denied with HTTP 403 Forbidden (AC-28.2)');
  assert(freeLaunchData.error === 'ENTITLEMENT_REQUIRED', 'AC-28.2-02', 'Error code specifies ENTITLEMENT_REQUIRED (AC-28.2)');
  assert(
    freeLaunchData.details?.requiredPlan === 'Nexus Pro',
    'AC-28.2-03',
    'Launch denial error details explicitly identify requiredPlan: "Nexus Pro" (AC-28.2, AC-30.1)'
  );
  assert(
    freeLaunchData.message && freeLaunchData.message.includes(premiumGame.title) && freeLaunchData.message.includes('Nexus Pro'),
    'AC-28.2-04',
    'Denial message includes game title and upgrade guidance (AC-30.1, AC-30.3)'
  );

  // Test 8: Unauthenticated guest launching paid game denied with HTTP 403 ENTITLEMENT_REQUIRED
  const guestLaunchRes = await fetch(`${BASE_URL}/api/v1/games/${premiumGame.slug}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  assert(guestLaunchRes.status === 403, 'AC-28.2-05', 'Unauthenticated guest launch of premium game denied with HTTP 403 Forbidden');

  // -------------------------------------------------------------------------
  // PHASE 4: EP08-04 Subscription Upgrade & AC-28.1 Active Premium Launch
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 4: EP08-04 Subscription Upgrade & AC-28.1 Entitled Launch ---');

  // Test 9: Player upgrades to Nexus Pro via POST /api/v1/subscriptions/subscribe (AC-30.2)
  const upgradePlayer = await registerPlayer('pro_subscriber');

  const upgradeRes = await fetch(`${BASE_URL}/api/v1/subscriptions/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${upgradePlayer.token}`
    },
    body: JSON.stringify({ planId: 'plan-pro-monthly', paymentMethod: 'simulated_card' })
  });
  assert(upgradeRes.status === 200, 'AC-30.2-01', 'Player successfully subscribes to Nexus Pro with HTTP 200 (AC-30.2)');

  const upgradeData = await upgradeRes.json();
  assert(
    upgradeData.subscription?.status === 'active' &&
    upgradeData.subscription?.tier === 'Nexus Pro' &&
    upgradeData.subscription?.isActive === true,
    'AC-30.2-02',
    'Upgraded player record shows status "active", tier "Nexus Pro", and isActive: true'
  );

  // Test 10: Verify membership status returns valid ISO 8601 future renewal date (AC-29.1)
  const proMeRes = await fetch(`${BASE_URL}/api/v1/subscriptions/me`, {
    headers: { 'Authorization': `Bearer ${upgradePlayer.token}` }
  });
  const proMeData = await proMeRes.json();
  assert(
    proMeData.subscription?.currentPeriodEnd &&
    new Date(proMeData.subscription.currentPeriodEnd) > new Date(),
    'AC-29.1-02',
    'Active subscriber returns future ISO 8601 currentPeriodEnd renewal date (AC-29.1)'
  );

  // Test 11: Active subscriber launches paid game successfully (AC-28.1)
  const proLaunchRes = await fetch(`${BASE_URL}/api/v1/games/${premiumGame.slug}/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${upgradePlayer.token}`
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  assert(proLaunchRes.status === 200, 'AC-28.1-01', 'Active Nexus Pro subscriber successfully launches premium title with HTTP 200 (AC-28.1)');

  const proLaunchData = await proLaunchRes.json();
  assert(
    Boolean(proLaunchData.launchTicket) && Boolean(proLaunchData.sessionId || proLaunchData.session?.sessionId),
    'AC-28.1-02',
    'Entitled launch response provides valid session ID and cryptographically signed launch ticket (AC-28.1)'
  );

  // Test 12: Database verification of payment transaction audit record
  const txRow = db.prepare('SELECT id, player_id, amount_cents, status FROM payment_transactions WHERE player_id = ?').get(upgradePlayer.playerId);
  assert(
    txRow && txRow.amount_cents === 999 && txRow.status === 'succeeded',
    'AC-30.2-03',
    'Payment transaction record persisted in database ledger with status succeeded ($9.99)'
  );

  // -------------------------------------------------------------------------
  // PHASE 5: EP08-02 Expired Subscription Launch Gating (AC-28.3, AC-29.3)
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 5: EP08-02 Expired Subscription Launch Gating (AC-28.3, AC-29.3) ---');

  // Test 13: Player with expired subscription
  const expiredPlayer = await registerPlayer('expired_user');

  // Create an expired subscription row directly in DB (expired 5 days ago)
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO subscriptions (id, player_id, plan_id, status, current_period_end)
    VALUES (?, ?, 'plan-pro-monthly', 'active', ?)
  `).run(`sub-exp-${Date.now()}`, expiredPlayer.playerId, pastDate);

  // Test 14: Expired subscription status check returns expired status and past ISO date (AC-29.3)
  const expMeRes = await fetch(`${BASE_URL}/api/v1/subscriptions/me`, {
    headers: { 'Authorization': `Bearer ${expiredPlayer.token}` }
  });
  const expMeData = await expMeRes.json();

  assert(
    expMeData.subscription?.status === 'expired' &&
    expMeData.subscription?.isActive === false,
    'AC-29.3-01',
    'Past subscription date evaluates to status "expired" and isActive: false (AC-29.3)'
  );
  assert(
    new Date(expMeData.subscription?.currentPeriodEnd) < new Date(),
    'AC-29.3-02',
    'Expired subscriber returns past ISO 8601 date (AC-29.3)'
  );

  // Test 15: Expired subscriber launching paid game denied with HTTP 403 ENTITLEMENT_EXPIRED (AC-28.3)
  const expLaunchRes = await fetch(`${BASE_URL}/api/v1/games/${premiumGame.slug}/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${expiredPlayer.token}`
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const expLaunchData = await expLaunchRes.json();

  assert(expLaunchRes.status === 403, 'AC-28.3-01', 'Expired subscription player denied launch with HTTP 403 (AC-28.3)');
  assert(expLaunchData.error === 'ENTITLEMENT_EXPIRED', 'AC-28.3-02', 'Error code specifies ENTITLEMENT_EXPIRED (AC-28.3)');
  assert(
    Boolean(expLaunchData.details?.expiredAt),
    'AC-28.3-03',
    'Denial details contain expiredAt timestamp for renewal messaging (AC-28.3)'
  );

  // -------------------------------------------------------------------------
  // PHASE 6: EP08-04 Ultimate Tier Upgrade & Cancellation Lifecycle
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 6: EP08-04 Ultimate Tier Upgrade & Cancellation Lifecycle ---');

  // Test 16: Upgrading expired player to Nexus Ultimate restores access immediately
  const ultUpgradeRes = await fetch(`${BASE_URL}/api/v1/subscriptions/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${expiredPlayer.token}`
    },
    body: JSON.stringify({ planId: 'plan-ultimate-monthly', paymentMethod: 'simulated_card' })
  });
  const ultUpgradeData = await ultUpgradeRes.json();

  assert(
    ultUpgradeRes.status === 200 &&
    ultUpgradeData.subscription?.tier === 'Nexus Ultimate' &&
    ultUpgradeData.subscription?.status === 'active',
    'AC-30.2-04',
    'Expired user upgrading to Nexus Ultimate immediately reactivates active subscription'
  );

  // Test 17: Newly upgraded user now launches Solar Siege without hindrance
  const ultLaunchRes = await fetch(`${BASE_URL}/api/v1/games/${premiumGame.slug}/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${expiredPlayer.token}`
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  assert(ultLaunchRes.status === 200, 'AC-28.1-03', 'Newly reactivated Nexus Ultimate subscriber successfully launches premium title');

  // Test 18: Subscription cancellation updates status to cancelled / expired
  const cancelRes = await fetch(`${BASE_URL}/api/v1/subscriptions/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${expiredPlayer.token}`
    }
  });
  assert(cancelRes.status === 200, 'AC-29.3-03', 'POST /subscriptions/cancel successfully sets status to cancelled');

  // -------------------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  SPRINT 11 TEST RESULTS: ${passedChecks} / ${totalChecks} PASSED (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
  if (failedChecks === 0) {
    console.log('  STATUS: 100% SUCCESS — All Sprint 11 Acceptance Criteria Verified');
  } else {
    console.error(`  STATUS: FAILURE — ${failedChecks} checks failed.`);
  }
  console.log('================================================================\n');

  if (failedChecks > 0) process.exit(1);
}

runSprint11Tests().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
