# Game Progress, History & Achievements API Documentation
**NexusPlay Online Gaming Platform • Sprint 05 Baseline • Architecture Version 1.1**

---

## 1. Overview & Architecture

Sprint 05 establishes the player career lifecycle engine for the NexusPlay Online Gaming Platform. The architecture provides persistent player session histories, wave/level checkpoint saving and resumption, milestone-driven achievement progression, gamerscore point accumulation, and defense-in-depth score validation.

### Core Architectural Principles (ADR-0005):
1. **Player Data Isolation & RBAC:** All career endpoints enforce strict ownership validation. A player may only record, retrieve, or resume progress belonging to their authenticated `req.player.id`. Cross-player inspections or modification attempts are rejected with `HTTP 403 Forbidden` (`AC-23.2`, `AC-24.3`, `AC-26.3`).
2. **Session Completion Idempotency:** The `game_history` table enforces a unique constraint on `session_id`. Replayed or duplicate game completion requests return `duplicate: true` idempotently with HTTP 200 without duplicating history rows or inflating achievements (`AC-23.3`).
3. **Score Trust Classifications:**
   - Single-player games run on client devices. The backend applies fail-fast boundary checks ($0 \le score \le 1,000,000$) and point velocity heuristics ($\le 120\text{ pts/sec}$).
   - `PLAUSIBILITY_CHECK_PASSED`: Scores passing heuristic checks are classified as plausibility checked. They are **not** labeled authoritatively verified because client-reported canvas outcomes cannot be mathematically proven without server simulation.
   - `UNVERIFIED`: Scores exceeding velocity bounds or lacking duration telemetry.
   - `AUTHORITATIVELY_VERIFIED`: Reserved for future server-authoritative multiplayer simulation.
4. **Session Lifecycle & Transactional Atomicity:**
   - Complete lifecycle: `ACTIVE` → `CHECKPOINT_SAVED` → `COMPLETION_RECORDED` → `SESSION_ENDED`.
   - Completion recording, session transition to `completed`, checkpoint updating, and achievement awarding execute inside an atomic database transaction. Any failure rolls back all mutations cleanly.
   - Sessions already ended reject score submissions with `HTTP 400 Bad Request`.
5. **Resumable Progression:** Supported single-player titles (e.g. Cyber Invaders) save checkpoint waves and scores to `game_progress`. Launching with `{ "resume": true }` initializes the runtime session at the player's saved wave and score (`AC-24.1`). If no progress exists, a new wave 1 session is cleanly initialized (`AC-24.2`).
6. **Recent Session Audit:** Retrieves up to the 10 most recent completed sessions per player sorted in descending chronological order (`ORDER BY completed_at DESC LIMIT 10`) (`AC-25.1`, `AC-25.2`). Abandoned or in-flight sessions are excluded from history (`AC-25.3`).
7. **Provisional Milestone Achievements:** Achievements awarded from client-reported single-player gameplay are explicitly marked with `verification_type = 'PROVISIONAL'`. Duplicate awards are strictly prevented (`AC-26.1`, `AC-26.2`).

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
  - `sessionId` (String, UUID, Required): Must reference an active session owned by the authenticated player.
  - `gameId` (String, Required): Target game ID.
  - `score` (Integer, Required): Must be between `0` and `1,000,000`.
  - `level` (Integer, Optional): Level/Wave reached (default: 1).
  - `durationSeconds` (Integer, Optional): Session duration in seconds (must be >= 0).
  - `metadata` (Object, Optional): Game-specific gameplay metrics.

