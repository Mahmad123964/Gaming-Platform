# ADR-0006: Player Profiles and Administrative Audit Architecture
**NexusPlay Online Gaming Platform • Architectural Baseline Version 1.2**

## Status
Accepted & In Implementation (Sprint 06 Authorization)

## Context
Following the successful closure of Sprint 05 (Game Progress, History & Achievements), NexusPlay is authorized to implement Sprint 06 covering **Player Profile Management** (`EP01-04`) and **Administrative Audit** (`EP11-03`).

In a production-ready online gaming platform:
1. Players must be able to view and personalize their gaming profile (display name, avatar, bio, preferences) while preserving their security context, session tokens, gaming records, gamerscore, and subscriptions (`AC-4.1`, `AC-4.2`, `AC-4.3`).
2. Privileged account attributes (role, email, verification status, subscription tier, points) must be strictly immutable from client-controlled profile update requests.
3. Operators and administrators require an auditable trail of all critical system events, administrative mutations, and rejected unauthorized access attempts (`AC-40.1`, `AC-40.2`, `AC-40.3`).
4. Audit records must be protected by true database-level immutability controls and must redact all sensitive credentials, passwords, session tokens, and keys.

## Decision

### 1. Player Profile Architecture (`ProfileService`)
- We introduce a dedicated `ProfileService` (`server/src/modules/identity/profileService.js`) and a `player_profiles` table:
  ```sql
  CREATE TABLE IF NOT EXISTS player_profiles (
      id TEXT PRIMARY KEY,
      player_id TEXT UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      avatar TEXT DEFAULT 'pilot-cyan',
      bio TEXT DEFAULT '',
      preferences_json TEXT DEFAULT '{"theme":"obsidian","soundEnabled":true,"notificationsEnabled":true,"privacyMode":"public"}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Automatic Profile Provisioning:**
  - If a player profile does not exist when a player queries or updates their profile, it is lazily provisioned using their `players.display_name`.
- **Allowed Editable Attributes:**
  - `displayName`: String, length [3, 30] inclusive. Alphanumeric, spaces, underscores, hyphens. Sanitized and trimmed.
  - `avatar`: Presets (`'pilot-cyan'`, `'cyber-sentinel'`, `'neon-commander'`, `'obsidian-ace'`, `'quantum-ghost'`, `'retro-droid'`) or valid secure HTTPS URL.
  - `bio`: Optional string, maximum 250 characters.
  - `preferences`: Object with `theme` (`'obsidian'|'dark'|'cyberpunk'`), `soundEnabled` (boolean), `notificationsEnabled` (boolean), `privacyMode` (`'public'|'private'`).
- **Security Boundary & Field Protection:**
  - Profile update payloads attempting to alter `role`, `id`, `email`, `password_hash`, `status`, `gamerscore`, `subscription_tier`, or `created_at` are rejected or stripped.
  - Updating `displayName` synchronizes both `player_profiles.display_name` and `players.display_name` transactionally, ensuring auth tokens and sessions reflect the new gamertag.
  - Cross-player modification is prevented by binding the update target to the authenticated `req.player.id` (`AC-4.3`).

### 2. Administrative Audit Architecture (`AuditService`)
- **Immutability Enforcement:**
  - **API Layer:** Express route guards reject all non-GET HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) on `/api/v1/admin/audit-events` with `HTTP 405 Method Not Allowed`.
  - **Database Engine Layer:** True database-level immutability is enforced via SQLite `TRIGGER`s:
    ```sql
    CREATE TRIGGER IF NOT EXISTS prevent_audit_events_update
    BEFORE UPDATE ON audit_events
    BEGIN
        SELECT RAISE(FAIL, 'Audit ledger is strictly immutable: UPDATE is prohibited at the database engine level.');
    END;

    CREATE TRIGGER IF NOT EXISTS prevent_audit_events_delete
    BEFORE DELETE ON audit_events
    BEGIN
        SELECT RAISE(FAIL, 'Audit ledger is strictly immutable: DELETE is prohibited at the database engine level.');
    END;
    ```
- **Security Failure Auditing (`AC-40.2`):**
  - When an unauthenticated or non-admin user attempts to access administrative endpoints or audit logs, an `ACCESS_DENIED` event is automatically recorded in `audit_events`.
- **Sensitive Data Redaction:**
  - `details_json` automatically scrubs all keys matching `password`, `hash`, `token`, `secret`, `cookie`, `key`, or `authorization`, replacing values with `"[REDACTED]"`.
- **Query & Filtering (`AC-40.3`):**
  - Administrative audit API supports filtering by `action`, `actorId`, `resource`, `startDate`, `endDate`, and pagination (`limit`, `offset`).

### 3. Obsidian Arcade UI/UX
- **Profile Modal (`ProfileModal.tsx`):**
  - Responsive Obsidian Arcade interface with tabbed or unified profile editor.
  - Interactive avatar preset selector.
  - Real-time character counter for bio (0/250).
  - Preference toggles for audio, theme, notifications, and privacy mode.
  - Inline error feedback, validation hints, and save success toasts.
- **Audit Viewer (`AuditViewerModal.tsx`):**
  - Admin-only modal for inspecting chronological system audit events.
  - Action-type badge coloring, actor attribution, resource tagging, and expandable JSON inspector.
  - Filter by action and search by target resource.

## Consequences
- **Positive:** Full player self-service personalization, rock-solid security boundaries preventing privilege escalation, true database-level audit ledger immutability, zero regression across Sprint 00–05.
- **Negative:** Requires schema expansion (`player_profiles` table, SQLite triggers) and synchronized updates across `players` and `player_profiles`.
