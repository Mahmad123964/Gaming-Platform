import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TicTacToePro.module.css';

export interface PixelDungeonRogueRef {
  restart: () => void;
  getScore: () => number;
}

interface PixelDungeonRogueProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type TileType = 'WALL' | 'FLOOR' | 'CHEST' | 'POTION' | 'MONSTER' | 'STAIRS';

interface Monster {
  x: number;
  y: number;
  hp: number;
}

const GRID_SIZE = 10;

export const PixelDungeonRogue = forwardRef<PixelDungeonRogueRef, PixelDungeonRogueProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [hp, setHp] = useState<number>(100);
  const [floor, setFloor] = useState<number>(1);
  const [gold, setGold] = useState<number>(0);
  const [log, setLog] = useState<string>('Welcome to the dungeon. Find the stairs to descend.');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 1, y: 1 });
  const [grid, setGrid] = useState<TileType[][]>(() => generateDungeon(1));
  const [monsters, setMonsters] = useState<Monster[]>([
    { x: 3, y: 3, hp: 25 },
    { x: 6, y: 7, hp: 30 }
  ]);

  function generateDungeon(level: number): TileType[][] {
    const map: TileType[][] = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => 'FLOOR')
    );
    // Outer walls
    for (let i = 0; i < GRID_SIZE; i++) {
      map[0][i] = 'WALL';
      map[GRID_SIZE - 1][i] = 'WALL';
      map[i][0] = 'WALL';
      map[i][GRID_SIZE - 1] = 'WALL';
    }
    // Interior pillars
    map[2][3] = 'WALL';
    map[2][4] = 'WALL';
    map[5][2] = 'WALL';
    map[5][5] = 'WALL';
    map[7][3] = 'WALL';

    // Items
    map[1][8] = 'CHEST';
    map[8][2] = 'CHEST';
    map[4][4] = 'POTION';

    // Stairs
    map[8][8] = 'STAIRS';

    return map;
  }

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameOver) return;

    setPlayerPos(prev => {
      const nx = prev.x + dx;
      const ny = prev.y + dy;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return prev;
      if (grid[ny][nx] === 'WALL') {
        setLog('Thump! Solid stone wall.');
        return prev;
      }

      // Check monster combat
      const monsterIdx = monsters.findIndex(m => m.x === nx && m.y === ny);
      if (monsterIdx !== -1) {
        const m = monsters[monsterIdx];
        const playerDmg = 20;
        const newMhp = m.hp - playerDmg;
        const counterDmg = 10;
        const newHp = Math.max(0, hp - counterDmg);
        setHp(newHp);

        if (newMhp <= 0) {
          // Defeated monster
          setLog(`Slayed dungeon creature! Gained +40 PTS.`);
          const newScore = score + 40;
          setScore(newScore);
          if (onScoreUpdate) onScoreUpdate(newScore);
          setMonsters(prevM => prevM.filter((_, idx) => idx !== monsterIdx));
        } else {
          setLog(`Struck beast for ${playerDmg} DMG! Took ${counterDmg} counter-damage.`);
          setMonsters(prevM => prevM.map((item, idx) => idx === monsterIdx ? { ...item, hp: newMhp } : item));
        }

        if (newHp <= 0) {
          setGameOver(true);
          setLog('Defeated in the crypts. Game Over.');
          if (onGameOver) onGameOver(score);
        }
        return prev; // stays in place during attack
      }

      // Check Tile interactions
      const tile = grid[ny][nx];
      if (tile === 'CHEST') {
        const newScore = score + 50;
        const newGold = gold + 50;
        setScore(newScore);
        setGold(newGold);
        setLog('Opened ancient chest! (+50 Gold / PTS)');
        if (onScoreUpdate) onScoreUpdate(newScore);
        setGrid(g => g.map((r, y) => r.map((c, x) => (x === nx && y === ny ? 'FLOOR' : c))));
      } else if (tile === 'POTION') {
        const newHp = Math.min(100, hp + 30);
        setHp(newHp);
        setLog('Consumed healing elixir! (+30 HP)');
        setGrid(g => g.map((r, y) => r.map((c, x) => (x === nx && y === ny ? 'FLOOR' : c))));
      } else if (tile === 'STAIRS') {
        const newFloor = floor + 1;
        const newScore = score + 150;
        setFloor(newFloor);
        setScore(newScore);
        if (onScoreUpdate) onScoreUpdate(newScore);

        if (newFloor > 2) {
          setGameOver(true);
          setVictory(true);
          setLog('VICTORY! Emerged from the dungeon depths triumphant!');
          if (onGameOver) onGameOver(newScore);
        } else {
          setLog(`Descended to Floor ${newFloor}! The dungeon grows darker...`);
          setGrid(generateDungeon(newFloor));
          setMonsters([
            { x: 4, y: 2, hp: 35 },
            { x: 7, y: 6, hp: 40 }
          ]);
          return { x: 1, y: 1 };
        }
      }

      return { x: nx, y: ny };
    });
  }, [floor, gameOver, gold, grid, hp, monsters, onGameOver, onScoreUpdate, score]);

  const restart = useCallback(() => {
    setScore(0);
    setHp(100);
    setFloor(1);
    setGold(0);
    setGameOver(false);
    setVictory(false);
    setPlayerPos({ x: 1, y: 1 });
    setGrid(generateDungeon(1));
    setMonsters([
      { x: 3, y: 3, hp: 25 },
      { x: 6, y: 7, hp: 30 }
    ]);
    setLog('Dungeon re-entered. Find the stairs.');
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  return (
    <div className={styles.container} id="game-pixel-dungeon-rogue">
      <div className={styles.scoreboard} id="dungeon-rogue-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-rogue-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>HEALTH</span>
          <span className={styles.value} id="score-rogue-hp">{hp} HP</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>DEPTH</span>
          <span className={styles.value} id="score-rogue-floor">B{floor}F</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>GOLD</span>
          <span className={styles.value} id="score-rogue-gold">{gold} 🪙</span>
        </div>
      </div>

      <div style={{
        background: '#0F172A',
        color: '#38BDF8',
        padding: '6px 12px',
        fontSize: '0.82rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }} id="dungeon-log-message">
        {log}
      </div>

      {/* 10x10 Dungeon Map */}
      <div
        id="grid-dungeon-rogue"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: '2px',
          padding: '12px',
          background: '#020617',
          width: '320px',
          height: '320px',
          margin: '10px auto',
          borderRadius: '8px',
          boxSizing: 'border-box'
        }}
      >
        {grid.map((row, y) =>
          row.map((tile, x) => {
            const isPlayer = playerPos.x === x && playerPos.y === y;
            const monster = monsters.find(m => m.x === x && m.y === y);

            let bg = '#1E293B';
            let char = '';
            let color = '#94A3B8';

            if (tile === 'WALL') {
              bg = '#0F172A';
              char = '#';
              color = '#475569';
            } else if (tile === 'CHEST') {
              char = '📦';
            } else if (tile === 'POTION') {
              char = '🧪';
            } else if (tile === 'STAIRS') {
              char = '🪜';
            }

            if (monster) {
              char = '👾';
            }

            if (isPlayer) {
              char = '🧙';
              bg = '#0284C7';
            }

            return (
              <div
                key={`tile-${x}-${y}`}
                id={`dungeon-cell-${x}-${y}`}
                style={{
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  borderRadius: '3px',
                  userSelect: 'none',
                  color
                }}
              >
                {char}
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Touch 4-Way D-Pad */}
      <div
        id="dungeon-mobile-controls"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          maxWidth: '220px',
          margin: '8px auto',
          padding: '0 8px'
        }}
      >
        <div />
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rogue-up"
          onClick={() => movePlayer(0, -1)}
          style={{ padding: '10px', fontSize: '1rem', fontWeight: 700 }}
        >
          ▲
        </button>
        <div />
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rogue-left"
          onClick={() => movePlayer(-1, 0)}
          style={{ padding: '10px', fontSize: '1rem', fontWeight: 700 }}
        >
          ◀
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rogue-wait"
          onClick={() => setLog('Waited turn. Senses sharpened.')}
          style={{ padding: '10px', fontSize: '0.75rem', fontWeight: 700 }}
        >
          Wait
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rogue-right"
          onClick={() => movePlayer(1, 0)}
          style={{ padding: '10px', fontSize: '1rem', fontWeight: 700 }}
        >
          ▶
        </button>
        <div />
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rogue-down"
          onClick={() => movePlayer(0, 1)}
          style={{ padding: '10px', fontSize: '1rem', fontWeight: 700 }}
        >
          ▼
        </button>
        <div />
      </div>

      {gameOver && (
        <div className={styles.overlay} id="dungeon-rogue-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'DUNGEON CONQUERED!' : 'EXPEDITION TERMINATED'}
          </h3>
          <p className={styles.overlayText}>
            Floor Reached: B{floor}F | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-dungeon-rogue-restart"
            onClick={restart}
          >
            Enter Crypt Again
          </button>
        </div>
      )}
    </div>
  );
});

PixelDungeonRogue.displayName = 'PixelDungeonRogue';
