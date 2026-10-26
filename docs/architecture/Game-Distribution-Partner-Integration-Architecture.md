# NexusPlay — Game Distribution Partner Integration Architecture

**Document Version:** 3.1  
**Architecture Lead:** Principal HTML5 Game Platform Architect & Application Security Lead  
**Effective Date:** October 26, 2026  
**Integration Scope:** HTML5 Game Distributor Integration (`AUTHORIZED_IFRAME`) & Sandboxed Hosting  

---

## 1. Executive Summary & Distributor Strategy

NexusPlay provides a multi-tenant, secure HTML5 runtime architecture supporting both first-party self-hosted canvas games (`SELF_HOSTED`) and verified external HTML5 distribution partner games (`AUTHORIZED_IFRAME`).

To protect users against cross-site scripting (XSS), malicious redirects, clickjacking, cryptocurrency miners, and unvetted tracking scripts, all external games are strictly isolated using defense-in-depth security controls:
1. **Cryptographic Launch Tickets:** Direct embedding without platform issuance is blocked.
2. **Strict Host Allowlisting:** Wildcard domains (`*`) and untrusted origins are strictly rejected with HTTP 400.
3. **W3C Iframe Sandboxing:** Minimal permissions enforced without compromising HTML5 Canvas or WebAudio execution.
4. **Content Security Policy (CSP):** `frame-src` directives explicitly restrict allowed iframe origins.
5. **Contractual Gate:** The distributor adapter architecture is fully tested and ready, but distributor games remain in `LICENSE_PENDING` / unpublished state until official partner onboarding is executed.

---

## 2. Official GameDistribution Publisher Onboarding Requirements

Prior to publishing any live partner title, official GameDistribution onboarding requires satisfying three distinct tiers of technical and legal compliance:

### 2.1 Commercial & Publisher Agreement
- **Publisher Account Verification:** Verified publisher registration on GameDistribution.com with signed distribution contract and publisher ID.
- **Revenue Share & Ad Placement Compliance:** Agreement on standard gross revenue share (typically 50/50 or 70/30 depending on publisher tier) and adherence to strict ad-refresh policies (no forced popups on player input).
- **Game-Specific Entitlement Grants:** Distributor agreement must grant explicit, non-exclusive digital distribution rights within target operational territories (e.g. US, EU, PK, IN).

### 2.2 Technical Integration Specifications
- **HTTPS-Only Delivery:** All game assets, scripts, and media must be served over TLS 1.3/HTTPS from approved CDN subdomains.
- **Approved Origin Endpoints:** Validated game launch URLs must strictly match:
  - `https://html5.gamedistribution.com/[game-guid]/`
  - `https://html5games.com/[game-slug]/`
- **Container Sizing & Aspect Ratio:** Standard 16:9 responsive viewport container (minimum 800×450 up to 1920×1080) with dynamic CSS scaling.
- **W3C Feature Policy Permissions:** Iframe requires explicit permissions:
  `allow="autoplay; fullscreen; screen-wake-lock; orientation-lock"`

---

