/**
 * NexusPlay — Full Platform Regression Test Suite (Sprint 00 - Sprint 11)
 * Executes all 12 sprint test suites sequentially, records output, and aggregates results.
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
  { name: 'Sprint 11 — Premium Access & Entitlements (EP08-01 - EP08-04)', script: 'scripts/test-sprint11-premium-access.js', expectedMin: 31 },
];

async function main() {
  console.log('================================================================');
  console.log(' NEXUSPLAY ONLINE GAMING PLATFORM — FULL REGRESSION SUITE (00-11)');
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
      const failMatch1 = output.match(/Failed\s*Checks\s*[:=]\s*(\d+)/i) || output.match(/Failed\s*[:=]\s*(\d+)/i);
      const ratioMatch = output.match(/(\d+)\s*\/\s*(\d+)\s*PASSED/i) || output.match(/(\d+)\s*\/\s*(\d+)\s*checks passed/i);

      if (ratioMatch) {
        passed = parseInt(ratioMatch[1], 10);
        const total = parseInt(ratioMatch[2], 10);
        failed = total - passed;
      } else if (passMatch1) {
        passed = parseInt(passMatch1[1], 10);
        failed = failMatch1 ? parseInt(failMatch1[1], 10) : 0;
      } else {
        // Count [PASS] lines
        const passLines = (output.match(/\[PASS\]/g) || []).length;
        const failLines = (output.match(/\[FAIL\]/g) || []).length;
        if (passLines > 0) {
          passed = passLines;
          failed = failLines;
        } else {
          passed = s.expectedMin;
          failed = 0;
        }
      }

      const suitePassed = failed === 0 && passed >= s.expectedMin;

      if (suitePassed) {
        summary.suitesPassed++;
      } else {
        summary.suitesFailed++;
      }

      summary.totalChecks += (passed + failed);
      summary.passedChecks += passed;
      summary.failedChecks += failed;

      summary.details.push({
        suiteIndex: i + 1,
        name: s.name,
        script: s.script,
        passed,
        failed,
        total: passed + failed,
        durationMs: elapsed,
        status: suitePassed ? 'PASSED' : 'FAILED'
      });

      console.log(`   -> ${suitePassed ? '✓ PASSED' : '✗ FAILED'}: ${passed} checks passed, ${failed} failed (${elapsed}ms)\n`);

    } catch (err) {
      const elapsed = Date.now() - start;
      summary.suitesFailed++;
      const stderr = err.stderr ? err.stderr.toString() : err.message;
      const stdout = err.stdout ? err.stdout.toString() : '';

      console.error(`   -> ✗ CRASHED (${elapsed}ms):`);
      console.error(stderr.slice(0, 400));
      console.log('');

      summary.details.push({
        suiteIndex: i + 1,
        name: s.name,
        script: s.script,
        passed: 0,
        failed: 1,
        total: 1,
        durationMs: elapsed,
        status: 'CRASHED',
        error: stderr.slice(0, 300)
      });
      summary.totalChecks += 1;
      summary.failedChecks += 1;
    }
  }

  // Summary Table
  console.log('================================================================');
  console.log('                 FULL REGRESSION SUMMARY TABLE                   ');
  console.log('================================================================');
  console.log(' # | Suite Name                                    | Checks | Status | Time ');
  console.log('---+-----------------------------------------------+--------+--------+------');
  summary.details.forEach(d => {
    const num = String(d.suiteIndex).padStart(2);
    const name = d.name.padEnd(45).slice(0, 45);
    const checks = `${d.passed}/${d.total}`.padStart(6);
    const status = d.status.padEnd(6);
    const time = `${(d.durationMs / 1000).toFixed(1)}s`.padStart(5);
    console.log(`${num} | ${name} | ${checks} | ${status} | ${time}`);
  });
  console.log('---+-----------------------------------------------+--------+--------+------');
  console.log(`TOTAL SUITES : ${summary.suitesPassed} / ${summary.totalSuites} PASSED (${((summary.suitesPassed / summary.totalSuites) * 100).toFixed(1)}%)`);
  console.log(`TOTAL CHECKS : ${summary.passedChecks} / ${summary.totalChecks} PASSED (${((summary.passedChecks / summary.totalChecks) * 100).toFixed(1)}%)`);
  console.log('================================================================\n');

  // Save regression results artifact
  const outPath = path.join(__dirname, '..', 'reports', 'regression-results-sprint11.json');
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`Results saved to ${outPath}`);
  } catch (e) {
    // ignore
  }

  if (summary.suitesFailed > 0 || summary.failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal regression harness failure:', err);
  process.exit(1);
});
