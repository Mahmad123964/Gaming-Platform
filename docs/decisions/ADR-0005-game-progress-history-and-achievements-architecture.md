# ADR-0005: Game Progress, Session History, and Achievements Architecture
**NexusPlay Online Gaming Platform • Architectural Baseline Version 1.1**

## Status
Accepted & Fully Implemented (Sprint 05 Final Security Verified)

## Context
In Sprint 04, NexusPlay established the Game Launching & Single-Player Foundation, introducing a controlled launch gateway, HMAC-SHA256 launch tickets, and the first playable native HTML5 Canvas arcade game (*Cyber Invaders*).

Sprint 05 introduces player progression persistence, recent completed session history, and game milestone achievements (`EP07-01`, `EP07-02`, `EP07-03`, `EP07-04`). In a browser gaming platform where games run on client devices, score reporting and progression must address security, data isolation, idempotency, and trust models without introducing disproportionate or brittle anti-cheat infrastructure.

## Decision

### 1. Progress & Score Architecture (`ProgressService`)
- We introduce a dedicated `ProgressService` (`server/src/modules/progress/progressService.js`) encapsulating:
  - Game score recording and history persistence (`game_history`).
  - Saved checkpoint / level progression persistence and resumption (`game_progress`).
  - Achievement unlocking and player milestone tracking (`achievements`, `player_achievements`).
- All progress operations require authenticated player identity (`req.player.id`). Unauthenticated guests may play locally, but persistent progress is bound strictly to authenticated accounts.

### 2. Client Score Trust Classification & Defense-in-Depth Model
- **Architectural Reality:** In Sprint 05, *Cyber Invaders* executes as a client-side HTML5 canvas simulation. The backend does **not** authoritatively simulate physics or re-execute game ticks; it receives client-reported telemetry (score, duration, wave reached, game state).
- **Accurate Trust Classifications:**
  - `PLAUSIBILITY_CHECK_PASSED`: Scores falling within verified physical envelopes (e.g. points velocity $\le 120\text{ pts/sec}$, score $\le 500,000$, non-negative score, and positive duration). This indicates the client-reported outcome satisfied heuristic boundary checks, but was **not** authoritatively proven by the server.
  - `UNVERIFIED`: Scores exceeding heuristic velocity limits, missing duration telemetry, or reporting anomalous values. These remain saved for player review without polluting competitive records.
  - `AUTHORITATIVELY_VERIFIED`: Reserved strictly for future server-authoritative simulation (e.g., Sprint 06 multiplayer / server-simulated game instances). Single-player client-reported scores are never classified as authoritatively verified.
- **Fail-Fast Boundary Defense:**
  - Negative scores ($< 0$) and scores exceeding physical maximums ($> 1,000,000$) are rejected outright with `HTTP 400 Bad Request`.
- **Historical Status Migration:**
  - Historical records with `verification_status = 'verified'` are automatically migrated to `PLAUSIBILITY_CHECK_PASSED` via non-destructive database migration scripts.

### 3. Session Lifecycle & Transactional Consistency
- **Lifecycle Progression:** `ACTIVE` → `CHECKPOINT_SAVED` → `COMPLETION_RECORDED` → `SESSION_ENDED`.
- **Atomic Transactional Rollback:**
  - Session completion recording, `game_sessions` status transition to `'completed'`, `game_history` insertion, checkpoint saving, and achievement unlocking are executed within an atomic database transaction (`BEGIN IMMEDIATE` ... `COMMIT`).
  - If any partial failure occurs, all changes rollback cleanly (`ROLLBACK`), preventing inconsistent scores, orphaned history, or partially awarded badges.
- **Idempotency & Replay Protection:**
  - Game completions are tied to unique `session_id` identifiers.
  - An atomic unique index `idx_game_history_session ON game_history(session_id)` guarantees duplicate completion calls for the same session return the original recorded score with `duplicate: true` idempotently without inserting duplicate rows (`AC-23.3`).
- **Post-End Session Gating:**
  - Sessions that have already terminated (`status = 'ended'`) reject subsequent score completion attempts with `HTTP 400 Bad Request` (`SESSION_ALREADY_COMPLETED`).

### 4. Checkpoint Resumption Model (`EP07-02`)
- Checkpoints are saved per `(player_id, game_id)` in `game_progress`.
- For *Cyber Invaders*, progress captures `score`, `level` (wave number), `lives`, and `state_json` (bunker integrity, remaining shields).
- When a player resumes play (`POST /api/v1/games/:idOrSlug/launch?resume=true`), the launch service restores the saved level and score into the newly provisioned session (`AC-24.1`).
- If no saved progress exists, the API returns `{ hasSavedProgress: false }` and the UI presents an informative empty state allowing the player to start from Level 1 (`AC-24.2`).
- Cross-player checkpoint inspection is strictly blocked with `HTTP 403 Forbidden` (`AC-24.3`).

### 5. Recent Completed Session History (`EP07-03`)
- History queries fetch the player's last 10 completed sessions (`status = 'completed'` in `game_sessions` and recorded in `game_history`), ordered by `completed_at DESC, id DESC`.
- Abandoned or in-flight sessions (`status = 'active'`) are excluded to avoid cluttering history.
- If fewer than 10 sessions exist, all available are returned. If 0 exist, an empty state is returned (`AC-25.1..25.3`).
- Strict player isolation: Queries filter by `player_id = req.player.id`. Access to another player's history is blocked (`AC-23.2`).

### 6. Milestone Achievements Engine (`EP07-04`)
- Authoritative achievement definitions are seeded in `achievements`:
  1. `ach-first-blood`: "First Contact" (Score $\ge 10$)
  2. `ach-wave-survivor`: "Grid Sentinel" (Clear Wave 1 and reach Wave 2)
  3. `ach-sharpshooter`: "Deadeye Gunner" (Achieve score $\ge 500$ in one mission)
  4. `ach-veteran-pilot`: "Mainframe Legend" (Achieve score $\ge 1,000$ in one mission)
  5. `ach-iron-hull`: "Bunker Guardian" (Defend all 3 bunkers through a wave)
- **Provisional Classification:**
  - Achievements awarded from client-reported single-player outcomes are explicitly recorded with `verification_type = 'PROVISIONAL'` in `player_achievements` and displayed with a `PROVISIONAL` badge in the UI.
- Uniqueness is guaranteed by a `UNIQUE(player_id, achievement_id)` constraint in `player_achievements` (`AC-26.1`, `AC-26.3`).

### 7. Obsidian Arcade UI Design
- A dedicated **Player Career & Progression Hub** is added to Obsidian Arcade:
  - Saved checkpoint badge & "Resume Mission" button.
  - Recent 10 completed games table with date, score, wave reached, and `⚡ Plausibility Checked` badge.
  - Milestones & Achievements grid displaying earned badges in glowing neon cyan/purple, and locked badges with lock icons, including `PROVISIONAL` status labels.
  - Empty states, toast notifications for unlocked achievements, and error banners.

## Consequences
- **Positive:** Mathematically accurate trust labels preventing false claims of server verification, atomic transaction guarantees eliminating corrupt partial states, robust data isolation, zero score duplication, and clear provisional badges on achievements.
- **Negative:** Acknowledges single-player anti-cheat limits; full cryptographic input replay simulation deferred to competitive multiplayer in Sprint 06+.
