/**
 * NexusPlay — Real Game Integration Pilot Automated Verification Suite
 * 
 * Verifies:
 * 1. Cyber Invaders verification (launch ticket, session, runtime access, ticket defense).
 * 2. 2048 Classic verification (catalog metadata, MIT attribution, ticketed launch, static asset delivery, ticket guard).
 * 3. Reusable integration interface (SELF_HOSTED, AUTHORIZED_IFRAME, EXTERNAL_REDIRECT).
 * 4. Partner iframe whitelist defense (allows GameDistribution, rejects untrusted third-party domains).
 * 5. Anti-piracy & licensing clearance gate (unlicensed publication blocked with HTTP 422).
 * 6. Revocation cascade (unpublishing on license loss).
 */

const http = require('node:http');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5050';

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

async function getAdminToken() {
  const res = await makeRequest('POST', '/api/v1/auth/login', {}, {
    email: 'admin@nexusplay.gg',
    password: 'Admin#2026!Nexus'
  });
  const setCookie = res.headers['set-cookie'] ? res.headers['set-cookie'].join('; ') : '';
  const sessionMatch = setCookie.match(/nexusplay_session=([^;]+)/);
  const csrfMatch = setCookie.match(/nexusplay_csrf=([^;]+)/);
  return {
    token: sessionMatch ? sessionMatch[1] : (res.json?.data?.token || res.json?.token),
    csrfToken: csrfMatch ? csrfMatch[1] : (res.json?.data?.csrfToken || ''),
    rawCookie: setCookie
  };
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('  NEXUSPLAY — REAL GAME INTEGRATION PILOT VERIFICATION SUITE');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  try {
    const admin = await getAdminToken();

    // ------------------------------------------------------------------------
    // Part 1: Cyber Invaders Verification
    // ------------------------------------------------------------------------
    console.log('--- [Part 1: Cyber Invaders Baseline Verification] ---');

    let cyberTicket = null;
    let cyberSessionId = null;

    // PILOT-CYBER-01: Launch Cyber Invaders
    {
      const res = await makeRequest('POST', '/api/v1/games/cyber-invaders/launch', {}, {});
      const passed = res.statusCode === 200 &&
                     res.json?.status === 'SUCCESS' &&
                     Boolean(res.json?.launchTicket) &&
                     Boolean(res.json?.sessionId) &&
                     res.json?.game?.slug === 'cyber-invaders';
      if (passed) {
        cyberTicket = res.json.launchTicket;
        cyberSessionId = res.json.sessionId;
      }
      logResult(
        'PILOT-CYBER-01',
        'AC-9.1',
        'Cyber Invaders launches successfully and issues signed ticket',
        passed,
        `HTTP ${res.statusCode}, sessionId=${cyberSessionId}`,
        res.durationMs
      );
    }

    // PILOT-CYBER-02: Access Cyber Invaders runtime with valid ticket
    {
      const res = await makeRequest('GET', `/games/cyber-invaders/index.html?ticket=${cyberTicket}&session=${cyberSessionId}`);
      const passed = res.statusCode === 200;
      logResult(
        'PILOT-CYBER-02',
        'AC-13.1',
        'Cyber Invaders static endpoint serves bundle with valid ticket',
        passed,
        `HTTP ${res.statusCode}, length=${res.body.length}`,
        res.durationMs
      );
    }

    // PILOT-CYBER-03: Security guard: Block Cyber Invaders access without ticket
    {
      const res = await makeRequest('GET', '/games/cyber-invaders/index.html');
      const passed = res.statusCode === 403;
      logResult(
        'PILOT-CYBER-03',
        'SEC-TKT-01',
        'Cyber Invaders blocks access without launch ticket',
        passed,
        `HTTP ${res.statusCode} (403 expected)`,
        res.durationMs
      );
    }

    // ------------------------------------------------------------------------
    // Part 2: 2048 Classic Catalog & Licensing Verification
    // ------------------------------------------------------------------------
    console.log('\n--- [Part 2: 2048 Classic Catalog & Attribution] ---');

    // PILOT-2048-CAT-01: Verify 2048 catalog metadata
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games/2048-classic');
      const g = res.json?.game || res.json;
      const passed = res.statusCode === 200 &&
                     g?.slug === '2048-classic' &&
                     g?.title === '2048 Classic' &&
                     g?.commercialModel === 'FREE' &&
                     g?.isFree === true &&
                     g?.actionState === 'PLAY_NOW' &&
                     g?.integrationType === 'SELF_HOSTED';
      logResult(
        'PILOT-2048-CAT-01',
        'AC-5.1',
        '2048 Classic catalog listing returns valid metadata and SELF_HOSTED type',
        passed,
        `HTTP ${res.statusCode}, title="${g?.title}", integration="${g?.integrationType}"`,
        res.durationMs
      );
    }

    // PILOT-2048-LIC-01: Verify MIT License Notice & Attribution
    {
      const res = await makeRequest('GET', '/games/2048/LICENSE.txt');
      const passed = res.statusCode === 200 &&
                     res.body.includes('MIT License') &&
                     res.body.includes('Gabriele Cirulli') &&
                     res.body.includes('Copyright (c) 2014');
      logResult(
        'PILOT-2048-LIC-01',
        'LEGAL-MIT-01',
        'Official MIT License notice and Gabriele Cirulli attribution verified',
        passed,
        `HTTP ${res.statusCode}, licenseTextConfirmed=${passed}`,
        res.durationMs
      );
    }

    // PILOT-2048-LAUNCH-01: Launch 2048 Classic ticket issuance
    let c2048Ticket = null;
    let c2048SessionId = null;
    {
      const res = await makeRequest('POST', '/api/v1/games/2048-classic/launch', {}, {});
      const passed = res.statusCode === 200 &&
                     res.json?.status === 'SUCCESS' &&
                     Boolean(res.json?.launchTicket) &&
                     Boolean(res.json?.sessionId) &&
                     res.json?.game?.slug === '2048-classic' &&
                     res.json?.game?.integrationType === 'SELF_HOSTED';
      if (passed) {
        c2048Ticket = res.json.launchTicket;
        c2048SessionId = res.json.sessionId;
      }
      logResult(
        'PILOT-2048-LAUNCH-01',
        'AC-9.1',
        '2048 Classic issues cryptographic launch ticket and session',
        passed,
        `HTTP ${res.statusCode}, ticket=${c2048Ticket?.slice(0, 20)}...`,
        res.durationMs
      );
    }

    // PILOT-2048-RUNTIME-01: Access self-hosted 2048 bundle with ticket
    {
      const res = await makeRequest('GET', `/games/2048/index.html?ticket=${c2048Ticket}&session=${c2048SessionId}`);
      const passed = res.statusCode === 200 &&
                     res.body.includes('2048 Classic') &&
                     res.body.includes('id="board"') &&
                     res.body.includes('Gabriele Cirulli') &&
                     res.body.includes('game.js');
      logResult(
        'PILOT-2048-RUNTIME-01',
        'AC-13.1',
        'Self-hosted 2048 HTML serves playable grid, controls, and attribution footer',
        passed,
        `HTTP ${res.statusCode}, HTML verified`,
        res.durationMs
      );
    }

    // PILOT-2048-ASSET-01: Access 2048 CSS stylesheet
    {
      const res = await makeRequest('GET', '/games/2048/style.css');
      const passed = res.statusCode === 200 && res.body.includes('.grid-board');
      logResult(
        'PILOT-2048-ASSET-01',
        'AC-13.1',
        '2048 responsive stylesheet accessible with CSS tokens',
        passed,
        `HTTP ${res.statusCode}, bytes=${res.body.length}`,
        res.durationMs
      );
    }

    // PILOT-2048-ASSET-02: Access 2048 Game Engine script
    {
      const res = await makeRequest('GET', '/games/2048/game.js');
      const passed = res.statusCode === 200 &&
                     res.body.includes('restart2048') &&
                     res.body.includes('move2048');
      logResult(
        'PILOT-2048-ASSET-02',
        'AC-13.1',
        '2048 JavaScript game engine script serves move and restart APIs',
        passed,
        `HTTP ${res.statusCode}, bytes=${res.body.length}`,
        res.durationMs
      );
    }

    // PILOT-2048-SEC-01: Security guard: Block 2048 index.html access without ticket
    {
      const res = await makeRequest('GET', '/games/2048/index.html');
      const passed = res.statusCode === 403;
      logResult(
        'PILOT-2048-SEC-01',
        'SEC-TKT-01',
        '2048 index.html blocks access when ticket parameter is missing',
        passed,
        `HTTP ${res.statusCode} (403 expected)`,
        res.durationMs
      );
    }

    // PILOT-2048-SEC-02: Security guard: Block forged ticket
    {
      const res = await makeRequest('GET', '/games/2048/index.html?ticket=ltkt-invalidpayload.tamperedsignature');
      const passed = res.statusCode === 403;
      logResult(
        'PILOT-2048-SEC-02',
        'SEC-TKT-02',
        '2048 index.html rejects forged or tampered launch tickets',
        passed,
        `HTTP ${res.statusCode} (403 expected)`,
        res.durationMs
      );
    }

    // ------------------------------------------------------------------------
    // Part 3: Reusable Integration Interface & GameDistribution Whitelist
    // ------------------------------------------------------------------------
    console.log('\n--- [Part 3: Reusable Integration Interface & Whitelist Defense] ---');

    const authHeaders = {
      'Authorization': `Bearer ${admin.token}`,
      'Cookie': admin.rawCookie,
      'X-CSRF-Token': admin.csrfToken
    };

    // PILOT-INT-01: Register AUTHORIZED_IFRAME game with approved GameDistribution URL
    let gdGameId = null;
    {
      const slug = `partner-puzzle-gd-${Date.now()}`;
      const res = await makeRequest('POST', '/api/v1/admin/games', authHeaders, {
        title: 'Partner Puzzle Challenge',
        slug,
        description: 'Verified HTML5 puzzle adventure delivered via authorized GameDistribution partner iframe.',
        categoryId: 'cat-puzzle',
        launchUrl: 'https://html5.gamedistribution.com/39a12c4e8b9f0123456789abcdef0123/',
        integrationType: 'AUTHORIZED_IFRAME',
        iframeSandbox: ['allow-scripts', 'allow-same-origin', 'allow-popups', 'allow-forms'],
        allowedIframeHosts: ['html5.gamedistribution.com', 'html5games.com'],
        minPlayers: 1,
        maxPlayers: 1,
        supportsBots: 0
      });
      const g = res.json?.game || res.json;
      const passed = res.statusCode === 201 &&
                     Boolean(g?.id) &&
                     g?.integrationType === 'AUTHORIZED_IFRAME' &&
                     Array.isArray(g?.iframeSandbox) &&
                     Array.isArray(g?.allowedIframeHosts);
      if (passed) gdGameId = g.id;
      logResult(
        'PILOT-INT-01',
        'ARCH-INT-01',
        'Admin registers AUTHORIZED_IFRAME game with approved GameDistribution URL',
        passed,
        `HTTP ${res.statusCode}, id=${gdGameId}, integration=${g?.integrationType}`,
        res.durationMs
      );
    }

    // PILOT-INT-02: Security Negative Test: Arbitrary unapproved external host rejected
    {
      const res = await makeRequest('POST', '/api/v1/admin/games', authHeaders, {
        title: 'Untrusted Shady Game',
        slug: 'untrusted-shady-game',
        description: 'Attempted injection of an unapproved third-party URL into the platform.',
        categoryId: 'cat-arcade',
        launchUrl: 'https://untrusted-piracy-arcade.com/game/index.html',
        integrationType: 'AUTHORIZED_IFRAME',
        minPlayers: 1,
        maxPlayers: 1,
        supportsBots: 0
      });
      const passed = res.statusCode === 400 &&
                     (res.json?.validationErrors?.launchUrl?.includes('not authorized') ||
                      res.json?.error?.includes('Validation') ||
                      res.json?.message?.includes('Validation'));
      logResult(
        'PILOT-INT-02',
        'SEC-URL-01',
        'Arbitrary third-party domain rejected with validation error (Anti-Piracy)',
        passed,
        `HTTP ${res.statusCode}, error="${res.json?.validationErrors?.launchUrl || res.json?.message}"`,
        res.durationMs
      );
    }

    // PILOT-INT-03: Security Negative Test: Disallowed pseudo-protocol rejected
    {
      const res = await makeRequest('POST', '/api/v1/admin/games', authHeaders, {
        title: 'XSS Exploit Attempt',
        slug: 'xss-exploit-attempt',
        description: 'Attempt to inject executable javascript pseudo-protocol as launch URL.',
        categoryId: 'cat-action',
        launchUrl: 'javascript:alert(document.cookie)',
        integrationType: 'SELF_HOSTED',
        minPlayers: 1,
        maxPlayers: 1,
        supportsBots: 0
      });
      const passed = res.statusCode === 400 &&
                     (res.json?.validationErrors?.launchUrl?.includes('Disallowed URL scheme') ||
                      res.json?.validationErrors?.launchUrl?.includes('strictly prohibited'));
      logResult(
        'PILOT-INT-03',
        'SEC-URL-02',
        'Dangerous javascript: pseudo-protocol strictly prohibited',
        passed,
        `HTTP ${res.statusCode}, error="${res.json?.validationErrors?.launchUrl}"`,
        res.durationMs
      );
    }

    // PILOT-INT-04: Security Negative Test: Path traversal rejected
    {
      const res = await makeRequest('POST', '/api/v1/admin/games', authHeaders, {
        title: 'Path Traversal Attempt',
        slug: 'path-traversal-attempt',
        description: 'Attempt to escape directory via path traversal sequence in launch URL.',
        categoryId: 'cat-arcade',
        launchUrl: '/games/../../etc/passwd',
        integrationType: 'SELF_HOSTED',
        minPlayers: 1,
        maxPlayers: 1,
        supportsBots: 0
      });
      const passed = res.statusCode === 400 &&
                     res.json?.validationErrors?.launchUrl?.includes('Path traversal');
      logResult(
        'PILOT-INT-04',
        'SEC-URL-03',
        'Path traversal sequences (/../) strictly rejected',
        passed,
        `HTTP ${res.statusCode}, error="${res.json?.validationErrors?.launchUrl}"`,
        res.durationMs
      );
    }

    // ------------------------------------------------------------------------
    // Part 4: Anti-Piracy Licensing Gates & Revocation Cascade
    // ------------------------------------------------------------------------
    console.log('\n--- [Part 4: Licensing Clearance & Anti-Piracy Gates] ---');

    // PILOT-LIC-01: Publishing blocked when licensing status is pending
    if (gdGameId) {
      const res = await makeRequest('PATCH', `/api/v1/admin/games/${gdGameId}/publish`, authHeaders, {
        isPublished: true
      });
      const passed = res.statusCode === 422 &&
                     (res.json?.code === 'LICENSING_APPROVAL_REQUIRED' ||
                      res.json?.error?.includes('LICENSING') ||
                      res.json?.message?.includes('licensing status'));
      logResult(
        'PILOT-LIC-01',
        'AC-37.2',
        'Publishing unlicensed/pending game blocked with HTTP 422',
        passed,
        `HTTP ${res.statusCode}, code=${res.json?.code || res.json?.error}`,
        res.durationMs
      );
    }

    // PILOT-LIC-02: Approve licensing for GameDistribution title
    if (gdGameId) {
      const res = await makeRequest('PUT', `/api/v1/admin/games/${gdGameId}/licensing`, authHeaders, {
        status: 'approved',
        rightsType: 'PARTNER_DISTRIBUTION_AGREEMENT',
        permittedChannels: ['web_hosted', 'mobile_web'],
        notes: 'Signed Publisher Agreement with GameDistribution (Azerion) verified.'
      });
      const r = res.json?.result || res.json;
      const passed = res.statusCode === 200 && r?.licensingStatus === 'approved';
      logResult(
        'PILOT-LIC-02',
        'AC-37.1',
        'Legal compliance officer approves distribution licensing',
        passed,
        `HTTP ${res.statusCode}, status=${r?.licensingStatus}`,
        res.durationMs
      );
    }

    // PILOT-LIC-03: Publish game after licensing clearance
    if (gdGameId) {
      const res = await makeRequest('PATCH', `/api/v1/admin/games/${gdGameId}/publish`, authHeaders, {
        isPublished: true
      });
      const r = res.json?.result || res.json;
      const passed = res.statusCode === 200 && r?.isPublished === true;
      logResult(
        'PILOT-LIC-03',
        'AC-36.1',
        'Approved title published successfully to public catalog',
        passed,
        `HTTP ${res.statusCode}, isPublished=${r?.isPublished}`,
        res.durationMs
      );
    }

    // PILOT-LIC-04: Launch authorized iframe game generates ticket with integrationType
    if (gdGameId) {
      const res = await makeRequest('POST', `/api/v1/games/${gdGameId}/launch`, {}, {});
      const passed = res.statusCode === 200 &&
                     res.json?.status === 'SUCCESS' &&
                     res.json?.game?.integrationType === 'AUTHORIZED_IFRAME' &&
                     Array.isArray(res.json?.game?.iframeSandbox) &&
                     Array.isArray(res.json?.game?.allowedIframeHosts);
      logResult(
        'PILOT-LIC-04',
        'EP03-01',
        'Authorized iframe game launches with sandboxed integration payload',
        passed,
        `HTTP ${res.statusCode}, type=${res.json?.game?.integrationType}`,
        res.durationMs
      );
    }

    // PILOT-LIC-05: Revocation Cascade: Suspended license immediately cascades to auto-unpublish
    if (gdGameId) {
      const res = await makeRequest('PUT', `/api/v1/admin/games/${gdGameId}/licensing`, authHeaders, {
        status: 'suspended',
        notes: 'Distribution license suspended due to partner audit.'
      });
      const r = res.json?.result || res.json;
      const passed = res.statusCode === 200 &&
                     r?.autoUnpublished === true &&
                     r?.isPublished === false;
      logResult(
        'PILOT-LIC-05',
        'AC-37.3',
        'Suspended license automatically unpublishes game via atomic cascade',
        passed,
        `HTTP ${res.statusCode}, autoUnpublished=${r?.autoUnpublished}`,
        res.durationMs
      );
    }

    // PILOT-LIC-06: Launch strictly denied after revocation
    if (gdGameId) {
      const res = await makeRequest('POST', `/api/v1/games/${gdGameId}/launch`, {}, {});
      const passed = res.statusCode === 403 || res.statusCode === 422;
      logResult(
        'PILOT-LIC-06',
        'AC-12.1',
        'Public launch strictly blocked after license suspension and unpublishing',
        passed,
        `HTTP ${res.statusCode} (403/422 expected)`,
        res.durationMs
      );
    }

  } catch (err) {
    console.error('Fatal suite failure:', err);
    failedCount++;
  }

  console.log('\n======================================================================');
  console.log(`  PILOT RESULTS: ${passedCount}/${passedCount + failedCount} CHECKS PASSED`);
  if (failedCount === 0) {
    console.log('  ALL GAME INTEGRATION PILOT VERIFICATION CHECKS PASSED (100%)');
  } else {
    console.log(`  FAILURES DETECTED: ${failedCount} checks failed`);
  }
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
