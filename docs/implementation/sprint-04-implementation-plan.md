# NexusPlay — Sprint 04 Implementation Plan: Game Launching & Single-Player Foundation

**Sprint:** 04  
**Date:** 2026-10-25  
**Baseline Commit:** `e6bd485` (Sprint 03 Final Closure Verified)  
**Roles:** Principal Game Platform Architect, Senior React/TypeScript Engineer, Browser Game Developer, Application Security Engineer, QA Automation Lead, Technical Documentation Lead  
**Scope:** `EP03-01`, `EP03-03`, `EP03-04`, `EP04-01`, `EP04-03`  

---

## 1. Traceability & Acceptance Criteria Mapping

| User Story | Criteria ID | Requirement Summary | Architectural Component | Test Verification |
| :--- | :--- | :--- | :--- | :--- |
| **EP03-01** | `AC-9.1` | Published authorized game launch opens approved destination | `GameLaunchService.launchGame()` | Automated + CDP Browser |
| **EP03-01** | `AC-9.2` | Player lacking entitlement (VIP) is denied with requirement info | `GameLaunchService.checkEntitlement()` | Automated + CDP Browser |
| **EP03-01** | `AC-9.3` | Launch destination unavailable returns actionable failure message | `GameLaunchService` availability check | Automated unit & API |
| **EP03-03** | `AC-11.1` | Unsupported device/browser shows clear error message | `DeviceCompatibilityService` | Automated User-Agent tests |
| **EP03-03** | `AC-11.2` | Supported device/browser launches without warning | `DeviceCompatibilityService` | Automated + CDP Browser |
| **EP03-03** | `AC-11.3` | Inconclusive compatibility presents agreed fallback outcome | `DeviceCompatibilityService` | Automated fallback tests |
| **EP03-04** | `AC-12.1` | Direct navigation to unpublished game launch address is denied | `DirectLaunchGuard` middleware | Automated negative URL tests |
| **EP03-04** | `AC-12.2` | Published eligible game launch is not blocked by publication status | `GameLaunchService` | Automated positive tests |
| **EP03-04** | `AC-12.3` | Unpublishing a game (or revoking license) immediately blocks new launches | `GameLaunchService` + live DB | Automated revocation tests |
| **EP04-01** | `AC-13.1` | Player selecting single-player starts solo session | `SinglePlayerSession.create()` | Automated + CDP Browser |
| **EP04-01** | `AC-13.2` | Game not supporting solo play rejects single-player with explanation | `SinglePlayerSession.create()` | Automated capacity check |
| **EP04-01** | `AC-13.3` | Ended session is not presented as active when returning to catalog | `SinglePlayerSession.end()` | Automated state tests |
| **EP04-03** | `AC-15.1` | Restart active session returns to starting state | `SinglePlayerSession.restart()` | Automated + CDP Browser |
| **EP04-03** | `AC-15.2` | Restart with no active session creates no new session | `SinglePlayerSession.restart()` | Automated 404/400 test |
| **EP04-03** | `AC-15.3` | Restarting resets in-progress score to 0 without carrying over | `SinglePlayerSession.restart()` | Automated score reset test |

---

## 2. Technical Architecture & Modules

### Backend Subsystems (`server/src/modules/gameLaunch`):
1. **`gameLaunchService.js`**:
   - `launchGame({ gameIdOrSlug, user, clientCapabilities, userAgent })`
   - Validates existence, publication (`is_published = 1`), explicit licensing approval (`status = 'approved'`), and access tier entitlements (`is_premium = 0` or active VIP subscription).
   - Generates cryptographically secure, time-limited launch tickets (`launchTicket`).
   - Resolves legacy loose licensing condition: strictly requires explicit `'approved'` record in `licensing_approvals`.
2. **`sessionService.js`**:
   - Manages single-player session records in `game_sessions`: `createSession()`, `getSession()`, `restartSession()`, `endSession()`, `updateProgress()`.
   - Enforces solo player limits (`min_players <= 1`).
   - Ensures restart resets score to 0 and reinitializes game state.
3. **`compatibilityService.js`**:
   - Evaluates client environment (Canvas 2D, WebGL, Screen Resolution, Browser Family).
   - Rejects obsolete/incompatible browsers (e.g. legacy MSHTML/IE, text browsers) with diagnostic messages (`AC-11.1`).
