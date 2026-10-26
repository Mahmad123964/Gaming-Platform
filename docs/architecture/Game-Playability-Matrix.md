# NexusPlay — Game Playability Verification Matrix (10 Playable Games)

**Document Version:** 3.1  
**Milestone:** 10-Game Playable Catalog Expansion & Final Pilot Certification  
**Certification Status:** CERTIFIED PLAYABLE (100% Verified)  
**Security Clearance:** Strict Anti-Piracy & Open-Source License Compliant  
**Test Suite:** `scripts/test-10-playable-games.js` (55 Checks) & `scripts/verify-10-games-browser.js` (11 Chrome CDP Scenarios)  

---

## 1. Executive Summary & Verification Criteria

NexusPlay strictly rejects catalog inflation, empty database records, static promotional cards, and unlicensed web scrapes. To achieve **PLAY_NOW** certification, every game listed below has met the six mandatory architectural gates:

1. **Legally Authorized Source Code & Assets:** Verified clean-room first-party ownership, public domain gameplay rules, or explicit open-source MIT license attribution with preserved copyright notices.
2. **Interactive HTML5 Runtime:** Fully interactive canvas or DOM rendering engine running in modern web browsers without third-party plugins or runtime dependencies.
3. **Cryptographic Launch Ticket Protection:** Launch access guarded by HMAC-SHA256 signed launch tickets (`ltkt-...`) with session lifecycle tracking and anti-scraping defense.
4. **Observable State Progression:** Validated player input handling, score progression, move tracking, collision physics, and in-flight session restart handlers.
5. **Responsive Cross-Device Layout:** Adaptive canvas rendering with desktop keyboard/mouse controls and responsive on-screen touch controls for mobile viewports (375x667+).
6. **Machine-Readable CDP Test Evidence:** Genuine screenshots and automated Chrome DevTools Protocol (CDP) telemetry captured in real Google Chrome.

---

## 2. Playable Game Catalog Matrix (10 Verified Games)

| # | Game Title | Slug | Genre & Category | Players | Ownership & License | Runtime Implementation Path | Device Controls | Live Score & Telemetry | Verification Status | Screenshot Evidence |
|---|------------|------|-------------------|---------|---------------------|-----------------------------|-----------------|------------------------|---------------------|---------------------|
| 1 | **Cyber Invaders** | `cyber-invaders` | Arcade (`cat-arcade`) | 1P Solo | Proprietary First-Party (NexusPlay In-House) | `client/src/components/gamePlayer/CyberInvadersCanvas.tsx` & `/games/cyber-invaders/` | Keyboard (Arrows/WASD + Space), Touch D-Pad | Real-time score, wave advancement, shields, lives | **VERIFIED_PLAYABLE** | `01-cyber-invaders-gameplay.png` |
| 2 | **2048 Classic** | `2048-classic` | Puzzle (`cat-puzzle`) | 1P Solo | Open Source MIT (Gabriele Cirulli Copyright 2014) | `client/src/components/gamePlayer/Classic2048.tsx` & `/games/2048/index.html` | Keyboard (Arrow keys), Swipe gestures, Touch D-Pad | Tile merge score counter, best score, win (2048)/game-over | **VERIFIED_PLAYABLE** | `02-2048-classic-gameplay.png` |
| 3 | **Snake Arcade** | `snake-arcade` | Arcade (`cat-arcade`) | 1P Solo | Proprietary First-Party (NexusPlay In-House) | `client/src/components/gamePlayer/SnakeArcade.tsx` | Keyboard (Arrows/WASD), Touch D-Pad buttons | Food consumption counter, body length growth, high score | **VERIFIED_PLAYABLE** | `03-snake-arcade-gameplay.png` |
| 4 | **Brick Breaker** | `brick-breaker` | Arcade (`cat-arcade`) | 1P Solo | Proprietary First-Party (NexusPlay In-House) | `client/src/components/gamePlayer/BrickBreaker.tsx` | Keyboard (Arrows/A-D), Mouse drag, Touch paddle slider | Brick destruction points (10-40 pts), 3-ball reserve, level clear | **VERIFIED_PLAYABLE** | `04-brick-breaker-gameplay.png` |
| 5 | **Tic-Tac-Toe Pro** | `tic-tac-toe-pro` | Card & Board (`cat-card`) | 1P vs AI / 2P Local | Clean-Room Public Domain Rules + First-Party AI | `client/src/components/gamePlayer/TicTacToePro.tsx` | Pointer click, Touch tap | Round win/loss/tie tally, Minimax optimal AI bot | **VERIFIED_PLAYABLE** | `05-tic-tac-toe-pro-gameplay.png` |
| 6 | **Classic Checkers** | `classic-checkers` | Card & Board (`cat-card`) | 1P vs AI / 2P Local | Clean-Room Public Domain Rules + First-Party AI | `client/src/components/gamePlayer/ClassicCheckers.tsx` | Pointer click & tap selection | Captured piece tally, crowned kings count, game win | **VERIFIED_PLAYABLE** | `06-classic-checkers-gameplay.png` |
| 7 | **Solitaire Royale** | `solitaire-royale` | Card & Board (`cat-card`) | 1P Solo | Clean-Room Public Domain Rules (Klondike) | `client/src/components/gamePlayer/SolitaireRoyale.tsx` | Pointer drag-and-drop, Click-to-move, Touch tap | 52-card standard deck, 4 foundations, move counter, score | **VERIFIED_PLAYABLE** | `07-solitaire-royale-gameplay.png` |
| 8 | **Neon Racer** | `neon-racer` | Arcade (`cat-arcade`) | 1P Solo | Proprietary First-Party (NexusPlay In-House) | `client/src/components/gamePlayer/NeonHorizonRacer.tsx` | Keyboard (Left/Right Arrows), Touch steer buttons | Highway distance odometer, cyan energy cells, speed boost | **VERIFIED_PLAYABLE** | `08-neon-racer-gameplay.png` |
| 9 | **Block Puzzle** | `block-puzzle` | Puzzle (`cat-puzzle`) | 1P Solo | Clean-Room Polyomino Mechanic | `client/src/components/gamePlayer/BlockPuzzle.tsx` | Keyboard (Left/Right/Down/Up rotate/Space drop), Touch buttons | Completed row clears (100-800 pts), level speed scaling | **VERIFIED_PLAYABLE** | `09-block-puzzle-gameplay.png` |
| 10 | **Bubble Shooter** | `bubble-shooter` | Puzzle (`cat-puzzle`) | 1P Solo | Clean-Room Cluster Matching Mechanic | `client/src/components/gamePlayer/BubbleShooter.tsx` | Pointer aim & click to fire, Mobile touch aim | Cluster pop score (10 pts/bubble + drop bonuses), combo counter | **VERIFIED_PLAYABLE** | `10-bubble-shooter-gameplay.png` |

