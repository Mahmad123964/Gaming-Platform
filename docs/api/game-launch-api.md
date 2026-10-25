# Game Launch & Single-Player Session API Documentation
**NexusPlay Online Gaming Platform • Sprint 04 Baseline • Architecture Version 1.0**

---

## 1. Overview & Architecture

Sprint 04 establishes the controlled runtime gateway for browser games on NexusPlay. The architecture decouples game discovery from game execution by enforcing strict multi-gate authorization checks, dynamic device/browser compatibility evaluation, cryptographically signed launch tickets, and single-player session lifecycle tracking.

### Core Architecture Principles:
1. **Multi-Gate Launch Authorization:** A game may only be launched if it exists, is published (`is_published = 1`), has explicit approved licensing clearance (`l.status = 'approved'`), and the player satisfies all entitlement tiers (Free vs. Obsidian VIP).
2. **Direct URL Protection (`directLaunchGuard`):** Direct navigation to static game runtime assets (e.g. `/games/cyber-invaders/index.html`) is protected by middleware that validates a tamper-proof HMAC-SHA256 launch ticket. Requests without tickets, with expired tickets, or with invalid signatures are rejected with HTTP 403 Forbidden.
3. **Session Lifecycle Tracking:** Every launch initiates a solo session record in `game_sessions` with status `'active'`. Sessions track live score, wave, and restart count. Explicit termination transitions the status to `'ended'`.
4. **Clean Session Restart:** Invoking session restart resets the current score to `0` and restarts wave progression without carrying over previous scores or terminating the session container (AC-15.1, AC-15.3).

---

## 2. API Endpoints

### 2.1 POST `/api/v1/games/:idOrSlug/launch`
Validates launch eligibility, provisions a single-player session, and issues a cryptographically signed launch ticket.

- **URL:** `/api/v1/games/:idOrSlug/launch`
- **Method:** `POST`
- **Authentication:** Optional for free titles; Required for VIP premium titles (`is_premium = 1`).
- **Request Headers:**
  - `Content-Type: application/json`
  - `User-Agent: string` (Evaluated for legacy browser compatibility)
  - `Cookie: np_session=...` (Ambient HttpOnly session token, if logged in)
- **Request Body (Optional Capabilities Payload):**
  ```json
  {
    "clientCapabilities": {
      "canvas": true,
      "webgl": true,
      "audio": true,
      "touch": false,
      "screen": { "width": 1920, "height": 1080 }
    }
  }
  ```

- **Success Response (HTTP 200 OK):**
  ```json
  {
    "launchTicket": "ltkt-eyJzZXNzaW9uSWQiOiJzZXMtNTA2MTNjY2QtNy4uLiJ9.1906cb86...",
    "sessionId": "ses-50613ccd-7a24-4db2-a78e-d90f66e556c5",
    "session": {
      "sessionId": "ses-50613ccd-7a24-4db2-a78e-d90f66e556c5",
      "gameId": "game-001",
      "playerId": "guest",
      "mode": "single_player",
      "status": "active",
      "score": 0,
      "wave": 1,
      "restartCount": 0,
      "startedAt": "2026-10-25T04:46:41.647Z"
    },
    "game": {
      "id": "game-001",
      "title": "Cyber Invaders",
      "slug": "cyber-invaders",
      "description": "Defend the neon mainframe against descending cybernetic invaders.",
      "launchUrl": "/games/cyber-invaders/index.html",
      "isPremium": false,
      "category": {
        "id": "cat-arcade",
        "name": "Arcade",
        "slug": "arcade"
      },
      "minPlayers": 1,
      "maxPlayers": 1,
      "supportsBots": false
    },
    "compatibility": {
      "compatible": true,
      "status": "SUPPORTED",
      "message": "Browser and device capabilities fully meet game requirements."
    },
    "launchDestination": "/games/cyber-invaders/index.html?ticket=ltkt-...&session=ses-...",
    "timestamp": "2026-10-25T04:46:41.647Z"
  }
  ```

- **Error Responses:**
  - **HTTP 400 Bad Request:** Missing or empty game identifier, or unsupported browser/device:
    ```json
    {
      "error": "UNSUPPORTED_BROWSER",
      "message": "Unsupported Browser: Internet Explorer is not supported. Please use a modern browser (Chrome, Firefox, Safari, Edge) to play NexusPlay games."
    }
    ```
  - **HTTP 403 Forbidden (Unpublished Title):**
    ```json
    {
      "error": "GAME_UNPUBLISHED",
      "message": "Access Denied: \"Shadow Protocol\" is currently unpublished and unavailable for launch."
    }
    ```
  - **HTTP 403 Forbidden (VIP Subscription Required):**
    ```json
    {
      "error": "VIP_SUBSCRIPTION_REQUIRED",
      "message": "Obsidian VIP Subscription Required: \"Neon Horizon\" requires an active Obsidian VIP membership. Please upgrade your account to launch (AC-9.2).",
      "details": {
        "tier": "Obsidian VIP",
        "gameTitle": "Neon Horizon",
        "upgradeUrl": "/subscriptions/vip"
      }
    }
    ```
  - **HTTP 404 Not Found:**
    ```json
    {
      "error": "GAME_NOT_FOUND",
      "message": "Game \"unknown-game\" not found or is currently unavailable."
    }
    ```
  - **HTTP 422 Unprocessable Entity (Missing/Unapproved Licensing):**
    ```json
    {
      "error": "LICENSING_NOT_APPROVED",
      "message": "Licensing Restriction: \"Unlicensed Title\" has not received approved licensing clearance (AC-9.1)."
    }
    ```

---

