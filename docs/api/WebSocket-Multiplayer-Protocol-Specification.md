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

## 2. Handshake, Origin Validation & Authentication

### 2.1 Origin Validation (CSWSH Defense)
Prior to connection upgrade, the server's `verifyClient` validates the client's `Origin` header against an explicit list of permitted origins (`process.env.CLIENT_URL`, `http://localhost:5050`, `http://127.0.0.1:5050`).
- If an untrusted or missing origin is provided in a browser-initiated upgrade, the handshake is rejected with HTTP `403 Forbidden` (`FORBIDDEN_ORIGIN`).
- This defends against Cross-Site WebSocket Hijacking (CSWSH).

### 2.2 Reusable Raw Token Query Parameter Prohibition
Clients MUST NOT transmit raw session tokens as URL query parameters (`/ws?token=...`).
- Any upgrade request containing a `token` query parameter is rejected with HTTP `400 Bad Request` (`RAW_SESSION_TOKENS_FORBIDDEN`).
- This prevents session token leakage in access logs, browser history, reverse proxy logs, and error tracing.

### 2.3 Approved Connection Vectors
Clients initiate a connection to `/ws` through one of two authorized mechanisms:

1. **HttpOnly Session Cookie (Primary Vector for Browsers):**
   ```http
   GET /ws HTTP/1.1
   Host: localhost:5050
   Origin: http://localhost:5050
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13
   Cookie: nexus_session=s%3A7a9b...
   ```

2. **Single-Use Connection Ticket (Headless & Cross-Origin Vector):**
   Clients obtain a short-lived ticket via authenticated REST endpoint:
   ```http
   POST /api/v1/lobbies/ws-ticket HTTP/1.1
   Host: localhost:5050
   Cookie: nexus_session=s%3A... (or Authorization: Bearer <session_token>)
   ```
   Server response:
   ```json
   {
     "success": true,
     "ticket": "wst_c89b2e53df12...",
     "expiresIn": 60,
     "audience": "nexusplay:websocket"
   }
   ```
   Client connects passing the ticket in query parameter or as initial frame:
   ```http
   GET /ws?ticket=wst_c89b2e53df12... HTTP/1.1
   Host: localhost:5050
   Origin: http://localhost:5050
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13
   ```
   Tickets expire in 60 seconds, are single-use (consumed upon connection), audience-scoped to `nexusplay:websocket`, and cannot be used for general REST API access.

### 2.4 Rejection Handling
If authentication credentials are missing, invalid, expired, or revoked:
- The HTTP server terminates the handshake with:
  ```http
  HTTP/1.1 401 Unauthorized
  Content-Type: application/json

  {"success":false,"error":{"code":"UNAUTHORIZED","message":"Authentication required to establish WebSocket connection."}}
  ```
- If an already connected socket's underlying session is revoked, the server issues a downstream `SESSION_REVOKED` frame and terminates the socket with close code `4001`.

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

### 4.4 `AUTH_TICKET`
Transmits a single-use connection ticket to authenticate an unauthenticated socket (if not passed via query string).

```json
{
  "type": "AUTH_TICKET",
  "ticket": "wst_c89b2e53df12..."
}
```

Server responds with downstream `CONNECTION_ESTABLISHED` upon success, or `ERROR` (`INVALID_TICKET`) upon failure.

> [!NOTE]
> Attempting to pass a raw session token via `{ type: "AUTH", token: "..." }` is explicitly rejected with machine code `RAW_SESSION_TOKENS_FORBIDDEN`. Clients must request a connection ticket via `POST /api/v1/lobbies/ws-ticket` or rely on the HttpOnly session cookie.

### 4.5 `PING`
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
| `FORBIDDEN_ORIGIN` | 403 | Handshake rejected due to unapproved or untrusted client Origin header (CSWSH defense). |
| `RAW_SESSION_TOKENS_FORBIDDEN` | 400 | Attempted to pass reusable raw session token via URL query string or WebSocket frame. |
| `INVALID_TICKET` | 401 | Single-use ticket is expired, unrecognized, already consumed, or revoked. |
| `RATE_LIMITED` | 429 | Exceeded invalid invitation code lookup or join threshold (5 attempts / 5 mins). |
| `FORBIDDEN_ROOM_ACCESS` | 403 | Attempted to subscribe or send events to a lobby where player is not a participant. |
| `LOBBY_NOT_FOUND` | 404 | Specified `lobbyId` or invitation code does not exist. |
| `LOBBY_FULL` | 409 | Attempted to join or assign a slot when room capacity (2/2) has been reached. |
| `LOBBY_EXPIRED` | 410 | Invitation code has exceeded its 30-minute validity window. |
| `GAME_NOT_ELIGIBLE_FOR_MULTIPLAYER` | 422 | Target game has `max_players < 2` (single-player title). |
| `INVALID_STATE_TRANSITION` | 409 | Action cannot be performed in current state (e.g., starting an unfilled lobby). |
| `SESSION_REVOKED` | 401 | Backend session invalidated; socket forcefully disconnected (code 4001). |
| `MALFORMED_MESSAGE` | 400 | Payload fails JSON parsing or lacks required `type` field. |