- **Success Response (HTTP 200 OK — First Completion):**
  ```json
  {
    "status": "SUCCESS",
    "duplicate": false,
    "historyId": "hist-304bfa4d-bb03-4f9e-bf33-a3d82a4666f7",
    "score": 3850,
    "level": 3,
    "verificationStatus": "PLAUSIBILITY_CHECK_PASSED",
    "newAchievements": [
      {
        "id": "ach-001",
        "code": "FIRST_CONTACT",
        "title": "First Contact",
        "description": "Destroy your first alien invader and register telemetry score.",
        "points": 10,
        "icon": "target",
        "verificationType": "PROVISIONAL"
      }
    ],
    "message": "Game score and session history recorded successfully (AC-23.1).",
    "history": {
      "id": "hist-304bfa4d-bb03-4f9e-bf33-a3d82a4666f7",
      "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
      "gameId": "game-001",
      "gameTitle": "Cyber Invaders",
      "sessionId": "ses-91b40fd2-6899-4d69-a1b4-2195f1bc1d88",
      "score": 3850,
      "level": 3,
      "durationSeconds": 145,
      "verificationStatus": "PLAUSIBILITY_CHECK_PASSED",
      "completedAt": "2026-10-25T06:15:00.000Z"
    }
  }
  ```

- **Success Response (HTTP 200 OK — Idempotent Duplicate Completion):**
  ```json
  {
    "status": "SUCCESS",
    "duplicate": true,
    "historyId": "hist-304bfa4d-bb03-4f9e-bf33-a3d82a4666f7",
    "score": 3850,
    "level": 3,
    "verificationStatus": "PLAUSIBILITY_CHECK_PASSED",
    "message": "Game result already recorded for this session. Score was not duplicated (AC-23.3).",
    "newAchievements": []
  }
  ```

- **Error Responses:**
  - `HTTP 400 Bad Request`: Missing `sessionId`, negative score, or score exceeding 1,000,000.
    ```json
    { "error": "INVALID_SCORE_RANGE", "message": "Invalid score: Score must be a non-negative integer (AC-23.1)." }
    ```
  - `HTTP 400 Bad Request`: Session already marked ended.
    ```json
    { "error": "SESSION_ALREADY_COMPLETED", "message": "Cannot record score: The target game session has already ended or terminated (AC-23.1)." }
    ```
  - `HTTP 401 Unauthorized`: Missing or invalid credentials.
  - `HTTP 403 Forbidden`: Session belongs to another player.
    ```json
    { "error": "UNAUTHORIZED_SESSION_ACCESS", "message": "Access denied: You cannot record game progress for another player's session (AC-23.2)." }
    ```
  - `HTTP 404 Not Found`: Session ID does not exist in `game_sessions`.

---

### 2.2 POST `/api/v1/progress/checkpoint`
Saves interim level and score progression for the active game session so the player can resume later.

- **URL:** `/api/v1/progress/checkpoint`
- **Method:** `POST`
- **Authentication:** Required (`Bearer` token or `np_session` cookie).
- **Request Body:**
  ```json
  {
    "gameId": "cyber-invaders",
    "level": 4,
    "score": 4200,
    "state": {
      "wave": 4,
      "lives": 3,
      "bunkerIntegrity": [3, 2, 3]
    }
  }
  ```

- **Success Response (HTTP 200 OK):**
  ```json
  {
    "hasSavedProgress": true,
    "gameId": "game-001",
    "gameTitle": "Cyber Invaders",
    "gameSlug": "cyber-invaders",
    "progress": {
      "id": "prog-810a0df6-a3bd-47c3-bb18-472efbf485e9",
      "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
      "level": 4,
      "score": 4200,
      "state": { "wave": 4, "lives": 3, "bunkerIntegrity": [3, 2, 3] },
      "updatedAt": "2026-10-25T06:15:20.120Z"
    }
  }
  ```

---

### 2.3 GET `/api/v1/progress/checkpoint/:gameIdOrSlug`
Retrieves saved checkpoint progress for the authenticated player.

- **URL:** `/api/v1/progress/checkpoint/:gameIdOrSlug`
- **Method:** `GET`
- **Authentication:** Required.
- **Success Response (HTTP 200 OK — Progress Exists):**
  ```json
  {
    "hasSavedProgress": true,
    "gameId": "game-001",
    "gameTitle": "Cyber Invaders",
    "gameSlug": "cyber-invaders",
    "progress": {
      "id": "prog-810a0df6-a3bd-47c3-bb18-472efbf485e9",
      "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
      "level": 4,
      "score": 4200,
      "state": { "wave": 4, "lives": 3 },
      "updatedAt": "2026-10-25T06:15:20.120Z"
    }
  }
  ```