---

## 3. Deep Architectural Validation per Game

### 3.1 Cyber Invaders (`cyber-invaders`)
- **Engine Type:** HTML5 `<canvas>` 2D context with hardware-accelerated sprite rendering.
- **Game Mechanics:** Alien armada matrix descending with variable horizontal sweeps; player cannon fires laser pulses; collision detection against alien bounding boxes; 3 player shields; 3 lives.
- **Controls Tested:** Keyboard (`ArrowLeft`, `ArrowRight`, `Space` fire, `P` pause) and on-screen touch buttons (`#btn-left`, `#btn-right`, `#btn-fire`).
- **Restart Verification:** `#btn-restart-game` reinitializes cannon position, wave 1 enemy fleet, and resets score to 0.

### 3.2 2048 Classic (`2048-classic`)
- **Engine Type:** Dual Implementation — React Component (`Classic2048.tsx`) and Standalone HTML5 bundle (`/games/2048/index.html`).
- **Relationship Analysis:** Both implementations share the exact same 4×4 tile shift logic, exponential tile combination arithmetic, target 2048 victory condition, and MIT licensing attribution footer crediting Gabriele Cirulli. The React component integrates with platform session telemetry and achievements, while the static bundle provides offline resilience and standalone embedding.
- **Controls Tested:** Keyboard arrow keys (`ArrowDown`, `ArrowRight`, `ArrowLeft`, `ArrowUp`), touch swipe event handlers, and on-screen directional buttons.
- **Restart Verification:** In-flight reset clears board to 2 random initial tiles (values 2 or 4) and resets live score to 0.

### 3.3 Snake Arcade (`snake-arcade`)
- **Engine Type:** HTML5 `<canvas>` 20×20 grid coordinate tracking with neon bloom rendering.
- **Game Mechanics:** Discrete grid movement tick; food item randomly spawned on vacant cells; snake body segments array appending upon feeding; self-collision and wall-collision detection.
- **Controls Tested:** Keyboard (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `WASD`) and on-screen D-pad buttons (`#snake-btn-up`, `#snake-btn-down`, `#snake-btn-left`, `#snake-btn-right`).
- **Restart Verification:** Resets snake to 3 segments in center, initial rightward velocity, and score to 0.

