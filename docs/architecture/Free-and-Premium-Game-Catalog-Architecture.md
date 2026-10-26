# NexusPlay — Free-First Game Catalog & Commercial Architecture

**Document Version:** 1.0  
**Status:** Authoritative Architectural Specification  
**Architecture Domain:** Game Publishing, Catalog Discovery & Commercial Classification  
**Effective Date:** 2026-10-26  

---

## 1. Architectural Philosophy & Fundamental Directive

NexusPlay is fundamentally architected as a **free-first global online gaming platform**, not a mandatory subscription service. The platform guarantees:
1. **Unconditional Free Access:** Any visitor or registered user can discover and play genuine free-to-play games (`FREE` and `FREE_TO_PLAY_WITH_PURCHASES`) without ever providing payment information or maintaining a recurring subscription.
2. **Selective Commercial Monetization:** Premium games (`PAID_ONE_TIME`) can be purchased as perpetual owned licenses with regionalized local currency pricing, without requiring a recurring monthly fee.
3. **Optional Membership Perks:** Subscriptions (`SUBSCRIPTION_OPTIONAL` / Nexus Pro / Nexus VIP) exist solely as value-added convenience and cosmetic tiers (cloud save sync, VIP badges, priority multiplayer matchmaking, game bundles), never as a mandatory barrier to accessing the platform.
4. **Transparent External Sourcing:** Proprietary, closed-platform, or non-browser games (e.g., AAA console/PC games like *Grand Theft Auto V* or mobile titles like *Subway Surfers* and *Temple Run*) are clearly attributed and linked to their official distribution channels (`EXTERNAL_STORE`) with full consumer disclosure. NexusPlay does not deceptively host, embed, or charge for third-party games without explicit legal distribution rights.

---

## 2. Commercial Distribution Models

Every title in the NexusPlay catalog is classified under exactly one authoritative `commercial_model`:

| Commercial Model Enum | Access Requirement | Monetization Mechanism | Hosting & Runtime Location | Action State |
|:---|:---|:---|:---|:---|
| `FREE` | None (zero login or free player account) | 100% Free / Ad-Supported / Community Open Source | Native NexusPlay HTML5 Web Container (`/games/:slug/index.html`) | `PLAY_NOW` |
| `FREE_TO_PLAY_WITH_PURCHASES` | Free player account | Free base game; optional cosmetic/in-game microtransactions | Native NexusPlay HTML5 Web Container | `PLAY_NOW` |
| `PAID_ONE_TIME` | Direct game purchase OR active VIP subscription bundle | One-time regionalized purchase (`game_entitlements`) | Native NexusPlay HTML5 Web Container | `PURCHASE` (or `PLAY_NOW` once owned) |
| `SUBSCRIPTION_OPTIONAL` | Free player account (optional upgrade) | Base game is free; VIP subscribers receive premium cosmetics/tournaments | Native NexusPlay HTML5 Web Container | `PLAY_NOW` |
| `EXTERNAL_STORE` | External platform account (Steam, Epic, Google Play, Poki) | Purchased or played on official publisher platform; NexusPlay earns zero fees / referral only | External official URL (`external_store_url`) | `OPEN_OFFICIAL_STORE` |
| `UNAVAILABLE_PENDING_LICENSE` | Blocked until licensing review completes | N/A (Internal staging preview only) | Launch strictly prohibited | `COMING_SOON` |

---

## 3. Database Schema & Data Model

The catalog schema in SQLite has been enhanced non-destructively to support multi-platform distribution and commercial metadata:

