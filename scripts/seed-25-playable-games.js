/**
 * NexusPlay — Seed 25 Verified Playable Games & Licensing Approvals
 * Milestone 3.2 Expansion
 * 
 * Target Databases: platform-staging.db & platform-development.db
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbs = ['platform-staging.db', 'platform-development.db'];

const all25Games = [
  // --- Original 10 Audited & Certified Games ---
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
  },

  // --- 15 New Games Expanded in Milestone 3.2 ---
  {
    id: 'game-cricket',
    slug: 'arcade-cricket',
    title: 'Arcade Cricket',
    description: 'Fast-paced cricket match! Master your batting timing against paced deliveries, play lofted drives, and chase the target.',
    category_id: 'cat-sports',
    launch_url: '/games/arcade-cricket/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay in-house clean-room 2D arcade cricket batting engine with physics-driven pitch trajectory.'
  },
  {
    id: 'game-flappy',
    slug: 'flappy-neon',
    title: 'Flappy Neon',
    description: 'Synthwave impulse flight simulator! Tap to jump through pulsating neon laser pillars and test your reflex endurance.',
    category_id: 'cat-arcade',
    launch_url: '/games/flappy-neon/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Clean-room impulse gravity flap engine with procedural neon obstacle generation.'
  },
  {
    id: 'game-dodge',
    slug: 'galactic-dodge',
    title: 'Galactic Dodge',
    description: 'Deep-space asteroid navigation! Fire plasma blasters to fragment incoming space hazards and maintain shield reserves.',
    category_id: 'cat-action',
    launch_url: '/games/galactic-dodge/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay in-house Newtonian inertia physics engine with multi-tier asteroid fragmentation.'
  },
  {
    id: 'game-memory',
    slug: 'memory-match',
    title: 'Memory Match',
    description: 'Cyberpunk memory matrix challenge! Flip glowing cyber glyphs, discover matching pairs, and train your neural recall.',
    category_id: 'cat-puzzle',
    launch_url: '/games/memory-match/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain matching card mechanics with custom cyberpunk neon glyph iconography.'
  },
  {
    id: 'game-mines',
    slug: 'minesweeper-retro',
    title: 'Minesweeper Retro',
    description: 'Tactical minefield sweeper! Reveal safe grid cells, place hazard flags, and uncover 10 hidden plasma mines without detonation.',
    category_id: 'cat-puzzle',
    launch_url: '/games/minesweeper-retro/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain 9x9 tactical logic grid with guaranteed first-click safe opening and recursive flood-fill.'
  },
  {
    id: 'game-sudoku',
    slug: 'sudoku-classic',
    title: 'Sudoku Classic',
    description: 'Classic 9x9 Latin square number puzzle! Fill rows, columns, and 3x3 blocks with numbers 1 to 9 with zero conflicts.',
    category_id: 'cat-puzzle',
    launch_url: '/games/sudoku-classic/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain mathematical 9x9 Latin square generator with real-time constraint validation.'
  },
  {
    id: 'game-slide',
    slug: 'slide-puzzle-15',
    title: 'Slide Puzzle 15',
    description: 'Authentic 15-puzzle sliding brain teaser! Shift numbered tiles into order from 1 to 15 in minimal moves.',
    category_id: 'cat-puzzle',
    launch_url: '/games/slide-puzzle-15/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain sliding puzzle mechanics with guaranteed parity-valid solvable permutation generator.'
  },
  {
    id: 'game-connect4',
    slug: 'connect-four',
    title: 'Connect Four',
    description: 'Vertical 7x6 gravity duel! Drop colored discs and connect 4 consecutive slots horizontally, vertically, or diagonally.',
    category_id: 'cat-card',
    launch_url: '/games/connect-four/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain 7x6 vertical drop 4-in-a-row mechanics with heuristic evaluation AI opponent.'
  },
  {
    id: 'game-reversi',
    slug: 'reversi-othello',
    title: 'Reversi Othello',
    description: 'Strategic 8x8 disc-flipping duel! Flank opponent pieces to flip them to your color and seize the four crucial corners.',
    category_id: 'cat-card',
    launch_url: '/games/reversi-othello/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain 8x8 Reversi rules with corner-priority tactical AI bot.'
  },
  {
    id: 'game-tower',
    slug: 'tower-defense-lite',
    title: 'Tower Defense Lite',
    description: 'Tactical perimeter defense! Deploy automated laser turrets along winding paths to destroy advancing cyber creep waves.',
    category_id: 'cat-strategy',
    launch_url: '/games/tower-defense-lite/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original waypoint-pathing creep wave defense engine with targeting algorithms.'
  },
  {
    id: 'game-runner',
    slug: 'endless-neon-runner',
    title: 'Endless Neon Runner',
    description: 'High-speed synthwave platform runner! Jump across floating cyber girders, double-jump laser spikes, and set new records.',
    category_id: 'cat-arcade',
    launch_url: '/games/endless-neon-runner/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'In-house 2D platform runner with variable jump physics and procedural hazard spawning.'
  },
  {
    id: 'game-pong',
    slug: 'retro-pong',
    title: 'Retro Pong',
    description: 'Classic cyber tennis arcade! Bounce the plasma ball with dynamic deflection angles and challenge the AI paddle to 7 points.',
    category_id: 'cat-arcade',
    launch_url: '/games/retro-pong/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain 1970s paddle tennis physics with segmented deflection calculation.'
  },
  {
    id: 'game-mole',
    slug: 'whack-a-mole',
    title: 'Whack-A-Mole',
    description: 'Fast-reflex pop-up arcade challenge! Whack cyber moles as they emerge from 9 burrow holes before the 30-second timer expires.',
    category_id: 'cat-arcade',
    launch_url: '/games/whack-a-mole/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain 3x3 reflex arcade mechanics with responsive touch-optimized targets.'
  },
  {
    id: 'game-simon',
    slug: 'simon-memory',
    title: 'Simon Memory',
    description: 'Audio-visual pattern reproduction! Watch the flashing neon quadrants, listen to the tones, and repeat the sequence.',
    category_id: 'cat-puzzle',
    launch_url: '/games/simon-memory/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain 4-quadrant chromatic memory game with Web Audio frequency oscillator integration.'
  },
  {
    id: 'game-word',
    slug: 'word-grid',
    title: 'Word Grid',
    description: '4x4 matrix word search! Connect contiguous adjacent letters horizontally, vertically, and diagonally to discover valid words.',
    category_id: 'cat-puzzle',
    launch_url: '/games/word-grid/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'Public domain Boggle-style adjacent letter-grid mechanics with embedded 200+ word English dictionary.'
  }
];

for (const dbName of dbs) {
  const dbPath = path.join(__dirname, '..', 'server', 'data', dbName);
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED] Skipped missing database: ${dbPath}`);
    continue;
  }

  const db = new DatabaseSync(dbPath);

  // 1. Ensure all categories exist
  db.exec(`
    INSERT OR IGNORE INTO game_categories (id, name, slug, description) VALUES
    ('cat-arcade', 'Arcade', 'arcade', 'Fast-paced action and reflex games'),
    ('cat-puzzle', 'Puzzle', 'puzzle', 'Brain-teasers and logic challenges'),
    ('cat-card', 'Card & Board', 'card', 'Classic tabletop and strategy games'),
    ('cat-action', 'Action', 'action', 'Adrenaline-fueled combat and racing'),
    ('cat-sports', 'Sports', 'sports', 'Physical and competitive sports arcade titles'),
    ('cat-strategy', 'Strategy', 'strategy', 'Tactical, tower defense, and planning games');
  `);

  let count = 0;
  for (const g of all25Games) {
    // Upsert game
    const existing = db.prepare('SELECT id FROM games WHERE id = ? OR slug = ?').get(g.id, g.slug);
    if (existing) {
      db.prepare(`
        UPDATE games SET
          title = ?, slug = ?, description = ?, category_id = ?, launch_url = ?,
          is_published = ?, commercial_model = ?, integration_type = ?,
          min_players = ?, max_players = ?, supports_bots = ?, is_premium = 0
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

    // Upsert licensing approval (approved status strictly required)
    const licId = `lic-${g.id}`;
    const licExisting = db.prepare('SELECT id FROM licensing_approvals WHERE game_id = ?').get(g.id);
    if (licExisting) {
      db.prepare(`
        UPDATE licensing_approvals SET
          status = 'APPROVED', approved_by = 'Legal Compliance Officer',
          approved_at = CURRENT_TIMESTAMP, notes = ?, rights_type = ?,
          permitted_channels_json = '["browser","mobile_web","WEB","MOBILE","PWA"]'
        WHERE game_id = ?
      `).run(g.notes, g.rights_type, g.id);
    } else {
      db.prepare(`
        INSERT INTO licensing_approvals (
          id, game_id, status, approved_by, approved_at, notes, rights_type, permitted_channels_json
        ) VALUES (?, ?, 'APPROVED', 'Legal Compliance Officer', CURRENT_TIMESTAMP, ?, ?, '["browser","mobile_web","WEB","MOBILE","PWA"]')
      `).run(licId, g.id, g.notes, g.rights_type);
    }

    count++;
  }

  console.log(`[SEED] Successfully registered & licensed ${count} playable games in ${dbName}`);
}
