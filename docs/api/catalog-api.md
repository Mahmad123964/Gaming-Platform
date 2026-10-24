# NexusPlay — Game Catalog & Discovery API Specification

**Service:** Game Discovery Engine (`GameCatalogService`)  
**Sprint:** 02 (Game Catalog & Discovery)  
**Specification Version:** 1.0.0  
**Status:** Approved & Implemented  
**Date:** October 24, 2026  
**Base URL:** `/api/v1/catalog`  
**UML Model Traceability:** `GameCatalogService`, `Game`, `GameCategory` (`online_gaming_platform_architecture.docx`)  
**Backlog Stories:** `EP02-01`, `EP02-02`, `EP02-03`, `EP02-04`  
**Acceptance Criteria:** `AC-5.1` through `AC-8.3`

---

## 1. Overview & Architectural Principles

The Game Catalog & Discovery API provides unauthenticated visitors and authenticated players with high-performance discoverability of authorized published games across the NexusPlay platform.

### Core Architectural Rules:
1. **Unpublished Game Exclusion (AC-5.2, AC-6.3, AC-8.3):**
   - The catalog service enforces `g.is_published = 1` unconditionally across all public queries.
   - Unpublished titles (e.g. prototypes, games undergoing QA review or licensing approvals) are strictly omitted from browsing listings and search results.
   - Direct requests for unpublished games via ID or slug return `HTTP 404 Not Found` (`"Game not found or unavailable"`), preventing unreleased content leakages.
