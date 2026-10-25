# NexusPlay — WebSocket Multiplayer Protocol Specification

**Document Title:** WebSocket Multiplayer Protocol Specification  
**Project:** NexusPlay Online Gaming Platform  
**Phase:** Phase 3 — Multiplayer & Real-Time Engagement  
**Sprint:** Sprint 08 — Two-Player Multiplayer Sessions  
**Protocol Version:** 1.0.0  
**Transport:** WebSocket (RFC 6455)  
**Encoding:** JSON UTF-8 Text Frames  
**Endpoint:** `ws://<host>:<port>/ws` (or `wss://` in production)  
**Status:** Authoritative  
**Date:** 2026-10-25  

---

## 1. Protocol Architecture & Connection Lifecycle

The NexusPlay real-time multiplayer protocol operates over bi-directional WebSocket connections. All messages are serialized as JSON objects.

```
Client                                                         Server
  |                                                              |
  | -------- HTTP GET /ws (Upgrade: websocket + Cookie) -------> |
  | <------- HTTP 101 Switching Protocols ---------------------- |
  |                                                              |
  | <------- { type: "CONNECTION_ESTABLISHED", playerId, ccu } - |
  |                                                              |
  | -------- { type: "SUBSCRIBE_ROOM", lobbyId } --------------> |
  | <------- { type: "ROOM_SUBSCRIBED", lobbyId } -------------- |
  |                                                              |
  |          [Opponent Joins via HTTP POST /api/v1/lobbies/:id/join]
  |                                                              |
  | <------- { type: "PLAYER_JOINED", lobbyId, participant } --- |
  | <------- { type: "LOBBY_STATE_CHANGED", status: "full" } --- |
  |                                                              |
  |          [Host Starts Match via HTTP POST /api/v1/lobbies/:id/start]
  |                                                              |
  | <------- { type: "MATCH_STARTED", lobbyId, sessionId } ----- |
  |                                                              |
  | -------- { type: "GAME_MOVE", lobbyId, move } -------------> |
  | <------- { type: "MOVE_MADE", lobbyId, move, playerId } ---- |
  |                                                              |
  | <------- Ping frame (every 30s) ---------------------------- |
  | -------- Pong frame ---------------------------------------> |
  |                                                              |
```

---

## 2. Handshake & Authentication

### 2.1 Connection Vectors
Clients initiate a connection to `/ws` through one of two verified methods:
1. **Cookie Authentication (Primary Browser Vector):**
   ```http
   GET /ws HTTP/1.1
   Host: localhost:5050
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13
   Cookie: nexus_session=s%3A7a9b...
   ```
2. **Bearer Token Authentication (Headless & Testing Vector):**
   ```http
   GET /ws?token=7a9b... HTTP/1.1
   Host: localhost:5050
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13
   ```

### 2.2 Rejection Handling
If authentication credentials are missing, invalid, expired, or revoked:
- The HTTP server terminates the handshake with:
  ```http
  HTTP/1.1 401 Unauthorized
  Content-Type: application/json

  {"success":false,"error":{"code":"UNAUTHORIZED","message":"Authentication required to establish WebSocket connection."}}
  ```

---

## 3. Server-to-Client Frames (Downstream)

### 3.1 `CONNECTION_ESTABLISHED`
Transmitted immediately upon handshake acceptance.

```json
{
  "type": "CONNECTION_ESTABLISHED",
  "playerId": "user-host-01",
  "username": "host_player",
  "ccu": 4,
  "timestamp": "2026-10-25T14:30:00.000Z"
}
```

### 3.2 `ROOM_SUBSCRIBED`
Acknowledge that client socket is bound to a specific room.

```json
{
  "type": "ROOM_SUBSCRIBED",
  "lobbyId": "lobby-9a8b-1234",
  "timestamp": "2026-10-25T14:30:01.000Z"
}
```

### 3.3 `PLAYER_JOINED` (AC-17.1, AC-18.2)
Broadcast to all players in the lobby when a guest joins via invitation code.

```json
{
  "type": "PLAYER_JOINED",
  "lobbyId": "lobby-9a8b-1234",
  "participant": {
    "playerId": "user-guest-02",
    "username": "challenger_guest",
    "displayName": "Challenger Guest",
    "role": "guest",
    "joinedAt": "2026-10-25T14:30:05.000Z"
  },
  "currentPlayers": 2,
  "maxPlayers": 2,
  "status": "full",
  "timestamp": "2026-10-25T14:30:05.000Z"
}
```

