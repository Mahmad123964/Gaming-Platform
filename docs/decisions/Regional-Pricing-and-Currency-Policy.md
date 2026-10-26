# NexusPlay Architecture Decision Record — Regional Pricing & Currency Policy

**Document ID:** ADR-0012  
**Status:** ACCEPTED & IMPLEMENTED  
**Date:** 2026-10-26  
**Deciders:** Principal Gaming Platform Architect, Product Manager, Application Security Lead, International Payment Systems Architect  

---

## 1. Context & Business Problem

Prior iterations of NexusPlay assumed uniform global USD pricing ($9.99/mo subscription) across all geographies. In the international gaming industry, uniform USD pricing creates severe purchasing power disparities:
- A $9.99 USD price point in Pakistan (~PKR 2,800) or India (~INR 830) represents an untenable financial barrier for casual digital entertainment, resulting in near-total checkout abandonment.
- Global digital stores (Steam, Epic Games Store, Apple App Store, Google Play) utilize **Purchasing Power Parity (PPP) regional pricing tiers** to optimize volume, conversion, and market penetration in South Asia and emerging markets while sustaining full commercial pricing in Tier-1 Western economies.

Furthermore, client-side pricing models are vulnerable to reverse-engineering, price-parameter tampering, and cross-border currency arbitrage (e.g., VPN users spoofing regional pricing without resident verification).

---

## 2. Decision & Regional Price Bands

NexusPlay establishes an authoritative **Server-Controlled Regional Pricing Architecture** with localized display formatting, tax-inclusive consumer pricing, and rigid anti-tampering guards.

### 2.1 Authorized Regional Price Bands (Per Game Title)

| Country Code | Currency Code | Regional Price Band | NexusPlay Standard Benchmark | Equivalent USD (approx) | Tax Treatment |
|:---:|:---:|:---:|:---:|:---:|:---|
| **PK** | **PKR** | PKR 200 – PKR 300 | **PKR 250** (25,000 minor units) | ~$0.90 USD | 100% Tax-Inclusive |
| **IN** | **INR** | INR 100 – INR 200 | **INR 149** (14,900 minor units) | ~$1.80 USD | GST Inclusive (18%) |
| **US** | **USD** | USD 3.00 – USD 4.00 | **$3.99** (399 minor units) | $3.99 USD | Sales Tax at Checkout |
| **GB** | **GBP** | GBP 2.49 – GBP 3.49 | **£2.99** (299 minor units) | ~$3.85 USD | UK VAT Inclusive (20%) |
| **CA** | **CAD** | CAD 3.99 – CAD 5.49 | **CAD 4.99** (499 minor units) | ~$3.65 USD | Provincial Tax Calculated |
| **EU** (DE/FR/IT/ES/NL/etc.) | **EUR** | EUR 2.99 – EUR 3.99 | **€3.49** (349 minor units) | ~$3.80 USD | EU VAT Inclusive (19-21%) |

### 2.2 Reconciling the INR 149 vs INR 150 Discrepancy

During the Milestone 2.9 source-backed audit, a historical discrepancy was identified between two competing price point definitions for the India (`IN`) regional tier:
- **Round Number Legacy Seed (INR 150 / 15,000 minor units):** Configured in the initial database seed script (`scripts/seed-candidate-games.py`) and schema comments (`schema.sql`).
- **Standard Digital Consumer Tier (INR 149 / 14,900 minor units):** Configured in ADR-0012 and `pricingService.js` default tier matrix to mirror psychological 9-ending price points standard across Indian digital app stores (Google Play India, Steam India, Apple App Store).

**Authoritative Reconciliation Policy:**
1. **Harmonization Standard:** The platform authoritatively adopts **INR 149 (₹149, 14,900 minor units)** as the uniform, standardized benchmark across all SQLite databases (`platform-staging.db`, `platform-development.db`), seed scripts (`seed-candidate-games.py`), schema definitions (`schema.sql`), and automated regression assertions (`test-business-model-and-catalog.js`, `test-purchase-security-and-lockdown.js`).
2. **Display-to-Server Invariant:** The client UI displays the exact server-configured price (`price_display: '₹149'`). The client is strictly prohibited from executing round-off calculations or currency conversions locally.

### 2.3 Provisional Business Settings vs. Legally Verified Tax Treatment

The tax treatment designations indicated in Section 2.1 (e.g., "GST Inclusive (18%)" for India, "UK VAT Inclusive (20%)" for Great Britain, "EU VAT Inclusive" for Europe) are **provisional business model assumptions** established for financial forecasting and gross margin modeling. They do **not** constitute legally verified tax compliance or operational tax registration:

- **Lack of Legal Tax Registration:** NexusPlay has not registered for an Indian Goods and Services Tax Identification Number (GSTIN) or an Online Information Database Access and Retrieval (OIDAR) service entity under the Central Board of Indirect Taxes and Customs (CBIC).
- **Provisional Withholding Assumption:** While the provisional business pricing treats ₹149 as inclusive of an 18% GST liability (~₹22.73 tax component), NexusPlay does not currently withhold, remit, or invoice statutory tax to any sovereign revenue authority.
- **Mandatory Pre-Launch Requirement:** Prior to authorizing Sprint 12 live financial transactions, NexusPlay must engage qualified international tax counsel to register appropriate cross-border tax entities (or integrate an authorized Merchant of Record such as Stripe, Paddle, or FastSpring to fulfill statutory tax remittance obligations).

