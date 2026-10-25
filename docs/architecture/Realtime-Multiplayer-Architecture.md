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

## 3. WebSocket Connection Lifecycle & Authentication

### 3.1 Dual-Mode Handshake Authentication
WebSocket connection establishment strictly enforces identity verification before any real-time frames are processed. Two authentication vectors are supported:
1. **Cookie-Based Authentication:** During the initial HTTP `Upgrade` handshake, the server inspects the `nexus_session` HTTP-only cookie. The session token is validated against the SQLite `auth_sessions` table.
2. **Bearer Token Authentication:** For cross-origin or automated headless testing, clients may supply a query parameter `?token=<session_token>` or an `Authorization: Bearer <token>` header in the upgrade request.

If the session token is missing, expired, or marked as `revoked = 1`, the upgrade is immediately rejected with HTTP `401 Unauthorized`.

### 3.2 Connection Registry
Upon successful handshake, the authenticated player is registered in `RealTimeService`:
- `this.connections`: Maps `playerId -> Set<WebSocket>` (supporting multi-tab sessions per player).
- `this.playerSockets`: Reverse lookup tracking `WebSocket -> playerId`.
- `this.rooms`: Maps `lobbyId -> Set<WebSocket>`.
- `this.socketRooms`: Maps `WebSocket -> Set<lobbyId>`.

`MetricsService.trackWsConnection(true)` increments the real-time Concurrent Connected Users (CCU) counter, exposing live telemetry to the Sprint 07 Operational Dashboard.

### 3.3 Heartbeat & Ping-Pong
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

### 4.3 Capacity and Room Isolation (AC-16.3, AC-17.3)
- **Player Limit:** Two-player lobbies strictly enforce a capacity ceiling of 2 participants (`current_players <= max_players`).
- **Atomic Slot Reservation:** Player insertion into `lobby_participants` executes within an atomic transaction:
  ```sql
  SELECT current_players, max_players, status FROM lobbies WHERE id = ?;
  -- If current_players >= max_players or status != 'waiting', reject with HTTP 409
  UPDATE lobbies SET current_players = current_players + 1 WHERE id = ?;
  INSERT INTO lobby_participants (lobby_id, player_id, role) VALUES (?, ?, 'guest');
  ```
- **Cross-Room Isolation:** WebSocket message broadcasting is strictly partitioned by `lobbyId`. A client can only receive frames for rooms to which they are explicitly subscribed upon verified membership. Sockets cannot spoof messages into other rooms.

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

| Requirement Domain | Sprint 08 Scope (Approved) | Sprint 09 Scope (Deferred) | Sprint 10 Scope (Deferred) |
|:---|:---:|:---:|:---:|
| Two-Player Sessions | **Fully Implemented** | Maintenance | Maintenance |
| 6-Char Code Creation | **Fully Implemented** | Maintenance | Maintenance |
| Code-Based Joining | **Fully Implemented** | Maintenance | Maintenance |
| 3-Player Rejection | **Fully Implemented** | Maintenance | Maintenance |
| State Machine (waiting/full/active) | **Fully Implemented** | Maintenance | Maintenance |
| Disconnection Recovery Messaging | **Out of Scope** | **Target Sprint 09 (EP05-04)** | Maintenance |
| Public Matchmaking Queue | **Out of Scope** | **Target Sprint 09 (EP06-03)** | Maintenance |
| 3-4 Player Lobbies & AI Bots | **Out of Scope** | **Out of Scope** | **Target Sprint 10** |
| Payment Gateway / Monetary Wagers| **Out of Scope** | **Out of Scope** | **Sprint 12 / Future Phase**|
