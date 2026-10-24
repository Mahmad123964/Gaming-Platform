# NexusPlay — Authentication & Identity API Specification
**Sprint:** Sprint 01 — Identity & Security  
**Version:** 1.0.0  
**Status:** Authoritative Implementation Baseline  
**Base URL:** `http://localhost:5050/api/v1/auth` (Staging) | `https://api.nexusplay.gg/v1/auth` (Production)  

---

## 1. Overview & Architectural Context

The NexusPlay Identity & Security subsystem implements user registration, credential authentication, multi-device session management, password recovery, and brute-force rate limiting. It aligns with ADR-0001, ADR-0002, and the SRE Reliability Specification for Phase 1.

### Traceability to Approved Backlog & Acceptance Criteria
- **EP01-01 — User Registration**: `AC-1.1`, `AC-1.2`, `AC-1.3`
- **EP01-02 — User Authentication**: `AC-2.1`, `AC-2.2`, `AC-2.3`
- **EP01-03 — Password Recovery**: `AC-3.1`, `AC-3.2`, `AC-3.3`
- **EP11-01 — Authentication Rate Limiting**: `AC-38.1`, `AC-38.2`, `AC-38.3`

---

## 2. Common Headers & Authentication Scheme

All authentication requests use JSON payloads. Protected endpoints require the `Authorization` header formatted as:
```http
Authorization: Bearer <64_character_hex_session_token>
```

### Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-10-24T10:44:24.404Z"
}
```

### Standard Error Format
```json
{
  "error": "Bad Request",
  "message": "Detailed human-readable error description",
  "timestamp": "2026-10-24T10:44:24.417Z"
}
```

---

## 3. Endpoints

### 3.1. User Registration
Creates a new player account, computes a secure salted scrypt password hash, and automatically issues an initial 24-hour session token.

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
    "token": "d748f2b3e8910a34c56e789123456789abcdef0123456789abcdef0123456789",
    "expiresAt": "2026-10-25T10:44:24.404Z"
  },
  "timestamp": "2026-10-24T10:44:24.404Z"
}
```

#### Response — 409 Conflict (`AC-1.2`)
```json
{
  "error": "Conflict",
  "message": "An account with this email address already exists",
  "timestamp": "2026-10-24T10:44:24.413Z"
}
```

#### Response — 400 Bad Request (`AC-1.3`)
Returned if email is invalid, password does not meet complexity rules, or display name is outside 2–32 characters.
```json
{
  "error": "Bad Request",
  "message": "Password must be between 8 and 64 characters in length (inclusive)",
  "timestamp": "2026-10-24T10:44:24.422Z"
}
```

---

### 3.2. User Authentication (Sign In)
Authenticates player credentials using constant-time comparison, evaluates rate limiting policies, and issues a 24-hour session token. Concurrent sessions from multiple devices are permitted.

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
    "token": "f459c90123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    "expiresAt": "2026-10-25T10:44:24.569Z"
  },
  "timestamp": "2026-10-24T10:44:24.569Z"
}
```

#### Response — 401 Unauthorized (`AC-2.3`)
Returned for both wrong password and unregistered email to guarantee anti-enumeration protection.
```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "remainingAttempts": 4,
  "timestamp": "2026-10-24T10:44:24.723Z"
}
```

#### Response — 429 Too Many Requests (`AC-38.2`)
Returned when 5 consecutive failed attempts occur within a 15-minute window for an `ip:email` composite key.
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
  "lockedUntil": "2026-10-24T10:59:26.619Z",
  "timestamp": "2026-10-24T10:44:26.619Z"
}
```

---

### 3.3. User Sign Out (Logout)
Explicitly revokes the active session token in the database. Subsequent requests with this token are rejected.

- **Method / Path:** `POST /api/v1/auth/logout`
- **Authentication:** `Bearer <token>` or `{ "token": "..." }`
- **Traceability:** EP01-02 (`AC-2.2`)

#### Request Body (Optional if Authorization header provided)
```json
{
  "token": "f459c90123456789abcdef0123456789abcdef0123456789abcdef0123456789"
}
```

