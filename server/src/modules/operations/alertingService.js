const { getMetricsService } = require('./metricsService');
const { getDb } = require('../../db');

class AlertingService {
  constructor(metricsService) {
    this.metricsService = metricsService || getMetricsService();
    this.alerts = new Map(); // id -> alert object
    this.outbox = []; // staging notification outbox
    this.alertCounter = 1;

    // Default approved alert rules and thresholds
    this.rules = [
      {
        id: 'rule-high-error-rate',
        name: 'High API Error Rate Alert',
        severity: 'CRITICAL',
        window: '5m',
        threshold: 5.0, // 5% 5xx error rate threshold (AC-42.1)
        recoveryThreshold: 2.0, // resolves below 2% (AC-42.3)
        onCallTeam: '[SRE_CORE]',
        runbookUrl: '/docs/runbooks/SRE-Alerting-and-Incident-Runbook.md#101-high-error-rate',
        evaluator: (metrics) => {
          if (!metrics || !metrics.telemetryAvailable || !metrics.availability) return { breach: false, value: 0 };
          const rate = metrics.availability.errorRatePercent || 0;
          return { breach: rate >= 5.0, value: rate, unit: '%' };
        },
        recoverer: (metrics) => {
          if (!metrics || !metrics.telemetryAvailable || !metrics.availability) return false;
          return (metrics.availability.errorRatePercent || 0) < 2.0;
        }
      },
      {
        id: 'rule-high-latency',
        name: 'High API Latency P95 Alert',
        severity: 'WARNING',
        window: '5m',
        threshold: 500, // 500ms p95 latency
        recoveryThreshold: 300,
        onCallTeam: 'Platform SRE On-Call',
        runbookUrl: '/docs/runbooks/SRE-Alerting-and-Incident-Runbook.md#102-high-latency',
        evaluator: (metrics) => {
          if (!metrics || !metrics.telemetryAvailable || !metrics.latency) return { breach: false, value: 0 };
          const p95 = metrics.latency.p95Ms || 0;
          return { breach: p95 >= 500, value: p95, unit: 'ms' };
        },
        recoverer: (metrics) => {
          if (!metrics || !metrics.telemetryAvailable || !metrics.latency) return false;
          return (metrics.latency.p95Ms || 0) < 300;
        }
      },
      {
        id: 'rule-database-unhealthy',
        name: 'Database Connectivity Degradation',
        severity: 'CRITICAL',
        window: '5m',
        threshold: 1, // binary degraded
        recoveryThreshold: 0,
        onCallTeam: 'Database Infrastructure On-Call',
        runbookUrl: '/docs/runbooks/SRE-Alerting-and-Incident-Runbook.md#103-database-degradation',
        evaluator: (metrics) => {
          if (!metrics || !metrics.telemetryAvailable || !metrics.dependencies?.database) return { breach: false, value: 0 };
          const status = metrics.dependencies.database.status;
          return { breach: status !== 'healthy', value: status, unit: 'status' };
        },
        recoverer: (metrics) => {
          if (!metrics || !metrics.telemetryAvailable || !metrics.dependencies?.database) return false;
          return metrics.dependencies.database.status === 'healthy';
        }
      }
    ];
  }

