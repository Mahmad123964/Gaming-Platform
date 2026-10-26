# NexusPlay — Game Mechanics & Rules Verification Test Matrix

**Document Version:** 3.2  
**Milestones Covered:** Milestone 3.1 Gameplay Quality Certification & Milestone 3.2 25-Game Expansion  
**Author:** Game Physics & Rules Specialist, Principal HTML5 Game Engine Architect & QA Automation Lead  
**Execution Date:** October 26, 2026  
**Test Harnesses:** `scripts/test-gameplay-rules.js` (28 Checks) & `scripts/test-15-expanded-game-rules.js` (22 Checks)  
**Total Rules Assertions:** 50 Deep Algorithmic Unit Tests (100.0% Pass Rate)

---

## 1. Algorithmic Verification Protocol & Methodology

Casual and arcade web games frequently suffer from game-breaking physics anomalies, incomplete rule enforcement, and invalid state transitions (e.g., checkers failing to force mandatory captures, solitaire allowing illegal color stacks, or snake allowing instant 180-degree self-collisions). NexusPlay requires algorithmic mathematical unit assertions for all game rules and physics models prior to catalog certification.

Each game engine was audited against standard mathematical invariants:
1. **State Machine Integrity:** No invalid state transitions (e.g., scoring after game-over, or playing out-of-turn).
2. **Boundary Safety:** Rigorous coordinate clamping to matrix / canvas boundaries without NaN or buffer overflows.
3. **Collision Precision:** Continuous or discrete collision geometry matching visible sprites.
4. **Scoring Determinism:** Exact mathematical progression per line clear, run scored, alien shot, or brick shattered.
5. **In-Flight Session Reset:** Complete memory reinitialization returning score to 0 and re-queuing initial piece states.

---

## 2. Deep Rules Verification Matrix — Original 10 Certified Games

### 2.1 Classic Checkers (`classic-checkers`)
- **Ruleset Baseline:** Standard American Checkers / English Draughts (8×8 Board, 12 pieces per player on dark squares).
- **Rule CHK-01 (Board Setup):** Validated that row 0–2 contains 12 Red pieces and row 5–7 contains 12 Cyan pieces strictly on dark squares (`(r + c) % 2 === 1`). Light squares remain 100% unoccupied.
- **Rule CHK-02 (King Promotion):** When a Cyan piece advances to row 0, or Red piece advances to row 7, the piece is authoritatively crowned with `isKing = true`, unlocking bi-directional diagonal movement.
- **Rule CHK-03 (Mandatory Capture):** When a jump opportunity exists (`abs(dr) === 2 && abs(dc) === 2` over opponent piece to vacant landing), single-step diagonal moves (`abs(dr) === 1`) are strictly rejected from legal move lists.
- **Rule CHK-04 (Multi-Jump Sequences):** If a piece executes a capture and lands on a square with an immediate subsequent legal jump, player turn does not pass; multi-jump continuation is enforced.
- **Rule CHK-05 (Stalemate & Victory):** If a player has 0 remaining pieces OR 0 legal moves remaining, the opponent is immediately declared the victor.

### 2.2 Solitaire Royale (`solitaire-royale`)
- **Ruleset Baseline:** Standard Klondike Solitaire (52-Card French Deck, 4 Suits, 13 Ranks: A, 2–10, J, Q, K).
- **Rule SOL-01 (Deck Integrity):** Asserted that 52 cards are partitioned into exactly 13 cards per suit (Hearts, Diamonds, Clubs, Spades) with zero duplicate cards.
- **Rule SOL-02 (Tableau Deal):** Validated initial deal distribution: 28 cards across 7 tableau columns (column $i$ has $i$ cards with top card face-up), exactly 24 cards routed to stock pile.
- **Rule SOL-03 (Tableau Cascading):** Tableau card movement enforces alternating suit color (Red on Black, Black on Red) and strictly descending numerical rank ($K, Q, J, 10, \dots, 2, A$).
- **Rule SOL-04 (Foundation Stacking):** Foundation piles must begin with an Ace and build ascending in the same suit up to King.
- **Rule SOL-05 (Victory Condition):** Exact state condition: 52 cards placed across the 4 foundation piles triggers authoritative game win.

### 2.3 Tic-Tac-Toe Pro (`tic-tac-toe-pro`)
- **Ruleset Baseline:** 3×3 Tabletop Grid Duel with Minimax AI Engine and Local 2-Player Mode.
- **Rule TTT-01 (Win & Tie Detection):** Validated all 8 winning lines (3 horizontal, 3 vertical, 2 diagonal) and 9-cell full draw condition.
- **Rule TTT-02 (Illegal Cell Rejection):** Pointer clicks on occupied cells or after game conclusion are strictly rejected with zero state mutation.
- **Rule TTT-03 (Minimax Decision Correctness):** Audited the Minimax game-tree search algorithm. When opponent has 2 marks aligned, the AI bot unconditionally blocks the winning third cell.

