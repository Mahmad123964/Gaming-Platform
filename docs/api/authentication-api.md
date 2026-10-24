# NexusPlay — Authentication & Identity API Specification
**Sprint:** Sprint 01 — Identity & Security (Final Approval Baseline)  
**Version:** 1.2.0  
**Status:** Authoritative Implementation Baseline  
**Base URL:** `http://localhost:5050/api/v1/auth` (Staging) | `https://api.nexusplay.gg/v1/auth` (Production)  

---

## 1. Overview & Architectural Security Posture

The NexusPlay Identity & Security subsystem implements user registration, credential authentication, multi-device session management, single-use password recovery, and multi-layer brute-force rate limiting.

### Security Highlights & Governance:
1. **Secure HttpOnly Cookie Authentication & Trusted Proxy Security**:
   - The primary browser authentication mechanism is an `HttpOnly`, `SameSite=Lax` cookie named `nexusplay_session`.
   - **Reverse Proxy Header Validation**: Proxy-originated security metadata (`X-Forwarded-Proto`, `X-Forwarded-For`) is accepted **only** when the immediate TCP socket connection originates from an explicitly trusted reverse proxy (configured via `TRUSTED_PROXIES`, defaulting to loopback `127.0.0.1, ::1`). Direct client header spoofing from untrusted IPs is discarded.
   - In production (`process.env.NODE_ENV === 'production'`), the `Secure` attribute is unconditionally enforced on all authentication cookies.
   - In local development (`NODE_ENV === 'development'`), `Secure` is omitted on direct HTTP loopback connections to permit localhost development without TLS errors.
   - **Zero Token Persistence**: Authentication tokens are **never** persisted in `localStorage` or `sessionStorage`, completely neutralizing client-side token exfiltration via Cross-Site Scripting (XSS).
2. **Cryptographically Session-Bound CSRF Protection**:
   - Accompanied by a client-readable `nexusplay_csrf` cookie (`SameSite=Lax`, `Max-Age=86400`).
   - The CSRF token is cryptographically derived via HMAC-SHA256 from the session secret (`deriveCsrfToken`), binding it uniquely to that authenticated session.
   - Cross-session CSRF attacks are strictly rejected with HTTP 403 (`Cross-session CSRF token rejected. Token is not bound to this authenticated session.`), preventing attackers from substituting foreign CSRF tokens.
   - Origin & Referer Validation: State-changing cookie requests (`POST`, `PUT`, `DELETE`, `PATCH`) validate the `Origin` and `Referer` headers against allowed domains (`localhost`, `127.0.0.1`, and `*.nexusplay.gg`).
   - Dual-Auth Compatibility: Headless API and automated test clients may continue providing `Authorization: Bearer <token>`, bypassing ambient cookie CSRF checks.
3. **Cryptographic Hashing at Rest & Database Dump Defense**:
   - Passwords hashed with salted `scryptSync` (16 bytes random salt, 64 bytes derived key).
   - Session secrets are hashed at rest using SHA-256 (`crypto.createHash('sha256')`) and stored in `auth_sessions.token`. The raw token exists only in the client's HttpOnly cookie.
   - **Database Dump Defense**: An attacker with a full database dump cannot reuse the stored token hashes as valid authentication credentials. Incoming tokens are hashed before querying (`WHERE s.token = ?`), so submitting a stolen hash yields `SHA256(hash)` which fails validation with HTTP 401 Unauthorized.
   - Password reset tokens are cryptographically hashed at rest using SHA-256 (`password_resets.token`).
4. **Internal QA Secret Security & Recovery Outbox Isolation**:
   - The testing outbox endpoint `/api/v1/auth/test/outbox` is **permanently disabled in production** (`process.env.NODE_ENV === 'production'`), returning HTTP 404 Not Found.
   - **Zero Hardcoded Secrets**: All hardcoded QA keys have been permanently removed and retired. Non-production access is gated strictly by the protected environment secret `INTERNAL_TEST_KEY`.
   - If `INTERNAL_TEST_KEY` is unconfigured, outbox access is completely locked out (`HTTP 403 Forbidden`).
   - Timing-safe comparison (`crypto.timingSafeEqual`) prevents side-channel timing attacks against the secret header.
   - Staging outbox logs are isolated in `server/data/email-outbox.log`, which is excluded from static web serving routes and protected by `.gitignore` against repository commits.
