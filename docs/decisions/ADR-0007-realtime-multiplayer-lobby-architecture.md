# Architecture Decision Record (ADR-0007) — Real-Time Multiplayer Lobby & Session Architecture

## Status
Accepted

## Date
2026-10-25

## Context
Sprint 08 initiates **Phase 3 (Multiplayer)** of the NexusPlay Online Gaming Platform, authorizing the delivery of two-player multiplayer sessions (`EP05-01`, `EP05-02`, `EP05-03`).

Prior to Sprint 08, gameplay was strictly single-player (`SinglePlayerSession`, Sprint 04) with progress and achievement tracking (`ProgressService`, Sprint 05). The platform requires a secure, high-performance, real-time foundation that allows authenticated players to create private two-player game lobbies, invite opponents via short cryptographic invitation codes, join lobbies with strict capacity enforcement (max 2 players), and track lobby state transitions (`waiting`, `full`, `active`) in real time with sub-50ms synchronization latency.

Crucially, the architecture must operate reliably within existing technology constraints (Node.js, native WebSockets `ws`, SQLite `DatabaseSync`, React 19 / TypeScript) without introducing unapproved distributed infrastructure (e.g., Redis, PostgreSQL) before actual workload requirements mandate them.

## Decisions

### 1. Hybrid Real-Time Architecture: In-Memory Rooms with SQLite Persistence
- **Choice**: In-memory room management (`RealtimeSessionService` / `LobbyService`) synchronized with disk-backed SQLite tables (`lobbies`, `lobby_participants`, `game_sessions`).
- **Rationale**:
  - Microsecond state propagation: In-game state synchronization and lobby events require instant fan-out to connected WebSocket clients. In-memory `Map` structures provide microsecond lookups and zero-overhead message dispatching.
  - Durability and auditability: Every lobby creation, member joining, member leaving, status transition, and match launch is committed synchronously to SQLite `lobbies`, `lobby_participants`, and `audit_events`.
  - Resilience: If the server restarts, lobbies in `waiting` or `full` state are reconciled from SQLite, preventing data corruption.

### 2. Secure WebSocket Connection Lifecycle & Authentication
- **Choice**: Dual-channel authentication:
  1. **Ambient Cookie Handshake**: During the HTTP upgrade request (`GET /ws`), the server inspects `req.headers.cookie` for the secure, HttpOnly `auth_session` token, authenticating the socket immediately.
  2. **Explicit Message Authentication (`AUTH`)**: Clients in detached or test environments can send `{ type: 'AUTH', token: '<token>' }` immediately after connecting.
  - Sockets without valid authentication remain in an unauthenticated/guest state. Creating or joining private lobbies strictly requires an authenticated player account (`AC-16.1`, `AC-17.1`).
  - Session revocation listener: If an administrative operator or player revokes an `auth_session`, any connected WebSocket instances bound to that session token are immediately disconnected.

### 3. Invitation Code Generation & Expiry Semantics
- **Choice**: 6-character cryptographically random alphanumeric string (e.g. `CHESS2`, `NEXUS1`) using `A-Z0-9` excluding ambiguous characters (`O`, `0`, `I`, `1`).
- **Semantics**:
  - Case-insensitive on input (`.trim().toUpperCase()`).
  - Expiry window: 30 minutes (`LOBBY_EXPIRY_MS = 1800000`). If a lobby remains in `waiting` state beyond 30 minutes without a guest joining, the invitation code expires (`AC-17.2`).

### 4. Game Eligibility & Capacity Gates (`AC-16.2`, `AC-16.3`, `AC-17.3`)
- **Eligibility Validation**:
  - A game is eligible for two-player private lobbies if and only if:
    1. The game exists in the `games` table.
    2. `is_published = 1`.
    3. Licensing status is `'approved'`.
    4. `max_players >= 2` (e.g. `Obsidian Chess`).
  - Solo-only games (e.g. `Cyber Invaders`, `min_players = 1, max_players = 1`) or unapproved games are strictly rejected with `GAME_NOT_ELIGIBLE_FOR_MULTIPLAYER` (`HTTP 422` / WS error).
- **Two-Player Capacity Enforcement**:
  - Host occupies slot 1 (`host_player_id`).
  - Maximum players is strictly `2`.
  - When a guest enters a valid invitation code, the guest occupies slot 2.
  - Any subsequent attempt to join a full lobby is rejected with `LOBBY_FULL` (`HTTP 409` / WS error) (`AC-16.3`, `AC-17.3`).

### 5. Lobby Status State Machine (`EP05-03`)
- **Transitions**:
  ```
  [CREATE LOBBY] ────────► WAITING (1/2 Players)
                               │
                               │ (Guest Joins with Valid Code)
                               ▼
                             FULL (2/2 Players)
                               │
                               │ (Host Clicks "Start Match")
                               ▼
                             ACTIVE (Match in Progress)
  ```
  - `waiting`: Lobby created, unfilled guest slot (`AC-18.1`).
  - `full`: 2 players connected, match ready to begin (`AC-18.2`).
  - `active`: Match has started; WebSocket delivers real-time match events (`AC-18.3`).

### 6. Session Isolation & Cross-Room Boundary Security
- **Choice**: Strict room-level channel partitioning.
  - Each socket tracks its active `lobbyId`.
  - Broadcasts (`LOBBY_STATE_CHANGED`, `GAME_STATE_UPDATE`, `MATCH_STARTED`) are dispatched strictly to sockets subscribed to the matching `lobbyId`.
  - Sockets cannot publish or subscribe to rooms they are not authorized participants of.

## Consequences
- Clean separation of concerns: REST endpoints handle standard HTTP flows while native WebSockets handle low-latency real-time state broadcast.
- Zero external infrastructure overhead: Stays within Node.js + SQLite architecture.
- Full automated testability: Both HTTP endpoints and real WebSocket clients can be verified in automated test suites and Chrome CDP browser automation.
