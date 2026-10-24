# Architecture Decision Record (ADR-0003)

## Title
Progressive Web App (PWA) & Offline Gaming Architecture

## Status
Proposed / Under Product Owner Review (Sprint 00 Foundation Gate)

## Date
2026-10-24

## Context
NexusPlay aims to offer an installable Progressive Web App (PWA) experience allowing players to install the platform onto desktop and mobile home screens, launch the portal without an active internet connection, and play approved offline-compatible browser games. 

Enabling offline capability introduces critical architectural challenges:
- Game assets range from hundreds of kilobytes to several megabytes; uncontrolled caching would deplete client storage and violate third-party distribution rights.
- Gameplay progress, high scores, and level checkpoints achieved offline must not be lost upon closing the browser and must synchronize cleanly back to the platform upon reconnection.
- Conflict scenarios can occur if a player plays offline on one device and online on another.
- Financial transactions, subscription validations, and multiplayer sessions must never be simulated or corrupted while offline.

## Decisions

### 1. Service Worker Architecture & Caching Tiers
- **Tier 1 (Application Shell):** Stale-While-Revalidate caching strategy for HTML, core CSS modules, JS application bundles, brand icons, and typography. Ensures instantaneous portal launch even in airplane mode.
- **Tier 2 (Catalog Metadata):** Network-First with Cache Fallback. Displays the last known catalog metadata when offline, overlaying clear visual badges indicating which games are downloaded and ready to play.
- **Tier 3 (Downloaded Game Packages):** Cache-Only isolated buckets (`game-asset-[gameId]-v[version]`). Downloaded only upon explicit user command via the Offline Manager.
- **Tier 4 (Dynamic Sensitive APIs):** Network-Only. Authentication (`/api/v1/auth/*`), payments (`/api/v1/payments/*`), and SRE telemetry endpoints are strictly excluded from service worker caching.

### 2. Legal & Storage Constraints on Offline Game Downloads
- **Strict Authorization Gate:** A game is downloadable *only* if both `is_offline_compatible = 1` AND `licensing_offline_approved = 1` exist in the database record. Commercial third-party titles lacking offline distribution agreements are strictly barred from local storage.
- **User-Controlled Storage Management:** No automatic background downloading of full games. The UI provides a dedicated storage manager tracking quota (`navigator.storage.estimate()`), byte progress during download, and one-click removal.
- **Interrupted Download Recovery:** Chunked downloads verify payload integrity via Content-Length and cryptographic hashes; interrupted downloads safely pause or roll back without leaving corrupt partial assets in cache.

### 3. Local Progress Persistence (IndexedDB)
- Implement `NexusPlayDB` via native IndexedDB with three object stores:
  - `offline_progress`: Stores high scores, levels, and state JSON keyed by `[playerId]_[gameId]`.
  - `game_checkpoints`: Stores timestamped save-states for level resumption.
  - `sync_queue`: Records offline session history and events waiting for network delivery.

### 4. Reconnection & Conflict Resolution Protocol
- **Connection Heartbeat:** Reconnection is detected via `navigator.onLine` combined with an active HTTP ping to `/health` to eliminate captive-portal false positives.
- **Deterministic High-Watermark Sync:**
  - *High Scores:* Automatically resolves to `max(server_score, local_score)`.
  - *Linear Levels:* Automatically advances to `max(server_level, local_level)`.
  - *Divergent Save States:* If both server and offline states have progressed independently, the UI triggers a non-blocking **Conflict Resolution Modal**, allowing the player to compare timestamp, level, and score before selecting the authoritative save.

### 5. Security & Operational Guardrails
- **Zero Offline Payments:** Checkout flows and subscription activations are completely disabled when offline with actionable messaging: *"An active internet connection is required to complete payments."*
- **Zero Fake Multiplayer:** Matchmaking, invitation lobbies, and real-time multiplayer are disabled offline. The UI clearly informs the user that only single-player and local computer opponent modes are available.
- **Subscription Entitlement Grace Period:** Paid games verified online store a short-lived cryptographically signed entitlement lease (max TTL: 72 hours). If the lease expires while offline, the game requires an online check-in to revalidate subscription status before launching.

## Consequences & Backlog Impact
- Introduces new epic **EP-14: Offline Mode & PWA Capabilities** with stories `EP14-01` through `EP14-05`.
- Implementation is formally gated and scheduled for a dedicated sprint following core online MVP delivery.
