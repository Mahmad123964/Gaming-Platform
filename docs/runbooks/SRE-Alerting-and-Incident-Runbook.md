# NexusPlay — SRE Alerting & Incident Response Runbook

**Runbook Identifier:** NP-SRE-RBK-001  
**Target Architecture:** Node.js, Express, SQLite, WebSockets  
**Primary On-Call Team:** `[SRE_CORE]`  
**Secondary / Escalation:** Incident Commander / Database Lead  
**Emergency Pager:** `pagerduty.nexusplay.internal/sre-primary`  

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
2. **ACKNOWLEDGED:** An authorized operator has reviewed the incident and taken ownership. Cooldown prevents duplicate alerting storms.
3. **RESOLVED:** The metric has returned to the nominal operating zone below the recovery threshold. An automated recovery notification is emitted.

---

## 2. Standard Alert Catalog & Remediation

### 2.1 Rule 101: High API Error Rate Alert (`rule-high-error-rate`)
- **Severity:** `CRITICAL`
- **SLO Target:** < 1.0% 5xx server errors
- **Alerting Threshold:** >= 5.0% 5xx errors over a 5-minute rolling window
- **Auto-Recovery Threshold:** < 2.0% 5xx errors over a 5-minute rolling window
- **Designated Recipient:** `[SRE_CORE]` (`sre-oncall@nexusplay.internal`)
- **Root Cause Hypotheses:**
  - Upstream process crash or unhandled promise rejection.
  - SQLite database locking / write contention under high request volume.
  - Misconfigured route handler throwing unhandled 500 exceptions.
- **Diagnostic Procedure:**
  1. Inspect the Operations Dashboard error card and terminal console logs.
  2. Query recent error distribution:
     ```bash
     node -e "const { getMetricsService } = require('./server/src/modules/operations/metricsService'); console.log(getMetricsService().getMetrics('5m').availability);"
     ```
  3. Inspect recent SQLite audit events for anomalous administrative or catalog changes.
  4. If errors coincide with a recent staging deployment, invoke the automated rollback procedure (Runbook Ref: `NP-SRE-RBK-002`).

---

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

---

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

## 3. Alert Storm Prevention & Cooldown Rules

- **Deduplication:** When a rule breaches consecutively across ticks, the AlertingService maintains the existing alert ID, updates `lastObservedAt`, and suppresses duplicate paging.
- **Cooldown Interval:** Active alerts will not dispatch duplicate notifications within 300 seconds (5 minutes) unless the alert transitions to RESOLVED and re-triggers.
- **False-Positive Prevention:** Calculations require at least 10 request samples before evaluating error rates to prevent single-request 100% false positives.

---

## 4. Emergency Incident Escalation (Severity-1)

If critical alerts remain unacknowledged for > 15 minutes, or if automated rollback fails:
1. PagerDuty Emergency Broadcast: `pagerduty.nexusplay.internal/sre-primary`
2. Incident Commander Slack: `#incident-nexusplay-critical`
3. Executive Escalation: VP of Engineering & Principal SRE Lead
