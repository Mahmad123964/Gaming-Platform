const crypto = require('node:crypto');

class GameCatalogService {
  constructor(db) {
    this.db = db;
    this.ensureSeedData();
  }

  /**
   * Automatically seed initial authorized game categories and games if tables are empty.
   */
  ensureSeedData() {
    try {
      const categoryCount = this.db.get('SELECT COUNT(*) as count FROM game_categories');
      if (!categoryCount || categoryCount.count === 0) {
        this.seedInitialCatalog();
      }
    } catch (err) {
      console.error('[GameCatalogService] Error checking/seeding catalog data:', err.message);
    }
  }

  seedInitialCatalog() {
    // 1. Seed Authorized Categories
    const categories = [
      { id: 'cat-arcade', name: 'Arcade', slug: 'arcade', description: 'Fast-paced reflex challenges, retro shoot-em-ups, and kinetic arena games.' },
      { id: 'cat-puzzle', name: 'Puzzle', slug: 'puzzle', description: 'Spatial logic, pattern matching, cryptographic riddles, and deductive reasoning.' },
      { id: 'cat-strategy', name: 'Strategy', slug: 'strategy', description: 'Turn-based tactics, resource management, and competitive mental chess.' },
      { id: 'cat-action', name: 'Action', slug: 'action', description: 'Real-time reflexes, platform agility, and precision control under pressure.' },
      { id: 'cat-card', name: 'Card & Board', slug: 'card', description: 'Classic deck disciplines, tabletop strategies, and tournament card play.' },
      { id: 'cat-simulation', name: 'Simulation', slug: 'simulation', description: 'Physics sandboxes, flight dynamics, and ecosystem simulations.' } // Seeded with 0 games to verify AC-7.2!
    ];

    for (const cat of categories) {
      this.db.run(
        'INSERT OR IGNORE INTO game_categories (id, name, slug, description) VALUES (?, ?, ?, ?)',
        [cat.id, cat.name, cat.slug, cat.description]
      );
    }

    // 2. Seed Authorized Published & Unpublished Games
    const games = [
      {
        id: 'game-001',
        title: 'Cyber Invaders',
        slug: 'cyber-invaders',
        description: 'Defend the neon mainframe against descending waves of cybernetic intruders in this high-intensity retro arcade shooter.',
        category_id: 'cat-arcade',
        launch_url: '/games/cyber-invaders/index.html',
        is_published: 1,
        is_premium: 0,
        min_players: 1,
        max_players: 1,
        supports_bots: 0
      },
      {
        id: 'game-002',
        title: 'Quantum Grid',
        slug: 'quantum-grid',
        description: 'Manipulate photon paths, quantum gates, and mirror arrays to solve mind-bending spatial logic puzzles.',
        category_id: 'cat-puzzle',
        launch_url: '/games/quantum-grid/index.html',
        is_published: 1,
        is_premium: 0,
        min_players: 1,
        max_players: 1,
        supports_bots: 0
      },
      {
        id: 'game-003',
        title: 'Obsidian Chess',
        slug: 'obsidian-chess',
        description: 'Grandmaster-caliber chess engine set against dark charcoal aesthetic with AI bots and competitive multiplayer lobby integration.',
        category_id: 'cat-strategy',
        launch_url: '/games/obsidian-chess/index.html',
        is_published: 1,
        is_premium: 0,
        min_players: 1,
        max_players: 2,
        supports_bots: 1
      },
      {
        id: 'game-004',
        title: 'Neon Horizon',
        slug: 'neon-horizon',
        description: 'High-velocity synthwave endless runner requiring millimeter-precision lane dodging and sonic speed boosts. Obsidian VIP Exclusive.',
        category_id: 'cat-arcade',
        launch_url: '/games/neon-horizon/index.html',
        is_published: 1,
        is_premium: 1,
        min_players: 1,
        max_players: 1,
        supports_bots: 0
      },
      {
        id: 'game-005',
        title: 'Chrono Tactics',
        slug: 'chrono-tactics',
        description: 'Tactical turn-based squad warfare where players rewind time and coordinate simultaneous flanking assaults. Obsidian VIP Exclusive.',
        category_id: 'cat-strategy',
        launch_url: '/games/chrono-tactics/index.html',
        is_published: 1,
        is_premium: 1,
        min_players: 1,
        max_players: 4,
        supports_bots: 1
      },
      {
        id: 'game-006',
        title: 'Vortex Arena',
        slug: 'vortex-arena',
        description: 'Top-down kinetic physics brawler. Launch magnetic pulses and knock opponents out of the shrinking gravitational event horizon.',
        category_id: 'cat-action',
        launch_url: '/games/vortex-arena/index.html',
        is_published: 1,
        is_premium: 0,
        min_players: 1,
        max_players: 4,
        supports_bots: 1
      },
      {
        id: 'game-007',
        title: 'Cipher Matrix',
        slug: 'cipher-matrix',
        description: 'Decrypt cryptographic sequences and crack procedural terminal puzzles before the corporate intrusion countermeasure triggers.',
        category_id: 'cat-puzzle',
        launch_url: '/games/cipher-matrix/index.html',
        is_published: 1,
        is_premium: 0,
        min_players: 1,
        max_players: 1,
        supports_bots: 0
      },
      {
        id: 'game-008',
        title: 'Solitaire Royale',
        slug: 'solitaire-royale',
        description: 'Refined Klondike and Spider card solitaire featuring timed speed runs, tournament scoring, and smooth obsidian deck animations.',
        category_id: 'cat-card',
        launch_url: '/games/solitaire-royale/index.html',
        is_published: 1,
        is_premium: 0,
        min_players: 1,
        max_players: 1,
        supports_bots: 0
      },
      // UNPUBLISHED GAME: Must NEVER appear in public browsing or searches (AC-5.2, AC-6.3, AC-8.3)
      {
        id: 'game-draft-099',
        title: 'Shadow Protocol (Unpublished Draft)',
        slug: 'shadow-protocol',
        description: 'Stealth infiltration prototype currently undergoing licensing approval and QA balance testing. Internal staging preview only.',
        category_id: 'cat-action',
        launch_url: '/games/shadow-protocol/index.html',
        is_published: 0,
        is_premium: 0,
        min_players: 1,
        max_players: 2,
        supports_bots: 1
      }
    ];

    for (const game of games) {
      this.db.run(
        `INSERT OR IGNORE INTO games (
          id, title, slug, description, category_id, launch_url, 
          is_published, is_premium, min_players, max_players, supports_bots
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          game.id, game.title, game.slug, game.description, game.category_id, game.launch_url,
          game.is_published, game.is_premium, game.min_players, game.max_players, game.supports_bots
        ]
      );

      // Explicit licensing approval seed: approved for published games, pending for drafts
      const licStatus = game.is_published === 1 ? 'approved' : 'pending';
      const licApprovedBy = game.is_published === 1 ? 'NexusAdmin' : null;
      const licNotes = game.is_published === 1 
        ? 'Baseline distribution license approved for catalog launch'
        : 'Pending distribution license verification and publisher agreement';
      const licId = 'lic-' + game.id;

      this.db.run(
        `INSERT OR IGNORE INTO licensing_approvals (id, game_id, status, approved_by, approved_at, notes)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [licId, game.id, licStatus, licApprovedBy, licNotes]
      );
    }
  }

