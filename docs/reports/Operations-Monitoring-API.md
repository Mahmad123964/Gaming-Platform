# NexusPlay — Operations Monitoring & Telemetry API Specification

**Document Version:** 2.0  
**Status:** Approved for Operations & SRE (Sprint 07 Final Certification Baseline)  
**Sprint:** Sprint 07 (Phase 2 — Operations & Reliability)  
**Security Baseline:** Admin RBAC (`requireAdminRole`), Ambient HttpOnly Cookie, Strict CSRF Token Protection, Production Simulation Lockdown  

---

## 1. Overview & Architecture

The Operations Monitoring API exposes real, non-fabricated platform telemetry, health indicators, sliding-window request aggregation, and automated alerting controls to authorized operators.

### Security & Access Control
- All endpoints are nested under `/api/v1/admin/operations/`.
- Unauthenticated requests receive `HTTP 401 Unauthorized`.
- Non-administrator players receive `HTTP 403 Forbidden`.
- **Production Simulation Lockdown:** Incident simulation controls (`toggle-telemetry`, `test-trigger`, `test-resolve`, and `outbox`) are completely blocked in production environments (`NODE_ENV=production`), returning `HTTP 404 Not Found` to prevent accidental or malicious invocation.
- **CSRF Token Protection:** All state-changing simulation endpoints validate the `X-CSRF-Token` header against the ambient session cookie, rejecting invalid or missing tokens with `HTTP 403 Forbidden` (`EBADCSRFTOKEN`).
- **Telemetry Contamination Prevention:** Simulated alerts and notifications are explicitly tagged with `isSimulated: true` and prefixed with `[SIMULATED]`, preventing synthetic incidents from contaminating genuine production SLI telemetry.
- **Security Audit Logging:** All security-relevant attempts (unauthorized attempts, CSRF rejections, simulation invocations, and outbox retrievals) are immutably recorded in the SQLite `audit_events` ledger.
- Sensitive infrastructure secrets (database credentials, session tokens, passwords) are strictly excluded and redacted from telemetry payloads.

---

## 2. API Endpoints

### 2.1 Retrieve Operational Metrics
- **Method:** `GET`
- **Route:** `/api/v1/admin/operations/metrics`
- **Query Parameters:**
  - `window` (optional, default: `5m`): Aggregation window duration. Allowed values: `5m`, `15m`, `1h`, `24h`.
- **Response (HTTP 200 OK — Nominal Telemetry):**
```json
{
  "telemetryAvailable": true,
  "window": "5m",
  "windowDurationSeconds": 300,
  "windowMetadata": {
    "windowRequested": "5m",
    "isWindowTruncated": false,
    "windowCoveragePercent": 100,
    "effectiveWindowDurationSeconds": 300,
    "evictedSamplesCount": 0,
    "bufferCapacity": 10000
  },
  "timestamp": "2026-10-25T12:30:45.317Z",
  "uptimeSeconds": 487,
  "overallHealth": "HEALTHY",
  "availability": {
    "sliPercent": 100.00,
    "totalRequests": 255,
    "requestsPerSecond": 0.85,
    "successfulRequests": 255,
    "serverErrors": 0,
    "clientErrors": 2,
    "errorRatePercent": 0.00,
    "clientErrorRatePercent": 0.78
  },
  "latency": {
    "avgMs": 22.4,
    "p50Ms": 4.2,
    "p95Ms": 131.0,
    "p99Ms": 280.5,
    "minMs": 1.1,
    "maxMs": 335.6,
    "percentileMethod": "nearest-rank"
  },
  "system": {
    "cpuPercent": 0.2,
    "cpuScope": "process",
    "memory": {
      "rssMB": 53.3,
      "heapUsedMB": 14.3,
      "heapTotalMB": 16.8,
      "unit": "MB"
    },
    "nodeVersion": "v22.16.0",
    "platform": "win32",
    "architecture": "x64"
  },
  "dependencies": {
    "database": {
      "engine": "SQLite (Node.js DatabaseSync)",
      "status": "healthy",
      "queryLatencyMs": 0.1
    },
    "webSocket": {
      "status": "online",
      "activeConnections": 1
    }
  },
  "isEmptyWindow": false
}
```

- **Response (HTTP 200 OK — Telemetry Outage AC-41.3):**
```json
{
  "telemetryAvailable": false,
  "status": "TELEMETRY_UNAVAILABLE",
  "message": "Telemetry data is unavailable. Metrics collection pipeline is offline.",
  "window": "5m",
  "availability": null,
  "latency": null,
  "system": null,
  "dependencies": null,
  "timestamp": "2026-10-25T12:31:00.000Z"
}
```

