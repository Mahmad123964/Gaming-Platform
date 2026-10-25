# NexusPlay — Phase 2 Risk Register & Operational Architecture Report

**Document Version:** 2.1  
**Phase:** Phase 2 — Operations & Reliability  
**Sprint:** Sprint 07 Final Certification Baseline  
**Audit Date:** 2026-10-25  

---

## 1. Empirical Storage & Persistence Classification (Step 6 Audit)

During Sprint 07 Step 6, an empirical reboot-persistence audit (`scripts/verify-rate-limit-persistence.js`) was performed to resolve discrepancies regarding rate-limiting and session revocation storage.

### 1.1 Rate-Limiting Architecture: HYBRID
- **Finding:** The rate-limiting mechanism in `server/src/modules/identity/rateLimiter.js` is **HYBRID**.
- **Mechanics:** An in-memory JavaScript `Map` cache handles high-throughput microsecond lookups. Crucially, on every failed attempt, reset, or lockout state change, the limiter synchronously persists the updated record to the disk-backed SQLite table `auth_rate_limits` via:
  ```sql
  INSERT INTO auth_rate_limits (key, attempt_count, locked_until, first_attempt_at, last_attempt_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    attempt_count = excluded.attempt_count,
    locked_until = excluded.locked_until,
    last_attempt_at = excluded.last_attempt_at;
  ```
- **Reboot Verification:** Upon an abrupt process termination (simulated by clearing the in-memory `Map`), subsequent authentication requests query the underlying SQLite `auth_rate_limits` table, restoring lockout counters and remaining lockout seconds (`retryAfter: 900s`). Lockouts strictly survive server reboots.

### 1.2 Session Revocation Architecture: 100% SQLITE-PERSISTED
- **Finding:** Session revocation is **100% SQLite-persisted**.
- **Mechanics:** When a player signs out, changes password, or is terminated by an administrator, the session record in table `auth_sessions` is updated to `revoked = 1` and `revoked_at = CURRENT_TIMESTAMP`.
- **Reboot Verification:** Verification tests confirmed that revoked sessions remain permanently revoked following process reboots.

---

## 2. Phase 2 Operational Risk Register

| Risk ID | Category | Risk Description | Initial Severity | Mitigation Implemented | Residual Severity | Monitoring Mechanism |
|:---:|:---:|:---|:---:|:---|:---:|:---|
| **RSK-01** | Database | SQLite write lock contention under sudden concurrent authentication / progress spikes. | HIGH | DatabaseSync uses serialized transactions in WAL mode. Database ping latency tracked in MetricsService. | MEDIUM | `dependencies.database.queryLatencyMs` (> 25ms triggers alert) |
| **RSK-02** | Security | Distributed credential stuffing rotating IP addresses to evade IP rate limiting. | HIGH | Dual-key rate limiting enforces independent per-email lockouts across rotating IPs (verified in test `AUTH-RAT-05`). | LOW | Error rate % & 429 response volume |
| **RSK-03** | Operations | Alert storm during cascading network or database failure overloading on-call operators. | HIGH | Deduplication logic and 5-minute cooldown suppress duplicate alert dispatches while incident remains ACTIVE. | LOW | Operations Dashboard alerts count & staging outbox |
| **RSK-04** | Deployment | Candidate deployment introducing regression with unverified or metadata-only rollback. | HIGH | `scripts/rollback-staging.js` restores physical files (`client/dist`), verifies SHA-256 hash match, confirms active server serves restored release, passes smoke tests, and preserves application data. | LOW | `AC-46.1`..`AC-46.3` + `controlled-rollback-verification.json` |
| **RSK-05** | Reliability | Upstream telemetry collection outage presenting stale or fabricated metrics to operators. | MEDIUM | `telemetryAvailable` flag explicitly indicates missing telemetry and renders `--` placeholders without mock numbers. | LOW | `missing-telemetry-banner` (AC-41.3) |
| **RSK-06** | Concurrency | Single Node.js process event loop blocking under compute-heavy canvas / physics calculations. | MEDIUM | Client-side 2D Canvas offloads game rendering to client browser; backend handles lightweight JSON session events. | LOW | `system.cpuPercent` (> 85% triggers warning) |
| **RSK-07** | Telemetry | 10,000-sample circular buffer eviction under high request bursts truncating rolling windows. | MEDIUM | Circular buffer tracks `evictionCount` and computes `isWindowTruncated` and `windowCoveragePercent` in `windowMetadata`, visibly displayed on dashboard. | LOW | `windowMetadata.isWindowTruncated` & dashboard badge |
| **RSK-08** | Operations | Staging alert state in-memory reset upon unexpected Node.js process restart. | MEDIUM | All alert state transitions (`ALERT_TRIGGERED`, `ALERT_ACKNOWLEDGED`, `ALERT_RESOLVED`) are synchronously written to SQLite `audit_events`. Re-evaluating metric breaches immediately re-triggers active alert on restart. | LOW | SQLite `audit_events` ledger & process restart alerts |
| **RSK-09** | Architecture | Single-host physical file restoration not distributed across multi-node cluster. | MEDIUM | Approved for Sprint 07 single-host staging. Multi-node container image / CDN bucket rollback will be specified prior to production deployment. | MEDIUM | Pre-release staging deployment gate |
