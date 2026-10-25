# NexusPlay — SRE Alerting & Incident Response Runbook

**Runbook Identifier:** NP-SRE-RBK-001  
**Target Architecture:** Node.js, Express, SQLite, WebSockets  
**Primary On-Call Team:** `[SRE_CORE]`  
**Secondary / Escalation:** Incident Commander / Database Lead  
**Emergency Pager:** `pagerduty.nexusplay.internal/sre-primary`  
**Document Version:** 2.0 (Sprint 07 Final SRE Certification Baseline)  

---

## 1. Alert Lifecycle & State Model

Alerts in NexusPlay follow an automated stateful lifecycle:
```
[NOMINAL TELEMETRY]
        │ (Threshold Breach)
        ▼
   [ACTIVE] ──(Operator Acknowledgment)──► [ACKNOWLEDGED]
        │                                         │
        │ (Metric Drops Below Recovery Threshold)  │
        ▼                                         ▼
   [RESOLVED] ◄───────────────────────────────────┘
```

1. **ACTIVE:** The metric has breached its alerting threshold over the active evaluation window. Notifications are dispatched to the staging outbox / SRE pager.
2. **ACKNOWLEDGED:** An authorized operator has reviewed the incident and taken ownership via `POST /alerts/:id/acknowledge`. Cooldown prevents duplicate alerting storms.
3. **RESOLVED:** The metric has returned to the nominal operating zone below the recovery threshold. An automated recovery notification is emitted, explicitly referencing the original incident.

---

## 2. Standard Alert Catalog & Threshold Grounding

### 2.1 Rule 101: High API Error Rate Alert (`rule-high-error-rate`)
- **Severity:** `CRITICAL`
- **SLO Target:** < 1.0% 5xx server errors
- **Alerting Threshold:** >= 5.0% 5xx errors over a 5-minute rolling window (Approved Provisional Staging Default)
- **Auto-Recovery Threshold:** < 2.0% 5xx errors over a 5-minute rolling window (Approved Provisional Staging Default)
- **Designated Recipient:** `[SRE_CORE]` (`sre-oncall@nexusplay.internal`)
- **Root Cause Hypotheses:**
  - Upstream process crash or unhandled promise rejection in route handlers.
  - SQLite database locking / write contention during high authentication volume.
  - Candidate deployment error introducing broken API routes or unhandled exceptions.
- **Diagnostic Procedure:**
  1. Inspect the Operations Dashboard error card and terminal console logs.
  2. Query recent error distribution:
     ```bash
     node -e "const { getMetricsService } = require('./server/src/modules/operations/metricsService'); console.log(getMetricsService().getMetrics('5m').availability);"
     ```
  3. Inspect recent SQLite audit events (`audit_events`) for anomalous administrative or catalog changes.
  4. If errors coincide with a recent staging deployment, invoke the automated rollback procedure (Runbook Ref: `NP-SRE-RBK-002`).

### 2.2 Rule 102: High API Latency P95 Alert (`rule-high-latency`)
- **Severity:** `WARNING`
- **SLO Target:** p95 latency < 500ms
- **Alerting Threshold:** p95 >= 500ms over a 5-minute rolling window
- **Auto-Recovery Threshold:** p95 < 300ms
- **Designated Recipient:** `[SRE_CORE]`
- **Root Cause Hypotheses:**
  - Heavy unindexed table scan in SQLite database.
  - Event loop blocking synchronous operations in Node.js runtime.
  - Sudden request burst / DDOS traffic saturating the single Node.js thread.
- **Diagnostic Procedure:**
  1. Inspect `system.cpuPercent` and `system.memory.rssMB` on the Operations Dashboard.
  2. Verify database ping latency: `dependencies.database.queryLatencyMs`.
  3. Check active WebSocket CCU connections: `dependencies.webSocket.activeConnections`.

### 2.3 Rule 103: Database Connectivity Degradation (`rule-database-unhealthy`)
- **Severity:** `CRITICAL`
- **Alerting Threshold:** `database.status !== "healthy"`
- **Auto-Recovery Threshold:** Query ping returns `1`
- **Designated Recipient:** Database Infrastructure On-Call
- **Root Cause Hypotheses:**
  - Disk full or permissions error on SQLite data directory (`data/platform-staging.db`).
  - Database file corruption or concurrent unmanaged lock holder.
- **Remediation Procedure:**
  1. Check disk space on staging host.
  2. Verify SQLite process lock ownership.
  3. If database file is corrupted, restore the latest verified snapshot from `data/snapshots/`.

---

## 3. Alerting Reliability & Incident Mechanics

### 3.1 Alert Deduplication & Cooldown Logic
- **Deduplication:** When an active incident continues to breach across subsequent evaluation cycles, `AlertingService.evaluateMetrics()` suppresses duplicate alert creation. It updates `lastObservedAt` on the existing alert without issuing a new alert ID or secondary alert trigger.
- **Cooldown Interval:** Active alerts will not dispatch duplicate notifications within 300 seconds (5 minutes) unless the alert transitions to RESOLVED and subsequently re-triggers.
- **False-Positive Prevention:** Error-rate evaluations require at least 10 request samples before evaluating breach criteria, preventing single-request spikes from generating spurious alerts.

### 3.2 Recovery Notification Linkage
- When an active incident drops below its recovery threshold (e.g. error rate drops below 2.0%), the system dispatches an `ALERT_RESOLVED` notification.
- **Incident Provenance:** The recovery notification explicitly references:
  - `originalAlertId`: The ID of the incident that triggered the alert.
  - `originalIncidentStartedAt`: Timestamp when the breach began.
  - `incidentDurationSeconds`: Total duration of the incident in seconds.
- This provides unambiguous correlation in PagerDuty and incident response logs without requiring manual reconciliation.

### 3.3 Incident Simulation Safeguards
- **Production Block:** Simulation endpoints (`test-trigger`, `test-resolve`, `toggle-telemetry`, and `outbox`) return `HTTP 404 Not Found` in production environments (`NODE_ENV=production`), preventing synthetic incidents from being triggered or read in production.
- **Explicit Simulation Flag:** All test-triggered alerts and notifications carry `isSimulated: true` and are prefixed with `[SIMULATED]`. They are isolated from genuine production SLI metrics and clearly identified in both the API and the Operations Dashboard.
- **CSRF Token Validation:** All state-changing simulation endpoints require a valid `X-CSRF-Token` header.
- **Authorized Outbox Transport:** Test notifications are delivered exclusively through the authorized staging test transport (`STAGING_OUTBOX`), stored in memory and audit tables without leaking into external customer channels.

### 3.4 Impact of Alert Service Restarts
- In the current single-process staging architecture, active alert state is held in-memory within `AlertingService`.
- **On Process Restart:** Active alert state resets to nominal. If the underlying fault condition persists (e.g., error rate remains above 5.0%), the first post-restart evaluation tick will detect the breach and generate a fresh active alert.
- **Audit Ledger Preservation:** All historical alert lifecycle transitions (`ALERT_TRIGGERED`, `ALERT_ACKNOWLEDGED`, `ALERT_RESOLVED`) are committed synchronously to the SQLite `audit_events` table and permanently preserved across process reboots.

---

## 4. Emergency Incident Escalation (Severity-1)

If critical alerts remain unacknowledged for > 15 minutes, or if automated rollback fails:
1. **PagerDuty Emergency Broadcast:** `pagerduty.nexusplay.internal/sre-primary`
2. **Incident Commander Slack:** `#incident-nexusplay-critical`
3. **Executive Escalation:** VP of Engineering & Principal SRE Lead