  /**
   * Escape SQL LIKE wildcard characters to prevent pattern injection.
   */
  sanitizeLikeQuery(query) {
    if (!query) return '';
    return query.replace(/[%_\\]/g, '\\$&');
  }

  /**
   * Retrieve published games matching optional search, category, and pagination filters.
   * Excludes unpublished games unconditionally (AC-5.2, AC-6.3).
   * Strictly requires explicit licensing approval (l.status = 'approved').
   */
  getPublishedGames(options = {}) {
    let {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      sort = 'title:asc'
    } = options;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (page - 1) * limit;

    const conditions = [
      'g.is_published = 1',
      "l.status = 'approved'"
    ];
    const params = [];

    // Filter by search query (case-insensitive substring match on title)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const sanitized = this.sanitizeLikeQuery(search.trim());
      conditions.push("LOWER(g.title) LIKE LOWER(?) ESCAPE '\\'");
      params.push(`%${sanitized}%`);
    }

    // Filter by category (slug or id)
    if (category && typeof category === 'string' && category.trim().length > 0 && category.trim() !== 'all') {
      conditions.push('(c.slug = ? OR c.id = ?)');
      params.push(category.trim(), category.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting rule
    let orderBy = 'g.title ASC';
    if (sort === 'title:desc') orderBy = 'g.title DESC';
    else if (sort === 'created_at:desc') orderBy = 'g.created_at DESC';
    else if (sort === 'created_at:asc') orderBy = 'g.created_at ASC';
    else if (sort === 'players:desc') orderBy = 'g.max_players DESC';

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM games g
      LEFT JOIN game_categories c ON g.category_id = c.id
      LEFT JOIN licensing_approvals l ON g.id = l.game_id
      ${whereClause}
    `;
    const countResult = this.db.get(countSql, params);
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Items query
    const dataSql = `
      SELECT 
        g.id,
        g.title,
        g.slug,
        g.description,
        g.launch_url,
        g.is_published,
        g.is_premium,
        g.min_players,
        g.max_players,
        g.supports_bots,
        g.created_at,
        g.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug
      FROM games g
      LEFT JOIN game_categories c ON g.category_id = c.id
      LEFT JOIN licensing_approvals l ON g.id = l.game_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const games = this.db.query(dataSql, [...params, limit, offset]).map(row => this.formatGameRecord(row));

    return {
      games,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  /**
   * Retrieve all categories with their count of published games.
   */
  getCategories() {
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        COUNT(CASE WHEN g.is_published = 1 THEN 1 END) as published_game_count
      FROM game_categories c
      LEFT JOIN games g ON c.id = g.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    return this.db.query(sql);
  }

  /**
   * Retrieve single game details by ID or slug.
   * If the game is unpublished (is_published = 0) or does not exist, returns null (AC-8.3).
   */
  getPublishedGameByIdOrSlug(idOrSlug) {
    if (!idOrSlug || typeof idOrSlug !== 'string') return null;

    const sql = `
      SELECT 
        g.id,
        g.title,
        g.slug,
        g.description,
        g.launch_url,
        g.is_published,
        g.is_premium,
        g.min_players,
        g.max_players,
        g.supports_bots,
        g.created_at,
        g.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug
      FROM games g
      LEFT JOIN game_categories c ON g.category_id = c.id
      LEFT JOIN licensing_approvals l ON g.id = l.game_id
      WHERE (g.id = ? OR g.slug = ?) AND g.is_published = 1 AND l.status = 'approved'
    `;

    const row = this.db.get(sql, [idOrSlug.trim(), idOrSlug.trim()]);
    if (!row) return null;

    return this.formatGameRecord(row);
  }

  /**
   * Formats a raw database row into the standard API DTO.
   */
  formatGameRecord(row) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      launchUrl: row.launch_url,
      isPublished: Boolean(row.is_published),
      isPremium: Boolean(row.is_premium),
      minPlayers: row.min_players,
      maxPlayers: row.max_players,
      supportsBots: Boolean(row.supports_bots),
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug
      } : null,
      mode: {
        type: row.max_players > 1 ? 'multiplayer' : 'single_player',
        label: row.max_players > 1 ? `${row.min_players}–${row.max_players} Players` : 'Single Player',
        supportsBots: Boolean(row.supports_bots)
      },
      access: {
        tier: row.is_premium ? 'premium' : 'free',
        label: row.is_premium ? 'Obsidian VIP Required' : 'Free to Play',
        requiresSubscription: Boolean(row.is_premium)
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

let catalogServiceInstance = null;

function getCatalogService(db) {
  if (!catalogServiceInstance || db) {
    catalogServiceInstance = new GameCatalogService(db);
  }
  return catalogServiceInstance;
}

module.exports = {
  GameCatalogService,
  getCatalogService
};
