/**
 * NexusPlay — 10 Playable Games Catalog Automated Verification Suite
 * 
 * Verifies all 10 genuinely playable games:
 * 1. Cyber Invaders (cyber-invaders)
 * 2. 2048 Classic (2048-classic)
 * 3. Snake Arcade (snake-arcade)
 * 4. Brick Breaker (brick-breaker)
 * 5. Tic-Tac-Toe Pro (tic-tac-toe-pro)
 * 6. Classic Checkers (classic-checkers)
 * 7. Solitaire Royale (solitaire-royale)
 * 8. Neon Racer (neon-racer)
 * 9. Block Puzzle (block-puzzle)
 * 10. Bubble Shooter (bubble-shooter)
 * 
 * Test Scenarios:
 * - Suite 1: Catalog Publication, Metadata & Licensing Clearances (10 checks)
 * - Suite 2: Pre-Flight Launch-Status Eligibility (10 checks)
 * - Suite 3: Cryptographic Launch Ticket Issuance & HMAC Signature (10 checks)
 * - Suite 4: Real-Time Session Progression & Score Mutation (10 checks)
 * - Suite 5: Session In-Flight Restart & Score Zeroing (10 checks)
 * - Suite 6: Security Defense & Gate Integrity (5 checks)
 * Total: 55 Automated Assertions
 */

const http = require('node:http');
const crypto = require('node:crypto');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5050';
const TICKET_SECRET = process.env.LAUNCH_TICKET_SECRET || 'nexusplay-launch-secret-key-2026';

const PLAYABLE_GAMES = [
  { slug: 'cyber-invaders', title: 'Cyber Invaders', genre: 'Arcade', minP: 1, maxP: 1 },
  { slug: '2048-classic', title: '2048 Classic', genre: 'Puzzle', minP: 1, maxP: 1 },
  { slug: 'snake-arcade', title: 'Snake Arcade', genre: 'Arcade', minP: 1, maxP: 1 },
  { slug: 'brick-breaker', title: 'Brick Breaker', genre: 'Arcade', minP: 1, maxP: 1 },
  { slug: 'tic-tac-toe-pro', title: 'Tic-Tac-Toe Pro', genre: 'Card & Board', minP: 1, maxP: 2 },
  { slug: 'classic-checkers', title: 'Classic Checkers', genre: 'Card & Board', minP: 1, maxP: 2 },
  { slug: 'solitaire-royale', title: 'Solitaire Royale', genre: 'Card & Board', minP: 1, maxP: 1 },
  { slug: 'neon-racer', title: 'Neon Racer', genre: 'Arcade', minP: 1, maxP: 1 },
  { slug: 'block-puzzle', title: 'Block Puzzle', genre: 'Puzzle', minP: 1, maxP: 1 },
  { slug: 'bubble-shooter', title: 'Bubble Shooter', genre: 'Puzzle', minP: 1, maxP: 1 }
];

const testResults = [];
let passedCount = 0;
let failedCount = 0;

