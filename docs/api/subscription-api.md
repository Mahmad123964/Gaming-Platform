# NexusPlay Subscription & Entitlements REST API Specification

**Module:** `server/src/modules/subscriptions`  
**Base Path:** `/api/v1/subscriptions`  
**Governing Epics:** `EP08` (Premium Access & Entitlements)  
**Acceptance Criteria:** `AC-27.1`, `AC-27.2`, `AC-27.3`, `AC-28.1`, `AC-28.2`, `AC-28.3`, `AC-29.1`, `AC-29.2`, `AC-29.3`, `AC-30.1`, `AC-30.2`, `AC-30.3`  
**Data Storage:** Native SQLite (`subscriptions`, `subscription_plans`, `subscription_transactions` tables)  
**Security Baseline:** Session Cookie Auth, Double Submit Cookie CSRF (`X-CSRF-Token`), Rate Limiting (120 req/min), Production Payment Simulation Guard  

---

## 1. Overview & Architecture

The Subscription Service provides membership lifecycle management, plan comparison matrices, and entitlement gating for premium games on the NexusPlay platform. In accordance with platform architectural constraints (ADR-0007), all entitlement records and membership states are managed directly within SQLite with Write-Ahead Logging (WAL) enabled, eliminating distributed caching dependencies (such as Redis or external SQL servers).

### Security Architecture & Production Guard
- **Sandbox Simulation vs Live Gateways:** Live payment gateway integrations (Stripe, PayPal, live webhook signatures) are strictly gated and scheduled for **Sprint 12**.
- **Production Guard:** If `NODE_ENV === 'production'` or `APP_ENV === 'production'`, calling `POST /api/v1/subscriptions/subscribe` with a paid plan is rejected with HTTP `501 Not Implemented` and code `PAYMENT_GATEWAY_NOT_CONFIGURED`. No simulated paid entitlement can ever be granted in a production environment.
- **Staging / Development Sandbox:** In non-production environments, simulated payments are accepted, issuing `isSimulated: true` and an explicit `simulationNotice` in the response payload.

---

## 2. Endpoints

### 2.1 GET `/api/v1/subscriptions/plans`
Fetches the public plan comparison matrix.

