# NexusPlay — Game Licensing Approval Matrix & Publishing Governance

**Document Version:** 2.0  
**Status:** Authoritative Governance Specification  
**Architecture Domain:** Intellectual Property, Licensing Clearance & Content Administration  
**Effective Date:** 2026-10-26  

---

## 1. Governance Principles & Legal Integrity

NexusPlay enforces a strict **Zero-Infringement Content Governance Policy**. No third-party game title may be hosted, embedded, distributed, or commercialized across the platform without verifiable legal authorization.

Prior platform assumptions conflated game catalog entry with direct in-browser hosting rights. Under this corrected governance framework:
1. **Self-Hosting Requires Written Rights:** Games hosted locally on NexusPlay web runtimes (`/games/:slug/index.html`) must possess open-source permissive licensing (e.g., MIT, BSD, Apache 2.0, GPL) or direct written commercial developer/publisher agreements.
2. **Proprietary & Closed Titles Require External Referral:** Proprietary AAA console/PC games (Take-Two's *Grand Theft Auto*, Activision's *Call of Duty*) and mobile-exclusive IP (*Subway Surfers*, *Temple Run*, *World Cricket Championship*) are classified strictly as `EXTERNAL_STORE_REFERRAL` pointing to authorized stores (Steam, Epic, Google Play, Poki). Local iframe execution is legally and technically prohibited.
3. **Atomic Gate Enforcement:** Content administrators cannot publish games without explicit licensing approval, and licensing status changes automatically cascade to catalog visibility.

---

## 2. Extended 8-State Licensing Lifecycle

The licensing lifecycle is modeled as an authoritative server-enforced state machine in `server/src/modules/contentAdmin/contentAdminService.js`:

```
                           +----------------+
                           |   DISCOVERED   |
                           +-------┬--------+
                                   │
                                   ▼
                   +--------------------------------+
                   |    LICENSE_REVIEW_REQUIRED     |
                   +───────┬────────────────┬───────+
                           │                │
                           ▼                ▼
            +──────────────────────+   +──────────────────+
            | PERMISSION_REQUESTED |   | LICENSE_REJECTED |
            +──────────────┬───────+   +──────────────────+
                           │
                           ▼
                  +──────────────────+
                  | LICENSE_APPROVED │
                  +────────┬─────────+
                           │
                           ▼
                 +───────────────────+
                 | INTEGRATION_READY |
                 +─────────┬─────────+
                           │ (Admin Publish)
                           ▼
                    +─────────────+
                    |  PUBLISHED  |
                    +──────┬──────+
                           │ (Expiry / Revocation)
                           ▼
                   +─────────────────+
                   | LICENSE_EXPIRED |
                   +─────────────────+
```

### State Definitions & Operational Rules

| State | Definition | Public Catalog Browse | Runtime Launch Permitted | Permitted Transitions |
|:---|:---|:---:|:---:|:---|
| **`DISCOVERED`** | Title identified in sourcing research; no formal contact initiated | NO | NO | `LICENSE_REVIEW_REQUIRED` |
| **`LICENSE_REVIEW_REQUIRED`** | Legal & business team analyzing copyright, build assets, and distribution model | NO | NO | `PERMISSION_REQUESTED`, `LICENSE_REJECTED` |
| **`PERMISSION_REQUESTED`** | Formal outreach / licensing term sheet submitted to developer or publisher | NO | NO | `LICENSE_APPROVED`, `LICENSE_REJECTED` |
| **`LICENSE_APPROVED`** | Written legal contract executed OR verified permissive open-source license | NO (Until build verified) | Staging Only | `INTEGRATION_READY`, `LICENSE_EXPIRED` |
| **`INTEGRATION_READY`** | Technical build verified, CSP headers tested, metadata and pricing configured | NO (Draft stage) | Staging Only | `PUBLISHED`, `LICENSE_REVIEW_REQUIRED` |
| **`PUBLISHED`** | Active live listing in public catalog; available to users | **YES** | **YES** | `LICENSE_EXPIRED`, `LICENSE_REVIEW_REQUIRED` |
| **`LICENSE_REJECTED`** | Publisher declined terms, incompatible terms, or unauthorized IP | NO | NO | Terminal State |
| **`LICENSE_EXPIRED`** | Contract term concluded without renewal; rights lapsed | NO | NO | `LICENSE_REVIEW_REQUIRED` |

---

## 3. Atomic Database Enforcement & Auto-Unpublish Cascade

To eliminate human error and race conditions, the licensing engine integrates directly with SQLite transaction locks:

