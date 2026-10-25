# ADR-0005: Game Progress, Session History, and Achievements Architecture

## Status
Accepted

## Context
In Sprint 04, NexusPlay established the Game Launching & Single-Player Foundation, introducing a controlled launch gateway, HMAC-SHA256 launch tickets, and the first playable native HTML5 Canvas arcade game (*Cyber Invaders*).

Sprint 05 introduces player progression persistence, recent completed session history, and game milestone achievements (`EP07-01`, `EP07-02`, `EP07-03`, `EP07-04`). In a browser gaming platform where games run on client devices, score reporting and progression must address security, data isolation, idempotency, and trust models without introducing disproportionate or brittle anti-cheat infrastructure.

## Decision

### 1. Progress & Score Architecture (`ProgressService`)
- We introduce a dedicated `ProgressService` (`server/src/modules/progress/progressService.js`) encapsulating:
  - Game score recording and history persistence (`game_history`).
  - Saved checkpoint / level progression persistence and resumption (`game_progress`).
  - Achievement unlocking and player milestone tracking (`achievements`, `player_achievements`).
- All progress operations require authenticated player identity (`req.user.id`). Unauthenticated guests may play locally, but persistent progress is bound strictly to authenticated accounts.

### 2. Client Score Trust Model & Security Guardrails
- **Threat Model:** Because single-player canvas games execute client-side in the player's browser, absolute client trust is an anti-pattern.
- **Dual-Status Score Model:**
  - High scores and session completions are stored with a `verification_status` flag:
    - `'verified'`: Calculated within expected physical simulation envelopes (e.g. maximum points per second <= 100 for *Cyber Invaders*, valid wave boundaries, and non-negative score).
    - `'unverified'`: Scores that exceed heuristic velocity thresholds or lack cryptographic session telemetry, but remain saved for player review without polluting competitive records.
  - Scores violating hard physical constraints (e.g., negative scores, scores exceeding theoretical game maximums, or scores reported for terminated/forged sessions) are rejected with HTTP 400 Bad Request.
- **Idempotency & Replay Protection:**
  - Game completions are tied to unique `session_id` identifiers.
  - An atomic unique index `idx_game_history_session ON game_history(session_id)` guarantees duplicate completion calls for the same session return the original recorded score without inserting duplicate rows (AC-23.3).
- **Session State Gating:**
  - Progress updates targeting sessions that are already `ended` or `completed` are rejected with HTTP 400 `SESSION_ALREADY_COMPLETED`.

### 3. Checkpoint Resumption Model (`EP07-02`)
- Checkpoints are saved per `(player_id, game_id)` in `game_progress`.
- For *Cyber Invaders*, progress captures `score`, `level` (wave number), `lives`, and `state_json` (bunker integrity, remaining shields).
- When a player resumes play (`POST /api/v1/games/:idOrSlug/launch?resume=true`), the launch service restores the saved level into the newly provisioned session.
- If no saved progress exists, the API returns `{ hasSavedProgress: false }` and the UI presents an informative empty state allowing the player to start from Level 1 (AC-24.2).

### 4. Recent Completed Session History (`EP07-03`)
- History queries fetch the player's last 10 completed sessions (`status = 'completed'` in `game_sessions` and recorded in `game_history`), ordered by `completed_at DESC, id DESC`.
- Abandoned or in-flight sessions (`status = 'active'`) are excluded to avoid cluttering history.
- If fewer than 10 sessions exist, all available are returned. If 0 exist, an empty state is returned (AC-25.1..25.3).
- Strict player isolation: Queries filter by `player_id = req.user.id`. Access to another player's history is blocked (AC-23.2).

### 5. Milestone Achievements Engine (`EP07-04`)
- Authoritative achievement definitions are seeded in `achievements`:
  1. `ach-first-blood`: "First Contact" (Destroy first alien, score >= 10)
  2. `ach-wave-survivor`: "Grid Sentinel" (Clear Wave 1 and reach Wave 2)
  3. `ach-sharpshooter`: "Deadeye Gunner" (Achieve score >= 500 in one mission)
  4. `ach-veteran-pilot`: "Mainframe Legend" (Achieve score >= 1,000 in one mission)
  5. `ach-iron-hull`: "Bunker Guardian" (Defend all 3 bunkers through a wave)
- Achievements are awarded upon game completion or milestone event via `ProgressService.evaluateMilestones()`.
- Uniqueness is guaranteed by a `UNIQUE(player_id, achievement_id)` constraint in `player_achievements` (AC-26.1, AC-26.3).

### 6. Obsidian Arcade UI Design
- A dedicated **Player Career & Progression Hub** is added to Obsidian Arcade:
  - Saved checkpoint badge & "Resume Mission" button.
  - Recent 10 completed games table with date, score, wave reached, and verification status badge.
  - Milestones & Achievements grid displaying earned badges in glowing neon cyan/purple, and locked badges with lock icons.
  - Empty states, toast notifications for unlocked achievements, and error banners.

## Consequences
- **Positive:** Robust data isolation, zero score duplication, clear distinction between verified and unverified scores, genuine progression in *Cyber Invaders*, seamless integration into the Obsidian Arcade UX.
- **Negative:** Requires schema extensions (`game_history`, `achievements`, `player_achievements`) and client synchronization logic.
