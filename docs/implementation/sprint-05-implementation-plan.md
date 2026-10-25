# Sprint 05 Detailed Implementation Plan
**NexusPlay Online Gaming Platform • Sprint 05: Game Progress, History & Achievements**

---

## 1. Scope & Acceptance Criteria Mapping

| Story ID | Story Title | AC ID | Description | Component / Service |
| :--- | :--- | :--- | :--- | :--- |
| **EP07-01** | Save Score | **AC-23.1** | Authenticated player finishes supported game; score appears in player history | `progressService.js`, `routes.js` |
| **EP07-01** | Save Score | **AC-23.2** | Different player cannot view or expose first player's private history records | `progressService.js`, `routes.js` (RBAC & Auth) |
| **EP07-01** | Save Score | **AC-23.3** | Duplicate score report for same game session result is deduplicated (idempotent) | `game_history` unique index on `session_id` |
| **EP07-02** | Resume Level | **AC-24.1** | Player with saved level selects resume; play begins at saved level | `gameLaunchService.js`, `CyberInvadersCanvas.tsx` |
| **EP07-02** | Resume Level | **AC-24.2** | Player with no saved level requested; informative empty state presented | `GamePlayerModal.tsx`, `ProgressHubModal.tsx` |
| **EP07-02** | Resume Level | **AC-24.3** | Access to another player's saved level is strictly denied (HTTP 403) | `progressService.js`, `routes.js` |
| **EP07-03** | 10 Recent Sessions | **AC-25.1** | Player with >10 completed sessions sees exactly the 10 most recent sessions | `progressService.js` (`LIMIT 10`, `ORDER BY completed_at DESC`) |
| **EP07-03** | 10 Recent Sessions | **AC-25.2** | Player with <10 completed sessions sees all available completed sessions | `progressService.js` |
| **EP07-03** | 10 Recent Sessions | **AC-25.3** | Player with no completed sessions sees an informative empty-state message | `ProgressHubModal.tsx`, `GamePlayerModal.tsx` |
| **EP07-04** | Achievements | **AC-26.1** | Player viewing achievements sees earned milestones with title, icon, points | `progressService.js`, `ProgressHubModal.tsx` |
| **EP07-04** | Achievements | **AC-26.2** | Player with no achievements sees an informative empty state | `ProgressHubModal.tsx` |
| **EP07-04** | Achievements | **AC-26.3** | Player viewing achievements cannot see another player's private achievements | `progressService.js`, `routes.js` |

---

## 2. Implementation Tasks & Dependencies

```
[Phase 1: DB Schema Migration]
  ├── Create game_history table with UNIQUE(session_id)
  ├── Create achievements table with seed data
  └── Create player_achievements table with UNIQUE(player_id, achievement_id)
       │
[Phase 2: Backend Progress Engine]
  ├── Build ProgressService (saveScore, getHistory, saveProgress, getProgress, evaluateAchievements)
  ├── Implement Score Velocity & Heuristic Validation (verified vs unverified)
  └── Implement Express routes (/api/v1/progress/*) with auth middleware & player isolation
       │
[Phase 3: Game Integration (Cyber Invaders)]
  ├── Integrate game-over completion call to POST /api/v1/progress/complete
  ├── Support starting from saved level (resumption flow)
  └── Add achievement unlock notifications during gameplay
       │
[Phase 4: Obsidian Arcade Frontend (Progress & History Hub)]
  ├── Build ProgressHubModal.tsx & ProgressHubModal.module.css
  ├── Render 10 Recent Completed Sessions table with status badges
  ├── Render Achievements Grid with glowing unlocked cards & locked states
  ├── Provide Resume Saved Level button in GameDetailsModal & Hub
  └── Add Career & Progress navigation button to Navbar
       │
[Phase 5: Automated Testing Suite]
  ├── Build scripts/test-sprint05-progress.js covering all 12 ACs + security tests
  └── Verify regression suites for Sprints 00, 01, 02, 03, 04
       │
[Phase 6: Chrome CDP Browser QA Automation]
  ├── Build scripts/verify-sprint05-browser.js
  └── Capture genuine screenshots in evidence/sprint-05/screenshots/
       │
[Phase 7: Documentation & Reporting]
  ├── Generate docs/reports/Sprint-05-Implementation-Report.docx
  ├── Update docs/reports/MASTER-Implementation-Record.docx (Version 1.1)
  ├── Write docs/api/game-progress-and-achievements-api.md
  └── Git commit & formal PO closure request
```

---

## 3. Risk Assessment & Mitigations

1. **Client-Side Score Manipulation:**
   - *Mitigation:* Hard score bounds (`0 <= score <= 1,000,000`). Heuristic score velocity validation (max 100 points/second for *Cyber Invaders*). Scores exceeding threshold are flagged `unverified`.
2. **Replayed or Duplicate Score Submissions:**
   - *Mitigation:* `UNIQUE(session_id)` constraint on `game_history`. Duplicate calls return HTTP 200 with `{ duplicate: true }` and original score record without adding rows.
3. **Submissions on Ended or Unowned Sessions:**
   - *Mitigation:* Service verifies session `player_id === req.user.id` and `status === 'active'`. Submitting on ended sessions returns HTTP 400 `SESSION_ALREADY_COMPLETED`.
4. **Data Isolation Across Accounts:**
   - *Mitigation:* All queries filter by `player_id = req.user.id`. Requesting another player's progress or history returns HTTP 403 or empty result.
