/**
 * NexusPlay — Sprint 09 Automated Test Suite
 * Focus:
 *  - EP05-04: Disconnection & Reconnection State Machine (AC-19.1, AC-19.2, AC-19.3)
 *  - EP06-03: Public Matchmaking Queues (AC-22.1, AC-22.2, AC-22.3)
 *  - EP12-03: SRE Matchmaking Error Counters labeled by service & environment (AC-43.1, AC-43.2, AC-43.3)
 *  - EP12-04: Documented Multiplayer Degradation Runbook (AC-44.1, AC-44.2, AC-44.3)
 */

const { WebSocket } = require('ws');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5050';
const WS_URL = process.env.WS_URL || 'ws://localhost:5050/ws';
const dbPath = path.join(__dirname, '..', 'server', 'data', 'platform-staging.db');

const results = [];

function recordCheck(id, name, passed, details = '') {
  results.push({ id, name, status: passed ? 'PASSED' : 'FAILED', details });
  const icon = passed ? '✓ [PASS]' : '✗ [FAIL]';
  console.log(`  ${icon} ${id}: ${name} ${details ? `(${details})` : ''}`);
}

async function registerAndLogin(emailPrefix, isAdmin = false) {
  const email = `${emailPrefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@nexusplay.gg`;
  const password = 'StrongPassword123!';
  const displayName = `Player_${emailPrefix}`;

  const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });

  if (!regRes.ok) {
    throw new Error(`Registration failed for ${email}: ${regRes.status}`);
  }

  const rawCookies = regRes.headers.getSetCookie ? regRes.headers.getSetCookie() : [regRes.headers.get('set-cookie') || ''];
  const cookies = rawCookies.map(c => c.split(';')[0].trim()).join('; ');
  const regData = await regRes.json();

  const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Cookie: cookies }
  });
  const meData = await meRes.json();
  const csrfToken = regData.data?.csrfToken || meData.user?.csrfToken || 'test-csrf-token';
  const user = meData.user || regData.data?.player;

  if (isAdmin) {
    const db = new DatabaseSync(dbPath);
    db.prepare("UPDATE players SET role = 'admin' WHERE id = ?").run(user.id);
    db.close();
  }

  return { user, cookies, csrfToken };
}

