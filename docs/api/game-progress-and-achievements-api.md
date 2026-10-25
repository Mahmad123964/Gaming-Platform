# Game Progress, History & Achievements API Documentation
**NexusPlay Online Gaming Platform • Sprint 05 Baseline • Architecture Version 1.1**

---

## 1. Overview & Architecture

Sprint 05 establishes the player career lifecycle engine for the NexusPlay Online Gaming Platform. The architecture provides persistent player session histories, wave/level checkpoint saving and resumption, milestone-driven achievement progression, gamerscore point accumulation, and defense-in-depth score validation.

### Core Architectural Principles (ADR-0005):
1. **Player Data Isolation & RBAC:** All career endpoints enforce strict ownership validation. A player may only record, retrieve, or resume progress belonging to their authenticated `req.player.id`. Cross-player inspections or modification attempts are rejected with `HTTP 403 Forbidden` (`AC-23.2`, `AC-24.3`, `AC-26.3`).
2. **Session Completion Idempotency:** The `game_history` table enforces a unique constraint on `session_id`. Replayed or duplicate game completion requests return `duplicate: true` idempotently with HTTP 200 without duplicating history rows or inflating achievements (`AC-23.3`).
3. **Score Trust Model & Velocity Heuristics:** Client-reported scores are validated against mathematical bounds (`0 <= score <= 1,000,000`). Completed sessions evaluate the simulated score velocity (`score / duration_seconds`). Scores generated at `<= 120 pts/sec` are classified as `'verified'`. Scores exceeding physical gameplay capabilities or lacking telemetry are recorded but designated `'unverified'`.
4. **Resumable Progression:** Supported single-player titles (e.g. Cyber Invaders) save checkpoint waves and scores to `game_progress`. Launching with `{ "resume": true }` initializes the runtime session at the player's saved wave and score (`AC-24.1`). If no progress exists, a new wave 1 session is cleanly initialized (`AC-24.2`).
5. **Recent Session Audit:** Retrieves up to the 10 most recent completed sessions per player sorted in descending chronological order (`ORDER BY completed_at DESC LIMIT 10`) (`AC-25.1`, `AC-25.2`). Abandoned or uncompleted sessions are excluded from history (`AC-25.3`).
6. **Milestone Achievements:** Game-specific achievements are evaluated against session metrics. Unlocking an achievement grants gamerscore points, records an immutable unlock timestamp, and issues real-time notifications (`AC-26.1`). Duplicate awards are prevented at the database layer (`AC-26.2`).

---

## 2. API Endpoints

### 2.1 POST `/api/v1/progress/complete`
Records a completed game session into `game_history`, evaluates achievement unlocks, updates current level progress, and marks the session as completed.

