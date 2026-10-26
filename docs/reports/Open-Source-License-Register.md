# NexusPlay — Open-Source & Intellectual Property Rights Register

**Document Version:** 3.2  
**Author:** Lead Open-Source Licensing Specialist & Legal Compliance Auditor  
**Effective Date:** October 26, 2026  
**Compliance Standard:** SPDX 2.3 / Open Source Initiative (OSI) / WIPO Copyright Treaty  
**Target:** 25-Game Playable Catalog Expansion & Certification  

---

## 1. Legal Ownership & Compliance Framework

NexusPlay enforces a strict zero-tolerance policy against unauthorized game scraping, copyrighted asset redistribution, binary repackaging, and license misrepresentation. The catalog expansion to 25 genuinely playable games adheres strictly to three legally established distribution pathways:

1. **Permissive Open-Source Licensing (MIT):** Full attribution, preservation of original author copyright notices, and compliance with open-source reuse permissions.
2. **Proprietary First-Party In-House Code:** Clean-room codebases engineered directly by NexusPlay full-stack engineers with 100% intellectual property ownership.
3. **Public Domain Game Mechanics:** Centuries-old classic tabletop, card, and mathematical mechanics (Checkers, Tic-Tac-Toe, Klondike Solitaire, Sudoku, Reversi, 15-Puzzle, Connect Four, Pong) implemented with proprietary, clean-room software architecture and original visual styling.

---

## 2. Complete 25-Game Licensing & IP Register

| # | Game Title | Slug | Rights Classification | Primary License | Original Author / Licensor | Copyright Notice | Permitted Usage & Distribution | Source Repository / Path | Compliance Audit Notes |
|---|------------|------|------------------------|-----------------|-----------------------------|------------------|--------------------------------|--------------------------|------------------------|
| 1 | **Cyber Invaders** | `cyber-invaders` | `OWNED_FIRST_PARTY` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/CyberInvadersCanvas.tsx` | Clean-room retro space shooter engine. All sprites, audio, and math in-house. |
| 2 | **2048 Classic** | `2048-classic` | `OPEN_SOURCE_MIT` | MIT License (OSI) | Gabriele Cirulli | Copyright © 2014 Gabriele Cirulli | Commercial distribution, modification, merging | `client/src/components/gamePlayer/Classic2048.tsx` | Official MIT License notice embedded in UI and bundle footer. Preserved in `LICENSES/2048-MIT.txt`. |
| 3 | **Snake Arcade** | `snake-arcade` | `OWNED_FIRST_PARTY` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/SnakeArcade.tsx` | 20×20 grid canvas implementation with neon bloom shader and D-pad overlay. |
| 4 | **Brick Breaker** | `brick-breaker` | `OWNED_FIRST_PARTY` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/BrickBreaker.tsx` | In-house 2D physics engine for paddle reflection and brick grid collision. |
| 5 | **Tic-Tac-Toe Pro** | `tic-tac-toe-pro` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/TicTacToePro.tsx` | Public domain rules. Minimax game-tree search algorithm written entirely in-house. |
| 6 | **Classic Checkers** | `classic-checkers` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/ClassicCheckers.tsx` | Traditional draughts rules public domain. Board state machine and heuristic AI written in-house. |
| 7 | **Solitaire Royale** | `solitaire-royale` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/SolitaireRoyale.tsx` | Klondike card rules public domain. Standard 52-card deck model and cascades engineered in-house. |
| 8 | **Neon Racer** | `neon-racer` | `OWNED_FIRST_PARTY` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/NeonHorizonRacer.tsx` | Synthwave 2D top-down highway speed runner engine developed in-house. |
| 9 | **Block Puzzle** | `block-puzzle` | `GENERIC_MECHANIC_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/BlockPuzzle.tsx` | Generic polyomino falling-block mechanic. Custom rotation math and original graphics. |
| 10 | **Bubble Shooter** | `bubble-shooter` | `GENERIC_MECHANIC_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/BubbleShooter.tsx` | Generic hex-cluster match-3 mechanic. Vector reflection and BFS cluster flood-fill in-house. |
| 11 | **Arcade Cricket** | `arcade-cricket` | `OWNED_FIRST_PARTY` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/ArcadeCricket.tsx` | Original 2D pitch timing engine, shot power evaluation, and over/wicket tracking. |
| 12 | **Flappy Neon** | `flappy-neon` | `GENERIC_MECHANIC_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/FlappyNeon.tsx` | Generic tap-to-flap gravity curve with neon obstacle gates. Original artwork and audio. |
| 13 | **Galactic Dodge** | `galactic-dodge` | `OWNED_FIRST_PARTY` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/GalacticDodge.tsx` | Procedural asteroid field evasion engine with radial collision geometry. |
| 14 | **Memory Match** | `memory-match` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/MemoryMatch.tsx` | Traditional Concentration game rules public domain. Custom card flipping state machine. |
| 15 | **Minesweeper Retro** | `minesweeper-retro` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/MinesweeperRetro.tsx` | Classic minefield uncovering math public domain. Guaranteed first-click safe-zone generation. |
| 16 | **Sudoku Classic** | `sudoku-classic` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/SudokuClassic.tsx` | 9×9 number placement logic public domain. Backtracking generator with unique solution check. |
| 17 | **Slide Puzzle 15** | `slide-puzzle-15` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/SlidePuzzle15.tsx` | 15-puzzle sliding tiles (Sam Loyd, 1870s) public domain. Parity-verified solvability math. |
| 18 | **Connect Four** | `connect-four` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/ConnectFour.tsx` | Four-in-a-row vertical drop mechanic public domain. Column gravity and 4-direction line check. |
| 19 | **Reversi Othello** | `reversi-othello` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/ReversiOthello.tsx` | 8×8 disc sandwich-flip rules public domain. 8-directional raycasting capture engine. |
| 20 | **Tower Defense Lite** | `tower-defense-lite` | `OWNED_FIRST_PARTY` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/TowerDefenseLite.tsx` | Fixed-path waypoint navigation, turret targeting vector math, and wave management. |
| 21 | **Endless Neon Runner** | `endless-neon-runner` | `OWNED_FIRST_PARTY` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/EndlessNeonRunner.tsx` | Side-scrolling runner with parabolic jump physics, slide hitboxes, and speed scaling. |
| 22 | **Retro Pong** | `retro-pong` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/RetroPong.tsx` | Two-paddle ball bouncing physics public domain. Segmented paddle reflection angles. |
| 23 | **Whack-A-Mole** | `whack-a-mole` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/WhackAMole.tsx` | Reflex pop-up arcade mechanic public domain. Poisson random interval timer and hit registers. |
| 24 | **Simon Memory** | `simon-memory` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/SimonMemory.tsx` | 4-quadrant audiovisual sequence recall public domain. Synthesized Web Audio tones. |
| 25 | **Word Grid** | `word-grid` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary Commercial | NexusPlay Engineering Team | Copyright © 2026 NexusPlay | Worldwide web & mobile distribution | `client/src/components/gamePlayer/WordGrid.tsx` | 4×4 adjacent letter chain word discovery public domain. In-memory English prefix trie. |

