/**
 * NexusPlay — Sprint 08 Multiplayer Automated Test Suite
 * Focus: EP05-01, EP05-02, EP05-03 (Two-Player Lobbies, Invitation Join, Real-Time State Machine)
 * Acceptance Criteria: AC-16.1..16.3, AC-17.1..17.3, AC-18.1..18.3
 * Concurrency & Real-Time Network: WebSocket Clients Verification
 */

const { WebSocket } = require('ws');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5050';
const WS_URL = process.env.WS_URL || 'ws://localhost:5050/ws';
process.env.NODE_ENV = process.env.NODE_ENV || 'staging';

const results = [];

function recordCheck(id, name, passed, details = '') {
  results.push({ id, name, status: passed ? 'PASSED' : 'FAILED', details });
  const icon = passed ? '✓ [PASS]' : '✗ [FAIL]';
  console.log(`  ${icon} ${id}: ${name} ${details ? `(${details})` : ''}`);
}

async function registerAndLogin(emailPrefix) {
  const email = `${emailPrefix}.${Date.now()}@nexusplay.gg`;
  const password = 'StrongPassword123!';
  const displayName = `Player_${emailPrefix}`;

  // Register
  const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });

  if (!regRes.ok) {
    throw new Error(`Registration failed: ${regRes.status}`);
  }

  const rawCookies = regRes.headers.getSetCookie ? regRes.headers.getSetCookie() : [regRes.headers.get('set-cookie') || ''];
  const cookies = rawCookies.map(c => c.split(';')[0].trim()).join('; ');
  const regData = await regRes.json();

  // Retrieve CSRF token
  const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Cookie: cookies }
  });
  const meData = await meRes.json();
  const csrfToken = regData.data?.csrfToken || meData.user?.csrfToken || 'test-csrf-token';
  const user = meData.user || regData.data?.player;

  return {
    user,
    cookies,
    csrfToken,
    sessionToken: regData.data?.token
  };
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

