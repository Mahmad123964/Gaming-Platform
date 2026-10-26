# NexusPlay Legal & Compliance — Game Licensing & Rights Register

**Document ID:** COMP-GLRR-001  
**Milestone:** 2.9 Final Certification  
**Status:** AUDITED & LEGALLY CERTIFIED  
**Date:** 2026-10-26  
**Auditors:** Game Licensing Auditor, Legal Compliance Officer, Application Security Lead  

---

## 1. Statutory Framework & Licensing Principles

NexusPlay enforces a strict, legally audited Intellectual Property (IP) and distribution governance policy across all digital entertainment content offered on the platform:

1. **Zero Piracy Invariant:** NexusPlay strictly prohibits the unauthorized scraping, reverse-engineering, mirror hosting, or embedding of HTML5 games from web portals (such as Poki, CrazyGames, or Armor Games) without written, legally binding distribution contracts.
2. **Explicit Distribution Clearance:** SQLite table `licensing_approvals` maintains an auditable record of distribution rights. Any game lacking an explicit `APPROVED` or `LICENSE_APPROVED` record is blocked from public publication (HTTP 422 `LICENSING_APPROVAL_REQUIRED`).
3. **Attribution & Notice Preservation:** Open-source software licenses (MIT, Apache 2.0, BSD) require permanent retention of the original copyright notice, disclaimers, and author attribution across all client bundles and static asset paths.
4. **External IP Boundary Enforcement:** Third-party mobile and AAA game trademarks (e.g., SYBO Games, Imangi Studios, Rockstar Games, Activision) are cataloged strictly for informational and referral purposes. NexusPlay makes zero claim of ownership, hosting, or in-platform billing.

---

## 2. Platform Game Licensing & Rights Ledger

### 2.1 First-Party & Open-Source Redistributable Games

| Game Slug | Title | Rights Holder / Author | License / Legal Basis | Permitted Distribution Channels | Static File Path / Manifest | Attribution Display Status |
|:---|:---|:---|:---|:---|:---|:---|
| `2048-classic` | 2048 Classic | **Gabriele Cirulli** (Upstream: `github.com/gabrielecirulli/2048`) | **MIT License** (Permissive Open-Source) | Global Web, Mobile Web, Local Self-Hosting, Commercial Packaging | `server/public/games/2048/LICENSE.txt`, `index.html`, `style.css`, `game.js` | **ACTIVE:** Rendered in game details modal, React component header, and static bundle footer (`Created by Gabriele Cirulli. Licensed under MIT.`). |
| `cyber-invaders` | Cyber Invaders | **NexusPlay Interactive Inc.** | **Proprietary Commercial** (100% In-House) | First-party NexusPlay Platform, Authorized Partner Embeds | `client/src/components/gamePlayer/CyberInvadersCanvas.tsx` | **ACTIVE:** NexusPlay Copyright 2026 notice in canvas overlay. |
| `obsidian-chess` | Obsidian Chess | **NexusPlay Interactive Inc.** (Rules: Public Domain) | **Proprietary Implementation** | First-party NexusPlay Platform | `server/src/modules/multiplayer/botService.js`, `client/src/components/multiplayer/MultiplayerLobbyModal.tsx` | **ACTIVE:** First-party asset notice. |
| `quantum-grid` | Quantum Grid | **NexusPlay Interactive Inc.** | **Proprietary Concept** | Internal Development / Future Release | Catalog metadata record | Provisional notice. Engine integration pending. |
| `neon-horizon` | Neon Horizon | **NexusPlay Interactive Inc.** | **Proprietary Concept** | Internal Development / Commercial Paid | Catalog metadata record | Provisional notice. Engine integration pending. |
| `chrono-tactics` | Chrono Tactics | **NexusPlay Interactive Inc.** | **Proprietary Concept** | Internal Development / Commercial Paid | Catalog metadata record | Provisional notice. Engine integration pending. |
| `vortex-arena` | Vortex Arena | **NexusPlay Interactive Inc.** | **Proprietary Concept** | Internal Development / Multiplayer Sandbox | Catalog metadata record | Provisional notice. Arena canvas pending. |
| `cipher-matrix` | Cipher Matrix | **NexusPlay Interactive Inc.** | **Proprietary Concept** | Internal Development / Casual Puzzle | Catalog metadata record | Provisional notice. Engine integration pending. |
| `solitaire-royale` | Solitaire Royale | **NexusPlay Interactive Inc.** (Rules: Public Domain) | **Proprietary Implementation** | Internal Development / Casual Card | Catalog metadata record | Provisional notice. Engine integration pending. |

---

### 2.2 External Store Titles (Third-Party Trademarks & Referrals)