2. **Wildcard & SQL Injection Defense (AC-6.1):**
   - All search queries are executed via prepared SQL parameters (`DatabaseSync.prepare()`).
   - LIKE pattern wildcards (`%`, `_`, `\`) are escaped (`sanitizeLikeQuery()`) prior to evaluation, preventing pattern-matching injection.
3. **Safe Parameter Clamping:**
   - Pagination inputs are bounded safely: `page` is clamped to `>= 1`; `limit` is clamped to `1 <= limit <= 50` (default: 12).
4. **Normalized DTO Contracts:**
   - Game entities return structured metadata contracts including category details, player capacity, bot support, and access requirements (Free to Play vs Obsidian VIP).

---

## 2. API Endpoints

### 2.1. Browse Published Games

```http
GET /api/v1/catalog/games
```

Retrieves a paginated list of published games matching optional search, category, and sorting filters.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `page` | Integer | No | `1` | 1-indexed page number (clamped to `>= 1`). |
| `limit` | Integer | No | `12` | Items per page (clamped to `1 <= limit <= 50`). |
| `q` / `search` | String | No | `""` | Search query for case-insensitive substring match on game title (`AC-6.1`). |
| `category` | String | No | `""` | Filter by category slug or category ID (`AC-7.1`). Value `"all"` returns all games. |
| `sort` | String | No | `"title:asc"` | Sort order: `title:asc`, `title:desc`, `created_at:desc`, `created_at:asc`, `players:desc`. |

#### Response — 200 OK

```json
{
  "games": [
    {
      "id": "game-001",
      "title": "Cyber Invaders",
      "slug": "cyber-invaders",
      "description": "Defend the neon mainframe against descending waves of cybernetic intruders in this high-intensity retro arcade shooter.",
      "launchUrl": "/games/cyber-invaders/index.html",
      "isPublished": true,
      "isPremium": false,
      "minPlayers": 1,
      "maxPlayers": 1,
      "supportsBots": false,
      "category": {
        "id": "cat-arcade",
        "name": "Arcade",
        "slug": "arcade"
      },
      "mode": {
        "type": "single_player",
        "label": "Single Player",
        "supportsBots": false
      },
      "access": {
        "tier": "free",
        "label": "Free to Play",
        "requiresSubscription": false
      },
      "createdAt": "2026-10-24 16:24:00",
      "updatedAt": "2026-10-24 16:24:00"
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 12,
    "totalPages": 1
  },
  "timestamp": "2026-10-24T16:34:39.260Z"
}
```

#### Empty State Response (AC-5.3, AC-6.2, AC-7.2)
When no games match the search term or category, or when the database has 0 published games:

```json
{
  "games": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 12,
    "totalPages": 1
  },
  "timestamp": "2026-10-24T16:34:39.270Z"
}
```

---

### 2.2. List Game Categories

```http
GET /api/v1/catalog/categories
```

Retrieves all configured game categories alongside their count of active published games.

#### Response — 200 OK

```json
{
  "categories": [
    {
      "id": "cat-action",
      "name": "Action",
      "slug": "action",
      "description": "Real-time reflexes, platform agility, and precision control under pressure.",
      "published_game_count": 1
    },
    {
      "id": "cat-arcade",
      "name": "Arcade",
      "slug": "arcade",
      "description": "Fast-paced reflex challenges, retro shoot-em-ups, and kinetic arena games.",
      "published_game_count": 2
    },
    {
      "id": "cat-card",
      "name": "Card & Board",
      "slug": "card",
      "description": "Classic deck disciplines, tabletop strategies, and tournament card play.",
      "published_game_count": 1
    },
    {
      "id": "cat-puzzle",
      "name": "Puzzle",
      "slug": "puzzle",
      "description": "Spatial logic, pattern matching, cryptographic riddles, and deductive reasoning.",
      "published_game_count": 2
    },
    {
      "id": "cat-simulation",
      "name": "Simulation",
      "slug": "simulation",
      "description": "Physics sandboxes, flight dynamics, and ecosystem simulations.",
      "published_game_count": 0
    },
    {
      "id": "cat-strategy",
      "name": "Strategy",
      "slug": "strategy",
      "description": "Turn-based tactics, resource management, and competitive mental chess.",
      "published_game_count": 2
    }
  ],
  "timestamp": "2026-10-24T16:34:39.280Z"
}
```

---

### 2.3. View Game Details

```http
GET /api/v1/catalog/games/:idOrSlug
```

Retrieves complete game details, gameplay modes, player capacity, bot opponent support, and access requirements by game ID (e.g. `game-003`) or unique slug (e.g. `obsidian-chess`).

#### Path Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `idOrSlug` | String | Yes | Database UUID/ID or URL slug of the game. |

#### Response — 200 OK (Free Game Example)

```json
{
  "game": {
    "id": "game-003",
    "title": "Obsidian Chess",
    "slug": "obsidian-chess",
    "description": "Grandmaster-caliber chess engine set against dark charcoal aesthetic with AI bots and competitive multiplayer lobby integration.",
    "launchUrl": "/games/obsidian-chess/index.html",
    "isPublished": true,
    "isPremium": false,
    "minPlayers": 1,
    "maxPlayers": 2,
    "supportsBots": true,
    "category": {
      "id": "cat-strategy",
      "name": "Strategy",
      "slug": "strategy"
    },
    "mode": {
      "type": "multiplayer",
      "label": "1–2 Players",
      "supportsBots": true
    },
    "access": {
      "tier": "free",
      "label": "Free to Play",
      "requiresSubscription": false
    },
    "createdAt": "2026-10-24 16:24:00",
    "updatedAt": "2026-10-24 16:24:00"
  },
  "timestamp": "2026-10-24T16:34:39.295Z"
}
```

#### Response — 200 OK (Premium Game Example with Access Requirement AC-8.2)

```json
{
  "game": {
    "id": "game-004",
    "title": "Neon Horizon",
    "slug": "neon-horizon",
    "description": "High-velocity synthwave endless runner requiring millimeter-precision lane dodging and sonic speed boosts. Obsidian VIP Exclusive.",
    "launchUrl": "/games/neon-horizon/index.html",
    "isPublished": true,
    "isPremium": true,
    "minPlayers": 1,
    "maxPlayers": 1,
    "supportsBots": false,
    "category": {
      "id": "cat-arcade",
      "name": "Arcade",
      "slug": "arcade"
    },
    "mode": {
      "type": "single_player",
      "label": "Single Player",
      "supportsBots": false
    },
    "access": {
      "tier": "premium",
      "label": "Obsidian VIP Required",
      "requiresSubscription": true
    },
    "createdAt": "2026-10-24 16:24:00",
    "updatedAt": "2026-10-24 16:24:00"
  },
  "timestamp": "2026-10-24T16:34:39.310Z"
}
```

#### Response — 404 Not Found (Unpublished or Missing Game AC-8.3)

```json
{
  "error": "Not Found",
  "message": "Game not found or unavailable",
  "timestamp": "2026-10-24T16:34:39.325Z"
}
```

---

## 3. Requirements Traceability Matrix

| Story ID | Criteria ID | Description | API Endpoint / Service Method | Test ID | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **EP02-01** | `AC-5.1` | Published games are listed when catalog opens | `GET /api/v1/catalog/games` | `CAT-BRW-01`, `CAT-BRW-04`, `CAT-BRW-05` | **PASS (100%)** |
| **EP02-01** | `AC-5.2` | Unpublished games are absent from catalog | `GET /api/v1/catalog/games` | `CAT-BRW-02` | **PASS (100%)** |
| **EP02-01** | `AC-5.3` | Empty-state message when 0 published games exist | `GET /api/v1/catalog/games` | `CAT-BRW-03` | **PASS (100%)** |
| **EP02-02** | `AC-6.1` | Matching game appears on search by title | `GET /api/v1/catalog/games?q={title}` | `CAT-SRC-01`, `CAT-SRC-02`, `CAT-SRC-05`, `CAT-SRC-06` | **PASS (100%)** |
| **EP02-02** | `AC-6.2` | No-results state displayed when no title matches | `GET /api/v1/catalog/games?q={title}` | `CAT-SRC-03` | **PASS (100%)** |
| **EP02-02** | `AC-6.3` | Unpublished game excluded from search matches | `GET /api/v1/catalog/games?q={title}` | `CAT-SRC-04` | **PASS (100%)** |
| **EP02-03** | `AC-7.1` | Category filter displays only matching games | `GET /api/v1/catalog/games?category={slug}` | `CAT-CAT-01`, `CAT-CAT-02`, `CAT-CAT-05` | **PASS (100%)** |
| **EP02-03** | `AC-7.2` | Category with 0 games displays no-results state | `GET /api/v1/catalog/games?category={slug}` | `CAT-CAT-03` | **PASS (100%)** |
| **EP02-03** | `AC-7.3` | Clearing category filter restores unfiltered catalog | `GET /api/v1/catalog/games?category=all` | `CAT-CAT-04` | **PASS (100%)** |
| **EP02-04** | `AC-8.1` | Game details page displays mode & access specs | `GET /api/v1/catalog/games/:idOrSlug` | `CAT-DET-01`, `CAT-DET-02` | **PASS (100%)** |
| **EP02-04** | `AC-8.2` | Premium requirement is visible before launch | `GET /api/v1/catalog/games/:idOrSlug` | `CAT-DET-03`, `CAT-DET-04` | **PASS (100%)** |
| **EP02-04** | `AC-8.3` | Unavailable/unpublished game shows unavailable state | `GET /api/v1/catalog/games/:idOrSlug` | `CAT-DET-05`, `CAT-DET-06` | **PASS (100%)** |
