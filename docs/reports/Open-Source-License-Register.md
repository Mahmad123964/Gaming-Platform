# NexusPlay — Open-Source & Intellectual Property Rights Register

**Document Version:** 3.1  
**Author:** Lead Open-Source Licensing Specialist & Legal Compliance Auditor  
**Effective Date:** October 26, 2026  
**Compliance Standard:** SPDX 2.3 / Open Source Initiative (OSI) / WIPO Copyright Treaty  
**Target:** 10-Game Playable Catalog Expansion  

---

## 1. Legal Ownership & Compliance Framework

NexusPlay enforces a strict zero-tolerance policy against unauthorized game scraping, copyrighted asset redistribution, binary repackaging, and license misrepresentation. The catalog expansion to 10 genuinely playable games adheres strictly to three legally established distribution pathways:

1. **Permissive Open-Source Licensing (MIT):** Full attribution, preservation of original author copyright notices, and compliance with open-source reuse permissions.
2. **Proprietary First-Party In-House Code:** Clean-room codebases engineered directly by NexusPlay full-stack engineers with 100% intellectual property ownership.
3. **Public Domain Game Mechanics:** Centuries-old classic tabletop and card mechanics (Checkers, Tic-Tac-Toe, Klondike Solitaire) implemented with proprietary, clean-room software architecture and original visual styling.

---

## 2. Complete 10-Game Licensing & IP Register

| # | Game Title | Slug | Rights Classification | Primary License | Original Author / Licensor | Copyright Notice | Permitted Usage & Distribution | Source Repository / Path | Compliance Audit Notes |
|---|------------|------|------------------------|-----------------|-----------------------------|------------------|--------------------------------|--------------------------|------------------------|
| 1 | **Cyber Invaders** | `cyber-invaders` | `OWNED_FIRST_PARTY` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive, perpetual web & mobile distribution | `client/src/components/gamePlayer/CyberInvadersCanvas.tsx` | Clean-room retro space shooter engine. All sprites, audio generators, and math designed in-house. |
| 2 | **2048 Classic** | `2048-classic` | `OPEN_SOURCE_MIT` | MIT License (OSI Approved) | Gabriele Cirulli | Copyright © 2014 Gabriele Cirulli | Commercial distribution, modification, merging, and self-hosting permitted | `client/src/components/gamePlayer/Classic2048.tsx` & `/games/2048/` | Official MIT License notice embedded in UI and static bundle footer. Full text preserved in `LICENSES/2048-MIT.txt`. |
| 3 | **Snake Arcade** | `snake-arcade` | `OWNED_FIRST_PARTY` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive web & mobile distribution | `client/src/components/gamePlayer/SnakeArcade.tsx` | Original 20×20 grid canvas implementation with custom neon bloom shader and D-pad touch overlay. |
| 4 | **Brick Breaker** | `brick-breaker` | `OWNED_FIRST_PARTY` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive web & mobile distribution | `client/src/components/gamePlayer/BrickBreaker.tsx` | In-house 2D physics engine for paddle reflection and brick grid collision. Zero third-party asset dependencies. |
| 5 | **Tic-Tac-Toe Pro** | `tic-tac-toe-pro` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive web & mobile distribution | `client/src/components/gamePlayer/TicTacToePro.tsx` | Game rules are public domain. Minimax game-tree search algorithm and React DOM grid written entirely in-house. |
| 6 | **Classic Checkers** | `classic-checkers` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive web & mobile distribution | `client/src/components/gamePlayer/ClassicCheckers.tsx` | Traditional 8×8 draughts rules are public domain. Board state machine, jump capture logic, and heuristic AI written in-house. |
| 7 | **Solitaire Royale** | `solitaire-royale` | `PUBLIC_DOMAIN_RULES_PROPRIETARY_ENGINE` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive web & mobile distribution | `client/src/components/gamePlayer/SolitaireRoyale.tsx` | Klondike card rules are public domain. Standard 52-card deck model, drag/drop state, and tableau cascades engineered in-house. |
| 8 | **Neon Racer** | `neon-racer` | `OWNED_FIRST_PARTY` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive web & mobile distribution | `client/src/components/gamePlayer/NeonHorizonRacer.tsx` | Synthwave 2D top-down highway speed runner engine developed in-house. Procedural traffic generation and lane math. |
| 9 | **Block Puzzle** | `block-puzzle` | `GENERIC_MECHANIC_PROPRIETARY_ENGINE` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive web & mobile distribution | `client/src/components/gamePlayer/BlockPuzzle.tsx` | Generic polyomino falling-block mechanic. Uses clean-room rotation math, generic tetromino shapes, and original neon graphics. |
| 10 | **Bubble Shooter** | `bubble-shooter` | `GENERIC_MECHANIC_PROPRIETARY_ENGINE` | Proprietary NexusPlay Commercial License | NexusPlay Engineering Team | Copyright © 2026 NexusPlay Gaming Platform | Worldwide, exclusive web & mobile distribution | `client/src/components/gamePlayer/BubbleShooter.tsx` | Generic hex-cluster match-3 mechanic. Vector reflection raycasting, BFS cluster flood-fill, and audio synthesis engineered in-house. |

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

For all 9 in-house and public domain rule implementations:
- **Zero Third-Party Binary Scraping:** No assets or scripts were extracted from external gaming portals (e.g. Poki, CrazyGames, itch.io).
- **Independent Canvas/React Implementation:** Game rendering, physics calculations, input event handlers, and sound effects were authored specifically for NexusPlay.
- **Trademark Clearance:** All game titles use descriptive or original names (`Snake Arcade`, `Brick Breaker`, `Tic-Tac-Toe Pro`, `Classic Checkers`, `Solitaire Royale`, `Neon Racer`, `Block Puzzle`, `Bubble Shooter`) avoiding trademark infringement.

---

## 5. Licensing Officer Certification

I hereby certify that all 10 playable games active in the NexusPlay platform catalog have undergone thorough intellectual property and software licensing auditing. All open-source obligations are fully met, all proprietary works are legally owned, and no copyright or distribution restrictions are violated.

**Certified by:** Lead Open-Source Licensing Specialist & Legal Compliance Auditor  
**Date:** October 26, 2026
