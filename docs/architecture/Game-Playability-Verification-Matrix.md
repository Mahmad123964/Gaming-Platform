# NexusPlay Architecture & QA — Game Playability Verification Matrix

**Document ID:** ARCH-GPVM-001  
**Milestone:** 2.9 Final Certification  
**Status:** AUDITED & SOURCE-VERIFIED  
**Date:** 2026-10-26  
**Auditors:** Principal HTML5 Gaming Platform Architect, QA Automation Lead, Game Licensing Auditor  

---

## 1. Executive Summary & Audit Methodology

In strict compliance with the Milestone 2.9 mandate, this matrix establishes an authoritative, source-backed audit of every game record within the NexusPlay catalog. 

**Playability Invariant:** A game is **never** certified as playable merely because an entry exists in SQLite table `games`, a promotional card renders in the UI catalog, or a launch-ticket API endpoint responds with HTTP 200. Playability requires a verified, executable runtime that loads valid visual and logic assets, binds player input controls (keyboard, mouse, or touch), executes authoritative state transitions, and concludes gameplay sessions correctly.

### Playability Classification Taxonomy

Every catalog entry is assigned to exactly one of six authoritative tiers:

| Status Code | Definition | Criteria |
|:---|:---|:---|
| `VERIFIED_PLAYABLE` | Genuine, fully functional runtime | Standalone HTML5/Canvas engine loads, renders, processes controls, advances state, and submits score/checkpoints. |
| `PLAYABLE_WITH_LIMITATIONS` | Functional runtime under specific modes | Operates in multiplayer lobbies or AI bot matches, but lacks standalone single-player canvas modal. |
| `INTEGRATION_PENDING` | Catalog record exists; engine unintegrated | Metadata and DB record configured; underlying HTML5 game engine files have not yet been imported or developed. |
| `EXTERNAL_STORE_ONLY` | Legitimate external referral | Owned by third-party publisher; UI provides outbound link to official app store. "Play Now" and in-platform billing strictly disabled. |
| `LICENSE_PENDING` | Commercial/IP clearance pending | Distribution rights have not been legally cleared or approved. Launch endpoint strictly blocked with HTTP 422. |
| `BROKEN_OR_UNAVAILABLE` | Defective or removed runtime | Runtime files missing, corrupt, or producing fatal JavaScript exceptions on boot. |

---

## 2. Comprehensive Catalog Audit Ledger