function waitWsEvent(ws, expectedType, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Timeout waiting for WS event "${expectedType}" after ${timeoutMs}ms`));
    }, timeoutMs);

    const handler = (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === expectedType) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve(data);
        }
      } catch (e) {}
    };

    ws.on('message', handler);
  });
}

async function runSprint09TestSuite() {
  console.log('======================================================================');
  console.log(' NEXUSPLAY SPRINT 09 — MATCHMAKING & RECOVERY AUTOMATED TEST SUITE');
  console.log(` Target Server: ${BASE_URL}`);
  console.log(` WS Gateway   : ${WS_URL}`);
  console.log(` Timestamp    : ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  let hostUser, guestUser, thirdUser, adminUser;

  try {
    console.log('--- Phase 0: Test Fixtures & Authentication Setup ---');
    hostUser = await registerAndLogin('s9.host');
    guestUser = await registerAndLogin('s9.guest');
    thirdUser = await registerAndLogin('s9.third');
    adminUser = await registerAndLogin('s9.admin', true);
    console.log(`✓ Host account ready   : ${hostUser.user.displayName} (${hostUser.user.id})`);
    console.log(`✓ Guest account ready  : ${guestUser.user.displayName} (${guestUser.user.id})`);
    console.log(`✓ Third account ready  : ${thirdUser.user.displayName} (${thirdUser.user.id})`);
    console.log(`✓ Admin account ready  : ${adminUser.user.displayName} (${adminUser.user.id})\n`);
  } catch (err) {
    console.error('Fatal setup failure:', err);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Module 1: EP05-04 / AC-19.1 — Mid-Match Disconnection Presence & Timeout Grace Period
  // -------------------------------------------------------------------------
  console.log('--- Module 1: EP05-04 / AC-19.1 — Disconnection Presence & 60s Grace Period ---');
  let matchLobby = null;
  let wsHost1 = null;
  let wsGuest1 = null;

  try {
    // 1. Create and start match
    const createRes = await fetch(`${BASE_URL}/api/v1/lobbies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    });
    const createData = await createRes.json();
    matchLobby = createData.lobby;

    await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      },
      body: JSON.stringify({ code: matchLobby.code })
    });

    await fetch(`${BASE_URL}/api/v1/lobbies/${matchLobby.id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      }
    });

    // Connect WebSockets
    wsHost1 = new WebSocket(WS_URL, { headers: { Cookie: hostUser.cookies } });
    wsGuest1 = new WebSocket(WS_URL, { headers: { Cookie: guestUser.cookies } });
    await waitWsEvent(wsHost1, 'CONNECTION_ESTABLISHED');
    await waitWsEvent(wsGuest1, 'CONNECTION_ESTABLISHED');

    // Subscribe both to lobby
    const hostSubPromise = waitWsEvent(wsHost1, 'LOBBY_STATE_CHANGED');
    const guestSubPromise = waitWsEvent(wsGuest1, 'LOBBY_STATE_CHANGED');
    wsHost1.send(JSON.stringify({ type: 'SUBSCRIBE_LOBBY', lobbyId: matchLobby.id }));
    wsGuest1.send(JSON.stringify({ type: 'SUBSCRIBE_LOBBY', lobbyId: matchLobby.id }));
    await hostSubPromise;
    await guestSubPromise;

    // Set up disconnect listener on Host
    const disconnectPromise = waitWsEvent(wsHost1, 'PLAYER_DISCONNECTED', 6000);

    // Abruptly terminate Guest's socket connection
    wsGuest1.terminate();

    const disconnectEvt = await disconnectPromise;
    recordCheck('AC-19.1-01', 'Host receives PLAYER_DISCONNECTED event upon guest socket drop',
      disconnectEvt.type === 'PLAYER_DISCONNECTED' && disconnectEvt.playerId === guestUser.user.id
    );
    recordCheck('AC-19.1-02', 'Disconnect payload includes 60-second grace period specification',
      disconnectEvt.reconnectGraceSeconds === 60 && !!disconnectEvt.reconnectDeadline
    );

    // Verify DB participant status is marked disconnected with deadlines
    const db = new DatabaseSync(dbPath);
    const row = db.prepare('SELECT status, disconnected_at, reconnect_deadline FROM lobby_participants WHERE lobby_id = ? AND player_id = ?').get(matchLobby.id, guestUser.user.id);
    db.close();

    recordCheck('AC-19.1-03', 'Database records participant status as disconnected with reconnect deadline',
      row && row.status === 'disconnected' && !!row.disconnected_at && !!row.reconnect_deadline
    );
  } catch (err) {
    recordCheck('AC-19.1-FAIL', 'Disconnection presence check failed', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 2: EP05-04 / AC-19.2 — Reconnection Within Grace Period & State Sync
  // -------------------------------------------------------------------------
  console.log('\n--- Module 2: EP05-04 / AC-19.2 — Reconnection Within Grace Period & State Resync ---');
  try {
    // 1. Host updates board state while guest is disconnected
    const newBoard = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      lastMove: { from: 'e2', to: 'e4' },
      turn: 'b',
      moveNumber: 1
    };

    wsHost1.send(JSON.stringify({
      type: 'GAME_MOVE',
      lobbyId: matchLobby.id,
      move: newBoard.lastMove,
      boardState: newBoard
    }));

    // Wait 500ms for state to persist
    await new Promise(r => setTimeout(r, 500));

    // Verify host event receives real-time PLAYER_RECONNECTED listener
    const reconnectEvtPromise = waitWsEvent(wsHost1, 'PLAYER_RECONNECTED', 6000);

    // 2. Guest calls HTTP reconnect endpoint within grace period
    const reconRes = await fetch(`${BASE_URL}/api/v1/lobbies/${matchLobby.id}/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      }
    });

    const reconData = await reconRes.json();
    recordCheck('AC-19.2-01', 'Reconnection HTTP endpoint returns 200 OK within grace period', reconRes.status === 200);
    recordCheck('AC-19.2-02', 'Reconnection payload returns restored seat and active board state',
      reconData.success === true &&
      reconData.lobby?.boardState?.turn === 'b' &&
      reconData.lobby?.boardState?.lastMove?.to === 'e4'
    );

    // 3. Connect new WebSocket for guest and send RECONNECT_MATCH
    const wsGuestRecon = new WebSocket(WS_URL, { headers: { Cookie: guestUser.cookies } });
    await waitWsEvent(wsGuestRecon, 'CONNECTION_ESTABLISHED');

    wsGuestRecon.send(JSON.stringify({
      type: 'RECONNECT_MATCH',
      lobbyId: matchLobby.id
    }));

    const reconEvt = await reconnectEvtPromise;
    recordCheck('AC-19.2-03', 'Host receives real-time PLAYER_RECONNECTED event over WebSocket',
      reconEvt.type === 'PLAYER_RECONNECTED' && reconEvt.playerId === guestUser.user.id
    );

    // Clean up sockets
    if (wsHost1) wsHost1.close();
    if (wsGuestRecon) wsGuestRecon.close();
  } catch (err) {
    recordCheck('AC-19.2-FAIL', 'Reconnection within grace period failed', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 3: EP05-04 / AC-19.3 — Forfeit on Timeout Expiration & Reconnection Auth Security
  // -------------------------------------------------------------------------
  console.log('\n--- Module 3: EP05-04 / AC-19.3 — Forfeit on Timeout Expiration & Security ---');
  try {
    // 1. Create a match to test expiration forfeit
    const createRes = await fetch(`${BASE_URL}/api/v1/lobbies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    });
    const forfLobby = (await createRes.json()).lobby;

    await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      },
      body: JSON.stringify({ code: forfLobby.code })
    });

    await fetch(`${BASE_URL}/api/v1/lobbies/${forfLobby.id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      }
    });

    // Mark guest as disconnected with reconnect_deadline in the past
    const db = new DatabaseSync(dbPath);
    db.prepare(`
      UPDATE lobby_participants 
      SET status = 'disconnected', 
          disconnected_at = datetime('now', '-2 minutes'), 
          reconnect_deadline = datetime('now', '-1 minute')
      WHERE lobby_id = ? AND player_id = ?
    `).run(forfLobby.id, guestUser.user.id);
    db.close();

    // Reconnection attempt after deadline should be rejected with 410 Gone / FORFEIT
    const expReconRes = await fetch(`${BASE_URL}/api/v1/lobbies/${forfLobby.id}/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      }
    });

    const expReconData = await expReconRes.json();
    recordCheck('AC-19.3-01', 'Reconnection after grace period expiration is rejected with HTTP 410', expReconRes.status === 410);
    recordCheck('AC-19.3-02', 'Error code specifies MATCH_FORFEITED or RECONNECT_EXPIRED',
      expReconData.error === 'MATCH_FORFEITED' || expReconData.error === 'RECONNECT_EXPIRED'
    );

    // Verify match status transitioned to ended with host as winner
    const db2 = new DatabaseSync(dbPath);
    const lobbyRow = db2.prepare('SELECT status, winner_id FROM lobbies WHERE id = ?').get(forfLobby.id);
    db2.close();
    recordCheck('AC-19.3-03', 'Match automatically records winner as remaining opponent and status as ended',
      lobbyRow && lobbyRow.status === 'ended' && lobbyRow.winner_id === hostUser.user.id
    );

    // Security check: Third unauthorized player attempts to reconnect into the lobby
    const rogueRes = await fetch(`${BASE_URL}/api/v1/lobbies/${forfLobby.id}/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': thirdUser.cookies,
        'X-CSRF-Token': thirdUser.csrfToken
      }
    });
    recordCheck('AC-19.3-04', 'Unauthorized non-participant reconnection is rejected with HTTP 403 Forbidden', rogueRes.status === 403);
  } catch (err) {
    recordCheck('AC-19.3-FAIL', 'Grace period expiration / forfeit check failed', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 4: EP06-03 / AC-22.1 — Public Matchmaking Automatic Pairing
  // -------------------------------------------------------------------------
  console.log('\n--- Module 4: EP06-03 / AC-22.1 — Public Matchmaking Automatic Pairing ---');
  try {
    // 1. Host queues for public matchmaking
    const queueHostRes = await fetch(`${BASE_URL}/api/v1/matchmaking/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    });
    const queueHostData = await queueHostRes.json();
    recordCheck('AC-22.1-01', 'First player queue request succeeds with HTTP 200/201 and queued status',
      queueHostRes.status === 200 && queueHostData.status === 'queued'
    );

    // 2. Guest queues for the same game -> triggers automatic match pairing
    const queueGuestRes = await fetch(`${BASE_URL}/api/v1/matchmaking/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    });
    const queueGuestData = await queueGuestRes.json();
    recordCheck('AC-22.1-02', 'Second player queue request automatically matches into a 2-player lobby',
      queueGuestRes.status === 200 && queueGuestData.status === 'matched'
    );
    recordCheck('AC-22.1-03', 'Match response contains lobbyId, lobbyCode, and opponent details',
      !!queueGuestData.lobbyId && !!queueGuestData.lobbyCode && !!queueGuestData.opponent
    );

    // 3. First player checks status -> should also reflect matched state with the same lobby
    const statusHostRes = await fetch(`${BASE_URL}/api/v1/matchmaking/status`, {
      headers: { Cookie: hostUser.cookies }
    });
    const statusHostData = await statusHostRes.json();
    recordCheck('AC-22.1-04', 'First player status transitions to matched with identical lobby reference',
      statusHostData.status === 'matched' && statusHostData.lobbyId === queueGuestData.lobbyId
    );

    // Verify newly created lobby in DB has is_matchmaking = 1
    const db = new DatabaseSync(dbPath);
    const matchLobbyRow = db.prepare('SELECT is_matchmaking, status, max_players FROM lobbies WHERE id = ?').get(queueGuestData.lobbyId);
    db.close();
    recordCheck('AC-22.1-05', 'Matched lobby has is_matchmaking=1 and 2-player capacity',
      matchLobbyRow && matchLobbyRow.is_matchmaking === 1 && matchLobbyRow.max_players === 2
    );
  } catch (err) {
    recordCheck('AC-22.1-FAIL', 'Matchmaking automatic pairing test failed', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 5: EP06-03 / AC-22.2 — Matchmaking Waiting State & Queue Telemetry
  // -------------------------------------------------------------------------
  console.log('\n--- Module 5: EP06-03 / AC-22.2 — Matchmaking Queue Waiting State ---');
  try {
    // Third player enters matchmaking queue
    const queueRes = await fetch(`${BASE_URL}/api/v1/matchmaking/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': thirdUser.cookies,
        'X-CSRF-Token': thirdUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    });
    const queueData = await queueRes.json();
    recordCheck('AC-22.2-01', 'Solo queue entrant receives status="queued" with position and wait time',
      queueData.status === 'queued' && queueData.position >= 1 && typeof queueData.elapsedSeconds === 'number'
    );

    // Query status directly
    const statusRes = await fetch(`${BASE_URL}/api/v1/matchmaking/status`, {
      headers: { Cookie: thirdUser.cookies }
    });
    const statusData = await statusRes.json();
    recordCheck('AC-22.2-02', 'GET /api/v1/matchmaking/status returns queued state with gameSlug and timestamp',
      statusData.status === 'queued' && statusData.gameSlug === 'obsidian-chess' && !!statusData.queuedAt
    );
  } catch (err) {
    recordCheck('AC-22.2-FAIL', 'Matchmaking waiting state check failed', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 6: EP06-03 / AC-22.3 — Queue Cancellation & Ineligible Games
  // -------------------------------------------------------------------------
  console.log('\n--- Module 6: EP06-03 / AC-22.3 — Queue Cancellation & Game Validation ---');
  try {
    // 1. Third player cancels matchmaking queue
    const cancelRes = await fetch(`${BASE_URL}/api/v1/matchmaking/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': thirdUser.cookies,
        'X-CSRF-Token': thirdUser.csrfToken
      }
    });
    const cancelData = await cancelRes.json();
    recordCheck('AC-22.3-01', 'Matchmaking cancellation succeeds with HTTP 200 OK', cancelRes.status === 200 && cancelData.cancelled === true);

    // 2. Status after cancellation returns not_queued
    const statusAfterCancel = await fetch(`${BASE_URL}/api/v1/matchmaking/status`, {
      headers: { Cookie: thirdUser.cookies }
    });
    const statusCancelData = await statusAfterCancel.json();
    recordCheck('AC-22.3-02', 'Status check after cancellation returns status="not_queued"', statusCancelData.status === 'not_queued');

    // 3. Negative test: Attempt to queue for single-player game (cyber-invaders)
    const badGameRes = await fetch(`${BASE_URL}/api/v1/matchmaking/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': thirdUser.cookies,
        'X-CSRF-Token': thirdUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'cyber-invaders' })
    });
    recordCheck('AC-22.3-03', 'Queuing for single-player-only game is rejected with HTTP 422 Unprocessable Entity', badGameRes.status === 422);

    // 4. Negative test: Attempt to queue for non-existent game
    const nonExistentRes = await fetch(`${BASE_URL}/api/v1/matchmaking/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': thirdUser.cookies,
        'X-CSRF-Token': thirdUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'ghost-nonexistent-game' })
    });
    recordCheck('AC-22.3-04', 'Queuing for non-existent game is rejected with HTTP 404 Not Found', nonExistentRes.status === 404);
  } catch (err) {
    recordCheck('AC-22.3-FAIL', 'Matchmaking cancellation / validation check failed', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 7: EP12-03 / AC-43.1..43.3 — SRE Matchmaking Error Counters with Labels
  // -------------------------------------------------------------------------
  console.log('\n--- Module 7: EP12-03 / AC-43.1..43.3 — SRE Matchmaking Metrics & Labels ---');
  try {
    // 1. Standard player requests metrics -> 403 Forbidden
    const unauthMetricsRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics/matchmaking`, {
      headers: { Cookie: thirdUser.cookies }
    });
    recordCheck('AC-43.3-01', 'Non-admin access to matchmaking SRE metrics endpoint returns HTTP 403 Forbidden', unauthMetricsRes.status === 403);

    // 2. Admin retrieves labeled metrics filtered by service and environment
    const adminMetricsRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics/matchmaking?service=matchmaking&environment=staging`, {
      headers: { Cookie: adminUser.cookies }
    });
    const adminMetricsData = await adminMetricsRes.json();
    recordCheck('AC-43.3-02', 'Admin retrieves matchmaking metrics filtered by service and environment with HTTP 200', adminMetricsRes.status === 200);
    recordCheck('AC-43.1-01', 'Metrics payload contains matchmaking_errors_total with service="matchmaking" and environment="staging"',
      adminMetricsData.service === 'matchmaking' &&
      adminMetricsData.environment === 'staging' &&
      typeof adminMetricsData.metrics?.matchmaking_errors_total === 'number'
    );
    recordCheck('AC-43.2-01', 'Metrics payload records successful pairs in matchmaking_pairs_total',
      typeof adminMetricsData.metrics?.matchmaking_pairs_total === 'number' &&
      adminMetricsData.metrics.matchmaking_pairs_total >= 1
    );
  } catch (err) {
    recordCheck('AC-43-FAIL', 'SRE matchmaking metrics check failed', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 8: EP12-04 / AC-44.1..44.3 — Multiplayer Degradation Runbook Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Module 8: EP12-04 / AC-44.1..44.3 — Multiplayer Degradation Runbook ---');
  try {
    const runbookPath = path.join(__dirname, '..', 'docs', 'runbooks', 'Multiplayer-Degradation-Runbook.md');
    const runbookExists = fs.existsSync(runbookPath);
    recordCheck('AC-44.1-01', 'Multiplayer degradation runbook file exists under docs/runbooks/', runbookExists);

    if (runbookExists) {
      const content = fs.readFileSync(runbookPath, 'utf8');
      
      // AC-44.1: Detection triggers
      const hasTriggers = content.includes('MATCHMAKING_ERROR_RATE_HIGH') &&
                          content.includes('WS_LATENCY_DEGRADED') &&
                          content.includes('DISCONNECT_SURGE');
      recordCheck('AC-44.1-02', 'Runbook contains concrete detection triggers (>5% error rate, >250ms latency, surge)', hasTriggers);

      // AC-44.2: Triage and mitigation procedures
      const hasMitigations = content.includes('Triage Procedures') &&
                             content.includes('Direct-Code Fallback') &&
                             content.includes('Step 1: Check SRE Metrics');
      recordCheck('AC-44.2-01', 'Runbook details step-by-step triage procedures and fallback mode', hasMitigations);

      // AC-44.3: Escalation matrix and rollback link
      const hasEscalation = content.includes('[SRE_MULTIPLAYER_CORE]') &&
                            content.includes('#sre-multiplayer-alerts') &&
                            content.includes('Staging-Deployment-Rollback-Runbook.md');
      recordCheck('AC-44.3-01', 'Runbook defines escalation path to SRE Core with SLAs and rollback runbook reference', hasEscalation);
    }
  } catch (err) {
    recordCheck('AC-44-FAIL', 'Runbook verification failed', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Test Summary
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(' SPRINT 09 AUTOMATED TEST SUITE SUMMARY');
  console.log('======================================================================');

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  console.log(` Total Checks  : ${total}`);
  console.log(` Passed Checks : ${passed}`);
  console.log(` Failed Checks : ${failed}`);
  console.log(` Pass Rate     : ${((passed / total) * 100).toFixed(1)}%`);
  console.log('======================================================================\n');

  if (failed > 0) {
    console.error(`FAILED: ${failed} check(s) did not pass.`);
    process.exit(1);
  } else {
    console.log('SUCCESS: All Sprint 09 automated checks passed flawlessly.');
    process.exit(0);
  }
}

runSprint09TestSuite().catch(err => {
  console.error('Fatal unhandled error in test suite:', err);
  process.exit(1);
});
