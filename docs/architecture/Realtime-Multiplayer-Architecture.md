# NexusPlay — Real-Time Multiplayer Architecture Specification

**Document Title:** Real-Time Multiplayer Architecture Specification  
**Project:** NexusPlay Online Gaming Platform  
**Phase:** Phase 3 — Multiplayer & Real-Time Engagement  
**Sprint:** Sprint 08 — Two-Player Multiplayer Sessions  
**Author:** Principal Real-Time Systems Architect & Multiplayer Backend Engineer  
**Status:** Approved & Authoritative  
**Date:** 2026-10-25  

---

## 1. Executive Summary & Architectural Scope

Phase 3 introduces real-time multiplayer capabilities to the NexusPlay online gaming platform. Sprint 08 delivers the foundational two-player multiplayer subsystem, encompassing:
1. Cryptographically secure 2-player lobby creation with 6-character alphanumeric invitation codes (`EP05-01`).
2. Code-based lobby joining with validation and strict capacity controls (`EP05-02`).
3. Authoritative real-time state machine tracking lobby progression through `waiting`, `full`, and `active` states (`EP05-03`).

In strict compliance with architectural guidelines, this architecture leverages native WebSockets (`ws`) embedded within the Node.js/Express server and disk-backed SQLite in Write-Ahead Logging (WAL) mode. Distributed memory caches (Redis) and relational database migrations (PostgreSQL) are deliberately excluded at this stage, avoiding premature infrastructure complexity while supporting target staging performance profiles.

---

