/**
 * NexusPlay — Seed 75 Verified Playable Games & Licensing Approvals
 * Milestone 3.4 Expansion to 75 Playable Titles
 * 
 * Target Databases: platform-staging.db & platform-development.db
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbs = ['platform-staging.db', 'platform-development.db'];

// Re-use first 50 games from seed-50-playable-games.js
const seed50Content = fs.readFileSync(path.join(__dirname, 'seed-50-playable-games.js'), 'utf8');
const match = seed50Content.match(/const all50Games = (\[[\s\S]*?\]);\s*for \(const dbName/);
if (!match) {
  throw new Error('Could not parse all50Games from seed-50-playable-games.js');
}

// Evaluate existing 50 games safely
const all50Games = eval(match[1]);

// 25 New Games (51 - 75)
const new25Games = [
  // --- Batch 1: Advanced Sports (51 - 55) ---
  {
    id: 'game-051',
    slug: 'badminton-challenge',
    title: 'Badminton Challenge',
    description: 'Fast-paced badminton court duel! Time high clears, drop shots, and smash volleys against responsive AI.',
    category_id: 'cat-sports',
    launch_url: '/games/badminton-challenge/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original in-house 2D shuttlecock physics and court rally engine.'
  },
  {
    id: 'game-052',
    slug: 'tennis-championship',
    title: 'Tennis Championship',
    description: 'Championship grass court tennis. Master baseline topspin groundstrokes, slice serves, and net approaches.',
    category_id: 'cat-sports',
    launch_url: '/games/tennis-championship/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original tennis ball flight aerodynamics and racket collision model.'
  },
  {
    id: 'game-053',
    slug: 'hockey-shootout',
    title: 'Hockey Shootout',
    description: 'Sudden-death ice hockey shootout! Deek the goaltender, aim for top corners, and stop opposing pucks.',
    category_id: 'cat-sports',
    launch_url: '/games/hockey-shootout/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original puck slide friction and goalie reaction timing simulation.'
  },
  {
    id: 'game-054',
    slug: 'cricket-super-over',
    title: 'Cricket Super Over',
    description: 'High-octane 6-ball cricket tiebreaker! Hit maximum sixes, pick batting gaps, and defend your target score.',
    category_id: 'cat-sports',
    launch_url: '/games/cricket-super-over/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original cricket batting timing window and boundary trajectory physics.'
  },
  {
    id: 'game-055',
    slug: 'football-penalty-tournament',
    title: 'Football Penalty Tournament',
    description: 'Championship penalty shootout! Control shot angle, power, and curve, then switch to goalkeeper gloves.',
    category_id: 'cat-sports',
    launch_url: '/games/football-penalty-tournament/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original soccer ball trajectory and goalkeeper dive interception mechanics.'
  },

  // --- Batch 2: Racing & Driving + Casual (56 - 60) ---
  {
    id: 'game-056',
    slug: 'off-road-rally',
    title: 'Off-Road Rally',
    description: 'All-terrain buggy rally racing! Conquer muddy hairpin turns, rocky ridges, and beat the checkpoint clock.',
    category_id: 'cat-arcade',
    launch_url: '/games/off-road-rally/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original dirt rally vehicle suspension and loose surface slip physics.'
  },
  {
    id: 'game-057',
    slug: 'motorcycle-circuit',
    title: 'Motorcycle Circuit',
    description: 'Superbike circuit racing! Lean through apexes, manage throttle acceleration, and draft past competitors.',
    category_id: 'cat-arcade',
    launch_url: '/games/motorcycle-circuit/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original motorcycle lean angle physics and circuit lap sector timing.'
  },
  {
    id: 'game-058',
    slug: 'drift-championship',
    title: 'Drift Championship',
    description: 'Precision Japanese mountain touge drifting. Sustain high slip angles to maximize drift multiplier combos.',
    category_id: 'cat-arcade',
    launch_url: '/games/drift-championship/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original drift slip calculation and clipping point score multiplier.'
  },
  {
    id: 'game-059',
    slug: 'traffic-escape',
    title: 'Traffic Escape',
    description: 'Gridlock traffic escape puzzle! Guide backed-up cars out of congested intersections without fender benders.',
    category_id: 'cat-puzzle',
    launch_url: '/games/traffic-escape/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original vehicle direction escape path logic and collision avoidance.'
  },
  {
    id: 'game-060',
    slug: 'mini-golf-duel',
    title: 'Mini Golf Duel',
    description: 'Charming mini-golf courses with bank shots, ramps, tunnels, and wind hazards. Sink the ball under par!',
    category_id: 'cat-sports',
    launch_url: '/games/mini-golf-duel/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original ball restitution, banking wall deflection, and green friction physics.'
  },

  // --- Batch 3: Action & Adventure (61 - 65) ---
  {
    id: 'game-061',
    slug: 'top-down-arena-survival',
    title: 'Top-Down Arena Survival',
    description: '360-degree twin-stick arena shooter! Blast endless swarms of rogue cyber drones and upgrade weapon systems.',
    category_id: 'cat-action',
    launch_url: '/games/top-down-arena-survival/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original top-down twin-stick projectile physics and wave swarm AI.'
  },
  {
    id: 'game-062',
    slug: 'robot-combat-arena',
    title: 'Robot Combat Arena',
    description: 'Armored combat bot arena deathmatch. Deploy spinning blades, pneumatic flippers, and electro-EMP shocks.',
    category_id: 'cat-action',
    launch_url: '/games/robot-combat-arena/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original battlebot kinetic collision math and arena hazard pit logic.'
  },
  {
    id: 'game-063',
    slug: 'platform-adventure',
    title: 'Platform Adventure',
    description: 'Side-scrolling retro platform adventure! Leap across crumbling ruins, collect power gems, and defeat sentries.',
    category_id: 'cat-arcade',
    launch_url: '/games/platform-adventure/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original side-scroller tile platformer with jump physics and moving platforms.'
  },
  {
    id: 'game-064',
    slug: 'stealth-maze-mission',
    title: 'Stealth Maze Mission',
    description: 'Top-down tactical espionage! Evade searchlight vision cones, hack security terminals, and escape unseen.',
    category_id: 'cat-action',
    launch_url: '/games/stealth-maze-mission/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original raycast sight-cone stealth detection and alert level state machine.'
  },
  {
    id: 'game-065',
    slug: 'space-boss-battle',
    title: 'Space Boss Battle',
    description: 'Intense cosmic boss showdown! Weave through bullet-hell orbital barrages and shatter multi-stage boss armor.',
    category_id: 'cat-action',
    launch_url: '/games/space-boss-battle/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original multi-phase boss state engine and radial bullet pattern generator.'
  },

  // --- Batch 4: Strategy & Simulation (66 - 70) ---
  {
    id: 'game-066',
    slug: 'tactical-grid-battle',
    title: 'Tactical Grid Battle',
    description: 'Turn-based tactical squad warfare! Position riflemen, snipers, and mech units with terrain cover bonuses.',
    category_id: 'cat-strategy',
    launch_url: '/games/tactical-grid-battle/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original turn-based grid combat, line-of-sight cover, and action point system.'
  },
  {
    id: 'game-067',
    slug: 'mini-city-builder',
    title: 'Mini City Builder',
    description: 'Cozy isometric city development! Zone residential, commercial, and industrial plots while balancing power and water.',
    category_id: 'cat-simulation',
    launch_url: '/games/mini-city-builder/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original isometric grid renderer, zoning demand simulation, and municipal economy.'
  },
  {
    id: 'game-068',
    slug: 'naval-commander',
    title: 'Naval Commander',
    description: 'Real-time tactical fleet battles! Command destroyers, cruisers, and aircraft carriers across open water sectors.',
    category_id: 'cat-strategy',
    launch_url: '/games/naval-commander/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original naval combat radar tracking, torpedo trajectory, and fleet positioning.'
  },
  {
    id: 'game-069',
    slug: 'resource-defense',
    title: 'Resource Defense',
    description: 'Mine energy crystals, build perimeter defenses, and withstand waves of subterranean bio-creatures.',
    category_id: 'cat-strategy',
    launch_url: '/games/resource-defense/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original real-time resource extraction and defensive perimeter turret logistics.'
  },
  {
    id: 'game-070',
    slug: 'arena-tag',
    title: 'Arena Tag',
    description: 'Fast-paced arena tag! Run, jump, and weave through obstacles to avoid the IT runner or tag opponents.',
    category_id: 'cat-arcade',
    launch_url: '/games/arena-tag/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 4,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original multi-agent tag pursuit AI and boost-pad arena navigation.'
  },

  // --- Batch 5: Creative Puzzle, Skill & Party (71 - 75) ---
  {
    id: 'game-071',
    slug: 'four-player-party-challenge',
    title: 'Four-Player Party Challenge',
    description: 'Turn-based digital board game! Roll dice, trigger action mini-events, and race to claim 50 golden stars.',
    category_id: 'cat-card',
    launch_url: '/games/four-player-party-challenge/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 4,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original digital board game party engine with turn rotation and mini-event triggers.'
  },
  {
    id: 'game-072',
    slug: 'physics-marble-maze',
    title: 'Physics Marble Maze',
    description: 'Tilt the wooden maze table! Roll the metallic ball through labyrinths while avoiding treacherous holes.',
    category_id: 'cat-puzzle',
    launch_url: '/games/physics-marble-maze/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original accelerometer/joystick table-tilt physics and ball inertia simulation.'
  },
  {
    id: 'game-073',
    slug: 'chess-puzzle-challenges',
    title: 'Chess Puzzle Challenges',
    description: 'Tactical chess problems: Mate in 1, Mate in 2, and decisive tactical combinations across grandmaster puzzles.',
    category_id: 'cat-card',
    launch_url: '/games/chess-puzzle-challenges/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'PUBLIC_DOMAIN_RULES',
    notes: 'Standard international chess rules. Curated tactical puzzle engine with legal move validation.'
  },
  {
    id: 'game-074',
    slug: 'logic-circuit-builder',
    title: 'Logic Circuit Builder',
    description: 'Connect AND, OR, NOT, and XOR logic gates to build digital circuits that satisfy target truth tables.',
    category_id: 'cat-puzzle',
    launch_url: '/games/logic-circuit-builder/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original Boolean logic graph evaluation engine with interactive wire routing.'
  },
  {
    id: 'game-075',
    slug: 'rhythm-reflex-challenge',
    title: 'Rhythm Reflex Challenge',
    description: 'Synthwave 4-lane rhythm tapping! Hit beat notes precisely as they cross the strike bar to sustain combos.',
    category_id: 'cat-arcade',
    launch_url: '/games/rhythm-reflex-challenge/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay original audio-reactive 4-track beat synchronization and combo multiplier engine.'
  }
];

const all75Games = [...all50Games, ...new25Games];

for (const dbName of dbs) {
  const dbPath = path.join(__dirname, '..', 'server', 'data', dbName);
  if (!fs.existsSync(dbPath)) {
    console.log(`Database ${dbName} does not exist at ${dbPath}, skipping.`);
    continue;
  }

  const db = new DatabaseSync(dbPath);
  console.log(`[SEED] Seeding 75 playable games into ${dbName}...`);

  let count = 0;
  for (const g of all75Games) {
    const existing = db.prepare('SELECT id FROM games WHERE id = ? OR slug = ?').get(g.id, g.slug);
    let targetGameId = g.id;

    if (existing) {
      targetGameId = existing.id;
      db.prepare(`
        UPDATE games SET
          title = ?, slug = ?, description = ?, category_id = ?, launch_url = ?,
          is_published = ?, commercial_model = ?, integration_type = ?,
          min_players = ?, max_players = ?, supports_bots = ?
        WHERE id = ?
      `).run(
        g.title, g.slug, g.description, g.category_id, g.launch_url,
        g.is_published, g.commercial_model, g.integration_type,
        g.min_players, g.max_players, g.supports_bots,
        existing.id
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
    const licId = `lic-${targetGameId}`;
    const licExisting = db.prepare('SELECT id FROM licensing_approvals WHERE game_id = ?').get(targetGameId);
    if (licExisting) {
      db.prepare(`
        UPDATE licensing_approvals SET
          status = 'APPROVED', approved_by = 'Legal Compliance Officer',
          approved_at = CURRENT_TIMESTAMP, notes = ?, rights_type = ?,
          permitted_channels_json = '["browser","mobile_web","WEB","MOBILE","PWA"]'
        WHERE game_id = ?
      `).run(g.notes, g.rights_type, targetGameId);
    } else {
      db.prepare(`
        INSERT INTO licensing_approvals (
          id, game_id, status, approved_by, approved_at, notes, rights_type, permitted_channels_json
        ) VALUES (?, ?, 'APPROVED', 'Legal Compliance Officer', CURRENT_TIMESTAMP, ?, ?, '["browser","mobile_web","WEB","MOBILE","PWA"]')
      `).run(licId, targetGameId, g.notes, g.rights_type);
    }

    count++;
  }

  console.log(`[SEED] Successfully registered & licensed ${count} playable games in ${dbName}`);
}

console.log(`\nALL 75 PLAYABLE TITLES SEEDED AND LICENSED SUCCESSFULLY.`);