### 2.4 Block Puzzle (`block-puzzle`)
- **Ruleset Baseline:** 10×20 Falling Polyomino Matrix Engine.
- **Rule BLK-01 (Matrix Dimensions & Geometry):** Standard 10 columns by 20 rows matrix; 7 standard tetromino shapes (I, J, L, O, S, T, Z) with distinct coordinate matrices.
- **Rule BLK-02 (Clockwise Matrix Rotation):** 90-degree matrix rotation formula ($[r, c] \to [c, \text{size} - 1 - r]$) verified with wall-kick boundary prevention.
- **Rule BLK-03 (Scoring Progression):** Verified multi-line clearing points: Single (100), Double (300), Triple (500), Tetris (800).
- **Rule BLK-04 (Game Over Detection):** Locked pieces exceeding row 0 trigger immediate game-over state.

### 2.5 Bubble Shooter (`bubble-shooter`)
- **Ruleset Baseline:** Hexagonal Bubble Grid Raycasting & Match-3 BFS Engine.
- **Rule BBL-01 (Hexagonal Cluster Matching):** BFS flood-fill algorithm groups connected same-color bubbles. Clusters $\ge 3$ bubbles pop and award 10 points per bubble.
- **Rule BBL-02 (Detached Bubble Elimination):** Connected-component traversal rooted at ceiling row 0. Any floating bubbles disconnected from ceiling nodes drop automatically and award bonus points.
- **Rule BBL-03 (Raycast Wall Bouncing):** Bubble projectile vector inverts horizontal component ($dx = -dx$) upon colliding with lateral boundary walls.

### 2.6 Snake Arcade (`snake-arcade`)
- **Ruleset Baseline:** 20×20 Grid Discrete Cell Movement.
- **Rule SNK-01 (180-Degree Input Reversal Rejection):** If heading UP, DOWN input is discarded; if heading LEFT, RIGHT input is discarded, preventing instant suicide.
- **Rule SNK-02 (Food Spawn Isolation):** Food coordinate generator filters out all cells currently occupied by snake body segments.
- **Rule SNK-03 (Collision Detection):** Boundary collision ($x < 0$, $x \ge 20$, $y < 0$, $y \ge 20$) and self-collision (head intersecting any body node) triggers game over.

### 2.7 Brick Breaker (`brick-breaker`)
- **Ruleset Baseline:** 2D Segmented Paddle Deflection Physics Engine.
- **Rule BRK-01 (Paddle Angle Reflection):** Ball rebound angle is a direct mathematical function of hit offset from paddle center:
  $$\Delta v_x = \left(\frac{x_{\text{ball}} - x_{\text{center}}}{w_{\text{paddle}} / 2}\right) \times v_{\text{max}}$$
- **Rule BRK-02 (Brick Destruction & Scoring):** Ball collision eliminates brick from active grid and awards 10–40 points based on brick tier color.
- **Rule BRK-03 (3-Life State Machine):** Bottom boundary loss decrements life count; reaching 0 lives transitions to game over. Clearing all 40 bricks transitions to victory.

### 2.8 Neon Racer (`neon-racer`)
- **Ruleset Baseline:** 3-Lane Highway Speed Runner.
- **Rule RAC-01 (3-Lane Boundary Clamping):** Lateral steering strictly clamps to valid lane indices $[0, 1, 2]$ corresponding to coordinates $x \in \{80, 180, 280\}$.
- **Rule RAC-02 (Speed Scaling):** Vehicle speed scales dynamically with distance traveled, scaling from 4.0 px/tick up to 10.0 px/tick.
- **Rule RAC-03 (Bounding Box Collision):** AABB collision intersection between player car ($36 \times 64\text{ px}$) and traffic vehicles triggers immediate crash state.

### 2.9 2048 Classic (`2048-classic`)
- **Ruleset Baseline:** 4×4 Exponential Sliding Tile Arithmetic.
- **Rule 2048-01 (Single Merge Per Move Rule):** A slide vector cannot merge a tile twice in the same move. For example, $[2, 2, 4, 0]$ slides to $[4, 4, 0, 0]$—it does NOT merge again into $[8, 0, 0, 0]$.
- **Rule 2048-02 (Locked Grid Game Over):** Game over condition triggers if and only if all 16 cells are non-empty AND no horizontally or vertically adjacent matching values exist.
- **Rule 2048-03 (Tile Generation Probabilities):** Empty cell random spawn produces a value of 2 with 90% probability and a value of 4 with 10% probability.

