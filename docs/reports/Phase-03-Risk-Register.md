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
| **RSK-MP-04** | Concurrency | Race condition in concurrent join requests allowing 3+ players into a 2-player lobby. | HIGH | Atomic transaction in `LobbyService.joinLobbyByCode` checking `current_players < max_players` before inserting participant. Extra joins rejected with HTTP 409 `LOBBY_FULL`. | LOW | HTTP 409 responses & lobby audit logs |
| **RSK-MP-05** | Reliability | Abandoned sockets accumulating in memory without active clients (ghost connections). | MEDIUM | Bi-directional ping/pong heartbeat (30s interval, 10s timeout). Unresponsive sockets forcibly cleaned up. | LOW | `MetricsService.trackWsConnection` live CCU gauge |
| **RSK-MP-06** | State Machine | Client attempting illegal state transitions (e.g., host starting match while 1/2 players, or guest starting match). | MEDIUM | Authoritative server-side state machine. Only host can start; requires `status === 'full'` and 2/2 participants. | LOW | HTTP 403 / 409 error responses |
| **RSK-MP-07** | Availability | Brute-force enumeration / automated guessing of 6-character invitation codes. | MEDIUM | Generated from 32-character unambiguous alphabet ($32^6 \approx 1.07 \times 10^9$ entropy) via `crypto.randomBytes`. 30-min expiry window. Dual-key sliding-window rate limiting on IP and Account (5 failures / 5 min triggers HTTP 429 and `Retry-After: 300`). | LOW | HTTP 429 lockout logs & failed lookup counters |
| **RSK-MP-08** | Performance | Single Node.js event loop latency degradation during high message broadcast spikes. | MEDIUM | In-memory `Set` lookup for rooms. Broadcast payloads pre-serialized once per room instead of per-client serialization. | LOW | `MetricsService` p95 latency & CPU % gauges |
| **RSK-MP-09** | Scalability | Local single-node concurrency claimed as enterprise cluster scalability. | MEDIUM | Platform architecture explicitly scoped to single-host staging. Distributed multi-node Redis/PostgreSQL clustering explicitly deferred until requirements mandate. | LOW | Documented staging bounds & SRE runbook |
| **RSK-MP-10** | Resilience | Unhandled network disconnects leaving opponent waiting indefinitely. | MEDIUM | Sprint 08 enforces clean socket teardown. Sprint 09 (`EP05-04`) will introduce disconnect grace periods, countdown timers, and forfeit mechanics. | MEDIUM | Sprint 09 Roadmap Gate |
| **RSK-MP-11** | Security | Exposure of long-lived session tokens in URL query strings, browser history, reverse proxy logs, or telemetry. | HIGH | URL query param session tokens strictly prohibited (`/ws?token=...` returns HTTP 400 `RAW_SESSION_TOKENS_FORBIDDEN`). Subsystem mandates HttpOnly cookies or short-lived single-use tickets (`wst_...`). | LOW | HTTP 400 rejection logs |
| **RSK-MP-12** | Privacy | Unauthorized disclosure of lobby participants, usernames, or PII to unauthenticated visitors before joining. | MEDIUM | `LobbyService.getLobbyPreview` strips `participants` array and redacts internal PII for non-members. Only authenticated members receive live participant rosters. | LOW | Data minimization unit tests |

---

## 3. Concurrency & Load Testing Disclosure

In accordance with strict architectural governance:
- **Measured Testing Baseline:** Automated concurrency tests verified simultaneous two-player interactions, multi-socket room broadcasting, and capacity rejections across 10 concurrent browser/API connections.
- **Cluster Load Testing Disclosure:** No claim of supporting 10,000 Concurrent Connected Users (CCU) is made for the single-node SQLite staging environment. High-scale load testing and multi-node clustering (Redis Pub/Sub adapter) are formally scheduled for Phase 4 prior to commercial production rollout.
