# Architecture Decision Record (ADR-0004) — Game Launch Architecture & Single-Player Foundation

## Status
Accepted

## Date
2026-10-25

## Context
Sprint 04 authorizes the implementation of Game Launching and Single-Player Foundation (`EP03-01`, `EP03-03`, `EP03-04`, `EP04-01`, `EP04-03`).
Prior to Sprint 04, catalog games were metadata-only demonstrations. To transition from catalog discovery to real, secure interactive gameplay, the platform requires:
1. A controlled, secure game launching subsystem (`GameLaunchService`) that enforces publication, licensing approval, VIP entitlement checks, and device/browser compatibility before generating a launch ticket or starting a session.
2. A single-player session lifecycle engine (`SinglePlayerSession`) managing state transitions (initialized, active, paused, game-over, ended, restarted).
3. The platform's first genuinely playable, browser-compatible game (`Cyber Invaders`), engineered in HTML5 Canvas 2D without bulky external dependencies, complying with the Obsidian Arcade visual design system.
4. Protection against unauthorized direct access, launch URL tampering, or licensing bypass.

## Decisions

### 1. Game Launch Service & Secure Launch Ticket Model
- **Choice**: Server-side `GameLaunchService` issuing cryptographically signed, short-lived launch tickets (`launchTicket`) bound to an authorized single-player session.
- **Rationale**:
  - Direct execution of game bundles without server validation is strictly prohibited (`EP03-04`, `AC-12.1`).
  - Strict licensing gate: A game cannot be launched unless its licensing approval status is explicitly `'approved'`. The loose legacy query condition `(l.status = 'approved' OR l.status IS NULL)` is eliminated; unrecorded or non-approved licensing strictly blocks launch with `HTTP 422 Unprocessable Entity` or `HTTP 403 Forbidden`.
  - Entitlement enforcement: Games marked `is_premium = 1` strictly require an authenticated player with an active VIP subscription entitlement (`AC-9.2`). Unauthenticated users or non-VIP accounts are rejected with actionable upgrade requirements.
  - Browser/Device compatibility validation (`EP03-03`): Checks user-agent and client capability headers against known incompatible environments (e.g. legacy browsers lacking Canvas 2D/WebGL, or unsupported form factors), returning clear diagnostic messaging (`AC-11.1`).

### 2. Single-Player Session Lifecycle (`EP04-01`, `EP04-03`)
- **Choice**: Relational session tracking in `game_sessions` table with RESTful endpoints (`/api/v1/sessions/:id/*`).
- **State Machine**:
  - `INITIALIZED` -> `ACTIVE` -> `GAME_OVER` -> `ENDED`
  - Restart transition (`AC-15.1`, `AC-15.3`): When an active or game-over session restarts, session state resets to starting parameters, in-progress score is reset to 0, and a new gameplay wave begins.
  - Session termination (`AC-13.3`): When the player exits or returns to catalog, the session status updates to `ended` with `ended_at = CURRENT_TIMESTAMP`, ensuring terminated sessions cannot be resumed as active.
  - Solo mode validation (`AC-13.2`): Only games supporting solo play (`min_players = 1`) permit single-player session initiation.

### 3. First Playable Game Engine: HTML5 Canvas 2D (`Cyber Invaders`)
- **Choice**: Native HTML5 Canvas 2D rendering engine embedded within the React 19 / TypeScript application container.
- **Rationale**:
  - Zero heavy external dependencies (no multi-megabyte external game engines like Unity WebGL or heavy Phaser bundles) preserves fast load times (< 1.5s) compliant with SRE performance objectives.
  - Smooth 60 FPS animation via `requestAnimationFrame` with high-DPI retina display scaling.
  - Full keyboard accessibility (Arrow keys / A-D to move, Space / Up to fire, P to pause) and touch-friendly on-screen controls for mobile viewports (`AC-11.2`).
  - Genuine retro arcade mechanics: descending waves of neon alien invaders, player laser cannon, destructible defense bunkers, alien projectile hazards, multiple lives, score tracking, wave escalation, game-over screen, and seamless restart.

### 4. Sandboxing & Runtime Security (`EP03-04`)
- **Choice**: Multi-layer security:
  - Game launch endpoints validate Origin/Referer headers and CSRF tokens for state-changing calls.
  - Static game bundle paths are protected against path traversal.
  - Direct access to `/games/:slug/index.html` requires a valid launch ticket or session token; unauthorized direct access returns `HTTP 403 Forbidden`.

## Consequences
- The platform transitions from a pure catalog showcase to an active, verified interactive gaming platform.
- High testability: All launch validation rules, session lifecycle state changes, and gameplay interactions can be deterministically tested via automated HTTP tests and Chrome DevTools Protocol (CDP) browser automation.
