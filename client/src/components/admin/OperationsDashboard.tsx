import React, { useState, useEffect, useCallback } from 'react';
import styles from './OperationsDashboard.module.css';
import { OperationalMetrics, OperationalAlert, TimeWindow } from '../../types/admin';
import { getCsrfToken } from '../../utils/csrf';

interface OperationsDashboardProps {
  onLog?: (msg: string, type?: 'dim' | 'green' | 'blue' | 'yellow' | 'rose') => void;
}

export const OperationsDashboard: React.FC<OperationsDashboardProps> = ({ onLog }) => {
  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('5m');
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [deploymentStatus, setDeploymentStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSimulatedMissingTelemetry, setIsSimulatedMissingTelemetry] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch metrics for chosen window
  const fetchMetrics = useCallback(async (windowVal: TimeWindow = selectedWindow) => {
    try {
      const res = await fetch(`/api/v1/admin/operations/metrics?window=${windowVal}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Access denied: Administrator privileges required.');
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data: OperationalMetrics = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch operational metrics');
    }
  }, [selectedWindow]);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/operations/alerts', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err: any) {
      // ignore non-fatal alert fetch failure
    }
  }, []);

  // Fetch deployment status
  const fetchDeployment = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/operations/deployment/status', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDeploymentStatus(data);
      }
    } catch (err) {
      // non-fatal
    }
  }, []);

  const refreshAll = useCallback(async (win: TimeWindow = selectedWindow) => {
    setIsLoading(true);
    await Promise.all([fetchMetrics(win), fetchAlerts(), fetchDeployment()]);
    setIsLoading(false);
  }, [fetchMetrics, fetchAlerts, fetchDeployment, selectedWindow]);

  useEffect(() => {
    refreshAll(selectedWindow);
    const interval = setInterval(() => {
      fetchMetrics(selectedWindow);
      fetchAlerts();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedWindow, fetchMetrics, fetchAlerts, refreshAll]);

  const handleWindowChange = (w: TimeWindow) => {
    setSelectedWindow(w);
    fetchMetrics(w);
    onLog?.(`Operational dashboard window changed to ${w}`, 'blue');
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    setActionLoading(`ack-${alertId}`);
    try {
      const res = await fetch(`/api/v1/admin/operations/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        }
      });
      if (res.ok) {
        onLog?.(`Alert ${alertId} acknowledged successfully`, 'green');
        await fetchAlerts();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to acknowledge alert');
      }
    } catch (e: any) {
      alert(`Network error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateIncident = async () => {
    setActionLoading('simulate');
    try {
      const res = await fetch('/api/v1/admin/operations/alerts/test-trigger', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({
          ruleId: 'rule-high-error-rate',
          observedValue: 8.5
        })
      });
      if (res.ok) {
        onLog?.('Controlled SRE incident simulated: Error rate breach triggered at 8.5%', 'rose');
        await fetchAlerts();
        await fetchMetrics(selectedWindow);
      }
    } catch (e: any) {
      alert(`Error triggering incident: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveAlert = async () => {
    setActionLoading('resolve');
    try {
      const res = await fetch('/api/v1/admin/operations/alerts/test-resolve', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({
          ruleId: 'rule-high-error-rate'
        })
      });
      if (res.ok) {
        onLog?.('SRE incident auto-resolved: Error rate dropped to 0.4%', 'green');
        await fetchAlerts();
        await fetchMetrics(selectedWindow);
      }
    } catch (e: any) {
      alert(`Error resolving incident: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Determine whether telemetry is missing/unavailable (AC-41.3)
  const isTelemetryUnavailable = isSimulatedMissingTelemetry || (metrics && metrics.telemetryAvailable === false);

  return (
    <section className={styles.dashboardContainer} id="sre-operations-dashboard" aria-label="SRE Operations Dashboard">
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <span className={styles.sreBadge}>SRE Operations</span>
          <h2>Platform Health & Telemetry</h2>
        </div>

        <div className={styles.headerControls}>
          {/* Time Window Filtering (AC-41.2) */}
          <div className={styles.windowButtonGroup} role="group" aria-label="Time Window Filter" id="window-filter-group">
            {(['5m', '15m', '1h', '24h'] as TimeWindow[]).map((w) => (
              <button
                key={w}
                type="button"
                id={`btn-window-${w}`}
                className={`${styles.windowButton} ${selectedWindow === w ? styles.windowButtonActive : ''}`}
                onClick={() => handleWindowChange(w)}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Missing Telemetry Simulation Toggle (AC-41.3) */}
          <button
            type="button"
            id="btn-toggle-telemetry-outage"
            className={`${styles.btnAction} ${isSimulatedMissingTelemetry ? styles.btnActionActive : ''}`}
            onClick={() => {
              const next = !isSimulatedMissingTelemetry;
              setIsSimulatedMissingTelemetry(next);
              onLog?.(
                next
                  ? 'Simulated operational telemetry outage activated (AC-41.3)'
                  : 'Simulated operational telemetry outage deactivated',
                next ? 'yellow' : 'green'
              );
            }}
            title="Simulate upstream telemetry collection outage"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
            </svg>
            <span>{isSimulatedMissingTelemetry ? 'Restore Telemetry' : 'Simulate Outage'}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            id="btn-refresh-operations"
            className={styles.btnAction}
            onClick={() => refreshAll()}
            disabled={isLoading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* AC-41.3: Telemetry Unavailable Notice */}
      {isTelemetryUnavailable && (
        <div className={styles.missingDataBanner} id="missing-telemetry-banner" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Operational telemetry is temporarily unavailable.</strong>
            <span> Metrics for window <code>{selectedWindow}</code> cannot be authoritatively calculated. Missing indicators are displayed as <code>--</code>.</span>
          </div>
        </div>
      )}

      {/* Overall Status Bar */}
      <div className={styles.statusOverviewRow} id="sre-status-bar">
        <div>
          <span>Overall Health: </span>
          {isTelemetryUnavailable ? (
            <span className={`${styles.healthPill} ${styles.healthDegraded}`} id="val-overall-health">
              DEGRADED (TELEMETRY_GAP)
            </span>
          ) : (
            <span
              className={`${styles.healthPill} ${
                metrics?.overallHealth === 'HEALTHY'
                  ? styles.healthHealthy
                  : metrics?.overallHealth === 'DEGRADED'
                  ? styles.healthDegraded
                  : styles.healthCritical
              }`}
              id="val-overall-health"
            >
              {metrics?.overallHealth || 'HEALTHY'}
            </span>
          )}
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Window: <strong style={{ color: '#00f0ff' }}>{selectedWindow}</strong>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Uptime: <strong style={{ color: '#fff' }}>{metrics?.uptimeSeconds ? `${metrics.uptimeSeconds}s` : '--'}</strong>
        </div>
        <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.8rem' }} id="val-last-updated">
          Updated: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleTimeString() : '--'}
        </div>
      </div>

      {/* Primary Metrics Grid (AC-41.1) */}
      <div className={styles.cardsGrid} id="operations-metrics-grid">
        {/* Availability SLI Card */}
        <div className={styles.metricCard} id="card-availability-sli">
          <div className={styles.cardHeader}>
            <span>Availability SLI</span>
            <span>Target: 99.5%</span>
          </div>
          <div
            className={styles.cardValue}
            id="val-availability-sli"
            style={{
              color: isTelemetryUnavailable
                ? '#94a3b8'
                : (metrics?.availability?.sliPercent ?? 100) >= 99.5
                ? '#10b981'
                : '#ef4444'
            }}
          >
            {isTelemetryUnavailable ? '--' : `${metrics?.availability?.sliPercent?.toFixed(2) ?? '100.00'}%`}
          </div>
          <div className={styles.cardSub}>
            {isTelemetryUnavailable
              ? 'Telemetry offline'
              : `${metrics?.availability?.successfulRequests ?? 0} / ${metrics?.availability?.totalRequests ?? 0} successful requests`}
          </div>
        </div>

        {/* 5xx Server Error Rate Card */}
        <div className={styles.metricCard} id="card-error-rate">
          <div className={styles.cardHeader}>
            <span>5xx Error Rate</span>
            <span>Max SLO: 1.0%</span>
          </div>
          <div
            className={styles.cardValue}
            id="val-error-rate"
            style={{
              color: isTelemetryUnavailable
                ? '#94a3b8'
                : (metrics?.availability?.errorRatePercent ?? 0) > 1.0
                ? '#ef4444'
                : '#10b981'
            }}
          >
            {isTelemetryUnavailable ? '--' : `${metrics?.availability?.errorRatePercent?.toFixed(2) ?? '0.00'}%`}
          </div>
          <div className={styles.cardSub}>
            {isTelemetryUnavailable
              ? 'Telemetry offline'
              : `${metrics?.availability?.serverErrors ?? 0} server errors in ${selectedWindow}`}
          </div>
        </div>

        {/* Total Throughput & RPS Card */}
        <div className={styles.metricCard} id="card-request-volume">
          <div className={styles.cardHeader}>
            <span>Request Volume</span>
            <span>RPS</span>
          </div>
          <div className={styles.cardValue} id="val-request-volume">
            {isTelemetryUnavailable ? '--' : metrics?.availability?.totalRequests ?? 0}
          </div>
          <div className={styles.cardSub}>
            {isTelemetryUnavailable ? 'Telemetry offline' : `${metrics?.availability?.requestsPerSecond ?? 0} req/sec`}
          </div>
        </div>

        {/* API Response Latency Card */}
        <div className={styles.metricCard} id="card-latency">
          <div className={styles.cardHeader}>
            <span>API Latency</span>
            <span>p95 Target: &lt;500ms</span>
          </div>
          <div
            className={styles.cardValue}
            id="val-latency-p95"
            style={{
              color: isTelemetryUnavailable
                ? '#94a3b8'
                : (metrics?.latency?.p95Ms ?? 0) > 500
                ? '#f59e0b'
                : '#00f0ff'
            }}
          >
            {isTelemetryUnavailable ? '--' : `${metrics?.latency?.p95Ms ?? 0}ms`}
          </div>
          <div className={styles.cardSub}>
            {isTelemetryUnavailable
              ? 'Telemetry offline'
              : `Avg: ${metrics?.latency?.avgMs ?? 0}ms | Max: ${metrics?.latency?.maxMs ?? 0}ms`}
          </div>
        </div>

        {/* CPU Utilization Card */}
        <div className={styles.metricCard} id="card-cpu">
          <div className={styles.cardHeader}>
            <span>Process CPU</span>
            <span>Limit: 85%</span>
          </div>
          <div
            className={styles.cardValue}
            id="val-cpu"
            style={{
              color: isTelemetryUnavailable
                ? '#94a3b8'
                : (metrics?.system?.cpuPercent ?? 0) > 85
                ? '#ef4444'
                : '#f1f5f9'
            }}
          >
            {isTelemetryUnavailable ? '--' : `${metrics?.system?.cpuPercent ?? 0}%`}
          </div>
          <div className={styles.cardSub}>
            {isTelemetryUnavailable ? 'Telemetry offline' : `Runtime: Node ${metrics?.system?.nodeVersion ?? ''}`}
          </div>
        </div>

        {/* Process Memory Card */}
        <div className={styles.metricCard} id="card-memory">
          <div className={styles.cardHeader}>
            <span>Resident Memory (RSS)</span>
            <span>Heap Used</span>
          </div>
          <div className={styles.cardValue} id="val-memory-rss">
            {isTelemetryUnavailable ? '--' : `${metrics?.system?.memory?.rssMB ?? 0} MB`}
          </div>
          <div className={styles.cardSub}>
            {isTelemetryUnavailable
              ? 'Telemetry offline'
              : `Heap: ${metrics?.system?.memory?.heapUsedMB ?? 0} / ${metrics?.system?.memory?.heapTotalMB ?? 0} MB`}
          </div>
        </div>

        {/* Database Health Card */}
        <div className={styles.metricCard} id="card-database">
          <div className={styles.cardHeader}>
            <span>Database Engine</span>
            <span>Query Ping</span>
          </div>
          <div
            className={styles.cardValue}
            id="val-database-status"
            style={{
              color: isTelemetryUnavailable
                ? '#94a3b8'
                : metrics?.dependencies?.database?.status === 'healthy'
                ? '#10b981'
                : '#ef4444'
            }}
          >
            {isTelemetryUnavailable ? '--' : (metrics?.dependencies?.database?.status || 'HEALTHY').toUpperCase()}
          </div>
          <div className={styles.cardSub}>
            {isTelemetryUnavailable
              ? 'Telemetry offline'
              : `${metrics?.dependencies?.database?.engine || 'SQLite'} | Ping: ${metrics?.dependencies?.database?.queryLatencyMs ?? 0}ms`}
          </div>
        </div>

        {/* WebSocket Realtime Gateway Card */}
        <div className={styles.metricCard} id="card-websocket">
          <div className={styles.cardHeader}>
            <span>WebSocket Gateway</span>
            <span>Active CCU</span>
          </div>
          <div
            className={styles.cardValue}
            id="val-ws-ccu"
            style={{
              color: isTelemetryUnavailable
                ? '#94a3b8'
                : metrics?.dependencies?.webSocket?.status === 'online'
                ? '#00f0ff'
                : '#f59e0b'
            }}
          >
            {isTelemetryUnavailable ? '--' : metrics?.dependencies?.webSocket?.activeConnections ?? 0}
          </div>
          <div className={styles.cardSub}>
            {isTelemetryUnavailable
              ? 'Telemetry offline'
              : `Status: ${(metrics?.dependencies?.webSocket?.status || 'ONLINE').toUpperCase()}`}
          </div>
        </div>
      </div>

      {/* Active Operational Alerts Section (EP12-02 / AC-42.1..42.3) */}
      <div className={styles.alertsSection} id="operational-alerts-section">
        <div className={styles.alertsHeader}>
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Active SRE Alerts & Incident Dispatch
          </h3>

          <div className={styles.incidentControls}>
            <button
              type="button"
              id="btn-simulate-incident"
              className={styles.btnSimulateAlert}
              onClick={handleSimulateIncident}
              disabled={actionLoading === 'simulate'}
              title="Trigger simulated 8.5% error rate incident (AC-42.1)"
            >
              {actionLoading === 'simulate' ? 'Firing...' : 'Simulate Incident (High Error Rate)'}
            </button>

            <button
              type="button"
              id="btn-resolve-incident"
              className={styles.btnResolveAlert}
              onClick={handleResolveAlert}
              disabled={actionLoading === 'resolve'}
              title="Trigger simulated alert recovery below threshold (AC-42.3)"
            >
              {actionLoading === 'resolve' ? 'Resolving...' : 'Auto-Resolve Active Incident'}
            </button>
          </div>
        </div>

        <div className={styles.alertsList} id="operational-alerts-list">
          {alerts.length === 0 ? (
            <div className={styles.noAlertsPlaceholder} id="no-active-alerts-msg">
              ✓ All platform telemetry within nominal operational thresholds. No active alerts.
            </div>
          ) : (
            alerts.map((al) => (
              <div
                key={al.id}
                id={`alert-card-${al.id}`}
                className={`${styles.alertItem} ${
                  al.status === 'RESOLVED'
                    ? styles.alertResolved
                    : al.severity === 'CRITICAL'
                    ? styles.alertCritical
                    : styles.alertWarning
                }`}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      className={al.severity === 'CRITICAL' ? styles.badgeCritical : styles.badgeWarning}
                      id={`badge-sev-${al.id}`}
                    >
                      {al.severity}
                    </span>
                    <span className={styles.badgeStatus} id={`badge-status-${al.id}`}>
                      {al.status}
                    </span>
                    <strong style={{ color: '#fff' }} id={`alert-name-${al.id}`}>
                      {al.name}
                    </strong>
                  </div>

                  <div className={styles.alertMeta}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      Observed: <strong style={{ color: '#ff8b8b' }}>{al.observedValue}{al.unit || ''}</strong> (Threshold: &gt; {al.threshold}{al.unit || ''})
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>•</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      On-Call: <strong style={{ color: '#00f0ff' }}>{al.onCallTeam}</strong>
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>•</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      Fired: {new Date(al.startedAt).toLocaleTimeString()}
                    </span>
                    {al.acknowledgedAt && (
                      <>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>•</span>
                        <span style={{ color: '#00f0ff', fontSize: '0.8rem' }}>
                          Acked by {al.acknowledgedBy || 'Operator'} at {new Date(al.acknowledgedAt).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.alertActions}>
                  {al.status === 'ACTIVE' && (
                    <button
                      type="button"
                      id={`btn-ack-${al.id}`}
                      className={styles.btnAcknowledge}
                      onClick={() => handleAcknowledgeAlert(al.id)}
                      disabled={actionLoading === `ack-${al.id}`}
                    >
                      {actionLoading === `ack-${al.id}` ? 'Acknowledging...' : 'Acknowledge Alert'}
                    </button>
                  )}
                  {al.runbookUrl && (
                    <a
                      href={al.runbookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.btnAction}
                      style={{ textDecoration: 'none' }}
                    >
                      Runbook ↗
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Deployment & Rollback Safety Section (EP13-02 / AC-46.1) */}
      <div className={styles.deploymentRow} id="sre-deployment-safety">
        <div>
          <strong style={{ color: '#00f0ff', display: 'block', marginBottom: '4px' }}>
            EP13-02 Deployment Safety & Rollback Verification
          </strong>
          <div className={styles.deploymentDetails}>
            <div>
              Active Staging Release: <span className={styles.codeSnippet}>v0.7.0 (Sprint 07)</span>
            </div>
            <div>
              Last-Known-Good Release: <span className={styles.codeSnippet}>{deploymentStatus?.lastKnownGood?.version || 'v0.6.0 (Sprint 06 Baseline)'}</span>
            </div>
            <div>
              Commit: <span className={styles.codeSnippet}>{deploymentStatus?.lastKnownGood?.gitCommit || '2daf448'}</span>
            </div>
            <div>
              Rollback Policy: <span style={{ color: '#10b981' }}>AUTOMATED_ON_FAILURE</span>
            </div>
          </div>
        </div>

        <div>
          <a
            href="/docs/runbooks/Staging-Deployment-and-Rollback-Runbook.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnAction}
            id="link-rollback-runbook"
            style={{ textDecoration: 'none' }}
          >
            Rollback Runbook ↗
          </a>
        </div>
      </div>
    </section>
  );
};