### 3.4 `LOBBY_STATE_CHANGED` (AC-18.1, AC-18.2)
Broadcast whenever the authoritative state machine changes lobby status.

```json
{
  "type": "LOBBY_STATE_CHANGED",
  "lobbyId": "lobby-9a8b-1234",
  "status": "full",
  "currentPlayers": 2,
  "maxPlayers": 2,
  "timestamp": "2026-10-25T14:30:05.100Z"
}
```

### 3.5 `MATCH_STARTED` (AC-18.3)
Broadcast when the host initiates the two-player match.

```json
{
  "type": "MATCH_STARTED",
  "lobbyId": "lobby-9a8b-1234",
  "sessionId": "match-sess-5f6e-7890",
  "gameId": "game-003",
  "status": "active",
  "turn": "host",
  "timestamp": "2026-10-25T14:30:10.000Z"
}
```

### 3.6 `MOVE_MADE`
Broadcast when a player submits a valid turn move during an active match.

```json
{
  "type": "MOVE_MADE",
  "lobbyId": "lobby-9a8b-1234",
  "playerId": "user-host-01",
  "move": {
    "from": [1, 4],
    "to": [3, 4],
    "piece": "P"
  },
  "turn": "guest",
  "timestamp": "2026-10-25T14:30:15.000Z"
}
```

### 3.7 `SESSION_REVOKED` (Security Requirement)
Transmitted prior to hard termination if the user's session is invalidated on the backend.

```json
{
  "type": "SESSION_REVOKED",
  "error": {
    "code": "SESSION_REVOKED",
    "message": "Authentication session has been invalidated or expired."
  },
  "timestamp": "2026-10-25T14:35:00.000Z"
}
```

### 3.8 `ERROR`
Standard error message payload.

```json
{
  "type": "ERROR",
  "error": {
    "code": "FORBIDDEN_ROOM_ACCESS",
    "message": "Player is not an authorized participant of this lobby."
  },
  "timestamp": "2026-10-25T14:30:20.000Z"
}
```

---

## 4. Client-to-Server Frames (Upstream)

### 4.1 `SUBSCRIBE_ROOM`
Registers the caller's active WebSocket to receive broadcasts for a specific room. Caller must be an authorized member.

```json
{
  "type": "SUBSCRIBE_ROOM",
  "lobbyId": "lobby-9a8b-1234"
}
```

### 4.2 `UNSUBSCRIBE_ROOM`
Removes the socket from the room subscription set.

```json
{
  "type": "UNSUBSCRIBE_ROOM",
  "lobbyId": "lobby-9a8b-1234"
}
```

### 4.3 `GAME_MOVE`
Submits a gameplay move for validation and broadcast to the opponent.

```json
{
  "type": "GAME_MOVE",
  "lobbyId": "lobby-9a8b-1234",
  "move": {
    "from": [1, 4],
    "to": [3, 4],
    "piece": "P"
  }
}
```

### 4.4 `PING`
Application-layer keepalive ping.

```json
{
  "type": "PING"
}
```

Server responds with:
```json
{
  "type": "PONG",
  "timestamp": "2026-10-25T14:30:00.000Z"
}
```

---

## 5. Machine-Readable Error Codes

| Error Code | HTTP Equiv | Description |
|:---|:---:|:---|
| `UNAUTHORIZED` | 401 | Connection or message attempted without valid authentication credentials. |
| `FORBIDDEN_ROOM_ACCESS` | 403 | Attempted to subscribe or send events to a lobby where player is not a participant. |
| `LOBBY_NOT_FOUND` | 404 | Specified `lobbyId` does not exist in active registry or database. |
| `LOBBY_FULL` | 409 | Attempted to join or assign a slot when room capacity (2/2) has been reached. |
| `LOBBY_EXPIRED` | 410 | Invitation code has exceeded its 30-minute validity window. |
| `GAME_NOT_ELIGIBLE_FOR_MULTIPLAYER` | 422 | Target game has `max_players < 2` (single-player title). |
| `INVALID_STATE_TRANSITION` | 409 | Action cannot be performed in current state (e.g., starting an unfilled lobby). |
| `SESSION_REVOKED` | 401 | Backend session invalidated; socket forcefully disconnected. |
| `MALFORMED_MESSAGE` | 400 | Payload fails JSON parsing or lacks required `type` field. |
