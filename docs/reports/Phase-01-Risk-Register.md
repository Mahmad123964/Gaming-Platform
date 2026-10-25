# NexusPlay — Phase 1 Comprehensive Risk Register
**Project:** NexusPlay Online Gaming Platform  
**Audit Scope:** Phase 1 — Foundation & Core MVP (Sprints 00–06)  
**Date of Audit:** October 25, 2026  
**Security & Governance Lead:** Application Security Lead & Principal Software Architect  

---

## 1. Executive Risk Overview

While Phase 1 has achieved 100% functional acceptance across all 75 approved criteria and passed 284/284 cumulative automated tests and 23/23 end-to-end journey checks, the platform operates in a **Staging / MVP environment**. To prepare for production scaling and commercial release in Phase 2 and Phase 3, eleven critical risk areas have been identified, evaluated, and assigned mitigation strategies.

| Severity Level | Definition | Count |
| :--- | :--- | :--- |
| **CRITICAL** | Must be addressed before public commercial launch; potential for financial loss, complete data loss, or systemic compromise. | 2 |
| **HIGH** | Significant impact on scalability, compliance, or fraud prevention; must be resolved in Phase 2. | 4 |
| **MEDIUM** | Operational or UX limitations that can be managed with active monitoring; target Phase 2/3. | 4 |
| **LOW** | Minor edge cases or cosmetic defects; resolved during ongoing sprints. | 1 |

---

## 2. Detailed Risk Assessment Ledger

### RISK-01: Client-Side Score Simulation & Plausibility Manipulation
* **Category:** Application Security & Anti-Cheat
* **Severity:** **HIGH** (Residual: Medium)
* **Risk Description:**  
  Cyber Invaders and current single-player games execute on the client's browser using HTML5 Canvas. Because the game simulation runs client-side, a sophisticated attacker could modify client memory or craft HTTP requests with plausible scores just below the velocity threshold (120 points/sec).
* **Current Phase 1 Mitigation:**  
  - Implemented ADR-0005 score trust classifications: Scores are strictly classified as `PLAUSIBILITY_CHECK_PASSED` or `UNVERIFIED`. They are NEVER classified as `AUTHORITATIVELY_VERIFIED`.
  - Velocity limits (points-per-second, maximum score ceiling 1,000,000, minimum duration) automatically flag anomalous submissions.
  - Checkpoint progress is validated against mathematical bounds.
* **Planned Resolution Phase:** Phase 2 (Sprint 08/09)
* **Target Mitigation:** Implement server-authoritative tick simulation / deterministic replay engine for competitive leaderboards and prize-bearing tournaments.
* **Owner:** Game Backend Architect

---

### RISK-02: Game Launch Ticket Leakage or Replay
* **Category:** Authentication & Session Security
* **Severity:** **MEDIUM** (Residual: Low)
* **Risk Description:**  
  Launch tickets are passed via URL query parameters (`/games/cyber-invaders/index.html?ticket=...`). In the event of proxy logging, browser history leakage, or shoulder surfing, a launch ticket could theoretically be extracted.
* **Current Phase 1 Mitigation:**  
  - Launch tickets are cryptographically signed using HMAC-SHA256 with a unique nonce and player/session binding.
  - Strict 15-minute expiration window enforced on the ticket payload.
  - Direct launch guard rejects requests with expired or tampered signatures.
  - Ticket consumption invalidates duplicate usage.
* **Planned Resolution Phase:** Phase 2 (Sprint 07)
* **Target Mitigation:** Transition ticket exchange to HTTP POST headers or ephemeral single-use session tokens exchanged over secure WebSockets, eliminating URL parameter visibility entirely.
* **Owner:** Application Security Lead

---

### RISK-03: Single-Writer Database Scaling Bottleneck (SQLite)
* **Category:** System Architecture & Performance
* **Severity:** **HIGH** (Residual: Medium)
* **Risk Description:**  
  The platform currently utilizes Node.js experimental `DatabaseSync` on a local SQLite database (`platform-staging.db`). SQLite supports multiple concurrent readers via WAL mode, but only allows a single concurrent writer process. Under high multiplayer load or concurrent game session completions, write contention could produce `SQLITE_BUSY` or latency spikes.
* **Current Phase 1 Mitigation:**  
  - SQLite WAL (Write-Ahead Logging) mode enabled.
  - Short, atomic transactions utilized in all mutating operations.
  - Staging load tests confirm sub-15ms response times under single-node load.
* **Planned Resolution Phase:** Phase 2 (Sprint 07/08)
* **Target Mitigation:** Migrate relational data store to PostgreSQL (with connection pooling via PgBouncer) for horizontal write scaling, while retaining Redis for caching, leaderboard rankings, and active session states.
* **Owner:** Principal Software Architect

---

