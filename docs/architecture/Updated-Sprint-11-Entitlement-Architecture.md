# NexusPlay — Updated Sprint 11 Entitlement & Ownership Architecture

**Document Version:** 2.0  
**Status:** Authoritative Architectural Specification  
**Architecture Domain:** Player Entitlements, Game Ownership & Subscription Decoupling  
**Effective Date:** 2026-10-26  

---

## 1. Architectural Correction & Separation of Concerns

During Sprint 11 development, the platform implemented subscription-based access gating (`EP08: Premium Access & Entitlements`). Under the original assumption, any title marked `is_premium = 1` was accessible exclusively if the authenticated user possessed an active recurring subscription record in the `subscriptions` table.

Following the Product Owner's fundamental clarification—**"NexusPlay is a free-first global gaming platform, not a mandatory subscription service"**—the platform's entitlement architecture was restructured into two decoupled subsystems:

1. **Perpetual Game Ownership Engine (`game_entitlements`):** Direct one-time game purchases, publisher promotional grants, and bundle ownership. Users own the license permanently without ongoing recurring fees.
2. **Optional Membership Perks Subsystem (`subscriptions`):** Retained for optional value-added services (Nexus Pro / Nexus VIP) providing cosmetic flares, tournament entry fee waivers, cloud save backups, and access to VIP subscription bundles.

```
                              [Game Launch Request]
                                        │
                                        ▼
                         What is game.commercial_model?
                        /                              \
       [FREE / FREE_TO_PLAY]                     [PAID_ONE_TIME]
                │                                       │
                ▼                                       ▼
         [DIRECT LAUNCH]                 Check game_entitlements for player
      (Zero Purchase / Zero Sub)        (status = 'ACTIVE', game_id = ?)
                                               /                 \
                                            FOUND             NOT FOUND
                                             /                     \
                                      [DIRECT LAUNCH]         Does player have active
                                      (Owned License)        VIP subscription in 'subscriptions'?
                                                                   /                  \
                                                                 YES                   NO
                                                                 /                      \
                                                          [DIRECT LAUNCH]          [HTTP 403]
                                                         (VIP Bundle Perk)     (ENTITLEMENT_REQUIRED)
```

---

## 2. Database Schema: Unified Entitlements

The entitlement model is physically implemented via single-host SQLite with WAL mode:

```sql
CREATE TABLE IF NOT EXISTS game_entitlements (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    entitlement_type TEXT NOT NULL, -- 'OWNED_GAME_LICENSE', 'BUNDLE_INCLUSION', 'PROMOTIONAL_GRANT'
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVOKED', 'REFUNDED', 'EXPIRED'
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- NULL for perpetual owned licenses
    payment_ref TEXT,
    purchase_price_minor INTEGER,
    currency_code TEXT,
    billing_country TEXT,
    source TEXT NOT NULL DEFAULT 'PURCHASE_VERIFIED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_entitlements_player ON game_entitlements(player_id, game_id, status);
```

### Entitlement Types

- **`OWNED_GAME_LICENSE`**: Standard perpetual one-time purchase. Grants permanent access for the life of the account; `expires_at` is `NULL`.
- **`BUNDLE_INCLUSION`**: Granted as part of a seasonal game pass or multi-game package.
- **`PROMOTIONAL_GRANT`**: Granted by platform administrators or publisher marketing codes.

---

## 3. Launch Gating Resolution Pipeline

In `server/src/modules/gameLaunch/gameLaunchService.js`, `validateLaunchEligibility()` executes the updated validation sequence:

```javascript
// 1. Direct Launch for Free Titles
if (game.commercial_model === 'FREE' || game.commercial_model === 'FREE_TO_PLAY_WITH_PURCHASES') {
  return { isEligible: true, accessType: 'FREE' };
}

// 2. External Store Redirection
if (game.commercial_model === 'EXTERNAL_STORE') {
  const err = new Error(`External Store Title: "${game.title}" is hosted externally.`);
  err.status = 422;
  err.code = 'EXTERNAL_STORE_REDIRECT';
  err.details = { externalStoreUrl: game.external_store_url };
  throw err;
}

// 3. Unavailable / In Review Titles
if (game.commercial_model === 'UNAVAILABLE_PENDING_LICENSE') {
  const err = new Error(`Launch Blocked: "${game.title}" is pending licensing clearance.`);
  err.status = 422;
  err.code = 'GAME_UNAVAILABLE_PENDING_LICENSE';
  throw err;
}

// 4. Paid One-Time Titles: Check Direct Ownership First
const pricingService = getPricingService();
const hasDirectEntitlement = pricingService.hasGameEntitlement(user.id, game.id);
if (hasDirectEntitlement) {
  return { isEligible: true, accessType: 'OWNED_GAME_LICENSE' };
}

// 5. Backward-Compatible VIP Subscription Fallback
const subscription = this.db.get(
  "SELECT id, plan_id, status, current_period_end FROM subscriptions WHERE player_id = ? AND status = 'active'",
  [user.id]
);
if (subscription) {
  return { isEligible: true, accessType: 'SUBSCRIPTION_BUNDLE', planId: subscription.plan_id };
}

// 6. Access Denied: Unentitled Player
const err = new Error(`Launch Denied: "${game.title}" requires purchase or entitlement.`);
err.status = 403;
err.code = 'ENTITLEMENT_REQUIRED';
throw err;
```

---

## 4. Entitlement Lifecycle Management

### 4.1 Purchase Grant (`POST /api/v1/store/purchase`)
- Server calculates authoritative regional price for buyer's country.
- Verifies absence of client price tampering and currency mismatch.
- Verifies production lockdown guard (HTTP 501 in production).
- Inserts `game_entitlements` row with `OWNED_GAME_LICENSE` and status `ACTIVE`.
- Emits immutable audit log entry in `audit_events`.

### 4.2 Query Player Entitlements (`GET /api/v1/store/entitlements/me`)
- Returns array of all active game entitlements owned by the authenticated player.
- Includes game title, slug, commercial model, and grant timestamp.

### 4.3 Refund and Revocation (`POST /api/v1/store/refund`)
- Validates entitlement existence and active status.
- Atomically updates `status = 'REFUNDED'`.
- Next launch attempt for that title immediately returns HTTP 403 `ENTITLEMENT_REQUIRED`.
- Records audit event `GAME_ENTITLEMENT_REFUNDED`.

---

## 5. Backward Compatibility & Test Suite Verification

The decoupled architecture maintains 100% backward compatibility with Sprint 11 acceptance criteria:
- **Sprint 11 Test Suite (`scripts/test-sprint11-premium-access.js`):** All 31 checks continue to pass without regression.
- **Cross-Sprint Journeys (`scripts/test-cross-sprint-journeys.js`):** Journey E verifies that subscription upgrades seamlessly grant premium access while direct purchases operate concurrently.
- **Master Regression Suite (Sprints 00–11):** 494 / 494 checks passed (100%).
- **Business Model Suite (`scripts/test-business-model-and-catalog.js`):** 34 / 34 checks passed (100%).