- **URL:** `/api/v1/progress/complete`
- **Method:** `POST`
- **Authentication:** Required (`Bearer` token or `np_session` cookie).
- **Request Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt>`
- **Request Body:**
  ```json
  {
    "sessionId": "ses-91b40fd2-6899-4d69-a1b4-2195f1bc1d88",
    "gameId": "game-001",
    "score": 3850,
    "level": 3,
    "durationSeconds": 145,
    "gameMode": "single_player",
    "metadata": {
      "enemiesDestroyed": 77,
      "bunkersIntact": 2
    }
  }
  ```

- **Field Constraints:**
  - `sessionId` (String, UUID, Required): Must reference an existing session owned by the authenticated player.
  - `gameId` (String, Required): Target game ID.
  - `score` (Integer, Required): Must be between `0` and `1,000,000`.
  - `level` (Integer, Optional): Level/Wave reached (default: 1).
  - `durationSeconds` (Integer, Optional): Session duration in seconds (must be >= 0).
  - `metadata` (Object, Optional): Game-specific gameplay metrics.

- **Success Response (HTTP 200 OK — First Completion):**
  ```json
  {
    "success": true,
    "historyId": "hist-304bfa4d-bb03-4f9e-bf33-a3d82a4666f7",
    "verificationStatus": "verified",
    "newAchievements": [
      {
        "id": "ach-001",
        "code": "FIRST_CONTACT",
        "title": "First Contact",
        "description": "Score at least 10 points in Cyber Invaders",
        "points": 10,
        "badgeIcon": "crosshair"
      }
    ],
    "message": "Game session completed and recorded successfully"
  }
  ```

- **Success Response (HTTP 200 OK — Idempotent Duplicate Completion):**
  ```json
  {
    "success": true,
    "historyId": "hist-304bfa4d-bb03-4f9e-bf33-a3d82a4666f7",
    "duplicate": true,
    "message": "Session score already recorded (idempotent submission)"
  }
  ```

- **Error Responses:**
  - `HTTP 400 Bad Request`: Missing `sessionId`, negative score, or score exceeding 1,000,000.
    ```json
    { "error": "Invalid score value. Score must be between 0 and 1,000,000." }
    ```
  - `HTTP 400 Bad Request`: Session already marked ended or terminated.
    ```json
    { "error": "Session is already ended and cannot be modified." }
    ```
  - `HTTP 401 Unauthorized`: Missing or invalid credentials.
  - `HTTP 403 Forbidden`: Session belongs to another player.
    ```json
    { "error": "Unauthorized: Session belongs to another player" }
    ```

---

### 2.2 POST `/api/v1/progress/checkpoint`
Saves interim level and score progression for the active game session so the player can resume later.

- **URL:** `/api/v1/progress/checkpoint`
- **Method:** `POST`
- **Authentication:** Required (`Bearer` token or `np_session` cookie).
- **Request Body:**
  ```json
  {
    "gameId": "game-001",
    "level": 4,
    "score": 4200,
    "stateJson": {
      "wave": 4,
      "lives": 3,
      "shields": 1
    }
  }
  ```

- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "progress": {
      "gameId": "game-001",
      "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
      "currentLevel": 4,
      "highestScore": 4200,
      "state": { "wave": 4, "lives": 3, "shields": 1 },
      "lastPlayedAt": "2026-10-25T05:58:20.120Z"
    },
    "message": "Progress checkpoint saved successfully"
  }
  ```

- **Error Responses:**
  - `HTTP 400 Bad Request`: Missing `gameId` or negative level.
  - `HTTP 401 Unauthorized`: Unauthenticated request.

---

### 2.3 GET `/api/v1/progress/checkpoint/:gameId/:playerId`
Retrieves the saved checkpoint progress for a specific player and game. Used to determine if the player can resume.

- **URL:** `/api/v1/progress/checkpoint/:gameId/:playerId`
- **Method:** `GET`
- **Authentication:** Required.
- **Parameters:**
  - `gameId`: Game ID (e.g., `game-001`).
  - `playerId`: Player ID (must match `req.player.id` unless requester is an Administrator).

- **Success Response (HTTP 200 OK — Progress Exists):**
  ```json
  {
    "hasSavedProgress": true,
    "progress": {
      "id": "prog-810a0df6-a3bd-47c3-bb18-472efbf485e9",
      "gameId": "game-001",
      "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
      "currentLevel": 4,
      "highestScore": 4200,
      "state": { "wave": 4, "lives": 3, "shields": 1 },
      "lastPlayedAt": "2026-10-25T05:58:20.120Z"
    }
  }
  ```

- **Success Response (HTTP 200 OK — No Progress Saved):**
  ```json
  {
    "hasSavedProgress": false,
    "progress": null
  }
  ```

- **Error Responses:**
  - `HTTP 401 Unauthorized`: Unauthenticated request.
  - `HTTP 403 Forbidden`: Player A attempting to query Player B's saved progress (`AC-24.3`).
    ```json
    { "error": "Unauthorized access to player progress" }
    ```

---

