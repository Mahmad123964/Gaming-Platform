# Sprint 06 Implementation Plan: Player Profiles & Administrative Audit

**Project:** NexusPlay Online Gaming Platform  
**Sprint:** 06  
**Scope:** EP01-04 (Player Profile Management), EP11-03 (Administrative Audit)  
**Acceptance Criteria:** AC-4.1, AC-4.2, AC-4.3, AC-40.1, AC-40.2, AC-40.3  

---

## 1. Acceptance Criteria Mapping

| User Story | AC ID | Requirement Summary | Implementation Target | Test Verification Check |
| :--- | :--- | :--- | :--- | :--- |
| **EP01-04** | **AC-4.1** | Given a signed-in player provides an allowed display name, When saved, Then revised values appear on profile | `ProfileService.updateProfile` / `PUT /api/v1/profile` | `PROF-01`: Valid display name and settings saved & retrieved |
| **EP01-04** | **AC-4.2** | Given invalid profile values, When save requested, Then validation is shown & prior values remain | `ProfileService.validateProfile` / validation middleware | `PROF-02`: Rejection of short/long/invalid names; prior value unchanged |
| **EP01-04** | **AC-4.3** | Given user is not authenticated, When profile update requested, Then update is denied | `requireAuth` on `/api/v1/profile` | `PROF-03`: Unauthenticated profile requests return HTTP 401 |
| **EP01-04** | **SEC-PROF** | Player cannot modify role, email, password, or subscription tier via profile | Attribute whitelist filter in `updateProfile` | `PROF-SEC-01`: Role tampering payload ignored / rejected; role preserved |
| **EP01-04** | **ISO-PROF** | Player A cannot view private settings or update Player B profile | User ID binding to `req.player.id` | `PROF-ISO-01`: Cross-player update attempt rejected with HTTP 403 |
| **EP11-03** | **AC-40.1** | Admin changes critical setting, audit captures actor, action, and time | `AuditService.logEvent` / `audit_events` | `AUDIT-01`: Admin game setting change creates complete audit row |
| **EP11-03** | **AC-40.2** | Unauthorized administrative action rejected and captured in audit policy | `requireAdmin` error handler logs `ACCESS_DENIED` | `AUDIT-02`: Unauthorized attempt logs ACCESS_DENIED with actor & IP |
| **EP11-03** | **AC-40.3** | Operator views audit events with permission, event info retrievable | `GET /api/v1/admin/audit-events` | `AUDIT-03`: Admin queries and filters audit events by action/actor |
| **EP11-03** | **IMMUTABLE** | Audit ledger is strictly immutable at database engine level | SQLite triggers: `prevent_audit_events_update/delete` | `AUDIT-IMM-01`: UPDATE/DELETE on audit_events aborted by SQLite engine |
| **EP11-03** | **REDACT** | Sensitive secrets, passwords, tokens redacted from audit details | Sanitization filter in `logEvent` | `AUDIT-RED-01`: Passwords and tokens scrubbed to [REDACTED] |

---

## 2. Technical Implementation Tasks

### Task 1: Database Schema & Database-Level Immutability
1. In `server/src/db/schema.sql` and `server/src/db/index.js`:
   - Create `player_profiles` table.
   - Add SQLite triggers `prevent_audit_events_update` and `prevent_audit_events_delete`.
   - Add auto-migration logic in `DatabaseManager.init()`.

### Task 2: Profile Backend Engine (`ProfileService` & Routes)
1. Create `server/src/modules/identity/profileService.js`:
   - `getProfile(playerId, requestingPlayerId)`
   - `updateProfile(playerId, updates)`
   - `ensureProfileExists(playerId, displayName)`
2. Create `server/src/modules/identity/profileRoutes.js` (or add to `identity/routes.js`):
   - `GET /api/v1/profile` (current authenticated player's full profile)
   - `PUT /api/v1/profile` (update profile)
   - `GET /api/v1/profile/:playerId` (public/sanitized profile for player lookup)
3. Mount `/api/v1/profile` in `server/src/app.js`.

### Task 3: Audit Engine Hardening & Triggers
1. Enhance `AuditService` in `server/src/modules/contentAdmin/contentAdminService.js`:
   - Enforce automatic secret redaction for `password`, `token`, `secret`, `cookie`, `key`, `hash`.
   - Add filter parameters: `startDate`, `endDate`, `actorId`, `action`, `resource`.
   - Log `ACCESS_DENIED` event whenever an unauthenticated or non-admin user attempts admin routes.
2. Verify SQLite triggers prevent direct database mutations (`UPDATE` or `DELETE` on `audit_events`).

### Task 4: Obsidian Arcade UI/UX
1. Create `client/src/components/profile/ProfileModal.tsx` and `ProfileModal.module.css`:
   - Profile overview card with avatar preview and gamertag.
   - Edit form: Display Name input, Avatar selector grid, Bio textarea with character counter (0/250), Theme/Audio/Notification/Privacy toggles.
   - Stats summary: Gamerscore, Checkpoints, Sessions played.
   - Save button with loading and validation states.
2. Create `client/src/components/admin/AuditViewerModal.tsx` and `AuditViewerModal.module.css`:
   - Admin-only audit log modal with action filters and searchable table.
   - Expandable details JSON viewer with formatted timestamp and actor information.
3. Wire Profile and Audit triggers into `Navbar.tsx`, `App.tsx`, and Admin dashboard.

### Task 5: Automated Testing & Regressions
1. Create `scripts/test-sprint06-profile-audit.js`:
   - Test all 13 required scenarios from AC-4.1..4.3, AC-40.1..40.3, security, immutability, redaction, and isolation.
2. Execute full platform regressions (Sprints 00, 01, 02, 03, 04, 05).
3. Create `scripts/verify-sprint06-browser.js` for Chrome CDP browser testing and capture authentic screenshots.

### Task 6: Documentation & Reporting
1. Generate `docs/reports/Sprint-06-Implementation-Report.docx`.
2. Update `docs/reports/MASTER-Implementation-Record.docx` to Version 1.2.
3. Create `docs/api/player-profile-api.md`.
4. Update `docs/api/content-admin-api.md` (audit section).
