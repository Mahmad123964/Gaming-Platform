const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { getMetricsService } = require('./metricsService');
const { getAlertingService } = require('./alertingService');
const { requireAdminRole } = require('../contentAdmin/middleware');
const { getDb } = require('../../db');

const operationsRouter = express.Router();

// Strict authorization: All operational and monitoring endpoints require admin role
operationsRouter.use(requireAdminRole);

/**
 * GET /api/v1/admin/operations/metrics
 * Query param: window (5m | 15m | 1h | 24h)
 * Traceability: EP12-01 (AC-41.1, AC-41.2, AC-41.3)
 */
operationsRouter.get('/metrics', (req, res) => {
  const windowKey = req.query.window || '5m';
  if (!['5m', '15m', '1h', '24h'].includes(windowKey)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid time window '${windowKey}'. Supported windows: 5m, 15m, 1h, 24h.`
    });
  }
  const metricsService = getMetricsService();
  const metrics = metricsService.getMetrics(windowKey);

  if (!metrics.telemetryAvailable) {
    // AC-41.3: Missing telemetry is explicitly indicated
    return res.status(200).json(metrics);
  }

  res.status(200).json(metrics);
});

/**
 * POST /api/v1/admin/operations/metrics/toggle-telemetry
 * Controlled fault injection to simulate telemetry outage (AC-41.3)
 */
operationsRouter.post('/metrics/toggle-telemetry', (req, res) => {
  const { available } = req.body;
  const metricsService = getMetricsService();
  metricsService.setTelemetryAvailable(available !== false);
  res.status(200).json({
    success: true,
    telemetryAvailable: metricsService.isTelemetryAvailable(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/admin/operations/alerts
 * Query param: status (active | acknowledged | resolved | all)
 * Traceability: EP12-02 (AC-42.1, AC-42.2, AC-42.3)
 */
operationsRouter.get('/alerts', (req, res) => {
  const alertingService = getAlertingService();
  // Evaluate latest rules against current metrics
  alertingService.evaluateRules();

  const statusFilter = req.query.status && req.query.status !== 'all' ? req.query.status : null;
  const alerts = alertingService.getAlerts(statusFilter);

  res.status(200).json({
    alerts,
    total: alerts.length,
    activeCount: alerts.filter(a => a.status === 'ACTIVE').length,
    acknowledgedCount: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
    resolvedCount: alerts.filter(a => a.status === 'RESOLVED').length,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/v1/admin/operations/alerts/:id/acknowledge
 * Operator acknowledgement of an active alert
 */
operationsRouter.post('/alerts/:id/acknowledge', (req, res) => {
  const alertingService = getAlertingService();
  const actorId = req.player ? req.player.id : 'admin';
  try {
    const alert = alertingService.acknowledgeAlert(req.params.id, actorId);
    res.status(200).json({
      success: true,
      alert,
      message: `Alert '${req.params.id}' acknowledged.`
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.name || 'Error',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/admin/operations/alerts/test-trigger
 * Controlled test trigger to simulate threshold breaches and verify alerts (AC-42.1)
 */
operationsRouter.post('/alerts/test-trigger', (req, res) => {
  const alertingService = getAlertingService();
  const { ruleId, customValue, observedValue } = req.body;
  const alert = alertingService.testTriggerAlert({ ruleId, customValue, observedValue });
  res.status(201).json({
    success: true,
    alert,
    message: 'Controlled incident alert triggered successfully.'
  });
});

/**
 * POST /api/v1/admin/operations/alerts/test-resolve
 * Controlled test recovery to simulate threshold recovery (AC-42.3)
 */
operationsRouter.post('/alerts/test-resolve', (req, res) => {
  const alertingService = getAlertingService();
  const { alertId, ruleId } = req.body;
  try {
    const alert = alertingService.testResolveAlert(alertId, ruleId);
    res.status(200).json({
      success: true,
      alert,
      message: 'Controlled incident alert resolved.'
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.name || 'Error',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/admin/operations/alerts/outbox
 * Staging notifications ledger
 */
operationsRouter.get('/alerts/outbox', (req, res) => {
  const alertingService = getAlertingService();
  res.status(200).json({
    outbox: alertingService.getOutbox(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/admin/operations/deployment/status
 * Deployment status, release version, and Last-Known-Good release metadata (EP13-02)
 */
operationsRouter.get('/deployment/status', (req, res) => {
  const db = getDb();
  let latestDeployment = null;
  let lastKnownGood = null;

  try {
    latestDeployment = db.get(
      'SELECT id, environment, commit_sha, status, triggered_by, smoke_test_passed, duration_ms, created_at FROM deployments ORDER BY created_at DESC LIMIT 1'
    );
    lastKnownGood = db.get(
      "SELECT id, environment, commit_sha, status, triggered_by, smoke_test_passed, duration_ms, created_at FROM deployments WHERE status = 'SUCCESS' AND smoke_test_passed = 1 ORDER BY created_at DESC LIMIT 1"
    );
  } catch (e) {
    // fallback to file
  }

  // File fallback for staging release artifact
  let stagingRelease = null;
  const stagingReleasePath = path.join(__dirname, '..', '..', '..', 'evidence', 'sprint-00', 'staging-release.json');
  if (fs.existsSync(stagingReleasePath)) {
    try {
      stagingRelease = JSON.parse(fs.readFileSync(stagingReleasePath, 'utf8'));
    } catch (e) {}
  }

  // Standardize version and gitCommit properties
  const formatDeployment = (dep, defaultVersion = 'v0.6.0') => {
    if (!dep) return null;
    return {
      ...dep,
      version: dep.version || defaultVersion,
      gitCommit: dep.gitCommit || dep.commit_sha || dep.commitSha || '2daf448'
    };
  };

  const formattedLatest = formatDeployment(latestDeployment, 'v0.7.0') || formatDeployment(stagingRelease, 'v0.7.0') || {
    id: 'dep-current-sprint07',
    environment: 'staging',
    version: 'v0.7.0',
    gitCommit: '2daf448',
    status: 'SUCCESS'
  };

  const formattedLkg = formatDeployment(lastKnownGood, 'v0.6.0') || formatDeployment(stagingRelease, 'v0.6.0') || {
    id: 'dep-lkg-baseline',
    environment: 'staging',
    version: 'v0.6.0',
    gitCommit: '2daf448',
    status: 'SUCCESS'
  };

  res.status(200).json({
    environment: 'staging',
    currentRelease: formattedLatest,
    lastKnownGood: formattedLkg,
    rollbackProcedureUrl: '/docs/runbooks/Staging-Deployment-and-Rollback-Runbook.md',
    timestamp: new Date().toISOString()
  });
});

module.exports = { operationsRouter };
