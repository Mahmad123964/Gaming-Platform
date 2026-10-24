# Architecture Decision Record (ADR-0002)

## Title
Frontend Stack Evolution: React 19, TypeScript, Vite, and Scoped CSS Modules

## Status
Approved / Proposed for Phase 1 Execution

## Date
2026-10-24

## Context
Sprint 00 verified the baseline staging deployment pipeline and automated smoke test suite (`EP13-01`) using Vanilla JavaScript and static assets. However, the long-term platform requirements across 13 epics and 48 stories encompass complex interactive states:
- Multi-step player authentication and token refresh cycles (EP-01).
- Dynamic catalog discovery with real-time category filtering and title search across 100+ games (EP-02).
- Real-time multiplayer lobby state machines (waiting, full, active, reconnecting) and public matchmaking queues (EP-05, EP-06).
- Cross-game progress tracking, level resume checkpoints, and achievement toasts (EP-07).
- Monetization checkout modals and payment status listeners (EP-08, EP-09).
- Role-based content administration tables and live game publishing controls (EP-10).

Managing these interactive flows with imperative Vanilla DOM manipulation creates significant risk of state synchronization bugs, memory leaks in WebSocket listeners, and layout thrashing. Furthermore, absence of compile-time type checking creates boundary vulnerabilities against the 144 acceptance criteria.

## Decisions

### 1. Framework: React 19
- Adopt React for declarative UI rendering, component lifecycle isolation, and reactive state management.
- Standardize on React hooks (`useState`, `useReducer`, `useContext`) and lightweight state stores for global lobby and player context.
- Leverage virtual DOM diffing to ensure 60 FPS performance when filtering 100+ catalog titles or processing high-frequency WebSocket state events.

### 2. Language: TypeScript
- Adopt TypeScript across the frontend with strict mode enabled (`"strict": true`).
- Maintain shared type contracts (`shared/types/`) between backend APIs and frontend components (e.g., `Player`, `Game`, `Lobby`, `SessionState`, `PaymentTransaction`, `AuditEvent`).
- Enforce strict typing on all component props, API DTOs, and WebSocket message schemas to eliminate runtime `undefined` errors.

### 3. Build Tooling: Vite
- Standardize on Vite for rapid development (instant Hot Module Replacement) and optimized production builds.
- Configure Vite to bundle assets into `client/dist/` with automated code-splitting, tree-shaking, and static asset hashing.
- Ensure build times remain under 1 second to preserve the rapid execution of the automated staging deployment pipeline.

### 4. Styling Architecture: Scoped CSS Modules & "Obsidian Arcade" Design System
- Reject heavy utility frameworks in favor of **Vanilla CSS Modules** (`[name].module.css`) combined with a global Design Token system (`tokens.css`).
- Fully preserve the custom HSL color palette, dark charcoal surfaces, restrained violet/teal accents, glassmorphic panels, and smooth micro-animations.
- Guarantee full accessibility compliance (WCAG 2.1 AA) including visible focus outlines, high-contrast text, and `@media (prefers-reduced-motion: reduce)` support.

## Consequences & Mitigations
- **Build Pipeline Step:** An automated build step (`npm run build`) is introduced. The staging deployment script (`scripts/deploy-staging.js`) will invoke this build prior to spawning the staging server.
- **Express Static Serving:** Express will serve the production bundle from `client/dist/` in staging and production modes, while maintaining all existing API and health routes (`/health`, `/api/health`, `/api/v1/status`).
- **Zero Loss of Existing Functionality:** All existing health probes, WebSocket protocols, database schemas, and deployment ledgers remain 100% functional and preserved.