| Game ID | Game Slug | Title | Commercial Model | Integration Type | Verified Playability Status | Runtime Engine Location | Tested Controls | Limitations / Technical Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| `game-001` | `cyber-invaders` | Cyber Invaders | `FREE` | `SELF_HOSTED` | **`VERIFIED_PLAYABLE`** | `client/src/components/gamePlayer/CyberInvadersCanvas.tsx` | Keyboard (Arrows/Space), Mobile Virtual Controls | Full 60 FPS HTML5 canvas arcade shooter. Verified laser physics, alien fleet rendering, score progression, collision, restart, and history. |
| `game-2048` | `2048-classic` | 2048 Classic | `FREE` | `SELF_HOSTED` | **`VERIFIED_PLAYABLE`** | `client/src/components/gamePlayer/Classic2048.tsx` & `server/public/games/2048/index.html` | Keyboard (Arrows/WASD), Touch Swipe, On-Screen D-Pad | Legally redistributable MIT bundle by Gabriele Cirulli. Verified tile sliding, merging, live score, restart, responsive viewport, and attribution notice. |
| `game-002` | `obsidian-chess` | Obsidian Chess | `FREE` | `SELF_HOSTED` | **`PLAYABLE_WITH_LIMITATIONS`** | `client/src/components/multiplayer/MultiplayerLobbyModal.tsx` & `server/src/modules/multiplayer/botService.js` | Mouse / Touch Click | Fully playable in 2-Player real-time WebSocket lobbies and instant Single-Player AI Bot matches (500-1500ms heuristic move latency). Lacks standalone solo canvas modal. |
| `game-003` | `quantum-grid` | Quantum Grid | `FREE` | `SELF_HOSTED` | **`INTEGRATION_PENDING`** | `server/public/games/quantum-grid/` (Stub only) | N/A | Turn-based strategy puzzle stub. Catalog metadata and category exist, but dedicated runtime engine is not yet implemented. |
| `game-004` | `neon-horizon` | Neon Horizon | `PAID_ONE_TIME` | `SELF_HOSTED` | **`INTEGRATION_PENDING`** | `server/public/games/neon-horizon/` (Stub only) | N/A | Premium cyberpunk racer stub. Used for entitlement gating and regional pricing tests (reconciled ₹149 / 14,900 minor units). Engine import pending. |
| `game-005` | `chrono-tactics` | Chrono Tactics | `PAID_ONE_TIME` | `SELF_HOSTED` | **`INTEGRATION_PENDING`** | `server/public/games/chrono-tactics/` (Stub only) | N/A | Sci-fi turn-based tactics stub. Catalog entry and pricing matrix active. Gameplay runtime pending Milestone 3.0 import. |
| `game-006` | `vortex-arena` | Vortex Arena | `FREE` | `SELF_HOSTED` | **`INTEGRATION_PENDING`** | `server/public/games/vortex-arena/` (Stub only) | N/A | Multiplayer 3-player lobby test harness. Real-time WebSocket matchmaking verified, but in-game interactive arena canvas is pending. |
| `game-007` | `cipher-matrix` | Cipher Matrix | `FREE` | `SELF_HOSTED` | **`INTEGRATION_PENDING`** | `server/public/games/cipher-matrix/` (Stub only) | N/A | Cyberpunk logic puzzle catalog stub. Runtime engine import pending. |
| `game-008` | `solitaire-royale` | Solitaire Royale | `FREE` | `SELF_HOSTED` | **`INTEGRATION_PENDING`** | `server/public/games/solitaire-royale/` (Stub only) | N/A | Classic Klondike solitaire card engine stub. Runtime import scheduled for Sprint 12. |
| `game-subway` | `subway-surfers` | Subway Surfers | `EXTERNAL_STORE` | `EXTERNAL_REDIRECT` | **`EXTERNAL_STORE_ONLY`** | External (SYBO Games / Google Play / App Store) | N/A | External IP. Launch API returns HTTP 422 `EXTERNAL_STORE_REDIRECT`. UI renders "Open Official Store". No in-platform hosting or billing. |
| `game-temple` | `temple-run` | Temple Run | `EXTERNAL_STORE` | `EXTERNAL_REDIRECT` | **`EXTERNAL_STORE_ONLY`** | External (Imangi Studios / Google Play / App Store) | N/A | External IP. Outbound link referral only. "Play Now" disabled. |
| `game-wcc2` | `world-cricket-championship-2` | World Cricket Championship 2 | `EXTERNAL_STORE` | `EXTERNAL_REDIRECT` | **`EXTERNAL_STORE_ONLY`** | External (Nextwave Multimedia / Google Play / App Store) | N/A | External IP. Outbound store referral only. |
| `game-gta5` | `grand-theft-auto-v` | Grand Theft Auto V | `EXTERNAL_STORE` | `EXTERNAL_REDIRECT` | **`EXTERNAL_STORE_ONLY`** | External (Rockstar Games / Steam / Epic Games) | N/A | AAA PC/Console IP. Store referral only. Zero local hosting or streaming claims. |
| `game-cod` | `call-of-duty-warzone` | Call of Duty: Warzone | `EXTERNAL_STORE` | `EXTERNAL_REDIRECT` | **`EXTERNAL_STORE_ONLY`** | External (Activision / Battle.net / Steam) | N/A | AAA PC/Console IP. Store referral only. |
| `game-cosmic` | `cosmic-odyssey` | Cosmic Odyssey | `UNAVAILABLE_PENDING_LICENSE` | `SELF_HOSTED` | **`LICENSE_PENDING`** | Blocked | N/A | Licensing status `LICENSE_REVIEW_REQUIRED`. Public launch blocked with HTTP 422. Commercial purchase blocked with HTTP 422. |
| `game-shadow` | `shadow-protocol` | Shadow Protocol | `FREE` | `SELF_HOSTED` | **`LICENSE_PENDING`** | Draft (`is_published = 0`) | N/A | Unapproved internal draft. Launch blocked with HTTP 403 `GAME_UNPUBLISHED`. |

---

## 3. Playability Summary Metrics