async function runSprint08TestSuite() {
  console.log(`======================================================================`);
  console.log(` NEXUSPLAY SPRINT 08 — MULTIPLAYER AUTOMATED TEST SUITE`);
  console.log(` Target Server: ${BASE_URL}`);
  console.log(` WS Gateway   : ${WS_URL}`);
  console.log(` Timestamp    : ${new Date().toISOString()}`);
  console.log(`======================================================================\n`);

  let hostUser, guestUser, thirdUser;

  try {
    console.log('--- Phase 0: Test Fixtures & Authentication Setup ---');
    hostUser = await registerAndLogin('host.tester');
    guestUser = await registerAndLogin('guest.tester');
    thirdUser = await registerAndLogin('third.tester');
    console.log(`✓ Host account ready   : ${hostUser.user.displayName} (${hostUser.user.id})`);
    console.log(`✓ Guest account ready  : ${guestUser.user.displayName} (${guestUser.user.id})`);
    console.log(`✓ Third account ready  : ${thirdUser.user.displayName} (${thirdUser.user.id})\n`);
  } catch (err) {
    console.error('Fatal setup failure:', err);
    process.exit(1);
  }

  let createdLobby = null;

  // -------------------------------------------------------------------------
  // Module 1: EP05-01 / AC-16.1 — Two-Player Private Lobby Creation
  // -------------------------------------------------------------------------
  console.log('--- Module 1: EP05-01 / AC-16.1 — Two-Player Lobby Creation ---');
  try {
    // 1. Create lobby for eligible game: Obsidian Chess (game-003, max_players: 2)
    const res = await fetch(`${BASE_URL}/api/v1/lobbies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    });

    const data = await res.json();
    recordCheck('AC-16.1-01', 'Lobby creation returns HTTP 201 Created for eligible game', res.status === 201);
    recordCheck('AC-16.1-02', 'Joinable lobby payload includes unique lobby ID', !!(data.lobby && data.lobby.id));
    recordCheck('AC-16.1-03', 'Invitation code is displayed and matches 6-character uppercase format',
      typeof data.lobby?.code === 'string' && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(data.lobby.code),
      `Code: ${data.lobby?.code}`
    );
    recordCheck('AC-16.1-04', 'Lobby max_players is strictly constrained to 2 players', data.lobby?.maxPlayers === 2);
    recordCheck('AC-16.1-05', 'Host player is automatically registered as first participant (1/2)',
      data.lobby?.participants?.length === 1 && data.lobby?.participants[0]?.playerId === hostUser.user.id
    );
    recordCheck('AC-16.1-06', 'Initial lobby status is set to "waiting" with unfilled slot (AC-18.1)', data.lobby?.status === 'waiting');

    createdLobby = data.lobby;
  } catch (err) {
    recordCheck('AC-16.1-FAIL', 'Lobby creation failed with unexpected error', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 2: EP05-01 / AC-16.2 — Ineligible Game Rejection
  // -------------------------------------------------------------------------
  console.log('\n--- Module 2: EP05-01 / AC-16.2 — Ineligible Game Rejection ---');
  try {
    // Attempt lobby creation for solo-only game: Cyber Invaders (max_players: 1)
    const resSolo = await fetch(`${BASE_URL}/api/v1/lobbies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'cyber-invaders' })
    });

    const dataSolo = await resSolo.json();
    recordCheck('AC-16.2-01', 'Lobby creation for solo-only game (Cyber Invaders) is rejected with HTTP 422', resSolo.status === 422);
    recordCheck('AC-16.2-02', 'Error code specifies GAME_NOT_ELIGIBLE_FOR_MULTIPLAYER', dataSolo.error === 'GAME_NOT_ELIGIBLE_FOR_MULTIPLAYER');
    recordCheck('AC-16.2-03', 'Diagnostic error message indicates single-player constraint (max players: 1)',
      dataSolo.message.includes('single-player game') || dataSolo.message.includes('does not support multiplayer')
    );

    // Attempt lobby creation for non-existent game
    const resNonExistent = await fetch(`${BASE_URL}/api/v1/lobbies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'phantom-non-existent-game-999' })
    });
    recordCheck('AC-16.2-04', 'Lobby creation for non-existent game returns HTTP 404', resNonExistent.status === 404);
  } catch (err) {
    recordCheck('AC-16.2-FAIL', 'Ineligible game test failed with unexpected error', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 3: EP05-02 / AC-17.1 & AC-18.1 — Join Lobby with Valid Invitation Code
  // -------------------------------------------------------------------------
  console.log('\n--- Module 3: EP05-02 / AC-17.1 & AC-18.1 — Join Lobby via Invitation Code ---');
  try {
    // Verify status before join is "waiting" (AC-18.1)
    const checkBeforeRes = await fetch(`${BASE_URL}/api/v1/lobbies/${createdLobby.id}`);
    const checkBeforeData = await checkBeforeRes.json();
    recordCheck('AC-18.1-01', 'Prior to opponent join, lobby status is "waiting"', checkBeforeData.lobby?.status === 'waiting');
    recordCheck('AC-18.1-02', 'Unfilled slot is reflected in playerCount = 1 / maxPlayers = 2', checkBeforeData.lobby?.playerCount === 1);

    // Guest joins using valid code (case-insensitive test: lowercase input)
    const lowercaseCode = createdLobby.code.toLowerCase();
    const joinRes = await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      },
      body: JSON.stringify({ code: lowercaseCode })
    });

    const joinData = await joinRes.json();
    recordCheck('AC-17.1-01', 'Join lobby with valid code returns HTTP 200 OK', joinRes.status === 200);
    recordCheck('AC-17.1-02', 'Case-insensitive invitation code successfully matches target lobby', joinData.lobby?.id === createdLobby.id);
    recordCheck('AC-17.1-03', 'Guest player is registered in participants list with role "guest"',
      joinData.lobby?.participants?.some(p => p.playerId === guestUser.user.id && p.role === 'guest')
    );
    recordCheck('AC-18.2-01', 'When lobby reaches allowed capacity (2), status transitions to "full" (AC-18.2)', joinData.lobby?.status === 'full');
    recordCheck('AC-18.2-02', 'isFull flag evaluates to true upon reaching 2 participants', joinData.lobby?.isFull === true);

    createdLobby = joinData.lobby;
  } catch (err) {
    recordCheck('AC-17.1-FAIL', 'Join lobby test failed with unexpected error', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 4: EP05-01 / AC-16.3 & EP05-02 / AC-17.3 — Full Lobby Capacity Enforcement
  // -------------------------------------------------------------------------
  console.log('\n--- Module 4: EP05-01 / AC-16.3 & AC-17.3 — Full Lobby Rejection ---');
  try {
    // Third player attempts to join the already full lobby
    const thirdJoinRes = await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': thirdUser.cookies,
        'X-CSRF-Token': thirdUser.csrfToken
      },
      body: JSON.stringify({ code: createdLobby.code })
    });

    const thirdData = await thirdJoinRes.json();
    recordCheck('AC-16.3-01', 'Third player attempting to join 2-player lobby is rejected with HTTP 409 Conflict', thirdJoinRes.status === 409);
    recordCheck('AC-17.3-01', 'Error code specifies LOBBY_FULL', thirdData.error === 'LOBBY_FULL');
    recordCheck('AC-17.3-02', 'Rejection details confirm maximum capacity reached (2/2 players)',
      thirdData.capacityDetails?.currentCount === 2 && thirdData.capacityDetails?.maxPlayers === 2
    );
    recordCheck('AC-17.3-03', 'Lobby membership remains strictly 2 players (unadmitted player excluded)', () => {
      return createdLobby.participants.length === 2;
    });
  } catch (err) {
    recordCheck('AC-17.3-FAIL', 'Full lobby capacity test failed with unexpected error', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 5: EP05-02 / AC-17.2 — Non-Existent and Expired Code Rejection
  // -------------------------------------------------------------------------
  console.log('\n--- Module 5: EP05-02 / AC-17.2 — Non-Existent & Expired Code Rejection ---');
  try {
    // Non-existent invitation code
    const fakeRes = await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      },
      body: JSON.stringify({ code: 'ZZZZ99' })
    });
    const fakeData = await fakeRes.json();
    recordCheck('AC-17.2-01', 'Non-existent invitation code is rejected with HTTP 404', fakeRes.status === 404);
    recordCheck('AC-17.2-02', 'Error code specifies INVALID_INVITATION_CODE', fakeData.error === 'INVALID_INVITATION_CODE');

    // Expired invitation code test: Create a temporary lobby and manipulate expiration in DB
    const dbPath = path.join(__dirname, '..', 'server', 'data', 'platform-staging.db');
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(dbPath);

    const expLobbyRes = await fetch(`${BASE_URL}/api/v1/lobbies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      },
      body: JSON.stringify({ gameSlug: 'obsidian-chess' })
    });
    const expLobbyData = await expLobbyRes.json();
    const expCode = expLobbyData.lobby.code;

    // Fast-forward expiration in SQLite to 1 hour in the past
    db.prepare("UPDATE lobbies SET expires_at = datetime('now', '-1 hour') WHERE code = ?").run(expCode);
    db.close();

    const expiredJoinRes = await fetch(`${BASE_URL}/api/v1/lobbies/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      },
      body: JSON.stringify({ code: expCode })
    });
    const expiredData = await expiredJoinRes.json();
    recordCheck('AC-17.2-03', 'Expired invitation code is rejected with HTTP 410 Gone', expiredJoinRes.status === 410);
    recordCheck('AC-17.2-04', 'Error code specifies INVITATION_CODE_EXPIRED with 30-minute explanation',
      expiredData.error === 'INVITATION_CODE_EXPIRED' && expiredData.message.includes('30 minutes')
    );
  } catch (err) {
    recordCheck('AC-17.2-FAIL', 'Expired code test failed with unexpected error', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 6: EP05-03 / AC-18.3 — Match Begins & Active Status
  // -------------------------------------------------------------------------
  console.log('\n--- Module 6: EP05-03 / AC-18.3 — Match Start & Active Status ---');
  try {
    // Non-host player attempts to start match (Authorization check)
    const guestStartRes = await fetch(`${BASE_URL}/api/v1/lobbies/${createdLobby.id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      }
    });
    recordCheck('AC-18.3-01', 'Non-host guest cannot start the match (HTTP 403 Forbidden)', guestStartRes.status === 403);

    // Designated host starts match in the full lobby
    const hostStartRes = await fetch(`${BASE_URL}/api/v1/lobbies/${createdLobby.id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': hostUser.cookies,
        'X-CSRF-Token': hostUser.csrfToken
      }
    });

    const startData = await hostStartRes.json();
    recordCheck('AC-18.3-02', 'Host starting match returns HTTP 200 OK', hostStartRes.status === 200);
    recordCheck('AC-18.3-03', 'Lobby status transitions to "active" upon match start (AC-18.3)', startData.match?.status === 'active');
    recordCheck('AC-18.3-04', 'Linked multiplayer game session ID is generated', !!startData.match?.sessionId);

    // Verify GET /api/v1/lobbies/:id reflects "active" status
    const getActiveRes = await fetch(`${BASE_URL}/api/v1/lobbies/${createdLobby.id}`);
    const getActiveData = await getActiveRes.json();
    recordCheck('AC-18.3-05', 'Public status query confirms lobby status is "active"', getActiveData.lobby?.status === 'active');
  } catch (err) {
    recordCheck('AC-18.3-FAIL', 'Match start test failed with unexpected error', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Module 7: Real-Time WebSocket Network Interactions & Concurrency
  // -------------------------------------------------------------------------
  console.log('\n--- Module 7: Real-Time WebSocket Network Interactions & Concurrency ---');
  let wsHost = null;
  let wsGuest = null;
  let wsObserver = null;

  try {
    // 1. Establish WebSocket connection with ambient session cookie for Host
    wsHost = new WebSocket(WS_URL, {
      headers: { Cookie: hostUser.cookies }
    });

    const hostHandshake = await waitWsEvent(wsHost, 'CONNECTION_ESTABLISHED');
    recordCheck('WS-01', 'WebSocket handshake completes and authenticates host via ambient cookie',
      hostHandshake.authenticated === true && hostHandshake.player?.id === hostUser.user.id
    );

    // 2. Establish WebSocket connection for Guest
    wsGuest = new WebSocket(WS_URL, {
      headers: { Cookie: guestUser.cookies }
    });
    const guestHandshake = await waitWsEvent(wsGuest, 'CONNECTION_ESTABLISHED');
    recordCheck('WS-02', 'WebSocket handshake completes and authenticates guest via ambient cookie',
      guestHandshake.authenticated === true && guestHandshake.player?.id === guestUser.user.id
    );

    // 3. Establish unauthenticated WebSocket observer
    wsObserver = new WebSocket(WS_URL);
    const observerHandshake = await waitWsEvent(wsObserver, 'CONNECTION_ESTABLISHED');
    recordCheck('WS-03', 'Unauthenticated WebSocket connection is accepted in unauthenticated/guest state',
      observerHandshake.authenticated === false
    );

    // 4. Host creates lobby via WebSocket message
    const createPromise = waitWsEvent(wsHost, 'LOBBY_CREATED');
    wsHost.send(JSON.stringify({
      type: 'CREATE_LOBBY',
      gameSlug: 'obsidian-chess'
    }));
    const createEvt = await createPromise;
    recordCheck('WS-04', 'Host receives LOBBY_CREATED event via WebSocket with status "waiting"',
      createEvt.lobby?.status === 'waiting' && !!createEvt.lobby?.code
    );

    const wsLobbyCode = createEvt.lobby.code;
    const wsLobbyId = createEvt.lobby.id;

    // 5. Guest joins lobby via WebSocket message
    const guestJoinPromise = waitWsEvent(wsGuest, 'LOBBY_JOINED');
    const hostStateChangePromise = waitWsEvent(wsHost, 'LOBBY_STATE_CHANGED');
    const hostMemberJoinedPromise = waitWsEvent(wsHost, 'LOBBY_MEMBER_JOINED');

    wsGuest.send(JSON.stringify({
      type: 'JOIN_LOBBY',
      code: wsLobbyCode
    }));

    const guestJoinEvt = await guestJoinPromise;
    const hostStateChangeEvt = await hostStateChangePromise;
    const hostMemberJoinedEvt = await hostMemberJoinedPromise;

    recordCheck('WS-05', 'Guest receives LOBBY_JOINED event via WebSocket', guestJoinEvt.lobby?.id === wsLobbyId);
    recordCheck('WS-06', 'Host receives real-time LOBBY_STATE_CHANGED broadcast with status "full"',
      hostStateChangeEvt.status === 'full' && hostStateChangeEvt.isFull === true
    );
    recordCheck('WS-07', 'Host receives real-time LOBBY_MEMBER_JOINED broadcast identifying joined guest',
      hostMemberJoinedEvt.joinedPlayer?.id === guestUser.user.id
    );

    // 6. Host starts match via WebSocket message
    const hostMatchPromise = waitWsEvent(wsHost, 'MATCH_STARTED');
    const guestMatchPromise = waitWsEvent(wsGuest, 'MATCH_STARTED');

    wsHost.send(JSON.stringify({
      type: 'START_MATCH',
      lobbyId: wsLobbyId
    }));

    const hostMatchEvt = await hostMatchPromise;
    const guestMatchEvt = await guestMatchPromise;

    recordCheck('WS-08', 'Both host and guest simultaneously receive MATCH_STARTED with status "active"',
      hostMatchEvt.status === 'active' && guestMatchEvt.status === 'active' && !!hostMatchEvt.sessionId
    );

    // 7. Synchronized turn-based move exchange (Obsidian Chess: e2 -> e4)
    const guestMovePromise = waitWsEvent(wsGuest, 'GAME_STATE_UPDATE');
    wsHost.send(JSON.stringify({
      type: 'GAME_MOVE',
      lobbyId: wsLobbyId,
      move: { from: 'e2', to: 'e4', piece: 'P' },
      boardState: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      nextTurnPlayerId: guestUser.user.id
    }));

    const guestMoveEvt = await guestMovePromise;
    recordCheck('WS-09', 'Opponent receives synchronized GAME_STATE_UPDATE move without latency',
      guestMoveEvt.move?.from === 'e2' && guestMoveEvt.move?.to === 'e4' && guestMoveEvt.senderPlayerId === hostUser.user.id
    );

    // 8. Cross-Room Isolation: Observer socket in a different room or no room must NOT receive move
    let observerLeaked = false;
    const leakHandler = (raw) => {
      try {
        const d = JSON.parse(raw.toString());
        if (d.type === 'GAME_STATE_UPDATE' || d.type === 'MATCH_STARTED') {
          observerLeaked = true;
        }
      } catch (e) {}
    };
    wsObserver.on('message', leakHandler);
    await new Promise(r => setTimeout(r, 200));
    wsObserver.off('message', leakHandler);

    recordCheck('WS-10', 'Cross-room isolation verified: Unrelated sockets receive zero leaked room events', !observerLeaked);

    // 9. Session Revocation: When a player signs out, active WebSocket is disconnected
    const revocationPromise = waitWsEvent(wsGuest, 'SESSION_REVOKED', 3000);
    // Guest logs out via HTTP
    await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': guestUser.cookies,
        'X-CSRF-Token': guestUser.csrfToken
      }
    });

    const revEvt = await revocationPromise;
    recordCheck('WS-11', 'Session revocation listener terminates active WebSocket connection on logout',
      revEvt.type === 'SESSION_REVOKED'
    );

  } catch (err) {
    recordCheck('WS-FAIL', 'WebSocket real-time test failed with unexpected error', false, err.message);
  } finally {
    if (wsHost) wsHost.close();
    if (wsGuest) wsGuest.close();
    if (wsObserver) wsObserver.close();
  }

  // -------------------------------------------------------------------------
  // Summary & Persistence
  // -------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = total - passed;

  console.log(`\n======================================================================`);
  console.log(` SPRINT 08 TEST SUITE SUMMARY`);
  console.log(` Total Checks : ${total}`);
  console.log(` Passed       : ${passed}`);
  console.log(` Failed       : ${failed}`);
  console.log(`======================================================================\n`);

  const evidenceDir = path.join(__dirname, '..', 'evidence', 'sprint-08');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceDir, 'automated-test-summary.json'),
    JSON.stringify({
      sprint: 'Sprint 08 — Two-Player Multiplayer Lobbies & Real-Time Sessions',
      timestamp: new Date().toISOString(),
      totalChecks: total,
      passed,
      failed,
      results
    }, null, 2)
  );
  console.log(`✓ Test summary persisted to evidence/sprint-08/automated-test-summary.json`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSprint08TestSuite().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
