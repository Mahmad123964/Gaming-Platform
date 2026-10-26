/**
 * NexusPlay — Milestone 2.9 Purchase Security, Simulation Lockdown & Pricing Audit Suite
 * 
 * Traceability: Task 5, Task 8
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
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json,
          durationMs: Date.now() - start
        });
      });
    });

    req.on('error', err => reject(err));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function extractAuth(res) {
  const setCookie = res.headers['set-cookie'];
  let cookieHeader = '';
  let sessionToken = '';
  let csrfToken = '';

  if (setCookie) {
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    for (const c of cookies) {
      const sMatch = c.match(/nexusplay_session=([^;]+)/);
      if (sMatch) sessionToken = sMatch[1];
      const cMatch = c.match(/nexusplay_csrf=([^;]+)/);
      if (cMatch) csrfToken = cMatch[1];
    }
  }

  const token = sessionToken || res.json?.data?.token || res.json?.token;
  const user = res.json?.data?.user || res.json?.user || res.json?.data?.player || res.json?.player;
  return {
    token,
    user,
    userId: user?.id,
    cookieHeader,
    csrfToken
  };
}

function authHeaders(auth) {
  const h = {};
  if (auth.token) h['Authorization'] = `Bearer ${auth.token}`;
  if (auth.cookieHeader) h['Cookie'] = auth.cookieHeader;
  if (auth.csrfToken) h['X-CSRF-Token'] = auth.csrfToken;
  return h;
}

async function runSecuritySuite() {
  console.log('================================================================');
  console.log('  NEXUSPLAY — TASK 5 & 8 PURCHASE SECURITY & LOCKDOWN SUITE');
  console.log('  Target Server:', BASE_URL);
  console.log('================================================================\n');

  const ts = Date.now();
  const player1Email = `sec-player1-${ts}@nexusplay.gg`;
  const player2Email = `sec-player2-${ts}@nexusplay.gg`;
  const password = 'Password@123';

  // Register Player 1 (India user)
  const reg1Res = await makeRequest('POST', '/api/v1/auth/register', {}, {
    email: player1Email,
    password,
    displayName: 'SecPlayer India',
    country: 'IN'
  });
  const auth1 = extractAuth(reg1Res);

  // Register Player 2 (Victim user, US)
  const reg2Res = await makeRequest('POST', '/api/v1/auth/register', {}, {
    email: player2Email,
    password,
    displayName: 'SecPlayer US',
    country: 'US'
  });
  const auth2 = extractAuth(reg2Res);

  // Login Admin
  const adminLoginRes = await makeRequest('POST', '/api/v1/auth/login', {}, {
    email: 'admin@nexusplay.gg',
    password: 'Admin#2026!Nexus'
  });
  const adminAuth = extractAuth(adminLoginRes);

  console.log('--- Phase 1: Regional Pricing Authoritative Audit & Reconciliation ---');

  // SEC-PRC-01: India regional price reconciled to INR 149 (14,900 minor units)
  const prcIN = await makeRequest('GET', '/api/v1/pricing/game-004?country=IN');
  logResult('SEC-PRC-01', 'TASK-5.1', 'Authoritative INR price verification',
    prcIN.status === 200 && prcIN.json?.pricing?.currency === 'INR' && prcIN.json?.pricing?.priceMinor === 14900 && prcIN.json?.pricing?.priceDisplay === '₹149',
    `Price=${prcIN.json?.pricing?.priceDisplay} (${prcIN.json?.pricing?.priceMinor} minor)`, prcIN.durationMs);

  // SEC-PRC-02: Pakistan regional price is PKR 250 (25,000 minor units)
  const prcPK = await makeRequest('GET', '/api/v1/pricing/game-004?country=PK');
  logResult('SEC-PRC-02', 'TASK-5.1', 'Authoritative PKR price verification',
    prcPK.status === 200 && prcPK.json?.pricing?.currency === 'PKR' && prcPK.json?.pricing?.priceMinor === 25000,
    `Price=${prcPK.json?.pricing?.priceDisplay} (${prcPK.json?.pricing?.priceMinor} minor)`, prcPK.durationMs);

  // SEC-PRC-03: US regional price is USD 3.99 (399 minor units)
  const prcUS = await makeRequest('GET', '/api/v1/pricing/game-004?country=US');
  logResult('SEC-PRC-03', 'TASK-5.1', 'Authoritative USD price verification',
    prcUS.status === 200 && prcUS.json?.pricing?.currency === 'USD' && prcUS.json?.pricing?.priceMinor === 399,
    `Price=${prcUS.json?.pricing?.priceDisplay} (${prcUS.json?.pricing?.priceMinor} minor)`, prcUS.durationMs);

  // SEC-PRC-04: GB regional price is GBP 2.99 (299 minor units)
  const prcGB = await makeRequest('GET', '/api/v1/pricing/game-004?country=GB');
  logResult('SEC-PRC-04', 'TASK-5.1', 'Authoritative GBP price verification',
    prcGB.status === 200 && prcGB.json?.pricing?.currency === 'GBP' && prcGB.json?.pricing?.priceMinor === 299,
    `Price=${prcGB.json?.pricing?.priceDisplay} (${prcGB.json?.pricing?.priceMinor} minor)`, prcGB.durationMs);

  // SEC-PRC-05: CA regional price is CAD 4.99 (499 minor units)
  const prcCA = await makeRequest('GET', '/api/v1/pricing/game-004?country=CA');
  logResult('SEC-PRC-05', 'TASK-5.1', 'Authoritative CAD price verification',
    prcCA.status === 200 && prcCA.json?.pricing?.currency === 'CAD' && prcCA.json?.pricing?.priceMinor === 499,
    `Price=${prcCA.json?.pricing?.priceDisplay} (${prcCA.json?.pricing?.priceMinor} minor)`, prcCA.durationMs);

  // SEC-PRC-06: EU regional price is EUR 3.49 (349 minor units)
  const prcEU = await makeRequest('GET', '/api/v1/pricing/game-004?country=DE');
  logResult('SEC-PRC-06', 'TASK-5.1', 'Authoritative EUR price verification',
    prcEU.status === 200 && prcEU.json?.pricing?.currency === 'EUR' && prcEU.json?.pricing?.priceMinor === 349,
    `Price=${prcEU.json?.pricing?.priceDisplay} (${prcEU.json?.pricing?.priceMinor} minor)`, prcEU.durationMs);

  console.log('\n--- Phase 2: Production Simulation Lockdown & Conflicting Environment Tests ---');

  // SEC-LOCK-01: Direct production environment lockdown header simulation (HTTP 501)
  const prodSim1 = await makeRequest('POST', '/api/v1/store/purchase', {
    ...authHeaders(auth1),
    'X-Environment': 'production'
  }, {
    gameIdOrSlug: 'game-004',
    countryCode: 'IN',
    currency: 'INR',
    clientPriceMinor: 14900
  });
  logResult('SEC-LOCK-01', 'TASK-5.2', 'Production simulation lock down (HTTP 501)',
    prodSim1.status === 501 && prodSim1.json?.code === 'PAYMENT_GATEWAY_NOT_CONFIGURED',
    `Status=${prodSim1.status}, code=${prodSim1.json?.code}`, prodSim1.durationMs);

  // SEC-LOCK-02: Body-specified environment override to production (HTTP 501)
  const prodSim2 = await makeRequest('POST', '/api/v1/store/purchase', authHeaders(auth1), {
    gameIdOrSlug: 'game-004',
    countryCode: 'IN',
    currency: 'INR',
    clientPriceMinor: 14900,
    env: 'production'
  });
  logResult('SEC-LOCK-02', 'TASK-5.2', 'Body env=production lockdown (HTTP 501)',
    prodSim2.status === 501 && prodSim2.json?.code === 'PAYMENT_GATEWAY_NOT_CONFIGURED',
    `Status=${prodSim2.status}, code=${prodSim2.json?.code}`, prodSim2.durationMs);

  // SEC-LOCK-03: Conflicting environment variables and fail-secure verification (Unit execution in PricingService)
  const path = require('node:path');
  const { DatabaseManager } = require('../server/src/db');
  const stagingDb = new DatabaseManager(path.join(__dirname, '..', 'server', 'data', 'platform-staging.db'));
  const { PricingService } = require('../server/src/modules/pricing/pricingService');
  const pricingService = new PricingService(stagingDb);

  let conflict1Passed = false;
  try {
    const origNodeEnv = process.env.NODE_ENV;
    const origAppEnv = process.env.APP_ENV;
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'development';
    try {
      pricingService.purchaseGame({
        playerId: auth1.userId,
        gameIdOrSlug: 'game-004',
        countryCode: 'IN',
        currency: 'INR',
        clientPriceMinor: 14900
      });
    } catch (err) {
      conflict1Passed = err.status === 501 && err.code === 'PAYMENT_GATEWAY_NOT_CONFIGURED';
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.APP_ENV = origAppEnv;
    }
  } catch (_) {}
  logResult('SEC-LOCK-03', 'TASK-5.2', 'Conflicting env (NODE_ENV=prod, APP_ENV=dev) fail-secure',
    conflict1Passed, 'Strict HTTP 501 lockdown enforced under conflicting production indicator');

  let conflict2Passed = false;
  try {
    const origNodeEnv = process.env.NODE_ENV;
    const origAppEnv = process.env.APP_ENV;
    process.env.NODE_ENV = 'development';
    process.env.APP_ENV = 'production';
    try {
      pricingService.purchaseGame({
        playerId: auth1.userId,
        gameIdOrSlug: 'game-004',
        countryCode: 'IN',
        currency: 'INR',
        clientPriceMinor: 14900
      });
    } catch (err) {
      conflict2Passed = err.status === 501 && err.code === 'PAYMENT_GATEWAY_NOT_CONFIGURED';
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.APP_ENV = origAppEnv;
    }
  } catch (_) {}
  logResult('SEC-LOCK-04', 'TASK-5.2', 'Conflicting env (NODE_ENV=dev, APP_ENV=prod) fail-secure',
    conflict2Passed, 'Strict HTTP 501 lockdown enforced when APP_ENV declares production');

  console.log('\n--- Phase 3: Header Spoofing & Bypass Rejection ---');

  // SEC-LOCK-06: Client attempts to send X-Environment: development when server is production
  let spoofEnvPassed = false;
  try {
    const origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      pricingService.purchaseGame({
        playerId: auth1.userId,
        gameIdOrSlug: 'game-004',
        countryCode: 'IN',
        currency: 'INR',
        clientPriceMinor: 14900,
        envOverride: 'development' // spoofed client header
      });
    } catch (err) {
      spoofEnvPassed = err.status === 501 && err.code === 'PAYMENT_GATEWAY_NOT_CONFIGURED';
    } finally {
      process.env.NODE_ENV = origNodeEnv;
    }
  } catch (_) {}
  logResult('SEC-LOCK-06', 'TASK-5.2', 'Spoofed X-Environment: development cannot bypass production lockdown',
    spoofEnvPassed, 'Client header override strictly disallowed from downgrading production status');

  // SEC-LOCK-07: Spoofed X-Admin-Bypass header cannot launch paid game without entitlement
  const spoofAdminLaunch = await makeRequest('POST', '/api/v1/games/neon-horizon/launch', {
    ...authHeaders(auth1),
    'X-Admin-Bypass': 'true'
  }, {});
  logResult('SEC-LOCK-07', 'TASK-5.2', 'Spoofed X-Admin-Bypass cannot bypass entitlement gate',
    spoofAdminLaunch.status === 403 && (spoofAdminLaunch.json?.code === 'ENTITLEMENT_REQUIRED' || spoofAdminLaunch.json?.error === 'ENTITLEMENT_REQUIRED' || spoofAdminLaunch.json?.message?.includes('Membership Required') || spoofAdminLaunch.json?.error === 'AUTHENTICATION_REQUIRED'),
    `Status=${spoofAdminLaunch.status}, error=${spoofAdminLaunch.json?.error || spoofAdminLaunch.json?.code}`, spoofAdminLaunch.durationMs);

  console.log('\n--- Phase 4: Unauthorized Account Changes & Anti-Tampering ---');

  // SEC-ACCT-01: User 1 passes playerId: auth2.userId in purchase request body -> ownership assigned strictly to User 1
  const spoofBuy = await makeRequest('POST', '/api/v1/store/purchase', authHeaders(auth1), {
    gameIdOrSlug: 'game-004',
    playerId: auth2.userId, // Attacker trying to charge or attribute to victim
    countryCode: 'IN',
    currency: 'INR',
    clientPriceMinor: 14900
  });
  logResult('SEC-ACCT-01', 'TASK-5.3', 'Purchase ignores spoofed body playerId and binds to authenticated session',
    spoofBuy.status === 201 && spoofBuy.json?.entitlement?.gameSlug === 'neon-horizon',
    `Granted entitlement to authenticated user: ${spoofBuy.json?.entitlement?.id}`, spoofBuy.durationMs);

  // Verify player 1 owns it, player 2 does not
  const entMe1 = await makeRequest('GET', '/api/v1/store/entitlements/me', authHeaders(auth1));
  const entMe2 = await makeRequest('GET', '/api/v1/store/entitlements/me', authHeaders(auth2));
  const p1Owns = Boolean(entMe1.json?.entitlements?.some(e => e.game_id === 'game-004' && e.status === 'ACTIVE'));
  const p2Owns = Boolean(entMe2.json?.entitlements?.some(e => e.game_id === 'game-004' && e.status === 'ACTIVE'));
  logResult('SEC-ACCT-01b', 'TASK-5.3', 'Player 1 owns entitlement, Player 2 is unaffected',
    p1Owns && !p2Owns, `P1 owns=${p1Owns}, P2 owns=${p2Owns}`, entMe1.durationMs + entMe2.durationMs);

  // SEC-ACCT-02: User 2 (non-admin) attempts to refund Player 1's entitlement
  const unauthorizedRefund = await makeRequest('POST', '/api/v1/store/refund', authHeaders(auth2), {
    playerId: auth1.userId,
    gameIdOrSlug: 'game-004',
    reason: 'Malicious attempt to revoke victim game'
  });
  logResult('SEC-ACCT-02', 'TASK-5.3', 'Non-admin refunding another player rejected with HTTP 403',
    unauthorizedRefund.status === 403 && unauthorizedRefund.json?.code === 'UNAUTHORIZED_ACCOUNT_CHANGE',
    `Status=${unauthorizedRefund.status}, code=${unauthorizedRefund.json?.code}`, unauthorizedRefund.durationMs);

  // SEC-ACCT-03: Administrator authorized to process legitimate refund
  const adminRefund = await makeRequest('POST', '/api/v1/store/refund', authHeaders(adminAuth), {
    playerId: auth1.userId,
    gameIdOrSlug: 'game-004',
    reason: 'Customer support dispute resolution'
  });
  logResult('SEC-ACCT-03', 'TASK-5.3', 'Administrator authorized to process legitimate refund',
    adminRefund.status === 200 && adminRefund.json?.entitlementStatus === 'REFUNDED',
    `Entitlement status=${adminRefund.json?.entitlementStatus}`, adminRefund.durationMs);

  // SEC-TAMPER-01: Client price tampering (underpaying ₹1 instead of ₹149)
  const tamperPrice = await makeRequest('POST', '/api/v1/store/purchase', authHeaders(auth1), {
    gameIdOrSlug: 'game-004',
    countryCode: 'IN',
    currency: 'INR',
    clientPriceMinor: 100 // Underpayment attempt
  });
  logResult('SEC-TAMPER-01', 'TASK-5.3', 'Client price tampering rejected with HTTP 400',
    tamperPrice.status === 400 && tamperPrice.json?.code === 'PRICE_TAMPERING_DETECTED',
    `Status=${tamperPrice.status}, code=${tamperPrice.json?.code}`, tamperPrice.durationMs);

  // SEC-TAMPER-02: Currency mismatch (submitting USD for India context)
  const mismatchCurrency = await makeRequest('POST', '/api/v1/store/purchase', authHeaders(auth1), {
    gameIdOrSlug: 'game-004',
    countryCode: 'IN',
    currency: 'USD', // Mismatch against INR
    clientPriceMinor: 14900
  });
  logResult('SEC-TAMPER-02', 'TASK-5.3', 'Currency-country mismatch rejected with HTTP 400',
    mismatchCurrency.status === 400 && mismatchCurrency.json?.code === 'CURRENCY_MISMATCH_DETECTED',
    `Status=${mismatchCurrency.status}, code=${mismatchCurrency.json?.code}`, mismatchCurrency.durationMs);

  console.log('\n--- Phase 5: Commercial Model Boundaries (External & Unlicensed Titles) ---');

  // SEC-EXT-01: Direct purchase on external-store game (Subway Surfers) rejected
  const extBuy = await makeRequest('POST', '/api/v1/store/purchase', authHeaders(auth1), {
    gameIdOrSlug: 'subway-surfers',
    countryCode: 'IN',
    currency: 'INR'
  });
  logResult('SEC-EXT-01', 'TASK-4.2', 'Purchase on external store title rejected (HTTP 400)',
    extBuy.status === 400 && extBuy.json?.code === 'EXTERNAL_STORE_ONLY',
    `Status=${extBuy.status}, code=${extBuy.json?.code}`, extBuy.durationMs);

  // SEC-LIC-01: Direct purchase on unlicensed game (Cosmic Odyssey) rejected
  const unlicBuy = await makeRequest('POST', '/api/v1/store/purchase', authHeaders(auth1), {
    gameIdOrSlug: 'cosmic-odyssey',
    countryCode: 'IN',
    currency: 'INR'
  });
  logResult('SEC-LIC-01', 'TASK-4.2', 'Purchase on unlicensed title rejected (HTTP 422)',
    unlicBuy.status === 422 && unlicBuy.json?.code === 'GAME_UNAVAILABLE_PENDING_LICENSE',
    `Status=${unlicBuy.status}, code=${unlicBuy.json?.code}`, unlicBuy.durationMs);

  console.log('\n================================================================');
  console.log(` RESULTS: ${passedCount}/${passedCount + failedCount} CHECKS PASSED`);
  if (failedCount === 0) {
    console.log(' ALL PURCHASE SECURITY, SIMULATION LOCKDOWN & PRICING CHECKS PASSED (100%)');
  } else {
    console.log(` WARNING: ${failedCount} CHECKS FAILED`);
  }
  console.log('================================================================');

  if (failedCount > 0) process.exit(1);
}

runSecuritySuite().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