### 3.1 Atomic Publication Gate (`PATCH /api/v1/admin/games/:id/publish`)
1. Begins SQLite immediate transaction lock (`BEGIN IMMEDIATE;`).
2. Re-queries `licensing_approvals` row for `game_id`.
3. Verifies that `status IN ('approved', 'LICENSE_APPROVED', 'PUBLISHED', 'INTEGRATION_READY')`.
4. If unapproved or pending:
   - Rolls back transaction immediately.
   - Records security audit event `ADMIN_PUBLISH_REJECTED`.
   - Returns HTTP 422 `LICENSING_APPROVAL_REQUIRED`.
5. If approved:
   - Sets `games.is_published = 1`.
   - Updates `licensing_approvals.status = 'PUBLISHED'`.
   - Records audit event `ADMIN_GAME_PUBLISHED`.
   - Commits transaction (`COMMIT;`).

### 3.2 Auto-Unpublish Cascade (`PUT /api/v1/admin/games/:id/licensing`)
When an administrator modifies a licensing record to `LICENSE_REJECTED`, `LICENSE_EXPIRED`, or `LICENSE_REVIEW_REQUIRED`:
1. The server wraps the update in an atomic transaction.
2. Updates `licensing_approvals` status.
3. Automatically executes `UPDATE games SET is_published = 0 WHERE id = ?`.
4. Flushes catalog cache, instantly removing the game from all public browse, search, and launch endpoints.
5. Emits audit event `ADMIN_LICENSING_CASCADE_UNPUBLISH`.

---

## 4. Comprehensive Licensing Matrix — Candidate Titles

| Game Title | Original Publisher / Dev | Intellectual Property Status | Distribution Model | Permitted Channel | NexusPlay Hosting Right | Action State |
|:---|:---|:---|:---|:---|:---:|:---:|
| **2048 Classic** | Gabriele Cirulli | Open Source (MIT License) | `FREE` | Native Browser & Mobile | **YES** (Permitted by MIT License) | `PLAY_NOW` |
| **Obsidian Chess** | In-House / Open Engine | Proprietary / Stockfish GPLv3 | `FREE` | Native Browser | **YES** (In-House Copyright) | `PLAY_NOW` |
| **Cyber Invaders** | NexusPlay Studio | Proprietary In-House | `FREE` | Native Browser | **YES** (Owned by NexusPlay) | `PLAY_NOW` |
| **Quantum Grid** | NexusPlay Studio | Proprietary In-House | `FREE` | Native Browser | **YES** (Owned by NexusPlay) | `PLAY_NOW` |
| **Neon Horizon** | NexusPlay Studio | Proprietary In-House | `PAID_ONE_TIME` | Native Browser | **YES** (Owned by NexusPlay) | `PURCHASE` |
| **Chrono Tactics** | NexusPlay Studio | Proprietary In-House | `PAID_ONE_TIME` | Native Browser | **YES** (Owned by NexusPlay) | `PURCHASE` |
| **Subway Surfers** | SYBO Games / Kiloo | Closed Proprietary | `EXTERNAL_STORE` | Poki Official Web Build | **NO** (Referral Link Only) | `OPEN_OFFICIAL_STORE` |
| **Temple Run** | Imangi Studios | Closed Proprietary Mobile | `EXTERNAL_STORE` | Google Play / App Store | **NO** (Referral Link Only) | `OPEN_OFFICIAL_STORE` |
| **WCC2 (Cricket)** | Nextwave Multimedia | Closed Proprietary Mobile | `EXTERNAL_STORE` | Google Play Store | **NO** (Referral Link Only) | `OPEN_OFFICIAL_STORE` |
| **Real Cricket 24** | Nautilus Mobile | Closed Proprietary Mobile | `EXTERNAL_STORE` | Google Play Store | **NO** (Referral Link Only) | `OPEN_OFFICIAL_STORE` |
| **Grand Theft Auto V**| Take-Two / Rockstar | Closed AAA PC/Console | `EXTERNAL_STORE` | Steam / Epic Games | **NO** (Referral Link Only) | `OPEN_OFFICIAL_STORE` |
| **Call of Duty Warzone**| Activision / Microsoft | Closed AAA PC/Console | `EXTERNAL_STORE` | Battle.net / Steam | **NO** (Referral Link Only) | `OPEN_OFFICIAL_STORE` |
| **Cosmic Odyssey** | Third-Party Studio | Commercial In Review | `UNAVAILABLE_PENDING_LICENSE`| None (Staging Preview) | **NO** (Launch Blocked) | `COMING_SOON` |