- **Response (HTTP 200 OK — Truncated Window e.g. 24h Window with Incomplete History):**
```json
{
  "telemetryAvailable": true,
  "window": "24h",
  "windowDurationSeconds": 86400,
  "windowMetadata": {
    "windowRequested": "24h",
    "isWindowTruncated": true,
    "windowCoveragePercent": 1.2,
    "effectiveWindowDurationSeconds": 1037,
    "evictedSamplesCount": 0,
    "bufferCapacity": 10000
  },
  "timestamp": "2026-10-25T12:45:00.000Z",
  "uptimeSeconds": 1037,
  "overallHealth": "HEALTHY",
  "availability": {
    "sliPercent": 100.00,
    "totalRequests": 1420,
    "requestsPerSecond": 1.37,
    "successfulRequests": 1420,
    "serverErrors": 0,
    "clientErrors": 5,
    "errorRatePercent": 0.00,
    "clientErrorRatePercent": 0.35
  },
  "latency": {
    "avgMs": 18.2,
    "p50Ms": 3.8,
    "p95Ms": 85.0,
    "p99Ms": 190.2,
    "minMs": 0.9,
    "maxMs": 284.1,
    "percentileMethod": "nearest-rank"
  },
  "isEmptyWindow": false
}
```

- **Error Response (HTTP 400 Bad Request):**
```json
{
  "error": "Bad Request",
  "message": "Invalid time window '7d'. Supported windows: 5m, 15m, 1h, 24h."
}
```

---

### 2.2 Toggle Telemetry Outage (Controlled Simulation)
- **Method:** `POST`
- **Route:** `/api/v1/admin/operations/metrics/toggle-telemetry`
- **Headers:** `X-CSRF-Token: <token>`
- **Environment Restriction:** Disabled in production (`NODE_ENV=production` returns 404).
- **Body:**
```json
{
  "available": false
}
```
- **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "telemetryAvailable": false,
  "timestamp": "2026-10-25T12:31:00.000Z"
}
```
- **Audit Event Logged:** `TELEMETRY_TOGGLED`

---

### 2.3 List Operational Alerts
- **Method:** `GET`
- **Route:** `/api/v1/admin/operations/alerts`
- **Query Parameters:**
  - `status` (optional): Filter by `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`, or `ALL`.
- **Response (HTTP 200 OK):**
```json
{
  "alerts": [
    {
      "id": "ALT-0001",
      "ruleId": "rule-high-error-rate",
      "name": "High API Error Rate Alert",
      "severity": "CRITICAL",
      "status": "ACTIVE",
      "observedValue": 8.5,
      "unit": "%",
      "threshold": 5.0,
      "window": "5m",
      "service": "NexusPlay Platform API",
      "environment": "staging",
      "onCallTeam": "[SRE_CORE]",
      "runbookUrl": "/docs/runbooks/SRE-Alerting-and-Incident-Runbook.md#101-high-error-rate",
      "isSimulated": false,
      "startedAt": "2026-10-25T12:30:00.000Z",
      "lastObservedAt": "2026-10-25T12:30:15.000Z",
      "resolvedAt": null,
      "acknowledgedAt": null,
      "acknowledgedBy": null
    }
  ],
  "total": 1,
  "activeCount": 1,
  "acknowledgedCount": 0,
  "resolvedCount": 0,
  "timestamp": "2026-10-25T12:30:45.000Z"
}
```

---

### 2.4 Acknowledge Operational Alert
- **Method:** `POST`
- **Route:** `/api/v1/admin/operations/alerts/:id/acknowledge`
- **Headers:** `X-CSRF-Token: <token>`
- **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "alert": {
    "id": "ALT-0001",
    "status": "ACKNOWLEDGED",
    "acknowledgedAt": "2026-10-25T12:31:10.000Z",
    "acknowledgedBy": "admin-8dc0fd01"
  },
  "message": "Alert 'ALT-0001' acknowledged."
}
```
- **Audit Event Logged:** `ALERT_ACKNOWLEDGED`

---