- **Authentication:** None (Public endpoint, accessible without authentication per AC-27.3).
- **Traceability:** EP08-01 (AC-27.1, AC-27.2, AC-27.3)

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "count": 3,
  "plans": [
    {
      "id": "plan-free",
      "name": "Free Explorer",
      "priceCents": 0,
      "priceDisplay": "$0",
      "interval": "monthly",
      "isPopular": false,
      "features": [
        "Access to all Free Catalog Games",
        "Standard Online Multiplayer",
        "Community Text Chat & Avatars",
        "Single Device Progress Save"
      ]
    },
    {
      "id": "plan-pro-monthly",
      "name": "Nexus Pro",
      "priceCents": 999,
      "priceDisplay": "$9.99/mo",
      "interval": "monthly",
      "isPopular": true,
      "features": [
        "Unlimited Access to All Premium Titles",
        "Zero Advertisements & Priority Queue",
        "Exclusive VIP Profile Badges & Emotes",
        "Cloud Save with Multi-Device Sync",
        "High-Performance 60FPS Stream Quality"
      ]
    },
    {
      "id": "plan-ultimate-monthly",
      "name": "Nexus Ultimate",
      "priceCents": 1999,
      "priceDisplay": "$19.99/mo",
      "interval": "monthly",
      "isPopular": false,
      "features": [
        "All Nexus Pro Benefits Included",
        "Beta Access to Unreleased Game Builds",
        "Direct Match Replay Video Downloads",
        "Exclusive Ultimate Tournament Entry",
        "Custom Animated Lobby Frames & Badges"
      ]
    }
  ],
  "timestamp": "2026-10-25T19:35:00.000Z"
}
```

---

### 2.2 GET `/api/v1/subscriptions/me`
Retrieves current player membership status, active tier, and ISO 8601 renewal timestamp.

- **Authentication:** Required (Session cookie: `nexusplay_session`).
- **Traceability:** EP08-03 (AC-29.1, AC-29.2, AC-29.3)

#### Response (200 OK — Active Subscriber)
```json
{
  "status": "SUCCESS",
  "subscription": {
    "tier": "Nexus Pro",
    "planId": "plan-pro-monthly",
    "status": "active",
    "isActive": true,
    "currentPeriodEnd": "2026-11-24T19:35:00.000Z",
    "renewalDate": "2026-11-24T19:35:00.000Z",
    "features": [
      "Unlimited Access to All Premium Titles",
      "Zero Advertisements & Priority Queue",
      "Exclusive VIP Profile Badges & Emotes",
      "Cloud Save with Multi-Device Sync",
      "High-Performance 60FPS Stream Quality"
    ]
  },
  "timestamp": "2026-10-25T19:35:00.000Z"
}
```

#### Response (200 OK — Free Tier Player)
```json
{
  "status": "SUCCESS",
  "subscription": {
    "tier": "Free Explorer",
    "planId": "plan-free",
    "status": "free",
    "isActive": false,
    "currentPeriodEnd": null,
    "renewalDate": null,
    "features": [
      "Access to all Free Catalog Games",
      "Standard Online Multiplayer",
      "Community Text Chat & Avatars",
      "Single Device Progress Save"
    ]
  },
  "timestamp": "2026-10-25T19:35:00.000Z"
}
```

#### Response (200 OK — Expired Subscription)
```json
{
  "status": "SUCCESS",
  "subscription": {
    "tier": "Nexus Pro",
    "planId": "plan-pro-monthly",
    "status": "expired",
    "isActive": false,
    "currentPeriodEnd": "2026-10-01T00:00:00.000Z",
    "renewalDate": "2026-10-01T00:00:00.000Z",
    "features": [...]
  },
  "timestamp": "2026-10-25T19:35:00.000Z"
}
```

---

### 2.3 POST `/api/v1/subscriptions/subscribe`
Upgrades or modifies the authenticated player's membership tier.

- **Authentication:** Required (`nexusplay_session` cookie + `X-CSRF-Token` header).
- **Traceability:** EP08-02, EP08-04 (AC-28.1, AC-30.2)
- **Request Body:**
```json
{
  "planId": "plan-pro-monthly",
  "paymentMethod": "simulated_card"
}
```

#### Staging / Test Sandbox Response (200 OK)
```json
{
  "status": "SUCCESS",
  "message": "Successfully subscribed to Nexus Pro",
  "subscription": {
    "tier": "Nexus Pro",
    "planId": "plan-pro-monthly",
    "status": "active",
    "isActive": true,
    "currentPeriodEnd": "2026-11-24T19:35:00.000Z",
    "renewalDate": "2026-11-24T19:35:00.000Z",
    "features": [...]
  },
  "isSimulated": true,
  "simulationNotice": "Non-production test simulation: No real financial transaction was executed.",
  "timestamp": "2026-10-25T19:35:00.000Z"
}
```

#### Production Guard Response (501 Not Implemented)
```json
{
  "error": "PAYMENT_GATEWAY_NOT_CONFIGURED",
  "message": "Live payment gateway is not configured for production. Subscription upgrades via simulation are strictly prohibited in production environment.",
  "timestamp": "2026-10-25T19:35:00.000Z"
}
```

---

### 2.4 POST `/api/v1/subscriptions/cancel`
Cancels the active subscription and reverts the player's account to the Free Explorer tier.

- **Authentication:** Required (`nexusplay_session` cookie + `X-CSRF-Token` header).
- **Traceability:** EP08-03 (AC-29.3)

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "message": "Subscription cancelled successfully. Player reverted to Free Explorer tier.",
  "subscription": {
    "tier": "Free Explorer",
    "planId": "plan-free",
    "status": "free",
    "isActive": false,
    "currentPeriodEnd": null,
    "renewalDate": null,
    "features": [...]
  },
  "timestamp": "2026-10-25T19:35:00.000Z"
}
```

---

## 3. Entitlement Gating During Game Launch

When a player launches a game via `POST /api/v1/games/:id/launch`:
1. The `gameLaunchService` queries the database for `games.is_premium`.
2. If `is_premium === 1`:
   - Checks player subscription status via `subscriptionService.getSubscription(playerId)`.
   - **Active Subscriber:** Launch approved. Returns HTTP 200 with HMAC-signed `launchTicket` and session ID.
   - **Free Player:** Launch rejected. Returns HTTP 403:
     ```json
     {
       "error": "ENTITLEMENT_REQUIRED",
       "message": "This game requires an active Nexus Pro or Nexus Ultimate subscription.",
       "requiredTier": "Nexus Pro",
       "upgradeUrl": "/subscriptions/plans",
       "timestamp": "2026-10-25T19:35:00.000Z"
     }
     ```
   - **Expired Subscriber:** Launch rejected. Returns HTTP 403:
     ```json
     {
       "error": "ENTITLEMENT_EXPIRED",
       "message": "Your Nexus Pro subscription expired on 2026-10-01T00:00:00.000Z. Please renew to access premium games.",
       "requiredTier": "Nexus Pro",
       "expiredAt": "2026-10-01T00:00:00.000Z",
       "renewalUrl": "/subscriptions/plans",
       "timestamp": "2026-10-25T19:35:00.000Z"
     }
     ```
