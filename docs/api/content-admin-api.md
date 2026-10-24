# NexusPlay — Content Administration API Specification

**Service:** Content Administration Subsystem (`ContentAdminService`)  
**Sprint:** 03 (Content Administration)  
**Specification Version:** 1.0.0  
**Status:** Approved & Implemented  
**Date:** October 24, 2026  
**Base URL:** `/api/v1/admin`  
**UML Model Traceability:** `ContentAdminService`, `Game`, `GameCategory`, `LicensingApproval`, `AuditEvent` (`online_gaming_platform_architecture.docx`)  
**Backlog Stories:** `EP03-02`, `EP10-01`, `EP10-02`, `EP10-03`, `EP11-02`  
**Acceptance Criteria:** `AC-10.1`–`10.3`, `AC-35.1`–`35.3`, `AC-36.1`–`36.3`, `AC-37.1`–`37.3`, `AC-39.1`–`39.3`, `AC-40.1`–`40.3`

---

## 1. Overview & Architectural Principles

The Content Administration API provides authorized platform operators and content administrators with comprehensive capabilities to manage game metadata, govern publication lifecycles, enforce distribution licensing clearances, and maintain an immutable security audit ledger.

### Core Architectural Rules:

1. **Role-Based Access Control (RBAC) & Real-Time Verification (EP11-02, AC-39.1..39.3):**
   - All `/api/v1/admin/*` endpoints strictly require an active, unrevoked session cookie or Bearer token belonging to a player with `role === 'admin'`.
   - Unauthenticated requests receive `HTTP 401 Unauthorized`.
   - Authenticated non-admin players receive `HTTP 403 Forbidden`.
   - To prevent stale permission exploits (`AC-39.3`), role authorization queries the live `players` database record on every request. If an admin is demoted, access is revoked immediately without waiting for session expiration.

2. **Draft Content Isolation (EP03-02, AC-10.3):**
   - All newly registered games default to `is_published = 0` (Draft) and licensing status `pending`.
   - Draft content is strictly hidden from public catalog discovery endpoints (`/api/v1/catalog/games`), preventing premature or unauthorized content leakage.

3. **Mandatory Metadata Validation (AC-10.2, AC-35.2):**
   - Strict validation enforces data integrity:
     - `title`: 3–100 characters. Blank rejected (`AC-35.2`).
     - `slug`: Unique alphanumeric and hyphenated identifier (3–60 characters). Duplicate slugs reject with `HTTP 409 Conflict`.
     - `categoryId`: Must correspond to an active category in `game_categories`.
     - `description`: 10–1000 characters.
     - `launchUrl`: Must begin with an absolute root path (`/`) or secure HTTPS scheme (`https://`).
     - `minPlayers` & `maxPlayers`: Integers `>= 1`, where `maxPlayers >= minPlayers`.

4. **Licensing Clearance Enforcement Gate (EP10-03, AC-37.1..37.3):**
   - **Publication Blocking (`AC-37.2`):** Publishing any game whose licensing status is not `'approved'` is strictly blocked with `HTTP 422 Unprocessable Entity` (`code: 'LICENSING_APPROVAL_REQUIRED'`).
   - **Automatic Cascade Revocation (`AC-37.3`):** If an approved, published game's licensing status is changed away from `'approved'` (e.g. to `'rejected'` or `'suspended'`), the system automatically unpublishes the game (`is_published = 0`), immediately removing it from public discovery.

5. **Administrative Change Auditing (EP11-02, AC-40.1..40.3):**
   - All state mutations (`GAME_CREATED`, `GAME_UPDATED`, `GAME_PUBLISHED`, `GAME_UNPUBLISHED`, `LICENSING_UPDATED`) and unauthorized rejection attempts (`ACCESS_DENIED`) write timestamped records to `audit_events` with actor ID, target resource, and JSON details.
   - Audit records are retrievable via `GET /api/v1/admin/audit-events`.

---

## 2. API Endpoints

### 2.1. List Administrative Game Inventory

```http
GET /api/v1/admin/games
```