### 2.10 Cyber Invaders (`cyber-invaders`)
- **Ruleset Baseline:** 2D Space Arcade Invaders Engine.
- **Rule INV-01 (Cannon Cooldown Rate Limiting):** Player weapon enforces a 250ms hardware cooldown between laser discharges to prevent projectile spamming.
- **Rule INV-02 (Fleet Step-Down Acceleration):** Alien armada steps down 16px upon hitting lateral screen boundaries and accelerates horizontal speed by 10% per wave tier.
- **Rule INV-03 (Shield Degradation):** Player bunker shields absorb enemy plasma bolts, eroding durability across 4 damage states before disintegrating.

---

## 3. Deep Rules Verification Matrix — 15 Expanded Games

| # | Game Title | Slug | Core Rules Tested | Mathematical Invariant | Result |
|:---:|:---|:---|:---|:---|:---:|
| 11 | **Arcade Cricket** | `arcade-cricket` | Batting timing window, boundary calculation, 6-ball over progression | Timing offset $|y_{\text{ball}} - y_{\text{pitch}}| \le 12\text{ px} \to 6\text{ runs}$; over resets ball count at 6 | **PASS** |
| 12 | **Flappy Neon** | `flappy-neon` | Jump impulse, gravitational acceleration, pipe gap clearance | $v_y = -8.5\text{ px/tick}$, gravity $+0.45\text{ px/tick}^2$; bounding box gap intersection | **PASS** |
| 13 | **Galactic Dodge** | `galactic-dodge` | Lateral clamping, radial circular asteroid collision | $\text{dist} < (r_{\text{player}} + r_{\text{asteroid}}) \to \text{collision}$; player clamped to $[20, 340]\text{ px}$ | **PASS** |
| 14 | **Memory Match** | `memory-match` | 16-card pairing, match retention, 8-pair victory state | Exactly 8 pairs ($\{c_1, c_2\} = 2$); victory when matched count equals 8 | **PASS** |
| 15 | **Minesweeper Retro** | `minesweeper-retro` | 8-neighbour mine counting, recursive zero-cell flood fill | Neighbor offset loop $[-1, 0, 1]^2 \setminus \{(0,0)\}$; mine cell unmasking loss | **PASS** |
| 16 | **Sudoku Classic** | `sudoku-classic` | Row, column, and $3 \times 3$ box uniqueness | No value duplicate in row, column, or $\lfloor r/3 \rfloor \times 3, \lfloor c/3 \rfloor \times 3$ box | **PASS** |
| 17 | **Slide Puzzle 15** | `slide-puzzle-15` | Manhattan distance adjacency, solved array $[1..15, 0]$ | Move permitted iff $|r_{\text{tile}} - r_{\text{blank}}| + |c_{\text{tile}} - c_{\text{blank}}| = 1$ | **PASS** |
| 18 | **Connect Four** | `connect-four` | Column gravity drop, 4-in-a-row direction vectors | Piece lands on lowest empty row; horizontal, vertical, diagonal win checks | **PASS** |
| 19 | **Reversi Othello** | `reversi-othello` | Directional sandwich bracketing, piece flipping cascade | Brackets opponent between player pieces across 8 compass directions | **PASS** |
| 20 | **Tower Defense Lite** | `tower-defense-lite` | Radial range detection, creep health, base lives | Target acquired iff $\sqrt{\Delta x^2 + \Delta y^2} \le \text{range}_{\text{tower}}$ | **PASS** |
| 21 | **Endless Neon Runner**| `endless-neon-runner`| Double jump constraint, platform ground collision | Jump count strictly clamped to $\le 2$; resets to 0 only upon ground landing | **PASS** |
| 22 | **Retro Pong** | `retro-pong` | Paddle segmented deflection angle, first to 7 points win | Deflection $v_y = ((y_{\text{ball}} - y_{\text{center}}) / (h/2)) \times 5.0$; win at score 7 | **PASS** |
| 23 | **Whack-A-Mole** | `whack-a-mole` | 3×3 burrow emergence, active mole hit reaction, timer | Hit on active burrow awards 10 pts and clears burrow; timer counts down to 0 | **PASS** |
| 24 | **Simon Memory** | `simon-memory` | Pattern sequence expansion, player step reproduction | Input array compared index-by-index against generated sequence array | **PASS** |
| 25 | **Word Grid** | `word-grid` | 4×4 Boggle adjacency without tile reuse, length score | Adjacent step $(\Delta r \le 1, \Delta c \le 1)$; path tracking prohibits reusing cells | **PASS** |

---

## 4. Test Execution Summary

- **Total Algorithmic Rules Assertions:** 50
- **Passed Checks:** 50
- **Failed Checks:** 0
- **Pass Rate:** **100.0%**
- **Execution Harnesses:**
  - `node scripts/test-gameplay-rules.js` -> 28 / 28 PASS (100.0%)
  - `node scripts/test-15-expanded-game-rules.js` -> 22 / 22 PASS (100.0%)

**Certified by:**  
*Game Physics & Rules Specialist & QA Automation Lead*  
*NexusPlay Platform Engineering*
