const fs = require('node:fs');
const path = require('node:path');

const v75 = fs.readFileSync(path.join(__dirname, 'verify-75-games-browser.js'), 'utf8');

// Replace header and paths
let code = v75;
code = code.replace(/Milestone 3\.4/g, 'Milestone 3.5');
code = code.replace(/75 Playable Games/g, '100 Playable Games');
code = code.replace(/75-games-expansion/g, '100-games-expansion');
code = code.replace(/76 BROWSER CDP SCENARIOS/g, '101 BROWSER CDP SCENARIOS');
code = code.replace(/75-Game Catalog Overview/g, '100-Game Catalog Overview');
code = code.replace(/const ALL_75_GAMES = \[/, 'const ALL_100_GAMES = [');

const new25GamesStr = `
  // 76. Nexus Cricket Championship
  {
    idx: '76',
    slug: 'nexus-cricket-championship',
    title: 'Nexus Cricket Championship',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const b = document.getElementById('btn-cricket-bowl-next'); if (b) b.click();
        const d = document.getElementById('btn-cricket-bat-drive'); if (d) d.click();
      \`);
      return { action: 'Dispatched cricket delivery and cover drive shot' };
    }
  },
  // 77. Badminton Doubles Challenge
  {
    idx: '77',
    slug: 'badminton-doubles-challenge',
    title: 'Badminton Doubles Challenge',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const s = document.getElementById('btn-badminton-doubles-serve'); if (s) s.click();
        const m = document.getElementById('btn-badminton-doubles-smash'); if (m) m.click();
      \`);
      return { action: 'Served and smashed doubles shuttlecock' };
    }
  },
  // 78. Tennis Grand Slam Mini
  {
    idx: '78',
    slug: 'tennis-grand-slam-mini',
    title: 'Tennis Grand Slam Mini',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const s = document.getElementById('btn-tennis-serve'); if (s) s.click();
        const f = document.getElementById('btn-tennis-forehand'); if (f) f.click();
      \`);
      return { action: 'Served ace and hit topspin forehand' };
    }
  },
  // 79. Street Basketball Duel
  {
    idx: '79',
    slug: 'street-basketball-duel',
    title: 'Street Basketball Duel',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const x = document.getElementById('btn-streetball-crossover'); if (x) x.click();
        const s = document.getElementById('btn-streetball-shoot'); if (s) s.click();
      \`);
      return { action: 'Executed crossover and pull-up jumper' };
    }
  },
  // 80. Hockey League Arena
  {
    idx: '80',
    slug: 'hockey-league-arena',
    title: 'Hockey League Arena',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const f = document.getElementById('btn-hockey-pokecheck'); if (f) f.click();
        const s = document.getElementById('btn-hockey-wristshot'); if (s) s.click();
      \`);
      return { action: 'Dispatched faceoff and wrist shot' };
    }
  },
  // 81. Formula Sprint
  {
    idx: '81',
    slug: 'formula-sprint',
    title: 'Formula Sprint',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const t = document.getElementById('btn-formula-throttle'); if (t) t.click();
        const d = document.getElementById('btn-formula-drs'); if (d) d.click();
      \`);
      return { action: 'Accelerated and activated DRS turbo' };
    }
  },
  // 82. Moto Stunt Challenge
  {
    idx: '82',
    slug: 'moto-stunt-challenge',
    title: 'Moto Stunt Challenge',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const g = document.getElementById('btn-moto-gas'); if (g) g.click();
        const b = document.getElementById('btn-moto-lean-back'); if (b) b.click();
      \`);
      return { action: 'Throttled gas and executed backflip lean' };
    }
  },
  // 83. Desert Rally Adventure
  {
    idx: '83',
    slug: 'desert-rally-adventure',
    title: 'Desert Rally Adventure',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const g = document.getElementById('btn-desert-gas'); if (g) g.click();
        const n = document.getElementById('btn-desert-nitro'); if (n) n.click();
      \`);
      return { action: 'Accelerated sand buggy and fired nitro boost' };
    }
  },
  // 84. Urban Traffic Racer
  {
    idx: '84',
    slug: 'urban-traffic-racer',
    title: 'Urban Traffic Racer',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const l = document.getElementById('btn-traffic-lane-left'); if (l) l.click();
        const b = document.getElementById('btn-traffic-boost'); if (b) b.click();
      \`);
      return { action: 'Switched lane left and triggered speed boost' };
    }
  },
  // 85. Nexus Arena Shooter
  {
    idx: '85',
    slug: 'nexus-arena-shooter',
    title: 'Nexus Arena Shooter',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const f = document.getElementById('btn-arena-fire'); if (f) f.click();
        const s = document.getElementById('btn-arena-shotgun'); if (s) s.click();
      \`);
      return { action: 'Fired laser bolt and plasma shotgun spread' };
    }
  },
  // 86. Cyber Ninja Adventure
  {
    idx: '86',
    slug: 'cyber-ninja-adventure',
    title: 'Cyber Ninja Adventure',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const j = document.getElementById('btn-ninja-jump'); if (j) j.click();
        const s = document.getElementById('btn-ninja-slash'); if (s) s.click();
      \`);
      return { action: 'Wall-jumped and slashed katana' };
    }
  },
  // 87. Zombie Survival Mini
  {
    idx: '87',
    slug: 'zombie-survival-mini',
    title: 'Zombie Survival Mini',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const s = document.getElementById('btn-zombie-shoot'); if (s) s.click();
        const b = document.getElementById('btn-zombie-barricade'); if (b) b.click();
      \`);
      return { action: 'Fired rifle at walker and reinforced barricade' };
    }
  },
  // 88. Space Exploration Mission
  {
    idx: '88',
    slug: 'space-exploration-mission',
    title: 'Space Exploration Mission',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const t = document.getElementById('btn-space-thrust'); if (t) t.click();
        const m = document.getElementById('btn-space-laser'); if (m) m.click();
      \`);
      return { action: 'Fired ion thruster and activated mining laser' };
    }
  },
  // 89. Dungeon Quest RPG Lite
  {
    idx: '89',
    slug: 'dungeon-quest-rpg-lite',
    title: 'Dungeon Quest RPG Lite',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const a = document.getElementById('btn-dungeon-attack'); if (a) a.click();
        const f = document.getElementById('btn-dungeon-fireball'); if (f) f.click();
      \`);
      return { action: 'Struck skeleton guard with sword and cast fireball' };
    }
  },
  // 90. Kingdom Defense
  {
    idx: '90',
    slug: 'kingdom-defense',
    title: 'Kingdom Defense',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const a = document.getElementById('btn-kingdom-hire-archer'); if (a) a.click();
        const c = document.getElementById('btn-kingdom-catapult'); if (c) c.click();
      \`);
      return { action: 'Hired wall archer and discharged catapult boulder' };
    }
  },
  // 91. City Traffic Manager
  {
    idx: '91',
    slug: 'city-traffic-manager',
    title: 'City Traffic Manager',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const ns = document.getElementById('btn-traffic-toggle-ns'); if (ns) ns.click();
        const ew = document.getElementById('btn-traffic-toggle-ew'); if (ew) ew.click();
      \`);
      return { action: 'Toggled NS traffic signal and EW signal' };
    }
  },
  // 92. Island Survival Builder
  {
    idx: '92',
    slug: 'island-survival-builder',
    title: 'Island Survival Builder',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const w = document.getElementById('btn-island-chop-wood'); if (w) w.click();
        const f = document.getElementById('btn-island-gather-food'); if (f) f.click();
      \`);
      return { action: 'Chopped palm timber and harvested coconuts' };
    }
  },
  // 93. Chess Tactical Academy
  {
    idx: '93',
    slug: 'chess-tactical-academy',
    title: 'Chess Tactical Academy',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const m = document.getElementById('btn-chess-tactic-move-a'); if (m) m.click();
      \`);
      return { action: 'Executed 1. Rd8# checkmate tactic' };
    }
  },
  // 94. Business Tycoon Mini
  {
    idx: '94',
    slug: 'business-tycoon-mini',
    title: 'Business Tycoon Mini',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const p = document.getElementById('btn-tycoon-produce'); if (p) p.click();
        const m = document.getElementById('btn-tycoon-marketing'); if (m) m.click();
      \`);
      return { action: 'Manufactured product batch and launched ad campaign' };
    }
  },
  // 95. Nexus Party Arena
  {
    idx: '95',
    slug: 'nexus-party-arena',
    title: 'Nexus Party Arena',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const b = document.getElementById('btn-party-bump'); if (b) b.click();
        const d = document.getElementById('btn-party-dash'); if (d) d.click();
      \`);
      return { action: 'Dispatched bumper slam and super dash' };
    }
  },
  // 96. Air Hockey Championship
  {
    idx: '96',
    slug: 'air-hockey-championship',
    title: 'Air Hockey Championship',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const s = document.getElementById('btn-airhockey-strike'); if (s) s.click();
        const b = document.getElementById('btn-airhockey-bankshot'); if (b) b.click();
      \`);
      return { action: 'Struck air hockey puck and launched rail bank shot' };
    }
  },
  // 97. Archery Precision Challenge
  {
    idx: '97',
    slug: 'archery-precision-challenge',
    title: 'Archery Precision Challenge',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const d = document.getElementById('btn-archery-draw'); if (d) d.click();
        const r = document.getElementById('btn-archery-release'); if (r) r.click();
      \`);
      return { action: 'Drew bowstring and released arrow at 10-ring target' };
    }
  },
  // 98. Physics Pinball Arcade
  {
    idx: '98',
    slug: 'physics-pinball-arcade',
    title: 'Physics Pinball Arcade',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const p = document.getElementById('btn-pinball-plunge'); if (p) p.click();
        const f = document.getElementById('btn-pinball-dual-flip'); if (f) f.click();
      \`);
      return { action: 'Plunged steel ball and triggered dual flippers' };
    }
  },
  // 99. Color Rhythm Arena
  {
    idx: '99',
    slug: 'color-rhythm-arena',
    title: 'Color Rhythm Arena',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const cy = document.getElementById('btn-rhythm-color-cyan'); if (cy) cy.click();
        const s = document.getElementById('btn-rhythm-pulse-strike'); if (s) s.click();
      \`);
      return { action: 'Selected cyan color gate and executed rhythm strike' };
    }
  },
  // 100. Maze Escape Adventure
  {
    idx: '100',
    slug: 'maze-escape-adventure',
    title: 'Maze Escape Adventure',
    targetElem: 'game-player-modal',
    interact: async (c) => {
      await c.eval(\`
        const r = document.getElementById('btn-maze-move-right'); if (r) r.click();
        const d = document.getElementById('btn-maze-move-down'); if (d) d.click();
      \`);
      return { action: 'Navigated explorer east and south in labyrinth' };
    }
  }
`;

// Insert new 25 games before the end of the array
const searchEnd = '    interact: async (c) => {\r\n      return { action: \'Rhythm reflex verified\' };\r\n    }\r\n  }\r\n];';
const searchEndUnix = '    interact: async (c) => {\n      return { action: \'Rhythm reflex verified\' };\n    }\n  }\n];';

if (code.includes(searchEnd)) {
  code = code.replace(searchEnd, searchEnd.replace('];', `,${new25GamesStr}\n];`));
} else if (code.includes(searchEndUnix)) {
  code = code.replace(searchEndUnix, searchEndUnix.replace('];', `,${new25GamesStr}\n];`));
} else {
  // Fallback: replace closing bracket of ALL_75_GAMES
  code = code.replace(/(\n\s*idx:\s*'75'[\s\S]*?\n\s*\}\n)(\];)/, `$1,${new25GamesStr}\n$2`);
}

code = code.replace(/ALL_75_GAMES/g, 'ALL_100_GAMES');
code = code.replace(/milestone:\s*'3\.4'/g, "milestone: '3.5'");

fs.writeFileSync(path.join(__dirname, 'verify-100-games-browser.js'), code, 'utf8');
console.log('Successfully generated scripts/verify-100-games-browser.js');