## 2. High-Level Component Topology

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER LAYER                                 |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |                              React 19 / TypeScript SPA                            |  |
|  |  +---------------------------+  +----------------------+  +---------------------+ |  |
|  |  | MultiplayerLobbyModal     |  | Obsidian Chess Board |  | Game Details Modal  | |  |
|  |  +---------------------------+  +----------------------+  +---------------------+ |  |
|  |                |                           |                         |            |  |
|  |                v                           v                         v            |  |
|  |  +------------------------------------------------------------------------------+ |  |
|  |  |               Native WebSocket Client (ws://host:port/ws)                    | |  |
|  |  +------------------------------------------------------------------------------+ |  |
+-----------------------------------------------------------------------------------------+
                               |                                        |
                 HTTP REST (/api/v1/lobbies)              WebSocket Protocol (/ws)
                 (Lobby CRUD & Joining)                   (Room Broadcast & Real-Time Events)
                               |                                        |
+------------------------------v----------------------------------------v-----------------+
|                                 NODE.JS / EXPRESS RUNTIME                               |
|                                                                                         |
|  +----------------------------------------+  +----------------------------------------+ |
|  |          HTTP REST Gateway             |  |         RealTimeService Gateway        | |
|  |  - requireAuth (Cookie / Bearer)       |  |  - Dual-mode connection authentication | |
|  |  - CSRF Protection (X-CSRF-Token)      |  |  - Connection Map (playerId -> Socket) | |
|  |  - Lobby Routes (/api/v1/lobbies)      |  |  - Room Map (lobbyId -> Set<Socket>)   | |
|  |  - Game Eligibility Gate (max_players) |  |  - Cross-room isolation boundary      | |
|  +----------------------------------------+  +----------------------------------------+ |
|                       |                                           |                     |
|                       +---------------------+---------------------+                     |
|                                             |                                           |
|                                             v                                           |
|  +-----------------------------------------------------------------------------------+  |
|  |                                  LobbyService                                     |  |
|  |  - Cryptographic 6-character Code Generator (crypto.randomBytes)                  |  |
|  |  - Authoritative State Machine Engine ('waiting' -> 'full' -> 'active')           |  |
|  |  - 30-Minute Expiry Enforcement & Capacity Verification (Max 2 Players)            |  |
|  |  - Session Revocation Socket Termination Hook (handleSessionRevocation)           |  |
|  +-----------------------------------------------------------------------------------+  |
|                       |                                           |                     |
|                       v                                           v                     |
|  +----------------------------------------+  +----------------------------------------+ |
|  |             MetricsService             |  |           Audit Logging Engine         | |
|  |  - Active WebSocket CCU Counter        |  |  - Immutable audit_events persistence  | |
|  +----------------------------------------+  +----------------------------------------+ |
+-----------------------------------------------------------------------------------------+
                               |
                   Synchronous Database Operations (DatabaseSync)
                               |
+------------------------------v----------------------------------------------------------+
|                             SQLITE PERSISTENCE ENGINE (WAL MODE)                        |
|                                                                                         |
|  +------------------------------------+      +---------------------------------------+  |
|  |              lobbies               |      |           lobby_participants          |  |
|  |  - id, game_id, host_player_id     |<---->|  - lobby_id, player_id                |  |
|  |  - invitation_code, status         | 1:N  |  - role ('host' | 'guest'), joined_at |  |
|  |  - max_players, current_players    |      +---------------------------------------+  |
|  |  - expires_at, created_at          |                                                 |
|  +------------------------------------+                                                 |
+-----------------------------------------------------------------------------------------+
```

---

## 3. WebSocket Connection Lifecycle, Origin Defense & Authentication

### 3.1 Cross-Site WebSocket Hijacking (CSWSH) Defense & verifyClient
WebSocket upgrade requests undergo strict pre-handshake validation in `verifyClient` (`server/src/index.js`) before protocol upgrade:
1. **Origin Verification:** The `Origin` header is validated against an explicit whitelist of trusted origins (`process.env.CLIENT_URL`, `http://localhost:5050`, `http://127.0.0.1:5050`). Cross-origin upgrade requests from unauthorized origins are rejected immediately with HTTP `403 Forbidden` (`FORBIDDEN_ORIGIN`), preventing Cross-Site WebSocket Hijacking (CSWSH).
2. **Raw Token Query Parameter Prohibition:** Reusable raw session tokens in WebSocket URL query strings (`/ws?token=...`) are strictly prohibited and rejected with HTTP `400 Bad Request` (`RAW_SESSION_TOKENS_FORBIDDEN`). This prevents credential leakage into access logs, browser history, reverse proxy telemetry, and error monitoring systems.

### 3.2 Dual Authentication Vectors
Once origin and query sanity checks pass, identity verification proceeds through one of two authorized mechanisms:
1. **HttpOnly Session Cookie (Primary Vector):** Standard browser clients provide the ambient session cookie.
   - **Canonical Cookie Name:** `nexusplay_session` (with `nexus_session` and `auth_session` supported as backward-compatible aliases).
   - **Cookie Attributes:** `HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`. The `Secure` attribute is dynamically enforced whenever requests arrive via HTTPS or trusted reverse proxy (`isSecureRequest`).
   - **Token Cryptography:** The session cookie contains an **opaque 256-bit cryptographically random bearer secret** (`crypto.randomBytes(32).toString('hex')`). It is **never stored plaintext**; it is hashed at rest with **SHA-256** in the SQLite `auth_sessions` table (`s.token = hashToken(cleanToken)`).
   - **Validation & Revocation:** Validated against SQLite `auth_sessions` joined with `players`. Sockets are rejected if `revoked = 1`, `expires_at <= CURRENT_TIMESTAMP`, or player `status != 'active'`.
2. **Short-Lived Connection Ticket (Secondary Vector):** Cross-origin, headless, or automated testing clients obtain a single-use ticket via authenticated REST endpoint `POST /api/v1/lobbies/ws-ticket`. 
   - **Ticket Properties:** Prefixed with `wst_`, 60-second Time-To-Live (TTL), audience-scoped strictly to `nexusplay:websocket`, and bound to the authenticated player.
   - **Single-Use Consumption:** Sockets pass the ticket via `/ws?ticket=wst_...` or via initial frame `{ type: "AUTH_TICKET", ticket: "wst_..." }`. The ticket is atomically consumed and purged upon first use. Tickets cannot be reused and cannot grant general REST API or account access.

If authentication credentials are missing, expired, revoked, or invalid, the upgrade or connection is rejected with HTTP `401 Unauthorized` or WebSocket closure code `4001` (`SESSION_REVOKED`).

### 3.3 Connection Registry
Upon successful handshake, the authenticated player is registered in `RealTimeService`:
- `this.connections`: Maps `playerId -> Set<WebSocket>` (supporting multi-tab sessions per player).
- `this.playerSockets`: Reverse lookup tracking `WebSocket -> playerId`.
- `this.rooms`: Maps `lobbyId -> Set<WebSocket>`.
- `this.socketRooms`: Maps `WebSocket -> Set<lobbyId>`.
- `this.tickets`: In-memory registry of active unconsumed connection tickets with automated TTL eviction.

`MetricsService.trackWsConnection(true)` increments the real-time Concurrent Connected Users (CCU) counter, exposing live telemetry to the Sprint 07 Operational Dashboard.

### 3.4 Heartbeat & Ping-Pong
To detect abandoned client connections and prevent intermediate proxy timeouts:
- The server issues a ping frame every 30,000 milliseconds to all connected sockets.
- Sockets failing to respond with a pong frame within 10,000 milliseconds are flagged as dead and terminated.
- Upon socket closure, `RealTimeService` invokes `cleanupSocket(ws)` to unregister the socket from all rooms, decrement CCU, and free resources.

---

## 4. Lobby Architecture & Security Boundaries

### 4.1 Cryptographic Invitation Code Generation
Lobby codes must be collision-resistant, human-readable, and immune to brute-force enumerations:
- **Alphabet:** Unambiguous uppercase alphanumeric characters (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), excluding visually confusable characters (`0`, `O`, `1`, `I`).
- **Entropy:** Generated using Node.js `crypto.randomBytes(6)`, yielding $32^6 \approx 1.07 \times 10^9$ possible combinations.
- **Uniqueness Guarantee:** A database uniqueness constraint (`UNIQUE(invitation_code)`) prevents collisions. In the statistical anomaly of an initial collision, the generator executes up to 5 regeneration attempts.

### 4.2 Game Eligibility Gate (AC-16.2)
Not all catalog games support multiplayer sessions. Single-player titles (such as *Cyber Invaders*, `max_players = 1`) must never allow lobby creation:
- Before inserting a lobby record, `LobbyService.createLobby` checks the catalog entry's `max_players` field.
- If `max_players < 2`, the request is rejected with HTTP `422 Unprocessable Entity` and machine code `GAME_NOT_ELIGIBLE_FOR_MULTIPLAYER`.
- Eligible multiplayer games (e.g., *Obsidian Chess*, `max_players = 2`) proceed through creation.

### 4.3 Capacity, Room Isolation & Concurrent Join Safety (AC-16.3, AC-17.3)
- **Player Limit:** Two-player lobbies strictly enforce a capacity ceiling of 2 participants (`current_players <= max_players`).
- **Atomic Concurrency Protection (`BEGIN IMMEDIATE`):** To eliminate race conditions where simultaneous join requests could oversubscribe a lobby, participant reservation executes inside an atomic SQLite write transaction (`this.dbManager.transaction`):
  ```sql
  BEGIN IMMEDIATE;
  -- Re-query lobby status and active participant count under transaction lock
  SELECT max_players, status FROM lobbies WHERE id = ?;
  SELECT COUNT(*) as count FROM lobby_participants WHERE lobby_id = ? AND status != 'left';
  -- If count >= max_players or status != 'waiting', abort transaction and reject with HTTP 409 LOBBY_FULL
  -- Otherwise, insert guest participant and transition status to 'full'
  COMMIT;
  ```
- **Simultaneous-Join Verification:** Concurrency testing (`scripts/verify-concurrent-join.js`) verifies that when two authenticated players submit join requests in the same event-loop tick (within 25ms), exactly one player is admitted (HTTP 200) and the other is cleanly rejected (HTTP 409 `LOBBY_FULL`), maintaining strictly 2 rows in `lobby_participants` with zero ghost rows.
- **Cross-Room Isolation:** WebSocket message broadcasting is strictly partitioned by `lobbyId`. A client can only receive frames for rooms to which they are explicitly subscribed upon verified membership. Sockets cannot spoof messages into other rooms.

### 4.4 Abuse Prevention & Invalid Code Rate Limiting
To defend against automated enumeration and brute-force guessing of active invitation codes:
- **Dual-Key Sliding Window:** Failed code lookups and join attempts are tracked at two distinct dimensions:
  1. **IP Dimension:** `lobby_code:ip:<client_ip>` (supporting `X-Forwarded-For` with trust proxy).
  2. **Account Dimension:** `lobby_code:account:<playerId>`.
- **Threshold & Lockout:** 5 consecutive failures within a 5-minute sliding window triggers a 5-minute cooldown period. Subsequent join attempts are rejected immediately with HTTP `429 Too Many Requests` and standard `Retry-After: 300` header.
- **Persistence without Redis:** Tracked through an in-memory high-performance LRU sliding window map, persisted to the existing SQLite `auth_rate_limits` table to survive process restarts while avoiding the infrastructure overhead of Redis.
- **Generic Safe Error Responses:** Error responses for invalid, expired, or full lobbies use sanitized messages and never disclose database query errors, table structures, or stack traces.

### 4.5 Pre-Authorization Participant Privacy & Data Minimization
Unauthenticated and pre-authorization lookups must not disclose participant identities or personally identifiable information (PII):
- When inspecting a lobby prior to joining (`GET /api/v1/lobbies/code/:code` or `GET /api/v1/lobbies/:id` by non-members), `LobbyService.getLobbyPreview` returns sanitized metadata with `participants: []`.
- Only authorized lobby members (`host` or joined `guest`) receive full participant lists and presence events.
- No player email addresses, password hashes, or internal database metadata are ever transmitted across WebSocket or REST payloads.

---

## 5. Authoritative State Machine

The lobby lifecycle is governed by an authoritative server-side finite state machine (FSM):

```
       [Host Creates Lobby]
                |
                v
          +-----------+
          |  waiting  | <--- 1/2 players (Host joined, waiting for guest)
          +-----------+
                |
     [Guest Joins via Code]
                |
                v
          +-----------+
          |   full    | <--- 2/2 players (Both slots filled, ready to start)
          +-----------+
                |
      [Host Starts Match]
                |
                v
          +-----------+
          |  active   | <--- Match running, board gameplay enabled
          +-----------+
                |
    [Match Ends / Surrender]
                |
                v
          +-----------+
          |   ended   | <--- Archived, session completed
          +-----------+
```

### State Transitions:
1. **`waiting` (AC-18.1):** Initial state upon creation. Exactly 1 participant (the host) is registered. Slot 2 is unfilled. Invitation code is active.
2. **`full` (AC-18.2):** Triggered automatically when the second player joins via the valid 6-character code. Both slots are filled. Real-time broadcast `LOBBY_STATE_CHANGED` notifies both players. The host interface displays the enabled "Start Match" button.
3. **`active` (AC-18.3):** Triggered when the host invokes `POST /api/v1/lobbies/:id/start`. The server validates that caller `playerId == host_player_id` and `status == 'full'`, generates a `sessionId`, transitions the database record to `active`, and broadcasts `MATCH_STARTED` to the room.
4. **`ended`:** Terminal state when the match concludes or is surrendered.

### 5.1 Obsidian Chess Gameplay Authority Classification
To provide unambiguous technical transparency, the gameplay execution of *Obsidian Chess* in Sprint 08 is classified as:
**Synchronized Multiplayer Demonstration Board with Client-Enforced Turn Order & Server-Brokered Room Relay.**

- **Server-Authoritative Match Lifecycle:** The lobby lifecycle, participant slot allocation, match initiation eligibility (host-only, requiring `status = 'full'`), and session creation are 100% server-authoritative.
- **Piece Assignment:** The host is permanently assigned White (`'w'`), and the guest is assigned Black (`'b'`). Sockets can only move pieces matching their assigned color.
- **Turn Order Enforcement:** The client interface strictly enforces turn alternation (`turn === myColor`). Attempting to move when it is not the player's turn is rejected locally ("Not your turn! Waiting for opponent"). Each move flips the turn between White and Black.
- **Server Network Relay:** Submitting a move sends a `{ type: "GAME_MOVE", move, nextTurn }` frame upstream. `RealTimeService` verifies that the sender is authenticated and an authorized member of that active room, then broadcasts `GAME_STATE_UPDATE` to the opponent with zero cross-room leakage.
- **Rules Engine Scope:** Complex FIDE chess rules (e.g. legal move calculation, check/checkmate detection, en passant, castling, pawn promotion) are **NOT computed by a server-side chess engine**. The board provides a synchronized, turn-gated demonstration matrix allowing two connected players to execute moves and verify real-time state synchronization. A full server-side chess engine is formally deferred to future game-specific releases.

---

## 6. Session Revocation Integration

In accordance with Sprint 06 and Sprint 07 security baselines, active WebSocket connections must not outlive their underlying authentication session.
When a player signs out, changes credentials, or is terminated by an administrator:
1. `AuthService.revokeSession` marks the SQLite `auth_sessions` row as `revoked = 1`.
2. `AuthService` invokes `RealTimeService.handleSessionRevocation(playerId)`.
3. `RealTimeService` iterates over all active sockets associated with `playerId`, transmits an error frame (`SESSION_REVOKED`), and executes immediate hard socket closure (`ws.terminate()`).
4. Sockets are removed from all room subscription sets, preventing any further message transmission or receipt.

---

## 7. Database Persistence & Indexes

The real-time subsystem introduces two dedicated tables in `server/src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS lobbies (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  host_player_id TEXT NOT NULL,
  invitation_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'full', 'active', 'ended', 'abandoned'
  max_players INTEGER NOT NULL DEFAULT 2,
  current_players INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (host_player_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lobby_participants (
  id TEXT PRIMARY KEY,
  lobby_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest', -- 'host', 'guest'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES users(id),
  UNIQUE(lobby_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_lobbies_code ON lobbies(invitation_code);
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_host ON lobbies(host_player_id);
CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby ON lobby_participants(lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_participants_player ON lobby_participants(player_id);
```

---

## 8. Summary of Scope Boundaries

| Requirement Domain | Sprint 08 Status | Sprint 09 Status | Sprint 10 Status | Sprint 11 Status |
|:---|:---:|:---:|:---:|:---:|
| Two-Player Sessions | **Fully Implemented** | Certified | Certified | Certified |
| 6-Char Code Creation | **Fully Implemented** | Certified | Certified | Certified |
| Code-Based Joining | **Fully Implemented** | Certified | Certified | Certified |
| State Machine (waiting/full/active) | **Fully Implemented** | Certified | Certified | Certified |
| Disconnection Recovery (30s grace) | Deferred | **Fully Implemented (EP05-04)** | Certified | Certified |
| Public Matchmaking Queues | Deferred | **Fully Implemented (EP06-03)** | Certified | Certified |
| SRE Error Counters & Degradation | Deferred | **Fully Implemented (EP12-03/04)** | Certified | Certified |
| AI Bot Opponents (Easy/Med/Hard) | Out of Scope | Out of Scope | **Fully Implemented (EP04-02)** | Certified |
| 3-Player & 4-Player Group Lobbies | Out of Scope | Out of Scope | **Fully Implemented (EP06-01/02)** | Certified |
| Premium Entitlements Gating | Out of Scope | Out of Scope | Out of Scope | **Fully Implemented (EP08-01..04)** |
| Live Payment Gateway / Webhooks | Out of Scope | Out of Scope | Out of Scope | **Sprint 12 (Gated)** |

---

## 9. Sprint 09: Matchmaking & Disconnection Recovery Architecture

### 9.1 In-Memory Queue vs. Persistent Lobbies
- **Queue State:** Public matchmaking tickets are held in Node.js heap memory (`MatchmakingService.queues: Map<gameSlug, Ticket[]>`). This enables O(1) atomic pair evaluation without SQL contention.
- **Match State:** Once two players are matched, a persistent lobby is written to SQLite (`lobbies` and `lobby_participants`).
- **Process Restart Boundary (Limitation):** If the Node.js server process restarts, in-flight tickets waiting in the matchmaking queue are lost; waiting players must re-queue. However, active matches and lobbies persisted in SQLite survive process restarts, allowing disconnected clients to re-authenticate and query room state.

### 9.2 Grace Period & Reconnection Finite State Machine
- When a WebSocket disconnects, `realtimeService` flags the player in SQLite as `disconnected` with a 30-second `reconnect_deadline`.
- Real-time event `PLAYER_DISCONNECTED` is broadcast to remaining participants.
- If the player reconnects via `POST /api/v1/lobbies/:id/reconnect` within the 30-second window, their seat is restored, board state is synchronized, and `PLAYER_RECONNECTED` is broadcast.
- If the 30-second grace window expires without reconnection, any subsequent reconnect attempt returns HTTP `410 MATCH_FORFEITED`. The match is authoritatively marked `ended`, and the remaining connected player is awarded the forfeit win.

---

## 10. Sprint 10: AI Bot Opponents & Group Multiplayer Architecture

### 10.1 AI Bot Engine Architecture
- **Bot Opponent Generation:** Initiated via `POST /api/v1/lobbies/bot` with `difficulty: "easy" | "medium" | "hard"`.
- **Identity Isolation:** Bot opponents use synthetic identifiers (`bot-uuid`) and database flag `is_bot = 1`. Bot match results are isolated from human global Elo rating calculations.
- **Move Calculation:** Handled in `server/src/modules/multiplayer/botService.js`. Combines an opening book table with tactical heuristic evaluations. Artificial thinking delays (500ms–1500ms) are injected to simulate realistic human cadence.

### 10.2 Group Multiplayer & Circular Turn Sequencing (3–4 Players)
- **Game Eligibility Gate:** Group lobby creation (3–4 players) is strictly validated against game capabilities. Games with `max_players = 2` (such as *Obsidian Chess*) reject 3–4 player lobby creation with HTTP `422 CAPACITY_EXCEEDS_GAME_LIMIT`. Group multiplayer is supported on certified group titles (e.g., *Vortex Arena*).
- **Capacity Enforcement:** Atomic participant insertion ensures that lobbies reaching `max_players` reject additional join requests with HTTP `409 LOBBY_FULL`.
- **Circular Turn Sequencing:** The server validates that player moves arrive in strict circular order (Player 1 -> Player 2 -> Player 3 [-> Player 4] -> Player 1). Out-of-turn move submissions are rejected with HTTP `400 / WS 4001 INVALID_TURN`.

---

## 11. Gameplay Authority & Anti-Cheat Classification

To maintain rigorous technical transparency, gameplay throughout Sprints 08–11 is classified as:
**Client-Side Move Calculation with Server-Validated Turn Sequencing and Authoritative State Persistence.**
- **Anti-Cheat Scope:** The server enforces valid authentication, seat ownership, capacity limits, and circular turn sequencing.
- **Rule Engine Limitations:** The platform does **not** execute a full server-side chess engine or physics simulation for real-time move legality. Moves are computed client-side and relayed with turn validation. Complete server-authoritative physics and rule validation are designated for future roadmap phases.