Retrieves all game records (both published and drafts) joined with category taxonomy and distribution licensing status.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `search` | String | No | `""` | Substring match on title, slug, or description. |
| `category` | String | No | `""` | Filter by category slug or ID. |
| `status` | String | No | `"all"` | Publication state filter: `all`, `published`, `draft`. |
| `licensingStatus` | String | No | `"all"` | Licensing filter: `all`, `approved`, `pending`, `rejected`, `suspended`. |
| `page` | Integer | No | `1` | Pagination page number. |
| `limit` | Integer | No | `20` | Results per page (max 100). |

#### Response — 200 OK

```json
{
  "games": [
    {
      "id": "game-001",
      "title": "Cyber Invaders",
      "slug": "cyber-invaders",
      "description": "Defend the neon mainframe against descending waves of cybernetic intruders...",
      "launchUrl": "/games/cyber-invaders/index.html",
      "isPublished": true,
      "isPremium": false,
      "minPlayers": 1,
      "maxPlayers": 1,
      "supportsBots": false,
      "category": {
        "id": "cat-arcade",
        "name": "Arcade",
        "slug": "arcade"
      },
      "licensing": {
        "id": "lic-001",
        "status": "approved",
        "approvedBy": "NexusAdmin",
        "approvedAt": "2026-10-24T12:00:00Z",
        "notes": "Baseline distribution license approved for catalog launch"
      },
      "createdAt": "2026-10-24T10:00:00.000Z",
      "updatedAt": "2026-10-24T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 9,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "timestamp": "2026-10-24T17:30:00.000Z"
}
```

---

### 2.2. Register Game Launch URL & Metadata (EP03-02)

```http
POST /api/v1/admin/games
```