```
Total Games Audited in Catalog:        16+
--------------------------------------------------
1. VERIFIED_PLAYABLE:                  2  (Cyber Invaders, 2048 Classic)
2. PLAYABLE_WITH_LIMITATIONS:          1  (Obsidian Chess - Multiplayer & Bot Engine)
3. INTEGRATION_PENDING:                6  (Quantum Grid, Neon Horizon, Chrono Tactics, Vortex Arena, Cipher Matrix, Solitaire Royale)
4. EXTERNAL_STORE_ONLY:                5  (Subway Surfers, Temple Run, WCC2, GTA V, COD Warzone)
5. LICENSE_PENDING:                    2  (Cosmic Odyssey, Shadow Protocol)
6. BROKEN_OR_UNAVAILABLE:              0  (All routes cleanly handled by security gates)
--------------------------------------------------
Genuine Platform Playable Tally:       2 fully verified standalone engines + 1 functional multiplayer/bot engine
```

> [!IMPORTANT]
> **Anti-Deception Audit Note:** NexusPlay does **not** claim to host 100 or 25 playable games today. The platform authoritatively hosts **2 fully verified HTML5 game engines** with active runtimes and **1 playable multiplayer/bot game**, while clearly classifying all other titles as pending integration or external store referrals.

---

## 4. In-Depth Game Verification Findings

### 4.1 2048 Classic (`2048-classic`)
- **Import Verification:** Verified clean clone of Gabriele Cirulli's official open-source repository under MIT License.
- **Redistribution Rights:** Confirmed free redistribution rights under standard MIT permissive terms with copyright notice retained in `server/public/games/2048/LICENSE.txt`.
- **Dual-Mode Delivery:**
  1. *React Embedded Engine:* `client/src/components/gamePlayer/Classic2048.tsx` renders native canvas/DOM grid with CSS module token styling, touch swipe handlers, on-screen D-Pad, and live scoring telemetry.
  2. *Self-Hosted Ticketed Bundle:* `server/public/games/2048/index.html`, `style.css`, and `game.js` served at `/games/2048/index.html` behind HMAC-SHA256 launch ticket verification middleware.
- **Automated Interaction Evidence:**
  - Tile spawn: 2 initial tiles (values 2 or 4) on clean boot.
  - Arrow / WASD input: Successfully dispatches sliding animations and combines matching tiles.
  - Score mutation: Live telemetry tracks score increments upon merge events.
  - New Game / Restart: Resets grid state to 2 tiles and score to 0.
  - Responsive Viewport: Verified down to 320px mobile viewport with D-Pad controls.

### 4.2 Cyber Invaders (`cyber-invaders`)
- **Engine Architecture:** First-party 2D HTML5 Canvas space arcade shooter developed in React (`CyberInvadersCanvas.tsx`).
- **Gameplay Verification:**
  - 60 FPS requestAnimationFrame rendering loop.
  - Player ship horizontal movement via keyboard (Arrow keys / A-D) and virtual mobile joystick.
  - Projectile physics: Spacebar / tap triggers laser cannons with collision bounding box checks against alien fleet.
  - Score progression: Destructible aliens increment player score in real-time.
  - Checkpoint & History: Game over triggers state submission to `/api/v1/games/cyber-invaders/history`, updating player profile and leaderboard.
- **Free-First Compatibility:** Verified that transition to the free-first business model did not impair single-player launch, session creation, or badge eligibility.

### 4.3 Obsidian Chess (`obsidian-chess`)
- **Engine Capabilities:**
  - 2-Player Real-Time Play: WebSocket room communication (`server/src/modules/multiplayer/realtimeService.js`), turn management, move validation.
  - Single-Player AI Opponent: `botService.js` provides heuristic minimax-style bot moves within a certified 500-1500ms latency envelope. Match completion records isolated under `is_bot = 1`.
- **Known Limitations:**
  - Lacks a standalone, self-contained single-player 2D canvas modal (such as `CyberInvadersCanvas.tsx` or `Classic2048.tsx`). 
  - Solo play is accessed exclusively through the "Play vs Computer" matchmaking option in the multiplayer lobby modal.

### 4.4 External Store Titles (Subway Surfers, Temple Run, WCC2, GTA V, COD Warzone)
- **Classification Enforcement:** All commercial titles owned by third parties are classified as `commercial_model = 'EXTERNAL_STORE'` and `integration_type = 'EXTERNAL_REDIRECT'`.
- **UI Guard:** UI displays "Open Official Store" with verified external referral links (Google Play Store, Apple App Store, Steam, Epic Games). "Play Now" button is strictly suppressed.
- **API Guard:** Invoking `/api/v1/games/:slug/launch` rejects internal iframe loading with HTTP 422 `EXTERNAL_STORE_REDIRECT`.
- **Financial Boundary:** Zero in-platform purchase flows are exposed for external titles.