### 2.5 Trigger Simulated Incident (Controlled Simulation AC-42.1)
- **Method:** `POST`
- **Route:** `/api/v1/admin/operations/alerts/test-trigger`
- **Headers:** `X-CSRF-Token: <token>`
- **Environment Restriction:** Disabled in production (`NODE_ENV=production` returns 404).
- **Body:**
```json
{
  "ruleId": "rule-high-error-rate",
  "observedValue": 8.5
}
```
- **Response (HTTP 201 Created):**
```json
{
  "success": true,
  "alert": {
    "id": "ALT-TEST-1502",
    "ruleId": "rule-high-error-rate",
    "name": "[SIMULATED] High API Error Rate Alert",
    "severity": "CRITICAL",
    "status": "ACTIVE",
    "observedValue": 8.5,
    "threshold": 5.0,
    "onCallTeam": "[SRE_CORE]",
    "isSimulated": true
  },
  "message": "Controlled incident alert triggered successfully."
}
```
- **Audit Event Logged:** `SIMULATION_TRIGGERED`

---

### 2.6 Resolve Active Incident (Controlled Simulation AC-42.3)
- **Method:** `POST`
- **Route:** `/api/v1/admin/operations/alerts/test-resolve`
- **Headers:** `X-CSRF-Token: <token>`
- **Environment Restriction:** Disabled in production (`NODE_ENV=production` returns 404).
- **Body:**
```json
{
  "ruleId": "rule-high-error-rate",
  "observedValue": 0.4
}
```
- **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "alert": {
    "id": "ALT-TEST-1502",
    "status": "RESOLVED",
    "resolvedAt": "2026-10-25T12:32:00.000Z",
    "isSimulated": true
  },
  "message": "Controlled incident alert resolved."
}
```
- **Audit Event Logged:** `SIMULATION_RESOLVED`

---

### 2.7 Inspect Staging Notification Outbox
- **Method:** `GET`
- **Route:** `/api/v1/admin/operations/alerts/outbox`
- **Environment Restriction:** Disabled in production (`NODE_ENV=production` returns 404).
- **Security:** Requires `requireAdminRole`.
- **Response (HTTP 200 OK):**
```json
{
  "outbox": [
    {
      "id": "NOTIF-1792931500000",
      "alertId": "ALT-TEST-1502",
      "ruleId": "rule-high-error-rate",
      "type": "ALERT_TRIGGERED",
      "severity": "CRITICAL",
      "title": "[CRITICAL] [SIMULATED] High API Error Rate Alert (ALERT_FIRED)",
      "recipient": "sre-oncall@nexusplay.internal",
      "onCallTeam": "[SRE_CORE]",
      "environment": "staging",
      "observedValue": "8.5 %",
      "threshold": 5.0,
      "delivered": true,
      "transport": "STAGING_OUTBOX",
      "isSimulated": true
    },
    {
      "id": "NOTIF-1792931560000",
      "alertId": "ALT-TEST-1502",
      "originalAlertId": "ALT-TEST-1502",
      "originalIncidentStartedAt": "2026-10-25T12:30:00.000Z",
      "incidentDurationSeconds": 60,
      "ruleId": "rule-high-error-rate",
      "type": "ALERT_RESOLVED",
      "severity": "CRITICAL",
      "title": "[RESOLVED] [SIMULATED] High API Error Rate Alert (RECOVERED)",
      "recipient": "sre-oncall@nexusplay.internal",
      "onCallTeam": "[SRE_CORE]",
      "environment": "staging",
      "observedValue": "0.4 %",
      "threshold": 5.0,
      "delivered": true,
      "transport": "STAGING_OUTBOX",
      "isSimulated": true
    }
  ],
  "timestamp": "2026-10-25T12:32:05.000Z"
}
```
- **Audit Event Logged:** `OUTBOX_ACCESSED`

---

### 2.8 Deployment & Rollback Status (EP13-02)
- **Method:** `GET`
- **Route:** `/api/v1/admin/operations/deployment/status`
- **Response (HTTP 200 OK):**
```json
{
  "environment": "staging",
  "currentRelease": {
    "id": "dep-1792931597292",
    "version": "v0.7.0",
    "gitCommit": "5e122fb4...",
    "artifactHash": "9a94c4ac10f898c841a22920b81e3fe228fd8558e1ceb6a8b7729cd1b331bc44",
    "isRollback": false,
    "status": "SUCCESS"
  },
  "lastKnownGood": {
    "id": "dep-1792922709726",
    "version": "v0.7.0",
    "gitCommit": "5e122fb4...",
    "artifactHash": "9a94c4ac10f898c841a22920b81e3fe228fd8558e1ceb6a8b7729cd1b331bc44",
    "status": "SUCCESS"
  },
  "rollbackProcedureUrl": "/docs/runbooks/Staging-Deployment-and-Rollback-Runbook.md",
  "timestamp": "2026-10-25T12:33:00.000Z"
}
```
