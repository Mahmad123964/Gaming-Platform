# NexusPlay — Authentication & Identity API Specification
**Sprint:** Sprint 01 — Identity & Security (Security Hardened Baseline)  
**Version:** 1.1.0  
**Status:** Authoritative Implementation Baseline  
**Base URL:** `http://localhost:5050/api/v1/auth` (Staging) | `https://api.nexusplay.gg/v1/auth` (Production)  

---

## 1. Overview & Architectural Security Posture

The NexusPlay Identity & Security subsystem implements user registration, credential authentication, multi-device session management, single-use password recovery, and multi-layer brute-force rate limiting.

### Security Highlights & Governance:
1. **Secure HttpOnly Cookie Authentication**:
   - The primary browser authentication mechanism is an `HttpOnly`, `SameSite=Lax` cookie named `nexusplay_session`.
   - In production (`process.env.NODE_ENV === 'production'`) or over HTTPS, the `Secure` attribute is strictly enforced.
   - **Zero Token Persistence**: Authentication tokens are **never** persisted in `localStorage` or `sessionStorage`, completely neutralizing client-side token exfiltration via Cross-Site Scripting (XSS).
2. **Double-Submit CSRF Protection**:
   - Accompanied by a client-readable `nexusplay_csrf` cookie (`SameSite=Lax`, `Max-Age=86400`).
   - State-changing cookie requests (`POST`, `PUT`, `DELETE`, `PATCH`) require the matching `X-CSRF-Token` HTTP request header.
   - Dual-Auth Compatibility: Headless API and automated test clients may continue providing `Authorization: Bearer <token>`, bypassing ambient cookie CSRF checks.
3. **Cryptographic Hashing at Rest**:
   - Passwords hashed with salted `scryptSync` (16 bytes random salt, 64 bytes derived key).
   - Password reset tokens are cryptographically hashed at rest using SHA-256 (`crypto.createHash('sha256')`). Even in the event of database exfiltration, raw reset tokens cannot be reconstructed.
4. **Anti-Enumeration & Constant-Time Observable Behavior**:
   - Registration, login, and forgot-password endpoints return identical status codes and error messages regardless of whether the email exists.
   - Forgot-password executes a dummy constant-time cryptographic workload (`constantTimeDummyWork`) for unregistered emails, equalizing response timing and defeating timing oracle attacks.
5. **Multi-Layer Persistent Rate Limiting (EP11-01)**:
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
Inspects outbound password reset emails for automated QA test harnesses without accessing mailbox servers.

- **Method / Path:** `GET /api/v1/auth/test/outbox`
- **Authentication:** Internal / Staging Only

#### Response — 200 OK
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

---

## 4. Input Validation Matrix

| Field | Type | Min | Max | Rules / Regex | Error Code | Error Message |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `email` | String | 3 | 254 | RFC 5322 regex format | 400 | "Invalid email address format" |
| `password` | String | 8 | 64 | At least 1 letter, at least 1 number | 400 | "Password must be between 8 and 64 characters in length (inclusive)" / "Password must contain at least one number" |
| `displayName` | String | 2 | 32 | Trimmed, non-empty | 400 | "Display name must be between 2 and 32 characters in length (inclusive)" |
| `token` | String | 64 | 64 | 256-bit CSPRNG hex string | 400 | "Password reset token is invalid or has already been used" |
| `X-CSRF-Token` | Header | 64 | 64 | Must match `nexusplay_csrf` cookie value | 403 | "CSRF token validation failed. Missing or invalid X-CSRF-Token header." |

---

## 5. Security & Rate Limiting Controls

1. **Password Hashing:** `node:crypto.scryptSync`, 16-byte random salt, 64-byte key length.
2. **Timing-Safe Equality:** `crypto.timingSafeEqual` used on derived buffers. Dummy constant-time evaluation prevents timing leaks.
3. **Reset Token Hashing at Rest:** SHA-256 hash stored in `password_resets.token`. Raw token transmitted only to user's verified email.
4. **Session Cascade Revocation:** Single logout invalidates that token; password reset invalidates all active sessions for the player (`UPDATE auth_sessions SET revoked = 1 WHERE player_id = ?`).
5. **Rate Limiting Persistence & Distributed Protection:**
   - Backed by SQLite table `auth_rate_limits`.
   - Dual thresholds: 5 attempts / 15m window per `ip:email`; 10 attempts / 15m window globally per `target_email` against distributed IP rotation attacks.
