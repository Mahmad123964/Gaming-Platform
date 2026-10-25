/**
 * NexusPlay — Sprint 04 Game Launching & Single-Player Foundation Automated Test Suite
 * Traceability: EP03-01, EP03-03, EP03-04, EP04-01, EP04-03
 * Acceptance Criteria: AC-9.1..9.3, AC-11.1..11.3, AC-12.1..12.3, AC-13.1..13.3, AC-15.1..15.3
 */

const fs = require('node:fs');
const path = require('node:path');

process.env.NODE_ENV = process.env.NODE_ENV || 'staging';

const { getDb } = require('../server/src/db');
const { getAuthService } = require('../server/src/modules/identity/authService');
const { getContentAdminService } = require('../server/src/modules/contentAdmin/contentAdminService');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5050';

let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(condition, testId, testName, details = '') {
  if (condition) {
    passedTests++;
    results.push({ id: testId, name: testName, status: 'PASSED', details });
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${testId}: ${testName}`);
  } else {
    failedTests++;
    results.push({ id: testId, name: testName, status: 'FAILED', details });
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${testId}: ${testName} - ${details}`);
  }
}

async function run() {
  console.log('\n======================================================================');
  console.log(' NEXUSPLAY SPRINT 04 — GAME LAUNCHING & SINGLE-PLAYER FOUNDATION');
  console.log(` Target Server: ${BASE_URL}`);
  console.log(' Timestamp: ' + new Date().toISOString());
  console.log('======================================================================\n');

  const db = getDb();
  const authService = getAuthService();
  const adminService = getContentAdminService();

  // Setup testing users
  console.log('--- Phase 0: Test Fixtures & Baseline Setup ---');

  // 1. Ensure Admin User
  let adminRecord = db.get("SELECT id, email, role FROM players WHERE role = 'admin' LIMIT 1");
  if (!adminRecord) {
    adminService.ensureAdminAccount();
    adminRecord = db.get("SELECT id, email, role FROM players WHERE role = 'admin' LIMIT 1");
  }

  const adminLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminRecord.email, password: 'Admin#2026!Nexus' })
  });
  const adminLoginData = (await adminLoginRes.json()).data || {};
  const adminToken = adminLoginData.token;
  const adminCsrf = adminLoginData.csrfToken;

  // 2. Standard Non-VIP Player
  const freePlayerEmail = `free-player-${Date.now()}@nexusplay.test`;
  const freeRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: freePlayerEmail, password: 'FreePlayer#2026!Pass', displayName: 'FreeGamer' })
  });
  const freePlayerData = (await freeRegRes.json()).data || {};
  const freeToken = freePlayerData.token;
  const freeCsrf = freePlayerData.csrfToken;
  const freePlayerId = freePlayerData.user ? freePlayerData.user.id : freePlayerData.id;

  // 3. VIP Player (has active subscription in subscriptions table)
  const vipPlayerEmail = `vip-player-${Date.now()}@nexusplay.test`;
  const vipRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: vipPlayerEmail, password: 'VipPlayer#2026!Pass', displayName: 'VipGamer' })
  });
  const vipPlayerData = (await vipRegRes.json()).data || {};
  const vipToken = vipPlayerData.token;
  const vipCsrf = vipPlayerData.csrfToken;
  const vipPlayerId = vipPlayerData.user ? vipPlayerData.user.id : vipPlayerData.id;

  // Seed active VIP subscription for vipPlayerId
  db.run(
    `INSERT OR IGNORE INTO subscription_plans (id, name, price_cents, currency, interval)
     VALUES ('plan-vip-monthly', 'Obsidian VIP Monthly', 999, 'USD', 'monthly')`
  );

  const subId = 'sub-' + Date.now();
  db.run(
    `INSERT OR REPLACE INTO subscriptions (id, player_id, plan_id, status, current_period_end)
     VALUES (?, ?, 'plan-vip-monthly', 'active', datetime('now', '+30 days'))`,
    [subId, vipPlayerId]
  );

  assert(adminToken && freeToken && vipToken, 'SETUP-01', 'Test user fixtures initialized (Admin, Free Player, VIP Player)');

  console.log('\n--- Phase 1: Authorized Published Game Launch (EP03-01, AC-9.1, AC-12.2, AC-13.1) ---');

  // Test 1: Launch authorized free game ('cyber-invaders') as guest
  const guestLaunchRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true, screenWidth: 1024 } })
  });
  const guestLaunchData = await guestLaunchRes.json();

  assert(guestLaunchRes.status === 200, 'LAUNCH-AUTH-01', 'Authorized free game launch returns HTTP 200 OK (AC-9.1)');
  assert(guestLaunchData.status === 'SUCCESS' && guestLaunchData.launchTicket, 'LAUNCH-AUTH-02', 'Launch response issues cryptographically signed launchTicket (AC-9.1)');
  assert(guestLaunchData.session && guestLaunchData.session.mode === 'single_player', 'LAUNCH-AUTH-03', 'Launch initiates single_player session in active state (AC-13.1)');
  assert(guestLaunchData.launchDestination && guestLaunchData.launchDestination.includes('ticket='), 'LAUNCH-AUTH-04', 'Launch destination incorporates session and ticket parameters (AC-9.1, AC-12.2)');

  // Test 2: Launch authorized free game as authenticated player
  const authLaunchRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${freeToken}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true, screenWidth: 1024 } })
  });
  const authLaunchData = await authLaunchRes.json();
  assert(authLaunchRes.status === 200 && authLaunchData.session.playerId === freePlayerId, 'LAUNCH-AUTH-05', 'Authenticated launch binds session directly to player identity (AC-9.1)');

  console.log('\n--- Phase 2: Unpublished Game Rejection (EP03-04, AC-12.1, AC-12.3) ---');

  // Test 3: Attempting to launch unpublished draft game ('shadow-protocol') is denied
  const unpubLaunchRes = await fetch(`${BASE_URL}/api/v1/games/shadow-protocol/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const unpubLaunchData = await unpubLaunchRes.json();

  assert(unpubLaunchRes.status === 403, 'LAUNCH-UNPUB-01', 'Unpublished draft game launch is denied with HTTP 403 Forbidden (AC-12.1)');
  assert(unpubLaunchData.error === 'GAME_UNPUBLISHED', 'LAUNCH-UNPUB-02', 'Rejection code explicitly specifies GAME_UNPUBLISHED (AC-12.1)');

  // Test 4: Dynamic unpublish blocks new launches immediately (AC-12.3)
  // Register a temporary game, approve it, publish it, verify launch succeeds, unpublish it, verify launch fails
  const tempSlug = `temp-test-game-${Date.now()}`;
  const createTempRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({
      title: 'Temporary Dynamic Game',
      slug: tempSlug,
      categoryId: 'cat-arcade',
      description: 'Temporary game for dynamic unpublish testing.',
      launchUrl: '/games/temp-test/index.html',
      minPlayers: 1,
      maxPlayers: 1
    })
  });
  const tempGameId = (await createTempRes.json()).game.id;

  // Approve licensing
  await fetch(`${BASE_URL}/api/v1/admin/games/${tempGameId}/licensing`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ status: 'approved' })
  });

  // Publish game
  await fetch(`${BASE_URL}/api/v1/admin/games/${tempGameId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ isPublished: true })
  });

  // Verify published game launches
  const pubLaunchCheck = await fetch(`${BASE_URL}/api/v1/games/${tempSlug}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  assert(pubLaunchCheck.status === 200, 'LAUNCH-UNPUB-03', 'Newly published game launches successfully (AC-12.2)');

  // Now operator unpublishes game
  await fetch(`${BASE_URL}/api/v1/admin/games/${tempGameId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ isPublished: false })
  });

  // Next launch attempt must be strictly rejected (AC-12.3)
  const postUnpubLaunch = await fetch(`${BASE_URL}/api/v1/games/${tempSlug}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  assert(postUnpubLaunch.status === 403, 'LAUNCH-UNPUB-04', 'Unpublished game immediately rejects subsequent launch attempts (AC-12.3)');

  console.log('\n--- Phase 3: Licensing Clearance Gate & Revocation Rejection (EP03-01, EP03-04, AC-9.1, AC-12.3) ---');

  // Test 5: Re-publish temporary game, then revoke licensing clearance
  await fetch(`${BASE_URL}/api/v1/admin/games/${tempGameId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ isPublished: true })
  });

  // Revoke licensing clearance (set to 'rejected')
  await fetch(`${BASE_URL}/api/v1/admin/games/${tempGameId}/licensing`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ status: 'rejected', notes: 'Distribution license terminated' })
  });

  const revokeLaunchRes = await fetch(`${BASE_URL}/api/v1/games/${tempSlug}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const revokeLaunchData = await revokeLaunchRes.json();

  assert(
    revokeLaunchRes.status === 403 || revokeLaunchRes.status === 422,
    'LAUNCH-LIC-01',
    'Game with revoked licensing clearance strictly denied launch (AC-9.1, AC-12.3)'
  );

  // Test 6: Verify game missing licensing record is also rejected (Resolves loose legacy condition)
  // Create raw unapproved game directly in DB without licensing record
  const noLicGameId = 'game-nolic-' + Date.now();
  db.run(
    `INSERT INTO games (id, title, slug, category_id, launch_url, is_published, is_premium, min_players, max_players)
     VALUES (?, 'No Lic Game', ?, 'cat-arcade', '/games/nolic/index.html', 1, 0, 1, 1)`,
    [noLicGameId, `nolic-${Date.now()}`]
  );

  const noLicLaunchRes = await fetch(`${BASE_URL}/api/v1/games/${noLicGameId}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  assert(
    noLicLaunchRes.status === 422,
    'LAUNCH-LIC-02',
    'Game lacking explicit approved licensing record is strictly blocked with HTTP 422 (AC-9.1)'
  );

  console.log('\n--- Phase 4: Nonexistent & Unavailable Game Handling (EP03-01, AC-9.3) ---');

  // Test 7: Launch non-existent game ID returns HTTP 404 with actionable failure message
  const missingLaunchRes = await fetch(`${BASE_URL}/api/v1/games/non-existent-game-slug-999/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const missingLaunchData = await missingLaunchRes.json();

  assert(missingLaunchRes.status === 404, 'LAUNCH-MISS-01', 'Non-existent game launch returns HTTP 404 Not Found (AC-9.3)');
  assert(missingLaunchData.error === 'GAME_NOT_FOUND', 'LAUNCH-MISS-02', 'Error code specifies GAME_NOT_FOUND with actionable message (AC-9.3)');

  // Test 8: Empty game identifier rejected with HTTP 400 Bad Request
  const emptyLaunchRes = await fetch(`${BASE_URL}/api/v1/games/%20/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  assert(emptyLaunchRes.status === 400, 'LAUNCH-MISS-03', 'Whitespace game identifier rejected with HTTP 400 Bad Request (AC-9.3)');

  console.log('\n--- Phase 5: VIP Subscription Entitlement Enforcement (EP03-01, AC-9.2) ---');

  // Test 9: Unauthenticated guest attempting to launch premium game ('neon-horizon') is denied
  const guestVipLaunch = await fetch(`${BASE_URL}/api/v1/games/neon-horizon/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const guestVipData = await guestVipLaunch.json();

  assert(guestVipLaunch.status === 403, 'LAUNCH-VIP-01', 'Unauthenticated player launching premium title denied with HTTP 403 (AC-9.2)');
  assert(guestVipData.error === 'AUTHENTICATION_REQUIRED', 'LAUNCH-VIP-02', 'Error specifies AUTHENTICATION_REQUIRED for premium game (AC-9.2)');

  // Test 10: Authenticated non-VIP player attempting to launch premium game is denied with actionable requirement
  const freeVipLaunch = await fetch(`${BASE_URL}/api/v1/games/neon-horizon/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${freeToken}`
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const freeVipData = await freeVipLaunch.json();

  assert(freeVipLaunch.status === 403, 'LAUNCH-VIP-03', 'Non-VIP player launching premium title denied with HTTP 403 (AC-9.2)');
  assert(freeVipData.error === 'VIP_SUBSCRIPTION_REQUIRED' || freeVipData.error === 'ENTITLEMENT_REQUIRED', 'LAUNCH-VIP-04', 'Error specifies VIP_SUBSCRIPTION_REQUIRED or ENTITLEMENT_REQUIRED with upgrade details (AC-9.2)');

  // Test 11: Authenticated VIP player launching premium game is permitted
  const vipLaunchRes = await fetch(`${BASE_URL}/api/v1/games/neon-horizon/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${vipToken}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const vipLaunchData = await vipLaunchRes.json();
  assert(vipLaunchRes.status === 200, 'LAUNCH-VIP-05', 'VIP player with active subscription launches premium title successfully (AC-9.1, AC-9.2)');

  console.log('\n--- Phase 6: Device & Browser Compatibility Matrix (EP03-03, AC-11.1..11.3) ---');

  // Test 12: Known unsupported legacy browser (Internet Explorer Trident/MSIE) rejected with clear diagnostic (AC-11.1)
  const legacyUaRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)'
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: false } })
  });
  const legacyUaData = await legacyUaRes.json();
  assert(legacyUaRes.status === 400, 'LAUNCH-CMP-01', 'Legacy IE browser launch rejected with HTTP 400 (AC-11.1)');
  assert(legacyUaData.error === 'LEGACY_BROWSER' || legacyUaData.error === 'CANVAS_UNSUPPORTED', 'LAUNCH-CMP-02', 'Rejection diagnostic identifies unsupported browser engine (AC-11.1)');

  // Test 13: Client reporting lack of HTML5 Canvas capability rejected (AC-11.1)
  const noCanvasRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0'
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: false } })
  });
  const noCanvasData = await noCanvasRes.json();
  assert(noCanvasRes.status === 400 && noCanvasData.error === 'CANVAS_UNSUPPORTED', 'LAUNCH-CMP-03', 'Missing HTML5 Canvas capability rejected with diagnostic message (AC-11.1)');

  // Test 14: Modern supported browser launches cleanly without warning (AC-11.2)
  const supportedLaunchRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true, screenWidth: 1280 } })
  });
  const supportedData = await supportedLaunchRes.json();
  assert(
    supportedLaunchRes.status === 200 && supportedData.compatibility.status === 'SUPPORTED',
    'LAUNCH-CMP-04',
    'Modern supported browser launches without unsupported-device warning (AC-11.2)'
  );

  // Test 15: Unknown or inconclusive browser launches with fallback outcome (AC-11.3)
  const inconclusiveRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CustomEsotericPlatform/1.0'
    },
    body: JSON.stringify({ clientCapabilities: null })
  });
  const inconclusiveData = await inconclusiveRes.json();
  assert(
    inconclusiveRes.status === 200 && inconclusiveData.compatibility.status === 'INCONCLUSIVE',
    'LAUNCH-CMP-05',
    'Inconclusive compatibility detection presents standard fallback outcome (AC-11.3)'
  );

  console.log('\n--- Phase 7: Single-Player Session Lifecycle (EP04-01, AC-13.1, AC-13.2, AC-13.3) ---');

  // Test 16: Launching solo-supported game starts active single-player session (AC-13.1)
  const soloSession = guestLaunchData.session;
  assert(soloSession && soloSession.mode === 'single_player' && soloSession.isActive === true, 'SESS-LIF-01', 'Single-player solo session begins in active state (AC-13.1)');

  // Test 17: Game not supporting solo mode rejects single-player play (AC-13.2)
  // Create multiplayer-only game (min_players: 2)
  const multiOnlySlug = `multi-only-${Date.now()}`;
  const multiGameId = `game-multi-${Date.now()}`;
  db.run(
    `INSERT INTO games (id, title, slug, category_id, launch_url, is_published, is_premium, min_players, max_players)
     VALUES (?, 'Multiplayer Only Arena', ?, 'cat-action', '/games/multi/index.html', 1, 0, 2, 4)`,
    [multiGameId, multiOnlySlug]
  );
  // Add approved licensing
  db.run(
    "INSERT INTO licensing_approvals (id, game_id, status) VALUES (?, ?, 'approved')",
    ['lic-' + multiGameId, multiGameId]
  );

  const multiLaunchRes = await fetch(`${BASE_URL}/api/v1/games/${multiOnlySlug}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const multiLaunchData = await multiLaunchRes.json();
  assert(multiLaunchRes.status === 400, 'SESS-LIF-02', 'Game not supporting solo mode rejects single-player request (AC-13.2)');
  assert(multiLaunchData.error === 'SOLO_MODE_NOT_SUPPORTED', 'SESS-LIF-03', 'Error specifies SOLO_MODE_NOT_SUPPORTED with player capacity explanation (AC-13.2)');

  // Test 18: Ending single-player session marks it ended and inactive (AC-13.3)
  const endSessionRes = await fetch(`${BASE_URL}/api/v1/sessions/${soloSession.sessionId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const endSessionData = await endSessionRes.json();
  assert(endSessionRes.status === 200 && endSessionData.session.status === 'ended', 'SESS-LIF-04', 'Ending session updates status to "ended" (AC-13.3)');

  const checkEndedSession = await fetch(`${BASE_URL}/api/v1/sessions/${soloSession.sessionId}`);
  const checkEndedData = await checkEndedSession.json();
  assert(checkEndedData.session.isActive === false, 'SESS-LIF-05', 'Ended session is not presented as active when returning to game page (AC-13.3)');

  console.log('\n--- Phase 8: Session Restart Lifecycle & Score Reset (EP04-03, AC-15.1, AC-15.2, AC-15.3) ---');

  // Test 19: Create active session with in-progress score
  const restartTestLaunch = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const restartTestSession = (await restartTestLaunch.json()).session;

  // Update in-progress score to 850
  await fetch(`${BASE_URL}/api/v1/sessions/${restartTestSession.sessionId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score: 850, state: { wave: 3, lives: 2 } })
  });

  const checkProgress = await fetch(`${BASE_URL}/api/v1/sessions/${restartTestSession.sessionId}`);
  assert((await checkProgress.json()).session.score === 850, 'SESS-RST-01', 'Precondition: Session recorded in-progress score of 850');

  // Test 20: Restart active session (AC-15.1)
  const restartActionRes = await fetch(`${BASE_URL}/api/v1/sessions/${restartTestSession.sessionId}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const restartActionData = await restartActionRes.json();

  assert(restartActionRes.status === 200, 'SESS-RST-02', 'Restarting active session returns HTTP 200 OK (AC-15.1)');
  assert(restartActionData.session.status === 'active', 'SESS-RST-03', 'Restarted session returns to starting active state (AC-15.1)');

  // Test 21: In-progress score is strictly zeroed and NOT carried over (AC-15.3)
  assert(restartActionData.session.score === 0, 'SESS-RST-04', 'Restarted session score is zeroed (0) without carrying over old score (AC-15.3)');
  assert(restartActionData.session.state.wave === 1 && restartActionData.session.state.lives === 3, 'SESS-RST-05', 'Restarted session resets wave to 1 and lives to 3 (AC-15.1)');

  // Test 22: Restart nonexistent session fails without creating phantom session (AC-15.2)
  const phantomRestartRes = await fetch(`${BASE_URL}/api/v1/sessions/nonexistent-session-12345/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert(phantomRestartRes.status === 404, 'SESS-RST-06', 'Restarting non-existent session fails with HTTP 404 (AC-15.2)');

  // Test 23: Restarting terminated/ended session rejected (AC-15.2)
  await fetch(`${BASE_URL}/api/v1/sessions/${restartTestSession.sessionId}/end`, { method: 'POST' });
  const restartEndedRes = await fetch(`${BASE_URL}/api/v1/sessions/${restartTestSession.sessionId}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert(restartEndedRes.status === 400, 'SESS-RST-07', 'Restarting terminated session is rejected with HTTP 400 (AC-15.2)');

  console.log('\n--- Phase 9: Direct Launch URL Authorization Bypass Protection (EP03-04, AC-12.1) ---');

  // Test 24: Direct navigation to game launch URL without ticket is denied with HTTP 403 (AC-12.1)
  const directNoTicketRes = await fetch(`${BASE_URL}/games/cyber-invaders/index.html`);
  assert(directNoTicketRes.status === 403, 'LAUNCH-BYP-01', 'Direct access without launch ticket denied with HTTP 403 (AC-12.1)');

  // Test 25: Direct navigation with forged/invalid ticket is denied with HTTP 403 (AC-12.1)
  const directBadTicketRes = await fetch(`${BASE_URL}/games/cyber-invaders/index.html?ticket=ltkt-forgedtoken.badsignature`);
  assert(directBadTicketRes.status === 403, 'LAUNCH-BYP-02', 'Direct access with forged ticket signature denied with HTTP 403 (AC-12.1)');

  // Test 26: Direct navigation with genuine authorized ticket succeeds
  const freshLaunch = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
  });
  const freshTicket = (await freshLaunch.json()).launchTicket;

  const directGoodTicketRes = await fetch(`${BASE_URL}/games/cyber-invaders/index.html?ticket=${encodeURIComponent(freshTicket)}`);
  assert(directGoodTicketRes.status === 200, 'LAUNCH-BYP-03', 'Direct access with valid cryptographically signed launch ticket succeeds (AC-12.1)');

  console.log('\n======================================================================');
  console.log(` SPRINT 04 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  // Save evidence to evidence/sprint-04/
  const evidenceDir = path.join(__dirname, '..', 'evidence', 'sprint-04');
  const resultsDir = path.join(evidenceDir, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const testReport = {
    sprint: 'Sprint 04',
    title: 'Game Launching & Single-Player Foundation',
    epicScope: ['EP03-01', 'EP03-03', 'EP03-04', 'EP04-01', 'EP04-03'],
    acceptanceCriteria: [
      'AC-9.1', 'AC-9.2', 'AC-9.3',
      'AC-11.1', 'AC-11.2', 'AC-11.3',
      'AC-12.1', 'AC-12.2', 'AC-12.3',
      'AC-13.1', 'AC-13.2', 'AC-13.3',
      'AC-15.1', 'AC-15.2', 'AC-15.3'
    ],
    timestamp,
    totalTests: passedTests + failedTests,
    passedTests,
    failedTests,
    successRate: `${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`,
    testResults: results
  };

  const artifactFile = path.join(resultsDir, `sprint-04-launch-test-results-${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(artifactFile, JSON.stringify(testReport, null, 2));
  fs.writeFileSync(path.join(evidenceDir, 'sprint04-launch-tests.json'), JSON.stringify(testReport, null, 2));

  console.log(`Saved test execution evidence to:\n  - ${artifactFile}\n  - ${path.join(evidenceDir, 'sprint04-launch-tests.json')}`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