### RISK-04: Disaster Recovery & Automated Database Backups
* **Category:** Site Reliability Engineering (SRE)
* **Severity:** **HIGH** (Residual: Medium)
* **Risk Description:**  
  In the current staging environment, the SQLite database resides on local disk. If the server node suffers physical storage failure or unexpected disk corruption, data could be unrecoverable without automated hot-backups.
* **Current Phase 1 Mitigation:**  
  - SQLite database file committed to persistent volume mount.
  - Schema migration files are version-controlled and reproducible from scratch via `server/src/db/schema.sql`.
* **Planned Resolution Phase:** Phase 2 (Sprint 07)
* **Target Mitigation:** Implement automated hourly snapshot replication (e.g. `sqlite3 .backup` or Litestream streaming to S3/GCS bucket with point-in-time recovery).
* **Owner:** Staff Site Reliability Engineer

---

### RISK-05: Database-Level vs Physical WORM Audit Immutability Limits
* **Category:** Compliance & Data Integrity
* **Severity:** **MEDIUM** (Residual: Low)
* **Risk Description:**  
  Sprint 06 implemented SQLite `BEFORE UPDATE` and `BEFORE DELETE` triggers to block application-level mutation of `audit_events`. However, an OS-level administrator with direct filesystem write access to `platform-staging.db` could alter raw database bytes or execute `DROP TABLE`.
* **Current Phase 1 Mitigation:**  
  - SQLite engine triggers `prevent_audit_events_update` and `prevent_audit_events_delete` prevent all application-level and SQL-level updates and deletes.
  - Audit retrieval endpoints enforce HTTP 405 Method Not Allowed on PUT/DELETE/POST.
  - Credential redaction (`sanitizeAuditDetails`) scrubs sensitive data before persistence.
* **Planned Resolution Phase:** Phase 3 (Sprint 13)
* **Target Mitigation:** Export administrative audit events to an immutable remote WORM (Write Once, Read Many) log service (e.g. AWS CloudWatch Logs with MFA Delete, Google Cloud Storage Bucket Lock, or a cryptographically hashed append-only ledger).
* **Owner:** Application Security Lead

---

### RISK-06: Email Service Integration in Production
* **Category:** Third-Party Integrations
* **Severity:** **MEDIUM** (Residual: Low)
* **Risk Description:**  
  Password recovery emails currently record to an internal outbox and server logs (`email-outbox.log`) in staging. In a live production environment, relying on an internal log file is unsuitable for actual user communication.
* **Current Phase 1 Mitigation:**  
  - The internal outbox endpoint is strictly protected by a rotated QA key (`X-Internal-Test-Key`) and returns HTTP 404 permanently when `NODE_ENV === 'production'`.
  - Password reset tokens are fully hashed and cryptographically secure.
* **Planned Resolution Phase:** Phase 2 (Sprint 07)
* **Target Mitigation:** Integrate production transactional email provider (SendGrid, AWS SES, or Postmark) with DKIM/SPF authentication and rate-limited delivery queues.
* **Owner:** Senior Full-Stack Engineer

---

### RISK-07: Premium Subscription Simulation vs Real Payment Gateway
* **Category:** Financial & Payment Systems
* **Severity:** **CRITICAL** (Residual: Medium)
* **Risk Description:**  
  In Phase 1, VIP subscriptions are simulated via the `subscriptions` table to validate access gating for premium games (`AC-8.2`, `AC-9.2`). Real credit card billing, webhook reconciliations, dispute handling, and tax compliance are not yet implemented.
* **Current Phase 1 Mitigation:**  
  - Strict entitlement checks prevent non-VIP users from launching premium games.
  - Free and VIP test accounts allow end-to-end verification of entitlement boundaries.
* **Planned Resolution Phase:** Phase 3 (Sprint 12: Monetization & Payments)
* **Target Mitigation:** Integrate Stripe / PayPal Checkout with PCI-DSS compliant hosted payment sheets, idempotency key processing, and automated webhook lifecycle handling.
* **Owner:** Product Delivery Lead & Senior Security Engineer

---

### RISK-08: Web Accessibility (WCAG 2.1 AA) Compliance
* **Category:** User Experience & Accessibility
* **Severity:** **LOW** (Residual: Low)
* **Risk Description:**  
  While the Obsidian Arcade UI features rich typography, high-contrast dark mode, and keyboard navigation modals, comprehensive screen reader auditing across all dynamic canvas elements has not been formally conducted.
* **Current Phase 1 Mitigation:**  
  - Semantic HTML5 structure throughout all modals, headers, and navigation bars.
  - ARIA attributes (`aria-label`, `role="dialog"`, `aria-hidden`) on all interactive overlays.
  - High contrast color palette (minimum 4.5:1 ratio on primary text).
* **Planned Resolution Phase:** Phase 2 (Sprint 08)
* **Target Mitigation:** Conduct automated axe-core accessibility audits and screen-reader user testing (NVDA / VoiceOver) across all game shells and career hubs.
* **Owner:** Senior React/TypeScript Engineer

