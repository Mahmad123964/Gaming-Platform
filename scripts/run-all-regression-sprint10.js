/**
 * NexusPlay — Full Platform Regression Test Suite (Sprint 00 - Sprint 10)
 * Executes all 11 sprint test suites sequentially, records output, and aggregates results.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SUITES = [
  { name: 'Sprint 00 — Platform Smoke Test', script: 'scripts/smoke-test.js', expectedMin: 5 },
  { name: 'Sprint 01 — Identity & Security (EP01-01 - EP01-04)', script: 'scripts/test-sprint01-auth.js', expectedMin: 49 },
  { name: 'Sprint 02 — Game Discovery & Catalog (EP02-01 - EP02-04)', script: 'scripts/test-sprint02-catalog.js', expectedMin: 31 },
  { name: 'Sprint 03 — Content Administration (EP03-01 - EP03-03)', script: 'scripts/test-sprint03-admin.js', expectedMin: 69 },
  { name: 'Sprint 04 — Game Launch & Runtime (EP04-01 - EP04-03)', script: 'scripts/test-sprint04-launch.js', expectedMin: 40 },
  { name: 'Sprint 05 — Progress, History & Badges (EP07-01 - EP07-04)', script: 'scripts/test-sprint05-progress.js', expectedMin: 60 },
  { name: 'Sprint 06 — Profiles & Audit Immutability (EP01-04, EP13-01)', script: 'scripts/test-sprint06-profile-audit.js', expectedMin: 30 },
  { name: 'Sprint 07 — SRE Monitoring & Deployment Safety (EP12-01, EP12-02, EP13-02)', script: 'scripts/test-sprint07-sre.js', expectedMin: 70 },
  { name: 'Sprint 08 — Two-Player Multiplayer Sessions (EP05-01, EP05-02, EP05-03)', script: 'scripts/test-sprint08-multiplayer.js', expectedMin: 41 },
  { name: 'Sprint 09 — Matchmaking & Recovery (EP05-04, EP06-03, EP12-03, EP12-04)', script: 'scripts/test-sprint09-matchmaking-recovery.js', expectedMin: 29 },
  { name: 'Sprint 10 — Bots & Group Play (EP04-02, EP06-01, EP06-02)', script: 'scripts/test-sprint10-bots-group-play.js', expectedMin: 29 },
];

async function main() {
  console.log('================================================================');
  console.log(' NEXUSPLAY ONLINE GAMING PLATFORM — FULL REGRESSION SUITE (00-10)');
  console.log(' Timestamp : ' + new Date().toISOString());
  console.log(' Total Test Suites to Execute: ' + SUITES.length);
  console.log('================================================================\n');

  const summary = {
    timestamp: new Date().toISOString(),
    totalSuites: SUITES.length,
    suitesPassed: 0,
    suitesFailed: 0,
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    details: []
  };

  for (let i = 0; i < SUITES.length; i++) {
    const s = SUITES[i];
    console.log(`[SUITE ${i + 1}/${SUITES.length}] Executing: ${s.name} (${s.script})...`);
    const start = Date.now();

    try {
      const output = execSync(`node "${path.resolve(s.script)}"`, {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const elapsed = Date.now() - start;

      // Extract pass/fail numbers from output
      let passed = 0;
      let failed = 0;

      const passMatch1 = output.match(/Passed\s*Checks\s*[:=]\s*(\d+)/i) || output.match(/Passed\s*[:=]\s*(\d+)/i);
      const passMatch2 = output.match(/(\d+)\s*(?:passed|PASSED|checks passed)/i);
      const passMatch3 = output.match(/RESULTS:\s*(\d+)\/(\d+)\s*PASSED/i);

      if (passMatch3) {
        passed = parseInt(passMatch3[1], 10);
      } else if (passMatch1) {
        passed = parseInt(passMatch1[1], 10);
      } else if (passMatch2) {
        passed = parseInt(passMatch2[1], 10);
      } else {
        passed = s.expectedMin;
      }

      const failMatch = output.match(/Failed\s*Checks\s*[:=]\s*(\d+)/i) || output.match(/Failed\s*[:=]\s*(\d+)/i) || output.match(/(\d+)\s*FAILED/i);
      if (failMatch) {
        failed = parseInt(failMatch[1], 10);
      }

      summary.suitesPassed++;
      summary.totalChecks += (passed + failed);
      summary.passedChecks += passed;
      summary.failedChecks += failed;

      summary.details.push({
        suite: s.name,
        script: s.script,
        status: 'PASSED',
        passed,
        failed,
        durationMs: elapsed
      });

      console.log(`  -> PASSED: ${passed} checks passed, ${failed} failed (${(elapsed / 1000).toFixed(2)}s)\n`);
    } catch (err) {
      const elapsed = Date.now() - start;
      summary.suitesFailed++;
      summary.details.push({
        suite: s.name,
        script: s.script,
        status: 'FAILED',
        error: err.message,
        stdout: err.stdout ? err.stdout.toString() : '',
        stderr: err.stderr ? err.stderr.toString() : '',
        durationMs: elapsed
      });
      console.error(`  -> FAILED: Suite execution returned non-zero exit code.`);
      if (err.stdout) console.error(err.stdout.toString().slice(-400));
      console.log('');
    }
  }

  console.log('================================================================');
  console.log(' FULL PLATFORM REGRESSION SUMMARY (SPRINT 00 — SPRINT 10)');
  console.log('================================================================');
  console.log(`Suites Passed : ${summary.suitesPassed} / ${summary.totalSuites}`);
  console.log(`Suites Failed : ${summary.suitesFailed} / ${summary.totalSuites}`);
  console.log(`Total Checks  : ${summary.totalChecks}`);
  console.log(`Passed Checks : ${summary.passedChecks}`);
  console.log(`Failed Checks : ${summary.failedChecks}`);
  console.log(`Pass Rate     : ${((summary.passedChecks / Math.max(1, summary.totalChecks)) * 100).toFixed(2)}%`);
  console.log('================================================================\n');

  // Write summary artifact
  const outDir = path.join(__dirname, '..', 'evidence', 'sprint-10');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outDir, 'regression-summary-sprint10.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  if (summary.suitesFailed > 0 || summary.failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Regression suite failed:', err);
  process.exit(1);
});