function logResult(id, ac, name, passed, details = '', durationMs = 0) {
  const status = passed ? '[PASS]' : '[FAIL]';
  if (passed) passedCount++; else failedCount++;
  testResults.push({
    id,
    ac,
    name,
    status: passed ? 'PASS' : 'FAIL',
    details,
    durationMs,
    timestamp: new Date().toISOString()
  });
  console.log(`  ${status} ${id} (${ac}): ${name} -> ${details} (${durationMs}ms)`);
}

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let bodyStr = null;
    if (body) {
      bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = null; }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json,
          durationMs: Date.now() - start
        });
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('  NEXUSPLAY — 10 PLAYABLE GAMES CATALOG AUTOMATED VERIFICATION');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  try {
    // ------------------------------------------------------------------
    // SUITE 1: Catalog Publication, Metadata & Licensing Clearances
    // ------------------------------------------------------------------
    console.log('--- SUITE 1: Catalog Publication, Metadata & Licensing Clearances ---');
    const catalogRes = await makeRequest('GET', '/api/v1/catalog/games?limit=50');
    const allGames = catalogRes.json?.games || catalogRes.json?.data || [];

    for (let i = 0; i < PLAYABLE_GAMES.length; i++) {
      const target = PLAYABLE_GAMES[i];
      const match = allGames.find(g => g.slug === target.slug);
      const testId = `TC-10G-CAT-${String(i + 1).padStart(2, '0')}`;
      
      const passed = match &&
        match.isPublished === true &&
        match.commercialModel === 'FREE' &&
        match.integrationType === 'SELF_HOSTED' &&
        match.actionState === 'PLAY_NOW';

      const details = match 
        ? `Found "${match.title}" | model=${match.commercialModel} | action=${match.actionState} | integration=${match.integrationType}`
        : `Game "${target.slug}" not found in catalog`;

      logResult(testId, 'AC-CAT-10G', `Catalog Check: ${target.title}`, Boolean(passed), details, catalogRes.durationMs);
    }

    // ------------------------------------------------------------------
    // SUITE 2: Pre-Flight Launch-Status Eligibility
    // ------------------------------------------------------------------
    console.log('\n--- SUITE 2: Pre-Flight Launch-Status Eligibility ---');
    for (let i = 0; i < PLAYABLE_GAMES.length; i++) {
      const target = PLAYABLE_GAMES[i];
      const testId = `TC-10G-ST-${String(i + 1).padStart(2, '0')}`;
      const statusRes = await makeRequest('GET', `/api/v1/games/${target.slug}/launch-status`, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      });

      const passed = statusRes.statusCode === 200 &&
        statusRes.json?.eligible === true &&
        statusRes.json?.slug === target.slug;

      const details = `HTTP ${statusRes.statusCode} | eligible=${statusRes.json?.eligible} | isPremium=${statusRes.json?.isPremium}`;
      logResult(testId, 'AC-ELIG-10G', `Pre-Flight Eligibility: ${target.title}`, Boolean(passed), details, statusRes.durationMs);
    }

    // ------------------------------------------------------------------
    // SUITE 3: Cryptographic Launch Ticket Issuance & HMAC Signature
    // ------------------------------------------------------------------
    console.log('\n--- SUITE 3: Cryptographic Launch Ticket Issuance & HMAC Verification ---');
    const sessions = {};

    for (let i = 0; i < PLAYABLE_GAMES.length; i++) {
      const target = PLAYABLE_GAMES[i];
      const testId = `TC-10G-TKT-${String(i + 1).padStart(2, '0')}`;
      const launchRes = await makeRequest('POST', `/api/v1/games/${target.slug}/launch`, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      }, {
        clientCapabilities: { webgl: true, audio: true, touch: false }
      });

      let signatureValid = false;
      const ticket = launchRes.json?.launchTicket;
      if (ticket && ticket.startsWith('ltkt-')) {
        const parts = ticket.slice(5).split('.');
        if (parts.length === 2) {
          try {
            const payloadJson = Buffer.from(parts[0], 'base64url').toString('utf8');
            const expectedSig = crypto.createHmac('sha256', TICKET_SECRET).update(payloadJson).digest('hex');
            signatureValid = (expectedSig === parts[1]);
          } catch (_) {
            signatureValid = false;
          }
        }
      }

      const passed = launchRes.statusCode === 200 &&
        Boolean(launchRes.json?.sessionId) &&
        Boolean(launchRes.json?.launchDestination) &&
        signatureValid;

      if (launchRes.json?.sessionId) {
        sessions[target.slug] = launchRes.json.sessionId;
      }

      const details = `HTTP ${launchRes.statusCode} | session=${launchRes.json?.sessionId} | hmacSignatureValid=${signatureValid}`;
      logResult(testId, 'AC-TKT-10G', `Launch Ticket: ${target.title}`, Boolean(passed), details, launchRes.durationMs);
    }

    // ------------------------------------------------------------------
    // SUITE 4: Real-Time Session Progression & Score Mutation
    // ------------------------------------------------------------------
    console.log('\n--- SUITE 4: Real-Time Session Progression & Score Mutation ---');
    for (let i = 0; i < PLAYABLE_GAMES.length; i++) {
      const target = PLAYABLE_GAMES[i];
      const testId = `TC-10G-PRG-${String(i + 1).padStart(2, '0')}`;
      const sessionId = sessions[target.slug];

      if (!sessionId) {
        logResult(testId, 'AC-PROG-10G', `Session Progress: ${target.title}`, false, 'Missing session ID from launch', 0);
        continue;
      }

      const testScore = (i + 1) * 250;
      const progRes = await makeRequest('POST', `/api/v1/sessions/${sessionId}/progress`, {}, {
        score: testScore,
        state: { level: 2, moves: 14 }
      });

      const passed = progRes.statusCode === 200 &&
        progRes.json?.session?.score === testScore;

      const details = `HTTP ${progRes.statusCode} | scoreMutated=${progRes.json?.session?.score === testScore} (${progRes.json?.session?.score})`;
      logResult(testId, 'AC-PROG-10G', `Session Progress: ${target.title}`, Boolean(passed), details, progRes.durationMs);
    }

    // ------------------------------------------------------------------
    // SUITE 5: Session In-Flight Restart & Score Zeroing
    // ------------------------------------------------------------------
    console.log('\n--- SUITE 5: Session In-Flight Restart & Score Zeroing ---');
    for (let i = 0; i < PLAYABLE_GAMES.length; i++) {
      const target = PLAYABLE_GAMES[i];
      const testId = `TC-10G-RST-${String(i + 1).padStart(2, '0')}`;
      const sessionId = sessions[target.slug];

      if (!sessionId) {
        logResult(testId, 'AC-RST-10G', `Session Restart: ${target.title}`, false, 'Missing session ID from launch', 0);
        continue;
      }

      const rstRes = await makeRequest('POST', `/api/v1/sessions/${sessionId}/restart`, {}, {});

      const passed = rstRes.statusCode === 200 &&
        rstRes.json?.status === 'RESTARTED' &&
        rstRes.json?.session?.score === 0;

      const details = `HTTP ${rstRes.statusCode} | status=${rstRes.json?.status} | resetScore=${rstRes.json?.session?.score}`;
      logResult(testId, 'AC-RST-10G', `Session Restart: ${target.title}`, Boolean(passed), details, rstRes.durationMs);
    }

    // ------------------------------------------------------------------
    // SUITE 6: Security Defense & Anti-Fraud Gates
    // ------------------------------------------------------------------
    console.log('\n--- SUITE 6: Security Defense & Anti-Fraud Gates ---');
    
    // 6.1 Path traversal rejection
    const travRes = await makeRequest('POST', '/api/v1/games/..%2F..%2Fetc%2Fpasswd/launch', {}, {});
    const travPassed = travRes.statusCode === 404 || travRes.statusCode === 400;
    logResult('TC-10G-SEC-01', 'AC-SEC-PATH', 'Rejection of Path Traversal Slug Attack', travPassed,
      `HTTP ${travRes.statusCode} | error=${travRes.json?.error || 'Rejected'}`, travRes.durationMs);

    // 6.2 SQL injection slug attack
    const sqlRes = await makeRequest('POST', `/api/v1/games/cyber-invaders';DROP TABLE games;--/launch`, {}, {});
    const sqlPassed = sqlRes.statusCode === 404 || sqlRes.statusCode === 400;
    logResult('TC-10G-SEC-02', 'AC-SEC-SQLI', 'Rejection of SQL Injection Slug Parameter', sqlPassed,
      `HTTP ${sqlRes.statusCode} | error=${sqlRes.json?.error || 'Rejected'}`, sqlRes.durationMs);

    // 6.3 Non-existent game launch rejection
    const nonExistRes = await makeRequest('POST', '/api/v1/games/unreal-phantom-game-9999/launch', {}, {});
    const nonExistPassed = nonExistRes.statusCode === 404 && nonExistRes.json?.error === 'GAME_NOT_FOUND';
    logResult('TC-10G-SEC-03', 'AC-SEC-404', 'Rejection of Non-Existent Game Launch', nonExistPassed,
      `HTTP ${nonExistRes.statusCode} | error=${nonExistRes.json?.error}`, nonExistRes.durationMs);

    // 6.4 Invalid session mutation rejection
    const fakeProgRes = await makeRequest('POST', '/api/v1/sessions/fake-session-uuid-0000/progress', {}, { score: 999 });
    const fakeProgPassed = fakeProgRes.statusCode === 404;
    logResult('TC-10G-SEC-04', 'AC-SEC-SESS', 'Rejection of Unregistered Session Mutation', fakeProgPassed,
      `HTTP ${fakeProgRes.statusCode} | error=${fakeProgRes.json?.error}`, fakeProgRes.durationMs);

    // 6.5 Paid game entitlement gate defense (neon-horizon remains protected paid title)
    const paidRes = await makeRequest('POST', '/api/v1/games/neon-horizon/launch', {}, {});
    const paidPassed = paidRes.statusCode === 403 && (paidRes.json?.error === 'AUTHENTICATION_REQUIRED' || paidRes.json?.error === 'ENTITLEMENT_REQUIRED');
    logResult('TC-10G-SEC-05', 'AC-SEC-PAID', 'Preservation of Paid Game Entitlement Gate (Neon Horizon)', paidPassed,
      `HTTP ${paidRes.statusCode} | error=${paidRes.json?.error}`, paidRes.durationMs);

    // ------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('  10 PLAYABLE GAMES AUTOMATED VERIFICATION RESULTS SUMMARY');
    console.log('======================================================================');
    console.log(`  Total Executed Checks : ${testResults.length}`);
    console.log(`  Passed Checks         : ${passedCount}`);
    console.log(`  Failed Checks         : ${failedCount}`);
    console.log(`  Pass Rate             : ${((passedCount / testResults.length) * 100).toFixed(1)}%`);
    console.log('======================================================================\n');

    if (failedCount > 0) {
      console.error(`FAILED: ${failedCount} test assertions failed.`);
      process.exit(1);
    } else {
      console.log('SUCCESS: All 10 playable game catalog endpoints verified successfully.');
      process.exit(0);
    }

  } catch (err) {
    console.error('FATAL: Suite execution aborted:', err);
    process.exit(1);
  }
}

runTestSuite();
