# NexusPlay SRE Runbook — Multiplayer & Matchmaking Degradation Recovery

**Document Version:** 1.0  
**Effective Date:** 2026-10-25  
**Service Scope:** Real-Time Multiplayer Gateway, WebSocket Broker, Matchmaking Queues (`EP05-04`, `EP06-03`, `EP12-03`, `EP12-04`)  
**Target SLI/SLO:** Multiplayer Session Resumption Latency < 100ms; Matchmaking Availability >= 99.5%

---

## 1. Overview & Detection Triggers (AC-44.1)

This runbook guides on-call SRE responders during multiplayer degradation incidents, including elevated matchmaking failure rates, WebSocket connection drops, or state synchronization freezes.

### 1.1 Automated Detection Triggers
1. **Matchmaking Failure Rate Spike (`MATCHMAKING_ERROR_RATE_HIGH`):**
   - Condition: Matchmaking failure rate exceeds 5% of all queue attempts in a 5-minute sliding window (`matchmaking_errors_total`).
   - Severity: `HIGH` (P2)
2. **WebSocket Latency Degradation (`WS_LATENCY_DEGRADED`):**
   - Condition: WebSocket p95 round-trip latency exceeds 250ms or active CCU drops abruptly while process CPU remains normal.
   - Severity: `CRITICAL` (P1)
3. **Mid-Match Disconnect Surge (`DISCONNECT_SURGE`):**
   - Condition: Disconnect events exceed 20/minute or > 20% of disconnected participants fail to resume within the 60-second grace window, triggering automatic forfeits.
   - Severity: `HIGH` (P2)

---

## 2. Triage Procedures (AC-44.2)

Upon alert notification or incident declaration:

### Step 1: Check SRE Metrics & Error Counters
1. Query operational metrics endpoint:
   ```bash
   curl -s -H "Cookie: nexusplay_session=$ADMIN_SESSION" \
     http://localhost:5050/api/v1/admin/operations/metrics/matchmaking?service=matchmaking&environment=staging
   ```
2. Review failure distribution:
   - Identify whether failures are concentrated in a specific environment (`staging` vs `production`) or service (`matchmaking` vs `realtime_gateway`).
   - Inspect failure reasons: `QUEUE_TIMEOUT`, `GAME_NOT_ELIGIBLE`, `NO_OPPONENT_FOUND`, or `DATABASE_BUSY`.

### Step 2: Inspect Node.js Event Loop & WebSocket Gateway Health
1. Query process-level CPU, memory, and active WebSocket connections:
   ```bash
   curl -s -H "Cookie: nexusplay_session=$ADMIN_SESSION" \
     http://localhost:5050/api/v1/admin/operations/metrics?window=5m
   ```
2. Verify:
   - Process CPU % < 70%.
   - Database ping latency < 5ms.
   - In-memory WebSocket CCU count matches expected load.

---

## 3. Primary Mitigations & Direct-Code Fallback Mode (AC-44.2)

### Mitigation A: Drain and Reset Stale Matchmaking Queues
If queue requests are hanging or opponents are not being matched:
1. In-memory queues sweep automatically every 10 seconds; any requests older than 2 minutes are expired with `QUEUE_TIMEOUT`.
2. Sockets receive `MATCHMAKING_CANCELLED` or timeout notices and prompt clients to retry cleanly.

### Mitigation B: Re-Establish Ambient WebSocket Connectivity
If WebSockets are dropping:
1. Verify TLS certificate validity and HTTP/1.1 upgrade header proxy forwarding (`Connection: Upgrade`, `Upgrade: websocket`).
2. Sockets utilize ambient `nexusplay_session` cookies or short-lived connection tickets (`wst_...`). Verify auth session table in SQLite:
   ```sql
   SELECT COUNT(*) FROM auth_sessions WHERE revoked = 0 AND expires_at > CURRENT_TIMESTAMP;
   ```
3. If session tokens were erroneously invalidated, advise affected players to re-authenticate.

### Mitigation C: Direct-Code Fallback (Direct-Invitation Mode)
If public matchmaking queue pairing is failing, switch the platform into **Direct-Code Fallback** mode:
1. Private 2-player direct invitation codes (`EP05-01`, `EP05-02`) operate independently of the public queue.
2. Players can continue creating and joining private lobbies using 6-character cryptographic codes without relying on queue pairing algorithms.
3. If necessary, disable the public matchmaking button in UI or return HTTP 503 `MATCHMAKING_MAINTENANCE` from `POST /api/v1/matchmaking/queue`.

---

## 4. Escalation Matrix & Runbook Links (AC-44.3)

If primary mitigations do not stabilize multiplayer health within **15 minutes**:

| Escalation Level | Responsible Team / Role | Escalation Channel | Contact SLA |
|:---|:---|:---|:---:|
| **Level 1 (Triage)** | Primary On-Call SRE | `#sre-multiplayer-alerts` (Slack) | < 5 minutes |
| **Level 2 (Engineering)** | Real-Time Systems Specialist (`[SRE_MULTIPLAYER_CORE]`) | PagerDuty: `np-realtime-eng` | < 15 minutes |
| **Level 3 (Architecture)** | Principal Software Architect | Direct Escalation Phone / Secure Bridge | < 30 minutes |

### Related Deployment Rollback Runbook:
If degradation follows a recent software deployment or migration, immediately consult the staging rollback runbook:
- [Staging Deployment Rollback Runbook](file:///docs/runbooks/Staging-Deployment-Rollback-Runbook.md)
- Script: `node scripts/rollback-staging.js`

### Escalation Notification Template
```text
[INCIDENT ESCALATION - MULTIPLAYER DEGRADATION]
Incident ID: INC-MP-20261025-01
Service: Matchmaking & WebSocket Realtime Gateway
Environment: staging
Symptom: Matchmaking error rate > 5% / High Reconnect Expirations
Mitigations Attempted: Queue sweep executed, WebSocket gateway checked
Current Status: UNRESOLVED - Escalating to [SRE_MULTIPLAYER_CORE]
Channel: #sre-multiplayer-alerts
Bridge: https://meet.nexusplay.internal/sre-bridge
Rollback Runbook: Staging-Deployment-Rollback-Runbook.md
```

---

## 5. Post-Incident Validation & Sign-Off

1. Verify `matchmaking_errors_total` returns to normal baseline.
2. Confirm two automated test runs of `scripts/test-sprint09-matchmaking-recovery.js` pass with 100%.
3. File post-mortem report in `docs/reports/incident-reviews/` within 24 hours.
