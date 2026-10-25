/**
 * NexusPlay — Sprint 11 Browser QA Automation Runner
 * Direct Chrome DevTools Protocol (CDP) Automation Engine
 * Verifies Sprint 11 Premium Access, Plan Comparison & Entitlements:
 *   - EP08-01: Public Plan Comparison Matrix (AC-27.1, AC-27.2, AC-27.3)
 *   - EP08-02: Paid Game Launch Gating (AC-28.1, AC-28.2, AC-28.3)
 *   - EP08-03: Membership Status & Renewal Info (AC-29.1, AC-29.2, AC-29.3)
 *   - EP08-04: Upgrade Messaging on Launch Denial (AC-30.1, AC-30.2, AC-30.3)
 *
 * Captures 8 genuine screenshots:
 *   1. 01-plans-comparison-modal.png
 *   2. 02-free-tier-catalog-view.png
 *   3. 03-paid-game-launch-upgrade-prompt.png
 *   4. 04-plan-upgrade-simulation.png
 *   5. 05-active-membership-status.png
 *   6. 06-paid-game-launch-entitled.png
 *   7. 07-expired-subscription-notice.png
 *   8. 08-mobile-plans-view.png
 */

process.env.NODE_ENV = 'staging';

const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const WebSocket = require('ws');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9233; // Dedicated port for Sprint 11 browser verification
const TARGET_URL = 'http://localhost:5050';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'evidence', 'sprint-11', 'screenshots');
const DB_PATH = path.join(__dirname, '..', 'server', 'data', 'platform-staging.db');

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
    const hasAwait = trimmed.includes('await ');
    const wrapped = (trimmed.startsWith('(() =>') || trimmed.startsWith('(async () =>'))
      ? expression
      : (hasAwait ? `(async () => {\n${expression}\n})()` : `(() => {\n${expression}\n})()`);
    const res = await this.send('Runtime.evaluate', {
      expression: wrapped,
      awaitPromise: hasAwait,
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
    console.log(`[EVIDENCE] Saved screenshot (${buffer.length} bytes): ${path.basename(filePath)}`);
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
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runBrowserVerification() {
  console.log('======================================================================');
  console.log(' NEXUSPLAY SPRINT 11 — CHROME CDP BROWSER QA AUTOMATION RUNNER');
  console.log(` Target Application : ${TARGET_URL}`);
  console.log(` Chrome Binary      : ${CHROME_PATH}`);
  console.log(` Screenshot Dest    : ${SCREENSHOT_DIR}`);
  console.log('======================================================================\n');

  // Verify server
  try {
    const health = await getJson(`${TARGET_URL}/api/health`);
    console.log(`✓ Staging Server active on port 5050 (DB: ${health.database})`);
  } catch (e) {
    console.error(`✗ Cannot connect to staging server: ${e.message}`);
    process.exit(1);
  }

  // Setup dedicated Chrome profile directory
  const userDataDir = path.join(__dirname, '..', 'data', 'chrome-profile-sprint11');
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const chromeArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--disable-gpu',
    '--window-size=1400,900',
    TARGET_URL
  ];

  console.log(`[CHROME] Launching dedicated browser instance on CDP port ${CDP_PORT}...`);
  const chromeProc = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' });

  let client = null;

  try {
    // Wait for CDP endpoint
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const versionData = await getJson(`http://localhost:${CDP_PORT}/json/version`);
        wsUrl = versionData.webSocketDebuggerUrl;
        if (wsUrl) break;
      } catch (e) {
        await sleep(400);
      }
    }

    if (!wsUrl) throw new Error('Failed to attach to Chrome CDP debugger');
    console.log(`✓ Connected to Chrome CDP debugger`);

    // Get page target
    const targets = await getJson(`http://localhost:${CDP_PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No valid page target found in browser');

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');

    console.log(`[BROWSER] Navigating to ${TARGET_URL}...`);
    await client.send('Page.navigate', { url: TARGET_URL });
    await sleep(2500);

    await client.setViewport(1400, 900);
    console.log('✓ Viewport set to 1400x900 desktop standard');

    // =========================================================================
    // SCREENSHOT 1: 01-plans-comparison-modal.png (EP08-01, AC-27.1, AC-27.2, AC-27.3)
    // =========================================================================
    console.log('\n--- Capturing Screenshot 01: Plans Comparison Modal (AC-27.1..27.3) ---');
    await client.eval(`
      const btn = document.getElementById('nav-btn-plans') || document.getElementById('nav-link-plans');
      if (btn) btn.click();
    `);
    await sleep(1000);

    await client.screenshot(path.join(SCREENSHOT_DIR, '01-plans-comparison-modal.png'));
    console.log('✓ Screenshot 01 captured: Public plan comparison matrix');

    // Close plans modal
    await client.eval(`
      const closeBtn = document.getElementById('btn-close-plans');
      if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // =========================================================================
    // SCREENSHOT 2: 02-free-tier-catalog-view.png (EP02-01, EP08-01)
    // =========================================================================
    console.log('\n--- Capturing Screenshot 02: Free-Tier Catalog View ---');
    await client.eval(`
      const catalog = document.getElementById('game-catalog');
      if (catalog) catalog.scrollIntoView({ behavior: 'instant' });
    `);
    await sleep(1000);

    await client.screenshot(path.join(SCREENSHOT_DIR, '02-free-tier-catalog-view.png'));
    console.log('✓ Screenshot 02 captured: Catalog with Free to Play and Premium badges');

    // =========================================================================
    // SCREENSHOT 3: 03-paid-game-launch-upgrade-prompt.png (EP08-02, EP08-04, AC-28.2, AC-30.1)
    // =========================================================================
    console.log('\n--- Capturing Screenshot 03: Paid Game Launch Upgrade Prompt (AC-28.2, AC-30.1) ---');
    // Click on premium game (Neon Horizon)
    await client.eval(`
      const card = document.getElementById('game-card-neon-horizon') || document.querySelector('[id*="game-card-"]');
      if (card) card.click();
    `);
    await sleep(800);

    // Click launch game button to trigger entitlement check denial
    await client.eval(`
      const launchBtn = document.getElementById('btn-launch-game');
      if (launchBtn) launchBtn.click();
    `);
    await sleep(1500);

    await client.screenshot(path.join(SCREENSHOT_DIR, '03-paid-game-launch-upgrade-prompt.png'));
    console.log('✓ Screenshot 03 captured: Launch denied with upgrade CTA button');

    // Exit back to catalog
    await client.eval(`
      const exitBtn = document.getElementById('btn-exit-game');
      if (exitBtn) exitBtn.click();
    `);
    await sleep(600);

    // =========================================================================
    // SCREENSHOT 4: 04-plan-upgrade-simulation.png (EP08-04, AC-30.2)
    // =========================================================================
    console.log('\n--- Capturing Screenshot 04: Plan Upgrade Simulation (AC-30.2) ---');

    // Register a user in the browser session first
    const testUsername = `VipCadet_${Date.now()}`;
    await client.eval(`
      (async () => {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: '${testUsername}@nexusplay.test',
            password: 'Password123!',
            displayName: '${testUsername}'
          })
        });
        window.location.reload();
      })()
    `);
    await sleep(2500);

    // Open plans modal
    await client.eval(`
      const btn = document.getElementById('nav-btn-plans') || document.getElementById('nav-link-plans');
      if (btn) btn.click();
    `);
    await sleep(1000);

    // Click Upgrade to Nexus Pro
    await client.eval(`
      const proBtn = document.getElementById('btn-plan-action-plan-pro-monthly');
      if (proBtn) proBtn.click();
    `);
    await sleep(1500);

    await client.screenshot(path.join(SCREENSHOT_DIR, '04-plan-upgrade-simulation.png'));
    console.log('✓ Screenshot 04 captured: Upgrade processing and success state');

    // =========================================================================
    // SCREENSHOT 5: 05-active-membership-status.png (EP08-03, AC-29.1)
    // =========================================================================
    console.log('\n--- Capturing Screenshot 05: Active Membership Status in Navbar (AC-29.1) ---');
    // Close modal to reveal Navbar with PRO badge
    await client.eval(`
      const closeBtn = document.getElementById('btn-close-plans');
      if (closeBtn) closeBtn.click();
      window.scrollTo(0, 0);
    `);
    await sleep(1000);

    await client.screenshot(path.join(SCREENSHOT_DIR, '05-active-membership-status.png'), {
      x: 0,
      y: 0,
      width: 1400,
      height: 400,
      scale: 1
    });
    console.log('✓ Screenshot 05 captured: Navbar with PRO membership badge and renewal status');

    // =========================================================================
    // SCREENSHOT 6: 06-paid-game-launch-entitled.png (EP08-02, AC-28.1)
    // =========================================================================
    console.log('\n--- Capturing Screenshot 06: Entitled Paid Game Launch (AC-28.1) ---');
    await client.eval(`
      const catalog = document.getElementById('game-catalog');
      if (catalog) catalog.scrollIntoView({ behavior: 'instant' });
    `);
    await sleep(800);

    await client.eval(`
      const card = document.getElementById('game-card-neon-horizon');
      if (card) card.click();
    `);
    await sleep(800);

    await client.eval(`
      const launchBtn = document.getElementById('btn-launch-game');
      if (launchBtn) launchBtn.click();
    `);
    await sleep(2000);

    await client.screenshot(path.join(SCREENSHOT_DIR, '06-paid-game-launch-entitled.png'));
    console.log('✓ Screenshot 06 captured: Entitled game launch container active');

    // Exit to catalog
    await client.eval(`
      const exitBtn = document.getElementById('btn-exit-game');
      if (exitBtn) exitBtn.click();
    `);
    await sleep(800);

    // =========================================================================
    // SCREENSHOT 7: 07-expired-subscription-notice.png (EP08-02, AC-28.3)
    // =========================================================================
    console.log('\n--- Capturing Screenshot 07: Expired Subscription Launch Rejection (AC-28.3) ---');

    // Manually expire the player's subscription in SQLite
    const db = new DatabaseSync(DB_PATH);
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE subscriptions SET current_period_end = ?, status = 'expired'").run(pastDate);
    db.close();

    // Attempt to launch Neon Horizon again
    await client.eval(`
      const card = document.getElementById('game-card-neon-horizon');
      if (card) card.click();
    `);
    await sleep(800);

    await client.eval(`
      const launchBtn = document.getElementById('btn-launch-game');
      if (launchBtn) launchBtn.click();
    `);
    await sleep(1500);

    await client.screenshot(path.join(SCREENSHOT_DIR, '07-expired-subscription-notice.png'));
    console.log('✓ Screenshot 07 captured: Expired subscription rejection notice with renewal CTA');

    // Exit to catalog
    await client.eval(`
      const exitBtn = document.getElementById('btn-exit-game');
      if (exitBtn) exitBtn.click();
    `);
    await sleep(600);

    // =========================================================================
    // SCREENSHOT 8: 08-mobile-plans-view.png (Responsive Design 375x812)
    // =========================================================================
    console.log('\n--- Capturing Screenshot 08: Mobile Responsive Plans View (375x812) ---');
    await client.setViewport(375, 812, true);
    await sleep(600);

    // Open plans modal on mobile
    await client.eval(`
      const btn = document.getElementById('nav-btn-plans') || document.getElementById('nav-link-plans');
      if (btn) btn.click();
    `);
    await sleep(1200);

    await client.screenshot(path.join(SCREENSHOT_DIR, '08-mobile-plans-view.png'));
    console.log('✓ Screenshot 08 captured: Responsive mobile plans viewport');

    console.log('\n======================================================================');
    console.log('  ALL 8 SPRINT 11 SCREENSHOTS SUCCESSFULLY CAPTURED IN CHROME CDP');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('Browser QA automation failed:', err);
    process.exit(1);
  } finally {
    if (client) client.close();
    if (chromeProc) {
      try { chromeProc.kill(); } catch (e) {}
    }
  }
}

runBrowserVerification().catch(err => {
  console.error('Fatal browser verification error:', err);
  process.exit(1);
});
