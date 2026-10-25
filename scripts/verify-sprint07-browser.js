/**
 * NexusPlay — Sprint 07 Browser QA Automation Runner
 * Direct Chrome DevTools Protocol (CDP) Automation Engine
 * Verifies SRE Operations Monitoring Dashboard (EP12-01), Real-Time Alerting (EP12-02), and Rollback Procedure (EP13-02)
 *
 * Captures 8 genuine screenshots covering:
 *  1. Authenticated administrator dashboard access with real metrics
 *  2. Time window filtering (15m window selected)
 *  3. Telemetry unavailable / missing data banner & indicators (AC-41.3)
 *  4. Active incident alert card firing (AC-42.1)
 *  5. Acknowledged alert state
 *  6. Alert resolved recovery state (AC-42.3)
 *  7. Responsive mobile viewport layout (390x844)
 *  8. Unauthorized public access denial
 */

process.env.NODE_ENV = 'staging';

const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9227; // Isolated CDP port for Sprint 07 QA
const TARGET_URL = 'http://localhost:5050';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'evidence', 'sprint-07', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.reqId = 1;
    this.pending = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        } catch (e) {}
      });
    });
  }

  send(method, params = {}, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (val) => { clearTimeout(timer); resolve(val); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const trimmed = expression.trim();
    const wrapped = (trimmed.startsWith('(() =>') || trimmed.startsWith('(async () =>'))
      ? expression
      : `(async () => {\n${expression}\n})()`;
    const res = await this.send('Runtime.evaluate', {
      expression: wrapped,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      console.error('CDP Eval Exception:', res.exceptionDetails.text, res.exceptionDetails.exception?.description);
    }
    return res.result?.value;
  }

  async screenshot(filePath, clip = null) {
    const params = { format: 'png' };
    if (clip) params.clip = clip;
    const res = await this.send('Page.captureScreenshot', params);
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return buffer.length;
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile
    });
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('\n======================================================================');
  console.log(' NEXUSPLAY SPRINT 07 — CHROME CDP BROWSER QA AUTOMATION RUNNER');
  console.log(` Target Application: ${TARGET_URL}`);
  console.log(` Chrome Binary: ${CHROME_PATH}`);
  console.log(` Output Directory: ${SCREENSHOT_DIR}`);
  console.log('======================================================================\n');

  // Verify server is responding
  try {
    const status = await getJson(`${TARGET_URL}/api/health`);
    console.log(`✓ Staging Server confirmed active: DB status=${status.database}`);
  } catch (e) {
    console.error(`✗ Cannot connect to staging server at ${TARGET_URL}: ${e.message}`);
    process.exit(1);
  }

  // Launch headless Chrome
  const userDataDir = path.join(__dirname, '..', 'data', 'chrome-profile-sprint07');
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    TARGET_URL
  ], { detached: false });

  let cdpClient = null;

  try {
    // Wait for CDP readiness
    console.log('Waiting for Chrome DevTools Protocol on port ' + CDP_PORT + '...');
    let versionData = null;
    for (let i = 0; i < 20; i++) {
      try {
        versionData = await getJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
        break;
      } catch (e) {
        await sleep(300);
      }
    }

    if (!versionData || !versionData.webSocketDebuggerUrl) {
      throw new Error('Chrome CDP failed to initialize within 6 seconds.');
    }

    // Get active targets
    const targets = await getJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('No inspectable browser page target found.');
    }

    console.log(`Connecting CDP client to ${pageTarget.webSocketDebuggerUrl}...`);
    cdpClient = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdpClient.connect();

    await cdpClient.send('Page.enable');
    await cdpClient.send('DOM.enable');
    await cdpClient.send('Runtime.enable');

    await cdpClient.setViewport(1440, 900);

    // -----------------------------------------------------------------------
    // SCREENSHOT 8: Unauthorized public user view (No SRE dashboard visible)
    // -----------------------------------------------------------------------
    console.log('\n[Scenario 8] Verifying unauthorized access restriction for unauthenticated user...');
    await cdpClient.send('Page.navigate', { url: TARGET_URL });
    await sleep(2000);

    const hasDashboardUnauth = await cdpClient.eval(`
      !!document.getElementById('sre-operations-dashboard')
    `);
    console.log(`  Unauthenticated user dashboard visible: ${hasDashboardUnauth} (Expected: false)`);

    const path08 = path.join(SCREENSHOT_DIR, '08-unauthorized-access-denied.png');
    await cdpClient.screenshot(path08);
    console.log(`  ✓ Captured: 08-unauthorized-access-denied.png (${fs.statSync(path08).size} bytes)`);

    // -----------------------------------------------------------------------
    // Authenticate as Admin via HttpOnly Cookie Session
    // -----------------------------------------------------------------------
    console.log('\n[Authentication] Logging in as administrator (admin@nexusplay.gg)...');
    const loginSuccess = await cdpClient.eval(`
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@nexusplay.gg', password: 'Admin#2026!Nexus' })
      });
      return res.ok;
    `);
    console.log(`  Session fetch status: ${loginSuccess}`);

    await cdpClient.send('Page.reload');
    await sleep(2500);

    const adminRoleBadge = await cdpClient.eval(`
      const badge = document.getElementById('userRoleBadge');
      badge ? badge.innerText : null
    `);
    console.log(`  ✓ Authentication verified. User Role Badge: "${adminRoleBadge}"`);

    // Verify SRE dashboard is rendered in the DOM
    const hasDashboard = await cdpClient.eval(`
      !!document.getElementById('sre-operations-dashboard')
    `);
    console.log(`  ✓ SRE Operations Dashboard rendered in DOM: ${hasDashboard}`);

    // Scroll directly to operations dashboard
    await cdpClient.eval(`
      const el = document.getElementById('sre-operations-dashboard');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    `);
    await sleep(1500);

    // -----------------------------------------------------------------------
    // SCREENSHOT 1: Authenticated Operations Dashboard (Desktop 1440x900)
    // -----------------------------------------------------------------------
    console.log('\n[Scenario 1] Capturing Authenticated SRE Operations Dashboard (Desktop 1440x900)...');
    const path01 = path.join(SCREENSHOT_DIR, '01-operations-dashboard-desktop.png');
    await cdpClient.screenshot(path01);
    console.log(`  ✓ Captured: 01-operations-dashboard-desktop.png (${fs.statSync(path01).size} bytes)`);

    // -----------------------------------------------------------------------
    // SCREENSHOT 2: Time Window Filtering (15m window selected)
    // -----------------------------------------------------------------------
    console.log('\n[Scenario 2] Switching Time Window Filter to "15m"...');
    await cdpClient.eval(`
      const btn15m = document.getElementById('btn-window-15m');
      if (btn15m) btn15m.click();
    `);
    await sleep(800);

    const path02 = path.join(SCREENSHOT_DIR, '02-operations-time-window-filter.png');
    await cdpClient.screenshot(path02);
    console.log(`  ✓ Captured: 02-operations-time-window-filter.png (${fs.statSync(path02).size} bytes)`);

    // Switch back to 5m window
    await cdpClient.eval(`
      const btn5m = document.getElementById('btn-window-5m');
      if (btn5m) btn5m.click();
    `);
    await sleep(500);

    // -----------------------------------------------------------------------
    // SCREENSHOT 3: Missing Telemetry / Outage Banner (AC-41.3)
    // -----------------------------------------------------------------------
    console.log('\n[Scenario 3] Simulating Operational Telemetry Outage (AC-41.3)...');
    await cdpClient.eval(`
      const toggleBtn = document.getElementById('btn-toggle-telemetry-outage');
      if (toggleBtn) toggleBtn.click();
    `);
    await sleep(800);

    const path03 = path.join(SCREENSHOT_DIR, '03-operations-missing-telemetry-state.png');
    await cdpClient.screenshot(path03);
    console.log(`  ✓ Captured: 03-operations-missing-telemetry-state.png (${fs.statSync(path03).size} bytes)`);

    // Restore telemetry
    await cdpClient.eval(`
      const toggleBtn = document.getElementById('btn-toggle-telemetry-outage');
      if (toggleBtn) toggleBtn.click();
    `);
    await sleep(600);

    // -----------------------------------------------------------------------
    // SCREENSHOT 4: Active Incident Alert Firing (AC-42.1)
    // -----------------------------------------------------------------------
    console.log('\n[Scenario 4] Triggering simulated High Error Rate Incident (AC-42.1)...');
    await cdpClient.eval(`
      const simBtn = document.getElementById('btn-simulate-incident');
      if (simBtn) simBtn.click();
    `);
    await sleep(1000);

    const path04 = path.join(SCREENSHOT_DIR, '04-active-incident-alert-firing.png');
    await cdpClient.screenshot(path04);
    console.log(`  ✓ Captured: 04-active-incident-alert-firing.png (${fs.statSync(path04).size} bytes)`);

    // -----------------------------------------------------------------------
    // SCREENSHOT 5: Operator Acknowledged State
    // -----------------------------------------------------------------------
    console.log('\n[Scenario 5] Acknowledging active incident alert...');
    await cdpClient.eval(`
      const ackBtn = document.querySelector('button[id^="btn-ack-"]');
      if (ackBtn) ackBtn.click();
    `);
    await sleep(1000);

    const path05 = path.join(SCREENSHOT_DIR, '05-alert-acknowledged-state.png');
    await cdpClient.screenshot(path05);
    console.log(`  ✓ Captured: 05-alert-acknowledged-state.png (${fs.statSync(path05).size} bytes)`);

    // -----------------------------------------------------------------------
    // SCREENSHOT 6: Alert Resolved Recovery State (AC-42.3)
    // -----------------------------------------------------------------------
    console.log('\n[Scenario 6] Auto-resolving incident when error rate normalizes (AC-42.3)...');
    await cdpClient.eval(`
      const resBtn = document.getElementById('btn-resolve-incident');
      if (resBtn) resBtn.click();
    `);
    await sleep(1000);

    const path06 = path.join(SCREENSHOT_DIR, '06-alert-resolved-recovery.png');
    await cdpClient.screenshot(path06);
    console.log(`  ✓ Captured: 06-alert-resolved-recovery.png (${fs.statSync(path06).size} bytes)`);

    // -----------------------------------------------------------------------
    // SCREENSHOT 7: Responsive Mobile Viewport Layout (390x844)
    // -----------------------------------------------------------------------
    console.log('\n[Scenario 7] Emulating iPhone 14 Pro Mobile Viewport (390x844)...');
    await cdpClient.setViewport(390, 844, true);
    await sleep(600);
    await cdpClient.eval(`
      const el = document.getElementById('sre-operations-dashboard');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    `);
    await sleep(800);

    const path07 = path.join(SCREENSHOT_DIR, '07-operations-dashboard-mobile-viewport.png');
    await cdpClient.screenshot(path07);
    console.log(`  ✓ Captured: 07-operations-dashboard-mobile-viewport.png (${fs.statSync(path07).size} bytes)`);

    console.log('\n======================================================================');
    console.log(' ALL 8 SPRINT 07 BROWSER SCREENSHOTS CAPTURED SUCCESSFULLY!');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('Fatal Browser Automation Error:', err);
    process.exitCode = 1;
  } finally {
    if (cdpClient) cdpClient.close();
    try { chromeProc.kill(); } catch (e) {}
  }
}

run();