5. **Anti-Enumeration & Constant-Time Observable Behavior**:
   - Registration, login, and forgot-password endpoints return identical status codes and error messages regardless of whether the email exists.
   - Forgot-password executes a dummy constant-time cryptographic workload (`constantTimeDummyWork`) for unregistered emails, equalizing response timing and defeating timing oracle attacks.
6. **Multi-Layer Persistent Rate Limiting (EP11-01)**:
   - **Persistence**: Rate limit records are persisted in the SQLite `auth_rate_limits` table, ensuring lockouts survive application crashes, service restarts, and worker restarts.
   - **Layer 1 (Composite IP+Email)**: 5 failed attempts per 15-minute sliding window per IP + email combination triggers a 15-minute lockout with HTTP 429 and `Retry-After: 900` header.
   - **Layer 2 (Distributed Target Email Protection)**: 10 failed attempts against the same target email across *rotating IPs* triggers a 15-minute account lockout, directly thwarting distributed credential-stuffing attacks.

---

## 2. Authentication Schemes & Headers

### Scheme A: Web Application (Browser Client)
```http
Cookie: nexusplay_session=<64_hex_session_token>; nexusplay_csrf=<64_hex_csrf_token>
X-CSRF-Token: <64_hex_csrf_token>
```
Tokens are handled exclusively via the browser's native cookie jar. JavaScript has no access to the `HttpOnly` session cookie.

### Scheme B: Direct API / Automation Harness
```http
Authorization: Bearer <64_hex_session_token>
```

---

## 3. Endpoints

### 3.1. User Registration
Creates a new player account, computes salted scrypt password hash, sets secure `nexusplay_session` (`HttpOnly`) and `nexusplay_csrf` cookies, and issues initial 24-hour session.

- **Method / Path:** `POST /api/v1/auth/register`
- **Authentication:** Public
- **Traceability:** EP01-01 (`AC-1.1`, `AC-1.2`, `AC-1.3`)

#### Request Body
```json
{
  "email": "player@nexusplay.gg",
  "password": "ObsidianPlayer2026!",
  "displayName": "ObsidianKnight"
}
```

#### Response — 201 Created (`AC-1.1`)
```http
HTTP/1.1 201 Created
Set-Cookie: nexusplay_session=d748f2b3...; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax
Set-Cookie: nexusplay_csrf=9b1287c1...; Path=/; Max-Age=86400; SameSite=Lax
```
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-mgz219b-a48f12c3",
      "email": "player@nexusplay.gg",
      "displayName": "ObsidianKnight",
      "role": "player"
    },
    "token": "d748f2b3...",
    "csrfToken": "9b1287c1...",
    "expiresAt": "2026-10-25T13:26:56.590Z"
  },
  "timestamp": "2026-10-24T13:26:56.590Z"
}
```

#### Response — 409 Conflict (`AC-1.2`)
```json
{
  "error": "Conflict",
  "message": "An account with this email address already exists",
  "timestamp": "2026-10-24T13:26:56.602Z"
}
```

---

### 3.2. User Authentication (Sign In)
Authenticates credentials using timing-safe comparison, sets `HttpOnly` and CSRF cookies, and resets the rate limit failure counter upon success. Concurrent multi-device logins are supported.

- **Method / Path:** `POST /api/v1/auth/login`
- **Authentication:** Public
- **Traceability:** EP01-02 (`AC-2.1`, `AC-2.3`), EP11-01 (`AC-38.1`, `AC-38.2`, `AC-38.3`)

#### Request Body
```json
{
  "email": "player@nexusplay.gg",
  "password": "ObsidianPlayer2026!"
}
```

#### Response — 200 OK (`AC-2.1`)
```http
HTTP/1.1 200 OK
Set-Cookie: nexusplay_session=f459c901...; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax
Set-Cookie: nexusplay_csrf=4a3c1029...; Path=/; Max-Age=86400; SameSite=Lax
```
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-mgz219b-a48f12c3",
      "email": "player@nexusplay.gg",
      "displayName": "ObsidianKnight",
      "role": "player"
    },
    "token": "f459c901...",
    "csrfToken": "4a3c1029...",
    "expiresAt": "2026-10-25T13:26:56.822Z"
  },
  "timestamp": "2026-10-24T13:26:56.822Z"
}
```

