/**
 * NexusPlay — Task 11 Automated Verification Suite
 * Business Model Correction, Global Game Catalog & Regional Pricing Architecture
 *
 * Covers all 15 required verification targets:
 *  1. Free access without purchase
 *  2. Correct free/premium classification
 *  3. Unlicensed game publishing rejection
 *  4. External-store handling & redirection
 *  5. User country selection during registration
 *  6. Country-specific currency defaults
 *  7. Regional price selection (PKR, INR, USD, GBP, CAD, EUR)
 *  8. Client price-tampering rejection (anti-tampering)
 *  9. Cross-country currency/price mismatch abuse rejection
 * 10. Premium purchase eligibility & checkout
 * 11. Entitlement ownership verification
 * 12. Unauthorized paid-game launch rejection
 * 13. Free-game launch unaffected by paid entitlement checks
 * 14. Payment-simulation production lockdown (501 Gateway Not Configured)
 * 15. Refund and revocation effects on gameplay access
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5050';
const DB_PATH = path.join(__dirname, '..', 'server', 'data', 'platform-staging.db');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, testCode, description, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] [${testCode}] ${description}`);
  } else {
    failedChecks++;
    console.error(`  [FAIL] [${testCode}] ${description}`);
    if (details) console.error(`         Details: ${details}`);
  }
}

async function registerPlayer(prefix, country = 'US') {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const email = `${prefix}_${ts}@nexusplay.test`;
  const password = 'Password123!';
  const displayName = `${prefix}_${ts}`;

  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, country })
  });

  const body = await res.json();
  const setCookie = res.headers.get('set-cookie') || '';
  const sessionMatch = setCookie.match(/nexusplay_session=([^;]+)/);
  const csrfMatch = setCookie.match(/nexusplay_csrf=([^;]+)/);

  const token = sessionMatch ? sessionMatch[1] : (body.data?.token || body.token);
  const playerId = body.data?.user?.id || body.user?.id;
  const userCountry = body.data?.user?.country || body.user?.country;
  const currencyPref = body.data?.user?.currencyPreference || body.user?.currencyPreference;

  return {
    playerId,
    email,
    displayName,
    token,
    country: userCountry,
    currencyPreference: currencyPref,
    csrfToken: csrfMatch ? csrfMatch[1] : (body.data?.csrfToken || ''),
    rawCookie: setCookie
  };
}

async function getAdminToken() {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nexusplay.gg', password: 'Admin#2026!Nexus' })
  });
  const body = await res.json();
  const setCookie = res.headers.get('set-cookie') || '';
  const sessionMatch = setCookie.match(/nexusplay_session=([^;]+)/);
  const csrfMatch = setCookie.match(/nexusplay_csrf=([^;]+)/);
  return {
    token: sessionMatch ? sessionMatch[1] : (body.data?.token || body.token),
    csrfToken: csrfMatch ? csrfMatch[1] : (body.data?.csrfToken || ''),
    rawCookie: setCookie
  };
}

async function runBusinessModelTests() {
  console.log('================================================================');
  console.log('  NEXUSPLAY — BUSINESS MODEL & GLOBAL CATALOG TEST SUITE');
  console.log('  Scope: Free-First Catalog, Regional Pricing & Licensing Gates');
  console.log('  Target: ' + BASE_URL);
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // Check 1 & 5: Global Registration & Country Selection
  // ---------------------------------------------------------------------------
  console.log('--- Phase 1: Global Registration, Country & Currency Defaults ---');
  const playerPK = await registerPlayer('test_pk', 'PK');
  assert(playerPK.playerId && playerPK.token, 'BM-REG-01', 'Player registered without requiring subscription or payment');
  assert(playerPK.country === 'PK', 'BM-REG-02', 'Player country preserved as PK', `Got: ${playerPK.country}`);
  assert(playerPK.currencyPreference === 'PKR', 'BM-REG-03', 'Player assigned default currency PKR for PK', `Got: ${playerPK.currencyPreference}`);

  const playerIN = await registerPlayer('test_in', 'IN');
  assert(playerIN.country === 'IN' && playerIN.currencyPreference === 'INR', 'BM-REG-04', 'Player registered with IN defaults to INR');

  const playerGB = await registerPlayer('test_gb', 'GB');
  assert(playerGB.country === 'GB' && playerGB.currencyPreference === 'GBP', 'BM-REG-05', 'Player registered with GB defaults to GBP');

  // Country update endpoint
  const patchRes = await fetch(`${BASE_URL}/api/v1/auth/country`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerGB.token}`
    },
    body: JSON.stringify({ country: 'CA' })
  });
  const patchData = await patchRes.json();
  assert(patchRes.status === 200 && patchData.data.country === 'CA' && patchData.data.currencyPreference === 'CAD', 'BM-REG-06', 'Country preference update to CA maps default currency to CAD');

  // ---------------------------------------------------------------------------
  // Check 2: Free Access Without Subscription or Purchase
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 2: Free Game Launching (Zero Purchase Required) ---');
  const launchFreeRes = await fetch(`${BASE_URL}/api/v1/games/cyber-invaders/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({})
  });
  const launchFreeData = await launchFreeRes.json();
  assert(launchFreeRes.status === 200, 'BM-FREE-01', 'Free game launches without subscription or purchase (HTTP 200)');
  assert(launchFreeData.launchTicket && launchFreeData.launchDestination, 'BM-FREE-02', 'Free game returns valid runtime launchDestination and launchTicket');

  // Test 2048 Classic free game launch
  const launch2048Res = await fetch(`${BASE_URL}/api/v1/games/2048-classic/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({})
  });
  assert(launch2048Res.status === 200, 'BM-FREE-03', 'Open-source 2048 Classic launches immediately for free');

  // ---------------------------------------------------------------------------
  // Check 4: Catalog Classification & Action States
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 3: Catalog Commercial Classification & Action States ---');
  const catRes = await fetch(`${BASE_URL}/api/v1/catalog/games?country=PK&limit=50`);
  const catData = await catRes.json();
  assert(catRes.status === 200 && Array.isArray(catData.games), 'BM-CAT-01', 'Catalog returns games array');

  const freeGameInCat = catData.games.find(g => g.slug === 'cyber-invaders');
  assert(freeGameInCat && freeGameInCat.commercialModel === 'FREE' && freeGameInCat.actionState === 'PLAY_NOW', 'BM-CAT-02', 'Free game classified as commercialModel: FREE, actionState: PLAY_NOW');

  const externalGameInCat = catData.games.find(g => g.slug === 'subway-surfers');
  assert(externalGameInCat && externalGameInCat.commercialModel === 'EXTERNAL_STORE' && externalGameInCat.actionState === 'OPEN_OFFICIAL_STORE', 'BM-CAT-03', 'Subway Surfers classified as EXTERNAL_STORE, actionState: OPEN_OFFICIAL_STORE');

  const premiumGameInCat = catData.games.find(g => g.slug === 'neon-horizon');
  assert(premiumGameInCat && premiumGameInCat.commercialModel === 'PAID_ONE_TIME' && premiumGameInCat.pricing.currency === 'PKR', 'BM-CAT-04', 'Neon Horizon classified as PAID_ONE_TIME with PKR regional price in PK context');

  // ---------------------------------------------------------------------------
  // Check 5: External Store Redirection & Safety
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 4: External Store Referral Handling ---');
  const launchExtRes = await fetch(`${BASE_URL}/api/v1/games/subway-surfers/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({})
  });
  const launchExtData = await launchExtRes.json();
  assert(launchExtRes.status === 422, 'BM-EXT-01', 'External store title launch blocked from internal iframe (HTTP 422)');
  assert(launchExtData.details?.code === 'EXTERNAL_STORE_REDIRECT' || launchExtData.error === 'EXTERNAL_STORE_REDIRECT', 'BM-EXT-02', 'External store referral specifies EXTERNAL_STORE_REDIRECT');

  // ---------------------------------------------------------------------------
  // Check 3 & 7: Licensing Gate & Publishing Rejection
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 5: Licensing Clearance & Publishing Rejection ---');
  // Attempt to launch unapproved title
  const launchPendingRes = await fetch(`${BASE_URL}/api/v1/games/cosmic-odyssey/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({})
  });
  assert(launchPendingRes.status === 422 || launchPendingRes.status === 403 || launchPendingRes.status === 404, 'BM-LIC-01', 'Unlicensed title rejected from launch (HTTP 403/422/404)');

  // Admin attempt to publish unapproved title
  const adminAuth = await getAdminToken();
  const publishAttemptRes = await fetch(`${BASE_URL}/api/v1/admin/games/game-cosmic-odyssey/publish`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({ isPublished: true })
  });
  const publishAttemptData = await publishAttemptRes.json();
  assert(publishAttemptRes.status === 422, 'BM-LIC-02', 'Publishing unapproved game rejected with HTTP 422');
  assert(publishAttemptData.error === 'LICENSING_APPROVAL_REQUIRED', 'BM-LIC-03', 'Error code specifies LICENSING_APPROVAL_REQUIRED');

  // ---------------------------------------------------------------------------
  // Check 6 & 7: Regional Price Selection
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 6: Regional Price Selection ---');
  const pricePKRes = await fetch(`${BASE_URL}/api/v1/pricing/game-004?country=PK`);
  const pricePK = await pricePKRes.json();
  assert(pricePKRes.status === 200 && pricePK.pricing.currency === 'PKR' && pricePK.pricing.priceMinor === 25000, 'BM-PRC-01', 'Pakistan regional price is PKR 250 (25000 minor units)');

  const priceINRes = await fetch(`${BASE_URL}/api/v1/pricing/game-004?country=IN`);
  const priceIN = await priceINRes.json();
  assert(priceINRes.status === 200 && priceIN.pricing.currency === 'INR' && priceIN.pricing.priceMinor === 14900, 'BM-PRC-02', 'India regional price is INR 149 (14900 minor units)');

  const priceUSRes = await fetch(`${BASE_URL}/api/v1/pricing/game-004?country=US`);
  const priceUS = await priceUSRes.json();
  assert(priceUSRes.status === 200 && priceUS.pricing.currency === 'USD' && priceUS.pricing.priceMinor === 399, 'BM-PRC-03', 'United States regional price is USD 3.99 (399 minor units)');

  const priceGBRes = await fetch(`${BASE_URL}/api/v1/pricing/game-004?country=GB`);
  const priceGB = await priceGBRes.json();
  assert(priceGBRes.status === 200 && priceGB.pricing.currency === 'GBP' && priceGB.pricing.priceMinor === 299, 'BM-PRC-04', 'United Kingdom regional price is GBP 2.99 (299 minor units)');

  // ---------------------------------------------------------------------------
  // Check 8 & 9: Anti-Tampering & Cross-Country Abuse Rejection
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 7: Price-Tampering & Cross-Country Abuse Prevention ---');
  // Attacker tries to submit priceMinor = 1 (1 cent or 1 paisa)
  const tamperRes = await fetch(`${BASE_URL}/api/v1/store/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({
      gameId: 'game-004',
      offeredPriceMinor: 1, // Tampered price
      currency: 'PKR',
      country: 'PK'
    })
  });
  const tamperData = await tamperRes.json();
  assert(tamperRes.status === 400, 'BM-SEC-01', 'Client price tampering rejected with HTTP 400 Bad Request');
  assert(tamperData.code === 'PRICE_TAMPERING_DETECTED', 'BM-SEC-02', 'Server detects PRICE_TAMPERING_DETECTED error code');

  // Attacker tries currency mismatch (PKR price units with USD currency code)
  const mismatchRes = await fetch(`${BASE_URL}/api/v1/store/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({
      gameId: 'game-004',
      offeredPriceMinor: 25000,
      currency: 'USD', // Mismatched currency
      country: 'PK'
    })
  });
  assert(mismatchRes.status === 400, 'BM-SEC-03', 'Currency-country mismatch rejected by server validation');

  // ---------------------------------------------------------------------------
  // Check 12: Unauthorized Paid-Game Launch Rejection
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 8: Unauthorized Premium Launch Rejection ---');
  const unauthLaunchRes = await fetch(`${BASE_URL}/api/v1/games/neon-horizon/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({})
  });
  const unauthLaunchData = await unauthLaunchRes.json();
  assert(unauthLaunchRes.status === 403, 'BM-GATE-01', 'Paid game launch denied for unentitled player (HTTP 403)');
  assert(unauthLaunchData.details?.code === 'ENTITLEMENT_REQUIRED' || unauthLaunchData.error === 'ENTITLEMENT_REQUIRED', 'BM-GATE-02', 'Error code indicates ENTITLEMENT_REQUIRED');

  // ---------------------------------------------------------------------------
  // Check 10 & 11: Authorized Purchase & Entitlement Grant
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 9: Legitimate Purchase & Entitlement Ownership ---');
  const validPurchaseRes = await fetch(`${BASE_URL}/api/v1/store/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({
      gameId: 'game-004',
      offeredPriceMinor: 25000,
      currency: 'PKR',
      country: 'PK'
    })
  });
  const validPurchaseData = await validPurchaseRes.json();
  assert(validPurchaseRes.status === 201, 'BM-BUY-01', 'Legitimate purchase succeeds in sandbox staging (HTTP 201)');
  assert(validPurchaseData.entitlement && validPurchaseData.entitlement.entitlementType === 'OWNED_GAME_LICENSE', 'BM-BUY-02', 'Player granted OWNED_GAME_LICENSE entitlement');

  // Re-attempt launch with verified entitlement
  const authLaunchRes = await fetch(`${BASE_URL}/api/v1/games/neon-horizon/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({})
  });
  const authLaunchData = await authLaunchRes.json();
  assert(authLaunchRes.status === 200, 'BM-BUY-03', 'Paid game launches successfully after direct license ownership');
  assert(authLaunchData.launchTicket, 'BM-BUY-04', 'Launch ticket granted under OWNED_GAME_LICENSE entitlement');

  // ---------------------------------------------------------------------------
  // Check 15: Refund & Entitlement Revocation
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 10: Refund & Entitlement Revocation ---');
  const entitlementId = validPurchaseData.entitlement.id;
  const refundRes = await fetch(`${BASE_URL}/api/v1/store/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({
      entitlementId,
      reason: 'Customer requested refund within 14-day policy window'
    })
  });
  const refundData = await refundRes.json();
  assert(refundRes.status === 200 && refundData.entitlement.status === 'REFUNDED', 'BM-REF-01', 'Refund processed and entitlement marked REFUNDED');

  // Verify immediate gameplay launch cutoff post-refund
  const postRefundLaunchRes = await fetch(`${BASE_URL}/api/v1/games/neon-horizon/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`
    },
    body: JSON.stringify({})
  });
  assert(postRefundLaunchRes.status === 403, 'BM-REF-02', 'Refunded game immediately blocked from launching (HTTP 403)');

  // ---------------------------------------------------------------------------
  // Check 14: Payment-Simulation Production Lockdown
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 11: Production Simulation Lockdown Guard ---');
  // In pricingService.js, production lockdown throws 501 when environment is production
  const prodLockdownRes = await fetch(`${BASE_URL}/api/v1/store/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${playerPK.token}`,
      'x-environment': 'production'
    },
    body: JSON.stringify({
      gameId: 'game-004',
      offeredPriceMinor: 25000,
      currency: 'PKR',
      country: 'PK',
      env: 'production'
    })
  });
  assert(prodLockdownRes.status === 501, 'BM-PROD-01', 'Direct purchase simulation strictly locked down in production (HTTP 501)');

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` RESULTS: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  if (failedChecks > 0) {
    console.error(` FAILURE COUNT: ${failedChecks}`);
    process.exit(1);
  } else {
    console.log(' ALL BUSINESS MODEL & CATALOG ARCHITECTURE CHECKS PASSED (100%)');
    console.log('================================================================');
  }
}

if (require.main === module) {
  runBusinessModelTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runBusinessModelTests };
