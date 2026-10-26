# NexusPlay Systems Architecture — HTML5 Game Integration Architecture

**Document ID:** ARCH-H5GA-001  
**Milestone:** 2.9 Final Certification  
**Status:** IMPLEMENTED & BENCHMARKED  
**Date:** 2026-10-26  
**Architects:** Principal HTML5 Gaming Platform Architect, Senior Full-Stack Engineer, Application Security Lead  

---

## 1. Architectural Overview & Integration Modalities

NexusPlay provides a modular, multi-format runtime platform capable of delivering high-performance gaming across three distinct integration modalities:

```
                              ┌──────────────────────────────────┐
                              │     NexusPlay Web Platform       │
                              │   (React + TypeScript Engine)    │
                              └─────────────────┬────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                          [Client Launch Flow]    [Catalog Router]
                                    │                       │
         ┌──────────────────────────┼───────────────────────┴────────────────────────┐
         │                          │                                                │
         ▼                          ▼                                                ▼
┌──────────────────┐      ┌──────────────────┐                             ┌──────────────────┐
│   SELF_HOSTED    │      │AUTHORIZED_IFRAME │                             │EXTERNAL_REDIRECT │
│ (Local Runtimes) │      │ (Partner Feeds)  │                             │ (Store Referrals)│
└────────┬─────────┘      └────────┬─────────┘                             └────────┬─────────┘
         │                         │                                                │
         ├─ React Engine           ├─ W3C Sandboxed Iframe                          └─ Outbound Link
         │  (Cyber Invaders)       │  (GameDistribution)                               (Google Play,
         │                         │                                                    Steam, App Store)
         └─ Ticketed Static        └─ Domain Whitelist Check
            Bundle (2048)             (CSP + Content Admin)
```

### 1.1 Modality Specifications

1. **`SELF_HOSTED` (Local Runtimes):**
   - The game code and visual assets reside directly on NexusPlay infrastructure.
   - Delivered via React component engines (e.g., `CyberInvadersCanvas.tsx`, `Classic2048.tsx`) or protected static directory paths (e.g., `/games/2048/index.html`).
   - Access to static bundles is guarded by cryptographic HMAC-SHA256 launch tickets.
2. **`AUTHORIZED_IFRAME` (Authorized Partner Embeds):**
   - The game is hosted on a vetted, contractually authorized distributor CDN (such as GameDistribution).
   - Rendered within an isolated, sandboxed HTML `<iframe>` with strict Content Security Policy (CSP) and feature-policy allowances.
   - Host domain must match the administrative whitelist (`html5.gamedistribution.com`, `html5games.com`).
3. **`EXTERNAL_REDIRECT` (External Store Referrals):**
   - Used for third-party commercial games (e.g., Subway Surfers, Temple Run, GTA V).
   - Local iframe launch is blocked with HTTP 422 `EXTERNAL_STORE_REDIRECT`.
   - Client renders an "Open Official Store" card routing the user to official app stores.

---

## 2. Reusable GameDistribution Adapter Design

To support scaling from the 2-game pilot to 25, 50, and 100 authorized games, NexusPlay defines a standard **Provider-Authorized HTML5 Iframe Adapter**:

### 2.1 GameDistribution Publisher Onboarding Specifications

| Parameter | Type | Required | Description | Example Value |
|:---|:---|:---:|:---|:---|
| `publisherId` | String | Yes | Official Publisher ID issued upon contract execution | `pub-nexusplay-2026-prod` |
| `gameId` | String | Yes | Unique GameDistribution content identifier | `gd-b8f3910c` |
| `launchUrl` | String | Yes | Authoritative CDN embed URL | `https://html5.gamedistribution.com/b8f3910c/` |
| `allowedDomains` | Array[String] | Yes | Whitelisted hostnames for CSP and origin verification | `["html5.gamedistribution.com", "html5games.com"]` |
| `contractRef` | String | Yes | Internal legal contract and rev-share ID | `AGR-GD-2026-004` |
| `sandboxPolicy` | Array[String] | Yes | W3C sandbox permissions granted to iframe | `["allow-scripts", "allow-same-origin", "allow-popups", "allow-forms", "allow-fullscreen"]` |
| `featurePolicy` | String | Yes | Hardware permissions granted to iframe | `accelerometer; autoplay; gamepad; gyroscope; fullscreen` |

---

### 2.2 Security Architecture & Sandbox Controls

Running third-party games within an iframe presents risks of parent-page redirection, cryptomining, phishing, and clickjacking. NexusPlay mitigates these threats through four defensive layers:

```
[Parent NexusPlay App]
  │
  ├──► 1. Content-Security-Policy: frame-src 'self' https://html5.gamedistribution.com https://html5games.com;
  │
  ├──► 2. W3C Sandbox Attribute:
  │         sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-fullscreen"
  │         (CRITICAL: "allow-top-navigation" is OMITTED to prevent malicious redirect of NexusPlay)
  │
  ├──► 3. Launch Ticket Enforcement:
  │         Launch API verifies licensing status and issues an HMAC-signed ticket before rendering
  │
  └──► 4. PostMessage Channel Validation:
            Window message event listeners verify event.origin === "https://html5.gamedistribution.com"
```

---

### 2.3 Aspect Ratio, Mobile Viewport & Fullscreen Handling

The iframe adapter automatically adapts to diverse HTML5 canvas resolutions:

1. **Responsive Viewport Ratios:**
   - Landscape Arcade: `16:9` (`padding-bottom: 56.25%`).
   - Standard WebGL: `4:3` (`padding-bottom: 75%`).
   - Mobile Portrait: `9:16` (`padding-bottom: 177.78%`) or dynamic viewport flex (`height: 100%`).
2. **Fullscreen Management:**
   - Fullscreen API (`document.fullscreenElement`, `requestFullscreen`) binds to the game container, allowing full-screen immersion while preserving escape key exit triggers.
3. **Mobile Touch Passthrough:**
   - `touch-action: manipulation` applied to container to prevent double-tap zoom delay on iOS Safari and Android Chrome.

---

### 2.4 Error Handling, Loading States & Health Monitoring

The adapter implements active lifecycle state management:

```typescript
type IframeState = 'INITIALIZING' | 'LOADING' | 'READY' | 'ERROR' | 'UNAVAILABLE';
```

- **Skeleton Shimmer:** Displayed while the iframe initializes (`onload` event pending).
- **Timeout Fallback:** If the iframe does not dispatch `load` within 10,000ms, an error banner is displayed with a "Reload Game" button.
- **Automated Health Probes:** A background cron job executes periodic HTTP HEAD requests against all registered `launch_url` destinations. If a provider URL returns HTTP 404 or 5xx:
  - Game is automatically flagged `AVAILABILITY_DEGRADED`.
  - Alert notification is dispatched to SRE dashboard.
  - Catalog dynamically hides the game until connectivity is restored.

---

### 2.5 Advertising & Analytics Obligations

To comply with GameDistribution's commercial revenue-sharing terms:
1. **Ad Lifecycles:** The sandbox allows popups and redirects within new tabs (`allow-popups`) to enable ad landing page clicks.
2. **Mute on Background:** When the user switches browser tabs, the game runner listens to `visibilitychange` and triggers pause / mute signals.
3. **Audit Ledger:** Ad impressions and session durations are recorded in `audit_events` under `ACTION = 'PARTNER_GAME_SESSION'` for month-end financial reconciliation.
