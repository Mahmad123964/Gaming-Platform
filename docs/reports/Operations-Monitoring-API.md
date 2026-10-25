# NexusPlay — Operations Monitoring & Telemetry API Specification

**Document Version:** 1.0  
**Status:** Approved for Operations & SRE  
**Sprint:** Sprint 07 (Phase 2 — Operations & Reliability)  
**Security Baseline:** Admin RBAC (`requireAdminRole`), Ambient HttpOnly Cookie, CSRF Token Protected  

---

## 1. Overview & Architecture

The Operations Monitoring API exposes real, non-fabricated platform telemetry, health indicators, sliding-window request aggregation, and automated alerting controls to authorized operators.

### Security & Access Control
- All endpoints are nested under `/api/v1/admin/operations/`.
- Unauthenticated requests receive `HTTP 401 Unauthorized`.
- Non-administrator players receive `HTTP 403 Forbidden`.
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
    "errorRatePercent": 0.00
  },
  "latency": {
    "avgMs": 22.4,
    "p50Ms": 4.2,
    "p95Ms": 131.0,
    "p99Ms": 280.5,
    "minMs": 1.1,
    "maxMs": 335.6
  },
  "system": {
    "cpuPercent": 0.2,
    "memory": {
      "rssMB": 53.3,
      "heapUsedMB": 14.3,
      "heapTotalMB": 16.8
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
  }
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

- **Error Response (HTTP 400 Bad Request):**
```json
{
  "error": "Bad Request",
  "message": "Invalid time window '7d'. Supported windows: 5m, 15m, 1h, 24h."
}
```

---

### 2.2 Toggle Telemetry Outage (Fault Injection)
- **Method:** `POST`
- **Route:** `/api/v1/admin/operations/metrics/toggle-telemetry`
- **Headers:** `X-CSRF-Token: <token>`
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

---

### 2.5 Trigger Simulated Incident (AC-42.1)
- **Method:** `POST`
- **Route:** `/api/v1/admin/operations/alerts/test-trigger`
- **Headers:** `X-CSRF-Token: <token>`
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
    "severity": "CRITICAL",
    "status": "ACTIVE",
    "observedValue": 8.5,
    "threshold": 5.0,
    "onCallTeam": "[SRE_CORE]"
  },
  "message": "Controlled incident alert triggered successfully."
}
```

---

### 2.6 Resolve Active Incident (AC-42.3)
- **Method:** `POST`
- **Route:** `/api/v1/admin/operations/alerts/test-resolve`
- **Headers:** `X-CSRF-Token: <token>`
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
    "resolvedAt": "2026-10-25T12:32:00.000Z"
  },
  "message": "Controlled incident alert resolved."
}
```

---

### 2.7 Inspect Staging Notification Outbox
- **Method:** `GET`
- **Route:** `/api/v1/admin/operations/alerts/outbox`
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
      "title": "[CRITICAL] High API Error Rate Alert (ALERT_FIRED)",
      "recipient": "sre-oncall@nexusplay.internal",
      "onCallTeam": "[SRE_CORE]",
      "environment": "staging",
      "observedValue": "8.5 %",
      "threshold": 5.0,
      "delivered": true,
      "transport": "STAGING_OUTBOX"
    }
  ],
  "timestamp": "2026-10-25T12:32:05.000Z"
}
```

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
    "gitCommit": "2daf448cee5169a834912b35f4d8bb6d8c86d24e",
    "status": "SUCCESS"
  },
  "lastKnownGood": {
    "id": "dep-1792922709726",
    "version": "v0.6.0",
    "gitCommit": "66c55121c99e57d7d701eae8b954d281b7a24a3d",
    "status": "SUCCESS"
  },
  "rollbackProcedureUrl": "/docs/runbooks/Staging-Deployment-and-Rollback-Runbook.md",
  "timestamp": "2026-10-25T12:33:00.000Z"
}
```