---

### RISK-09: Cross-Browser & Mobile Viewport Compatibility
* **Category:** Platform Compatibility
* **Severity:** **MEDIUM** (Residual: Low)
* **Risk Description:**  
  Game canvas input handlers and high-DPI scaling can exhibit variations across mobile browsers (iOS Safari, Android Chrome) or legacy web engines.
* **Current Phase 1 Mitigation:**  
  - Device compatibility service (`EP03-03`, `compatibilityService.js`) dynamically inspects user agent and Canvas capability before launch.
  - Mobile viewport testing executed via Chrome CDP (`07-profile-modal-mobile-viewport.png`, 390x844).
* **Planned Resolution Phase:** Phase 2 (Sprint 08)
* **Target Mitigation:** Implement touch-control virtual joysticks and automated SauceLabs / BrowserStack multi-device testing suite.
* **Owner:** QA Automation Lead

---

### RISK-10: Game Licensing & Commercial Asset Ownership
* **Category:** Legal & Intellectual Property
* **Severity:** **CRITICAL** (Residual: Low)
* **Risk Description:**  
  First playable titles (Cyber Invaders) utilize open-license retro sound effects and pixel assets. Third-party titles registered via Content Admin must have verified commercial distribution rights.
* **Current Phase 1 Mitigation:**  
  - Comprehensive licensing gate implemented in Sprint 03 (`EP10-03`): Games cannot be published without explicit `licensingStatus: "approved"` and recorded license key.
  - License revocation immediately unpublishes games from live catalog.
* **Planned Resolution Phase:** Phase 2 (Ongoing Governance)
* **Target Mitigation:** Establish legal developer publishing agreements, digital asset verification, and DMCA takedown automation.
* **Owner:** Product Owner & Legal Counsel

---

### RISK-11: Concurrent Usage & Realtime WebSocket Scalability
* **Category:** System Architecture & Networking
* **Severity:** **HIGH** (Residual: Medium)
* **Risk Description:**  
  Sprint 00 verified WebSocket handshake on `/ws`, but Phase 1 games operate primarily via HTTP REST. When multiplayer rooms and matchmaking launch in Sprint 08, concurrent WebSocket connections will place memory and thread demands on the Node.js event loop.
* **Current Phase 1 Mitigation:**  
  - WebSocket foundation verified in smoke test (`SMOKE-05`, 11ms latency).
  - Memory consumption maintained under 45 MB RSS in staging.
* **Planned Resolution Phase:** Phase 2 (Sprint 08)
* **Target Mitigation:** Deploy Redis Pub/Sub backplane with WebSocket clustering (Socket.io or `ws` cluster) behind Nginx/HAProxy load balancer.
* **Owner:** Principal Software Architect

---

## 3. Risk Mitigation Summary Matrix

| Risk ID | Title | Severity | Current Mitigation | Planned Phase | Target Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-01** | Score Manipulation | HIGH | Heuristic velocity checks, `PLAUSIBILITY_CHECK_PASSED` | Phase 2 (S08) | Server-authoritative tick simulation |
| **RISK-02** | Launch Ticket Leakage | MEDIUM | Signed HMAC-SHA256, 15m expiration, single-use | Phase 2 (S07) | Header-based token exchange |
| **RISK-03** | SQLite Scaling Bottleneck | HIGH | WAL mode, atomic micro-transactions | Phase 2 (S07/S08) | PostgreSQL + Redis migration |
| **RISK-04** | Disaster Recovery / Backups | HIGH | Volume persistence, schema reproducible | Phase 2 (S07) | Hourly snapshot replication to S3/GCS |
| **RISK-05** | Audit WORM Limits | MEDIUM | Engine triggers abort UPDATE/DELETE | Phase 3 (S13) | Remote immutable WORM ledger |
| **RISK-06** | Email Delivery | MEDIUM | Secure staging outbox, production 404 lock | Phase 2 (S07) | AWS SES / SendGrid integration |
| **RISK-07** | Subscription Billing | CRITICAL | Entitlement check, simulated active periods | Phase 3 (S12) | Stripe PCI-DSS checkout integration |
| **RISK-08** | Web Accessibility | LOW | Semantic HTML5, ARIA labels, high contrast | Phase 2 (S08) | Automated axe-core regression |
| **RISK-09** | Mobile / Browser Engines | MEDIUM | Device compatibility gate, CDP mobile tests | Phase 2 (S08) | Touch virtual controls & multi-device CI |
| **RISK-10** | Game Licensing IP | CRITICAL | Strict licensing approval gate, auto-unpublish | Phase 2 (Ongoing)| Formal publisher agreements |
| **RISK-11** | WebSocket Scale | HIGH | Lightweight handshake, <45MB RSS | Phase 2 (S08) | Redis Pub/Sub + clustered nodes |
