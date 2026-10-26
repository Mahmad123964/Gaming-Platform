const fs = require('node:fs');
const path = require('node:path');

const v75 = fs.readFileSync(path.join(__dirname, 'verify-75-mobile-gameplay.js'), 'utf8');

let code = v75;
code = code.replace(/Milestone 3\.4/g, 'Milestone 3.5');
code = code.replace(/75 Playable Games/g, '100 Playable Games');
code = code.replace(/75-mobile-certification/g, '100-mobile-certification');
code = code.replace(/75 MOBILE BROWSER/g, '100 MOBILE BROWSER');
code = code.replace(/const ALL_75_MOBILE_GAMES = \[/, 'const ALL_100_MOBILE_GAMES = [');

const new25MobileStr = `
  // 76. Nexus Cricket Championship
  {
    idx: '76',
    slug: 'nexus-cricket-championship',
    title: 'Nexus Cricket Championship',
    touchControlsId: 'btn-cricket-bowl-next',
    testInteraction: async (client) => {
      await client.eval(\`
        const b = document.getElementById('btn-cricket-bowl-next'); if (b) b.click();
        const d = document.getElementById('btn-cricket-bat-drive'); if (d) d.click();
      \`);
      return 'Dispatched cricket bowl delivery and cover drive touch interaction';
    }
  },
  // 77. Badminton Doubles Challenge
  {
    idx: '77',
    slug: 'badminton-doubles-challenge',
    title: 'Badminton Doubles Challenge',
    touchControlsId: 'btn-badminton-doubles-serve',
    testInteraction: async (client) => {
      await client.eval(\`
        const s = document.getElementById('btn-badminton-doubles-serve'); if (s) s.click();
        const m = document.getElementById('btn-badminton-doubles-smash'); if (m) m.click();
      \`);
      return 'Dispatched doubles serve and smash touch interaction';
    }
  },
  // 78. Tennis Grand Slam Mini
  {
    idx: '78',
    slug: 'tennis-grand-slam-mini',
    title: 'Tennis Grand Slam Mini',
    touchControlsId: 'btn-tennis-serve',
    testInteraction: async (client) => {
      await client.eval(\`
        const s = document.getElementById('btn-tennis-serve'); if (s) s.click();
        const f = document.getElementById('btn-tennis-forehand'); if (f) f.click();
      \`);
      return 'Dispatched ace serve and forehand touch interaction';
    }
  },
  // 79. Street Basketball Duel
  {
    idx: '79',
    slug: 'street-basketball-duel',
    title: 'Street Basketball Duel',
    touchControlsId: 'btn-streetball-shoot',
    testInteraction: async (client) => {
      await client.eval(\`
        const x = document.getElementById('btn-streetball-crossover'); if (x) x.click();
        const s = document.getElementById('btn-streetball-shoot'); if (s) s.click();
      \`);
      return 'Dispatched crossover and jumper touch interaction';
    }
  },
  // 80. Hockey League Arena
  {
    idx: '80',
    slug: 'hockey-league-arena',
    title: 'Hockey League Arena',
    touchControlsId: 'btn-hockey-wristshot',
    testInteraction: async (client) => {
      await client.eval(\`
        const p = document.getElementById('btn-hockey-pokecheck'); if (p) p.click();
        const w = document.getElementById('btn-hockey-wristshot'); if (w) w.click();
      \`);
      return 'Dispatched faceoff and wristshot touch interaction';
    }
  },
  // 81. Formula Sprint
  {
    idx: '81',
    slug: 'formula-sprint',
    title: 'Formula Sprint',
    touchControlsId: 'btn-formula-throttle',
    testInteraction: async (client) => {
      await client.eval(\`
        const t = document.getElementById('btn-formula-throttle'); if (t) t.click();
        const d = document.getElementById('btn-formula-drs'); if (d) d.click();
      \`);
      return 'Dispatched throttle and DRS touch interaction';
    }
  },
  // 82. Moto Stunt Challenge
  {
    idx: '82',
    slug: 'moto-stunt-challenge',
    title: 'Moto Stunt Challenge',
    touchControlsId: 'btn-moto-gas',
    testInteraction: async (client) => {
      await client.eval(\`
        const g = document.getElementById('btn-moto-gas'); if (g) g.click();
        const b = document.getElementById('btn-moto-lean-back'); if (b) b.click();
      \`);
      return 'Dispatched moto gas and lean back touch interaction';
    }
  },
  // 83. Desert Rally Adventure
  {
    idx: '83',
    slug: 'desert-rally-adventure',
    title: 'Desert Rally Adventure',
    touchControlsId: 'btn-desert-gas',
    testInteraction: async (client) => {
      await client.eval(\`
        const g = document.getElementById('btn-desert-gas'); if (g) g.click();
        const n = document.getElementById('btn-desert-nitro'); if (n) n.click();
      \`);
      return 'Dispatched rally gas and nitro touch interaction';
    }
  },
  // 84. Urban Traffic Racer
  {
    idx: '84',
    slug: 'urban-traffic-racer',
    title: 'Urban Traffic Racer',
    touchControlsId: 'btn-traffic-lane-left',
    testInteraction: async (client) => {
      await client.eval(\`
        const l = document.getElementById('btn-traffic-lane-left'); if (l) l.click();
        const b = document.getElementById('btn-traffic-boost'); if (b) b.click();
      \`);
      return 'Dispatched lane change and speed boost touch interaction';
    }
  },
  // 85. Nexus Arena Shooter
  {
    idx: '85',
    slug: 'nexus-arena-shooter',
    title: 'Nexus Arena Shooter',
    touchControlsId: 'btn-arena-fire',
    testInteraction: async (client) => {
      await client.eval(\`
        const f = document.getElementById('btn-arena-fire'); if (f) f.click();
        const s = document.getElementById('btn-arena-shotgun'); if (s) s.click();
      \`);
      return 'Dispatched laser fire and shotgun touch interaction';
    }
  },
  // 86. Cyber Ninja Adventure
  {
    idx: '86',
    slug: 'cyber-ninja-adventure',
    title: 'Cyber Ninja Adventure',
    touchControlsId: 'btn-ninja-jump',
    testInteraction: async (client) => {
      await client.eval(\`
        const j = document.getElementById('btn-ninja-jump'); if (j) j.click();
        const s = document.getElementById('btn-ninja-slash'); if (s) s.click();
      \`);
      return 'Dispatched wall jump and katana slash touch interaction';
    }
  },
  // 87. Zombie Survival Mini
  {
    idx: '87',
    slug: 'zombie-survival-mini',
    title: 'Zombie Survival Mini',
    touchControlsId: 'btn-zombie-shoot',
    testInteraction: async (client) => {
      await client.eval(\`
        const s = document.getElementById('btn-zombie-shoot'); if (s) s.click();
        const b = document.getElementById('btn-zombie-barricade'); if (b) b.click();
      \`);
      return 'Dispatched rifle fire and gate repair touch interaction';
    }
  },
  // 88. Space Exploration Mission
  {
    idx: '88',
    slug: 'space-exploration-mission',
    title: 'Space Exploration Mission',
    touchControlsId: 'btn-space-thrust',
    testInteraction: async (client) => {
      await client.eval(\`
        const t = document.getElementById('btn-space-thrust'); if (t) t.click();
        const m = document.getElementById('btn-space-laser'); if (m) m.click();
      \`);
      return 'Dispatched ion thrust and mining laser touch interaction';
    }
  },
  // 89. Dungeon Quest RPG Lite
  {
    idx: '89',
    slug: 'dungeon-quest-rpg-lite',
    title: 'Dungeon Quest RPG Lite',
    touchControlsId: 'btn-dungeon-attack',
    testInteraction: async (client) => {
      await client.eval(\`
        const a = document.getElementById('btn-dungeon-attack'); if (a) a.click();
        const f = document.getElementById('btn-dungeon-fireball'); if (f) f.click();
      \`);
      return 'Dispatched sword attack and fireball spell touch interaction';
    }
  },
  // 90. Kingdom Defense
  {
    idx: '90',
    slug: 'kingdom-defense',
    title: 'Kingdom Defense',
    touchControlsId: 'btn-kingdom-hire-archer',
    testInteraction: async (client) => {
      await client.eval(\`
        const a = document.getElementById('btn-kingdom-hire-archer'); if (a) a.click();
        const c = document.getElementById('btn-kingdom-catapult'); if (c) c.click();
      \`);
      return 'Dispatched archer hire and catapult touch interaction';
    }
  },
  // 91. City Traffic Manager
  {
    idx: '91',
    slug: 'city-traffic-manager',
    title: 'City Traffic Manager',
    touchControlsId: 'btn-traffic-toggle-ns',
    testInteraction: async (client) => {
      await client.eval(\`
        const ns = document.getElementById('btn-traffic-toggle-ns'); if (ns) ns.click();
        const ew = document.getElementById('btn-traffic-toggle-ew'); if (ew) ew.click();
      \`);
      return 'Dispatched signal toggle NS and EW touch interaction';
    }
  },
  // 92. Island Survival Builder
  {
    idx: '92',
    slug: 'island-survival-builder',
    title: 'Island Survival Builder',
    touchControlsId: 'btn-island-chop-wood',
    testInteraction: async (client) => {
      await client.eval(\`
        const w = document.getElementById('btn-island-chop-wood'); if (w) w.click();
        const s = document.getElementById('btn-island-build-shelter'); if (s) s.click();
      \`);
      return 'Dispatched timber chop and shelter build touch interaction';
    }
  },
  // 93. Chess Tactical Academy
  {
    idx: '93',
    slug: 'chess-tactical-academy',
    title: 'Chess Tactical Academy',
    touchControlsId: 'btn-chess-tactic-move-a',
    testInteraction: async (client) => {
      await client.eval(\`
        const m = document.getElementById('btn-chess-tactic-move-a'); if (m) m.click();
      \`);
      return 'Dispatched tactical move A touch interaction';
    }
  },
  // 94. Business Tycoon Mini
  {
    idx: '94',
    slug: 'business-tycoon-mini',
    title: 'Business Tycoon Mini',
    touchControlsId: 'btn-tycoon-produce',
    testInteraction: async (client) => {
      await client.eval(\`
        const p = document.getElementById('btn-tycoon-produce'); if (p) p.click();
        const m = document.getElementById('btn-tycoon-marketing'); if (m) m.click();
      \`);
      return 'Dispatched manufacturing and marketing touch interaction';
    }
  },
  // 95. Nexus Party Arena
  {
    idx: '95',
    slug: 'nexus-party-arena',
    title: 'Nexus Party Arena',
    touchControlsId: 'btn-party-bump',
    testInteraction: async (client) => {
      await client.eval(\`
        const b = document.getElementById('btn-party-bump'); if (b) b.click();
        const d = document.getElementById('btn-party-dash'); if (d) d.click();
      \`);
      return 'Dispatched bumper slam and dash touch interaction';
    }
  },
  // 96. Air Hockey Championship
  {
    idx: '96',
    slug: 'air-hockey-championship',
    title: 'Air Hockey Championship',
    touchControlsId: 'btn-airhockey-strike',
    testInteraction: async (client) => {
      await client.eval(\`
        const s = document.getElementById('btn-airhockey-strike'); if (s) s.click();
        const b = document.getElementById('btn-airhockey-bankshot'); if (b) b.click();
      \`);
      return 'Dispatched strike and bankshot touch interaction';
    }
  },
  // 97. Archery Precision Challenge
  {
    idx: '97',
    slug: 'archery-precision-challenge',
    title: 'Archery Precision Challenge',
    touchControlsId: 'btn-archery-draw',
    testInteraction: async (client) => {
      await client.eval(\`
        const d = document.getElementById('btn-archery-draw'); if (d) d.click();
        const r = document.getElementById('btn-archery-release'); if (r) r.click();
      \`);
      return 'Dispatched bow draw and release touch interaction';
    }
  },
  // 98. Physics Pinball Arcade
  {
    idx: '98',
    slug: 'physics-pinball-arcade',
    title: 'Physics Pinball Arcade',
    touchControlsId: 'btn-pinball-plunge',
    testInteraction: async (client) => {
      await client.eval(\`
        const p = document.getElementById('btn-pinball-plunge'); if (p) p.click();
        const f = document.getElementById('btn-pinball-dual-flip'); if (f) f.click();
      \`);
      return 'Dispatched plunger and flipper touch interaction';
    }
  },
  // 99. Color Rhythm Arena
  {
    idx: '99',
    slug: 'color-rhythm-arena',
    title: 'Color Rhythm Arena',
    touchControlsId: 'btn-rhythm-pulse-strike',
    testInteraction: async (client) => {
      await client.eval(\`
        const cy = document.getElementById('btn-rhythm-color-cyan'); if (cy) cy.click();
        const s = document.getElementById('btn-rhythm-pulse-strike'); if (s) s.click();
      \`);
      return 'Dispatched cyan color select and beat strike touch interaction';
    }
  },
  // 100. Maze Escape Adventure
  {
    idx: '100',
    slug: 'maze-escape-adventure',
    title: 'Maze Escape Adventure',
    touchControlsId: 'btn-maze-move-right',
    testInteraction: async (client) => {
      await client.eval(\`
        const r = document.getElementById('btn-maze-move-right'); if (r) r.click();
        const d = document.getElementById('btn-maze-move-down'); if (d) d.click();
      \`);
      return 'Dispatched east and south labyrinth navigation touch interaction';
    }
  }
`;

const searchEnd = "      return 'Dispatched rhythm reflex strike and color pulse touch interaction';\r\n    }\r\n  }\r\n];";
const searchEndUnix = "      return 'Dispatched rhythm reflex strike and color pulse touch interaction';\n    }\n  }\n];";

if (code.includes(searchEnd)) {
  code = code.replace(searchEnd, searchEnd.replace('];', `,${new25MobileStr}\n];`));
} else if (code.includes(searchEndUnix)) {
  code = code.replace(searchEndUnix, searchEndUnix.replace('];', `,${new25MobileStr}\n];`));
} else {
  code = code.replace(/(\n\s*idx:\s*'75'[\s\S]*?\n\s*\}\n)(\];)/, `$1,${new25MobileStr}\n$2`);
}

code = code.replace(/ALL_75_MOBILE_GAMES/g, 'ALL_100_MOBILE_GAMES');
code = code.replace(/milestone:\s*'3\.4'/g, "milestone: '3.5'");

fs.writeFileSync(path.join(__dirname, 'verify-100-mobile-gameplay.js'), code, 'utf8');
console.log('Successfully generated scripts/verify-100-mobile-gameplay.js');
