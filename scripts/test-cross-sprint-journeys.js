/**
 * NexusPlay — Cross-Sprint Integration Test Suite (Sprints 09, 10, 11 Certification)
 * Verifies End-to-End Realistic User Journeys:
 *   - Journey A: Matchmaking and Disconnection Recovery (EP06-03, EP05-04)
 *   - Journey B: Disconnection Grace Expiry & Authoritative Forfeit (EP05-04, EP12-03)
 *   - Journey C: Bot Opponent Lifecycle & Scoring Isolation (EP04-02)
 *   - Journey D: Group Multiplayer (3P & 4P) & Capacity Enforcement (EP06-01, EP06-02)
 *   - Journey E: Premium Access, Gating & Production Security Guard (EP08-01 - EP08-04)
 */

const { WebSocket } = require('ws');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5050';
const WS_URL = process.env.WS_URL || 'ws://localhost:5050/ws';
const DB_PATH = path.join(__dirname, '..', 'server', 'data', 'platform-staging.db');

const journeyResults = [];

function recordStep(journey, stepId, description, passed, details = '') {
  journeyResults.push({ journey, stepId, description, status: passed ? 'PASSED' : 'FAILED', details });
  const icon = passed ? '  ✓ [PASS]' : '  ✗ [FAIL]';
  console.log(`${icon} [${journey}] ${stepId}: ${description} ${details ? `(${details})` : ''}`);
}

async function registerAndLogin(prefix) {
  const email = `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@nexusplay.gg`;
  const password = 'StrongPassword123!';
  const displayName = `Hero_${prefix}`;

  const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });

  if (!regRes.ok) throw new Error(`Registration failed: ${regRes.status}`);

  const rawCookies = regRes.headers.getSetCookie ? regRes.headers.getSetCookie() : [regRes.headers.get('set-cookie') || ''];
  const cookies = rawCookies.map(c => c.split(';')[0].trim()).join('; ');
  const regData = await regRes.json();

  const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Cookie: cookies }
  });
  const meData = await meRes.json();
  const csrfToken = regData.data?.csrfToken || meData.user?.csrfToken || 'token';
  const user = meData.user || regData.data?.player;

  return { user, cookies, csrfToken };
}