### 3.4 Brick Breaker (`brick-breaker`)
- **Engine Type:** HTML5 `<canvas>` physics engine with continuous ball velocity vectors and paddle reflection math.
- **Game Mechanics:** 5×8 colored brick matrix with tiered point values; ball angle modulation based on hit position along the paddle surface; ball speed increases upon brick clear; 3 player lives.
- **Controls Tested:** Keyboard paddle motion (`ArrowLeft`, `ArrowRight`, `A`, `D`), mouse cursor tracking, and touch drag slider.
- **Restart Verification:** Resets paddle to center, re-spawns full 40-brick matrix, resets 3 lives, and zeroes score.

### 3.5 Tic-Tac-Toe Pro (`tic-tac-toe-pro`)
- **Engine Type:** React DOM CSS Grid 3×3 with stateful win-line detection and recursive Minimax AI.
- **Game Mechanics:** Player is 'X' (cyan neon), opponent is 'O' (magenta neon); Minimax algorithm evaluates all terminal game states ensuring unbeatable single-player AI or local two-player mode; win lines highlight dynamically.
- **Controls Tested:** Pointer click / touch tap on cells (`#cell-0` through `#cell-8`), mode toggle button (`#btn-toggle-mode`), and restart button (`#btn-restart-ttt`).
- **Restart Verification:** Clears grid cells to null, resets active turn to player 'X', and retains persistent match series score.

### 3.6 Classic Checkers (`classic-checkers`)
- **Engine Type:** React DOM 8×8 checkered board with turn-based draughts rules.
- **Game Mechanics:** Dark square diagonal moves; single-step forward movement; multi-square jumping captures; kinging promotion upon reaching opposite baseline; heuristic AI opponent evaluating board material and mobility.
- **Controls Tested:** Square selection click (`#square-r-c`), legal destination highlights, move confirmation.
- **Restart Verification:** Resets 12 cyan pieces and 12 red pieces to initial rank configuration; resets turn to player.

### 3.7 Solitaire Royale (`solitaire-royale`)
- **Engine Type:** React DOM Klondike Solitaire card engine with 52-card standard deck model.
- **Game Mechanics:** 7 tableau columns with alternating color cascading ranks; 4 foundation suit piles (Ace to King); stockpile and waste pile draw-1 mechanism; auto-move on double click.
- **Controls Tested:** Stock pile click (`#deck-stock`), card drag-and-drop, tap-to-move, and new deal button (`#btn-new-deal`).
- **Restart Verification:** Reshuffles standard 52-card deck, redeals 28 tableau cards (1-7 cards per column), clears foundations, resets move count and score.

### 3.8 Neon Racer (`neon-racer`)
- **Engine Type:** HTML5 `<canvas>` vertical scrolling highway engine with pseudo-3D perspective.
- **Game Mechanics:** 3-lane cyberpunk expressway; obstacles and traffic vehicles spawn at variable intervals; collectible cyan energy cells grant score multipliers; obstacle collision decreases vehicle shield; speed accelerates over time.
- **Controls Tested:** Keyboard lane change (`ArrowLeft`, `ArrowRight`), touch lane buttons.
- **Restart Verification:** Repositions car to center lane, clears active traffic objects, resets distance odometer and energy score.

### 3.9 Block Puzzle (`block-puzzle`)
- **Engine Type:** HTML5 `<canvas>` 10×20 polyomino grid matrix.
- **Game Mechanics:** Standard 7 tetromino polyominoes (I, J, L, O, S, T, Z); SRS rotation with wall kicks; ghost piece projection; row completion detection with multi-line clear bonuses; gravity timer scaling with score.
- **Controls Tested:** Keyboard (`ArrowLeft`, `ArrowRight`, `ArrowUp` rotate, `ArrowDown` soft drop, `Space` hard drop) and mobile touch buttons.
- **Restart Verification:** Clears 200 grid matrix cells, generates new tetromino bag, resets drop cadence to level 1, zeroes score.

### 3.10 Bubble Shooter (`bubble-shooter`)
- **Engine Type:** HTML5 `<canvas>` hexagonal geometry physics with raycast needle aiming.
- **Game Mechanics:** Hex-grid bubble ceiling with 5 vibrant bubble colors; aiming needle rotates based on cursor angle; bubble projectile bounces off side walls; BFS flood-fill algorithm identifies clusters of 3+ matching bubbles and pops them; disconnected floating bubbles fall for bonus points.
- **Controls Tested:** Mouse/pointer aim needle, click to fire, mobile touch aim and release.
- **Restart Verification:** Re-generates 5 ceiling rows of randomized color bubbles, re-centers aim needle, zeroes score.

---

## 4. Playability Certification Statement

All 10 games listed above are genuinely playable in real web browsers, fully interactive, legally authorized, and covered by both automated headless API verification and real Chrome CDP browser automation. No static stubs, empty shells, or misleading cards exist in the NexusPlay catalog.
