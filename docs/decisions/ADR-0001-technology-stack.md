# Architecture Decision Record (ADR-0001)

## Status
Accepted

## Date
2026-10-24

## Context
The Online Gaming Platform project requires an approved delivery model, technology stack, and staging deployment pipeline (Sprint 00 / Story `EP13-01`). The platform must scale to support 100+ browser games, 10,000 concurrent users (OBJ-06), real-time multiplayer lobbies, single-player session tracking, payment entitlement checks, and comprehensive SRE observability.

## Decisions

### 1. Backend Runtime & APIs
- **Choice**: Node.js (v22 LTS) with Express.js for REST APIs and native `ws` (WebSockets) for real-time multiplayer lobbies and session sync.
- **Rationale**:
  - Event-driven, non-blocking I/O is optimally aligned with high-concurrency connection handling (10,000 concurrent user objective).
  - Clean separation between stateless HTTP endpoints and stateful WebSocket multiplayer lobbies as mandated by Section 6 of the SRE document.
  - Zero friction on developer workstations and CI environments.

### 2. Persistence Layer
- **Choice**: SQLite / Relational schema with automated database migration manager.
- **Rationale**:
  - Provides strict ACID transactions for payment reconciliation, audit trails, and user accounts.
  - Operates completely self-contained with zero external cloud dependencies or Docker daemon requirements during development and staging validation.
  - Easily swappable to PostgreSQL for multi-region cloud production without altering the domain class contracts.

### 3. Frontend Architecture
- **Choice**: Modular Vanilla JavaScript (ES6+ Modules) & Vanilla CSS Design System.
- **Rationale**:
  - Complies with development guidelines prioritizing Vanilla CSS, custom HSL color tokens, dark mode, responsive viewports, and glassmorphism.
  - Eliminates build-step bloat and framework deprecation churn.
  - Maximizes performance, fast page-loads, and rapid DOM updates for interactive game listings and lobby state.

### 4. Staging Pipeline & Automated Smoke Testing (EP13-01)
- **Choice**: Automated Node.js staging deployment pipeline script (`scripts/deploy-staging.js`) and multi-stage health/smoke tester (`scripts/smoke-test.js`).
- **Rationale**:
  - Validates environment configuration, database readiness, API gateway responsiveness, and health check endpoints.
  - Enforces pipeline failure when smoke checks fail (exit code 1, release marked failed) and logs verified success with release metadata upon passing (exit code 0).
  - Capable of being invoked locally or integrated into any CI/CD runner.

## Consequences
- Clean, auditable, reproducible codebase across all sprints.
- All team members and automated Antigravity agents can run tests and staging deployments without external paid service keys.
