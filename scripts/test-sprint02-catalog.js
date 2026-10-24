/**
 * NexusPlay Online Gaming Platform — Sprint 02 Automated Verification Suite
 * Verifies EP02-01, EP02-02, EP02-03, EP02-04, Security Sanitization, and Regressions
 * Criteria: AC-5.1, AC-5.2, AC-5.3, AC-6.1, AC-6.2, AC-6.3, AC-7.1, AC-7.2, AC-7.3, AC-8.1, AC-8.2, AC-8.3
 */

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { createApp } = require('../server/src/app');
const { getDb, DatabaseManager } = require('../server/src/db');
const { GameCatalogService, getCatalogService } = require('../server/src/modules/catalog');

const TEST_PORT = 5098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Test Evidence Ledger
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
  console.log('  NEXUSPLAY SPRINT 02 — GAME DISCOVERY & CATALOG AUTOMATED SUITE');
  console.log('  Target: In-Process HTTP Server with SQLite Catalog Store');
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  // Setup test database & app
  const testDbPath = path.join(__dirname, '..', 'server', 'data', 'platform-test-sprint02.db');
  if (fs.existsSync(testDbPath)) {
    try { fs.unlinkSync(testDbPath); } catch (e) {}
  }

  process.env.NODE_ENV = 'test';
  process.env.INTERNAL_TEST_KEY = crypto.randomBytes(32).toString('hex');
  const db = getDb(testDbPath);
  const catalogService = getCatalogService(db);
  catalogService.ensureSeedData();

  const app = createApp();
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(TEST_PORT, '127.0.0.1', resolve));

  try {
    // ------------------------------------------------------------------------
    // EP02-01: Browse published games (AC-5.1, AC-5.2, AC-5.3)
    // ------------------------------------------------------------------------
    console.log('--- [EP02-01: Browse Published Games] ---');

    // CAT-BRW-01: Browse published games
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games');
      const passed = res.statusCode === 200 &&
                     Array.isArray(res.json?.games) &&
                     res.json.games.length === 8 &&
                     res.json.games.every(g => g.isPublished === true);
      logResult(
        'CAT-BRW-01',
        'AC-5.1',
        'Browse published games returns all published games with required metadata',
        passed,
        `HTTP ${res.statusCode}, count=${res.json?.games?.length}, allPublished=${passed}`,
        res.durationMs
      );
    }

    // CAT-BRW-02: Unpublished games excluded
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games');
      const hasUnpublished = res.json?.games?.some(g => g.slug === 'shadow-protocol' || g.isPublished === false);
      const passed = res.statusCode === 200 && hasUnpublished === false;
      logResult(
        'CAT-BRW-02',
        'AC-5.2',
        'Unpublished game is strictly excluded from catalog browse results',
        passed,
        `hasUnpublished=${hasUnpublished} (draft excluded)`,
        res.durationMs
      );
    }

    // CAT-BRW-03: Empty state when no published games exist
    {
      // Create isolated in-memory DB with 0 games
      const emptyDb = new DatabaseManager(':memory:');
      const emptyService = new GameCatalogService(emptyDb);
      emptyDb.run('DELETE FROM games');
      const emptyResult = emptyService.getPublishedGames();
      const passed = Array.isArray(emptyResult.games) &&
                     emptyResult.games.length === 0 &&
                     emptyResult.pagination.total === 0;
      logResult(
        'CAT-BRW-03',
        'AC-5.3',
        'Empty catalog returns empty array and total=0 for empty-state UI',
        passed,
        `gamesCount=${emptyResult.games.length}, total=${emptyResult.pagination.total}`,
        2
      );
      emptyDb.close();
      // Ensure global catalog service instance points to testDb
      getCatalogService(db);
    }

    // CAT-BRW-04: Pagination limits & boundaries
    {
      const page1 = await makeRequest('GET', '/api/v1/catalog/games?page=1&limit=3');
      const page2 = await makeRequest('GET', '/api/v1/catalog/games?page=2&limit=3');
      const p1Titles = page1.json?.games?.map(g => g.title) || [];
      const p2Titles = page2.json?.games?.map(g => g.title) || [];
      const overlap = p1Titles.some(t => p2Titles.includes(t));
      const passed = page1.statusCode === 200 &&
                     page2.statusCode === 200 &&
                     p1Titles.length === 3 &&
                     p2Titles.length === 3 &&
                     !overlap;
      logResult(
        'CAT-BRW-04',
        'AC-5.1',
        'Pagination boundaries accurately partition games without overlap',
        passed,
        `p1=[${p1Titles.join(', ')}], p2=[${p2Titles.join(', ')}], overlap=${overlap}`,
        page1.durationMs + page2.durationMs
      );
    }

    // CAT-BRW-05: Sorting orders
    {
      const resDesc = await makeRequest('GET', '/api/v1/catalog/games?sort=title:desc');
      const titles = resDesc.json?.games?.map(g => g.title) || [];
      const isSortedDesc = titles.slice(1).every((t, i) => titles[i].localeCompare(t) >= 0);
      logResult(
        'CAT-BRW-05',
        'AC-5.1',
        'Custom sorting (sort=title:desc) sorts games in reverse alphabetical order',
        isSortedDesc,
        `first="${titles[0]}", last="${titles[titles.length - 1]}", isDesc=${isSortedDesc}`,
        resDesc.durationMs
      );
    }

    // ------------------------------------------------------------------------
    // EP02-02: Search games by title (AC-6.1, AC-6.2, AC-6.3)
    // ------------------------------------------------------------------------
    console.log('\n--- [EP02-02: Search Games by Title] ---');

    // CAT-SRC-01: Exact title search
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?q=Cyber%20Invaders');
      const passed = res.statusCode === 200 &&
                     res.json?.games?.length === 1 &&
                     res.json?.games[0]?.title === 'Cyber Invaders';
      logResult(
        'CAT-SRC-01',
        'AC-6.1',
        'Exact title search returns the single matching published game',
        passed,
        `HTTP 200, match="${res.json?.games?.[0]?.title}"`,
        res.durationMs
      );
    }

    // CAT-SRC-02: Partial case-insensitive title search
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?q=grid');
      const passed = res.statusCode === 200 &&
                     res.json?.games?.length === 1 &&
                     res.json?.games[0]?.title === 'Quantum Grid';
      logResult(
        'CAT-SRC-02',
        'AC-6.1',
        'Partial case-insensitive substring search ("grid") matches Quantum Grid',
        passed,
        `match="${res.json?.games?.[0]?.title}"`,
        res.durationMs
      );
    }

    // CAT-SRC-03: Search with no matching results
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?q=NonExistentSuperMario123');
      const passed = res.statusCode === 200 &&
                     Array.isArray(res.json?.games) &&
                     res.json.games.length === 0 &&
                     res.json.pagination.total === 0;
      logResult(
        'CAT-SRC-03',
        'AC-6.2',
        'Search with no matching results returns empty games array (no-results UI state)',
        passed,
        `HTTP ${res.statusCode}, count=${res.json?.games?.length}, total=${res.json?.pagination?.total}`,
        res.durationMs
      );
    }

    // CAT-SRC-04: Searching unpublished game title returns empty
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?q=Shadow');
      const passed = res.statusCode === 200 &&
                     res.json?.games?.length === 0 &&
                     res.json?.pagination?.total === 0;
      logResult(
        'CAT-SRC-04',
        'AC-6.3',
        'Search for unpublished draft game ("Shadow") returns empty results',
        passed,
        `unpublished draft excluded from search results (count=0)`,
        res.durationMs
      );
    }

    // CAT-SRC-05: Whitespace search handling
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?q=%20%20%20');
      const passed = res.statusCode === 200 && res.json?.games?.length === 8;
      logResult(
        'CAT-SRC-05',
        'AC-6.1',
        'Whitespace-only search query is trimmed and returns all published games',
        passed,
        `count=${res.json?.games?.length} (unfiltered published games returned)`,
        res.durationMs
      );
    }

    // CAT-SRC-06: SQL LIKE wildcard injection sanitization
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?q=%25'); // % query
      // If % were treated as LIKE wildcard, it would return all 8 games.
      // Since it is sanitized to literal %, it must return 0 games.
      const passed = res.statusCode === 200 && res.json?.games?.length === 0;
      logResult(
        'CAT-SRC-06',
        'AC-6.1',
        'SQL LIKE wildcard character "%" is safely sanitized and not evaluated as regex',
        passed,
        `count=${res.json?.games?.length} (no wildcard leak)`,
        res.durationMs
      );
    }

    // ------------------------------------------------------------------------
    // EP02-03: Filter games by category (AC-7.1, AC-7.2, AC-7.3)
    // ------------------------------------------------------------------------
    console.log('\n--- [EP02-03: Filter Games by Category] ---');

    // CAT-CAT-01: List categories endpoint
    {
      const res = await makeRequest('GET', '/api/v1/catalog/categories');
      const cats = res.json?.categories || [];
      const passed = res.statusCode === 200 &&
                     cats.length === 6 &&
                     cats.some(c => c.slug === 'strategy' && c.published_game_count === 2) &&
                     cats.some(c => c.slug === 'simulation' && c.published_game_count === 0);
      logResult(
        'CAT-CAT-01',
        'AC-7.1',
        'Categories listing returns all categories with accurate published game counts',
        passed,
        `categoriesCount=${cats.length}, strategyCount=2, simCount=0`,
        res.durationMs
      );
    }

    // CAT-CAT-02: Filter games by category slug
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?category=strategy');
      const games = res.json?.games || [];
      const passed = res.statusCode === 200 &&
                     games.length === 2 &&
                     games.every(g => g.category?.slug === 'strategy');
      logResult(
        'CAT-CAT-02',
        'AC-7.1',
        'Filter by category slug ("strategy") returns only published games in that category',
        passed,
        `count=${games.length}, titles=[${games.map(g => g.title).join(', ')}]`,
        res.durationMs
      );
    }

    // CAT-CAT-03: Filter by category with 0 games
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?category=simulation');
      const passed = res.statusCode === 200 &&
                     res.json?.games?.length === 0 &&
                     res.json?.pagination?.total === 0;
      logResult(
        'CAT-CAT-03',
        'AC-7.2',
        'Filter by category with no published games ("simulation") returns empty list (no-results UI)',
        passed,
        `count=${res.json?.games?.length}, total=${res.json?.pagination?.total}`,
        res.durationMs
      );
    }

    // CAT-CAT-04: Clear category filter (category=all)
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?category=all');
      const passed = res.statusCode === 200 && res.json?.games?.length === 8;
      logResult(
        'CAT-CAT-04',
        'AC-7.3',
        'Clearing category filter (category=all) restores full unfiltered published catalog',
        passed,
        `count=${res.json?.games?.length} (all published games restored)`,
        res.durationMs
      );
    }

    // CAT-CAT-05: Non-existent category filter
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?category=nonexistent-cat-slug');
      const passed = res.statusCode === 200 && res.json?.games?.length === 0;
      logResult(
        'CAT-CAT-05',
        'AC-7.1',
        'Filter by invalid category slug returns empty array cleanly without server error',
        passed,
        `HTTP ${res.statusCode}, count=0`,
        res.durationMs
      );
    }

    // CAT-CAT-06: Combined search and category filter (AND logic)
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?q=arena&category=action');
      const games = res.json?.games || [];
      const passed = res.statusCode === 200 &&
                     games.length === 1 &&
                     games[0]?.title === 'Vortex Arena' &&
                     games[0]?.category?.slug === 'action';
      logResult(
        'CAT-CAT-06',
        'AC-6.1 / AC-7.1',
        'Combined title search and category filter enforces AND logic on both criteria',
        passed,
        `match="${games[0]?.title}" (in category "action")`,
        res.durationMs
      );
    }

    // ------------------------------------------------------------------------
    // EP02-04: View game details (AC-8.1, AC-8.2, AC-8.3)
    // ------------------------------------------------------------------------
    console.log('\n--- [EP02-04: View Game Details] ---');

    // CAT-DET-01: Game details by slug
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games/obsidian-chess');
      const g = res.json?.game;
      const passed = res.statusCode === 200 &&
                     g?.title === 'Obsidian Chess' &&
                     g?.slug === 'obsidian-chess' &&
                     g?.mode?.label === '1–2 Players' &&
                     g?.supportsBots === true &&
                     g?.isPremium === false;
      logResult(
        'CAT-DET-01',
        'AC-8.1',
        'Retrieve game details by slug returns mode, capacity, bot support, and description',
        passed,
        `title="${g?.title}", mode="${g?.mode?.label}", bots=${g?.supportsBots}`,
        res.durationMs
      );
    }

    // CAT-DET-02: Game details by UUID id
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games/game-001');
      const g = res.json?.game;
      const passed = res.statusCode === 200 &&
                     g?.id === 'game-001' &&
                     g?.title === 'Cyber Invaders';
      logResult(
        'CAT-DET-02',
        'AC-8.1',
        'Retrieve game details by database UUID id returns complete game record',
        passed,
        `id="${g?.id}", title="${g?.title}"`,
        res.durationMs
      );
    }

    // CAT-DET-03: Premium game access requirements
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games/neon-horizon');
      const g = res.json?.game;
      const passed = res.statusCode === 200 &&
                     g?.isPremium === true &&
                     g?.access?.tier === 'premium' &&
                     g?.access?.requiresSubscription === true &&
                     g?.access?.label === 'Obsidian VIP Required';
      logResult(
        'CAT-DET-03',
        'AC-8.2',
        'Premium game details clearly display VIP subscription access requirement before launch',
        passed,
        `isPremium=${g?.isPremium}, accessLabel="${g?.access?.label}"`,
        res.durationMs
      );
    }

    // CAT-DET-04: Free game access requirements
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games/quantum-grid');
      const g = res.json?.game;
      const passed = res.statusCode === 200 &&
                     g?.isPremium === false &&
                     g?.access?.tier === 'free' &&
                     g?.access?.label === 'Free to Play';
      logResult(
        'CAT-DET-04',
        'AC-8.2',
        'Free game details clearly display Free to Play access status',
        passed,
        `isPremium=${g?.isPremium}, accessLabel="${g?.access?.label}"`,
        res.durationMs
      );
    }

    // CAT-DET-05: Direct lookup on unpublished game returns HTTP 404
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games/shadow-protocol');
      const passed = res.statusCode === 404 && res.json?.error === 'Not Found';
      logResult(
        'CAT-DET-05',
        'AC-8.3',
        'Direct lookup of unpublished game ("shadow-protocol") returns HTTP 404 (unavailable state)',
        passed,
        `HTTP ${res.statusCode} (${res.json?.message})`,
        res.durationMs
      );
    }

    // CAT-DET-06: Direct lookup of non-existent game returns HTTP 404
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games/totally-fake-game-id-999');
      const passed = res.statusCode === 404 && res.json?.error === 'Not Found';
      logResult(
        'CAT-DET-06',
        'AC-8.3',
        'Direct lookup of non-existent game returns HTTP 404 Not Found',
        passed,
        `HTTP ${res.statusCode} (${res.json?.message})`,
        res.durationMs
      );
    }

    // ------------------------------------------------------------------------
    // Security & Parameter Boundary Tests
    // ------------------------------------------------------------------------
    console.log('\n--- [Security & Parameter Boundary Tests] ---');

    // CAT-SEC-01: SQL injection resilience in search
    {
      const res = await makeRequest('GET', "/api/v1/catalog/games?q=' OR '1'='1");
      const passed = res.statusCode === 200 && res.json?.games?.length === 0;
      logResult(
        'CAT-SEC-01',
        'AC-6.1',
        'SQL injection vector in search query is safely parameterized (returns 0 games)',
        passed,
        `count=${res.json?.games?.length} (no injection leak)`,
        res.durationMs
      );
    }

    // CAT-SEC-02: Extremely long search query
    {
      const longQuery = 'A'.repeat(1500);
      const res = await makeRequest('GET', `/api/v1/catalog/games?q=${longQuery}`);
      const passed = res.statusCode === 200 && res.json?.games?.length === 0;
      logResult(
        'CAT-SEC-02',
        'AC-6.1',
        'Extremely long search query (1500 chars) handled safely without buffer overflow',
        passed,
        `HTTP ${res.statusCode}, count=0`,
        res.durationMs
      );
    }

    // CAT-SEC-03: Boundary pagination parameters
    {
      const res = await makeRequest('GET', '/api/v1/catalog/games?page=-5&limit=9999');
      const passed = res.statusCode === 200 &&
                     res.json?.pagination?.page === 1 &&
                     res.json?.pagination?.limit === 50;
      logResult(
        'CAT-SEC-03',
        'AC-5.1',
        'Invalid pagination parameters safely clamped (page clamped to 1, limit clamped to 50)',
        passed,
        `clampedPage=${res.json?.pagination?.page}, clampedLimit=${res.json?.pagination?.limit}`,
        res.durationMs
      );
    }

    // ------------------------------------------------------------------------
    // Sprint 01 Authentication & Security Regressions
    // ------------------------------------------------------------------------
    console.log('\n--- [Sprint 01 Authentication Regressions] ---');

    let sessionCookie = '';
    let csrfToken = '';

    // CAT-REG-01: Registration regression
    {
      const regEmail = `player-cat-reg-${Date.now()}@nexusplay.gg`;
      const res = await makeRequest('POST', '/api/v1/auth/register', {}, {
        email: regEmail,
        password: 'Password123!',
        displayName: 'CatalogTester'
      });
      const cookieHeader = res.headers['set-cookie'];
      const user = res.json?.data?.user || res.json?.user;
      const passed = res.statusCode === 201 && user?.email === regEmail;
      logResult(
        'CAT-REG-01',
        'AC-1.1',
        'Sprint 01 Regression: Player registration endpoint remains operational',
        passed,
        `HTTP ${res.statusCode}, user="${user?.displayName}"`,
        res.durationMs
      );

      // Extract cookies for subsequent checks
      if (cookieHeader) {
        sessionCookie = cookieHeader.find(c => c.includes('nexusplay_session')) || '';
        const csrfMatch = (cookieHeader.find(c => c.includes('nexusplay_csrf')) || '').match(/nexusplay_csrf=([^;]+)/);
        if (csrfMatch) csrfToken = csrfMatch[1];
      }
    }

    // CAT-REG-02: Login regression
    {
      const res = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: 'cat-nonexistent@nexusplay.gg',
        password: 'Password123!'
      });
      const passed = res.statusCode === 401 && res.json?.error === 'Unauthorized';
      logResult(
        'CAT-REG-02',
        'AC-2.1',
        'Sprint 01 Regression: Player authentication endpoint verifies credentials properly',
        passed,
        `HTTP 401 on invalid credentials`,
        res.durationMs
      );
    }

    // CAT-REG-03: Protected /auth/me regression
    {
      const cleanCookie = sessionCookie.split(';')[0];
      const res = await makeRequest('GET', '/api/v1/auth/me', {
        Cookie: cleanCookie
      });
      const passed = res.statusCode === 200 && res.json?.user?.displayName === 'CatalogTester';
      logResult(
        'CAT-REG-03',
        'AC-2.1',
        'Sprint 01 Regression: Protected /api/v1/auth/me verifies HttpOnly session cookie',
        passed,
        `HTTP 200, user="${res.json?.user?.displayName}"`,
        res.durationMs
      );
    }

    // CAT-REG-04: CSRF validation regression
    {
      const cleanCookie = sessionCookie.split(';')[0];
      // Logout without X-CSRF-Token must be rejected
      const res = await makeRequest('POST', '/api/v1/auth/logout', {
        Cookie: cleanCookie
      });
      const passed = res.statusCode === 403 && res.json?.error === 'Forbidden';
      logResult(
        'CAT-REG-04',
        'AC-2.2',
        'Sprint 01 Regression: State-changing logout rejects requests missing X-CSRF-Token',
        passed,
        `HTTP 403 (${res.json?.message})`,
        res.durationMs
      );
    }

    // CAT-REG-05: Outbox production isolation regression
    {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const res = await makeRequest('GET', '/api/v1/auth/test/outbox');
      process.env.NODE_ENV = originalEnv;
      const passed = res.statusCode === 404 && res.json?.error === 'Not Found';
      logResult(
        'CAT-REG-05',
        'AC-3.1',
        'Sprint 01 Regression: Recovery outbox endpoint permanently returns 404 in production',
        passed,
        `HTTP 404 in production environment`,
        res.durationMs
      );
    }

  } finally {
    server.close();
  }

  console.log('\n======================================================================');
  console.log('  SPRINT 02 CATALOG & DISCOVERY TEST RESULTS SUMMARY');
  console.log(`  Total Executed Tests: ${testResults.length}`);
  console.log(`  Passed              : ${passedCount}`);
  console.log(`  Failed              : ${failedCount}`);
  console.log(`  Overall Status      : ${failedCount === 0 ? 'ALL TESTS PASSED (100% SUCCESS)' : 'FAILURES DETECTED'}`);
  console.log('======================================================================\n');

  // Save evidence
  const evidenceDir = path.join(__dirname, '..', 'evidence', 'sprint-02', 'test-results');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const evidenceFile = path.join(evidenceDir, `sprint-02-catalog-test-results-${timestampStr}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify({
    suite: 'Sprint 02 Game Discovery & Catalog Automated Suite',
    sprint: '02',
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    passed: passedCount,
    failed: failedCount,
    successRate: `${Math.round((passedCount / testResults.length) * 100)}%`,
    tests: testResults
  }, null, 2));

  console.log(`Test evidence JSON saved: ${evidenceFile}\n`);
  return failedCount === 0;
}

runTestSuite()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal test runner execution failure:', err);
    process.exit(1);
  });