  evaluateRules() {
    const metrics = this.metricsService.getMetrics('5m');
    const results = [];

    for (const rule of this.rules) {
      const evaluation = rule.evaluator(metrics);
      const existingAlert = Array.from(this.alerts.values()).find(
        a => a.ruleId === rule.id && (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
      );

      if (evaluation.breach) {
        // AC-42.1: Threshold breached -> Generate alert or update existing
        if (!existingAlert) {
          const alertId = `ALT-${String(this.alertCounter++).padStart(4, '0')}`;
          const newAlert = {
            id: alertId,
            ruleId: rule.id,
            name: rule.name,
            severity: rule.severity,
            status: 'ACTIVE',
            observedValue: evaluation.value,
            unit: evaluation.unit,
            threshold: rule.threshold,
            window: rule.window,
            service: 'NexusPlay Platform API',
            environment: 'staging',
            onCallTeam: rule.onCallTeam,
            runbookUrl: rule.runbookUrl,
            startedAt: new Date().toISOString(),
            lastObservedAt: new Date().toISOString(),
            resolvedAt: null,
            acknowledgedAt: null,
            acknowledgedBy: null
          };
          this.alerts.set(alertId, newAlert);
          this._dispatchNotification(newAlert, 'ALERT_FIRED');
          results.push({ ruleId: rule.id, action: 'ALERT_FIRED', alert: newAlert });
        } else {
          existingAlert.lastObservedAt = new Date().toISOString();
          existingAlert.observedValue = evaluation.value;
          results.push({ ruleId: rule.id, action: 'ALERT_UPDATED', alert: existingAlert });
        }
      } else {
        // AC-42.2: Condition normal -> No breach alert generated
        // AC-42.3: If previously firing alert meets recovery condition, resolve it
        if (existingAlert && rule.recoverer(metrics)) {
          existingAlert.status = 'RESOLVED';
          existingAlert.resolvedAt = new Date().toISOString();
          this._dispatchNotification(existingAlert, 'ALERT_RESOLVED');
          results.push({ ruleId: rule.id, action: 'ALERT_RESOLVED', alert: existingAlert });
        } else {
          results.push({ ruleId: rule.id, action: 'NO_BREACH', alert: null });
        }
      }
    }

    return results;
  }

  _dispatchNotification(alert, eventType) {
    const isRecovery = eventType === 'ALERT_RESOLVED';
    const incidentDurationSeconds = (isRecovery && alert.startedAt && alert.resolvedAt)
      ? Math.max(0, Math.round((new Date(alert.resolvedAt).getTime() - new Date(alert.startedAt).getTime()) / 1000))
      : 0;

    const notification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      alertId: alert.id,
      originalAlertId: alert.id,
      originalIncidentStartedAt: alert.startedAt,
      ruleId: alert.ruleId,
      type: isRecovery ? 'ALERT_RESOLVED' : 'ALERT_TRIGGERED',
      eventType,
      severity: alert.severity,
      title: `[${alert.severity}] ${alert.name} (${eventType})`,
      recipient: 'sre-oncall@nexusplay.internal',
      onCallTeam: alert.onCallTeam,
      environment: alert.environment,
      observedValue: `${alert.observedValue}${alert.unit ? ' ' + alert.unit : ''}`,
      threshold: alert.threshold,
      isSimulated: alert.isSimulated === true,
      timestamp: new Date().toISOString(),
      resolvedAt: isRecovery ? (alert.resolvedAt || new Date().toISOString()) : null,
      incidentDurationSeconds: isRecovery ? incidentDurationSeconds : null,
      delivered: true,
      transport: 'STAGING_OUTBOX'
    };
    this.outbox.unshift(notification);
    if (this.outbox.length > 200) this.outbox.pop();

    // Log to audit events if DB available
    try {
      const db = getDb();
      db.run(
        `INSERT INTO audit_events (id, actor_id, action, resource, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `aud-alt-${Date.now()}`,
          'system:monitoring',
          eventType === 'ALERT_FIRED' ? 'ALERT_TRIGGERED' : 'ALERT_RESOLVED',
          `alert:${alert.id}`,
          JSON.stringify({
            ruleId: alert.ruleId,
            name: alert.name,
            severity: alert.severity,
            observedValue: alert.observedValue,
            threshold: alert.threshold,
            onCallTeam: alert.onCallTeam,
            isSimulated: alert.isSimulated === true,
            originalAlertId: alert.id,
            originalIncidentStartedAt: alert.startedAt,
            incidentDurationSeconds: isRecovery ? incidentDurationSeconds : null
          }),
          new Date().toISOString()
        ]
      );
    } catch (e) {
      // ignore
    }
  }

  acknowledgeAlert(alertId, actorId = 'operator') {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      const err = new Error(`Alert '${alertId}' not found`);
      err.status = 404;
      throw err;
    }
    if (alert.status !== 'ACTIVE') {
      const err = new Error(`Alert '${alertId}' is already ${alert.status}`);
      err.status = 400;
      throw err;
    }
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = actorId;
    return alert;
  }

  getAlerts(filterStatus = null) {
    const all = Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    if (filterStatus) {
      return all.filter(a => a.status === filterStatus.toUpperCase());
    }
    return all;
  }

  getActiveAlerts() {
    return this.getAlerts('ACTIVE');
  }

  evaluateMetrics(metrics) {
    const breaches = [];
    for (const rule of this.rules) {
      const evaluation = rule.evaluator({ telemetryAvailable: true, ...metrics });
      if (evaluation.breach) {
        breaches.push({ ruleId: rule.id, value: evaluation.value });
      }
    }
    return breaches;
  }

  triggerAlert(ruleId = 'rule-high-error-rate', customValue = 12.5) {
    const existing = Array.from(this.alerts.values()).find(
      a => a.ruleId === ruleId && (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
    );
    if (existing) {
      existing.lastObservedAt = new Date().toISOString();
      existing.observedValue = customValue;
      return existing;
    }
    return this.testTriggerAlert({ ruleId, customValue });
  }

  getOutbox() {
    return this.outbox;
  }

  // Controlled test trigger for QA simulation and testing negative paths (Task 3)
  testTriggerAlert({ ruleId = 'rule-high-error-rate', customValue, observedValue }) {
    const rule = this.rules.find(r => r.id === ruleId) || this.rules[0];
    const val = customValue !== undefined ? customValue : (observedValue !== undefined ? observedValue : 12.5);
    const alertId = `ALT-TEST-${Date.now().toString().slice(-4)}`;
    const testAlert = {
      id: alertId,
      ruleId: rule.id,
      name: `[SIMULATED] ${rule.name}`,
      severity: rule.severity,
      status: 'ACTIVE',
      observedValue: val,
      unit: '%',
      threshold: rule.threshold,
      window: rule.window,
      service: 'NexusPlay Platform API',
      environment: 'staging',
      onCallTeam: rule.onCallTeam,
      runbookUrl: rule.runbookUrl,
      isSimulated: true, // Explicit simulation flag to avoid SLI contamination
      startedAt: new Date().toISOString(),
      lastObservedAt: new Date().toISOString(),
      resolvedAt: null,
      acknowledgedAt: null,
      acknowledgedBy: null
    };
    this.alerts.set(alertId, testAlert);
    this._dispatchNotification(testAlert, 'ALERT_FIRED');
    return testAlert;
  }

  testResolveAlert(alertId, ruleId) {
    let alert = null;
    if (alertId) {
      alert = this.alerts.get(alertId);
    } else if (ruleId) {
      alert = Array.from(this.alerts.values()).find(
        a => a.ruleId === ruleId && (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
      );
    } else {
      alert = Array.from(this.alerts.values()).find(
        a => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED'
      );
    }
    if (!alert) {
      const err = new Error(`No active alert found to resolve`);
      err.status = 404;
      throw err;
    }
    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date().toISOString();
    this._dispatchNotification(alert, 'ALERT_RESOLVED');
    return alert;
  }

  clearAlerts() {
    this.alerts.clear();
    this.outbox = [];
  }
}

// Singleton instance
let alertInstance = null;
function getAlertingService() {
  if (!alertInstance) {
    alertInstance = new AlertingService();
  }
  return alertInstance;
}

module.exports = {
  AlertingService,
  getAlertingService
};