### 2.4 GET `/api/v1/progress/history/:playerId`
Retrieves up to the 10 most recent completed sessions for the specified player in descending chronological order.

- **URL:** `/api/v1/progress/history/:playerId?limit=10`
- **Method:** `GET`
- **Authentication:** Required.
- **Query Parameters:**
  - `limit`: Optional integer (defaults to `10`, max `50`).
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
    "totalSessions": 14,
    "count": 10,
    "history": [
      {
        "id": "hist-c001",
        "sessionId": "ses-001",
        "gameId": "game-001",
        "gameTitle": "Cyber Invaders",
        "gameSlug": "cyber-invaders",
        "score": 3850,
        "level": 3,
        "durationSeconds": 145,
        "gameMode": "single_player",
        "verificationStatus": "verified",
        "completedAt": "2026-10-25T05:58:20.000Z"
      }
    ]
  }
  ```

- **Empty State Response (HTTP 200 OK — 0 Games Completed):**
  ```json
  {
    "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
    "totalSessions": 0,
    "count": 0,
    "history": [],
    "emptyMessage": "No completed game sessions found. Play a game to build your career history!"
  }
  ```

- **Error Responses:**
  - `HTTP 403 Forbidden`: Cross-player history inspection blocked (`AC-23.2`).
    ```json
    { "error": "Unauthorized access to player history" }
    ```

---

### 2.5 GET `/api/v1/progress/achievements/:playerId`
Retrieves all achievements for a player, including unlock status, earned timestamps, and total gamerscore points.

- **URL:** `/api/v1/progress/achievements/:playerId?gameId=game-001`
- **Method:** `GET`
- **Authentication:** Required.
- **Query Parameters:**
  - `gameId`: Optional game ID filter.
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
    "totalGamerscore": 60,
    "unlockedCount": 3,
    "totalAchievements": 5,
    "achievements": [
      {
        "id": "ach-001",
        "gameId": "game-001",
        "code": "FIRST_CONTACT",
        "title": "First Contact",
        "description": "Score at least 10 points in Cyber Invaders",
        "points": 10,
        "badgeIcon": "crosshair",
        "isUnlocked": true,
        "unlockedAt": "2026-10-25T05:50:00.000Z"
      },
      {
        "id": "ach-002",
        "gameId": "game-001",
        "code": "GRID_SENTINEL",
        "title": "Grid Sentinel",
        "description": "Score at least 20 points in Cyber Invaders",
        "points": 20,
        "badgeIcon": "shield",
        "isUnlocked": true,
        "unlockedAt": "2026-10-25T05:52:00.000Z"
      },
      {
        "id": "ach-003",
        "gameId": "game-001",
        "code": "DEADEYE_GUNNER",
        "title": "Deadeye Gunner",
        "description": "Score at least 30 points in Cyber Invaders",
        "points": 30,
        "badgeIcon": "target",
        "isUnlocked": false,
        "unlockedAt": null
      }
    ]
  }
  ```

- **Empty State Response (HTTP 200 OK — 0 Unlocked):**
  ```json
  {
    "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
    "totalGamerscore": 0,
    "unlockedCount": 0,
    "totalAchievements": 5,
    "achievements": [ ... ],
    "emptyMessage": "No achievements earned yet. Play games and hit high scores to unlock badges!"
  }
  ```

- **Error Responses:**
  - `HTTP 403 Forbidden`: Cross-player private achievement status hidden (`AC-26.3`).
    ```json
    { "error": "Unauthorized access to player achievements" }
    ```

---

### 2.6 POST `/api/v1/games/:idOrSlug/launch` (with Resume Option)
Enhanced launch endpoint supporting wave checkpoint resumption (`EP07-02`, `AC-24.1`).

- **URL:** `/api/v1/games/:idOrSlug/launch`
- **Method:** `POST`
- **Request Body (Resuming Saved Level):**
  ```json
  {
    "resume": true,
    "clientCapabilities": {
      "canvas": true,
      "webgl": true
    }
  }
  ```