#### Response — 401 Unauthorized (`AC-2.3`)
```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "remainingAttempts": 4,
  "timestamp": "2026-10-24T13:26:57.089Z"
}
```

#### Response — 429 Too Many Requests (`AC-38.2`)
Enforced after 5 consecutive failures per IP+Email or 10 failures across rotating IPs.
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 900
```
```json
{
  "error": "Too Many Requests",
  "message": "Too many failed authentication attempts. Account access is temporarily locked.",
  "remainingAttempts": 0,
  "retryAfterSeconds": 900,
  "lockedUntil": "2026-10-24T13:41:57.089Z",
  "timestamp": "2026-10-24T13:26:57.089Z"
}
```

---

### 3.3. User Sign Out (Logout)
Revokes session in persistence and clears both `nexusplay_session` and `nexusplay_csrf` cookies. For cookie-based requests, requires matching `X-CSRF-Token` header.

- **Method / Path:** `POST /api/v1/auth/logout`
- **Authentication:** `Cookie` or `Bearer <token>`
- **Headers:** `X-CSRF-Token: <token>` (if using Cookie)
- **Traceability:** EP01-02 (`AC-2.2`)

#### Response — 200 OK (`AC-2.2`)
```http
HTTP/1.1 200 OK
Set-Cookie: nexusplay_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax
Set-Cookie: nexusplay_csrf=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax
```
```json
{
  "success": true,
  "message": "Successfully logged out and session revoked",
  "timestamp": "2026-10-24T13:26:57.250Z"
}
```

#### Response — 403 Forbidden (CSRF Mismatch)
```json
{
  "error": "Forbidden",
  "message": "CSRF token validation failed. Missing or invalid X-CSRF-Token header.",
  "timestamp": "2026-10-24T13:26:57.242Z"
}
```

---

### 3.4. Password Recovery Request (Forgot Password)
Initiates password recovery. Dispatches a genuine email via `emailService` (logged to `data/email-outbox.log` in staging; dispatched via transactional SMTP/SES in production). Stores SHA-256 hashed token with 15-minute expiration. Equalizes timing on non-existent accounts.

- **Method / Path:** `POST /api/v1/auth/forgot-password`
- **Authentication:** Public
- **Traceability:** EP01-03 (`AC-3.1`)

#### Request Body
```json
{
  "email": "player@nexusplay.gg"
}
```

#### Response — 200 OK (`AC-3.1`)
```json
{
  "success": true,
  "message": "If this email is registered, password reset instructions have been sent.",
  "timestamp": "2026-10-24T13:26:57.423Z"
}
```

---

### 3.5. Password Reset Submission
Validates raw token against stored SHA-256 hash, enforces single-use policy (`used = 1`), updates password hash, and **immediately revokes all active device sessions for that player** (`AC-3.3`).

- **Method / Path:** `POST /api/v1/auth/reset-password`
- **Authentication:** Public (Token-bound)
- **Traceability:** EP01-03 (`AC-3.2`, `AC-3.3`)

#### Request Body
```json
{
  "token": "raw_64_hex_token_from_email",
  "newPassword": "NewObsidianPass2026!"
}
```

#### Response — 200 OK (`AC-3.2`, `AC-3.3`)
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please log in with your new credentials.",
  "timestamp": "2026-10-24T13:26:57.576Z"
}
```