---

## 3. Detailed Open-Source Compliance: 2048 Classic

### 3.1 License Text Preservation
The full verbatim text of the MIT License governing Gabriele Cirulli's original work has been verified and permanently registered in the platform repository at:
`docs/licenses/2048-MIT-LICENSE.txt` and inside `server/public/games/2048/index.html`.

```text
The MIT License (MIT)

Copyright (c) 2014 Gabriele Cirulli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### 3.2 User-Facing Attribution
In compliance with clause 2 of the MIT License, attribution is explicitly displayed in:
1. **Catalog Metadata:** Developer field displays `Gabriele Cirulli (Open Source MIT)`.
2. **Game Details Modal:** Attribution badge explicitly cites original author and license terms.
3. **Player Runtime Footer:** Permanent footer link credits Gabriele Cirulli.
4. **Standalone HTML5 Bundle:** Persistent copyright header and repository link.

---

## 4. Proprietary Clean-Room Engineering Audit

For all 24 in-house and public domain rule implementations:
- **Zero Third-Party Binary Scraping:** No assets or scripts were extracted from external gaming portals (e.g. Poki, CrazyGames, itch.io).
- **Independent Canvas/React Implementation:** Game rendering, physics calculations, input event handlers, and sound effects were authored specifically for NexusPlay.
- **Trademark Clearance:** All game titles use descriptive or generic names avoiding trademark infringement.
- **Web Audio Synthesis:** Sound effects use procedural Web Audio API oscillators (square, sine, sawtooth waves) without third-party audio files.

---

## 5. Licensing Officer Certification

I hereby certify that all 25 playable games active in the NexusPlay platform catalog have undergone thorough intellectual property and software licensing auditing. All open-source obligations are fully met, all proprietary works are legally owned, and no copyright or distribution restrictions are violated.

**Certified by:** Lead Open-Source Licensing Specialist & Legal Compliance Auditor  
**Date:** October 26, 2026
