# NexusPlay — Phase 1 Comprehensive Risk Register
**Project:** NexusPlay Online Gaming Platform  
**Audit Scope:** Phase 1 — Foundation & Core MVP (Sprints 00–06)  
**Date of Audit:** October 25, 2026 (Final Traceability Consistency Audit)  
**Security & Governance Lead:** Application Security Lead, Staff SRE, Principal Software Architect  

---

## 1. Executive Risk Overview & Staging vs Production Boundaries

Phase 1 operates within a controlled **Staging / MVP environment** (`http://localhost:5050`) supporting single-player gaming, catalog browsing, content administration, and player profile management. 

To ensure rigorous governance and maintain clear boundaries, risks are explicitly separated into:
1. **Staging Development Risks:** Architectural characteristics acceptable during MVP and internal testing that do **NOT** block entry into Sprint 07 (Operations & SRE).
2. **Production Launch Blockers:** Critical security, financial, and compliance requirements that **MUST** be resolved before public commercial release in Phase 2/Phase 3.

```
+----------------------------------------------------------------------------------------------------+
|                                      RISK SEPARATION TAXONOMY                                      |
+-------------------------------------------------+--------------------------------------------------+
|            STAGING DEVELOPMENT RISKS            |            PRODUCTION LAUNCH BLOCKERS            |
|       (Acceptable for Sprint 07 SRE Entry)      |          (Required for Public Release)           |
+-------------------------------------------------+--------------------------------------------------+
| • Client-side Canvas score plausibility checks  | • Server-authoritative anti-cheat / tick replay  |
| • Single-writer SQLite persistent store (Sync)  | • Clustered PostgreSQL + distributed Redis       |
| • In-memory sliding rate-limiter counters       | • Distributed Redis-backed rate limiter          |
| • Mock email outbox in staging (/test/outbox)   | • Production transactional email (AWS SES)       |
| • Simulated VIP subscription database records   | • PCI-DSS Stripe hosted payment gateway          |
| • Signed HMAC tickets (valid during session)    | • Ephemeral WebSocket single-use exchange ticket |
| • SQLite DB engine triggers for audit log       | • Immutable cloud WORM ledger (S3 Glacier Lock)  |
+-------------------------------------------------+--------------------------------------------------+
```

---

## 2. Forensic Infrastructure Verification & Risk Ledger

### RISK-01: Client-Side Score Simulation & Anti-Cheat Boundaries
* **Category:** Application Security & Anti-Cheat
* **Severity:** **HIGH** (Staging Status: Managed | Production Status: Blocker)
* **Risk Description:**  
  Cyber Invaders executes client-side using HTML5 Canvas. A player could manipulate client memory or craft HTTP requests with plausible scores under the velocity threshold (120 points/sec).
* **Source Code Ground Truth:**  
  - Verified in [server/src/modules/progress/progressService.js](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/modules/progress/progressService.js): Implements ADR-0005 score trust classifications. Scores are strictly categorized as `PLAUSIBILITY_CHECK_PASSED` or `UNVERIFIED`. The backend does NOT perform headless gameplay simulation or authoritatively simulate client physics/bullets.
  - Plausibility thresholds: Velocity limits (points-per-second, maximum score ceiling 1,000,000, minimum duration) flag anomalous submissions.
* **Sprint 07 Impact:** **Non-blocking**. Sprint 07 focuses strictly on SRE dashboards, error rate monitoring, and rollback procedures.
* **Target Resolution Phase:** Phase 3 (Multiplayer & Tournament Engine with server-authoritative tick replay simulation).
* **Owner:** Game Backend Architect

---

### RISK-02: Rate Limiting Memory vs Persistent Session Revocation
* **Category:** Authentication & Session Infrastructure
* **Severity:** **MEDIUM** (Staging Status: Managed | Production Status: Scalability Blocker)
* **Risk Description:**  
  Previous audit reports mistakenly labeled this risk as "In-Memory Token Revocation Store". Source code inspection refutes this label and clarifies the true architectural state.