---

## 3. Country & Currency Resolution Hierarchy

To maintain consistent pricing across sessions, the system resolves a visitor's billing country through the following authoritative sequence:

1. **User Profile Preference:** Authenticated `players.country` (set during global registration or updated via `PATCH /api/v1/auth/country`).
2. **Reverse Proxy Geolocation Header:** Edge header (e.g., Cloudflare `cf-ipcountry`, AWS CloudFront `CloudFront-Viewer-Country`, or NGINX `X-Country-Code`).
3. **Explicit API Country Parameter:** Query parameter `?country=XX` on public endpoints (validated against ISO 3166-1 alpha-2 whitelist).
4. **Default Safe Fallback:** `US` with default currency `USD`.

> [!NOTE]
> **Privacy & Residence Distinction:** A player's self-selected country preference (e.g., selecting `IN` or `PK` during registration) represents an *unverified billing currency preference*, not a verified physical residency or citizenship document. Personally Identifiable Information (PII) is intentionally restricted to email, display name, and ISO country code.

---

## 4. Security & Anti-Tampering Architecture

The platform enforces zero client trust regarding pricing, discounts, and currency calculations:

```
[Client Checkout Request] 
       │ 
       ▼
[Server requireAuth Middleware] ──► Validates cryptographic session & CSRF binding
       │
       ▼
[PricingService.purchaseGame]
       │
       ├─► 1. Lookup Authoritative Price for (game_id, player_country) in SQLite
       │
       ├─► 2. Validate Currency: submitted == authoritative.currency?
       │        NO  ──► REJECT HTTP 400 (CURRENCY_MISMATCH_DETECTED)
       │        YES
       │
       ├─► 3. Validate Price: submitted == authoritative.priceMinor?
       │        NO  ──► REJECT HTTP 400 (PRICE_TAMPERING_DETECTED)
       │        YES
       │
       ├─► 4. Production Lockdown Guard: (NODE_ENV === 'prod' || APP_ENV === 'prod' || env === 'prod')?
       │        YES ──► REJECT HTTP 501 (PAYMENT_GATEWAY_NOT_CONFIGURED)
       │        NO
       │
       └─► 5. Atomic Entitlement Grant in SQLite (game_entitlements)
```

### Security Invariants & Lockdown Rules

1. **Client Offered Price Validation:** If the client provides a `clientPriceMinor` or `offeredPriceMinor` property, it must match the server's database-backed regional price down to the single integer minor unit. Any attempt to submit arbitrary prices (e.g., 1 cent or negative values) is immediately blocked with HTTP 400 `PRICE_TAMPERING_DETECTED`.
2. **Currency-Country Integrity:** A player transacting under Pakistan (`PK`) cannot submit `USD` or `EUR` at PKR numerical rates. Any mismatch triggers HTTP 400 `CURRENCY_MISMATCH_DETECTED`.
3. **Production Simulation Guard (Fail-Secure):** In staging and development environments, purchases execute against simulated escrow with explicit receipt metadata (`isSimulated: true`). In the `production` environment, simulated purchases are strictly blocked with HTTP 501 `PAYMENT_GATEWAY_NOT_CONFIGURED`.
4. **Conflicting Environment Handling:** If `NODE_ENV === 'production'` while `APP_ENV === 'development'` (or vice-versa), the platform fails secure: any production indicator enforces immediate HTTP 501 lockdown.
5. **Header Spoofing Defense:** Client headers (e.g., `X-Environment: development`, `X-Admin-Bypass: true`, `X-Forwarded-For: 127.0.0.1`) are strictly untrusted and cannot downgrade or bypass production lockdown.
6. **Unauthorized Account Modifications:** 
   - Game purchases bind strictly to `req.player.id` from the verified JWT session; any `playerId` supplied in the request body is ignored.
   - Refund requests on other player accounts by non-administrators are rejected with HTTP 403 `UNAUTHORIZED_ACCOUNT_CHANGE`.
7. **Immediate Refund Cutoff:** Any processed refund immediately transitions `game_entitlements.status = 'REFUNDED'`, cutting off launch tickets via `gameLaunchService` on the next execution cycle (HTTP 403 `ENTITLEMENT_REQUIRED`).

---

## 5. Verification & Compliance Record

- **Test Suites:**
  - `scripts/test-business-model-and-catalog.js` (34/34 checks passed, 100%).
  - `scripts/test-purchase-security-and-lockdown.js` (20/20 checks passed, 100%).
  - `scripts/run-all-regression-sprint11.js` (494/494 checks passed, 100%).
- **Automated Verification:** 100% passed across all 590 platform checks.
- **Audit Logging:** Every pricing query, simulated purchase, and refund event produces an immutable audit record in SQLite table `audit_events`.