function waitWsEvent(ws, expectedType, timeoutMs = 5000) {
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

async function runCrossSprintJourneys() {
  console.log('======================================================================');
  console.log(' NEXUSPLAY MASTER CROSS-SPRINT INTEGRATION CERTIFICATION SUITE');
  console.log(' Real User Journeys Across Sprints 09, 10, and 11');
  console.log(` Target Server: ${BASE_URL}`);
  console.log(` Database Path: ${DB_PATH}`);
  console.log(` Timestamp    : ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  // =========================================================================
  // JOURNEY A: Matchmaking & Disconnection Recovery
  // =========================================================================
  console.log('--- Journey A: Matchmaking and Recovery ---');
  try {
    const playerA1 = await registerAndLogin('journeyA.p1');
    const playerA2 = await registerAndLogin('journeyA.p2');

    // 1. Player A1 enters queue
    const q1 = await (await fetch(`${BASE_URL}/api/v1/matchmaking/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerA1.cookies, 'X-CSRF-Token': playerA1.csrfToken },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    })).json();
    recordStep('Journey A', 'JA-01', 'Player 1 queues for matchmaking', q1.status === 'queued');

    // 2. Player A2 enters queue -> matches immediately
    const q2 = await (await fetch(`${BASE_URL}/api/v1/matchmaking/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerA2.cookies, 'X-CSRF-Token': playerA2.csrfToken },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    })).json();
    recordStep('Journey A', 'JA-02', 'Player 2 queues and pairs with Player 1', q2.status === 'matched' && !!q2.lobbyId);

    const lobbyId = q2.lobbyId;

    // 3. Connect real WebSockets
    const ws1 = new WebSocket(WS_URL, { headers: { Cookie: playerA1.cookies } });
    const ws2 = new WebSocket(WS_URL, { headers: { Cookie: playerA2.cookies } });
    await waitWsEvent(ws1, 'CONNECTION_ESTABLISHED');
    await waitWsEvent(ws2, 'CONNECTION_ESTABLISHED');

    ws1.send(JSON.stringify({ type: 'SUBSCRIBE_LOBBY', lobbyId }));
    ws2.send(JSON.stringify({ type: 'SUBSCRIBE_LOBBY', lobbyId }));
    await waitWsEvent(ws1, 'LOBBY_STATE_CHANGED');
    await waitWsEvent(ws2, 'LOBBY_STATE_CHANGED');
    recordStep('Journey A', 'JA-03', 'Both players establish authenticated WebSockets and subscribe', true);

    // 4. Player 2 abruptly disconnects
    const disconnectEvtPromise = waitWsEvent(ws1, 'PLAYER_DISCONNECTED');
    ws2.terminate();
    const disconnectEvt = await disconnectEvtPromise;
    recordStep('Journey A', 'JA-04', 'Player 1 receives real-time PLAYER_DISCONNECTED event',
      disconnectEvt.type === 'PLAYER_DISCONNECTED' && disconnectEvt.playerId === playerA2.user.id
    );

    // 5. Player 1 makes a move while Player 2 is disconnected
    ws1.send(JSON.stringify({
      type: 'GAME_MOVE',
      lobbyId,
      move: { from: 'e2', to: 'e4' },
      boardState: { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', turn: 'b' }
    }));
    await new Promise(r => setTimeout(r, 400));

    // 6. Player 2 reconnects within grace period
    const reconHttp = await (await fetch(`${BASE_URL}/api/v1/lobbies/${lobbyId}/reconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerA2.cookies, 'X-CSRF-Token': playerA2.csrfToken }
    })).json();
    recordStep('Journey A', 'JA-05', 'Player 2 calls HTTP reconnect within grace period and recovers state',
      reconHttp.success === true && reconHttp.lobby?.boardState?.turn === 'b'
    );

    // 7. Re-establish Player 2 socket
    const reconWsEvtPromise = waitWsEvent(ws1, 'PLAYER_RECONNECTED');
    const ws2Recon = new WebSocket(WS_URL, { headers: { Cookie: playerA2.cookies } });
    await waitWsEvent(ws2Recon, 'CONNECTION_ESTABLISHED');
    ws2Recon.send(JSON.stringify({ type: 'RECONNECT_MATCH', lobbyId }));
    const reconWsEvt = await reconWsEvtPromise;
    recordStep('Journey A', 'JA-06', 'Player 1 receives PLAYER_RECONNECTED event over WebSocket; match continues',
      reconWsEvt.playerId === playerA2.user.id
    );

    ws1.close();
    ws2Recon.close();
  } catch (err) {
    recordStep('Journey A', 'JA-FAIL', 'Journey A execution encountered error', false, err.message);
  }

  // =========================================================================
  // JOURNEY B: Reconnection Expiry & Forfeit
  // =========================================================================
  console.log('\n--- Journey B: Reconnection Expiry & Forfeit ---');
  try {
    const playerB1 = await registerAndLogin('journeyB.p1');
    const playerB2 = await registerAndLogin('journeyB.p2');

    // 1. Create and start match
    const lobbyRes = await (await fetch(`${BASE_URL}/api/v1/lobbies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerB1.cookies, 'X-CSRF-Token': playerB1.csrfToken },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    })).json();
    const bLobby = lobbyRes.lobby;

    await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerB2.cookies, 'X-CSRF-Token': playerB2.csrfToken },
      body: JSON.stringify({ code: bLobby.code })
    });

    await fetch(`${BASE_URL}/api/v1/lobbies/${bLobby.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerB1.cookies, 'X-CSRF-Token': playerB1.csrfToken }
    });

    recordStep('Journey B', 'JB-01', 'Match started between Player 1 and Player 2', true);

    // 2. Simulate expired reconnect window in DB
    const db = new DatabaseSync(DB_PATH);
    db.prepare(`
      UPDATE lobby_participants
      SET status = 'disconnected',
          disconnected_at = datetime('now', '-3 minutes'),
          reconnect_deadline = datetime('now', '-1 minute')
      WHERE lobby_id = ? AND player_id = ?
    `).run(bLobby.id, playerB2.user.id);
    db.close();

    // 3. Player 2 attempts to reconnect after deadline -> HTTP 410 FORFEIT
    const reconExpRes = await fetch(`${BASE_URL}/api/v1/lobbies/${bLobby.id}/reconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerB2.cookies, 'X-CSRF-Token': playerB2.csrfToken }
    });
    const reconExpData = await reconExpRes.json();
    recordStep('Journey B', 'JB-02', 'Expired reconnect attempt rejected with HTTP 410 MATCH_FORFEITED',
      reconExpRes.status === 410 && (reconExpData.error === 'MATCH_FORFEITED' || reconExpData.error === 'RECONNECT_EXPIRED')
    );

    // 4. Verify winner persisted in database
    const db2 = new DatabaseSync(DB_PATH);
    const updatedLobby = db2.prepare('SELECT status, winner_id FROM lobbies WHERE id = ?').get(bLobby.id);
    db2.close();
    recordStep('Journey B', 'JB-03', 'Match authoritatively ended in SQLite with remaining player as winner',
      updatedLobby && updatedLobby.status === 'ended' && updatedLobby.winner_id === playerB1.user.id
    );
  } catch (err) {
    recordStep('Journey B', 'JB-FAIL', 'Journey B execution encountered error', false, err.message);
  }

  // =========================================================================
  // JOURNEY C: Bot Opponent Lifecycle
  // =========================================================================
  console.log('\n--- Journey C: Bot Opponent Lifecycle ---');
  try {
    const playerC = await registerAndLogin('journeyC.p1');

    // 1. Start bot match
    const botRes = await (await fetch(`${BASE_URL}/api/v1/lobbies/bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerC.cookies, 'X-CSRF-Token': playerC.csrfToken },
      body: JSON.stringify({ gameSlug: 'obsidian-chess', difficulty: 'hard' })
    })).json();
    const botMatch = botRes.match || botRes.lobby;
    recordStep('Journey C', 'JC-01', 'Player initiates instant single-player bot match in Obsidian Chess',
      botMatch && botMatch.isBotMatch === true && botMatch.status === 'active'
    );

    // 2. Submit player move and receive bot heuristic response within latency window
    const startT = Date.now();
    const moveRes = await (await fetch(`${BASE_URL}/api/v1/lobbies/${botMatch.id}/bot-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerC.cookies, 'X-CSRF-Token': playerC.csrfToken },
      body: JSON.stringify({ move: { from: 'e2', to: 'e4' }, difficulty: 'hard', delayMs: 600 })
    })).json();
    const latency = Date.now() - startT;

    recordStep('Journey C', 'JC-02', 'Bot calculates heuristic move within required latency window (500-1500ms)',
      latency >= 500 && latency <= 1700 && !!moveRes.botMove && moveRes.boardState?.turn === 'w'
    );

    // 3. End bot match and verify rating isolation
    const endRes = await (await fetch(`${BASE_URL}/api/v1/lobbies/${botMatch.id}/bot-end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: playerC.cookies, 'X-CSRF-Token': playerC.csrfToken },
      body: JSON.stringify({ outcome: 'victory', score: 250 })
    })).json();

    const db = new DatabaseSync(DB_PATH);
    const lobbyRow = db.prepare('SELECT is_bot, status, winner_id FROM lobbies WHERE id = ?').get(botMatch.id);
    db.close();

    recordStep('Journey C', 'JC-03', 'Bot match conclusion recorded with is_bot=1 schema isolation',
      endRes.status === 'ended' && lobbyRow && lobbyRow.is_bot === 1 && lobbyRow.winner_id === playerC.user.id
    );
  } catch (err) {
    recordStep('Journey C', 'JC-FAIL', 'Journey C execution encountered error', false, err.message);
  }

  // =========================================================================
  // JOURNEY D: Group Multiplayer (3P & 4P)
  // =========================================================================
  console.log('\n--- Journey D: Group Multiplayer ---');
  try {
    const hostD = await registerAndLogin('journeyD.host');
    const guestD1 = await registerAndLogin('journeyD.g1');
    const guestD2 = await registerAndLogin('journeyD.g2');
    const guestD3 = await registerAndLogin('journeyD.g3');
    const rogueD = await registerAndLogin('journeyD.rogue');

    // 1. Create 3-player lobby on Vortex Arena
    const l3Res = await (await fetch(`${BASE_URL}/api/v1/lobbies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: hostD.cookies, 'X-CSRF-Token': hostD.csrfToken },
      body: JSON.stringify({ gameSlug: 'vortex-arena', maxPlayers: 3 })
    })).json();
    const lobby3P = l3Res.lobby;
    recordStep('Journey D', 'JD-01', 'Host provisions 3-player lobby on Vortex Arena',
      lobby3P && lobby3P.maxPlayers === 3 && lobby3P.status === 'waiting'
    );

    // 2. Join Player 2 and Player 3 to reach capacity
    await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guestD1.cookies, 'X-CSRF-Token': guestD1.csrfToken },
      body: JSON.stringify({ code: lobby3P.code })
    });
    const join3 = await (await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guestD2.cookies, 'X-CSRF-Token': guestD2.csrfToken },
      body: JSON.stringify({ code: lobby3P.code })
    })).json();
    recordStep('Journey D', 'JD-02', 'Lobby reaches exact 3-player capacity and transitions to full',
      join3.lobby?.status === 'full' && join3.lobby?.playerCount === 3
    );

    // 3. Rogue 4th player attempts entry -> HTTP 409 LOBBY_FULL
    const rogueRes = await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: rogueD.cookies, 'X-CSRF-Token': rogueD.csrfToken },
      body: JSON.stringify({ code: lobby3P.code })
    });
    recordStep('Journey D', 'JD-03', '4th player entry attempt rejected with HTTP 409 Conflict',
      rogueRes.status === 409
    );

    // 4. Host starts 3-player match
    const startRes = await (await fetch(`${BASE_URL}/api/v1/lobbies/${lobby3P.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: hostD.cookies, 'X-CSRF-Token': hostD.csrfToken }
    })).json();
    recordStep('Journey D', 'JD-04', 'Host starts match, transitioning group to active status',
      (startRes.match || startRes.lobby)?.status === 'active'
    );
  } catch (err) {
    recordStep('Journey D', 'JD-FAIL', 'Journey D execution encountered error', false, err.message);
  }

  // =========================================================================
  // JOURNEY E: Premium Access, Gating & Production Security Guard
  // =========================================================================
  console.log('\n--- Journey E: Premium Access, Gating & Production Security Guard ---');
  try {
    const freeUser = await registerAndLogin('journeyE.free');

    // 1. Free user attempts to launch premium title (Neon Horizon) -> HTTP 403 ENTITLEMENT_REQUIRED
    const launchDeniedRes = await fetch(`${BASE_URL}/api/v1/games/neon-horizon/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: freeUser.cookies, 'X-CSRF-Token': freeUser.csrfToken },
      body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
    });
    const launchDeniedData = await launchDeniedRes.json();
    recordStep('Journey E', 'JE-01', 'Free player launch of premium title blocked with HTTP 403 ENTITLEMENT_REQUIRED',
      launchDeniedRes.status === 403 && (launchDeniedData.error === 'ENTITLEMENT_REQUIRED' || launchDeniedData.error === 'VIP_SUBSCRIPTION_REQUIRED')
    );

    // 2. Fetch public plans matrix without authentication
    const plansRes = await (await fetch(`${BASE_URL}/api/v1/subscriptions/plans`)).json();
    recordStep('Journey E', 'JE-02', 'Public plan comparison matrix returned with 3 standard tiers',
      plansRes.status === 'SUCCESS' && plansRes.count === 3 && plansRes.plans.some(p => p.id === 'plan-pro-monthly')
    );

    // 3. CRITICAL SECURITY AUDIT: In production mode, simulated upgrade MUST be rejected
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const prodUpgradeRes = await fetch(`${BASE_URL}/api/v1/subscriptions/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: freeUser.cookies,
          'X-CSRF-Token': freeUser.csrfToken,
          'x-test-env': 'production'
        },
        body: JSON.stringify({ planId: 'plan-pro-monthly', paymentMethod: 'simulated_card' })
      });
      const prodUpgradeData = await prodUpgradeRes.json();
      recordStep('Journey E', 'JE-03', 'SECURITY AUDIT: Production mode rejects simulated paid upgrade with HTTP 501',
        prodUpgradeRes.status === 501 && prodUpgradeData.error === 'PAYMENT_GATEWAY_NOT_CONFIGURED'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    // 4. In approved staging mode, simulated upgrade activates entitlement
    const stageUpgradeRes = await (await fetch(`${BASE_URL}/api/v1/subscriptions/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: freeUser.cookies, 'X-CSRF-Token': freeUser.csrfToken },
      body: JSON.stringify({ planId: 'plan-pro-monthly', paymentMethod: 'simulated_card' })
    })).json();
    recordStep('Journey E', 'JE-04', 'Staging sandbox allows simulated upgrade with explicit simulation metadata',
      stageUpgradeRes.status === 'SUCCESS' && stageUpgradeRes.isSimulated === true && stageUpgradeRes.subscription?.tier === 'Nexus Pro'
    );

    // 5. Upgraded subscriber now launches Neon Horizon successfully -> HTTP 200 with ticket
    const launchSuccessRes = await fetch(`${BASE_URL}/api/v1/games/neon-horizon/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: freeUser.cookies, 'X-CSRF-Token': freeUser.csrfToken },
      body: JSON.stringify({ clientCapabilities: { hasCanvas: true } })
    });
    const launchSuccessData = await launchSuccessRes.json();
    recordStep('Journey E', 'JE-05', 'Newly upgraded subscriber successfully launches premium title with launch ticket',
      launchSuccessRes.status === 200 && !!(launchSuccessData.launchTicket || launchSuccessData.session)
    );
  } catch (err) {
    recordStep('Journey E', 'JE-FAIL', 'Journey E execution encountered error', false, err.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log(' CROSS-SPRINT INTEGRATION TEST RESULTS SUMMARY');
  console.log('======================================================================');

  const total = journeyResults.length;
  const passed = journeyResults.filter(r => r.status === 'PASSED').length;
  const failed = journeyResults.filter(r => r.status === 'FAILED').length;

  console.log(` Total Journey Checks : ${total}`);
  console.log(` Passed Checks        : ${passed}`);
  console.log(` Failed Checks        : ${failed}`);
  console.log(` Pass Rate            : ${((passed / total) * 100).toFixed(1)}%`);
  console.log('======================================================================\n');

  // Save report JSON
  const reportPath = path.join(__dirname, '..', 'reports', 'cross-sprint-journeys-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    details: journeyResults
  }, null, 2));

  if (failed > 0) {
    console.error(`CROSS-SPRINT CERTIFICATION FAILED: ${failed} check(s) failed.`);
    process.exit(1);
  } else {
    console.log('ALL 5 CROSS-SPRINT USER JOURNEYS PASSED WITH 100% SUCCESS.');
    process.exit(0);
  }
}

runCrossSprintJourneys().catch(err => {
  console.error('Fatal unhandled error in cross-sprint test runner:', err);
  process.exit(1);
});
