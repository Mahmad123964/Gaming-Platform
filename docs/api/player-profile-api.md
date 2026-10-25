# Player Profile & Administrative Audit API Documentation
**NexusPlay Online Gaming Platform • Sprint 06 Baseline • Architecture Version 1.2**

---

## 1. Overview & Architecture

Sprint 06 implements **EP01-04 (Player Profile Management)** and satisfies remaining requirements for **EP11-03 (Administrative Audit Inspection)**. The architecture guarantees persistent player customization, identity protection, cross-player privacy isolation, true database-engine-level audit ledger immutability, and recursive credential redaction.

### Core Architectural Principles (ADR-0006):

1. **Player Profile Management (EP01-04):**
   - **Identity & Customization Persistence:** Signed-in players can view and update display names, avatar emblems, player biographies, and platform preferences (`AC-4.1`).
   - **Validation Bounds:** Display names must be 3–30 characters matching `/^[a-zA-Z0-9_\- ]+$/`. Biographies are capped at 250 characters. Avatar presets are validated against approved asset identifiers or verified HTTPS image URLs (`AC-4.2`).
   - **Atomic Synchronization:** Updating a player's profile synchronizes `players.display_name` with `player_profiles.display_name` in an atomic database transaction. Session state (`req.player.displayName`) is refreshed immediately without token reissuance.
   - **Privileged Field Protection:** Client-submitted values for `role`, `subscription`, `gamerscore`, `email`, `status`, `id`, and password fields are strictly ignored and stripped. Privilege escalation via profile payload is impossible.
   - **Authentication & Privacy Isolation:** Unauthenticated requests receive `HTTP 401 Unauthorized` (`AC-4.3`). Public queries (`GET /api/v1/profile/:playerId`) omit email addresses, in-flight settings, and private preferences (`ISO-PROF-01`).

2. **Administrative Audit Inspection & Database Immutability (EP11-03):**
   - **Action Attribution:** All critical administrative mutations record actor ID, name, role, action, target resource, and ISO-8601 timestamp (`AC-40.1`).
   - **Security Policy Enforcement:** Unauthorized administrative access attempts are rejected with `HTTP 403 Forbidden` and logged in audit storage as `ACCESS_DENIED` (`AC-40.2`).
   - **Audit Inspection & Filtering:** Authorized operators can filter audit records by action, actor, resource, and date range (`AC-40.3`).
   - **True Database-Level Immutability:** SQLite engine triggers (`prevent_audit_events_update` and `prevent_audit_events_delete`) abort any SQL `UPDATE` or `DELETE` attempt on `audit_events` via `RAISE(FAIL, ...)` (`IMMUT-02`, `IMMUT-03`). Direct HTTP mutations (`POST`, `PUT`, `PATCH`, `DELETE` on `/api/v1/admin/audit-events`) return `HTTP 405 Method Not Allowed` (`IMMUT-01`).
   - **Recursive Credential Redaction:** Passwords, tokens, cookies, auth keys, and session secrets are automatically sanitized to `"[REDACTED]"` prior to persistence (`REDACT-01`).

---

## 2. Player Profile API Endpoints (EP01-04)

### 2.1 GET `/api/v1/profile`
Retrieves the complete profile and career summary for the authenticated player.

- **URL:** `/api/v1/profile` (or alias `/api/v1/profile/me`)
- **Method:** `GET`
- **Authentication:** Required (`Bearer` token or HttpOnly `nexusplay_session` cookie).
- **Response Headers:** `Content-Type: application/json`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "profile": {
      "id": "prof-usr-12345",
      "playerId": "usr-12345",
      "email": "player@nexusplay.test",
      "displayName": "VanguardPrime",
      "avatar": "quantum-pilot",
      "bio": "Apex squadron commander. Quantum drift racer.",
      "preferences": {
        "theme": "cyber-neon",
        "soundEnabled": true,
        "notificationsEnabled": true,
        "privacyMode": "public"
      },
      "role": "player",
      "status": "active",
      "subscription": {
        "plan": "Obsidian VIP",
        "status": "active",
        "expiresAt": "2027-01-01T00:00:00.000Z"
      },
      "stats": {
        "totalGamerscore": 250,
        "unlockedAchievements": 5,
        "completedSessions": 18,
        "highestLevelCheckpoint": 6
      },
      "isSelf": true,
      "createdAt": "2026-10-25T06:00:00.000Z",
      "updatedAt": "2026-10-25T06:30:00.000Z"
    },
    "timestamp": "2026-10-25T07:00:00.000Z"
  }
  ```

---

### 2.2 PUT `/api/v1/profile`
Updates the authenticated player's editable profile attributes.

- **URL:** `/api/v1/profile` (or alias `PATCH /api/v1/profile`)
- **Method:** `PUT` / `PATCH`
- **Authentication:** Required (`Bearer` token or HttpOnly session cookie).
- **Security Headers:**
  - `Content-Type: application/json`
  - `X-CSRF-Token: <valid-session-csrf-token>`
- **Request Body:**
  ```json
  {
    "displayName": "VanguardPrime",
    "avatar": "quantum-pilot",
    "bio": "Apex squadron commander. Quantum drift racer.",
    "preferences": {
      "theme": "cyber-neon",
      "soundEnabled": false,
      "notificationsEnabled": true,
      "privacyMode": "friends-only"
    }
  }
  ```
- **Validation Rules:**
  - `displayName` (String, Optional): 3 to 30 characters matching `/^[a-zA-Z0-9_\- ]+$/`.
  - `avatar` (String, Optional): Must be one of `['pilot-cyan', 'cyber-sentinel', 'neon-commander', 'obsidian-ace', 'quantum-ghost', 'retro-droid', 'cyber-neon', 'pixel-invader', 'phantom-scout', 'void-walker', 'quantum-pilot', 'solar-sentinel']` or an authorized `https://` URL.
  - `bio` (String, Optional): Max 250 characters.
  - `preferences.theme` (String, Optional): `obsidian`, `dark`, `cyberpunk`, `dark-obsidian`, `cyber-neon`, or `midnight-void`.
  - `preferences.privacyMode` (String, Optional): `public`, `friends-only`, or `private`.
  - `preferences.soundEnabled` (Boolean, Optional): `true` or `false`.
  - `preferences.notificationsEnabled` (Boolean, Optional): `true` or `false`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Player profile updated successfully.",
    "profile": { ... },
    "timestamp": "2026-10-25T07:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure (e.g. invalid length, illegal characters). Prior values remain unchanged (`AC-4.2`).
  - `401 Unauthorized`: Session token missing or invalid (`AC-4.3`).
  - `403 Forbidden`: CSRF token missing or mismatched.

