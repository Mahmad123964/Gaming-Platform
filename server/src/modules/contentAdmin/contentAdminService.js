const crypto = require('node:crypto');
const { hashPassword } = require('../identity/crypto');

class ContentAdminService {
  constructor(db) {
    this.db = db;
    this.ensureAdminAccount();
    this.ensureLicensingData();
  }

  /**
   * Ensure default staging/operational administrator exists in players table
   */
  ensureAdminAccount() {
    try {
      const admin = this.db.get("SELECT id, email, role FROM players WHERE role = 'admin' LIMIT 1");
      if (!admin) {
        const adminId = 'admin-' + crypto.randomUUID().slice(0, 8);
        const adminEmail = 'admin@nexusplay.gg';
        const displayName = 'NexusAdmin';
        const passwordHash = hashPassword('Admin#2026!Nexus');

        this.db.run(
          `INSERT INTO players (id, email, password_hash, display_name, role, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [adminId, adminEmail, passwordHash, displayName]
        );

        this.logAuditEvent({
          actorId: 'system',
          action: 'ADMIN_SEEDED',
          resource: `player:${adminId}`,
          details: { email: adminEmail, displayName }
        });
      }
    } catch (err) {
      console.error('[ContentAdminService] Error checking/seeding admin account:', err.message);
    }
  }

  /**
   * Ensure initial licensing records exist for all seeded games
   */
  ensureLicensingData() {
    try {
      const games = this.db.query('SELECT id, is_published, created_at FROM games');
      for (const game of games) {
        const existing = this.db.get('SELECT id, status FROM licensing_approvals WHERE game_id = ?', [game.id]);
        if (!existing) {
          const approvalId = 'lic-' + crypto.randomUUID().slice(0, 8);
          const isApproved = game.is_published === 1;
          const status = isApproved ? 'approved' : 'pending';
          const approvedBy = isApproved ? 'NexusAdmin' : null;
          const approvedAt = isApproved ? game.created_at : null;
          const notes = isApproved 
            ? 'Baseline distribution license approved for catalog launch'
            : 'Pending distribution license verification and publisher agreement';

          this.db.run(
            `INSERT INTO licensing_approvals (id, game_id, status, approved_by, approved_at, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [approvalId, game.id, status, approvedBy, approvedAt, notes]
          );
        }
      }
    } catch (err) {
      console.error('[ContentAdminService] Error seeding licensing records:', err.message);
    }
  }

  /**
   * Log an administrative mutation or rejected attempt into audit_events
   * Traceability: EP11-02, AC-40.1, AC-40.2
   */
  /**
   * Redact sensitive credentials, secrets, tokens, and keys from audit details
   * Traceability: EP11-03, AUDIT-RED-01
   */
  sanitizeAuditDetails(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sanitizeAuditDetails(item));

    const sensitiveKeys = ['password', 'passwordhash', 'hash', 'token', 'csrftoken', 'secret', 'cookie', 'key', 'auth', 'authorization'];
    const sanitized = {};