```sql
-- Core games table enhancements
ALTER TABLE games ADD COLUMN commercial_model TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE games ADD COLUMN external_store_url TEXT;
ALTER TABLE games ADD COLUMN external_store_name TEXT;
ALTER TABLE games ADD COLUMN publisher TEXT;
ALTER TABLE games ADD COLUMN developer TEXT;
ALTER TABLE games ADD COLUMN content_rating TEXT DEFAULT 'Everyone';
ALTER TABLE games ADD COLUMN supported_platforms_json TEXT DEFAULT '["browser"]';
ALTER TABLE games ADD COLUMN region_restrictions_json TEXT DEFAULT '[]';
ALTER TABLE games ADD COLUMN default_currency TEXT DEFAULT 'USD';
ALTER TABLE games ADD COLUMN default_price_minor INTEGER DEFAULT 0;

-- Regional pricing table
CREATE TABLE IF NOT EXISTS game_regional_prices (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    price_minor INTEGER NOT NULL,
    price_display TEXT NOT NULL,
    publisher_min_minor INTEGER NOT NULL DEFAULT 0,
    tax_inclusive INTEGER NOT NULL DEFAULT 1,
    promotional_discount_percent INTEGER NOT NULL DEFAULT 0,
    refund_period_days INTEGER NOT NULL DEFAULT 14,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, country_code)
);
CREATE INDEX IF NOT EXISTS idx_game_regional_prices_lookup ON game_regional_prices(game_id, country_code);

-- User game entitlements (One-Time Ownership)
CREATE TABLE IF NOT EXISTS game_entitlements (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    entitlement_type TEXT NOT NULL, -- 'OWNED_GAME_LICENSE', 'BUNDLE_INCLUSION', 'PROMOTIONAL_GRANT'
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVOKED', 'REFUNDED'
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
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

---

## 4. Authoritative Action State Engine

When `GET /api/v1/catalog/games` or `GET /api/v1/catalog/games/:idOrSlug` is called, the server dynamically calculates the client's `actionState` based on contextual data (player entitlement ownership, visitor country, and commercial model):

### Action State Enumeration & Behavior

1. **`PLAY_NOW`**:
   - Triggers runtime session allocation via `POST /api/v1/games/:slug/launch`.
   - Generates cryptographically signed launch ticket (`lt_...`).
   - Renders HTML5 game in secure iframe sandbox.
2. **`PURCHASE`**:
   - Displays localized regional price pill (e.g., `PKR 250`, `₹150`, `$3.99`, `£2.99`).
   - Opens Purchase Checkout modal with anti-tampering verification.
   - Grants perpetual `OWNED_GAME_LICENSE` entitlement in SQLite.
3. **`OPEN_OFFICIAL_STORE`**:
   - Displays official store attribution pill (e.g., `Poki Official Distribution`, `Google Play Store`, `Steam`).
   - Provides outbound button with `target="_blank"` and `rel="noopener noreferrer"`.
   - If an internal API launch is attempted, server rejects with HTTP 422 `EXTERNAL_STORE_REDIRECT` specifying safe external URL.
4. **`COMING_SOON`**:
   - Displayed for titles pending licensing approval (`LICENSE_REVIEW_REQUIRED`, `PERMISSION_REQUESTED`).
   - Button is disabled with informational status banner.
5. **`NOT_AVAILABLE_IN_YOUR_REGION`**:
   - Displayed when the user's detected or preference country matches `region_restrictions_json`.
   - Launch and purchase are strictly blocked (HTTP 403 `GEO_RESTRICTED`).

---

## 5. API Endpoints & Query Parameters

### 5.1 Browse Catalog Games (`GET /api/v1/catalog/games`)
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 12, max: 50)
  - `q` (string, substring search on title)
  - `category` (string, category slug or id)
  - `commercialModel` (enum: `all`, `FREE`, `PAID_ONE_TIME`, `EXTERNAL_STORE`, etc.)
  - `platform` (enum: `browser`, `mobile`, `desktop`)
  - `country` (string, ISO 3166-1 alpha-2, defaults to user profile or 'US')
  - `sort` (enum: `title:asc`, `title:desc`, `created_at:desc`, `players:desc`)
- **Licensing Gate:** Public browse results strictly filter `l.status IN ('approved', 'LICENSE_APPROVED', 'PUBLISHED', 'INTEGRATION_READY')`. Unapproved drafts and unreviewed titles are unconditionally excluded.

### 5.2 Game Details (`GET /api/v1/catalog/games/:idOrSlug`)
- Returns rich metadata including:
  - `commercialModel`, `actionState`
  - `externalStoreUrl`, `externalStoreName`
  - `publisher`, `developer`, `contentRating`, `supportedPlatforms`
  - Localized `pricing` object with `currency`, `priceMinor`, `priceDisplay`, `isFree`, `isRestricted`
  - `isOwned` boolean based on active `game_entitlements`

---

## 6. Frontend UI Components

1. **`GameCard.tsx` (`client/src/components/catalog/GameCard.tsx`):**
   - Renders responsive commercial badges:
     - Free: Green glass pill `Free to Play`
     - Paid: Obsidian purple pill `Buy ($3.99 / PKR 250)`
     - External Store: Blue pill `Official Store ↗`
     - Coming Soon: Amber pill `Coming Soon`
2. **`GameDetailsModal.tsx` (`client/src/components/catalog/GameDetailsModal.tsx`):**
   - Displays publisher and developer attribution credits.
   - Renders safe external store disclaimer banner explaining that the title is hosted externally on official platforms.
   - Contextual primary CTA: `Play Now`, `Purchase Game`, `Open Official Store ↗`, or disabled `Coming Soon`.
3. **`AuthModal.tsx` (`client/src/components/AuthModal.tsx`):**
   - Registration includes country selector (defaults to detected or user choice) to immediately map regional catalog pricing upon account creation.