---

### 2.3 GET `/api/v1/profile/:playerId`
Retrieves a public, sanitized view of any player profile. Enforces privacy filtering.

- **URL:** `/api/v1/profile/:playerId`
- **Method:** `GET`
- **Authentication:** Optional (public) or Authenticated.
- **Response `200 OK` (Public View):**
  ```json
  {
    "success": true,
    "profile": {
      "id": "prof-usr-12345",
      "playerId": "usr-12345",
      "displayName": "VanguardPrime",
      "avatar": "quantum-pilot",
      "bio": "Apex squadron commander.",
      "role": "player",
      "stats": {
        "totalGamerscore": 250,
        "unlockedAchievements": 5,
        "completedSessions": 18
      },
      "isSelf": false
    }
  }
  ```
- **Response `200 OK` (Private Profile Stealth Mode):**
  ```json
  {
    "success": true,
    "profile": {
      "id": "prof-usr-12345",
      "playerId": "usr-12345",
      "displayName": "VanguardPrime",
      "avatar": "quantum-pilot",
      "bio": "",
      "privacyMode": "private",
      "isPrivate": true,
      "message": "This player profile is set to private by the account owner."
    }
  }
  ```
- **Error `404 Not Found`:** If target player ID does not exist.

---

## 3. Administrative Audit API Endpoints (EP11-03)

### 3.1 GET `/api/v1/admin/audit-events`
Queries historical administrative mutation records with multi-criteria filtering and pagination.

- **URL:** `/api/v1/admin/audit-events`
- **Method:** `GET`
- **Authentication:** Required (`role: 'admin'`). Non-admin players receive `HTTP 403 Forbidden`.
- **Query Parameters:**
  - `limit` (Integer, Optional): Number of records per page (default: 50, max: 200).
  - `offset` (Integer, Optional): Offset index for pagination (default: 0).
  - `action` (String, Optional): Filter by mutation action (e.g. `GAME_CREATED`, `GAME_UPDATED`, `GAME_PUBLISHED`, `GAME_UNPUBLISHED`, `LICENSING_UPDATED`, `ACCESS_DENIED`).
  - `actorId` (String, Optional): Filter by actor user ID.
  - `resource` (String, Optional): Filter by target resource identifier.
  - `startDate` (ISO-8601, Optional): Earliest creation timestamp.
  - `endDate` (ISO-8601, Optional): Latest creation timestamp.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "count": 25,
    "total": 142,
    "events": [
      {
        "id": "audit-e0a5bb3f-3180-4df2-b2a1-fa8d7a181822",
        "actorId": "admin-8dc0fd01",
        "actorName": "Admin Officer",
        "actorEmail": "admin@nexusplay.gg",
        "actorRole": "admin",
        "action": "GAME_CREATED",
        "resource": "game:game-001",
        "details": {
          "title": "Cyber Invaders",
          "category": "arcade",
          "maxPlayers": 1,
          "version": "1.0.0"
        },
        "createdAt": "2026-10-25T06:54:31.359Z"
      },
      {
        "id": "audit-77b31910-1849-4ee2-921b-69d2d095bc31",
        "actorId": "usr-mvnh2ukn-457752af",
        "actorName": "OrionVanguard",
        "actorRole": "player",
        "action": "ACCESS_DENIED",
        "resource": "/api/v1/admin/games",
        "details": {
          "method": "POST",
          "reason": "ROLE_AUTHORIZATION_FAILED",
          "ip": "127.0.0.1"
        },
        "createdAt": "2026-10-25T06:54:31.372Z"
      }
    ],
    "timestamp": "2026-10-25T07:00:00.000Z"
  }
  ```

---

### 3.2 Immutability Guarantees
- `POST /api/v1/admin/audit-events` → `HTTP 405 Method Not Allowed`
- `PUT /api/v1/admin/audit-events` → `HTTP 405 Method Not Allowed`
- `PATCH /api/v1/admin/audit-events` → `HTTP 405 Method Not Allowed`
- `DELETE /api/v1/admin/audit-events` → `HTTP 405 Method Not Allowed`
- `DELETE /api/v1/admin/audit-events/:id` → `HTTP 405 Method Not Allowed`
- **Database Engine Triggers:** Direct SQL `UPDATE` and `DELETE` on `audit_events` are aborted by SQLite database engine triggers `prevent_audit_events_update` and `prevent_audit_events_delete` raising `RAISE(FAIL, ...)`.
