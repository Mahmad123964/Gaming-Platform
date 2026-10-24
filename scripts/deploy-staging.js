const { spawn, execSync } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { runSmokeTests } = require('./smoke-test');
const { getDb } = require('../server/src/db');

const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=');
    acc[key] = val || true;
  }
  return acc;
}, {});

const PORT = parseInt(args.port || '5050', 10);
const SIMULATE_FAILURE = args['simulate-failure'] === true;
const KEEP_RUNNING = args['keep-running'] === true;

async function waitForServer(port, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, { timeout: 1000 }, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
      });
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 400));
    }
  }
  throw new Error(`Server failed to start and respond on port ${port} within timeout`);
}

function getGitCommitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'initial-commit-uncommitted';
  }
}

async function runPipeline() {
  const pipelineStartTime = Date.now();
  const timestampIso = new Date().toISOString();
  const commitSha = getGitCommitSha();
  const deploymentId = `dep-${Date.now()}`;
  const logs = [];

  function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    console.log(entry);
    logs.push(entry);
  }

  log(`======================================================================`);
  log(`  ONLINE GAMING PLATFORM — STAGING DEPLOYMENT PIPELINE (EP13-01)`);
  log(`  Deployment ID : ${deploymentId}`);
  log(`  Commit SHA    : ${commitSha}`);
  log(`  Environment   : STAGING`);
  log(`  Target Port   : ${PORT}`);
  if (SIMULATE_FAILURE) {
    log(`  ⚠️ SIMULATE_FAILURE: Negative test mode enabled (Validating AC-45.2)`);
  }
  log(`======================================================================`);

  log(`[Step 1/5] Running pre-flight environment and dependency verification...`);
  log(`Node.js Runtime: ${process.version}`);
  log(`Platform OS: ${process.platform} (${process.arch})`);

  log(`[Step 2/5] Initializing Staging Database & executing schema migration...`);
  process.env.NODE_ENV = 'staging';
  const db = getDb();
  const dbHealthy = db.healthCheck();
  if (!dbHealthy) {
    throw new Error('Database initialization failed during staging migration phase');
  }
  log(`Database schema verified: Connected and healthy.`);

  log(`[Step 2.5/5] Compiling React 19 + TypeScript frontend bundle via Vite (ADR-0002)...`);
  try {
    execSync('npm run build', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    log(`Frontend build verified: compiled bundle written to client/dist/`);
  } catch (err) {
    throw new Error(`Frontend compilation failed: ${err.message}`);
  }

  log(`[Step 3/5] Starting Staging Application Server on port ${PORT}...`);
  const serverProcess = spawn('node', [
    path.join(__dirname, '..', 'server', 'src', 'index.js'),
    `--port=${PORT}`,
    `--env=staging`
  ], {
    env: { ...process.env, NODE_ENV: 'staging', PORT: PORT.toString() },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', data => {
    // optional stream log
  });

  serverProcess.stderr.on('data', data => {
    console.error(`[SERVER ERR] ${data.toString()}`);
  });

  try {
    log(`Waiting for server readiness probe on http://localhost:${PORT}/health...`);
    await waitForServer(PORT);
    log(`Staging server is ONLINE and responding.`);

    log(`[Step 4/5] Executing Automated Smoke Test Suite against Staging...`);
    const { allPassed, resultPayload } = await runSmokeTests({
      port: PORT,
      simulateFailure: SIMULATE_FAILURE
    });

    log(`[Step 5/5] Evaluating deployment release outcome...`);

    const durationMs = Date.now() - pipelineStartTime;
    const releaseStatus = allPassed ? 'SUCCESS' : 'FAILED';

    // Record deployment in database
    try {
      db.run(
        `INSERT INTO deployments (id, environment, commit_sha, status, triggered_by, smoke_test_passed, duration_ms, details_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deploymentId,
          'staging',
          commitSha,
          releaseStatus,
          'Google Antigravity Pipeline Agent',
          allPassed ? 1 : 0,
          durationMs,
          JSON.stringify(resultPayload)
        ]
      );
      log(`Recorded deployment in database audit ledger (ID: ${deploymentId}).`);
    } catch (e) {
      log(`Warning: Could not record deployment to DB: ${e.message}`);
    }

    // Save logs to evidence folder
    const logDir = path.join(__dirname, '..', 'evidence', 'sprint-00', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFilename = `staging-deploy-${releaseStatus.toLowerCase()}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    fs.writeFileSync(path.join(logDir, logFilename), logs.join('\n'));

    // Save final staging-release.json artifact
    const releaseRecord = {
      deploymentId,
      commitSha,
      environment: 'staging',
      status: releaseStatus,
      smokeTestPassed: allPassed,
      durationMs,
      timestamp: timestampIso,
      port: PORT,
      testSummary: {
        totalChecks: resultPayload.checks.length,
        passed: resultPayload.passedCount,
        failed: resultPayload.failedCount
      },
      logFile: logFilename
    };

    const releaseArtifactPath = path.join(__dirname, '..', 'evidence', 'sprint-00', 'staging-release.json');
    fs.writeFileSync(releaseArtifactPath, JSON.stringify(releaseRecord, null, 2));

    if (!allPassed) {
      log(`❌ [PIPELINE ABORTED] Smoke test failed. Staging release marked as FAILED (AC-45.2).`);
      log(`Release artifact saved: ${releaseArtifactPath}`);
      serverProcess.kill();
      process.exit(1);
    }

    log(`✅ [PIPELINE SUCCESS] All smoke checks passed. Staging release marked as SUCCESS (AC-45.1, AC-45.3).`);
    log(`Duration: ${durationMs}ms | Release Artifact: ${releaseArtifactPath}`);

    if (!KEEP_RUNNING) {
      serverProcess.kill();
    } else {
      log(`Staging server left running on port ${PORT} as requested.`);
    }

    process.exit(0);

  } catch (err) {
    log(`❌ [PIPELINE CRITICAL ERROR]: ${err.message}`);
    serverProcess.kill();
    process.exit(1);
  }
}

runPipeline();