- **Success Response (HTTP 200 OK — Resumed at Saved Checkpoint):**
  ```json
  {
    "launchTicket": "ltkt-eyJzZXNzaW9uSWQiOiJzZXMtNTA2MTNjY2QtNy4uLiJ9.1906cb86...",
    "sessionId": "ses-50613ccd-7a24-4db2-a78e-d90f66e556c5",
    "resumed": true,
    "session": {
      "sessionId": "ses-50613ccd-7a24-4db2-a78e-d90f66e556c5",
      "gameId": "game-001",
      "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
      "mode": "single_player",
      "status": "active",
      "score": 4200,
      "wave": 4,
      "restartCount": 0,
      "startedAt": "2026-10-25T05:58:25.000Z"
    },
    "game": {
      "id": "game-001",
      "slug": "cyber-invaders",
      "title": "Cyber Invaders"
    }
  }
  ```

---

## 3. Database Integrity & Constraints

### 3.1 Relational Schema Diagram
```
+--------------------+           +------------------------+
|    game_sessions   |           |      game_history      |
+--------------------+           +------------------------+
| id (PK, UUID)      | <-------+ | id (PK, UUID)          |
| game_id (FK)       |           | session_id (FK, UNIQUE)|
| player_id (FK)     |           | player_id (FK)         |
| status             |           | game_id (FK)           |
| score              |           | score (INTEGER)        |
| wave / level       |           | level (INTEGER)        |
| restart_count      |           | verification_status    |
+--------------------+           +------------------------+
           |                                  |
           v                                  v
+--------------------+           +------------------------+
|   game_progress    |           |   player_achievements  |
+--------------------+           +------------------------+
| id (PK, UUID)      |           | id (PK, UUID)          |
| player_id (FK)     |           | player_id (FK)         |
| game_id (FK)       |           | achievement_id (FK)    |
| current_level      |           | unlocked_at (DATETIME) |
| highest_score      |           | session_id (FK)        |
| UNIQUE(player,game)|           | UNIQUE(player,achieve) |
+--------------------+           +------------------------+
```

### 3.2 Integrity Invariants
1. **Idempotency Guarantee:** `UNIQUE INDEX idx_game_history_session ON game_history(session_id)` guarantees that no single session can be recorded more than once.
2. **Duplicate Badge Prevention:** `UNIQUE INDEX idx_player_achievements_unique ON player_achievements(player_id, achievement_id)` prevents granting the same achievement more than once to a player.
3. **Single Checkpoint Per Title:** `UNIQUE INDEX idx_game_progress_player_game ON game_progress(player_id, game_id)` ensures only one active checkpoint state exists per player-game pair.
4. **Referential Integrity:** Foreign keys link to `users(id)` and `games(id)`. Cascade or delete constraints prevent dangling progress data.

---

## 4. Error Code Summary

| HTTP Status | Error String | Cause / Resolution |
| :--- | :--- | :--- |
| `400 Bad Request` | `Invalid score value. Score must be between 0 and 1,000,000.` | Score submitted was `< 0` or `> 1,000,000`. |
| `400 Bad Request` | `Session is already ended and cannot be modified.` | Attempted to submit completion for an expired/ended session. |
| `401 Unauthorized` | `Authentication token missing or invalid.` | User is not logged in or JWT is expired. |
| `403 Forbidden` | `Unauthorized access to player history` | Requesting history for a player ID other than caller's authenticated ID. |
| `403 Forbidden` | `Unauthorized access to player progress` | Requesting checkpoint for a player ID other than caller's authenticated ID. |
| `403 Forbidden` | `Unauthorized access to player achievements` | Requesting private achievements for another player. |
| `404 Not Found` | `Session not found or invalid.` | Session UUID does not exist in `game_sessions`. |
| `500 Server Error` | `Internal progress engine error.` | Database or runtime exception caught and safely wrapped. |
