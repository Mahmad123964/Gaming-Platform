/**
 * NexusPlay — Seed 10 Verified Playable Games & Licensing Approvals
 * 
 * Target Databases: platform-staging.db & platform-development.db
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbs = ['platform-staging.db', 'platform-development.db'];

const playableGames = [
  {
    id: 'game-001',
    slug: 'cyber-invaders',
    title: 'Cyber Invaders',
    description: 'Battle waves of alien warships in this high-octane 2D arcade space shooter. Defend the orbital grid!',
    category_id: 'cat-arcade',
    launch_url: '/games/cyber-invaders/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original in-house HTML5 canvas space arcade engine.'
  },
  {
    id: 'game-2048',
    slug: '2048-classic',
    title: '2048 Classic',
    description: 'Slide numbered tiles on a 4x4 grid. Combine matching numbers to reach the legendary 2048 tile!',
    category_id: 'cat-puzzle',
    launch_url: '/games/2048/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OPEN_SOURCE_MIT',
    notes: 'MIT License by Gabriele Cirulli. Redistribution and hosting authorized with attribution preserved.'
  },
  {
    id: 'game-snake',
    slug: 'snake-arcade',
    title: 'Snake Arcade',
    description: 'Classic retro grid snake! Slither, eat energy fruit, grow longer and avoid colliding with walls or yourself.',
    category_id: 'cat-arcade',
    launch_url: '/games/snake-arcade/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original in-house clean-room implementation of classic snake mechanics.'
  },
  {
    id: 'game-breaker',
    slug: 'brick-breaker',
    title: 'Brick Breaker',
    description: 'Control the laser paddle, bounce the plasma ball, and shatter tiers of neon defensive bricks.',
    category_id: 'cat-arcade',
    launch_url: '/games/brick-breaker/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original in-house breakout canvas physics engine.'
  },
  {
    id: 'game-tictactoe',
    slug: 'tic-tac-toe-pro',
    title: 'Tic-Tac-Toe Pro',
    description: '3x3 grid duel with glowing marks! Challenge an unbeatable neural Minimax AI bot or play with a local friend.',
    category_id: 'cat-card',
    launch_url: '/games/tic-tac-toe-pro/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain traditional game rules. In-house Minimax AI bot implementation.'
  },
  {
    id: 'game-checkers',
    slug: 'classic-checkers',
    title: 'Classic Checkers',
    description: 'Traditional 8x8 draughts tactical board. Jump opponent pieces, crown your kings, and clear the board.',
    category_id: 'cat-card',
    launch_url: '/games/classic-checkers/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain traditional English draughts rules. In-house tactical bot engine.'
  },
  {
    id: 'game-008',
    slug: 'solitaire-royale',
    title: 'Solitaire Royale',
    description: 'Standard 52-card Klondike Solitaire. Build 4 suit foundations from Ace to King with alternating tableau cascades.',
    category_id: 'cat-card',
    launch_url: '/games/solitaire-royale/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain traditional card rules. NexusPlay clean-room Klondike engine.'
  },
  {
    id: 'game-block-puzzle',
    slug: 'block-puzzle',
    title: 'Block Puzzle',
    description: 'Align falling polyomino blocks in a 10x20 matrix. Clear full horizontal lines and trigger multi-line combos.',
    category_id: 'cat-puzzle',
    launch_url: '/games/block-puzzle/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Clean-room generic polyomino puzzle engine using public domain mechanics.'
  },
  {
    id: 'game-bubble-shooter',
    slug: 'bubble-shooter',
    title: 'Bubble Shooter',
    description: 'Aim your plasma turret and launch colored bubbles. Match 3 or more contiguous colors to trigger massive cluster pops!',
    category_id: 'cat-puzzle',
    launch_url: '/games/bubble-shooter/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Clean-room cluster match arcade engine using public domain bounce and flood-fill mechanics.'
  },
  {
    id: 'game-neon-racer',
    slug: 'neon-racer',
    title: 'Neon Racer',
    description: 'Synthwave 2D top-down highway speed runner. Weave through heavy traffic, collect energy cells, and survive the rush!',
    category_id: 'cat-arcade',
    launch_url: '/games/neon-racer/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay in-house 2D top-down cyberpunk highway speed runner engine.'
  }
];

for (const dbName of dbs) {
  const dbPath = path.join(__dirname, '..', 'server', 'data', dbName);
  if (!fs.existsSync(dbPath)) continue;

  const db = new DatabaseSync(dbPath);

  // Ensure category exists
  db.exec(`
    INSERT OR IGNORE INTO game_categories (id, name, slug, description) VALUES
    ('cat-arcade', 'Arcade', 'arcade', 'Fast-paced action and reflex games'),
    ('cat-puzzle', 'Puzzle', 'puzzle', 'Brain-teasers and logic challenges'),
    ('cat-card', 'Card & Board', 'card', 'Classic tabletop and strategy games'),
    ('cat-action', 'Action', 'action', 'Adrenaline-fueled combat and racing');
  `);

  for (const g of playableGames) {
    // Upsert game
    const existing = db.prepare('SELECT id FROM games WHERE id = ? OR slug = ?').get(g.id, g.slug);
    if (existing) {
      db.prepare(`
        UPDATE games SET
          title = ?, slug = ?, description = ?, category_id = ?, launch_url = ?,
          is_published = ?, commercial_model = ?, integration_type = ?,
          min_players = ?, max_players = ?, supports_bots = ?
        WHERE id = ? OR slug = ?
      `).run(
        g.title, g.slug, g.description, g.category_id, g.launch_url,
        g.is_published, g.commercial_model, g.integration_type,
        g.min_players, g.max_players, g.supports_bots,
        g.id, g.slug
      );
    } else {
      db.prepare(`
        INSERT INTO games (
          id, title, slug, description, category_id, launch_url,
          is_published, commercial_model, integration_type,
          min_players, max_players, supports_bots, is_premium
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        g.id, g.title, g.slug, g.description, g.category_id, g.launch_url,
        g.is_published, g.commercial_model, g.integration_type,
        g.min_players, g.max_players, g.supports_bots
      );
    }

    // Upsert licensing approval
    const licId = `lic-${g.id}`;
    const licExisting = db.prepare('SELECT id FROM licensing_approvals WHERE game_id = ?').get(g.id);
    if (licExisting) {
      db.prepare(`
        UPDATE licensing_approvals SET
          status = 'APPROVED', approved_by = 'Legal Compliance Officer',
          approved_at = CURRENT_TIMESTAMP, notes = ?, rights_type = ?,
          permitted_channels_json = '["browser","mobile_web"]'
        WHERE game_id = ?
      `).run(g.notes, g.rights_type, g.id);
    } else {
      db.prepare(`
        INSERT INTO licensing_approvals (
          id, game_id, status, approved_by, approved_at, notes, rights_type, permitted_channels_json
        ) VALUES (?, ?, 'APPROVED', 'Legal Compliance Officer', CURRENT_TIMESTAMP, ?, ?, '["browser","mobile_web"]')
      `).run(licId, g.id, g.notes, g.rights_type);
    }
  }

  console.log(`[SEED] Successfully registered & licensed 10 playable games in ${dbName}`);
}
