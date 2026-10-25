const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocket } = require('ws');

const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=');
    acc[key] = val || true;
  }
  return acc;
}, {});

const PORT = parseInt(args.port || process.env.PORT || '5050', 10);
const HOST = args.host || 'localhost';
const SIMULATE_FAILURE = args['simulate-failure'] === true;

console.log(`\n======================================================`);
console.log(`  ONLINE GAMING PLATFORM — AUTOMATED SMOKE TEST SUITE`);
console.log(`  Target: http://${HOST}:${PORT}`);
console.log(`  Timestamp: ${new Date().toISOString()}`);
if (SIMULATE_FAILURE) {
  console.log(`  ⚠️ SIMULATE_FAILURE=TRUE: Inducing deliberate failure for AC-45.2 validation`);
}
console.log(`======================================================\n`);

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.get(`http://${HOST}:${PORT}${urlPath}`, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          durationMs: duration,
          body,
          json
        });
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout after 3000ms requesting ${urlPath}`));
    });
  });
}

function testWebSocket() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const ws = new WebSocket(`ws://${HOST}:${PORT}/ws`);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket connection timed out after 3000ms'));
    }, 3000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'PING' }));
    });

    ws.on('message', (data) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      ws.close();
      resolve({
        durationMs: duration,
        message: data.toString()
      });
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function runSmokeTests(options = {}) {
  const testPort = options.port || PORT;
  const testHost = options.host || HOST;
  const isSimulatedFail = options.simulateFailure !== undefined ? options.simulateFailure : SIMULATE_FAILURE;
  const testResults = [];

  console.log(`\n======================================================`);
  console.log(`  ONLINE GAMING PLATFORM — AUTOMATED SMOKE TEST SUITE`);
  console.log(`  Target: http://${testHost}:${testPort}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  if (isSimulatedFail) {
    console.log(`  ⚠️ SIMULATE_FAILURE=TRUE: Inducing deliberate failure for AC-45.2 validation`);
  }
  console.log(`======================================================\n`);

  function httpProbe(urlPath) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const req = http.get(`http://${testHost}:${testPort}${urlPath}`, { timeout: 3000 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const duration = Date.now() - startTime;
          let json = null;
          try { json = JSON.parse(body); } catch(e) {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            durationMs: duration,
            body,
            json
          });
        });
      });

      req.on('error', err => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout after 3000ms requesting ${urlPath}`));
      });
    });
  }

  function wsProbe() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const ws = new WebSocket(`ws://${testHost}:${testPort}/ws`);
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error('WebSocket connection timed out after 3000ms'));
      }, 3000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'PING' }));
      });

      ws.on('message', (data) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;
        ws.close();
        resolve({
          durationMs: duration,
          message: data.toString()
        });
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // Check 1: Liveness Endpoint
  try {
    const res = await httpProbe('/health');
    const passed = res.statusCode === 200 && res.json && res.json.status === 'UP';
    testResults.push({
      id: 'SMOKE-01',
      name: 'Liveness Probe (/health)',
      expected: 'HTTP 200 with status=UP',
      actual: `HTTP ${res.statusCode} (status=${res.json?.status})`,
      durationMs: res.durationMs,
      passed
    });
  } catch (err) {
    testResults.push({
      id: 'SMOKE-01',
      name: 'Liveness Probe (/health)',
      expected: 'HTTP 200 with status=UP',
      actual: err.message,
      passed: false
    });
  }

  // Check 2: Readiness & Subsystems (/api/health)
  try {
    if (isSimulatedFail) {
      throw new Error('SIMULATED_SMOKE_FAILURE: Database connection probe timed out (AC-45.2 test injection)');
    }
    const res = await httpProbe('/api/health');
    const passed = res.statusCode === 200 && res.json && res.json.database === 'connected';
    testResults.push({
      id: 'SMOKE-02',
      name: 'Readiness & Database Probe (/api/health)',
      expected: 'HTTP 200 with database=connected',
      actual: `HTTP ${res.statusCode} (db=${res.json?.database})`,
      durationMs: res.durationMs,
      passed
    });
  } catch (err) {
    testResults.push({
      id: 'SMOKE-02',
      name: 'Readiness & Database Probe (/api/health)',
      expected: 'HTTP 200 with database=connected',
      actual: err.message,
      passed: false
    });
  }

  // Check 3: Platform Version & Status (/api/v1/status)
  try {
    const res = await httpProbe('/api/v1/status');
    const passed = res.statusCode === 200 && res.json && ['00', '01', '02', '03', '04', '05', '06'].includes(res.json.activeSprint);
    testResults.push({
      id: 'SMOKE-03',
      name: 'Platform Metadata API (/api/v1/status)',
      expected: 'HTTP 200 with valid activeSprint (00, 01, 02, 03, 04, 05, or 06)',
      actual: `HTTP ${res.statusCode} (sprint=${res.json?.activeSprint})`,
      durationMs: res.durationMs,
      passed
    });
  } catch (err) {
    testResults.push({
      id: 'SMOKE-03',
      name: 'Platform Metadata API (/api/v1/status)',
      expected: 'HTTP 200 with activeSprint=00',
      actual: err.message,
      passed: false
    });
  }

  // Check 4: Static UI Shell & Assets (/)
  try {
    const res = await httpProbe('/');
    const passed = res.statusCode === 200 && res.body.includes('NexusPlay');
    testResults.push({
      id: 'SMOKE-04',
      name: 'Staging Portal UI Shell (/)',
      expected: 'HTTP 200 containing NexusPlay',
      actual: `HTTP ${res.statusCode} (content length: ${res.body.length})`,
      durationMs: res.durationMs,
      passed
    });
  } catch (err) {
    testResults.push({
      id: 'SMOKE-04',
      name: 'Staging Portal UI Shell (/)',
      expected: 'HTTP 200 containing NexusPlay',
      actual: err.message,
      passed: false
    });
  }

  // Check 5: WebSocket Realtime Channel (/ws)
  try {
    const wsRes = await wsProbe();
    testResults.push({
      id: 'SMOKE-05',
      name: 'Realtime WebSocket Handshake (/ws)',
      expected: 'WebSocket connect & PING/PONG',
      actual: `Connected in ${wsRes.durationMs}ms`,
      durationMs: wsRes.durationMs,
      passed: true
    });
  } catch (err) {
    testResults.push({
      id: 'SMOKE-05',
      name: 'Realtime WebSocket Handshake (/ws)',
      expected: 'WebSocket connect & PING/PONG',
      actual: err.message,
      passed: false
    });
  }

  // Summary
  const allPassed = testResults.every(t => t.passed);
  const passedCount = testResults.filter(t => t.passed).length;
  const failedCount = testResults.filter(t => !t.passed).length;

  console.log(`RESULTS TABLE:`);
  console.log(`---------------------------------------------------------------------------------------------------`);
  console.log(`ID       | Check Name                         | Status | Details`);
  console.log(`---------------------------------------------------------------------------------------------------`);
  testResults.forEach(t => {
    const status = t.passed ? '[PASS]' : '[FAIL]';
    console.log(`${t.id.padEnd(8)} | ${t.name.padEnd(34)} | ${status.padEnd(6)} | ${t.actual}`);
  });
  console.log(`---------------------------------------------------------------------------------------------------`);
  console.log(`Total: ${testResults.length} checks | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log(`Overall Smoke Test Status: ${allPassed ? 'PASSED (SUCCESS)' : 'FAILED'}\n`);

  // Save evidence to evidence/sprint-00/test-results
  const evidenceDir = path.join(__dirname, '..', 'evidence', 'sprint-00', 'test-results');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const resultPayload = {
    testSuite: 'Automated Staging Smoke Test (EP13-01)',
    timestamp: new Date().toISOString(),
    environment: 'staging',
    target: `http://${HOST}:${PORT}`,
    allPassed,
    passedCount,
    failedCount,
    simulatedFailure: SIMULATE_FAILURE,
    checks: testResults
  };

  const filename = `smoke-test-${SIMULATE_FAILURE ? 'simulated-fail' : 'pass'}-${timestampStr}.json`;
  const filePath = path.join(evidenceDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(resultPayload, null, 2));
  console.log(`Saved smoke test artifact: ${filePath}`);

  return { allPassed, resultPayload, filePath };
}

if (require.main === module) {
  runSmokeTests().then(({ allPassed }) => {
    process.exit(allPassed ? 0 : 1);
  }).catch(err => {
    console.error('Fatal smoke test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runSmokeTests };
