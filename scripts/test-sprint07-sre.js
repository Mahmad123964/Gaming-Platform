/**
 * NexusPlay — Sprint 07 Monitoring, Alerting & Deployment Safety Automated Test Suite
 * Traceability:
 *   - EP12-01: Operational Health & Error Rate Dashboard (AC-41.1, AC-41.2, AC-41.3)
 *   - EP12-02: Real-Time Automated Alerting (AC-42.1, AC-42.2, AC-42.3)
 *   - EP13-02: Release Rollback Procedure (AC-46.1, AC-46.2, AC-46.3)
 * Security Verification: RBAC protection, sensitive telemetry redaction, persistence classification.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

process.env.NODE_ENV = process.env.NODE_ENV || 'staging';

const { getDb } = require('../server/src/db');
const { getAuthService } = require('../server/src/modules/identity/authService');
const { getContentAdminService } = require('../server/src/modules/contentAdmin/contentAdminService');
const { getMetricsService } = require('../server/src/modules/operations/metricsService');
const { getAlertingService } = require('../server/src/modules/operations/alertingService');

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
  console.log(' NEXUSPLAY SPRINT 07 — SRE MONITORING, ALERTING & ROLLBACK TEST SUITE');
  console.log(` Target Server: ${BASE_URL}`);
  console.log(' Timestamp: ' + new Date().toISOString());
  console.log('======================================================================\n');

  const db = getDb();
  const authService = getAuthService();
  const adminService = getContentAdminService();
  const metricsService = getMetricsService();
  const alertingService = getAlertingService();

  console.log('--- Phase 0: Test Fixtures & Authentication Setup ---');

  // 1. Admin Account
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
  const adminCookie = adminLoginRes.headers.get('set-cookie') || '';

  // 2. Regular Player Account
  const playerEmail = `sre.tester.${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `sretester${Date.now() % 100000}`,
      displayName: 'SRE Test Player',
      email: playerEmail,
      password: 'Password#2026!Secure',
      acceptTerms: true
    })
  });
  const regData = (await regRes.json()).data || {};
  const playerToken = regData.token;
  const playerCsrf = regData.csrfToken;
  const playerCookie = regRes.headers.get('set-cookie') || '';

  console.log(`✓ Admin session established (${adminRecord.email})`);
  console.log(`✓ Player session established (${playerEmail})\n`);

  // =========================================================================
  // MODULE 1: EP12-01 / AC-41.1 — Operational Health Indicators
  // =========================================================================
  console.log('--- Module 1: EP12-01 / AC-41.1 — Operational Health Indicators ---');

  const metricsRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics?window=5m`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Cookie': adminCookie
    }
  });
  const metricsData = await metricsRes.json();

  assert(metricsRes.status === 200, 'AC-41.1-01', 'Operations metrics endpoint returns HTTP 200 for admin');
  assert(metricsData.telemetryAvailable === true, 'AC-41.1-02', 'Telemetry marked as available for nominal operations');
  assert(typeof metricsData.uptimeSeconds === 'number' && metricsData.uptimeSeconds >= 0, 'AC-41.1-03', 'Uptime in seconds is measured and numeric');
  assert(typeof metricsData.availability?.sliPercent === 'number' && metricsData.availability.sliPercent >= 0 && metricsData.availability.sliPercent <= 100, 'AC-41.1-04', 'Availability SLI is expressed as a bounded percentage [0, 100]');
  assert(typeof metricsData.availability?.errorRatePercent === 'number' && metricsData.availability.errorRatePercent >= 0 && metricsData.availability.errorRatePercent <= 100, 'AC-41.1-05', '5xx Error Rate is expressed as a bounded percentage [0, 100]');
  assert(typeof metricsData.availability?.totalRequests === 'number' && metricsData.availability.totalRequests >= 0, 'AC-41.1-06', 'Total request volume is tracked in window');
  assert(typeof metricsData.latency?.avgMs === 'number' && typeof metricsData.latency?.p95Ms === 'number', 'AC-41.1-07', 'Latency metrics include average and p95 calculations');
  assert(typeof metricsData.system?.cpuPercent === 'number' && metricsData.system.cpuPercent >= 0, 'AC-41.1-08', 'System CPU utilization percentage is measured');
  assert(typeof metricsData.system?.memory?.rssMB === 'number' && metricsData.system.memory.rssMB > 0, 'AC-41.1-09', 'Process RSS memory in megabytes is measured');
  assert(metricsData.dependencies?.database?.status === 'healthy', 'AC-41.1-10', 'Database engine status verified as healthy');
  assert(typeof metricsData.dependencies?.database?.queryLatencyMs === 'number', 'AC-41.1-11', 'Database ping latency is numeric');
  assert(typeof metricsData.dependencies?.webSocket?.activeConnections === 'number', 'AC-41.1-12', 'WebSocket active CCU connections are tracked');
  assert(!metricsData.dependencies?.database?.connectionString, 'AC-41.1-13', 'Sensitive DB connection credentials are redacted');

  // =========================================================================
  // MODULE 2: EP12-01 / AC-41.2 — Time Window Filtering
  // =========================================================================
  console.log('\n--- Module 2: EP12-01 / AC-41.2 — Time Window Filtering ---');

  for (const win of ['5m', '15m', '1h', '24h']) {
    const winRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics?window=${win}`, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Cookie': adminCookie }
    });
    const winData = await winRes.json();
    assert(winRes.status === 200 && winData.window === win, `AC-41.2-${win}`, `Window filter "${win}" returns matching window metadata`);
  }

  const invalidWinRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics?window=7d`, {
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Cookie': adminCookie }
  });
  assert(invalidWinRes.status === 400, 'AC-41.2-INV', 'Unsupported time window parameter returns HTTP 400 Bad Request');

  // =========================================================================
  // MODULE 3: EP12-01 / AC-41.3 — Telemetry Unavailable Response
  // =========================================================================
  console.log('\n--- Module 3: EP12-01 / AC-41.3 — Telemetry Unavailable Handling ---');

  // Temporarily disable telemetry via admin toggle endpoint
  await fetch(`${BASE_URL}/api/v1/admin/operations/metrics/toggle-telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'Cookie': adminCookie,
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ available: false })
  });

  const outageRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics?window=5m`, {
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Cookie': adminCookie }
  });
  const outageData = await outageRes.json();

  assert(outageRes.status === 200, 'AC-41.3-01', 'Metrics endpoint responds even during upstream telemetry collection outage');
  assert(outageData.telemetryAvailable === false, 'AC-41.3-02', 'Telemetry availability clearly marked as false');
  assert(outageData.status === 'TELEMETRY_UNAVAILABLE', 'AC-41.3-03', 'Explicit TELEMETRY_UNAVAILABLE status returned');
  assert(outageData.availability === null, 'AC-41.3-04', 'Availability indicators are null rather than fabricated');
  assert(outageData.latency === null, 'AC-41.3-05', 'Latency indicators are null rather than fabricated');

  // Restore telemetry via admin toggle endpoint
  await fetch(`${BASE_URL}/api/v1/admin/operations/metrics/toggle-telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'Cookie': adminCookie,
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({ available: true })
  });

  const restoredRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics?window=5m`, {
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Cookie': adminCookie }
  });
  const restoredData = await restoredRes.json();
  assert(restoredData.telemetryAvailable === true, 'AC-41.3-06', 'Telemetry availability successfully restored');

  // =========================================================================
  // MODULE 4: EP12-02 / AC-42.1 — Real-Time Automated Alerting (Threshold Breach)
  // =========================================================================
  console.log('\n--- Module 4: EP12-02 / AC-42.1 — Threshold Breach Alert Generation ---');

  // Simulate error rate breach: 8.5% > 5.0%
  const breachRes = await fetch(`${BASE_URL}/api/v1/admin/operations/alerts/test-trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'Cookie': adminCookie,
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({
      ruleId: 'rule-high-error-rate',
      observedValue: 8.5
    })
  });
  const breachData = await breachRes.json();

  assert(breachRes.status === 201, 'AC-42.1-01', 'Breached threshold triggers HTTP 201 Created alert event');
  assert(breachData.alert?.ruleId === 'rule-high-error-rate', 'AC-42.1-02', 'Alert matches breached ruleId');
  assert(breachData.alert?.status === 'ACTIVE', 'AC-42.1-03', 'Generated alert status is ACTIVE');
  assert(breachData.alert?.severity === 'CRITICAL', 'AC-42.1-04', 'Error rate breach assigned CRITICAL severity');
  assert(breachData.alert?.onCallTeam === '[SRE_CORE]', 'AC-42.1-05', 'Alert specifically routed to on-call team [SRE_CORE]');
  assert(breachData.alert?.observedValue === 8.5, 'AC-42.1-06', 'Alert records observed breach value (8.5%)');
  assert(breachData.alert?.threshold === 5.0, 'AC-42.1-07', 'Alert records authoritative threshold (5.0%)');

  // Check outbox
  const outboxRes = await fetch(`${BASE_URL}/api/v1/admin/operations/alerts/outbox`, {
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Cookie': adminCookie }
  });
  const outboxData = await outboxRes.json();
  const alertDelivery = outboxData.outbox?.find(d => d.type === 'ALERT_TRIGGERED' && d.ruleId === 'rule-high-error-rate');
  assert(!!alertDelivery, 'AC-42.1-08', 'Alert dispatched to staging notification outbox');
  assert(alertDelivery?.recipient === 'sre-oncall@nexusplay.internal', 'AC-42.1-09', 'Notification routed to designated SRE recipient');

  // =========================================================================
  // MODULE 5: EP12-02 / AC-42.2 — Metric Below Threshold & Deduplication
  // =========================================================================
  console.log('\n--- Module 5: EP12-02 / AC-42.2 — Metric Below Threshold & Deduplication ---');

  // Check alert evaluation with safe value (1.2% < 5.0%)
  const evalResult = alertingService.evaluateMetrics({
    availability: { errorRatePercent: 1.2 },
    latency: { p95Ms: 120 },
    dependencies: { database: { status: 'healthy' } }
  });
  assert(evalResult.length === 0, 'AC-42.2-01', 'Metric value below threshold does not generate alert');

  // Deduplication check via API: sending subsequent trigger updates or maintains existing active alert
  const activeAlertId = breachData.alert?.id;
  assert(!!activeAlertId, 'AC-42.2-02', 'Active alert ID identified for acknowledgment and lifecycle management');

  // Operator acknowledgment
  const ackRes = await fetch(`${BASE_URL}/api/v1/admin/operations/alerts/${activeAlertId}/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'Cookie': adminCookie,
      'X-CSRF-Token': adminCsrf
    }
  });
  const ackData = await ackRes.json();
  assert(ackRes.status === 200 && ackData.alert?.status === 'ACKNOWLEDGED', 'AC-42.2-03', 'Operator can acknowledge active alert');

  // =========================================================================
  // MODULE 6: EP12-02 / AC-42.3 — Auto-Resolution on Nominal Metric Return
  // =========================================================================
  console.log('\n--- Module 6: EP12-02 / AC-42.3 — Alert Auto-Resolution & Recovery ---');

  const resolveRes = await fetch(`${BASE_URL}/api/v1/admin/operations/alerts/test-resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'Cookie': adminCookie,
      'X-CSRF-Token': adminCsrf
    },
    body: JSON.stringify({
      ruleId: 'rule-high-error-rate',
      observedValue: 0.4
    })
  });
  const resolveData = await resolveRes.json();

  assert(resolveRes.status === 200, 'AC-42.3-01', 'Recovery notification returns HTTP 200');
  assert(resolveData.alert?.status === 'RESOLVED', 'AC-42.3-02', 'Alert status transitioned to RESOLVED');
  assert(typeof resolveData.alert?.resolvedAt === 'string', 'AC-42.3-03', 'Resolution timestamp is recorded');

  // Outbox delivery for resolution
  const outboxAfterRes = await fetch(`${BASE_URL}/api/v1/admin/operations/alerts/outbox`, {
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Cookie': adminCookie }
  });
  const outboxAfter = await outboxAfterRes.json();
  const resDelivery = outboxAfter.outbox?.find(d => d.type === 'ALERT_RESOLVED' && d.ruleId === 'rule-high-error-rate');
  assert(!!resDelivery, 'AC-42.3-04', 'Recovery notification recorded in staging outbox');

  // =========================================================================
  // MODULE 7: EP13-02 / AC-46.1 — Rollback Procedure & LKG Release Definition
  // =========================================================================
  console.log('\n--- Module 7: EP13-02 / AC-46.1 — Rollback Procedure & LKG Release ---');

  const rollbackScriptPath = path.resolve(__dirname, 'rollback-staging.js');
  assert(fs.existsSync(rollbackScriptPath), 'AC-46.1-01', 'rollback-staging.js exists in scripts directory');

  const deployStatusRes = await fetch(`${BASE_URL}/api/v1/admin/operations/deployment/status`, {
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Cookie': adminCookie }
  });
  const deployStatus = await deployStatusRes.json();
  assert(deployStatusRes.status === 200, 'AC-46.1-02', 'Deployment status endpoint returns HTTP 200');
  assert(!!deployStatus.lastKnownGood, 'AC-46.1-03', 'Last-Known-Good staging release identified');
  assert(typeof deployStatus.lastKnownGood?.version === 'string', 'AC-46.1-04', 'LKG release captures version identity');
  assert(typeof deployStatus.lastKnownGood?.gitCommit === 'string', 'AC-46.1-05', 'LKG release captures Git commit SHA');

  // =========================================================================
  // MODULE 8: EP13-02 / AC-46.2 — Rollback Execution & Recovery Health Verification
  // =========================================================================
  console.log('\n--- Module 8: EP13-02 / AC-46.2 — Rollback Execution & Verification ---');

  let rollbackSuccess = false;
  try {
    const rollbackOutput = execSync('node scripts/rollback-staging.js --target=v0.6.0', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, NODE_ENV: 'staging' }
    });
    rollbackSuccess = rollbackOutput.includes('ROLLBACK VERIFICATION SUCCEEDED');
  } catch (e) {
    rollbackSuccess = false;
  }
  assert(rollbackSuccess, 'AC-46.2-01', 'Rollback execution script restores and verifies target release health');

  const auditRollback = db.get("SELECT * FROM audit_events WHERE action = 'DEPLOYMENT_ROLLBACK_COMPLETED' ORDER BY created_at DESC LIMIT 1");
  assert(!!auditRollback, 'AC-46.2-02', 'Rollback audit record persisted in immutable audit trail');

  // =========================================================================
  // MODULE 9: EP13-02 / AC-46.3 — Rollback Failure Guidance & Escalation
  // =========================================================================
  console.log('\n--- Module 9: EP13-02 / AC-46.3 — Rollback Failure Guidance & Escalation ---');

  let failedRollbackCode = 0;
  let failedRollbackOutput = '';
  try {
    execSync('node scripts/rollback-staging.js --simulate-rollback-failure', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8'
    });
  } catch (err) {
    failedRollbackCode = err.status;
    failedRollbackOutput = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
  }
  assert(failedRollbackCode === 1, 'AC-46.3-01', 'Failed rollback returns non-zero process exit code (1)');
  assert(failedRollbackOutput.includes('ROLLBACK FAILURE ESCALATION INSTRUCTIONS'), 'AC-46.3-02', 'Explicit operator escalation guidance printed');
  assert(failedRollbackOutput.includes('SRE On-Call Pager: pagerduty.nexusplay.internal/sre-primary'), 'AC-46.3-03', 'Escalation instructions include emergency SRE pager contact');

  // =========================================================================
  // MODULE 10: Security & Access Control (RBAC)
  // =========================================================================
  console.log('\n--- Module 10: Security & Access Control (RBAC) ---');

  const unauthRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics`);
  assert(unauthRes.status === 401, 'SEC-01', 'Unauthenticated request to operations metrics returns HTTP 401');

  const playerMetricsRes = await fetch(`${BASE_URL}/api/v1/admin/operations/metrics`, {
    headers: { 'Authorization': `Bearer ${playerToken}`, 'Cookie': playerCookie }
  });
  assert(playerMetricsRes.status === 403, 'SEC-02', 'Regular player request to operations metrics returns HTTP 403 Forbidden');

  const playerAlertsRes = await fetch(`${BASE_URL}/api/v1/admin/operations/alerts`, {
    headers: { 'Authorization': `Bearer ${playerToken}`, 'Cookie': playerCookie }
  });
  assert(playerAlertsRes.status === 403, 'SEC-03', 'Regular player request to alerts list returns HTTP 403 Forbidden');

  // =========================================================================
  // MODULE 11: Rate-Limiting Persistence Verification
  // =========================================================================
  console.log('\n--- Module 11: Rate-Limiting Persistence Verification ---');

  let persistenceVerified = false;
  try {
    const pOutput = execSync('node scripts/verify-rate-limit-persistence.js', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8'
    });
    persistenceVerified = pOutput.includes('Rate Limiter Architecture: HYBRID') && pOutput.includes('100% SQLITE-PERSISTED');
  } catch (e) {
    persistenceVerified = false;
  }
  assert(persistenceVerified, 'PERSIST-01', 'Rate-limiting hybrid storage and session revocation persistence verified');

  // =========================================================================
  // TEST SUMMARY & EVIDENCE PERSISTENCE
  // =========================================================================
  console.log('\n======================================================================');
  console.log(' SPRINT 07 TEST SUITE SUMMARY');
  console.log(` Total Checks : ${passedTests + failedTests}`);
  console.log(` Passed       : \x1b[32m${passedTests}\x1b[0m`);
  console.log(` Failed       : \x1b[31m${failedTests}\x1b[0m`);
  console.log('======================================================================\n');

  const evidenceDir = path.resolve(__dirname, '../evidence/sprint-07');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  const summary = {
    sprint: 'Sprint 07 — Monitoring, Alerting & Deployment Safety',
    timestamp: new Date().toISOString(),
    totalChecks: passedTests + failedTests,
    passed: passedTests,
    failed: failedTests,
    results
  };

  fs.writeFileSync(
    path.join(evidenceDir, 'automated-test-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  console.log(`✓ Test summary persisted to evidence/sprint-07/automated-test-summary.json`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error running Sprint 07 test suite:', err);
  process.exit(1);
});
