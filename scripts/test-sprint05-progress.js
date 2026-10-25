/**
 * NexusPlay — Sprint 05 Game Progress, History & Achievements Automated Test Suite
 * Traceability: EP07-01, EP07-02, EP07-03, EP07-04
 * Acceptance Criteria: AC-23.1..23.3, AC-24.1..24.3, AC-25.1..25.3, AC-26.1..26.3
 * Security Verification: SEC-01..05 (Score bounds, velocity trust model, idempotency, data isolation)
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
  console.log(' NEXUSPLAY SPRINT 05 — GAME PROGRESS, HISTORY & ACHIEVEMENTS TEST SUITE');
  console.log(` Target Server: ${BASE_URL}`);
  console.log(' Timestamp: ' + new Date().toISOString());
  console.log('======================================================================\n');

  const db = getDb();
  const authService = getAuthService();
  const adminService = getContentAdminService();

  console.log('--- Phase 0: Test Fixtures & Baseline Players Setup ---');

  // 1. Ensure Admin Account
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

  // 2. Primary Test Player (Player Alpha)
  const playerAlphaEmail = `player-alpha-${Date.now()}@nexusplay.test`;
  const alphaRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: playerAlphaEmail, password: 'Alpha#2026!Pass', displayName: 'PilotAlpha' })
  });
  const alphaData = (await alphaRegRes.json()).data || {};
  const alphaToken = alphaData.token;
  const alphaCsrf = alphaData.csrfToken;
  const alphaId = alphaData.user ? alphaData.user.id : alphaData.id;

  // 3. Secondary Test Player (Player Beta - for isolation testing)
  const playerBetaEmail = `player-beta-${Date.now()}@nexusplay.test`;
  const betaRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: playerBetaEmail, password: 'Beta#2026!Pass', displayName: 'PilotBeta' })
  });
  const betaData = (await betaRegRes.json()).data || {};
  const betaToken = betaData.token;
  const betaCsrf = betaData.csrfToken;
  const betaId = betaData.user ? betaData.user.id : betaData.id;

  // 4. Clean Slate Player (Player Gamma - for empty state testing)
  const playerGammaEmail = `player-gamma-${Date.now()}@nexusplay.test`;
  const gammaRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: playerGammaEmail, password: 'Gamma#2026!Pass', displayName: 'PilotGamma' })
  });
  const gammaData = (await gammaRegRes.json()).data || {};
  const gammaToken = gammaData.token;
  const gammaCsrf = gammaData.csrfToken;
  const gammaId = gammaData.user ? gammaData.user.id : gammaData.id;

  assert(alphaToken && betaToken && gammaToken && adminToken, 'SETUP-01', 'Test player fixtures initialized (Alpha, Beta, Gamma, Admin)');

  // Ensure Cyber Invaders exists and is published
  let cyberGame = db.get("SELECT id, slug, title FROM games WHERE slug = 'cyber-invaders'");
  if (!cyberGame) {
    db.run(
      `INSERT INTO games (id, slug, title, description, category_id, mode, min_players, max_players, is_premium, is_published, licensing_status, launch_url)
       VALUES ('game-001', 'cyber-invaders', 'Cyber Invaders', 'Canvas 2D retro arcade shooter', 'cat-arcade', 'single_player', 1, 1, 0, 1, 'approved', '/games/cyber-invaders/index.html')`
    );
    cyberGame = db.get("SELECT id, slug, title FROM games WHERE slug = 'cyber-invaders'");
  }
  assert(cyberGame && cyberGame.slug === 'cyber-invaders', 'SETUP-02', 'Target game "cyber-invaders" verified in catalog database');

  console.log('\n--- Phase 1: Score Persistence & Ownership (EP07-01, AC-23.1, AC-23.2, AC-23.3) ---');

  // Launch a session for Player Alpha
  const launchAlphaRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ resume: false })
  });
  const launchAlphaData = await launchAlphaRes.json();
  const alphaSessionId = launchAlphaData.sessionId || (launchAlphaData.session && launchAlphaData.session.sessionId);
  assert(launchAlphaRes.status === 200 && alphaSessionId, 'SCORE-01', 'Player Alpha launched new session for score test');

  // AC-23.1: Complete session with score and verify persistence in history
  const completeAlphaRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: alphaSessionId,
      score: 1850,
      level: 3,
      durationSeconds: 45,
      accuracyPct: 88,
      aliensDefeated: 24,
      bunkersIntact: true
    })
  });
  const completeAlphaData = await completeAlphaRes.json();

  assert(completeAlphaRes.status === 200, 'AC-23.1a', 'Score completion returns HTTP 200 OK (AC-23.1)');
  assert(completeAlphaData.status === 'SUCCESS' && completeAlphaData.historyId, 'AC-23.1b', 'History record created with unique historyId (AC-23.1)');
  assert(completeAlphaData.score === 1850 && completeAlphaData.level === 3, 'AC-23.1c', 'Recorded score (1,850) and wave level (3) match submitted payload (AC-23.1)');
  assert(completeAlphaData.verificationStatus === 'PLAUSIBILITY_CHECK_PASSED', 'AC-23.1d', 'Reasonable score within velocity threshold marked "PLAUSIBILITY_CHECK_PASSED" (Task 1)');

  // Verify in DB that history row belongs to alphaId
  const historyDbRow = db.get("SELECT * FROM game_history WHERE session_id = ?", [alphaSessionId]);
  assert(historyDbRow && historyDbRow.player_id === alphaId && historyDbRow.score === 1850, 'AC-23.1e', 'Database verification: game_history row belongs to Player Alpha (AC-23.1)');

  // AC-23.3: Duplicate / Replayed completion submission handling (Idempotency)
  const duplicateAlphaRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: alphaSessionId,
      score: 99999, // Attempted tamper on duplicate
      level: 10,
      durationSeconds: 100
    })
  });
  const duplicateAlphaData = await duplicateAlphaRes.json();

  assert(duplicateAlphaRes.status === 200, 'AC-23.3a', 'Duplicate submission returns HTTP 200 OK idempotently (AC-23.3)');
  assert(duplicateAlphaData.duplicate === true, 'AC-23.3b', 'Response signals duplicate submission detected (AC-23.3)');
  assert(duplicateAlphaData.score === 1850, 'AC-23.3c', 'Original score of 1850 preserved, not overwritten by replayed score (AC-23.3)');

  const historyCountForSession = db.get("SELECT COUNT(*) as cnt FROM game_history WHERE session_id = ?", [alphaSessionId]);
  assert(historyCountForSession.cnt === 1, 'AC-23.3d', 'Database contains strictly 1 history record for the session (AC-23.3)');

  // AC-23.2: Cross-Player Score and History Isolation
  // Player Beta attempts to query Player Alpha's history directly
  const crossPlayerHistoryRes = await fetch(`${BASE_URL}/api/v1/progress/history/${encodeURIComponent(alphaId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${betaToken}`,
      'Content-Type': 'application/json'
    }
  });
  assert(crossPlayerHistoryRes.status === 403, 'AC-23.2a', 'Player Beta attempting to view Player Alpha history receives HTTP 403 Forbidden (AC-23.2)');

  // Player Beta attempts to submit score completion for Player Alpha's session
  const crossPlayerCompleteRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${betaToken}`,
      'X-CSRF-Token': betaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: alphaSessionId,
      score: 5000,
      level: 5
    })
  });
  assert(crossPlayerCompleteRes.status === 403, 'AC-23.2b', 'Player Beta attempting to complete Player Alpha session receives HTTP 403 Forbidden (AC-23.2)');

  console.log('\n--- Phase 2: Saved Level Progression & Resumption (EP07-02, AC-24.1, AC-24.2, AC-24.3) ---');

  // Save checkpoint progression for Player Alpha (Wave 4, Score 3200)
  const saveCheckpointRes = await fetch(`${BASE_URL}/api/v1/progress/checkpoint`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gameIdOrSlug: 'cyber-invaders',
      level: 4,
      score: 3200,
      stateData: { shieldLevel: 2, bombsRemaining: 1 }
    })
  });
  const saveCheckpointData = await saveCheckpointRes.json();
  assert(saveCheckpointRes.status === 200 && saveCheckpointData.progress.level === 4, 'CHECKPOINT-01', 'Checkpoint progress saved successfully for Player Alpha');

  // AC-24.1: Resuming game starts at saved level
  const resumeLaunchRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ resume: true })
  });
  const resumeLaunchData = await resumeLaunchRes.json();

  assert(resumeLaunchRes.status === 200, 'AC-24.1a', 'Resume launch returns HTTP 200 OK (AC-24.1)');
  assert(resumeLaunchData.resumption && resumeLaunchData.resumption.resumed === true, 'AC-24.1b', 'Launch response confirms resumed state is true (AC-24.1)');
  assert(resumeLaunchData.resumption.level === 4, 'AC-24.1c', 'Resumed session starts at saved Wave 4 (AC-24.1)');
  assert(resumeLaunchData.resumption.score === 3200, 'AC-24.1d', 'Resumed session restores saved score 3,200 (AC-24.1)');

  // AC-24.2: Game with no saved progress returns clear message
  // Player Gamma has no saved progress
  const gammaCheckpointRes = await fetch(`${BASE_URL}/api/v1/progress/checkpoint/cyber-invaders`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${gammaToken}`,
      'Content-Type': 'application/json'
    }
  });
  const gammaCheckpointData = await gammaCheckpointRes.json();

  assert(gammaCheckpointRes.status === 200, 'AC-24.2a', 'Query for player with no progress returns HTTP 200 OK (AC-24.2)');
  assert(gammaCheckpointData.hasSavedProgress === false, 'AC-24.2b', 'hasSavedProgress flag is false (AC-24.2)');
  assert(gammaCheckpointData.message && gammaCheckpointData.message.includes('No saved progress'), 'AC-24.2c', 'Clear descriptive message returned for unprogressed game (AC-24.2)');

  // AC-24.3: Cross-player level access denial
  // Player Beta attempts to retrieve Player Alpha's saved checkpoint
  const crossPlayerCheckpointRes = await fetch(`${BASE_URL}/api/v1/progress/checkpoint/cyber-invaders/${encodeURIComponent(alphaId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${betaToken}`,
      'Content-Type': 'application/json'
    }
  });
  assert(crossPlayerCheckpointRes.status === 403, 'AC-24.3a', 'Player Beta attempting to inspect Player Alpha checkpoint receives HTTP 403 Forbidden (AC-24.3)');

  console.log('\n--- Phase 3: Recent Session History (EP07-03, AC-25.1, AC-25.2, AC-25.3) ---');

  // AC-25.3: Player with 0 completed games returns empty state message
  const gammaHistoryRes = await fetch(`${BASE_URL}/api/v1/progress/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${gammaToken}`,
      'Content-Type': 'application/json'
    }
  });
  const gammaHistoryData = await gammaHistoryRes.json();

  assert(gammaHistoryRes.status === 200, 'AC-25.3a', 'Zero-session history request returns HTTP 200 OK (AC-25.3)');
  assert(gammaHistoryData.isEmpty === true && gammaHistoryData.history.length === 0, 'AC-25.3b', 'History list is empty with isEmpty flag true (AC-25.3)');
  assert(gammaHistoryData.emptyMessage && gammaHistoryData.emptyMessage.includes('No completed game sessions'), 'AC-25.3c', 'Empty-state message clearly rendered (AC-25.3)');

  // AC-25.2: Retrieve history when player has < 10 completed games
  // Seed 4 distinct completed sessions for Player Beta
  for (let i = 1; i <= 4; i++) {
    const sId = `ses-beta-hist-${i}-${Date.now()}`;
    const hId = `hist-beta-${i}-${Date.now()}`;
    const compTime = new Date(Date.now() - (5 - i) * 60000).toISOString();
    db.run(
      `INSERT INTO game_sessions (id, game_id, player_id, mode, status, created_at, ended_at)
       VALUES (?, 'game-001', ?, 'single_player', 'completed', ?, ?)`,
      [sId, betaId, compTime, compTime]
    );
    db.run(
      `INSERT INTO game_history (id, session_id, player_id, game_id, score, level, duration_seconds, verification_status, completed_at)
       VALUES (?, ?, ?, 'game-001', ?, ?, 30, 'verified', ?)`,
      [hId, sId, betaId, i * 400, i, compTime]
    );
  }

  const betaHistoryRes = await fetch(`${BASE_URL}/api/v1/progress/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${betaToken}`,
      'Content-Type': 'application/json'
    }
  });
  const betaHistoryData = await betaHistoryRes.json();

  assert(betaHistoryRes.status === 200, 'AC-25.2a', 'Beta history request returns HTTP 200 OK (AC-25.2)');
  assert(betaHistoryData.history.length === 4, 'AC-25.2b', 'Retrieves all available 4 completed sessions (AC-25.2)');
  assert(betaHistoryData.count === 4 && betaHistoryData.isEmpty === false, 'AC-25.2c', 'History metadata matches 4 sessions (AC-25.2)');

  // AC-25.1: Exactly 10 sessions returned when player has > 10 completed games
  // Seed 14 total completed sessions for Player Alpha
  for (let i = 2; i <= 15; i++) {
    const sId = `ses-alpha-hist-${i}-${Date.now()}`;
    const hId = `hist-alpha-${i}-${Date.now()}`;
    const compTime = new Date(Date.now() - (20 - i) * 60000).toISOString();
    db.run(
      `INSERT INTO game_sessions (id, game_id, player_id, mode, status, created_at, ended_at)
       VALUES (?, 'game-001', ?, 'single_player', 'completed', ?, ?)`,
      [sId, alphaId, compTime, compTime]
    );
    db.run(
      `INSERT INTO game_history (id, session_id, player_id, game_id, score, level, duration_seconds, verification_status, completed_at)
       VALUES (?, ?, ?, 'game-001', ?, ?, 40, 'verified', ?)`,
      [hId, sId, alphaId, i * 500, (i % 5) + 1, compTime]
    );
  }

  const alphaHistoryRes = await fetch(`${BASE_URL}/api/v1/progress/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'Content-Type': 'application/json'
    }
  });
  const alphaHistoryData = await alphaHistoryRes.json();

  assert(alphaHistoryRes.status === 200, 'AC-25.1a', 'Alpha history request returns HTTP 200 OK (AC-25.1)');
  assert(alphaHistoryData.history.length === 10, 'AC-25.1b', 'Query caps output to exactly 10 latest completed sessions (AC-25.1)');
  assert(alphaHistoryData.limit === 10, 'AC-25.1c', 'Response confirms 10-session cap applied (AC-25.1)');

  // Verify chronological ordering (completed_at DESC)
  let isChronological = true;
  for (let i = 0; i < alphaHistoryData.history.length - 1; i++) {
    const tCurrent = new Date(alphaHistoryData.history[i].completedAt).getTime();
    const tNext = new Date(alphaHistoryData.history[i + 1].completedAt).getTime();
    if (tCurrent < tNext) {
      isChronological = false;
      break;
    }
  }
  assert(isChronological, 'AC-25.1d', 'Sessions are ordered chronologically with most recent completed game first (AC-25.1)');

  console.log('\n--- Phase 4: Achievements Persistence & Display (EP07-04, AC-26.1, AC-26.2, AC-26.3) ---');

  // AC-26.2: Empty state message for player with 0 achievements
  const gammaAchievementsRes = await fetch(`${BASE_URL}/api/v1/progress/achievements`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${gammaToken}`,
      'Content-Type': 'application/json'
    }
  });
  const gammaAchievementsData = await gammaAchievementsRes.json();

  assert(gammaAchievementsRes.status === 200, 'AC-26.2a', 'Zero-achievement request returns HTTP 200 OK (AC-26.2)');
  assert(gammaAchievementsData.unlockedCount === 0, 'AC-26.2b', 'Unlocked count is 0 (AC-26.2)');
  assert(gammaAchievementsData.isEmpty === true, 'AC-26.2c', 'isEmpty flag is true (AC-26.2)');
  assert(gammaAchievementsData.emptyMessage && gammaAchievementsData.emptyMessage.includes('No achievements earned yet'), 'AC-26.2d', 'Empty-state message clearly displayed (AC-26.2)');

  // AC-26.1: View earned achievements with unlock status and points
  // Trigger game session for Player Beta earning FIRST_CONTACT and GRID_SENTINEL
  const betaLaunchRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${betaToken}`,
      'X-CSRF-Token': betaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ resume: false })
  });
  const betaLaunchData = await betaLaunchRes.json();
  const betaSessId = betaLaunchData.sessionId || (betaLaunchData.session && betaLaunchData.session.sessionId);

  const betaCompleteRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${betaToken}`,
      'X-CSRF-Token': betaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: betaSessId,
      score: 2500,
      level: 3,
      durationSeconds: 60,
      accuracyPct: 92,
      aliensDefeated: 30,
      bunkersIntact: true
    })
  });
  const betaCompleteData = await betaCompleteRes.json();

  assert(betaCompleteData.newAchievements && betaCompleteData.newAchievements.length > 0, 'ACHIEVEMENTS-01', 'Game completion successfully evaluated and awarded milestone achievements');

  const betaAchievementsRes = await fetch(`${BASE_URL}/api/v1/progress/achievements`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${betaToken}`,
      'Content-Type': 'application/json'
    }
  });
  const betaAchievementsData = await betaAchievementsRes.json();

  assert(betaAchievementsRes.status === 200, 'AC-26.1a', 'Achievements query returns HTTP 200 OK (AC-26.1)');
  assert(betaAchievementsData.unlockedCount >= 2, 'AC-26.1b', 'Earned achievements correctly persisted (unlocked >= 2) (AC-26.1)');
  assert(betaAchievementsData.totalPoints > 0, 'AC-26.1c', 'Player earned gamerscore points recorded (AC-26.1)');

  const firstContactAch = betaAchievementsData.achievements.find(a => a.code === 'FIRST_CONTACT');
  assert(firstContactAch && firstContactAch.unlocked === true && firstContactAch.unlockedAt, 'AC-26.1d', 'FIRST_CONTACT marked unlocked with unlock timestamp (AC-26.1)');

  // AC-26.3: Cross-player achievement isolation (Private player status hidden)
  const crossPlayerAchRes = await fetch(`${BASE_URL}/api/v1/progress/achievements/${encodeURIComponent(betaId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${gammaToken}`,
      'Content-Type': 'application/json'
    }
  });
  assert(crossPlayerAchRes.status === 403, 'AC-26.3a', 'Cross-player achievement inspection rejected with HTTP 403 Forbidden (AC-26.3)');

  console.log('\n--- Phase 5: Security, Score Integrity & Anti-Cheat Controls ---');

  // SEC-01: Negative score rejection
  const negativeScoreRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: `ses-fake-${Date.now()}`,
      score: -50,
      level: 1
    })
  });
  assert(negativeScoreRes.status === 400, 'SEC-01a', 'Negative score (-50) rejected with HTTP 400 Bad Request');

  // SEC-01: Score ceiling violation (> 1,000,000)
  const ceilingScoreRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: `ses-fake-${Date.now()}`,
      score: 999999999,
      level: 1
    })
  });
  assert(ceilingScoreRes.status === 400, 'SEC-01b', 'Score exceeding ceiling (>1,000,000) rejected with HTTP 400 Bad Request');

  // SEC-02: Score trust & velocity verification (unverified flag)
  const highVelocitySessionId = `ses-hivel-${Date.now()}`;
  db.run(
    `INSERT INTO game_sessions (id, game_id, player_id, mode, status)
     VALUES (?, 'game-001', ?, 'single_player', 'active')`,
    [highVelocitySessionId, alphaId]
  );

  const highVelRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: highVelocitySessionId,
      score: 950000,
      level: 5,
      durationSeconds: 10 // 95,000 pts/sec -> exceeds 120 pts/sec velocity threshold
    })
  });
  const highVelData = await highVelRes.json();
  assert(highVelRes.status === 200, 'SEC-02a', 'High score accepted for telemetry recording');
  assert(highVelData.verificationStatus === 'UNVERIFIED', 'SEC-02b', 'Score exceeding human simulation velocity marked "UNVERIFIED" rather than trusted (Task 1)');

  // SEC-03: Submitting score update to non-existent session
  const nonExistentSessionRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: 'ses-does-not-exist-999',
      score: 500,
      level: 1
    })
  });
  assert(nonExistentSessionRes.status === 404, 'SEC-03a', 'Submitting completion for nonexistent session returns HTTP 404 Not Found');

  // SEC-04: Duplicate achievement awards protection
  // Trigger completion again with conditions for FIRST_CONTACT
  const dupAchSessId = `ses-beta-dupach-${Date.now()}`;
  db.run(
    `INSERT INTO game_sessions (id, game_id, player_id, mode, status)
     VALUES (?, 'game-001', ?, 'single_player', 'active')`,
    [dupAchSessId, betaId]
  );

  const dupAchRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${betaToken}`,
      'X-CSRF-Token': betaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: dupAchSessId,
      score: 3000,
      level: 4,
      durationSeconds: 70
    })
  });
  const dupAchDbRows = db.query("SELECT * FROM player_achievements WHERE player_id = ? AND achievement_id IN (SELECT id FROM achievements WHERE code = 'FIRST_CONTACT')", [betaId]);
  assert(dupAchDbRows.length === 1, 'SEC-04a', 'Database contains strictly 1 record for unique achievement; duplicate awards rejected');

  // SEC-05: Unauthorized direct API access
  const unauthRes = await fetch(`${BASE_URL}/api/v1/progress/history`, {
    method: 'GET'
  });
  assert(unauthRes.status === 401, 'SEC-05a', 'Direct unauthenticated API access returns HTTP 401 Unauthorized');

  console.log('\n--- Phase 6: Session Lifecycle, Integrity & Negative Security Tests (Tasks 1, 2, 3) ---');

  // LIFECYCLE-01: Full lifecycle test: ACTIVE -> CHECKPOINT_SAVED -> COMPLETION_RECORDED -> SESSION_ENDED
  const lifeCycleRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ resume: false })
  });
  const lifeCycleData = await lifeCycleRes.json();
  const lcSessionId = lifeCycleData.sessionId || (lifeCycleData.session && lifeCycleData.session.sessionId);

  // Step 1: Verify ACTIVE
  const s1 = db.get("SELECT status FROM game_sessions WHERE id = ?", [lcSessionId]);
  assert(s1 && s1.status === 'active', 'LIFECYCLE-01a', 'Step 1: Game session begins in "active" status');

  // Step 2: CHECKPOINT_SAVED
  const cpRes = await fetch(`${BASE_URL}/api/v1/progress/checkpoint`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gameId: 'cyber-invaders',
      level: 3,
      score: 1200,
      state: { wave: 3, lives: 3 }
    })
  });
  const s2 = db.get("SELECT status FROM game_sessions WHERE id = ?", [lcSessionId]);
  const cpDb = db.get("SELECT level, score FROM game_progress WHERE player_id = ? AND game_id = 'game-001'", [alphaId]);
  assert(cpRes.status === 200 && s2.status === 'active' && cpDb.level >= 3, 'LIFECYCLE-01b', 'Step 2: Checkpoint saved without disrupting active session status');

  // Step 3 & 4: COMPLETION_RECORDED -> SESSION_ENDED
  const compRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: lcSessionId,
      score: 2500,
      level: 4,
      durationSeconds: 60
    })
  });
  const compData = await compRes.json();
  const s3 = db.get("SELECT status, ended_at, score FROM game_sessions WHERE id = ?", [lcSessionId]);
  const histRecord = db.get("SELECT * FROM game_history WHERE session_id = ?", [lcSessionId]);
  assert(compRes.status === 200 && compData.status === 'SUCCESS', 'LIFECYCLE-01c', 'Step 3: Completion successfully recorded in history');
  assert(s3 && s3.status === 'completed' && s3.ended_at !== null && histRecord !== null, 'LIFECYCLE-01d', 'Step 4: Session status atomically transitions to "completed" with ended_at timestamp');

  // LIFECYCLE-02: End-before-complete rejection
  // Create another session and explicitly end it before completion
  const abSessionId = `ses-abandoned-${Date.now()}`;
  db.run(
    `INSERT INTO game_sessions (id, game_id, player_id, mode, status, ended_at)
     VALUES (?, 'game-001', ?, 'single_player', 'ended', CURRENT_TIMESTAMP)`,
    [abSessionId, alphaId]
  );
  const abCompleteRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: abSessionId,
      score: 1000,
      level: 2,
      durationSeconds: 30
    })
  });
  assert(abCompleteRes.status === 400, 'LIFECYCLE-02a', 'Requests submitted after a session has already ended are rejected with HTTP 400 Bad Request');

  // LIFECYCLE-03: Transactional consistency / Rollback verification
  // Verify that if an internal failure occurs during completion, no history or achievements are committed
  const txFailSessionId = `ses-txfail-${Date.now()}`;
  db.run(
    `INSERT INTO game_sessions (id, game_id, player_id, mode, status)
     VALUES (?, 'game-001', ?, 'single_player', 'active')`,
    [txFailSessionId, alphaId]
  );

  const { getProgressService } = require('../server/src/modules/progress/progressService');
  const progService = getProgressService();
  let caughtTxError = false;
  try {
    progService.recordCompletedGame({
      playerId: 'invalid-nonexistent-player-id-999',
      gameId: 'game-001',
      sessionId: txFailSessionId,
      score: 500,
      level: 1
    });
  } catch (err) {
    caughtTxError = true;
  }
  const txSessionAfter = db.get("SELECT status FROM game_sessions WHERE id = ?", [txFailSessionId]);
  const txHistAfter = db.get("SELECT * FROM game_history WHERE session_id = ?", [txFailSessionId]);
  assert(caughtTxError && txSessionAfter.status === 'active' && !txHistAfter, 'LIFECYCLE-03a', 'Partial failures / invalid states rollback cleanly: no partial score or history written');

  // TRUST-01: Negative test covering fabricated but plausible score (Task 1)
  const fabSessionId = `ses-fab-${Date.now()}`;
  db.run(
    `INSERT INTO game_sessions (id, game_id, player_id, mode, status)
     VALUES (?, 'game-001', ?, 'single_player', 'active')`,
    [fabSessionId, alphaId]
  );
  const fabRes = await fetch(`${BASE_URL}/api/v1/progress/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'X-CSRF-Token': alphaCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: fabSessionId,
      score: 4500, // Fabricated score
      level: 5,
      durationSeconds: 100 // 45 pts/sec (plausible velocity)
    })
  });
  const fabData = await fabRes.json();
  assert(fabRes.status === 200, 'TRUST-01a', 'Fabricated score with plausible velocity is accepted for telemetry recording');
  assert(fabData.verificationStatus === 'PLAUSIBILITY_CHECK_PASSED', 'TRUST-01b', 'Plausible score classified as PLAUSIBILITY_CHECK_PASSED');
  assert(fabData.verificationStatus !== 'AUTHORITATIVELY_VERIFIED', 'TRUST-01c', 'Client-reported outcome is NOT classified as AUTHORITATIVELY_VERIFIED');

  // ACHIEVE-01: Achievement verification type is PROVISIONAL (Task 3)
  const achRes = await fetch(`${BASE_URL}/api/v1/progress/achievements`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${alphaToken}`,
      'Content-Type': 'application/json'
    }
  });
  const achData = await achRes.json();
  const unlockedAch = achData.achievements.find(a => a.unlocked);
  assert(unlockedAch && unlockedAch.verificationType === 'PROVISIONAL', 'ACHIEVE-01a', 'Earned achievements explicitly marked with PROVISIONAL verification_type');

  console.log('\n======================================================================');
  console.log(' RESULTS SUMMARY');
  console.log('======================================================================');
  console.log(` Total Checks:  ${passedTests + failedTests}`);
  console.log(` Passed Checks: \x1b[32m${passedTests}\x1b[0m`);
  console.log(` Failed Checks: \x1b[31m${failedTests}\x1b[0m`);

  const reportDir = path.join(__dirname, '..', 'evidence', 'sprint-05', 'test-results');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPayload = {
    suite: 'Sprint 05 — Game Progress, History & Achievements',
    timestamp: new Date().toISOString(),
    targetUrl: BASE_URL,
    total: passedTests + failedTests,
    passed: passedTests,
    failed: failedTests,
    results
  };

  const reportFilePath = path.join(reportDir, `progress-test-run-${Date.now()}.json`);
  fs.writeFileSync(reportFilePath, JSON.stringify(reportPayload, null, 2), 'utf-8');
  console.log(`\nMachine-readable test report written to: ${reportFilePath}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