### 2.2 POST `/api/v1/sessions/:id/restart`
Restarts an active single-player session, cleanly resetting the player's score to 0 and returning the game to its initial state.

- **URL:** `/api/v1/sessions/:id/restart`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "message": "Game session restarted successfully (AC-15.1, AC-15.3)",
    "session": {
      "sessionId": "ses-50613ccd-7a24-4db2-a78e-d90f66e556c5",
      "gameId": "game-001",
      "status": "active",
      "score": 0,
      "wave": 1,
      "lives": 3,
      "restartCount": 1,
      "restartedAt": "2026-10-25T04:46:41.677Z"
    }
  }
  ```
- **Error Responses:**
  - **HTTP 400 Bad Request:** Session is already terminated (`status = 'ended'`):
    ```json
    {
      "error": "SESSION_TERMINATED",
      "message": "Cannot restart session: Session has already ended."
    }
    ```
  - **HTTP 404 Not Found:**
    ```json
    {
      "error": "SESSION_NOT_FOUND",
      "message": "Session \"nonexistent-session\" not found."
    }
    ```

---

### 2.3 POST `/api/v1/sessions/:id/end`
Terminates a single-player game session when the player exits to the catalog.

- **URL:** `/api/v1/sessions/:id/end`
- **Method:** `POST`
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "message": "Session concluded and marked ended (AC-13.3)",
    "session": {
      "sessionId": "ses-50613ccd-7a24-4db2-a78e-d90f66e556c5",
      "status": "ended",
      "endedAt": "2026-10-25T04:46:41.693Z"
    }
  }
  ```

---

### 2.4 GET `/api/v1/sessions/:id`
Retrieves current telemetry, score, and state for a game session.

- **URL:** `/api/v1/sessions/:id`
- **Method:** `GET`
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "session": {
      "id": "ses-50613ccd-7a24-4db2-a78e-d90f66e556c5",
      "gameId": "game-001",
      "playerId": "guest",
      "mode": "single_player",
      "status": "active",
      "score": 850,
      "wave": 2,
      "restartCount": 0,
      "startedAt": "2026-10-25T04:46:41.647Z",
      "endedAt": null
    }
  }
  ```

---

## 3. Direct Launch URL Guard & Security Architecture

Direct access to static game launch files (`/games/*`) is intercepted by `directLaunchGuard` in `server/src/modules/gameLaunch/routes.js`:

```
User Browser ---> GET /games/cyber-invaders/index.html
                       |
                       v
         [directLaunchGuard Middleware]
                       |
    +------------------+------------------+
    |                                     |
    v                                     v
Missing / Forged Ticket              Valid Ticket Signature & Active Session
    |                                     |
    v                                     v
HTTP 403 Forbidden                   HTTP 200 OK
(AC-12.1 Enforcement)                (Runtime Container Initialized)
```

### Ticket Structure:
`ltkt-<Base64URL(Payload)>.<HMAC_SHA256_Signature>`

### Ticket Payload:
```json
{
  "sessionId": "ses-50613ccd-7a24-4db2-a78e-d90f66e556c5",
  "gameId": "game-001",
  "gameSlug": "cyber-invaders",
  "playerId": "guest",
  "issuedAt": 1792903601718,
  "expiresAt": 1792904501718
}
```

Tickets expire in 15 minutes and become invalid if the associated session is ended.

---

## 4. Traceability Matrix

| Requirement | Acceptance Criteria | API Route / Component | Test Identifier |
| :--- | :--- | :--- | :--- |
| **EP03-01** | AC-9.1: Launch eligible game | `POST /api/v1/games/:idOrSlug/launch` | `LAUNCH-AUTH-01..05` |
| **EP03-01** | AC-9.2: Enforce VIP tier | `POST /api/v1/games/:idOrSlug/launch` | `LAUNCH-VIP-01..05` |
| **EP03-01** | AC-9.3: Nonexistent game 404 | `POST /api/v1/games/:idOrSlug/launch` | `LAUNCH-MISS-01..03` |
| **EP03-03** | AC-11.1: Reject unsupported device | `compatibilityService.js` | `LAUNCH-CMP-01..03` |
| **EP03-03** | AC-11.2: Modern browser support | `compatibilityService.js` | `LAUNCH-CMP-04` |
| **EP03-03** | AC-11.3: Inconclusive fallback | `compatibilityService.js` | `LAUNCH-CMP-05` |
| **EP03-04** | AC-12.1: Unpublished launch 403 | `gameLaunchService.js`, `directLaunchGuard` | `LAUNCH-UNPUB-01..02`, `LAUNCH-BYP-01..03` |
| **EP03-04** | AC-12.2: Newly published launch | `gameLaunchService.js` | `LAUNCH-UNPUB-03` |
| **EP03-04** | AC-12.3: Revoked license 403 | `gameLaunchService.js` | `LAUNCH-LIC-01..02`, `LAUNCH-UNPUB-04` |
| **EP04-01** | AC-13.1: Start solo session | `sessionService.js` | `SESS-LIF-01` |
| **EP04-01** | AC-13.2: Unsupported solo 400 | `sessionService.js` | `SESS-LIF-02..03` |
| **EP04-01** | AC-13.3: End solo session | `POST /api/v1/sessions/:id/end` | `SESS-LIF-04..05` |
| **EP04-03** | AC-15.1: Restart session state | `POST /api/v1/sessions/:id/restart` | `SESS-RST-02..03` |
| **EP04-03** | AC-15.2: Invalid restart 400/404 | `POST /api/v1/sessions/:id/restart` | `SESS-RST-06..07` |
| **EP04-03** | AC-15.3: Score zeroed on restart | `POST /api/v1/sessions/:id/restart` | `SESS-RST-04..05` |
