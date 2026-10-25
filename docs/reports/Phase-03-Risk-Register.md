# NexusPlay — Phase 3 Risk Register & Real-Time Multiplayer Security Audit

**Document Version:** 3.0  
**Phase:** Phase 3 — Multiplayer & Real-Time Engagement  
**Sprint:** Sprint 08 — Two-Player Multiplayer Sessions  
**Audit Date:** 2026-10-25  

---

## 1. Real-Time Architecture & Threat Modeling (Sprint 08 Audit)

During Sprint 08 implementation, an extensive architectural and security evaluation was conducted across the newly introduced native WebSocket gateway, lobby management engine, and real-time state machine.

### 1.1 In-Memory Connection State vs. SQLite Persistence
- **Finding:** Sockets and room subscriptions are maintained in-memory in `RealTimeService` (`connections`, `rooms`, `socketRooms`), while lobby metadata and participant records are persisted to SQLite (`lobbies`, `lobby_participants`).
- **Resilience Analysis:** If a server process terminates unexpectedly, in-memory WebSockets close cleanly, triggering the client's reconnection loop. When the server restarts, lobbies in the `waiting` or `full` state remain intact in SQLite (until their 30-minute expiration).
- **Scope Boundary:** Sprint 08 establishes authoritative session state. Sprint 09 (`EP05-04`) will introduce graceful mid-match disconnect grace periods and state resynchronization.

### 1.2 Cross-Room Spoofing & Message Injection
- **Finding:** A malicious client could attempt to broadcast messages or eavesdrop on private lobbies.
- **Mitigation Implemented:** Strict room authorization boundaries. When a client sends `SUBSCRIBE_ROOM` or `GAME_MOVE`, the server verifies that `socket.playerId` exists in `lobby_participants` for that specific `lobbyId`. Unsubscribed or unauthorized sockets receive an `ERROR` frame (`FORBIDDEN_ROOM_ACCESS`) and their payloads are dropped.

### 1.3 Session Revocation Propagation
- **Finding:** If a player logs out or is banned while their WebSocket is connected, they could theoretically maintain a real-time connection.
- **Mitigation Implemented:** Direct integration between `AuthService.revokeSession()` and `RealTimeService.handleSessionRevocation(playerId)`. All active sockets belonging to that player are immediately issued a `SESSION_REVOKED` frame and forcibly closed via `ws.terminate()`.

### 1.4 Connection Floods & Idle Socket Resource Leaking
- **Finding:** Abandoned or hanging sockets consume file descriptors and event loop memory.
- **Mitigation Implemented:** 30-second ping heartbeat with 10-second pong deadline. Sockets missing heartbeats are terminated. Maximum CCU and per-IP connection limits protect against resource exhaustion.

---

## 2. Phase 3 Real-Time Multiplayer Risk Register

