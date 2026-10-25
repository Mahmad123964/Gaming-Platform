/**
 * NexusPlay — Sprint 06 Player Profiles & Administrative Audit Automated Test Suite
 * Traceability: EP01-04 (AC-4.1, AC-4.2, AC-4.3), EP11-03 (AC-40.1, AC-40.2, AC-40.3)
 * Security Verification: Profile isolation, attribute immutability, audit immutability triggers, credential redaction.
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
  console.log(' NEXUSPLAY SPRINT 06 — PLAYER PROFILES & ADMINISTRATIVE AUDIT TEST SUITE');
  console.log(` Target Server: ${BASE_URL}`);
  console.log(' Timestamp: ' + new Date().toISOString());
  console.log('======================================================================\n');

  const db = getDb();
  const authService = getAuthService();
  const adminService = getContentAdminService();

  console.log('--- Phase 0: Test Fixtures & Player Account Setup ---');

  // 1. Admin Setup
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
  const adminId = adminLoginData.user ? adminLoginData.user.id : adminRecord.id;

  // 2. Primary Test Player (Player Orion)
  const playerOrionEmail = `player-orion-${Date.now()}@nexusplay.test`;
  const orionRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: playerOrionEmail, password: 'Orion#2026!Pass', displayName: 'OrionOriginal' })
  });
  const orionData = (await orionRegRes.json()).data || {};
  let orionToken = orionData.token;
  let orionCsrf = orionData.csrfToken;
  const orionId = orionData.user ? orionData.user.id : orionData.id;

  // 3. Secondary Test Player (Player Lyra - for cross-player isolation)
  const playerLyraEmail = `player-lyra-${Date.now()}@nexusplay.test`;
  const lyraRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: playerLyraEmail, password: 'Lyra#2026!Pass', displayName: 'LyraExplorer' })
  });
  const lyraData = (await lyraRegRes.json()).data || {};
  const lyraToken = lyraData.token;
  const lyraCsrf = lyraData.csrfToken;
  const lyraId = lyraData.user ? lyraData.user.id : lyraData.id;

  console.log(`  Orion ID: ${orionId}, Lyra ID: ${lyraId}, Admin ID: ${adminId}\n`);

  console.log('--- Phase 1: EP01-04 Player Profile Management Verification ---');

  // Test 1: AC-4.1 - Initial profile retrieval
  const getProfRes1 = await fetch(`${BASE_URL}/api/v1/profile`, {
    headers: { 'Authorization': `Bearer ${orionToken}` }
  });
  const getProfData1 = await getProfRes1.json();
  assert(
    getProfRes1.status === 200 && getProfData1.profile && getProfData1.profile.displayName === 'OrionOriginal',
    'AC-4.1-01',
    'Authenticated player can view initial profile',
    `Status: ${getProfRes1.status}, DisplayName: ${getProfData1.profile?.displayName}`
  );

  // Test 2: AC-4.1 - Valid profile update with allowed display name, avatar, bio & preferences
  const updatePayload = {
    displayName: 'OrionVanguard',
    avatar: 'pixel-invader',
    bio: 'Veteran space ace navigating the outer rim nebulae.',
    preferences: {
      theme: 'cyber-neon',
      soundEnabled: false,
      notificationsEnabled: true,
      privacyMode: 'friends-only'
    }
  };
  const putProfRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    },
    body: JSON.stringify(updatePayload)
  });
  const putProfData = await putProfRes.json();
  assert(
    putProfRes.status === 200 && putProfData.profile.displayName === 'OrionVanguard',
    'AC-4.1-02',
    'Valid profile update persists revised display name',
    `Status: ${putProfRes.status}, DisplayName: ${putProfData.profile?.displayName}`
  );

  // Test 3: AC-4.1 - Revised values appear on subsequent profile query
  const getProfRes2 = await fetch(`${BASE_URL}/api/v1/profile`, {
    headers: { 'Authorization': `Bearer ${orionToken}` }
  });
  const getProfData2 = await getProfRes2.json();
  const prof = getProfData2.profile || {};
  assert(
    prof.displayName === 'OrionVanguard' &&
    prof.avatar === 'pixel-invader' &&
    prof.bio === 'Veteran space ace navigating the outer rim nebulae.' &&
    prof.preferences?.theme === 'cyber-neon' &&
    prof.preferences?.soundEnabled === false &&
    prof.preferences?.privacyMode === 'friends-only',
    'AC-4.1-03',
    'Profile retrieval reflects updated avatar, bio, and preferences',
    `Avatar: ${prof.avatar}, Theme: ${prof.preferences?.theme}`
  );

  // Test 4: AC-4.1 - Database sync: players.display_name is synchronized with player_profiles
  const playerDbRow = db.get('SELECT display_name FROM players WHERE id = ?', [orionId]);
  assert(
    playerDbRow && playerDbRow.display_name === 'OrionVanguard',
    'AC-4.1-04',
    'Player record display_name correctly synchronized in database',
    `DB display_name: ${playerDbRow?.display_name}`
  );

  // Test 5: AC-4.2 - Invalid profile value: empty display name rejected
  const emptyNameRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    },
    body: JSON.stringify({ displayName: '' })
  });
  assert(
    emptyNameRes.status === 400,
    'AC-4.2-01',
    'Empty display name rejected with HTTP 400',
    `Status: ${emptyNameRes.status}`
  );

  // Test 6: AC-4.2 - Invalid profile value: display name too short (<3 chars)
  const shortNameRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    },
    body: JSON.stringify({ displayName: 'AB' })
  });
  assert(
    shortNameRes.status === 400,
    'AC-4.2-02',
    'Display name under 3 characters rejected with HTTP 400',
    `Status: ${shortNameRes.status}`
  );

  // Test 7: AC-4.2 - Invalid profile value: display name too long (>30 chars)
  const longNameRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    },
    body: JSON.stringify({ displayName: 'A'.repeat(31) })
  });
  assert(
    longNameRes.status === 400,
    'AC-4.2-03',
    'Display name over 30 characters rejected with HTTP 400',
    `Status: ${longNameRes.status}`
  );

  // Test 8: AC-4.2 - Invalid profile value: forbidden special characters / script injection
  const scriptNameRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    },
    body: JSON.stringify({ displayName: '<script>alert(1)</script>' })
  });
  assert(
    scriptNameRes.status === 400,
    'AC-4.2-04',
    'Special characters & script tags in display name rejected with HTTP 400',
    `Status: ${scriptNameRes.status}`
  );

  // Test 9: AC-4.2 - Invalid profile value: bio over 250 characters rejected
  const longBioRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    },
    body: JSON.stringify({ displayName: 'ValidName', bio: 'X'.repeat(251) })
  });
  assert(
    longBioRes.status === 400,
    'AC-4.2-05',
    'Bio over 250 characters rejected with HTTP 400',
    `Status: ${longBioRes.status}`
  );

  // Test 10: AC-4.2 - Verify prior values remain intact after rejected updates
  const getProfRes3 = await fetch(`${BASE_URL}/api/v1/profile`, {
    headers: { 'Authorization': `Bearer ${orionToken}` }
  });
  const getProfData3 = await getProfRes3.json();
  assert(
    getProfData3.profile?.displayName === 'OrionVanguard',
    'AC-4.2-06',
    'Prior values remain unchanged after invalid update requests',
    `DisplayName: ${getProfData3.profile?.displayName}`
  );

  // Test 11: AC-4.3 - Unauthenticated profile query rejected
  const unauthGetRes = await fetch(`${BASE_URL}/api/v1/profile`);
  assert(
    unauthGetRes.status === 401,
    'AC-4.3-01',
    'Unauthenticated profile retrieval denied with HTTP 401',
    `Status: ${unauthGetRes.status}`
  );

  // Test 12: AC-4.3 - Unauthenticated profile update rejected
  const unauthPutRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'HackerName' })
  });
  assert(
    unauthPutRes.status === 401,
    'AC-4.3-02',
    'Unauthenticated profile update denied with HTTP 401',
    `Status: ${unauthPutRes.status}`
  );

  // Test 13: AC-4.3 - Invalid token rejected
  const invalidTokenRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer forged.invalid.token'
    },
    body: JSON.stringify({ displayName: 'HackerName' })
  });
  assert(
    invalidTokenRes.status === 401,
    'AC-4.3-03',
    'Forged authorization token rejected with HTTP 401',
    `Status: ${invalidTokenRes.status}`
  );

  // Test 14: SEC-PROF - Privileged attribute tampering prevention
  // Attempt to elevate role to 'admin', change subscription to 'pro', modify email and gamerscore
  const tamperRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    },
    body: JSON.stringify({
      displayName: 'OrionHacked',
      role: 'admin',
      subscription: 'enterprise',
      email: 'admin-takeover@nexusplay.test',
      gamerscore: 999999,
      status: 'banned',
      id: 'stolen-id'
    })
  });
  const tamperData = await tamperRes.json();
  const tamperDb = db.get('SELECT role, email, status FROM players WHERE id = ?', [orionId]);
  assert(
    tamperRes.status === 200 &&
    tamperData.profile.role === 'player' &&
    tamperData.profile.subscription !== 'enterprise' &&
    tamperDb.role === 'player' &&
    tamperDb.email === playerOrionEmail &&
    tamperDb.status === 'active',
    'SEC-PROF-01',
    'Privileged fields (role, subscription, email, score) immune to client modification',
    `Role in DB: ${tamperDb?.role}, Email in DB: ${tamperDb?.email}`
  );

  // Test 15: SEC-PROF - Session persistence across logout and login
  // Sign out Orion, then re-authenticate and verify profile is retained
  await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    }
  });
  const reLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: playerOrionEmail, password: 'Orion#2026!Pass' })
  });
  const reLoginData = (await reLoginRes.json()).data || {};
  const reToken = reLoginData.token;
  orionToken = reToken;
  orionCsrf = reLoginData.csrfToken;
  const reProfileRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    headers: { 'Authorization': `Bearer ${reToken}` }
  });
  const reProfile = (await reProfileRes.json()).profile;
  assert(
    reLoginRes.status === 200 && reProfile?.displayName === 'OrionHacked' && reProfile?.avatar === 'pixel-invader',
    'SEC-PROF-02',
    'Profile data strictly persists across player logout and login cycles',
    `Re-login displayName: ${reProfile?.displayName}`
  );

  // Test 16: ISO-PROF - Cross-player isolation: Player Lyra views Orion's public profile
  const pubProfileRes = await fetch(`${BASE_URL}/api/v1/profile/${orionId}`, {
    headers: { 'Authorization': `Bearer ${lyraToken}` }
  });
  const pubProfileData = await pubProfileRes.json();
  assert(
    pubProfileRes.status === 200 &&
    pubProfileData.profile.displayName === 'OrionHacked' &&
    pubProfileData.profile.email === undefined &&
    pubProfileData.profile.preferences?.soundEnabled === undefined,
    'ISO-PROF-01',
    'Public profile query returns sanitized view, omitting private email & preferences',
    `Public email exposed: ${pubProfileData.profile?.email}`
  );

  // Test 17: ISO-PROF - Cross-player non-existent player lookup
  const nonExistentProfileRes = await fetch(`${BASE_URL}/api/v1/profile/player-non-existent-99999`, {
    headers: { 'Authorization': `Bearer ${lyraToken}` }
  });
  assert(
    nonExistentProfileRes.status === 404,
    'ISO-PROF-02',
    'Querying non-existent player profile returns HTTP 404',
    `Status: ${nonExistentProfileRes.status}`
  );

  console.log('\n--- Phase 2: EP11-03 Administrative Audit Inspection Verification ---');

  // Test 18: AC-40.1 - Admin action creates audit record with actor, action, and timestamp
  const testSlug = `audit-game-${Date.now()}`;
  const testGamePayload = {
    title: 'Audit Track Test Game',
    slug: testSlug,
    categoryId: 'cat-arcade',
    description: 'Game used for AC-40.1 audit trail verification with valid length description.',
    launchUrl: '/games/audit-test/index.html',
    minPlayers: 1,
    maxPlayers: 1,
    isPremium: false,
    supportsBots: false
  };
  const createGameRes = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify(testGamePayload)
  });
  const createGameData = await createGameRes.json();
  const createdGameId = createGameData.game?.id;
  assert(
    createGameRes.status === 201 && createdGameId,
    'AC-40.1-01',
    'Admin creates game to trigger audit trail recording',
    `Status: ${createGameRes.status}, GameId: ${createdGameId}`
  );

  // Test 19: AC-40.1 - Audit log records GAME_CREATED action with actor details
  const auditRes1 = await fetch(`${BASE_URL}/api/v1/admin/audit-events?action=GAME_CREATED&limit=10`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const auditData1 = await auditRes1.json();
  const matchingCreateEvent = (auditData1.events || []).find((ev) => ev.resource === `game:${createdGameId}`);
  assert(
    matchingCreateEvent &&
    matchingCreateEvent.action === 'GAME_CREATED' &&
    matchingCreateEvent.actorId === adminId &&
    matchingCreateEvent.createdAt,
    'AC-40.1-02',
    'Audit captures actor, action (GAME_CREATED), resource, and valid timestamp',
    `Actor: ${matchingCreateEvent?.actorName}, Time: ${matchingCreateEvent?.createdAt}`
  );

  // Test 20: AC-40.2 - Unauthorized administrative action is rejected & logged as ACCESS_DENIED
  const unauthorizedAdminAttempt = await fetch(`${BASE_URL}/api/v1/admin/games`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orionToken}`,
      'X-CSRF-Token': orionCsrf
    },
    body: JSON.stringify({
      title: 'Hacked Admin Game',
      slug: `hacked-game-${Date.now()}`,
      categoryId: 'cat-arcade',
      description: 'Unauthorized game creation attempt by standard player.',
      launchUrl: '/games/hacked/index.html'
    })
  });
  assert(
    unauthorizedAdminAttempt.status === 403,
    'AC-40.2-01',
    'Unauthorized player administrative attempt rejected with HTTP 403 Forbidden',
    `Status: ${unauthorizedAdminAttempt.status}`
  );

  // Test 21: AC-40.2 - Audit policy records ACCESS_DENIED with actor attribution
  const auditRes2 = await fetch(`${BASE_URL}/api/v1/admin/audit-events?action=ACCESS_DENIED&limit=10`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const auditData2 = await auditRes2.json();
  const matchingDenyEvent = (auditData2.events || []).find(
    (ev) => ev.action === 'ACCESS_DENIED' && ev.actorId === orionId
  );
  assert(
    matchingDenyEvent && (matchingDenyEvent.resource === '/api/v1/admin/games' || matchingDenyEvent.resource === 'admin:games'),
    'AC-40.2-02',
    'Security failure recorded in audit log as ACCESS_DENIED with violating actor',
    `Actor: ${matchingDenyEvent?.actorName}, Resource: ${matchingDenyEvent?.resource}`
  );

  // Test 22: AC-40.3 - Authorized operator views audit events with filters
  const auditRes3 = await fetch(`${BASE_URL}/api/v1/admin/audit-events?limit=25`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const auditData3 = await auditRes3.json();
  assert(
    auditRes3.status === 200 && Array.isArray(auditData3.events) && auditData3.events.length > 0,
    'AC-40.3-01',
    'Authorized operator can retrieve historical audit events',
    `Total returned: ${auditData3.events?.length}`
  );

  // Test 23: AC-40.3 - Audit filtering by specific action
  const auditFilterRes = await fetch(`${BASE_URL}/api/v1/admin/audit-events?action=GAME_CREATED&limit=20`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const auditFilterData = await auditFilterRes.json();
  const allMatchAction = (auditFilterData.events || []).every((ev) => ev.action === 'GAME_CREATED');
  assert(
    auditFilterRes.status === 200 && allMatchAction && auditFilterData.events.length > 0,
    'AC-40.3-02',
    'Audit query filtering by action returns only matching records',
    `Filtered Count: ${auditFilterData.events?.length}`
  );

  // Test 24: AC-40.3 - Audit filtering by actorId
  const auditActorRes = await fetch(`${BASE_URL}/api/v1/admin/audit-events?actorId=${adminId}&limit=20`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const auditActorData = await auditActorRes.json();
  const allMatchActor = (auditActorData.events || []).every((ev) => ev.actorId === adminId);
  assert(
    auditActorRes.status === 200 && allMatchActor && auditActorData.events.length > 0,
    'AC-40.3-03',
    'Audit query filtering by actorId returns exclusively matching actor entries',
    `Actor Matches: ${auditActorData.events?.length}`
  );

  // Test 25: AC-40.3 - Non-admin denied access to audit log inspection
  const nonAdminAuditRes = await fetch(`${BASE_URL}/api/v1/admin/audit-events`, {
    headers: { 'Authorization': `Bearer ${orionToken}` }
  });
  assert(
    nonAdminAuditRes.status === 403,
    'AC-40.3-04',
    'Non-admin player is strictly forbidden from inspecting audit events',
    `Status: ${nonAdminAuditRes.status}`
  );

  console.log('\n--- Phase 3: Audit Engine Immutability & Security Redaction Verification ---');

  // Test 26: IMMUT-01 - HTTP mutation rejection on /api/v1/admin/audit-events
  const postAuditRes = await fetch(`${BASE_URL}/api/v1/admin/audit-events`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'X-CSRF-Token': adminCsrf }
  });
  const putAuditRes = await fetch(`${BASE_URL}/api/v1/admin/audit-events`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'X-CSRF-Token': adminCsrf }
  });
  const deleteAuditRes = await fetch(`${BASE_URL}/api/v1/admin/audit-events`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'X-CSRF-Token': adminCsrf }
  });
  assert(
    postAuditRes.status === 405 && putAuditRes.status === 405 && deleteAuditRes.status === 405,
    'IMMUT-01',
    'Audit endpoints reject POST, PUT, DELETE with HTTP 405 Method Not Allowed',
    `POST: ${postAuditRes.status}, PUT: ${putAuditRes.status}, DELETE: ${deleteAuditRes.status}`
  );

  // Test 27: IMMUT-02 - Physical SQLite database trigger prevents UPDATE on audit_events
  let dbUpdateFailed = false;
  let dbUpdateError = '';
  try {
    const sampleEvent = db.get('SELECT id FROM audit_events LIMIT 1');
    if (sampleEvent) {
      db.run('UPDATE audit_events SET action = ? WHERE id = ?', ['FORGED_ACTION', sampleEvent.id]);
    }
  } catch (err) {
    dbUpdateFailed = true;
    dbUpdateError = err.message;
  }
  assert(
    dbUpdateFailed && dbUpdateError.toLowerCase().includes('immutable'),
    'IMMUT-02',
    'SQLite engine trigger successfully aborts physical UPDATE on audit_events',
    `Trigger exception: ${dbUpdateError}`
  );

  // Test 28: IMMUT-03 - Physical SQLite database trigger prevents DELETE on audit_events
  let dbDeleteFailed = false;
  let dbDeleteError = '';
  try {
    const sampleEvent = db.get('SELECT id FROM audit_events LIMIT 1');
    if (sampleEvent) {
      db.run('DELETE FROM audit_events WHERE id = ?', [sampleEvent.id]);
    }
  } catch (err) {
    dbDeleteFailed = true;
    dbDeleteError = err.message;
  }
  assert(
    dbDeleteFailed && dbDeleteError.toLowerCase().includes('immutable'),
    'IMMUT-03',
    'SQLite engine trigger successfully aborts physical DELETE on audit_events',
    `Trigger exception: ${dbDeleteError}`
  );

  // Test 29: REDACT-01 - Audit service sanitization redacts sensitive passwords and secrets
  adminService.recordAuditEvent({
    action: 'SECURITY_TEST_REDACTION',
    actorId: adminId,
    actorName: 'AdminOfficer',
    actorRole: 'admin',
    resource: 'security:test',
    details: {
      user: 'test_user',
      password: 'PlainSecretPassword!2026',
      token: 'jwt.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      sessionSecret: 'secret_key_abcdef12345',
      nested: {
        authorizationKey: 'sensitive-auth-header-value',
        publicNote: 'safe note'
      }
    }
  });

  const redactedEventRow = db.get(
    "SELECT details_json FROM audit_events WHERE action = 'SECURITY_TEST_REDACTION' ORDER BY created_at DESC LIMIT 1"
  );
  let parsedDetails = {};
  try {
    parsedDetails = JSON.parse(redactedEventRow.details_json);
  } catch (e) {}

  assert(
    parsedDetails.password === '[REDACTED]' &&
    parsedDetails.token === '[REDACTED]' &&
    parsedDetails.sessionSecret === '[REDACTED]' &&
    parsedDetails.nested?.authorizationKey === '[REDACTED]' &&
    parsedDetails.nested?.publicNote === 'safe note',
    'REDACT-01',
    'Audit service scrubs passwords, tokens, secrets, and auth keys recursively',
    `Password: ${parsedDetails.password}, Token: ${parsedDetails.token}`
  );

  // Test 30: COMPAT-01 - Existing Career Hub progress, history & achievements remain fully compatible
  const historyRes = await fetch(`${BASE_URL}/api/v1/progress/history`, {
    headers: { 'Authorization': `Bearer ${orionToken}` }
  });
  const achRes = await fetch(`${BASE_URL}/api/v1/progress/achievements`, {
    headers: { 'Authorization': `Bearer ${orionToken}` }
  });
  assert(
    historyRes.status === 200 && achRes.status === 200,
    'COMPAT-01',
    'Sprint 05 Career Hub history & achievements APIs operational with zero regression',
    `History status: ${historyRes.status}, Achievements status: ${achRes.status}`
  );

  console.log('\n======================================================================');
  console.log(' SPRINT 06 AUTOMATED TEST RESULTS SUMMARY');
  console.log(` TOTAL TESTS:  ${passedTests + failedTests}`);
  console.log(` PASSED:       \x1b[32m${passedTests}\x1b[0m`);
  console.log(` FAILED:       \x1b[31m${failedTests}\x1b[0m`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test execution failure:', err);
  process.exit(1);
});