## 3. Defense-in-Depth Security Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    NEXUSPLAY PLATFORM                                    |
|                                                                                         |
|  +------------------------+       Launch Request       +------------------------------+ |
|  |   Game Details Modal   | ------------------------>  |   POST /api/v1/games/launch  | |
|  +------------------------+                            +------------------------------+ |
|              |                                                        |                 |
|              | Validated Launch Ticket & Session                      | HMAC Signed     |
|              v                                                        v                 |
|  +------------------------------------------------------------------------------------+ |
|  |                           GamePlayerModal (Sandbox Layer)                          | |
|  |                                                                                    | |
|  |  +-------------------------------------------------------------------------------+ | |
|  |  |  <iframe id="game-runtime-iframe"                                             | | |
|  |  |          src="https://html5.gamedistribution.com/b48a1.../"                   | | |
|  |  |          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"   | | |
|  |  |          allow="autoplay; fullscreen"                                         | | |
|  |  |          referrerpolicy="strict-origin-when-cross-origin" />                  | | |
|  |  +-------------------------------------------------------------------------------+ | |
|  |                                                                                    | |
|  |  Security Boundary:                                                                | |
|  |  - No access to document.cookie (HttpOnly platform cookies protected)             | |
|  |  - No access to parent window location / redirects                                | |
|  |  - No dangerous permissions (allow-top-navigation is strictly OMITTED)             | |
|  +------------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------+
```

### 3.1 Strict W3C Sandbox Configuration
The iframe sandbox attribute restricts the external game runtime to the absolute minimum capabilities required for interactive HTML5 games:

| Sandbox Capability | Status | Justification / Security Rationale |
|--------------------|--------|------------------------------------|
| `allow-scripts` | **ENABLED** | Required for game loop, JavaScript physics, canvas rendering, and input event handlers. |
| `allow-same-origin` | **ENABLED** | Required by HTML5 distributor engines to access IndexedDB / localStorage for game progress and save states within their own domain. |
| `allow-popups` | **ENABLED** | Required for external distributor help links, support pages, or publisher credits opening in a new tab. |
| `allow-forms` | **ENABLED** | Required for game settings forms or player name input in local game saves. |
| `allow-top-navigation` | **FORBIDDEN** | **STRICTLY PROHIBITED.** Prevents malicious partner code from hijacking or redirecting the main NexusPlay browser window. |
| `allow-modals` | **FORBIDDEN** | **STRICTLY PROHIBITED.** Prevents disruptive `alert()`, `confirm()`, or `prompt()` dialogs from freezing the browser. |
| `allow-downloads` | **FORBIDDEN** | **STRICTLY PROHIBITED.** Prevents automated drive-by downloads or executable payloads. |

### 3.2 Host Allowlist & URL Sanitation Gate
Before any external game can be registered or launched, `ContentAdminService` and `GameLaunchService` enforce strict validation:

```javascript
const ALLOWED_IFRAME_HOSTS = [
  'html5.gamedistribution.com',
  'html5games.com',
  'cdn.html5games.com'
];

function validatePartnerLaunchUrl(launchUrl) {
  let parsed;
  try {
    parsed = new URL(launchUrl);
  } catch (_) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Enforce HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Partner game URL must use secure HTTPS protocol' };
  }

  // Reject executable pseudo-protocols
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:'];
  if (dangerousSchemes.some(s => launchUrl.toLowerCase().startsWith(s))) {
    return { valid: false, error: 'Disallowed URL scheme' };
  }

  // Reject path traversal
  if (launchUrl.includes('/../') || launchUrl.includes('\\..\\')) {
    return { valid: false, error: 'Path traversal sequences are strictly prohibited' };
  }

  // Strict Host Allowlist Check
  const hostname = parsed.hostname.toLowerCase();
  const isAllowedHost = ALLOWED_IFRAME_HOSTS.some(allowed => 
    hostname === allowed || hostname.endsWith('.' + allowed)
  );

  if (!isAllowedHost) {
    return {
      valid: false,
      error: `External game host '${hostname}' is not authorized. Must be an approved partner host.`
    };
  }

  return { valid: true };
}
```

### 3.3 Broken Integration & Health Monitoring
To prevent broken or dead iframe links from degrading user experience:
1. **Network Probe:** Platform SRE probes verify HTTP 200 availability of partner endpoints during daily automated health checks.
2. **Iframe Error Fallback:** If an iframe fails to load or triggers an `onError` event, `GamePlayerModal` displays a user-friendly diagnostic banner (`INTEGRATION_UNAVAILABLE`) with options to retry or report the issue.
3. **Atomic Revocation Cascade:** If a partner contract lapses or an integration endpoint is deprecated, admin revocation immediately changes the game status to `LICENSE_PENDING` and triggers an atomic unpublishing cascade, preventing future player launches.

---

## 4. Current Deployment & Compliance Status

- **Adapter Architecture:** Fully implemented in `GamePlayerModal.tsx` and validated by 4 automated checks in `test-game-integration-pilot.js` (`PILOT-INT-01..04`).
- **Production Stance:** In accordance with strict governance rules, **zero unlicensed distributor titles are currently published**. All 10 active playable games in the NexusPlay catalog are 100% verified first-party clean-room code or open-source MIT licensed software.
- **Readiness for Partner Expansion:** The partner adapter is ready to onboard distributor titles immediately upon formal execution of publisher agreements.