#### Response — 200 OK (`AC-2.2`)
```json
{
  "success": true,
  "message": "Successfully logged out and session revoked",
  "timestamp": "2026-10-24T10:44:24.908Z"
}
```

---

### 3.4. Password Recovery Request (Forgot Password)
Initiates password recovery. If the email exists, creates a single-use 15-minute reset token in `password_resets`. Returns a uniform generic message regardless of email existence to prevent user enumeration.

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
  "timestamp": "2026-10-24T10:44:24.924Z"
}
```
*(In staging/development environments, a `resetToken` property is appended to facilitate automated test runners without an external SMTP gateway).*

---

### 3.5. Password Reset Submission
Validates the reset token, enforces password complexity rules, updates the password hash, marks the token as used (single-use), and immediately revokes all existing active sessions across all devices.

- **Method / Path:** `POST /api/v1/auth/reset-password`
- **Authentication:** Public (Token-bound)
- **Traceability:** EP01-03 (`AC-3.2`, `AC-3.3`)

#### Request Body
```json
{
  "token": "79b32c810984a921d78213f56e987123abcdef4567890123456789abcdef0123",
  "newPassword": "NewObsidianPass2026!"
}
```

#### Response — 200 OK (`AC-3.2`, `AC-3.3`)
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please log in with your new credentials.",
  "timestamp": "2026-10-24T10:44:25.128Z"
}
```

#### Response — 400 Bad Request (Invalid / Used / Expired Token)
```json
{
  "error": "Bad Request",
  "message": "Password reset token is invalid or has already been used",
  "timestamp": "2026-10-24T10:44:25.133Z"
}
```
Or when expired:
```json
{
  "error": "Bad Request",
  "message": "Password reset token has expired. Please request a new reset link.",
  "timestamp": "2026-10-24T10:44:25.375Z"
}
```

---

### 3.6. Identity Context Verification
Validates the caller's session token and returns the current authenticated player profile.

- **Method / Path:** `GET /api/v1/auth/me`
- **Authentication:** `Bearer <token>`
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
  "timestamp": "2026-10-24T10:44:24.897Z"
}
```

#### Response — 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid, revoked, or expired session token.",
  "timestamp": "2026-10-24T10:44:24.913Z"
}
```

---

## 4. Input Validation Matrix

| Field | Type | Min | Max | Rules / Regex | Error Code | Error Message |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `email` | String | 3 | 254 | RFC 5322 regex format | 400 | "Invalid email address format" |
| `password` | String | 8 | 64 | At least 1 letter, at least 1 number | 400 | "Password must be between 8 and 64 characters in length (inclusive)" / "Password must contain at least one number" |
| `displayName` | String | 2 | 32 | Trimmed, non-empty | 400 | "Display name must be between 2 and 32 characters in length (inclusive)" |
| `token` | String | 64 | 64 | Hex string generated by CSPRNG | 400 | "Password reset token is invalid or has already been used" |

---

## 5. Security & Rate Limiting Controls

1. **Password Hashing:**
   - Algorithm: `node:crypto.scryptSync`
   - Salt: 16 bytes cryptographically random (`crypto.randomBytes(16)`)
   - Key Length: 64 bytes
   - Storage Format: `<salt_hex>:<hash_hex>`
2. **Timing-Safe Comparison:**
   - Password hashes verified using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
   - Non-existent user login executes a dummy constant-time verification against a pre-allocated fixed hash to eliminate timing differentiation between "user not found" and "wrong password".
3. **Session Management:**
   - Token Generation: 32 bytes (64 hex characters) from CSPRNG.
   - Session Lifetime: 24 hours (86,400 seconds) from issue.
   - Multi-device sessions supported concurrently.
   - Immediate total session revocation (`UPDATE auth_sessions SET revoked = 1 WHERE player_id = ?`) executed upon successful password reset.
4. **Brute-Force Rate Limiting (EP11-01):**
   - Composite Key: `<ip>:<normalized_email>`
   - Attempt Threshold: 5 failed attempts within sliding 15-minute window.
   - Lockout Action: 429 Too Many Requests with `Retry-After: 900` header and 15-minute temporary lockout.
   - Counter Reset: Counter resets immediately upon successful login or after lockout expiry.
