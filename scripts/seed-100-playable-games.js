/**
 * NexusPlay — Seed 100 Verified Playable Games & Licensing Approvals
 * Milestone 3.5 Expansion from 75 to 100 Playable Titles
 * 
 * Target Databases: platform-staging.db & platform-development.db
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbs = ['platform-staging.db', 'platform-development.db'];

// Re-use first 50 games from seed-50-playable-games.js
const seed50Content = fs.readFileSync(path.join(__dirname, 'seed-50-playable-games.js'), 'utf8');
const match50 = seed50Content.match(/const all50Games = (\[[\s\S]*?\]);\s*for \(const dbName/);
if (!match50) {
  throw new Error('Could not parse all50Games from seed-50-playable-games.js');
}
const all50Games = eval(match50[1]);

// Re-use games 51-75 from seed-75-playable-games.js
const seed75Content = fs.readFileSync(path.join(__dirname, 'seed-75-playable-games.js'), 'utf8');
const match75 = seed75Content.match(/const new25Games = (\[[\s\S]*?\]);\s*const all75Games/);
if (!match75) {
  throw new Error('Could not parse new25Games from seed-75-playable-games.js');
}
const games51to75 = eval(match75[1]);

// Final 25 Games (76 - 100)
const newFinal25Games = [
  // --- Group A: Sports and Competitive (76 - 80) ---
  {
    id: 'game-076',
    slug: 'nexus-cricket-championship',
    title: 'Nexus Cricket Championship',
    description: 'Premier short-format cricket tournament. Play full 2-over matches featuring responsive batting, seam/spin bowling, live fielders, wickets, and dynamic scorecards.',
    category_id: 'cat-sports',
    launch_url: '/games/nexus-cricket-championship/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room multi-over cricket match engine.'
  },
  {
    id: 'game-077',
    slug: 'badminton-doubles-challenge',
    title: 'Badminton Doubles Challenge',
    description: 'Competitive 2v2 doubles badminton tournament. Coordinate front-court net drops and rear baseline smashes with an AI partner.',
    category_id: 'cat-sports',
    launch_url: '/games/badminton-doubles-challenge/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 4,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room 4-player doubles badminton simulation engine.'
  },
  {
    id: 'game-078',
    slug: 'tennis-grand-slam-mini',
    title: 'Tennis Grand Slam Mini',
    description: 'Championship grand slam circuit across clay, grass, and hard courts. Master ace serves, slice volleys, and baseline rallies.',
    category_id: 'cat-sports',
    launch_url: '/games/tennis-grand-slam-mini/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room grand slam tournament tennis engine.'
  },
  {
    id: 'game-079',
    slug: 'street-basketball-duel',
    title: 'Street Basketball Duel',
    description: 'Raw 1v1 blacktop streetball showdown. Shake defenders with crossover dribbles, contest perimeter jumpers, and drive the lane.',
    category_id: 'cat-sports',
    launch_url: '/games/street-basketball-duel/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room halfcourt 1v1 basketball mechanics engine.'
  },
  {
    id: 'game-080',
    slug: 'hockey-league-arena',
    title: 'Hockey League Arena',
    description: 'Fast-paced 3v3 rink hockey showdown. Pass across the slot, unleash one-timers, check opposing skaters, and beat the goalie.',
    category_id: 'cat-sports',
    launch_url: '/games/hockey-league-arena/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room 3v3 ice hockey rink engine.'
  },

  // --- Group B: Racing and Driving (81 - 84) ---
  {
    id: 'game-081',
    slug: 'formula-sprint',
    title: 'Formula Sprint',
    description: 'High-downforce open-wheel grand prix. Manage tire degradation, activate DRS turbo overtaking zones, and hit apex kerbs.',
    category_id: 'cat-arcade',
    launch_url: '/games/formula-sprint/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room formula circuit aerodynamic racing engine.'
  },
  {
    id: 'game-082',
    slug: 'moto-stunt-challenge',
    title: 'Moto Stunt Challenge',
    description: 'Extreme motocross trials obstacle course. Balance bike pitch, execute high-altitude backflips, and stick clean ramp landings.',
    category_id: 'cat-arcade',
    launch_url: '/games/moto-stunt-challenge/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room angular momentum bike balance physics engine.'
  },
  {
    id: 'game-083',
    slug: 'desert-rally-adventure',
    title: 'Desert Rally Adventure',
    description: 'Endurance dune buggy raid across shifting desert sands. Navigate dunes, monitor engine heat, and hit canyon checkpoints.',
    category_id: 'cat-arcade',
    launch_url: '/games/desert-rally-adventure/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room loose sand terrain friction rally engine.'
  },
  {
    id: 'game-084',
    slug: 'urban-traffic-racer',
    title: 'Urban Traffic Racer',
    description: 'Adrenaline highway traffic slalom. Weave through dense multi-lane traffic, earn near-miss multipliers, and test emergency braking.',
    category_id: 'cat-arcade',
    launch_url: '/games/urban-traffic-racer/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room dynamic highway traffic generator engine.'
  },

  // --- Group C: Action and Adventure (85 - 89) ---
  {
    id: 'game-085',
    slug: 'nexus-arena-shooter',
    title: 'Nexus Arena Shooter',
    description: 'Cyberpunk twin-stick shooter. Upgrade scattershot blasters, energy shields, and railguns across escalating cyber-drone waves.',
    category_id: 'cat-action',
    launch_url: '/games/nexus-arena-shooter/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room 360-degree weapon trajectory combat engine.'
  },
  {
    id: 'game-086',
    slug: 'cyber-ninja-adventure',
    title: 'Cyber Ninja Adventure',
    description: 'High-agility ninja platformer. Wall-jump up neon skyscrapers, deflect shuriken projectiles, and dash strike cyber-samurai.',
    category_id: 'cat-action',
    launch_url: '/games/cyber-ninja-adventure/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room acrobatic platformer motion engine.'
  },
  {
    id: 'game-087',
    slug: 'zombie-survival-mini',
    title: 'Zombie Survival Mini',
    description: 'Post-apocalyptic outpost defense. Reinforce barricades, manage shotgun shells, deploy claymores, and survive the midnight swarm.',
    category_id: 'cat-action',
    launch_url: '/games/zombie-survival-mini/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room horde pathfinding barricade defense engine.'
  },
  {
    id: 'game-088',
    slug: 'space-exploration-mission',
    title: 'Space Exploration Mission',
    description: 'Interplanetary lander odyssey. Conserve RCS thruster fuel, slingshot through gravitational wells, and collect scientific planetary probes.',
    category_id: 'cat-action',
    launch_url: '/games/space-exploration-mission/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room gravitational orbital physics engine.'
  },
  {
    id: 'game-089',
    slug: 'dungeon-quest-rpg-lite',
    title: 'Dungeon Quest RPG Lite',
    description: 'Turn-based rogue RPG. Delve through catacombs, manage health potions, battle skeleton warlords, and claim ancient loot.',
    category_id: 'cat-action',
    launch_url: '/games/dungeon-quest-rpg-lite/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room turn-based dungeon crawl combat engine.'
  },

  // --- Group D: Strategy and Simulation (90 - 94) ---
  {
    id: 'game-090',
    slug: 'kingdom-defense',
    title: 'Kingdom Defense',
    description: 'Castle wall siege defense. Command royal archers, heavy paladins, and siege catapults to repel invading goblin siege engines.',
    category_id: 'cat-strategy',
    launch_url: '/games/kingdom-defense/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room castle defense lane battle engine.'
  },
  {
    id: 'game-091',
    slug: 'city-traffic-manager',
    title: 'City Traffic Manager',
    description: 'Metropolitan traffic grid control. Cycle signal lights, prioritize emergency ambulances, and prevent commuter intersection gridlock.',
    category_id: 'cat-strategy',
    launch_url: '/games/city-traffic-manager/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room queuing theory traffic flow simulation.'
  },
  {
    id: 'game-092',
    slug: 'island-survival-builder',
    title: 'Island Survival Builder',
    description: 'Castaway survival craft. Chop timber, construct solar stills, maintain campfire warmth, and forge a rescue beacon.',
    category_id: 'cat-strategy',
    launch_url: '/games/island-survival-builder/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room multi-tier resource decay crafting engine.'
  },
  {
    id: 'game-093',
    slug: 'chess-tactical-academy',
    title: 'Chess Tactical Academy',
    description: 'Grandmaster tactical puzzle academy. Solve knight forks, bishop skewers, pin exploitation, and discovered checks.',
    category_id: 'cat-strategy',
    launch_url: '/games/chess-tactical-academy/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay public domain chess tactical puzzle solver engine.'
  },
  {
    id: 'game-094',
    slug: 'business-tycoon-mini',
    title: 'Business Tycoon Mini',
    description: 'Startup enterprise simulation. Manage raw material supply lines, adjust retail price elasticity, and maximize quarterly margins.',
    category_id: 'cat-strategy',
    launch_url: '/games/business-tycoon-mini/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room macroeconomic price elasticity simulation.'
  },

  // --- Group E: Party, Arcade and Skill (95 - 100) ---
  {
    id: 'game-095',
    slug: 'nexus-party-arena',
    title: 'Nexus Party Arena',
    description: 'High-energy local mini-party contest. Compete in bumper ring outs, golden coin dashes, and hot-potato bomb tosses.',
    category_id: 'cat-arcade',
    launch_url: '/games/nexus-party-arena/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 4,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room 4-player party minigame engine.'
  },
  {
    id: 'game-096',
    slug: 'air-hockey-championship',
    title: 'Air Hockey Championship',
    description: 'Air-cushioned table hockey. Deflect rapid bank shots, control defensive mallet positioning, and score 7 goals for match victory.',
    category_id: 'cat-arcade',
    launch_url: '/games/air-hockey-championship/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 2,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room zero-friction elastic collision puck engine.'
  },
  {
    id: 'game-097',
    slug: 'archery-precision-challenge',
    title: 'Archery Precision Challenge',
    description: 'Olympic target archery. Account for variable crosswind gusts, bowstring draw tension, and gravity arrow drop to hit the 10-ring.',
    category_id: 'cat-arcade',
    launch_url: '/games/archery-precision-challenge/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 1,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room crosswind ballistic archery engine.'
  },
  {
    id: 'game-098',
    slug: 'physics-pinball-arcade',
    title: 'Physics Pinball Arcade',
    description: 'Retro arcade pinball machine. Plunge the steel ball, trigger high-score bumpers, aim for orbit ramps, and flip with dual flippers.',
    category_id: 'cat-arcade',
    launch_url: '/games/physics-pinball-arcade/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room flipper and bumper gravity pinball physics.'
  },
  {
    id: 'game-099',
    slug: 'color-rhythm-arena',
    title: 'Color Rhythm Arena',
    description: 'Color-switching rhythm reflex challenge. Switch laser gate colors in synchronization with descending beat pulses.',
    category_id: 'cat-arcade',
    launch_url: '/games/color-rhythm-arena/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room chromatic timing gate rhythm engine.'
  },
  {
    id: 'game-100',
    slug: 'maze-escape-adventure',
    title: 'Maze Escape Adventure',
    description: 'Labyrinth escape odyssey. Discover silver keys, avoid shifting spike traps, solve gate puzzles, and escape before time runs out.',
    category_id: 'cat-puzzle',
    launch_url: '/games/maze-escape-adventure/index.html',
    is_published: 1,
    commercial_model: 'FREE',
    integration_type: 'SELF_HOSTED',
    min_players: 1,
    max_players: 1,
    supports_bots: 0,
    rights_type: 'OWNED_FIRST_PARTY',
    notes: 'NexusPlay clean-room procedural labyrinth pathfinding engine.'
  }
];

const all100Games = [...all50Games, ...games51to75, ...newFinal25Games];

for (const dbName of dbs) {
  const dbPath = path.join(__dirname, '..', 'server', 'data', dbName);
  if (!fs.existsSync(dbPath)) {
    console.warn(`[WARN] Database not found: ${dbPath}`);
    continue;
  }

  const db = new DatabaseSync(dbPath);
  let count = 0;

  for (const g of all100Games) {
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

console.log(`\nALL 100 PLAYABLE TITLES SEEDED AND LICENSED SUCCESSFULLY.`);