    for (const [k, v] of Object.entries(obj)) {
      const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sensitiveKeys.some(s => lowerKey.includes(s))) {
        sanitized[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null) {
        sanitized[k] = this.sanitizeAuditDetails(v);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  /**
   * Log an administrative mutation or rejected attempt into audit_events
   * Traceability: EP11-02, EP11-03, AC-40.1, AC-40.2
   */
  logAuditEvent({ actorId, action, resource, details = {} }) {
    try {
      const eventId = 'audit-' + crypto.randomUUID();
      const sanitized = this.sanitizeAuditDetails(typeof details === 'string' ? JSON.parse(details) : details);
      const detailsJson = JSON.stringify(sanitized);
      this.db.run(
        `INSERT INTO audit_events (id, actor_id, action, resource, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [eventId, actorId || 'anonymous', action, resource, detailsJson]
      );
      return eventId;
    } catch (err) {
      console.error('[ContentAdminService] Failed to record audit event:', err.message);
      return null;
    }
  }

  recordAuditEvent(params) {
    return this.logAuditEvent(params);
  }

  /**
   * Get audit events with limit, offset, and multi-criteria filters
   * Traceability: EP11-02, EP11-03, AC-40.3
   */
  getAuditEvents({ limit = 50, offset = 0, action = null, resource = null, actorId = null, startDate = null, endDate = null } = {}) {
    const validLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const validOffset = Math.max(parseInt(offset, 10) || 0, 0);

    let sql = `
      SELECT a.id, a.actor_id, a.action, a.resource, a.details_json, a.created_at,
             p.display_name as actor_name, p.email as actor_email, p.role as actor_role
      FROM audit_events a
      LEFT JOIN players p ON a.actor_id = p.id
    `;
    const params = [];
    const conditions = [];

    if (action) {
      conditions.push('a.action = ?');
      params.push(action);
    }
    if (actorId) {
      conditions.push('a.actor_id = ?');
      params.push(actorId);
    }
    if (resource) {
      conditions.push('a.resource LIKE ?');
      params.push(`%${resource}%`);
    }
    if (startDate) {
      conditions.push('a.created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('a.created_at <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Count total matching
    const countSql = `SELECT COUNT(*) as total FROM audit_events a ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;
    const totalRow = this.db.get(countSql, params);
    const totalCount = totalRow ? totalRow.total : 0;

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(validLimit, validOffset);

    const rows = this.db.query(sql, params);
    const events = rows.map(r => {
      let parsedDetails = {};
      try {
        parsedDetails = r.details_json ? JSON.parse(r.details_json) : {};
      } catch (e) {
        parsedDetails = { raw: r.details_json };
      }
      return {
        id: r.id,
        actorId: r.actor_id,
        actorName: r.actor_name || (r.actor_id === 'system' ? 'System Process' : (r.actor_id === 'anonymous' ? 'Anonymous Requester' : 'Unknown / Anonymous')),
        actorEmail: r.actor_email || null,
        actorRole: r.actor_role || null,
        action: r.action,
        resource: r.resource,
        details: parsedDetails,
        createdAt: r.created_at
      };
    });

    return {
      events,
      count: events.length,
      totalCount,
      limit: validLimit,
      offset: validOffset
    };
  }

  /**
   * List all games for content administrators (published & unpublished drafts)
   * Traceability: EP03-02, EP10-01, EP10-02, EP10-03
   */
  listAllGames({ search, category, status, licensingStatus, page = 1, limit = 20 } = {}) {
    let baseSql = `
      FROM games g
      LEFT JOIN game_categories c ON g.category_id = c.id
      LEFT JOIN licensing_approvals l ON g.id = l.game_id
    `;
    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(g.title) LIKE ? OR LOWER(g.description) LIKE ? OR LOWER(g.slug) LIKE ?)');
      params.push(q, q, q);
    }

    if (category && category !== 'all') {
      conditions.push('(c.slug = ? OR c.id = ?)');
      params.push(category, category);
    }

    if (status === 'published') {
      conditions.push('g.is_published = 1');
    } else if (status === 'draft') {
      conditions.push('g.is_published = 0');
    }

    if (licensingStatus && licensingStatus !== 'all') {
      conditions.push('l.status = ?');
      params.push(licensingStatus);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const countRow = this.db.get(`SELECT COUNT(*) as total ${baseSql}${whereClause}`, params);
    const total = countRow ? countRow.total : 0;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
    const offset = (pageNum - 1) * limitNum;

    const dataSql = `
      SELECT g.id, g.title, g.slug, g.description, g.category_id, g.launch_url,
             g.is_published, g.is_premium, g.min_players, g.max_players, g.supports_bots,
             g.created_at, g.updated_at,
             c.id as cat_id, c.name as category_name, c.slug as category_slug,
             l.id as licensing_id, l.status as licensing_status, l.approved_by, l.approved_at, l.notes as licensing_notes
      ${baseSql}${whereClause}
      ORDER BY g.updated_at DESC, g.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.query(dataSql, [...params, limitNum, offset]);

    return {
      games: rows.map(r => this.formatAdminGame(r)),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get single game by ID with full metadata and licensing status
   */
  getGameById(id) {
    const row = this.db.get(
      `SELECT g.id, g.title, g.slug, g.description, g.category_id, g.launch_url,
              g.is_published, g.is_premium, g.min_players, g.max_players, g.supports_bots,
              g.created_at, g.updated_at,
              c.id as cat_id, c.name as category_name, c.slug as category_slug,
              l.id as licensing_id, l.status as licensing_status, l.approved_by, l.approved_at, l.notes as licensing_notes
       FROM games g
       LEFT JOIN game_categories c ON g.category_id = c.id
       LEFT JOIN licensing_approvals l ON g.id = l.game_id
       WHERE g.id = ?`,
      [id]
    );

    if (!row) {
      const err = new Error(`Game with ID '${id}' not found`);
      err.status = 404;
      throw err;
    }

    return this.formatAdminGame(row);
  }

  /**
   * Register a new game record with launch URL and metadata
   * Traceability: EP03-02, AC-10.1, AC-10.2, AC-10.3, AC-40.1
   */
  createGame(payload, actorId) {
    const errors = this.validateGamePayload(payload, { isCreate: true });
    if (Object.keys(errors).length > 0) {
      const err = new Error('Game registration failed: Mandatory metadata missing or invalid.');
      err.status = 400;
      err.validationErrors = errors;
      throw err;
    }

    const {
      title,
      slug,
      description,
      categoryId,
      launchUrl,
      isPremium = 0,
      minPlayers = 1,
      maxPlayers = 1,
      supportsBots = 0
    } = payload;

    // Check duplicate slug
    const cleanSlug = slug.trim().toLowerCase();
    const existingSlug = this.db.get('SELECT id FROM games WHERE LOWER(slug) = ?', [cleanSlug]);
    if (existingSlug) {
      const err = new Error(`A game with slug '${cleanSlug}' already exists.`);
      err.status = 409;
      err.validationErrors = { slug: 'Game slug must be unique across the platform.' };
      throw err;
    }

    // Verify category exists
    const category = this.db.get('SELECT id FROM game_categories WHERE id = ?', [categoryId]);
    if (!category) {
      const err = new Error(`Category with ID '${categoryId}' does not exist.`);
      err.status = 400;
      err.validationErrors = { categoryId: 'Selected category does not exist.' };
      throw err;
    }

    const gameId = 'game-' + crypto.randomUUID().slice(0, 8);
    // AC-10.3: Newly created game defaults to is_published = 0 (draft)
    const isPublished = 0;

    this.db.run(
      `INSERT INTO games (
        id, title, slug, description, category_id, launch_url,
        is_published, is_premium, min_players, max_players, supports_bots,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        gameId,
        title.trim(),
        cleanSlug,
        description.trim(),
        categoryId,
        launchUrl.trim(),
        isPublished,
        isPremium ? 1 : 0,
        parseInt(minPlayers, 10) || 1,
        parseInt(maxPlayers, 10) || 1,
        supportsBots ? 1 : 0
      ]
    );

    // Initial licensing status: pending
    const licensingId = 'lic-' + crypto.randomUUID().slice(0, 8);
    this.db.run(
      `INSERT INTO licensing_approvals (id, game_id, status, approved_by, approved_at, notes)
       VALUES (?, ?, 'pending', NULL, NULL, ?)`,
      [licensingId, gameId, 'Initial metadata submitted, pending legal clearance']
    );

    // AC-40.1: Log audit event for creation
    this.logAuditEvent({
      actorId,
      action: 'GAME_CREATED',
      resource: `game:${gameId}`,
      details: {
        gameId,
        title: title.trim(),
        slug: cleanSlug,
        categoryId,
        launchUrl: launchUrl.trim(),
        isPublished: 0,
        licensingStatus: 'pending'
      }
    });

    return this.getGameById(gameId);
  }

  /**
   * Edit game title, category, description, and metadata
   * Traceability: EP10-01, AC-35.1, AC-35.2, AC-40.1
   */
  updateGame(id, payload, actorId) {
    const existing = this.getGameById(id);

    const errors = this.validateGamePayload(payload, { isCreate: false });
    if (Object.keys(errors).length > 0) {
      const err = new Error('Game update failed: Validation error.');
      err.status = 400;
      err.validationErrors = errors;
      throw err;
    }

    const {
      title,
      slug,
      description,
      categoryId,
      launchUrl,
      isPremium,
      minPlayers,
      maxPlayers,
      supportsBots
    } = payload;

    // Check slug collision if slug provided and different from existing
    const cleanSlug = (slug || existing.slug).trim().toLowerCase();
    if (cleanSlug !== existing.slug) {
      const slugColl = this.db.get('SELECT id FROM games WHERE LOWER(slug) = ? AND id != ?', [cleanSlug, id]);
      if (slugColl) {
        const err = new Error(`Slug '${cleanSlug}' is already in use by another game.`);
        err.status = 409;
        err.validationErrors = { slug: 'Game slug must be unique.' };
        throw err;
      }
    }

    // Verify category exists
    const category = this.db.get('SELECT id FROM game_categories WHERE id = ?', [categoryId]);
    if (!category) {
      const err = new Error(`Category with ID '${categoryId}' does not exist.`);
      err.status = 400;
      err.validationErrors = { categoryId: 'Selected category does not exist.' };
      throw err;
    }

    this.db.run(
      `UPDATE games SET
        title = ?,
        slug = ?,
        description = ?,
        category_id = ?,
        launch_url = ?,
        is_premium = ?,
        min_players = ?,
        max_players = ?,
        supports_bots = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title.trim(),
        cleanSlug,
        description.trim(),
        categoryId,
        launchUrl.trim(),
        isPremium !== undefined ? (isPremium ? 1 : 0) : (existing.isPremium ? 1 : 0),
        minPlayers !== undefined ? parseInt(minPlayers, 10) : existing.minPlayers,
        maxPlayers !== undefined ? parseInt(maxPlayers, 10) : existing.maxPlayers,
        supportsBots !== undefined ? (supportsBots ? 1 : 0) : (existing.supportsBots ? 1 : 0),
        id
      ]
    );

    // AC-40.1: Log audit event for update
    this.logAuditEvent({
      actorId,
      action: 'GAME_UPDATED',
      resource: `game:${id}`,
      details: {
        previous: {
          title: existing.title,
          slug: existing.slug,
          categoryId: existing.category ? existing.category.id : null,
          description: existing.description.slice(0, 100) + '...'
        },
        updated: {
          title: title.trim(),
          slug: cleanSlug,
          categoryId,
          description: description.trim().slice(0, 100) + '...'
        }
      }
    });

    return this.getGameById(id);
  }

  /**
   * Publish or unpublish an individual game
   * Enforces licensing clearance gate and atomic transaction locking
   * Traceability: EP10-02, AC-36.1, AC-36.2, AC-37.2, AC-40.1
   */
  setPublicationStatus(id, isPublished, actorId) {
    const game = this.getGameById(id);
    const targetStatus = isPublished ? 1 : 0;

    // AC-37.2: Given a game is not approved for distribution, When publication is attempted, Then publication is blocked
    if (targetStatus === 1) {
      if (!game.licensing || game.licensing.status !== 'approved') {
        const err = new Error(
          `Publication blocked: Game '${game.title}' cannot be published because its licensing status is '${game.licensing ? game.licensing.status : 'unrecorded'}'. Only games with 'approved' licensing may be published.`
        );
        err.status = 422; // Unprocessable Entity
        err.code = 'LICENSING_APPROVAL_REQUIRED';
        throw err;
      }
    }

    // Task 3: Transactional consistency - wrap publication in atomic transaction with live re-check
    this.db.run('BEGIN IMMEDIATE');
    try {
      if (targetStatus === 1) {
        const checkLic = this.db.get('SELECT status FROM licensing_approvals WHERE game_id = ?', [id]);
        if (!checkLic || checkLic.status !== 'approved') {
          const err = new Error(`Publication race blocked: Game licensing status is '${checkLic ? checkLic.status : 'none'}'. Publication requires 'approved' licensing.`);
          err.status = 422;
          err.code = 'LICENSING_APPROVAL_REQUIRED';
          throw err;
        }
      }

      this.db.run(
        'UPDATE games SET is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [targetStatus, id]
      );

      const action = targetStatus === 1 ? 'GAME_PUBLISHED' : 'GAME_UNPUBLISHED';

      // AC-40.1: Audit record
      this.logAuditEvent({
        actorId,
        action,
        resource: `game:${id}`,
        details: {
          gameId: id,
          title: game.title,
          previousState: game.isPublished ? 'published' : 'draft',
          newState: targetStatus === 1 ? 'published' : 'draft'
        }
      });

      this.db.run('COMMIT');
    } catch (err) {
      try { this.db.run('ROLLBACK'); } catch (_) {}
      throw err;
    }

    return {
      id,
      title: game.title,
      isPublished: targetStatus === 1,
      action: targetStatus === 1 ? 'GAME_PUBLISHED' : 'GAME_UNPUBLISHED',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * View and update game licensing approval status
   * Enforces atomic transaction consistency and auto-unpublish cascade
   * Traceability: EP10-03, AC-37.1, AC-37.2, AC-37.3, AC-40.1
   */
  setLicensingStatus(id, { status, notes = '' }, actorId) {
    const game = this.getGameById(id);
    const validStatuses = ['approved', 'pending', 'rejected', 'suspended'];

    if (!status || !validStatuses.includes(status)) {
      const err = new Error(`Invalid licensing status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const previousStatus = game.licensing ? game.licensing.status : 'none';
    const isApproved = status === 'approved';
    const approvedBy = isApproved ? (actorId || 'admin') : null;
    const approvedAt = isApproved ? new Date().toISOString() : null;

    let autoUnpublished = false;

    // Task 3: Transactional consistency - wrap licensing update and cascade unpublish in atomic transaction
    this.db.run('BEGIN IMMEDIATE');
    try {
      const existing = this.db.get('SELECT id FROM licensing_approvals WHERE game_id = ?', [id]);
      if (existing) {
        this.db.run(
          `UPDATE licensing_approvals SET
            status = ?,
            approved_by = ?,
            approved_at = ?,
            notes = ?
           WHERE game_id = ?`,
          [status, approvedBy, approvedAt, notes ? notes.trim() : null, id]
        );
      } else {
        const licensingId = 'lic-' + crypto.randomUUID().slice(0, 8);
        this.db.run(
          `INSERT INTO licensing_approvals (id, game_id, status, approved_by, approved_at, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [licensingId, id, status, approvedBy, approvedAt, notes ? notes.trim() : null]
        );
      }

      // AC-37.3: Given an approved game loses licensing clearance, When the updated status is applied, Then new public launches are prevented (auto unpublish)
      if (status !== 'approved' && game.isPublished) {
        this.db.run(
          'UPDATE games SET is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [id]
        );
        autoUnpublished = true;
      }

      // AC-40.1: Log audit event
      this.logAuditEvent({
        actorId,
        action: 'LICENSING_UPDATED',
        resource: `game:${id}`,
        details: {
          gameId: id,
          title: game.title,
          previousStatus,
          newStatus: status,
          notes: notes ? notes.trim() : null,
          autoUnpublished
        }
      });

      this.db.run('COMMIT');
    } catch (err) {
      try { this.db.run('ROLLBACK'); } catch (_) {}
      throw err;
    }

    return {
      gameId: id,
      title: game.title,
      licensingStatus: status,
      previousStatus,
      autoUnpublished,
      isPublished: autoUnpublished ? false : game.isPublished,
      notes: notes ? notes.trim() : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper: Validate game launch URL security against approved hosting and scheme policies
   * Enforces rejection of executable pseudo-protocols, protocol-relative paths, path traversal, CRLF, and unapproved hosts.
   */
  validateLaunchUrlSecurity(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      return { valid: false, error: 'Launch URL is mandatory and cannot be blank.' };
    }

    const url = rawUrl.trim();

    // Reject control characters or line breaks (CRLF injection)
    if (/[\r\n\0\t\x00-\x1F]/.test(url)) {
      return { valid: false, error: 'Launch URL contains illegal control characters or line breaks.' };
    }

    // Reject dangerous executable schemes (XSS & execution vectors)
    const lower = url.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('file:') ||
      lower.startsWith('blob:')
    ) {
      return { valid: false, error: 'Disallowed URL scheme. Executable pseudo-protocols (javascript, data, vbscript, file, blob) are strictly prohibited.' };
    }

    // Reject protocol-relative URLs (e.g. //attacker.com)
    if (url.startsWith('//')) {
      return { valid: false, error: 'Protocol-relative URLs (starting with //) are disallowed for security reasons.' };
    }

    // Case 1: Internal Platform Relative Path
    if (url.startsWith('/')) {
      // Reject path traversal sequences
      if (url.includes('/../') || url.endsWith('/..') || url.includes('/..\\') || url.includes('\\') || lower.includes('%2e%2e')) {
        return { valid: false, error: 'Path traversal sequences (/../) are disallowed in internal game launch paths.' };
      }

      // Must be formatted cleanly (e.g. /games/<slug>/index.html)
      if (!/^\/[a-zA-Z0-9_\-\.\/]+$/.test(url)) {
        return { valid: false, error: 'Internal launch URL contains invalid characters. Only alphanumeric, hyphens, underscores, dots, and slashes are permitted.' };
      }

      return { valid: true, cleanUrl: url };
    }

    // Case 2: External Absolute HTTPS URL
    if (lower.startsWith('http://')) {
      return { valid: false, error: 'Insecure HTTP scheme is disallowed. Game launch URLs must use HTTPS.' };
    }

    if (lower.startsWith('https://')) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') {
          return { valid: false, error: 'Game launch URLs must use the secure https: protocol.' };
        }

        // Approved game hosting domain whitelist
        const hostname = parsed.hostname.toLowerCase();
        const isAllowedHost =
          hostname === 'nexusplay.gg' ||
          hostname.endsWith('.nexusplay.gg') ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.endsWith('.nexusgames.net') ||
          hostname.endsWith('.obsidianarcade.com');

        if (!isAllowedHost) {
          return {
            valid: false,
            error: `External game host '${hostname}' is not authorized. Launch URLs must be hosted on official NexusPlay domains (*.nexusplay.gg) or approved distribution partners.`
          };
        }

        return { valid: true, cleanUrl: parsed.toString() };
      } catch (e) {
        return { valid: false, error: 'Malformed HTTPS launch URL format.' };
      }
    }

    return { valid: false, error: 'Launch URL must be an internal path (starting with /games/...) or a secure HTTPS URL from an authorized host.' };
  }

  /**
   * Helper: Validate game fields according to acceptance criteria
   * AC-10.2: Mandatory metadata missing -> rejected with field-specific feedback
   * AC-35.2: Required field is blank -> validation prevents incomplete listing
   */
  validateGamePayload(payload, { isCreate }) {
    const errors = {};

    if (!payload || typeof payload !== 'object') {
      return { general: 'Request body must be a valid JSON object.' };
    }

    const {
      title,
      slug,
      categoryId,
      description,
      launchUrl,
      minPlayers,
      maxPlayers
    } = payload;

    // Title validation (3 - 100 chars)
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.title = 'Title is mandatory and cannot be blank.';
    } else if (title.trim().length < 3 || title.trim().length > 100) {
      errors.title = 'Title must be between 3 and 100 characters.';
    }

    // Slug validation (alphanumeric + hyphen, 3 - 60 chars)
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      errors.slug = 'Slug is mandatory and cannot be blank.';
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug.trim())) {
      errors.slug = 'Slug must consist only of alphanumeric characters and hyphens (e.g. quantum-grid).';
    } else if (slug.trim().length < 3 || slug.trim().length > 60) {
      errors.slug = 'Slug must be between 3 and 60 characters.';
    }

    // Category ID validation
    if (!categoryId || typeof categoryId !== 'string' || categoryId.trim().length === 0) {
      errors.categoryId = 'Category selection is mandatory.';
    }

    // Description validation (10 - 1000 chars)
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      errors.description = 'Description is mandatory and cannot be blank.';
    } else if (description.trim().length < 10 || description.trim().length > 1000) {
      errors.description = 'Description must be between 10 and 1000 characters.';
    }

    // Launch URL validation with comprehensive security controls (Task 2)
    const urlValidation = this.validateLaunchUrlSecurity(launchUrl);
    if (!urlValidation.valid) {
      errors.launchUrl = urlValidation.error;
    }

    // Min & Max Players validation
    if (minPlayers !== undefined) {
      const minP = parseInt(minPlayers, 10);
      if (isNaN(minP) || minP < 1) {
        errors.minPlayers = 'Minimum players must be an integer of 1 or greater.';
      }
    }

    if (maxPlayers !== undefined) {
      const maxP = parseInt(maxPlayers, 10);
      const minP = parseInt(minPlayers, 10) || 1;
      if (isNaN(maxP) || maxP < 1) {
        errors.maxPlayers = 'Maximum players must be an integer of 1 or greater.';
      } else if (maxP < minP) {
        errors.maxPlayers = 'Maximum players cannot be less than minimum players.';
      }
    }

    return errors;
  }

  /**
   * Helper: Format internal game representation for admin responses
   */
  formatAdminGame(row) {
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
      category: row.cat_id ? {
        id: row.cat_id,
        name: row.category_name,
        slug: row.category_slug
      } : null,
      licensing: {
        id: row.licensing_id || null,
        status: row.licensing_status || 'pending',
        approvedBy: row.approved_by || null,
        approvedAt: row.approved_at || null,
        notes: row.licensing_notes || null
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

let contentAdminInstance = null;

function getContentAdminService(customDb) {
  if (!contentAdminInstance || customDb) {
    const { getDb } = require('../../db');
    const db = customDb || getDb();
    contentAdminInstance = new ContentAdminService(db);
  }
  return contentAdminInstance;
}

module.exports = {
  ContentAdminService,
  getContentAdminService
};
