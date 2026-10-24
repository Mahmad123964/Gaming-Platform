/**
 * NexusPlay — Sprint 03 Content Administration Comprehensive Automated Verification Suite
 * Traceability: EP03-02, EP10-01, EP10-02, EP10-03, EP11-02
 * Acceptance Criteria: AC-10.1..10.3, AC-35.1..35.3, AC-36.1..36.3, AC-37.1..37.3, AC-39.1..39.3, AC-40.1..40.3
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

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    results.push({ name: testName, status: 'PASSED', details });
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${testName}`);
  } else {
    failedTests++;
    results.push({ name: testName, status: 'FAILED', details });
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${testName} - ${details}`);
  }
}

async function run() {
  console.log('\n===============================================================');
  console.log(' NEXUSPLAY SPRINT 03 — CONTENT ADMINISTRATION AUTOMATED TESTS');
  console.log(` Target Server: ${BASE_URL}`);
  console.log('===============================================================\n');

  const db = getDb();
  const authService = getAuthService();
  const adminService = getContentAdminService();

  // Setup testing users
  console.log('--- Phase 1: Authentication & RBAC Baseline Setup ---');

  // 1. Ensure Admin User
  let adminRecord = db.get("SELECT id, email, role FROM players WHERE role = 'admin' LIMIT 1");
  if (!adminRecord) {
    adminService.ensureAdminAccount();
    adminRecord = db.get("SELECT id, email, role FROM players WHERE role = 'admin' LIMIT 1");
  }

  // Log in as Admin to obtain HttpOnly cookie / Bearer token + CSRF token
  const adminLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminRecord.email, password: 'Admin#2026!Nexus' })
  });
  const adminLoginBody = await adminLoginRes.json();
  const adminData = adminLoginBody.data || adminLoginBody;
  const adminToken = adminData.token;
  const adminCsrf = adminData.csrfToken;
  const adminCookie = adminLoginRes.headers.get('set-cookie') || `nexusplay_session=${adminToken}`;

  // 2. Setup Standard Player User (non-admin)
  const playerEmail = `qa-player-${Date.now()}@nexusplay.test`;
  const playerPassword = 'Player#2026!Pass';
  const playerRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: playerEmail,
      password: playerPassword,
      displayName: 'QAPlayer1'
    })
  });
  const playerRegBody = await playerRegRes.json();
  const playerData = playerRegBody.data || playerRegBody;
  const playerToken = playerData.token;
  const playerCsrf = playerData.csrfToken;
  const playerCookie = playerRegRes.headers.get('set-cookie') || `nexusplay_session=${playerToken}`;
  const playerId = playerData.user ? playerData.user.id : playerData.id;

  assert(adminToken && adminCsrf, 'Admin authentication issued valid token & session-bound CSRF token');
  assert(playerToken && playerCsrf, 'Standard player registration issued valid token & CSRF token');

  console.log('\n--- Phase 2: RBAC Enforcement & Security Verification (EP11-02, AC-39.1..39.3, AC-40.2) ---');

  // Test 1: Unauthenticated access rejected with 401
  const unauthGetRes = await fetch(`${BASE_URL}/api/v1/admin/games`);
  assert(unauthGetRes.status === 401, 'AC-39.2: Unauthenticated GET /api/v1/admin/games returns HTTP 401 Unauthorized');

  // Test 2: Unauthenticated POST rejected with 401
  const unauthPostRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Hack Game' })
  });
  assert(unauthPostRes.status === 401, 'AC-39.2: Unauthenticated POST /api/v1/admin/games returns HTTP 401 Unauthorized');

  // Test 3: Player role rejected with 403 Forbidden
  const playerGetRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    headers: { 'Authorization': `Bearer ${playerToken}` }
  });
  assert(playerGetRes.status === 403, 'AC-39.2: Player role accessing GET /api/v1/admin/games returns HTTP 403 Forbidden');

  // Test 4: Player mutating request rejected with 403 Forbidden
  const playerPostRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${playerToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': playerCsrf
    },
    body: JSON.stringify({
      title: 'Unauthorized Game',
      slug: 'unauthorized-game',
      categoryId: 'cat-arcade',
      description: 'Unauthorized game submission attempt.',
      launchUrl: '/games/unauth/index.html'
    })
  });
  assert(playerPostRes.status === 403, 'AC-39.2: Player role attempting POST /api/v1/admin/games returns HTTP 403 Forbidden');

  // Test 5: Verify rejection was logged in audit_events (AC-40.2)
  const deniedAudit = db.get(
    "SELECT * FROM audit_events WHERE actor_id = ? AND action = 'ACCESS_DENIED' ORDER BY created_at DESC LIMIT 1",
    [playerId]
  );
  assert(deniedAudit !== undefined && deniedAudit !== null, 'AC-40.2: Unauthorized administrative access attempt captured in audit trail');

  // Test 6: Authorized admin access permitted with 200 OK
  const adminGetRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminGetData = await adminGetRes.json();
  assert(adminGetRes.status === 200 && Array.isArray(adminGetData.games), 'AC-39.1: Authorized admin role accessing GET /api/v1/admin/games returns HTTP 200 OK');

  // Test 7: Dynamic RBAC permission revocation (AC-39.3)
  // Temporarily promote player to admin, verify access granted, demote back to player, verify instant denial
  db.run("UPDATE players SET role = 'admin' WHERE id = ?", [playerId]);
  const tempAdminRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    headers: { 'Authorization': `Bearer ${playerToken}` }
  });
  assert(tempAdminRes.status === 200, 'AC-39.1: Temporarily promoted user receives immediate access');

  // Now demote in database to test AC-39.3 instant revocation
  db.run("UPDATE players SET role = 'player' WHERE id = ?", [playerId]);
  const revokedAdminRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    headers: { 'Authorization': `Bearer ${playerToken}` }
  });
  assert(revokedAdminRes.status === 403, 'AC-39.3: Revoked administrative role immediately denied on next request (real-time DB check)');

  console.log('\n--- Phase 3: Game Registration & Draft Separation (EP03-02, AC-10.1..10.3) ---');

  // Test 8: Valid Game Registration (AC-10.1)
  const testSlug = `hyper-velocity-${Date.now()}`;
  const newGamePayload = {
    title: 'Hyper Velocity Turbo',
    slug: testSlug,
    categoryId: 'cat-arcade',
    description: 'High octane kinetic drift racing set in cyberpunk neon metropolitan canyonways.',
    launchUrl: '/games/hyper-velocity/index.html',
    minPlayers: 1,
    maxPlayers: 4,
    isPremium: true,
    supportsBots: true
  };

  const createGameRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify(newGamePayload)
  });
  const createGameData = await createGameRes.json();
  assert(createGameRes.status === 201, 'AC-10.1: Admin registered new game returns HTTP 201 Created');
  assert(createGameData.game && createGameData.game.title === newGamePayload.title, 'AC-10.1: Returned game object matches registered title');
  const createdGameId = createGameData.game.id;

  // Test 9: Newly registered game defaults to draft (isPublished: false) and pending licensing (AC-10.3)
  assert(createGameData.game.isPublished === false, 'AC-10.3: Newly created game defaults to is_published = 0 (draft)');
  assert(createGameData.game.licensing.status === 'pending', 'AC-10.3: Newly created game defaults to licensing status = "pending"');

  // Test 10: Draft game is NOT publicly visible in public catalog (AC-10.3)
  const publicCatalogRes = await fetch(`${BASE_URL}/api/v1/catalog/games?q=Hyper+Velocity`);
  const publicCatalogData = await publicCatalogRes.json();
  const isFoundInPublic = publicCatalogData.games.some(g => g.id === createdGameId || g.slug === testSlug);
  assert(!isFoundInPublic, 'AC-10.3: Draft game is NOT visible in public catalog search');

  // Test 11: Validation error on missing mandatory metadata (AC-10.2)
  const invalidPayloads = [
    { payload: { ...newGamePayload, title: '  ' }, field: 'title', label: 'blank title' },
    { payload: { ...newGamePayload, slug: 'invalid slug with spaces' }, field: 'slug', label: 'invalid slug format' },
    { payload: { ...newGamePayload, categoryId: '' }, field: 'categoryId', label: 'missing category' },
    { payload: { ...newGamePayload, description: 'short' }, field: 'description', label: 'description < 10 chars' },
    { payload: { ...newGamePayload, launchUrl: 'ftp://badurl' }, field: 'launchUrl', label: 'disallowed launch URL scheme' },
    { payload: { ...newGamePayload, minPlayers: 4, maxPlayers: 2 }, field: 'maxPlayers', label: 'maxPlayers < minPlayers' }
  ];

  for (const item of invalidPayloads) {
    const invRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': adminCsrf
      },
      body: JSON.stringify(item.payload)
    });
    const invData = await invRes.json();
    assert(
      invRes.status === 400 && invData.validationErrors && invData.validationErrors[item.field],
      `AC-10.2: Invalid game rejected with field-specific feedback (${item.label})`
    );
  }

  // Test 12: Duplicate slug rejected with 409 Conflict (AC-10.2)
  const dupSlugRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ ...newGamePayload, title: 'Duplicate Slug Test' })
  });
  assert(dupSlugRes.status === 409, 'AC-10.2: Duplicate game slug rejected with HTTP 409 Conflict');

  console.log('\n--- Phase 4: Game Metadata Editing (EP10-01, AC-35.1..35.3) ---');

  // Test 13: Authorized content administrator edits metadata (AC-35.1)
  const updatePayload = {
    title: 'Hyper Velocity Turbo Remix',
    slug: testSlug,
    categoryId: 'cat-action',
    description: 'Updated high octane kinetic drift racing with ultra widescreen graphics and refined steering.',
    launchUrl: '/games/hyper-velocity-remix/index.html',
    minPlayers: 1,
    maxPlayers: 8,
    isPremium: true,
    supportsBots: true
  };

  const updateRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify(updatePayload)
  });
  const updateData = await updateRes.json();
  assert(updateRes.status === 200, 'AC-35.1: Valid game metadata edit returns HTTP 200 OK');
  assert(updateData.game.title === 'Hyper Velocity Turbo Remix', 'AC-35.1: Updated game displays new title');
  assert(updateData.game.category.id === 'cat-action', 'AC-35.1: Updated game displays new category');

  // Test 14: Blank required field prevents incomplete listing (AC-35.2)
  const blankUpdateRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ ...updatePayload, description: '' })
  });
  assert(blankUpdateRes.status === 400, 'AC-35.2: Blank required field in update rejected with HTTP 400');

  // Test 15: Unauthorized player denied editing metadata (AC-35.3)
  const playerUpdateRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${playerToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': playerCsrf
    },
    body: JSON.stringify(updatePayload)
  });
  assert(playerUpdateRes.status === 403, 'AC-35.3: Unauthorized player edit attempt denied with HTTP 403');

  console.log('\n--- Phase 5: Licensing Approval Restrictions & Gates (EP10-03, AC-37.1..37.3) ---');

  // Test 16: View recorded licensing approval status (AC-37.1)
  const getGameRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const getGameData = await getGameRes.json();
  assert(getGameData.game.licensing && getGameData.game.licensing.status === 'pending', 'AC-37.1: Game licensing status is visible to administrator');

  // Test 17: Publishing blocked when licensing is not approved (AC-37.2)
  const prematurePublishRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ isPublished: true })
  });
  const prematurePublishData = await prematurePublishRes.json();
  assert(
    prematurePublishRes.status === 422 && prematurePublishData.error === 'LICENSING_APPROVAL_REQUIRED',
    'AC-37.2: Publication blocked with HTTP 422 when licensing status is not "approved"'
  );

  // Test 18: Update licensing status to 'approved' (AC-37.1)
  const licenseApproveRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}/licensing`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({
      status: 'approved',
      notes: 'Commercial distribution agreement #NP-2026-HV verified and countersigned.'
    })
  });
  const licenseApproveData = await licenseApproveRes.json();
  assert(licenseApproveRes.status === 200 && licenseApproveData.result.licensingStatus === 'approved', 'AC-37.1: Administrator successfully updates licensing to "approved"');

  console.log('\n--- Phase 6: Publication & Unpublication Workflows (EP10-02, AC-36.1..36.3, AC-37.3) ---');

  // Test 19: Publish approved game listing (AC-36.1)
  const validPublishRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ isPublished: true })
  });
  assert(validPublishRes.status === 200, 'AC-36.1: Approved game published returns HTTP 200 OK');

  // Test 20: Published game is now visible in public catalog (AC-36.1)
  const publicVerifyRes = await fetch(`${BASE_URL}/api/v1/catalog/games?q=Hyper+Velocity`);
  const publicVerifyData = await publicVerifyRes.json();
  const isNowInPublic = publicVerifyData.games.some(g => g.id === createdGameId);
  assert(isNowInPublic, 'AC-36.1: Published game is immediately discoverable in public catalog');

  // Test 21: Unpublish game listing (AC-36.2)
  const unpublishRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ isPublished: false })
  });
  assert(unpublishRes.status === 200, 'AC-36.2: Unpublish action returns HTTP 200 OK');

  // Test 22: Unpublished game disappears from public discovery (AC-36.2)
  const publicUnpublishCheck = await fetch(`${BASE_URL}/api/v1/catalog/games?q=Hyper+Velocity`);
  const publicUnpublishData = await publicUnpublishCheck.json();
  const isGoneFromPublic = !publicUnpublishData.games.some(g => g.id === createdGameId);
  assert(isGoneFromPublic, 'AC-36.2: Unpublished game immediately disappears from public catalog');

  // Test 23: Unauthorized user publishing attempt denied (AC-36.3)
  const playerPublishRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${playerToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': playerCsrf
    },
    body: JSON.stringify({ isPublished: true })
  });
  assert(playerPublishRes.status === 403, 'AC-36.3: Unauthorized user publishing attempt denied with HTTP 403');

  // Test 24: Loss of licensing clearance automatically unpublishes live game (AC-37.3)
  // First re-publish the approved game
  await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ isPublished: true })
  });

  // Verify it is published
  let checkGame = db.get('SELECT is_published FROM games WHERE id = ?', [createdGameId]);
  assert(checkGame.is_published === 1, 'Precondition: Game is published live before license revocation');

  // Revoke licensing clearance by setting status to 'rejected'
  const revokeLicRes = await fetch(`${BASE_URL}/api/v1/admin/games/${createdGameId}/licensing`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({
      status: 'rejected',
      notes: 'Publisher licensing agreement terminated due to copyright conflict.'
    })
  });
  const revokeLicData = await revokeLicRes.json();
  assert(
    revokeLicRes.status === 200 && revokeLicData.result.autoUnpublished === true,
    'AC-37.3: Revoking licensing clearance returns autoUnpublished: true'
  );

  // Check database and public catalog to guarantee game is now unpublished
  checkGame = db.get('SELECT is_published FROM games WHERE id = ?', [createdGameId]);
  assert(checkGame.is_published === 0, 'AC-37.3: Database record automatically updated to is_published = 0');

  const publicRevokeCheck = await fetch(`${BASE_URL}/api/v1/catalog/games?q=Hyper+Velocity`);
  const publicRevokeData = await publicRevokeCheck.json();
  assert(
    !publicRevokeData.games.some(g => g.id === createdGameId),
    'AC-37.3: New public launches are prevented and game is completely absent from public discovery'
  );

  console.log('\n--- Phase 7: Administrative Change Auditing (EP11-02, AC-40.1, AC-40.3) ---');

  // Test 25: Audit events generated for all mutations (AC-40.1)
  const auditRes = await fetch(`${BASE_URL}/api/v1/admin/audit-events?limit=20`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const auditData = await auditRes.json();
  assert(auditRes.status === 200 && Array.isArray(auditData.events), 'AC-40.3: Administrator retrieves audit events');

  const actionTypes = auditData.events.map(e => e.action);
  assert(actionTypes.includes('GAME_CREATED'), 'AC-40.1: Audit trail recorded GAME_CREATED event');
  assert(actionTypes.includes('GAME_UPDATED'), 'AC-40.1: Audit trail recorded GAME_UPDATED event');
  assert(actionTypes.includes('GAME_PUBLISHED'), 'AC-40.1: Audit trail recorded GAME_PUBLISHED event');
  assert(actionTypes.includes('GAME_UNPUBLISHED'), 'AC-40.1: Audit trail recorded GAME_UNPUBLISHED event');
  assert(actionTypes.includes('LICENSING_UPDATED'), 'AC-40.1: Audit trail recorded LICENSING_UPDATED event');

  // Test 26: Player cannot access audit trail (AC-39.2)
  const playerAuditRes = await fetch(`${BASE_URL}/api/v1/admin/audit-events`, {
    headers: { 'Authorization': `Bearer ${playerToken}` }
  });
  assert(playerAuditRes.status === 403, 'AC-39.2: Unauthorized player access to audit trail denied with HTTP 403');

  console.log('\n===============================================================');
  console.log(` SPRINT 03 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  // Save evidence to evidence/sprint-03/
  const evidenceDir = path.join(__dirname, '..', 'evidence', 'sprint-03');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const testReport = {
    sprint: 'Sprint 03',
    epicScope: ['EP03-02', 'EP10-01', 'EP10-02', 'EP10-03', 'EP11-02'],
    acceptanceCriteria: [
      'AC-10.1', 'AC-10.2', 'AC-10.3',
      'AC-35.1', 'AC-35.2', 'AC-35.3',
      'AC-36.1', 'AC-36.2', 'AC-36.3',
      'AC-37.1', 'AC-37.2', 'AC-37.3',
      'AC-39.1', 'AC-39.2', 'AC-39.3',
      'AC-40.1', 'AC-40.2', 'AC-40.3'
    ],
    timestamp: new Date().toISOString(),
    totalTests: passedTests + failedTests,
    passedTests,
    failedTests,
    successRate: `${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`,
    testResults: results
  };

  fs.writeFileSync(
    path.join(evidenceDir, 'sprint03-admin-tests.json'),
    JSON.stringify(testReport, null, 2)
  );
  console.log(`Saved test execution evidence to: ${path.join(evidenceDir, 'sprint03-admin-tests.json')}`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