- **Success Response (HTTP 200 OK — No Saved Progress):**
  ```json
  {
    "hasSavedProgress": false,
    "gameId": "game-001",
    "gameTitle": "Cyber Invaders",
    "gameSlug": "cyber-invaders",
    "progress": null,
    "message": "No saved progress found for \"Cyber Invaders\". You can start a new mission from Level 1 (AC-24.2)."
  }
  ```

---

### 2.4 GET `/api/v1/progress/history/:playerId`
Retrieves up to the 10 most recent completed sessions for the specified player in descending chronological order.

- **URL:** `/api/v1/progress/history/:playerId?limit=10`
- **Method:** `GET`
- **Authentication:** Required.
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
    "totalSessions": 10,
    "history": [
      {
        "id": "gh-304bfa4d-bb03-4f9e-bf33-a3d82a4666f7",
        "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
        "gameId": "game-001",
        "gameTitle": "Cyber Invaders",
        "sessionId": "ses-91b40fd2-6899-4d69-a1b4-2195f1bc1d88",
        "score": 3850,
        "level": 3,
        "durationSeconds": 145,
        "verificationStatus": "PLAUSIBILITY_CHECK_PASSED",
        "completedAt": "2026-10-25T06:15:00.000Z"
      }
    ],
    "isEmpty": false,
    "emptyMessage": "No completed game sessions recorded yet..."
  }
  ```

- **Empty State Response (HTTP 200 OK):**
  ```json
  {
    "playerId": "usr-d779269e-17cf-4963-89ea-baefc4b574a4",
    "totalSessions": 0,
    "history": [],
    "isEmpty": true,
    "emptyMessage": "No completed game sessions recorded yet. Play a mission to build your gaming record (AC-25.3)!"
  }
  ```

---

### 2.5 GET `/api/v1/progress/achievements`
Retrieves all achievements with unlock status and provisional tags.

- **URL:** `/api/v1/progress/achievements`
- **Method:** `GET`
- **Authentication:** Required.
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "totalAchievements": 5,
    "unlockedCount": 3,
    "totalPoints": 60,
    "isEmpty": false,
    "achievements": [
      {
        "id": "ach-first-blood",
        "code": "FIRST_CONTACT",
        "title": "First Contact",
        "description": "Destroy your first alien invader and register telemetry score.",
        "points": 10,
        "icon": "target",
        "gameTitle": "Cyber Invaders",
        "gameSlug": "cyber-invaders",
        "unlocked": true,
        "unlockedAt": "2026-10-25T06:15:00.000Z",
        "verificationType": "PROVISIONAL"
      }
    ]
  }
  ```

---

## 3. Database Schema & Data Integrity

```sql
-- Completed game audit ledger
CREATE TABLE IF NOT EXISTS game_history (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL REFERENCES games(id),
    session_id TEXT UNIQUE REFERENCES game_sessions(id),
    score INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    duration_seconds INTEGER DEFAULT 0,
    verification_status TEXT NOT NULL DEFAULT 'PLAUSIBILITY_CHECK_PASSED',
    details_json TEXT,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player achievement unlocks
CREATE TABLE IF NOT EXISTS player_achievements (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL REFERENCES games(id),
    verification_type TEXT NOT NULL DEFAULT 'PROVISIONAL',
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    UNIQUE(player_id, achievement_id)
);
```

---

## 4. Trust Model & Security Invariants

1. **Plausibility vs Authoritative Verification:** Heuristic verification ($\le 120\text{ pts/sec}$) flags scores as `PLAUSIBILITY_CHECK_PASSED`. Scores are never marked `AUTHORITATIVELY_VERIFIED` in single-player mode.
2. **Idempotency:** Unique index `idx_game_history_session` ensures that replayed session completions return `duplicate: true` idempotently without altering existing scores or creating duplicate history records.
3. **Transactional Integrity:** Session completion status change, history creation, checkpoint persistence, and achievement awards run inside an atomic transaction. Any error rolls back all mutations cleanly.
4. **Data Isolation:** Cross-player inspection or submission attempts strictly return `HTTP 403 Forbidden`.
