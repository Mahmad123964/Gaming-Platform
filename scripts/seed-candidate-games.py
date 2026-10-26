"""
Seed Candidate Games and Regional Pricing into platform-staging.db
Supports Business Model Correction:
- Free Games (2048-open, Obsidian Chess, etc.)
- Premium Games (Neon Horizon, Chrono Tactics) with regional prices (PK, IN, US, GB, CA, EU)
- External Store References (Subway Surfers, Temple Run, WCC2, GTA V, COD Warzone)
- Pending License Review Games (Cosmic Odyssey)
"""
import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'server', 'data', 'platform-staging.db')

def seed():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Categories check
    cat_row = cursor.execute("SELECT id FROM game_categories WHERE slug = 'action' LIMIT 1").fetchone()
    cat_action = cat_row[0] if cat_row else 'cat-001'
    cat_arcade = cursor.execute("SELECT id FROM game_categories WHERE slug = 'arcade' LIMIT 1").fetchone()
    cat_arcade = cat_arcade[0] if cat_arcade else cat_action
    cat_puzzle = cursor.execute("SELECT id FROM game_categories WHERE slug = 'puzzle' LIMIT 1").fetchone()
    cat_puzzle = cat_puzzle[0] if cat_puzzle else cat_action
    cat_strategy = cursor.execute("SELECT id FROM game_categories WHERE slug = 'strategy' LIMIT 1").fetchone()
    cat_strategy = cat_strategy[0] if cat_strategy else cat_action
    cat_sports = cursor.execute("SELECT id FROM game_categories WHERE slug = 'sports' LIMIT 1").fetchone()
    if not cat_sports:
        cat_sports = 'cat-sports'
        cursor.execute("INSERT OR IGNORE INTO game_categories (id, name, slug, description) VALUES (?, 'Sports', 'sports', 'Competitive athletics and sports simulations')", (cat_sports,))
    else:
        cat_sports = cat_sports[0]

    candidate_games = [
        {
            "id": "game-2048",
            "title": "2048 Classic",
            "slug": "2048-classic",
            "description": "Join the numbers and get to the 2048 tile in this legendary open-source puzzle game. Free to play for everyone.",
            "category_id": cat_puzzle,
            "launch_url": "/games/2048/index.html",
            "is_published": 1,
            "is_premium": 0,
            "commercial_model": "FREE",
            "external_store_url": None,
            "external_store_name": None,
            "publisher": "Gabriele Cirulli",
            "developer": "Gabriele Cirulli (Open Source MIT)",
            "content_rating": "Everyone",
            "supported_platforms": ["browser", "mobile"],
            "region_restrictions": [],
            "licensing": {
                "status": "PUBLISHED",
                "rights_type": "OPEN_SOURCE_MIT",
                "permitted_channels": ["browser", "mobile_web"],
                "notes": "MIT License permits free hosting and redistribution with attribution."
            }
        },
        {
            "id": "game-subway-surfers",
            "title": "Subway Surfers",
            "slug": "subway-surfers",
            "description": "Dash as fast as you can through the subway tracks! Dodge oncoming trains and barriers. Official authorized web distribution on Poki.",
            "category_id": cat_arcade,
            "launch_url": "/games/external-redirect/subway-surfers",
            "is_published": 1,
            "is_premium": 0,
            "commercial_model": "EXTERNAL_STORE",
            "external_store_url": "https://poki.com/en/g/subway-surfers",
            "external_store_name": "Poki Official Distribution",
            "publisher": "SYBO Games",
            "developer": "SYBO Games / Kiloo",
            "content_rating": "Everyone 10+",
            "supported_platforms": ["browser", "mobile", "android", "ios"],
            "region_restrictions": [],
            "licensing": {
                "status": "INTEGRATION_READY",
                "rights_type": "EXTERNAL_STORE_REFERRAL",
                "permitted_channels": ["external_link"],
                "notes": "External store reference to official Poki web build. NexusPlay does not host or charge for this title."
            }
        },
        {
            "id": "game-temple-run",
            "title": "Temple Run",
            "slug": "temple-run",
            "description": "Test your reflexes as you race down ancient temple walls and along sheer cliffs. Download from official mobile app stores.",
            "category_id": cat_arcade,
            "launch_url": "/games/external-redirect/temple-run",
            "is_published": 1,
            "is_premium": 0,
            "commercial_model": "EXTERNAL_STORE",
            "external_store_url": "https://play.google.com/store/apps/details?id=com.imangi.templerun",
            "external_store_name": "Google Play Store",
            "publisher": "Imangi Studios",
            "developer": "Imangi Studios",
            "content_rating": "Everyone 9+",
            "supported_platforms": ["android", "ios"],
            "region_restrictions": [],
            "licensing": {
                "status": "INTEGRATION_READY",
                "rights_type": "EXTERNAL_STORE_REFERRAL",
                "permitted_channels": ["external_link"],
                "notes": "Mobile-only proprietary IP. External store referral to Google Play."
            }
        },
        {
            "id": "game-wcc2",
            "title": "World Cricket Championship 2",
            "slug": "world-cricket-championship-2",
            "description": "The next generation in mobile cricket gaming with 3D graphics, realistic physics, and 150+ batting animations.",
            "category_id": cat_sports,
            "launch_url": "/games/external-redirect/wcc2",
            "is_published": 1,
            "is_premium": 0,
            "commercial_model": "EXTERNAL_STORE",
            "external_store_url": "https://play.google.com/store/apps/details?id=com.nextwave.wcc2",
            "external_store_name": "Google Play Store",
            "publisher": "Nextwave Multimedia",
            "developer": "Nextwave Multimedia",
            "content_rating": "Everyone",
            "supported_platforms": ["android", "ios"],
            "region_restrictions": [],
            "licensing": {
                "status": "INTEGRATION_READY",
                "rights_type": "EXTERNAL_STORE_REFERRAL",
                "permitted_channels": ["external_link"],
                "notes": "Official store referral to Google Play. Mobile application."
            }
        },
        {
            "id": "game-gta-v",
            "title": "Grand Theft Auto V",
            "slug": "grand-theft-auto-v",
            "description": "Experience Rockstar Games' critically acclaimed open world. Available on PC via Steam and Epic Games Store.",
            "category_id": cat_action,
            "launch_url": "/games/external-redirect/gta-v",
            "is_published": 1,
            "is_premium": 0,
            "commercial_model": "EXTERNAL_STORE",
            "external_store_url": "https://store.steampowered.com/app/271590/Grand_Theft_Auto_V/",
            "external_store_name": "Steam Store",
            "publisher": "Rockstar Games",
            "developer": "Rockstar North",
            "content_rating": "Mature 17+",
            "supported_platforms": ["desktop", "windows"],
            "region_restrictions": [],
            "licensing": {
                "status": "INTEGRATION_READY",
                "rights_type": "EXTERNAL_STORE_REFERRAL",
                "permitted_channels": ["external_link"],
                "notes": "Direct link to official Steam Store. NexusPlay does not host, stream, or sell GTA V."
            }
        },
        {
            "id": "game-cod-warzone",
            "title": "Call of Duty: Warzone",
            "slug": "call-of-duty-warzone",
            "description": "Massive free-to-play battle royale combat experience from Activision. Available on Battle.net for Windows PC.",
            "category_id": cat_action,
            "launch_url": "/games/external-redirect/cod-warzone",
            "is_published": 1,
            "is_premium": 0,
            "commercial_model": "EXTERNAL_STORE",
            "external_store_url": "https://us.shop.battle.net/en-us/product/call-of-duty-warzone",
            "external_store_name": "Battle.net Store",
            "publisher": "Activision",
            "developer": "Infinity Ward / Raven Software",
            "content_rating": "Mature 17+",
            "supported_platforms": ["desktop", "windows"],
            "region_restrictions": [],
            "licensing": {
                "status": "INTEGRATION_READY",
                "rights_type": "EXTERNAL_STORE_REFERRAL",
                "permitted_channels": ["external_link"],
                "notes": "Direct link to official Battle.net client distribution. No internal hosting permitted."
            }
        },
        {
            "id": "game-cosmic-odyssey",
            "title": "Cosmic Odyssey",
            "slug": "cosmic-odyssey",
            "description": "Upcoming deep-space exploration and planetary colonisation simulation. Commercial distribution rights under legal review.",
            "category_id": cat_strategy,
            "launch_url": "/games/cosmic-odyssey/index.html",
            "is_published": 0,
            "is_premium": 1,
            "commercial_model": "UNAVAILABLE_PENDING_LICENSE",
            "external_store_url": None,
            "external_store_name": None,
            "publisher": "Nova Star Interactive",
            "developer": "Nova Star Studios",
            "content_rating": "Teen",
            "supported_platforms": ["browser", "desktop"],
            "region_restrictions": [],
            "licensing": {
                "status": "LICENSE_REVIEW_REQUIRED",
                "rights_type": "COMMERCIAL_EVALUATION",
                "permitted_channels": [],
                "notes": "Distribution agreement under legal compliance review. Game unpublished until contract executed."
            }
        }
    ]

    for g in candidate_games:
        # Check if game exists
        existing = cursor.execute("SELECT id FROM games WHERE id = ?", (g["id"],)).fetchone()
        if existing:
            cursor.execute("""
                UPDATE games SET
                    title = ?, slug = ?, description = ?, category_id = ?, launch_url = ?,
                    is_published = ?, is_premium = ?, commercial_model = ?,
                    external_store_url = ?, external_store_name = ?,
                    publisher = ?, developer = ?, content_rating = ?,
                    supported_platforms_json = ?, region_restrictions_json = ?
                WHERE id = ?
            """, (
                g["title"], g["slug"], g["description"], g["category_id"], g["launch_url"],
                g["is_published"], g["is_premium"], g["commercial_model"],
                g["external_store_url"], g["external_store_name"],
                g["publisher"], g["developer"], g["content_rating"],
                json.dumps(g["supported_platforms"]), json.dumps(g["region_restrictions"]),
                g["id"]
            ))
        else:
            cursor.execute("""
                INSERT INTO games (
                    id, title, slug, description, category_id, launch_url,
                    is_published, is_premium, min_players, max_players, supports_bots,
                    commercial_model, external_store_url, external_store_name,
                    publisher, developer, content_rating,
                    supported_platforms_json, region_restrictions_json,
                    default_currency, default_price_minor,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                g["id"], g["title"], g["slug"], g["description"], g["category_id"], g["launch_url"],
                g["is_published"], g["is_premium"], g["commercial_model"],
                g["external_store_url"], g["external_store_name"],
                g["publisher"], g["developer"], g["content_rating"],
                json.dumps(g["supported_platforms"]), json.dumps(g["region_restrictions"])
            ))

        # Update or insert licensing record
        lic = g["licensing"]
        lic_existing = cursor.execute("SELECT id FROM licensing_approvals WHERE game_id = ?", (g["id"],)).fetchone()
        if lic_existing:
            cursor.execute("""
                UPDATE licensing_approvals SET
                    status = ?, notes = ?, rights_type = ?, permitted_channels_json = ?
                WHERE game_id = ?
            """, (lic["status"], lic["notes"], lic["rights_type"], json.dumps(lic["permitted_channels"]), g["id"]))
        else:
            lic_id = "lic-" + g["id"][5:]
            cursor.execute("""
                INSERT INTO licensing_approvals (
                    id, game_id, status, approved_by, approved_at, notes, rights_type, permitted_channels_json
                ) VALUES (?, ?, ?, 'LegalCompliance', CURRENT_TIMESTAMP, ?, ?, ?)
            """, (lic_id, g["id"], lic["status"], lic["notes"], lic["rights_type"], json.dumps(lic["permitted_channels"])))

    # 2. Seed Regional Pricing for Premium Games (game-004, game-005)
    premium_games = ["game-004", "game-005"]
    regional_matrix = [
        {"country": "PK", "currency": "PKR", "minor": 25000, "display": "PKR 250", "min": 20000},
        {"country": "IN", "currency": "INR", "minor": 15000, "display": "₹150", "min": 10000},
        {"country": "US", "currency": "USD", "minor": 399, "display": "$3.99", "min": 299},
        {"country": "GB", "currency": "GBP", "minor": 299, "display": "£2.99", "min": 249},
        {"country": "CA", "currency": "CAD", "minor": 499, "display": "CAD 4.99", "min": 399},
        {"country": "DE", "currency": "EUR", "minor": 349, "display": "€3.49", "min": 299},
        {"country": "FR", "currency": "EUR", "minor": 349, "display": "€3.49", "min": 299}
    ]

    for p_id in premium_games:
        # Ensure commercial_model is PAID_ONE_TIME
        cursor.execute("UPDATE games SET commercial_model = 'PAID_ONE_TIME', default_currency = 'USD', default_price_minor = 399 WHERE id = ?", (p_id,))
        for r in regional_matrix:
            price_id = f"price-{p_id}-{r['country'].lower()}"
            cursor.execute("""
                INSERT OR REPLACE INTO game_regional_prices (
                    id, game_id, country_code, currency_code, price_minor, price_display,
                    effective_from, tax_inclusive, publisher_min_minor, promotional_discount_percent, refund_period_days
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, ?, 0, 14)
            """, (price_id, p_id, r["country"], r["currency"], r["minor"], r["display"], r["min"]))

    conn.commit()
    conn.close()
    print("Candidate games and regional pricing seeded successfully into platform-staging.db")

if __name__ == '__main__':
    seed()