Registers a new game into the platform catalog as an unpublished draft with pending licensing.

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <token>` | Admin session token (or ambient HttpOnly cookie). |
| `X-CSRF-Token` | `<token>` | Session-bound CSRF token (required for cookie mutations). |
| `Content-Type` | `application/json` | |

#### Request Body

```json
{
  "title": "Hyper Velocity Turbo",
  "slug": "hyper-velocity",
  "categoryId": "cat-arcade",
  "description": "High octane kinetic drift racing set in cyberpunk neon metropolitan canyonways.",
  "launchUrl": "/games/hyper-velocity/index.html",
  "minPlayers": 1,
  "maxPlayers": 4,
  "isPremium": true,
  "supportsBots": true
}
```

#### Response — 201 Created

```json
{
  "message": "Game registered successfully as draft pending licensing review.",
  "game": {
    "id": "game-a1b2c3d4",
    "title": "Hyper Velocity Turbo",
    "slug": "hyper-velocity",
    "isPublished": false,
    "licensing": {
      "status": "pending",
      "notes": "Initial metadata submitted, pending legal clearance"
    }
  },
  "timestamp": "2026-10-24T17:31:00.000Z"
}
```

#### Validation Error Responses:
- `HTTP 400 Bad Request`: Missing mandatory metadata (`AC-10.2`) with field-specific feedback object.
- `HTTP 409 Conflict`: Duplicate game slug (`AC-10.2`).

---

### 2.3. Edit Game Metadata (EP10-01)

```http
PUT /api/v1/admin/games/:id
```

Updates game title, category, description, and player limits.

#### Request Body

```json
{
  "title": "Hyper Velocity Turbo Remix",
  "slug": "hyper-velocity",
  "categoryId": "cat-action",
  "description": "Updated high octane kinetic drift racing with ultra widescreen graphics.",
  "launchUrl": "/games/hyper-velocity/index.html",
  "minPlayers": 1,
  "maxPlayers": 8,
  "isPremium": true,
  "supportsBots": true
}
```

#### Response — 200 OK

```json
{
  "message": "Game metadata updated successfully.",
  "game": {
    "id": "game-a1b2c3d4",
    "title": "Hyper Velocity Turbo Remix",
    "category": { "id": "cat-action", "name": "Action", "slug": "action" }
  },
  "timestamp": "2026-10-24T17:32:00.000Z"
}
```

---

### 2.4. Publish or Unpublish Game (EP10-02)

```http
PATCH /api/v1/admin/games/:id/publish
```

Toggles the public visibility state of a game.

#### Request Body

```json
{
  "isPublished": true
}
```

#### Response — 200 OK (Publication Allowed)

```json
{
  "message": "Game published successfully to public catalog.",
  "result": {
    "id": "game-a1b2c3d4",
    "title": "Hyper Velocity Turbo Remix",
    "isPublished": true,
    "action": "GAME_PUBLISHED",
    "timestamp": "2026-10-24T17:33:00.000Z"
  }
}
```

#### Response — 422 Unprocessable Entity (Licensing Approval Required, AC-37.2)

```json
{
  "error": "LICENSING_APPROVAL_REQUIRED",
  "message": "Publication blocked: Game 'Hyper Velocity Turbo' cannot be published because its licensing status is 'pending'. Only games with 'approved' licensing may be published.",
  "timestamp": "2026-10-24T17:33:05.000Z"
}
```

---

### 2.5. Manage Licensing Clearance (EP10-03)

```http
PUT /api/v1/admin/games/:id/licensing
```

Updates the legal distribution approval status for a game. Automatically unpublishes the game if status is set away from `'approved'`.

#### Request Body

```json
{
  "status": "rejected",
  "notes": "Publisher distribution agreement revoked due to IP dispute."
}
```

#### Response — 200 OK

```json
{
  "message": "Licensing status updated to 'rejected'. Game automatically unpublished due to loss of distribution approval.",
  "result": {
    "gameId": "game-a1b2c3d4",
    "title": "Hyper Velocity Turbo Remix",
    "licensingStatus": "rejected",
    "previousStatus": "approved",
    "autoUnpublished": true,
    "isPublished": false,
    "notes": "Publisher distribution agreement revoked due to IP dispute.",
    "timestamp": "2026-10-24T17:34:00.000Z"
  }
}
```

---

### 2.6. Retrieve Audit Trail (EP11-02)

```http
GET /api/v1/admin/audit-events
```

Retrieves chronological audit events of all administrative actions and rejected unauthorized attempts.

#### Query Parameters:
- `limit`: Max records to return (default 50, max 200).
- `action`: Filter by action name (e.g. `GAME_CREATED`, `ACCESS_DENIED`).
- `resource`: Filter by resource substring (e.g. `game-a1b2c3d4`).

#### Response — 200 OK

```json
{
  "events": [
    {
      "id": "audit-e7c5b6a1",
      "actorId": "admin-f850830c",
      "actorName": "NexusAdmin",
      "actorEmail": "admin@nexusplay.gg",
      "actorRole": "admin",
      "action": "LICENSING_UPDATED",
      "resource": "game:game-a1b2c3d4",
      "details": {
        "previousStatus": "approved",
        "newStatus": "rejected",
        "autoUnpublished": true
      },
      "createdAt": "2026-10-24T17:34:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2026-10-24T17:34:02.000Z"
}
```

---

## 3. Security & Error Matrix

| HTTP Code | Error Name | Trigger Condition |
| :--- | :--- | :--- |
| `401 Unauthorized` | `Unauthorized` | Missing or invalid session token/cookie (`AC-39.2`). |
| `403 Forbidden` | `Forbidden` | Non-admin player account or CSRF validation failure (`AC-39.2`, `AC-35.3`, `AC-36.3`). Logged in audit trail (`AC-40.2`). |
| `400 Bad Request` | `ValidationError` | Missing mandatory fields (title, slug, category, description, launch URL) (`AC-10.2`, `AC-35.2`). |
| `404 Not Found` | `NotFound` | Game ID does not exist in platform database. |
| `409 Conflict` | `Conflict` | Game slug already in use by another game (`AC-10.2`). |
| `422 Unprocessable`| `LICENSING_APPROVAL_REQUIRED` | Attempting to publish a game without `'approved'` licensing clearance (`AC-37.2`). |
