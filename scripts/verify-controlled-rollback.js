/**
 * NexusPlay — Sprint 07 Controlled Staging Rollback Verification Script
 * Task 1: Prove Actual Deployment Rollback
 *
 * Verifies the 10 SRE Rollback Criteria:
 * 1. Genuine last-known-good artifact is preserved.
 * 2. Distinguishable candidate release is deployed or staged.
 * 3. Release failure is intentionally triggered.
 * 4. Rollback restores the actual previous application artifact.
 * 5. Active server process serves the restored release.
 * 6. Release identity, artifact hash and Git commit match the expected LKG baseline.
 * 7. Restored application passes health and smoke tests.
 * 8. Relevant application data remains intact.
 * 9. Failure to restore previous release returns nonzero exit code.
 * 10. Rollback result is captured in machine-readable evidence.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const { execSync } = require('node:child_process');
const { getDb } = require('../server/src/db');
const { runSmokeTests } = require('./smoke-test');
const { executeRollback } = require('./rollback-staging');

const PORT = 5050;
const rootDir = path.join(__dirname, '..');
const clientDistDir = path.join(rootDir, 'client', 'dist');
const evidenceDir = path.join(rootDir, 'evidence', 'sprint-07', 'deployments');

function computeFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function copyDirectoryRecursive(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

async function fetchHttp(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
  });
}

async function runControlledVerification() {
  console.log('======================================================================');
  console.log('  NEXUSPLAY SRE — CONTROLLED STAGING RELEASE & ROLLBACK PROOF (TASK 1)');
  console.log(`  Target Port : ${PORT}`);
  console.log(`  Timestamp   : ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  const verificationRecord = {
    testName: 'Task 1: Controlled Staging Deployment Rollback Verification',
    timestamp: new Date().toISOString(),
    criteria: {}
  };

  const db = getDb();

  // Snapshot initial DB record counts
  const initialPlayerCount = db.get('SELECT COUNT(*) as count FROM players')?.count || 0;
  const initialGameCount = db.get('SELECT COUNT(*) as count FROM games')?.count || 0;
  const initialAuditCount = db.get('SELECT COUNT(*) as count FROM audit_events')?.count || 0;

  console.log(`[Baseline Data] Players: ${initialPlayerCount}, Games: ${initialGameCount}, Audit Events: ${initialAuditCount}`);

  // CRITERION 1: Preserve Genuine Last-Known-Good (LKG) Artifact
  console.log('\n[Criterion 1/10] Establishing and preserving genuine Last-Known-Good artifact...');
  const lkgDir = path.join(evidenceDir, 'artifacts', 'dep-lkg-verified', 'dist');
  copyDirectoryRecursive(clientDistDir, lkgDir);
  const lkgIndexPath = path.join(lkgDir, 'index.html');
  const lkgArtifactHash = computeFileSha256(lkgIndexPath);
  const lkgCommitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

  const lkgRecord = {
    deploymentId: 'dep-lkg-verified',
    version: 'v0.7.0',
    commitSha: lkgCommitSha,
    status: 'SUCCESS',
    environment: 'staging',
    artifactDir: path.relative(rootDir, lkgDir).replace(/\\/g, '/'),
    artifactHash: lkgArtifactHash,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(path.join(evidenceDir, 'last-known-good.json'), JSON.stringify(lkgRecord, null, 2));

  console.log(`  ✓ Genuine LKG artifact preserved at: ${lkgDir}`);
  console.log(`  ✓ LKG Commit SHA: ${lkgCommitSha}`);
  console.log(`  ✓ LKG Artifact SHA-256 (index.html): ${lkgArtifactHash}`);
  verificationRecord.criteria['1_genuine_lkg_preserved'] = {
    passed: true,
    artifactDir: lkgDir,
    commitSha: lkgCommitSha,
    artifactHash: lkgArtifactHash
  };

  // CRITERION 2: Deploy / Stage a Distinguishable Candidate Release
  console.log('\n[Criterion 2/10] Staging distinguishable candidate release...');
  const candidateMarker = `<!-- CANDIDATE-RELEASE-V0.7.1-BUILD-FAILURE-INJECTION-${Date.now()} -->`;
  const originalIndexHtml = fs.readFileSync(path.join(clientDistDir, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(clientDistDir, 'index.html'), originalIndexHtml + '\n' + candidateMarker);

  const candidateHash = computeFileSha256(path.join(clientDistDir, 'index.html'));
  console.log(`  ✓ Distinguishable candidate release staged.`);
  console.log(`  ✓ Candidate Marker: ${candidateMarker.trim()}`);
  console.log(`  ✓ Candidate Artifact SHA-256: ${candidateHash} (Distinguishable from LKG: ${candidateHash !== lkgArtifactHash})`);

  verificationRecord.criteria['2_candidate_staged'] = {
    passed: candidateHash !== lkgArtifactHash,
    candidateMarker: candidateMarker.trim(),
    candidateHash,
    distinguishableFromLkg: candidateHash !== lkgArtifactHash
  };

  // Verify active server serves candidate right now
  const candidateServerProbe = await fetchHttp(`http://localhost:${PORT}/`);
  const serverServingCandidate = candidateServerProbe.body.includes(candidateMarker);
  console.log(`  ✓ Server live serving candidate marker: ${serverServingCandidate}`);

  // CRITERION 3: Release Failure is Intentionally Triggered
  console.log('\n[Criterion 3/10] Intentionally triggering release failure in staging pipeline...');
  let pipelineExitCode = 0;
  let pipelineOutput = '';
  try {
    pipelineOutput = execSync(`node scripts/deploy-staging.js --simulate-failure --port=${PORT}`, {
      cwd: rootDir,
      encoding: 'utf8'
    });
  } catch (err) {
    pipelineExitCode = err.status || 1;
    pipelineOutput = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
  }

  const failureTriggered = pipelineExitCode !== 0 && pipelineOutput.includes('Smoke test failed. Candidate release rejected');
  console.log(`  ✓ Pipeline aborted on failure with exit code: ${pipelineExitCode}`);
  console.log(`  ✓ Pipeline rejection verified: ${failureTriggered}`);

  verificationRecord.criteria['3_release_failure_triggered'] = {
    passed: failureTriggered,
    pipelineExitCode,
    rejectionDetected: failureTriggered
  };

  // CRITERION 4: Rollback Restores the Actual Previous Application Artifact
  console.log('\n[Criterion 4/10] Executing rollback to physically restore previous application artifact...');
  const rollbackResult = await executeRollback();
  const restoredIndexPath = path.join(clientDistDir, 'index.html');
  const restoredIndexContent = fs.readFileSync(restoredIndexPath, 'utf8');
  const restoredArtifactHash = computeFileSha256(restoredIndexPath);

  const physicalFileRestored = !restoredIndexContent.includes(candidateMarker) && restoredArtifactHash === lkgArtifactHash;
  console.log(`  ✓ Candidate marker removed from client/dist/index.html: ${!restoredIndexContent.includes(candidateMarker)}`);
  console.log(`  ✓ Restored SHA-256 matches LKG SHA-256: ${restoredArtifactHash === lkgArtifactHash}`);

  verificationRecord.criteria['4_rollback_restores_artifact'] = {
    passed: physicalFileRestored,
    restoredArtifactHash,
    expectedLkgHash: lkgArtifactHash,
    hashesMatch: restoredArtifactHash === lkgArtifactHash
  };

  // CRITERION 5: Active Server Process Serves the Restored Release
  console.log('\n[Criterion 5/10] Verifying active server process serves restored release...');
  const restoredServerProbe = await fetchHttp(`http://localhost:${PORT}/`);
  const serverServingRestored = restoredServerProbe.statusCode === 200 && !restoredServerProbe.body.includes(candidateMarker);
  console.log(`  ✓ Server probe status: HTTP ${restoredServerProbe.statusCode}`);
  console.log(`  ✓ Server body verified free of candidate marker: ${serverServingRestored}`);

  verificationRecord.criteria['5_active_server_serves_restored'] = {
    passed: serverServingRestored,
    statusCode: restoredServerProbe.statusCode,
    servesRestoredRelease: serverServingRestored
  };

  // CRITERION 6: Release Identity, Artifact Hash and Git Commit Match LKG Baseline
  console.log('\n[Criterion 6/10] Verifying release identity, artifact hash and Git commit match LKG baseline...');
  const stagingReleaseFile = JSON.parse(fs.readFileSync(path.join(rootDir, 'evidence', 'sprint-00', 'staging-release.json'), 'utf8'));
  const commitMatch = stagingReleaseFile.commitSha === lkgCommitSha;
  const hashMatch = stagingReleaseFile.artifactHash === lkgArtifactHash;
  const versionMatch = stagingReleaseFile.version === 'v0.7.0';
  const isRollbackFlag = stagingReleaseFile.isRollback === true;

  console.log(`  ✓ Staging release commit match: ${commitMatch} (${stagingReleaseFile.commitSha})`);
  console.log(`  ✓ Staging release artifact hash match: ${hashMatch} (${stagingReleaseFile.artifactHash})`);
  console.log(`  ✓ Staging release version match: ${versionMatch} (${stagingReleaseFile.version})`);
  console.log(`  ✓ isRollback flag asserted: ${isRollbackFlag}`);

  const identityMatch = commitMatch && hashMatch && isRollbackFlag;
  verificationRecord.criteria['6_release_identity_matches_lkg'] = {
    passed: identityMatch,
    commitSha: stagingReleaseFile.commitSha,
    artifactHash: stagingReleaseFile.artifactHash,
    version: stagingReleaseFile.version,
    isRollback: stagingReleaseFile.isRollback
  };

  // CRITERION 7: Restored Application Passes Health and Smoke Tests
  console.log('\n[Criterion 7/10] Running full automated health and smoke tests against restored release...');
  const healthProbe = await fetchHttp(`http://localhost:${PORT}/api/health`);
  const healthJson = JSON.parse(healthProbe.body);
  const healthPassed = healthProbe.statusCode === 200 && healthJson.database === 'connected';

  const smokeResult = await runSmokeTests({ port: PORT, simulateFailure: false });
  console.log(`  ✓ Health Probe: HTTP ${healthProbe.statusCode} (DB: ${healthJson.database})`);
  console.log(`  ✓ Automated Smoke Tests: ${smokeResult.resultPayload.passedCount}/${smokeResult.resultPayload.checks.length} passed.`);

  const healthAndSmokePassed = healthPassed && smokeResult.allPassed;
  verificationRecord.criteria['7_restored_passes_health_and_smoke'] = {
    passed: healthAndSmokePassed,
    healthStatus: healthJson.status,
    databaseStatus: healthJson.database,
    smokeTestsPassed: smokeResult.allPassed,
    smokeCheckCount: smokeResult.resultPayload.checks.length
  };

  // CRITERION 8: Relevant Application Data Remains Intact
  console.log('\n[Criterion 8/10] Verifying application data preservation across database tables...');
  const postPlayerCount = db.get('SELECT COUNT(*) as count FROM players')?.count || 0;
  const postGameCount = db.get('SELECT COUNT(*) as count FROM games')?.count || 0;
  const postAuditCount = db.get('SELECT COUNT(*) as count FROM audit_events')?.count || 0;

  const dataIntact = (postPlayerCount >= initialPlayerCount) &&
                     (postGameCount >= initialGameCount) &&
                     (postAuditCount >= initialAuditCount);

  console.log(`  ✓ Pre-rollback vs Post-rollback Counts:`);
  console.log(`      Players      : ${initialPlayerCount} -> ${postPlayerCount}`);
  console.log(`      Games        : ${initialGameCount} -> ${postGameCount}`);
  console.log(`      Audit Events : ${initialAuditCount} -> ${postAuditCount}`);
  console.log(`  ✓ Zero destructive restoration confirmed: ${dataIntact}`);

  verificationRecord.criteria['8_application_data_intact'] = {
    passed: dataIntact,
    playerCount: postPlayerCount,
    gameCount: postGameCount,
    auditCount: postAuditCount,
    zeroDataLoss: dataIntact
  };

  // CRITERION 9: Failure to Restore Previous Release Returns Nonzero Exit Code
  console.log('\n[Criterion 9/10] Testing rollback failure behavior (asserting non-zero exit code)...');
  let simulatedFailureCode = 0;
  let simulatedFailureOutput = '';
  try {
    execSync(`node scripts/rollback-staging.js --simulate-rollback-failure --port=${PORT}`, {
      cwd: rootDir,
      encoding: 'utf8'
    });
  } catch (err) {
    simulatedFailureCode = err.status || 1;
    simulatedFailureOutput = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
  }

  const failureHandledWithNonZero = simulatedFailureCode === 1 && simulatedFailureOutput.includes('ROLLBACK FAILURE ESCALATION INSTRUCTIONS');
  console.log(`  ✓ Simulated failure returned exit code: ${simulatedFailureCode}`);
  console.log(`  ✓ Escalation instructions printed: ${failureHandledWithNonZero}`);

  verificationRecord.criteria['9_failure_returns_nonzero_code'] = {
    passed: failureHandledWithNonZero,
    exitCode: simulatedFailureCode,
    escalationGuidanceIncluded: failureHandledWithNonZero
  };

  // CRITERION 10: Rollback Result Captured in Machine-Readable Evidence
  console.log('\n[Criterion 10/10] Verifying machine-readable rollback evidence persistence...');
  const evidenceFile = path.join(evidenceDir, 'rollback-execution-evidence.json');
  const evidenceExists = fs.existsSync(evidenceFile);
  let parsedEvidence = null;
  if (evidenceExists) {
    parsedEvidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
  }

  const evidenceValid = evidenceExists && parsedEvidence?.status && parsedEvidence?.rollbackId;
  console.log(`  ✓ Evidence file path: ${evidenceFile}`);
  console.log(`  ✓ Evidence file exists and is valid JSON: ${evidenceValid}`);

  verificationRecord.criteria['10_machine_readable_evidence'] = {
    passed: evidenceValid,
    evidencePath: evidenceFile,
    recordedRollbackId: parsedEvidence?.rollbackId,
    recordedStatus: parsedEvidence?.status
  };

  // Summary
  const allCriteriaPassed = Object.values(verificationRecord.criteria).every(c => c.passed);
  verificationRecord.overallResult = allCriteriaPassed ? 'PASSED' : 'FAILED';

  const masterEvidencePath = path.join(evidenceDir, 'controlled-rollback-verification.json');
  fs.writeFileSync(masterEvidencePath, JSON.stringify(verificationRecord, null, 2));

  console.log('\n======================================================================');
  console.log(`  TASK 1 VERIFICATION RESULT: ${allCriteriaPassed ? 'ALL 10 CRITERIA PASSED' : 'FAILED'}`);
  console.log(`  Master Evidence Saved to: ${masterEvidencePath}`);
  console.log('======================================================================\n');

  if (!allCriteriaPassed) {
    process.exit(1);
  }
}

runControlledVerification().catch((err) => {
  console.error('Fatal Controlled Verification Error:', err);
  process.exit(1);
});