4. **`routes.js`**:
   - `POST /api/v1/games/:idOrSlug/launch` -> Validates and launches game, returns session ID & ticket.
   - `GET /api/v1/games/:idOrSlug/launch-status` -> Pre-flight check for launch eligibility & requirements.
   - `GET /api/v1/sessions/:sessionId` -> Get session status & progress.
   - `POST /api/v1/sessions/:sessionId/restart` -> Restart active session (`AC-15.1`).
   - `POST /api/v1/sessions/:sessionId/end` -> Terminate active session (`AC-13.3`).
   - Guard middleware rejecting direct static bundle access without valid launch authorization (`AC-12.1`).

### Frontend Subsystems (`client/src/components/gamePlayer`):
1. **`GamePlayerModal.tsx` & `GamePlayerModal.module.css`**:
   - Obsidian Arcade immersive game viewport.
   - Control bar with: Title, Category badge, Status pill, Score display, Lives remaining, Wave counter, Restart button, Fullscreen toggle, and Exit / Return to Catalog button.
   - Device & browser compatibility banners with clear diagnostics (`AC-11.1`).
   - Premium upgrade requirements banner for VIP-gated titles (`AC-9.2`).
2. **`CyberInvadersCanvas.tsx`**:
   - First Playable Game engine implemented in HTML5 Canvas 2D.
   - Fully interactive gameplay:
     - Player cannon: Moves left/right via Keyboard (Arrow Left/Right, A/D) and on-screen touch buttons; fires lasers via Space, Arrow Up, or Tap.
     - Invaders: 3 rows of 6 retro pixel alien invaders marching horizontally and descending upon edge collisions.
     - Destructible bunkers: 3 defense shields taking damage from both alien bombs and player lasers.
     - Alien projectiles: Periodic randomized laser drops targeting the player.
     - Sound effects (synthesized via Web Audio API, optional/silent fallback).
     - State machine: `READY` -> `PLAYING` -> `PAUSED` -> `GAME_OVER` / `VICTORY`.
     - Score & wave progression: Score increments per alien destroyed, wave clears trigger next wave with speed increment.
     - Reset & restart handler seamlessly resetting player position, lives (3), score (0), bunkers, and alien grid.

---

## 3. Implementation Phasing & Dependencies

1. **Phase 1: Backend Game Launch & Session Engine**
   - Implement `server/src/modules/gameLaunch/` (service, session manager, compatibility checker, routes).
   - Resolve loose licensing query in `server/src/modules/catalog/catalogService.js` (change to strict `l.status = 'approved'`).
   - Mount launch router at `/api/v1/games` and `/api/v1/sessions` in `server/src/app.js`.
2. **Phase 2: First Playable Game Engine (`Cyber Invaders`)**
   - Build `client/src/components/gamePlayer/CyberInvadersCanvas.tsx` with full 60fps canvas loop.
   - Integrate keyboard and mobile touch handlers.
3. **Phase 3: Obsidian Arcade Game Player UI Shell**
   - Build `GamePlayerModal.tsx` and CSS modules with controls, stats strip, loading, and error states.
   - Connect launch action from `GameDetailsModal.tsx` to launch service and open `GamePlayerModal`.
   - Update platform status and navbar/footer indicators to Sprint 04.
4. **Phase 4: Automated Testing Suite (`test-sprint04-launch.js`)**
   - Write comprehensive automated tests covering all 15 ACs: authorized launch, draft rejection, revoked license rejection, VIP entitlement denial, compatibility failures, solo session lifecycle, and restart score zeroing.
   - Execute regression suites for Sprint 03, Sprint 02, Sprint 01, and Sprint 00.
5. **Phase 5: Chrome CDP Browser Verification**
   - Create and run `scripts/verify-sprint04-browser.js` via Chrome DevTools Protocol.
   - Capture genuine screenshots of catalog, launching, active gameplay, game over, restarted game, unauthorized launch, and mobile viewport.
6. **Phase 6: Documentation & Master Record Update**
   - Generate `Sprint-04-Implementation-Report.docx` and update `MASTER-Implementation-Record.docx` to Version 1.0.
   - Update API specifications in `docs/api/game-launch-api.md`.