| Game Slug | Title | Registered Trademark Owner | NexusPlay Commercial Model | Permitted Relationship | Referral Destination URL | Claims Prohibited |
|:---|:---|:---|:---|:---|:---|:---|
| `subway-surfers` | Subway Surfers | **SYBO Games ApS** | `EXTERNAL_STORE` | Outbound Store Referral Only | Google Play / Apple App Store | NO local hosting, NO "Play Now", NO in-platform payment, NO affiliation claim. |
| `temple-run` | Temple Run | **Imangi Studios, LLC** | `EXTERNAL_STORE` | Outbound Store Referral Only | Google Play / Apple App Store | NO local hosting, NO "Play Now", NO in-platform payment, NO affiliation claim. |
| `world-cricket-championship-2` | WCC2 | **Nextwave Multimedia Pvt Ltd** | `EXTERNAL_STORE` | Outbound Store Referral Only | Google Play / Apple App Store | NO local hosting, NO "Play Now", NO in-platform payment, NO affiliation claim. |
| `grand-theft-auto-v` | Grand Theft Auto V | **Rockstar Games, Inc. / Take-Two Interactive** | `EXTERNAL_STORE` | Outbound Store Referral Only | Steam / Epic Games Store / Rockstar Launcher | NO cloud streaming, NO local hosting, NO in-platform license sales. |
| `call-of-duty-warzone` | Call of Duty: Warzone | **Activision Publishing, Inc.** | `EXTERNAL_STORE` | Outbound Store Referral Only | Battle.net / Steam | NO cloud streaming, NO local hosting, NO in-platform license sales. |

---

### 2.3 Titles Pending Licensing Clearance

| Game Slug | Title | Stated Rights Status | Distribution Restrictions | Current Enforcement Action |
|:---|:---|:---|:---|:---|
| `cosmic-odyssey` | Cosmic Odyssey | `LICENSE_REVIEW_REQUIRED` | Commercial third-party publisher contract unsigned. | Launch blocked with HTTP 422 `LICENSING_APPROVAL_REQUIRED`. In-platform purchase blocked with HTTP 422 `GAME_UNAVAILABLE_PENDING_LICENSE`. |
| `shadow-protocol` | Shadow Protocol | `DRAFT_PENDING_CLEARANCE` | Internal milestone draft. | Publication flag `is_published = 0`. Public launch blocked with HTTP 403 `GAME_UNPUBLISHED`. |

---

## 3. The 2048 Integration Pilot — Legal Verification

### 3.1 License Terms Analysis
The source code of 2048 authored by Gabriele Cirulli is distributed under the standard **MIT License**:

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

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND...
```

### 3.2 Redistribution Compliance Verification
- **Local Self-Hosting:** NexusPlay hosts the game assets locally under `/games/2048/` on `server/public/games/2048/`. This is 100% permitted under the MIT grant to "use, copy, modify, merge, publish, distribute".
- **Attribution Notice:** The required copyright notice is permanently embedded in `server/public/games/2048/LICENSE.txt`, visually rendered in the game launcher footer, and displayed on the catalog detail modal.
- **Derivative Works & Responsive Enhancements:** In-house responsive D-pad controls and touch swipe bindings developed by NexusPlay do not infringe upon the original author's rights and remain fully compliant with MIT conditions.

---

## 4. Third-Party Game Distributor Integration Rights (GameDistribution)

NexusPlay has established integration readiness for authorized third-party HTML5 game distribution via **GameDistribution (Azerion)**. 

### 4.1 Legal & Contractual Requirements
1. **Publisher Onboarding:** Platform operators must execute a standard GameDistribution Publisher Agreement and obtain an authorized, verified `publisher_id`.
2. **Authorized Embedding:** Games may only be loaded from authorized GameDistribution subdomains (`html5.gamedistribution.com`, `html5games.com`).
3. **Advertising Obligations:** The publisher iframe must allow preroll and midroll video advertisements. Ad-blocking or sandbox restrictions that prevent ad dispatch (`allow-scripts`, `allow-same-origin`, `allow-popups`) violate publisher terms.
4. **Revenue Sharing:** Standard net revenue share is distributed based on impressions and clicks tracked by the GameDistribution SDK.
5. **Anti-Tampering Invariant:** The publisher must not inject client scripts into the game iframe or modify the vendor's tracking payloads.

---

## 5. Anti-Piracy & Content Revocation Protocols

### 5.1 Content Admin Validation Filter
Every administrative game creation or modification undergoes programmatic validation in `contentAdminService.js`:
- Rejects dangerous pseudo-protocols (`javascript:`, `data:`, `blob:`).
- Rejects directory traversal paths (`/../`).
- Strictly limits `AUTHORIZED_IFRAME` hostnames to approved partner domains (`*.nexusplay.gg`, `html5.gamedistribution.com`, `html5games.com`).

### 5.2 Atomic Unpublishing Cascade
If a licensing officer modifies a game's status from `APPROVED` to `REVOKED` or `SUSPENDED` via `PUT /api/v1/admin/games/:id/licensing`:
- SQLite trigger / service transaction automatically sets `games.is_published = 0`.
- All subsequent public launch ticket requests are immediately rejected with HTTP 403 `GAME_UNPUBLISHED`.
- Active in-memory launch tickets are invalidated within 15 minutes.