| Risk ID | Category | Risk Description | Initial Severity | Mitigation Implemented | Residual Severity | Monitoring Mechanism |
|:---:|:---:|:---|:---:|:---|:---:|:---|
| **RSK-MP-01** | Security | Unauthorized WebSocket connection via hijacked or forged token; Cross-Site WebSocket Hijacking (CSWSH). | HIGH | Strict `verifyClient` checks: Origin validated against approved whitelist (HTTP 403 on mismatch). Cookie session token or short-lived single-use ticket (`wst_...`, 60s TTL, audience-scoped). Unauthenticated upgrades rejected with HTTP 401. | LOW | Upgrade rejection log & 401/403 counters |
| **RSK-MP-02** | Security | Cross-room message injection or unauthorized eavesdropping on private matches. | HIGH | Server-enforced room membership check before subscription or broadcast. Non-members cannot receive or emit room frames. | LOW | `FORBIDDEN_ROOM_ACCESS` log & error counters |
| **RSK-MP-03** | Security | Active WebSocket outliving revoked authentication session (e.g., user logout or admin ban). | HIGH | `handleSessionRevocation` terminates all active sockets for `playerId` immediately upon session revocation in SQLite with close code 4001 (`SESSION_REVOKED`). | LOW | Security audit event `USER_LOGOUT` / `SESSION_REVOKED` |
| **RSK-MP-04** | Concurrency | Race condition in concurrent join requests allowing 3+ players into a 2-player lobby. | HIGH | Atomic transaction in `LobbyService.joinLobbyByCode` executing under SQLite `BEGIN IMMEDIATE` write lock. Re-queries current participant count inside the lock before insertion. Extra joins rejected with HTTP 409 `LOBBY_FULL`. Verified via simultaneous parallel join testing (`verify-concurrent-join.js`). | LOW | HTTP 409 responses, atomic DB rollbacks, & lobby audit logs |
| **RSK-MP-05** | Reliability | Abandoned sockets accumulating in memory without active clients (ghost connections). | MEDIUM | Bi-directional ping/pong heartbeat (30s interval, 10s timeout). Unresponsive sockets forcibly cleaned up. | LOW | `MetricsService.trackWsConnection` live CCU gauge |
| **RSK-MP-06** | State Machine | Client attempting illegal state transitions (e.g., host starting match while 1/2 players, or guest starting match). | MEDIUM | Authoritative server-side state machine. Only host can start; requires `status === 'full'` and 2/2 participants. | LOW | HTTP 403 / 409 error responses |
| **RSK-MP-07** | Availability | Brute-force enumeration / automated guessing of 6-character invitation codes. | MEDIUM | Generated from 32-character unambiguous alphabet ($32^6 \approx 1.07 \times 10^9$ entropy) via `crypto.randomBytes`. 30-min expiry window. Dual-key sliding-window rate limiting on IP and Account (5 failures / 5 min triggers HTTP 429 and `Retry-After: 300`). | LOW | HTTP 429 lockout logs & failed lookup counters |
| **RSK-MP-08** | Performance | Single Node.js event loop latency degradation during high message broadcast spikes. | MEDIUM | In-memory `Set` lookup for rooms. Broadcast payloads pre-serialized once per room instead of per-client serialization. | LOW | `MetricsService` p95 latency & CPU % gauges |
| **RSK-MP-09** | Scalability | Local single-node concurrency claimed as enterprise cluster scalability. | MEDIUM | Platform architecture explicitly scoped to single-host staging. Distributed multi-node Redis/PostgreSQL clustering explicitly deferred until requirements mandate. | LOW | Documented staging bounds & SRE runbook |
| **RSK-MP-10** | Resilience | Unhandled network disconnects leaving opponent waiting indefinitely. | MEDIUM | Sprint 08 enforces clean socket teardown. Sprint 09 (`EP05-04`) will introduce disconnect grace periods, countdown timers, and forfeit mechanics. | MEDIUM | Sprint 09 Roadmap Gate |
| **RSK-MP-11** | Security | Exposure of long-lived session tokens in URL query strings, browser history, reverse proxy logs, or telemetry. | HIGH | URL query param session tokens strictly prohibited (`/ws?token=...` returns HTTP 400 `RAW_SESSION_TOKENS_FORBIDDEN`). Subsystem mandates HttpOnly cookies or short-lived single-use tickets (`wst_...`). | LOW | HTTP 400 rejection logs |
| **RSK-MP-12** | Privacy | Unauthorized disclosure of lobby participants, usernames, or PII to unauthenticated visitors before joining. | MEDIUM | `LobbyService.getLobbyPreview` strips `participants` array and redacts internal PII for non-members. Only authenticated members receive live participant rosters. | LOW | Data minimization unit tests |
| **RSK-MP-14** | Resilience | In-flight matchmaking queue state lost during unexpected Node.js process restart. | MEDIUM | Documented failure boundary. Waiting queue is in-memory (`Map`), so players must re-queue upon restart. However, all active matches, lobbies, and participant records persist in SQLite (`WAL` mode) and survive restarts. | LOW | Matchmaking error counters & health telemetry |
| **RSK-MP-15** | Integrity | AI bot matches artificially inflating or deflating human global Elo ratings. | HIGH | Strict schema isolation: bot matches persist with `is_bot = 1` and synthetic UUIDs. Global Elo leaderboard calculations exclude all records where `is_bot = 1`. | LOW | Automated rating isolation assertions |
| **RSK-MP-16** | Game Logic | Group multiplayer (3P/4P) race condition or out-of-turn move execution. | HIGH | Server-enforced circular turn sequencing in `lobbyService.js`. Submissions from participants whose ID does not match current turn index are rejected with HTTP 400 / WS 4001 `INVALID_TURN`. | LOW | Turn-sequence integration tests |
| **RSK-SUB-01** | FinTech Security | Free users obtaining paid subscription entitlements via unverified upgrade endpoint. | CRITICAL | Production Guard: in `production` environment, `POST /api/v1/subscriptions/subscribe` with paid plans is rejected with HTTP 501 `PAYMENT_GATEWAY_NOT_CONFIGURED`. Simulated upgrades are restricted strictly to non-production staging/dev environments with explicit `isSimulated: true` response metadata. | LOW | Automated negative production-mode integration tests |
| **RSK-SUB-02** | Security | Unentitled players launching paid/premium games directly via API. | HIGH | Server-side launch gating in `gameLaunchService.validateLaunchEligibility()`. Directly queries `subscriptions` table. Returns HTTP 403 `ENTITLEMENT_REQUIRED` (free) or HTTP 403 `ENTITLEMENT_EXPIRED` (past period end). Launch ticket issued only for active subscribers. | LOW | Launch entitlement automated test suite |
| **RSK-PRD-01** | Governance | Premature claims of "100% Production Ready" prior to live infrastructure delivery. | HIGH | Enforced 5-tier readiness classification: Sprint Development Completed (100%), Functional Acceptance Verified (100%), Security Baseline Verified (100%), Staging Deployment Verified (100%), Production Release Approved (BLOCKED / Gated pending Sprint 12 payment gateway, live email, KMS, and DR drills). | LOW | SRE Operational Governance Gate |

---

## 3. Concurrency, Restart Boundaries & Load Testing Disclosure

In accordance with strict architectural governance:
- **Measured Testing Baseline:** Automated concurrency tests verified simultaneous two-player interactions, multi-socket room broadcasting, and capacity rejections across concurrent browser/API connections.
- **Concurrent Join Race Safety Verification:** Automated simultaneous join test (`scripts/verify-concurrent-join.js`) executed parallel HTTP join requests from two distinct authenticated players against a 2-player lobby with 1 remaining slot. Exactly one guest was admitted (HTTP 200), the other was rejected (HTTP 409 `LOBBY_FULL`), exactly 2 participant rows exist in SQLite, and room events were dispatched only to legitimate members.
- **Node.js Process Restart Boundary:** Tickets waiting in public matchmaking queues (`MatchmakingService.queues`) reside in heap memory and will be dropped if the Node.js process terminates; affected users must re-queue. Active matches and lobbies persist in SQLite and survive restarts, enabling mid-match reconnects.
- **Cluster Load Testing Disclosure:** No claim of supporting 10,000 Concurrent Connected Users (CCU) is made for the single-node SQLite staging environment. High-scale load testing and multi-node clustering (Redis Pub/Sub adapter) are formally scheduled for Phase 4 prior to commercial production rollout.
- **Production Gate Disclosure:** NexusPlay is certified for Staging. Production release remains locked until Sprint 12 completes live payment processing, webhook signatures, external transactional email delivery, and KMS secrets management.
