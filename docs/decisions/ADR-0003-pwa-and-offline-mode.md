# Architecture Decision Record (ADR-0003)

## Title
Progressive Web App (PWA) & Offline Gaming Architecture: Shell Caching, Storage Quotas, Contract-Based Sync, and Entitlement Guardrails

## Status
Approved / Proposed Architecture Specification (Sprint 00 Baseline Review)

## Date
2026-10-24

## Context
NexusPlay aims to offer an installable Progressive Web App (PWA) experience allowing players to install the platform onto desktop and mobile home screens, launch the portal without network connectivity, and play approved offline-compatible browser games.

Enabling offline capability introduces critical architectural challenges:
- Game assets range from hundreds of kilobytes to several megabytes; uncontrolled caching would deplete client storage and violate third-party distribution rights.
- Gameplay progress, high scores, and level checkpoints achieved offline must not be lost upon closing the browser and must synchronize cleanly back to the platform upon reconnection.
- Automatic merging of all progress is dangerous: while high scores can be merged monotonically, complex games with inventory, currency, or branching quests cannot be merged automatically without risk of exploits or data loss.
- Financial transactions, subscription validations, and multiplayer sessions must never be simulated or corrupted while offline.
- Backlog governance requires that no epic exceeds four user stories.

## Decisions

### 1. Backlog Decomposition: Two Dedicated Epics
To comply with the project governance rule that every epic contains a maximum of four stories, offline functionality is partitioned into two distinct epics:
- **EP-14: Offline PWA Shell & Storage Management** (3 stories: `EP14-01`, `EP14-02`, `EP14-03` covering shell caching, user-controlled downloads, and storage recovery).
- **EP-15: Offline Progress & Entitlement Security** (3 stories: `EP15-01`, `EP15-02`, `EP15-03` covering IndexedDB persistence, contract-based sync, and entitlement guardrails).

### 2. Service Worker Multi-Tier Caching Strategy
- **Tier 1 (Application Shell):** Stale-While-Revalidate caching strategy for HTML, core CSS modules, JS application bundles, brand icons, and typography.
- **Tier 2 (Catalog Metadata):** Network-First with Cache Fallback. Displays the last known catalog metadata when offline, overlaying clear visual badges indicating which games are downloaded and ready to play.
- **Tier 3 (Downloaded Game Packages):** Cache-Only isolated buckets (`game-asset-[gameId]-v[version]`). Downloaded only upon explicit user command via the Offline Storage Manager.
- **Tier 4 (Dynamic Sensitive APIs):** Network-Only. Authentication (`/api/v1/auth/*`), payments (`/api/v1/payments/*`), and SRE telemetry endpoints are strictly excluded from service worker caching.

### 3. Legal & Storage Constraints on Offline Game Downloads
- **Strict Authorization Gate:** A game is downloadable *only* if both `is_offline_compatible = 1` AND `licensing_offline_approved = 1` exist in the database record. Commercial third-party titles lacking offline distribution agreements are strictly barred from local storage.
- **User-Controlled Storage Management:** No automatic background downloading of full games. The UI provides a dedicated storage manager tracking quota (`navigator.storage.estimate()`), byte progress during download, and one-click removal.
- **Interrupted Download Recovery:** Chunked downloads verify payload integrity via Content-Length and cryptographic hashes; interrupted downloads safely pause or roll back without leaving corrupt partial assets in cache.

### 4. Local Progress Persistence (IndexedDB)
- Implement `NexusPlayDB` via native IndexedDB with three object stores:
  - `offline_progress`: Stores high scores, levels, and state JSON keyed by `[playerId]_[gameId]`.
  - `game_checkpoints`: Stores timestamped save-states for level resumption.
  - `sync_queue`: Records offline session history and events waiting for network delivery.

### 5. Contract-Based Synchronization & Explicit Conflict Resolution
- **Reconnection Detection:** Reconnection is detected via `navigator.onLine` combined with an active HTTP heartbeat probe to `/health` to eliminate captive-portal false positives.
- **Game-Specific Sync Contract (`GameSyncContract`):** Every game manifest explicitly declares one of three synchronization modes:
  - Mode A: `MONOTONIC_SCORE_ONLY` — Safe automatic merge: server accepts `max(server_score, local_score)`.
  - Mode B: `LINEAR_PROGRESSION` — Automatic advance only if local state is a direct forward descendant of the cloud milestone; divergent branches trigger conflict resolution.
  - Mode C: `STATEFUL_INVENTORY_OR_BRANCHING` — Automatic merging is **strictly forbidden**. Any discrepancy triggers an explicit user prompt.
- **Explicit Conflict Resolution Dialog:** When safe automatic merging is not possible, the platform displays an interactive modal showing side-by-side save comparisons (cloud timestamp, level, inventory hash vs. local offline save), requiring the player to explicitly choose which save to retain or fork into a separate save slot.

### 6. Security Guardrails & Offline Entitlements
- **Zero Offline Payments:** Checkout flows and subscription activations are completely disabled when offline with actionable messaging: *"An active internet connection is required to complete payments."*
- **Zero Fake Multiplayer:** Matchmaking, invitation lobbies, and real-time multiplayer are disabled offline. The UI clearly informs the user that only single-player and local computer opponent modes are available.
- **Offline Entitlement Lease (`[OFFLINE_ENTITLEMENT_DURATION]`):** Paid games verified online store a cryptographically signed entitlement lease. The exact duration remains the placeholder `[OFFLINE_ENTITLEMENT_DURATION]` pending legal licensing review, business churn risk analysis, and clock-tampering mitigation sign-off. If the lease expires while offline, the game requires an online check-in to revalidate subscription status before launching.

## Open Decisions & Policy Requirements
Before implementing `EP15-03`, the following decisions must be closed:
1. `[OFFLINE_ENTITLEMENT_DURATION]`: Value approved by Product Owner and Legal (e.g. 24h, 48h, 72h, or 7 days).
2. Anti-Tampering Protocol: Verification mechanism against system clock rollback (e.g. monotonic counter or sealed timestamp verification).
3. Subscription Revocation Handling: Procedure for immediately revoking offline access if a chargeback or cancellation occurs while disconnected.

## Requirements Traceability
- Epic **EP-14: Offline PWA Shell & Storage Management** (`EP14-01`, `EP14-02`, `EP14-03`) -> `AC-49.1` through `AC-51.3`.
- Epic **EP-15: Offline Progress & Entitlement Security** (`EP15-01`, `EP15-02`, `EP15-03`) -> `AC-52.1` through `AC-54.3`.