* **Source Code Ground Truth:**  
  - **Session Storage & Revocation are 100% Database-Persisted:** Verified in [server/src/modules/identity/authService.js](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/modules/identity/authService.js#L55-L66) and [server/src/db/schema.sql](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/db/schema.sql). Sessions are stored in the SQLite `auth_sessions` table with tokens hashed at rest via SHA-256 (`hashToken`). Logout executes `UPDATE auth_sessions SET revoked = 1 WHERE token = ?`. Password reset executes `UPDATE auth_sessions SET revoked = 1 WHERE player_id = ?`. Revocations are durable and survive process restarts.
  - **In-Memory Component:** Only the brute-force rate-limiting attempt counters in [server/src/modules/identity/rateLimiter.js](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/modules/identity/rateLimiter.js) (`this.attempts = new Map()`) reside in memory. Process restarts clear attempt counters, returning rate-limit buckets to empty.
* **Sprint 07 Impact:** **Non-blocking**. Single-node staging operates reliably.
* **Target Resolution Phase:** Phase 2 (Sprint 08: Distributed Redis key-value store for rate limiter counters).
* **Owner:** Application Security Lead & Staff SRE

---

### RISK-03: Single-Writer Database Scaling Bottleneck (Node.js SQLite)
* **Category:** System Architecture & Performance
* **Severity:** **HIGH** (Staging Status: Managed | Production Status: Scalability Blocker)
* **Risk Description:**  
  The platform utilizes Node.js native `DatabaseSync` (`node:sqlite`) on a local file (`data/platform-staging.db`). While WAL mode allows concurrent readers, SQLite permits only a single concurrent writer process with `BEGIN IMMEDIATE` transaction locking.
* **Source Code Ground Truth:**  
  - Verified in [server/src/db/index.js](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/db/index.js). Staging single-player workloads operate with sub-15ms latencies.
* **Sprint 07 Impact:** **Non-blocking**. Sprint 07 measures operational health, memory/CPU metrics, and error rates; database migration to PostgreSQL is strictly out-of-scope for Sprint 07.
* **Target Resolution Phase:** Phase 2 (Sprint 08: Migration to PostgreSQL + Redis connection pool).
* **Owner:** Principal Software Architect

---

### RISK-04: Disaster Recovery & Automated Snapshot Backups
* **Category:** Site Reliability Engineering (SRE)
* **Severity:** **HIGH** (Staging Status: Managed | Production Status: Operational Blocker)
* **Risk Description:**  
  The SQLite database file resides on local staging disk. Node hardware failure would result in data loss without automated hot-backups.
* **Source Code Ground Truth:**  
  - Database schema migrations are reproducible via `server/src/db/schema.sql`.
* **Sprint 07 Impact:** **Directly Addressed**. Sprint 07 implements SRE rollback procedures (`EP13-02`), error rate monitoring (`EP12-01`), and alerting (`EP12-02`).
* **Target Resolution Phase:** Phase 2 (Sprint 07: SRE operational runbooks and automated snapshot backup scripts).
* **Owner:** Staff Site Reliability Engineer

---

### RISK-05: Database-Level vs Physical WORM Audit Immutability Limits
* **Category:** Compliance & Data Integrity
* **Severity:** **MEDIUM** (Staging Status: Managed | Production Status: Compliance Blocker)
* **Risk Description:**  
  SQLite `BEFORE UPDATE` and `BEFORE DELETE` triggers prevent application-level tampering of `audit_events`. However, an OS administrator with raw filesystem write access could alter database bytes directly or execute `DROP TABLE`.
* **Source Code Ground Truth:**  
  - Verified in [server/src/db/schema.sql](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/db/schema.sql#L130-L145): SQLite engine triggers `prevent_audit_events_update` and `prevent_audit_events_delete` abort any physical SQL update or delete operations on `audit_events`.
  - Sensitive credential scrubbing verified in [server/src/modules/contentAdmin/contentAdminService.js](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/modules/contentAdmin/contentAdminService.js#L14-L35) (`sanitizeAuditDetails`).
* **Sprint 07 Impact:** **Non-blocking**.
* **Target Resolution Phase:** Phase 3 (Sprint 13: Export audit events to remote WORM storage / S3 Glacier Object Lock).
* **Owner:** Application Security Lead

---

### RISK-06: Game Launch Ticket Lifecycle & Active Session Binding
* **Category:** Authentication & Session Security
* **Severity:** **LOW** (Staging Status: Hardened & Verified | Production Status: Managed)
* **Risk Description:**  
  Launch tickets are delivered as URL query parameters (`/games/cyber-invaders/index.html?ticket=...`). While signed via HMAC-SHA256, tickets are **not single-use consumable nonces on HTTP GET**—they remain valid for the duration of the active session (up to 15 minutes) to permit player iframe reloads.
* **Source Code Ground Truth:**  
  - Verified in [server/src/modules/gameLaunch/gameLaunchService.js](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/modules/gameLaunch/gameLaunchService.js#L190-L295): The HMAC-SHA256 signature cryptographically binds `ticketId`, `playerId`, `gameSlug`, `sessionId`, `issuedAt`, and `expiresAt`.
  - Database-enforced session check: Ticket validation requires `game_sessions.status === 'active'`. Ending, completing, or restarting the session immediately invalidates the ticket.
* **Sprint 07 Impact:** **Non-blocking**. Reusable ticket within active session is an intentional UX design for iframe reloads.
* **Target Resolution Phase:** Phase 3 (Multiplayer token exchange via secure WebSocket handshake).
* **Owner:** Application Security Lead

---

### RISK-07: Email Service Integration in Production
* **Category:** Third-Party Integrations
* **Severity:** **MEDIUM** (Staging Status: Managed | Production Status: Launch Blocker)
* **Risk Description:**  
  Password recovery emails are logged to an internal staging outbox and local log file.
* **Source Code Ground Truth:**  
  - Verified in [server/src/modules/identity/emailService.js](file:///c:/Users/haali/Desktop/Gaming%20Platform/server/src/modules/identity/emailService.js): The internal outbox endpoint (`GET /api/v1/auth/test/outbox`) is guarded by `X-Internal-Test-Key` and returns 404 in production (`NODE_ENV === 'production'`).
* **Sprint 07 Impact:** **Non-blocking**.
* **Target Resolution Phase:** Phase 2 (Sprint 08: Production transactional email integration via AWS SES / SendGrid).
* **Owner:** Senior Full-Stack Engineer

---

### RISK-08: Premium Subscription Simulation vs Live Payment Processing
* **Category:** Financial & Payment Systems
* **Severity:** **CRITICAL** (Staging Status: Managed | Production Status: Commercial Blocker)
* **Risk Description:**  
  VIP subscriptions are simulated via records in the `subscriptions` table. Real billing, PCI-DSS compliance, webhooks, and dispute processing are not implemented.
* **Source Code Ground Truth:**  
  - Strict entitlement checks prevent non-VIP users from launching premium games.
* **Sprint 07 Impact:** **Non-blocking**. Sprint 07 strictly focuses on SRE operations; payments belong to Phase 4 (Sprint 11–12).
* **Target Resolution Phase:** Phase 4 (Sprint 12: Monetization & Payments via Stripe Hosted Checkout).
* **Owner:** Product Delivery Lead & Senior Security Engineer

---

### RISK-09: Web Accessibility (WCAG 2.1 AA) Compliance
* **Category:** User Experience & Accessibility
* **Severity:** **LOW** (Staging Status: Managed | Production Status: UX Enhancement)
* **Risk Description:**  
  Dynamic HTML5 canvas elements require comprehensive screen reader auditing.
* **Current Phase 1 Implementation:**  
  - Semantic HTML5, high-contrast dark mode palette, ARIA attributes on modals.
* **Sprint 07 Impact:** **Non-blocking**.
* **Target Resolution Phase:** Phase 2 (Sprint 08: Automated axe-core regression and screen-reader user testing).
* **Owner:** Senior React/TypeScript Engineer

---

### RISK-10: Cross-Browser & Mobile Viewport Compatibility
* **Category:** Platform Compatibility
* **Severity:** **MEDIUM** (Staging Status: Managed | Production Status: UX Enhancement)
* **Risk Description:**  
  Touch interaction and Canvas DPI scaling require optimization across mobile devices.
* **Current Phase 1 Implementation:**  
  - Device compatibility service (`EP03-03`) inspects Canvas support prior to launch.
  - Mobile viewport verified via Chrome CDP (`07-profile-modal-mobile-viewport.png`, 390x844).
* **Sprint 07 Impact:** **Non-blocking**.
* **Target Resolution Phase:** Phase 2 (Sprint 08: Virtual touch joysticks and multi-device CI).
* **Owner:** QA Automation Lead

---

### RISK-11: Game Licensing & Commercial Asset Ownership
* **Category:** Legal & Intellectual Property
* **Severity:** **CRITICAL** (Staging Status: Managed | Production Status: Commercial Blocker)
* **Risk Description:**  
  Third-party games onboarded to the platform require verified commercial distribution rights.
* **Current Phase 1 Implementation:**  
  - Sprint 03 licensing gate (`EP10-03`): Games cannot be published without explicit `licensingStatus: "approved"`.
  - License revocation immediately unpublishes games and blocks launches.
* **Sprint 07 Impact:** **Non-blocking**.
* **Target Resolution Phase:** Ongoing Governance (Formal developer publishing agreements).
* **Owner:** Product Owner & Legal Counsel

---

## 3. Sprint 07 Entry Gate Readiness Assessment

| Evaluation Criterion | Sprint 07 Requirement | Current Project Baseline | Gate Verdict |
| :--- | :--- | :--- | :--- |
| **Phase 1 Reconciled Scope** | Sprints 00–06 complete & verified | 25/25 Stories, 75/75 ACs Verified (100%) | **SATISFIED** |
| **Regression Integrity** | Full suite green with zero defects | 284/284 Automated Tests PASS (100%) | **SATISFIED** |
| **End-to-End Integration** | Core player & admin flows verified | 23/23 Checks PASS (E2E Runner) | **SATISFIED** |
| **Out-of-Scope Restraint** | No premature Phase 2/3 features | No PostgreSQL, Redis, Multiplayer, or Stripe | **SATISFIED** |
| **Approved Sprint 07 Scope** | Operations & Reliability Focus | `EP12-01` (Dashboard), `EP12-02` (Alerting), `EP13-02` (Rollback) | **READY FOR ENTRY** |

**Conclusion:** All Phase 1 risks are either fully mitigated or properly isolated to future roadmap phases. The platform is **100% READY** for Product Owner authorization to enter Sprint 07.