#### Response — 400 Bad Request (Used or Expired Token)
```json
{
  "error": "Bad Request",
  "message": "Password reset token is invalid or has already been used",
  "timestamp": "2026-10-24T13:26:57.581Z"
}
```

---

### 3.6. Identity Context Verification
Validates the caller's session via ambient `HttpOnly` cookie or `Authorization: Bearer <token>` header.

- **Method / Path:** `GET /api/v1/auth/me`
- **Authentication:** `Cookie` or `Bearer <token>`
- **Traceability:** EP01-02 (`AC-2.1`)

#### Response — 200 OK
```json
{
  "success": true,
  "user": {
    "id": "usr-mgz219b-a48f12c3",
    "email": "player@nexusplay.gg",
    "displayName": "ObsidianKnight",
    "role": "player",
    "sessionId": "ses-mgz219c-9b1287c1"
  },
  "timestamp": "2026-10-24T13:26:57.237Z"
}
```

#### Response — 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required. No session token or cookie provided.",
  "timestamp": "2026-10-24T13:26:57.254Z"
}
```

---

### 3.7. Staging Email Outbox Inspection (Non-Production Only)
Inspects outbound password reset emails for automated QA test harnesses without accessing external mailbox servers. Strictly disabled in production.

- **Method / Path:** `GET /api/v1/auth/test/outbox`
- **Authentication:** Requires `X-Internal-Test-Key` header matching server internal test secret
- **Environment Restriction:** Disabled in `production` (`process.env.NODE_ENV === 'production'`)

#### Headers
```http
X-Internal-Test-Key: <configured_internal_test_key>
```
*Note: Hardcoded fallback keys have been permanently removed and rotated. Access requires an environment-provisioned secret (`INTERNAL_TEST_KEY`), compared using `crypto.timingSafeEqual`.*

#### Response — 200 OK (Staging / Dev with Valid Key)
```json
{
  "success": true,
  "outbox": [
    {
      "id": "mail-1792849617308-x9k1",
      "to": "player@nexusplay.gg",
      "from": "security@nexusplay.gg",
      "subject": "NexusPlay — Password Recovery Request",
      "sentAt": "2026-10-24T13:27:37.308Z",
      "data": {
        "resetToken": "9892ac52...",
        "expiresAt": "2026-10-24T13:42:37.308Z"
      }
    }
  ],
  "timestamp": "2026-10-24T13:28:43.174Z"
}
```

#### Response — 403 Forbidden (Missing, Invalid, or Unconfigured Test Key)
```json
{
  "error": "Forbidden",
  "message": "Access denied: Valid X-Internal-Test-Key header required for outbox inspection",
  "timestamp": "2026-10-24T15:36:33.236Z"
}
```

#### Response — 404 Not Found (Production Environment)
```json
{
  "error": "Not Found",
  "message": "Outbox inspection endpoint is permanently disabled in production environments",
  "timestamp": "2026-10-24T15:36:33.263Z"
}
```

---

## 4. Input Validation Matrix

| Field | Type | Min | Max | Rules / Regex | Error Code | Error Message |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `email` | String | 3 | 254 | RFC 5322 regex format | 400 | "Invalid email address format" |
| `password` | String | 8 | 64 | At least 1 letter, at least 1 number | 400 | "Password must be between 8 and 64 characters in length (inclusive)" / "Password must contain at least one number" |
| `displayName` | String | 2 | 32 | Trimmed, non-empty | 400 | "Display name must be between 2 and 32 characters in length (inclusive)" |
| `token` | String | 64 | 64 | 256-bit CSPRNG hex string | 400 | "Password reset token is invalid or has already been used" |
| `X-CSRF-Token` | Header | 64 | 64 | Must match session HMAC binding & cookie value | 403 | "CSRF token validation failed" / "Cross-session CSRF token rejected" |
| `Origin` / `Referer` | Header | — | — | Allowed origins: host, localhost, 127.0.0.1, *.nexusplay.gg | 403 | "Untrusted Cross-Origin Request. Origin or Referer header rejected." |
| `X-Internal-Test-Key` | Header | 1 | 128 | Dynamic secret matching `process.env.INTERNAL_TEST_KEY` | 403 | "Access denied: Valid X-Internal-Test-Key header required for outbox inspection" |

---

## 5. Security & Rate Limiting Controls

1. **Password Hashing:** `node:crypto.scryptSync`, 16-byte random salt, 64-byte key length.
2. **Session Token Hashing at Rest:** `node:crypto.createHash('sha256')` stored in `auth_sessions.token`. Database dumps cannot be directly reused for authentication.
3. **Cryptographic Session-Bound CSRF Tokens:** `node:crypto.createHmac('sha256')` derives CSRF token from raw session secret. Prevents cross-session injection.
4. **Origin & Referer Validation:** Protects all state-changing endpoints against cross-origin attacks from unauthorized web origins.
5. **Reverse Proxy Trust Verification:** Header forwarding metadata (`X-Forwarded-Proto`, `X-Forwarded-For`) is honored only when incoming TCP socket IP is in `TRUSTED_PROXIES`. Untrusted direct clients spoofing forwarding headers are discarded.
6. **Strict Production Cookie Flags:** In `production`, cookies unconditionally enforce `Secure` and `HttpOnly`.
7. **Timing-Safe Equality:** `crypto.timingSafeEqual` used on derived buffers. Dummy constant-time evaluation prevents timing leaks.
8. **Reset Token Hashing at Rest:** SHA-256 hash stored in `password_resets.token`. Raw token transmitted only to user's verified email.
9. **Session Cascade Revocation:** Single logout invalidates that token; password reset invalidates all active sessions for the player across all devices (`UPDATE auth_sessions SET revoked = 1 WHERE player_id = ?`).
10. **Rate Limiting Persistence & Distributed Protection:**
    - Backed by SQLite table `auth_rate_limits`.
    - Dual thresholds: 5 attempts / 15m window per `ip:email`; 10 attempts / 15m window globally per `target_email` against distributed IP rotation attacks.
11. **Outbox Isolation & Zero Hardcoded Secrets:** Public access to outbox logs disabled; static server routes restrict access to client bundle only. Production access returns HTTP 404. Non-production access requires dynamically injected environment secrets.

---

## 6. Unresolved Deployment-Security Requirements

The following infrastructure-level deployment requirements must be coordinated with DevOps / SRE prior to production launch (Sprint 13+):
1. **Ingress TLS Termination & Trusted Proxy CIDRs**:
   - Production reverse proxies (AWS ALB, Cloudflare, or Nginx Ingress) must terminate TLS with valid CA-signed certificates.
   - The platform application must be configured with `TRUSTED_PROXIES` containing the exact private subnet CIDR blocks of the ingress controllers (e.g. `10.0.0.0/16`), ensuring untrusted external traffic cannot spoof forwarding metadata.
2. **HSTS Header Enforcement**:
   - Ingress proxies must inject the `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` header to ensure browsers never downgrade to unencrypted HTTP.
3. **Protected Secret Management Pipeline**:
   - Production secrets (`INTERNAL_TEST_KEY`, database credentials, session secrets) must be injected via a managed secret store (e.g. AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets), with continuous secret rotation policies.
4. **Production Transactional Email Gateway Authentication**:
   - Staging relies on local outbox logging. Production requires provisioning AWS SES or SendGrid with strict SPF, DKIM, and DMARC DNS records to prevent email spoofing and guarantee deliverability.
5. **Open Browser Verification Limitation**:
   - Automated browser screenshots are marked `NOT CAPTURED` due to upstream Azure CDN driver download unavailability. Browser verification remains an open QA tracking item until an interactive test agent with display capabilities is provisioned.
