import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TowerDefenseLite.module.css';

export interface TowerDefenseLiteRef {
  restart: () => void;
  getScore: () => number;
}

interface TowerDefenseLiteProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Creep {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  waypointIdx: number;
}

interface Turret {
  id: number;
  x: number;
  y: number;
  range: number;
  cooldown: number;
  lastShot: number;
}

interface Projectile {
  x: number;
  y: number;
  targetId: number;
  speed: number;
}

const WAYPOINTS: Point[] = [
  { x: 30, y: 0 },
  { x: 30, y: 140 },
  { x: 310, y: 140 },
  { x: 310, y: 280 },
  { x: 50, y: 280 },
  { x: 50, y: 420 },
  { x: 310, y: 420 },
  { x: 310, y: 560 }
];

const TURRET_COST = 40;

export const TowerDefenseLite = forwardRef<TowerDefenseLiteRef, TowerDefenseLiteProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [gold, setGold] = useState<number>(100);
  const [coreHp, setCoreHp] = useState<number>(10);
  const [wave, setWave] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const turretsRef = useRef<Turret[]>([]);
  const creepsRef = useRef<Creep[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const scoreRef = useRef<number>(initialScore);
  const goldRef = useRef<number>(100);
  const coreHpRef = useRef<number>(10);
  const waveRef = useRef<number>(1);
  const runningRef = useRef<boolean>(true);
  const spawnTimerRef = useRef<number>(0);
  const creepsToSpawnRef = useRef<number>(6);

  let nextEntityId = 1;

  const initGame = useCallback(() => {
    turretsRef.current = [
      { id: nextEntityId++, x: 170, y: 210, range: 90, cooldown: 30, lastShot: 0 }
    ];
    creepsRef.current = [];
    projectilesRef.current = [];
    scoreRef.current = 0;
    goldRef.current = 100;
    coreHpRef.current = 10;
    waveRef.current = 1;
    creepsToSpawnRef.current = 8;
    runningRef.current = true;
    setScore(0);
    setGold(100);
    setCoreHp(10);
    setWave(1);
    setGameOver(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart: initGame,
    getScore: () => scoreRef.current
  }), [initGame]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const placeTurret = useCallback((x: number, y: number) => {
    if (!runningRef.current || goldRef.current < TURRET_COST) return;

    // Check if clicked directly on path
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const p1 = WAYPOINTS[i];
      const p2 = WAYPOINTS[i + 1];
      const minX = Math.min(p1.x, p2.x) - 20;
      const maxX = Math.max(p1.x, p2.x) + 20;
      const minY = Math.min(p1.y, p2.y) - 20;
      const maxY = Math.max(p1.y, p2.y) + 20;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return; // Too close to path
      }
    }

    // Deploy turret
    turretsRef.current.push({
      id: nextEntityId++,
      x,
      y,
      range: 90,
      cooldown: 30,
      lastShot: 0
    });

    goldRef.current -= TURRET_COST;
    setGold(goldRef.current);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 360 / rect.width;
    const scaleY = 560 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    placeTurret(x, y);
  };

  // Main 60 FPS Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (runningRef.current) {
        // Spawn creeps
        if (creepsToSpawnRef.current > 0) {
          spawnTimerRef.current += 1;
          if (spawnTimerRef.current > 60) {
            spawnTimerRef.current = 0;
            creepsToSpawnRef.current -= 1;
            const hp = 30 + waveRef.current * 15;
            creepsRef.current.push({
              id: nextEntityId++,
              x: WAYPOINTS[0].x,
              y: WAYPOINTS[0].y,
              hp,
              maxHp: hp,
              speed: 1.2 + waveRef.current * 0.1,
              waypointIdx: 1
            });
          }
        } else if (creepsRef.current.length === 0) {
          // Advance Wave!
          waveRef.current += 1;
          setWave(waveRef.current);
          creepsToSpawnRef.current = 6 + waveRef.current * 3;
          goldRef.current += 30;
          setGold(goldRef.current);
        }

        // Update Creeps
        const creeps = creepsRef.current;
        for (let i = creeps.length - 1; i >= 0; i--) {
          const c = creeps[i];
          const targetWp = WAYPOINTS[c.waypointIdx];

          const dx = targetWp.x - c.x;
          const dy = targetWp.y - c.y;
          const dist = Math.hypot(dx, dy);

          if (dist < c.speed) {
            c.waypointIdx += 1;
            if (c.waypointIdx >= WAYPOINTS.length) {
              // Reached base! Lose Core HP
              coreHpRef.current -= 1;
              setCoreHp(coreHpRef.current);
              creeps.splice(i, 1);

              if (coreHpRef.current <= 0) {
                runningRef.current = false;
                setGameOver(true);
                onGameOver?.(scoreRef.current);
              }
              continue;
            }
          } else {
            c.x += (dx / dist) * c.speed;
            c.y += (dy / dist) * c.speed;
          }
        }

        // Turret Targeting & Shooting
        const turrets = turretsRef.current;
        for (const t of turrets) {
          t.lastShot += 1;
          if (t.lastShot >= t.cooldown) {
            // Find closest creep in range
            let closestCreep: Creep | null = null;
            let minDist = t.range;

            for (const c of creeps) {
              const d = Math.hypot(c.x - t.x, c.y - t.y);
              if (d < minDist) {
                minDist = d;
                closestCreep = c;
              }
            }

            if (closestCreep) {
              t.lastShot = 0;
              closestCreep.hp -= 12;

              // Laser beam flash effect will be drawn
              if (closestCreep.hp <= 0) {
                // Creep killed
                const idx = creeps.indexOf(closestCreep);
                if (idx !== -1) creeps.splice(idx, 1);

                goldRef.current += 15;
                setGold(goldRef.current);
                scoreRef.current += 20;
                setScore(scoreRef.current);
                onScoreUpdate?.(scoreRef.current);
              }
            }
          }
        }
      }

      // Render Scene
      ctx.fillStyle = '#0B1120';
      ctx.fillRect(0, 0, width, height);

      // Draw Winding Path
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 32;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
      for (let i = 1; i < WAYPOINTS.length; i++) {
        ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
      }
      ctx.stroke();

      // Path inner track
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 24;
      ctx.stroke();

      // Draw Base Core
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(WAYPOINTS[WAYPOINTS.length - 1].x, WAYPOINTS[WAYPOINTS.length - 1].y - 10, 18, 0, Math.PI * 2);
      ctx.fill();

      // Draw Turrets
      const turrets = turretsRef.current;
      for (const t of turrets) {
        // Range circle indicator
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
        ctx.stroke();

        // Base
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 14, 0, Math.PI * 2);
        ctx.fill();

        // Cannon head
        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Creeps
      const creeps = creepsRef.current;
      for (const c of creeps) {
        // Creep body
        ctx.fillStyle = '#00F0FF';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const hpPct = Math.max(0, c.hp / c.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(c.x - 10, c.y - 14, 20, 3);
        ctx.fillStyle = hpPct > 0.5 ? '#10B981' : '#EF4444';
        ctx.fillRect(c.x - 10, c.y - 14, 20 * hpPct, 3);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-tower-defense-lite">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>TOWER DEFENSE LITE</h3>
          <span>Waypoint Path Defense</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>GOLD</span>
            <span className={styles.statValue} id="val-td-gold" style={{ color: '#FBBF24' }}>💰{gold}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>CORE</span>
            <span className={styles.statValue} id="val-td-hp" style={{ color: '#EF4444' }}>❤️{coreHp}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>WAVE</span>
            <span className={styles.statValue} id="val-td-wave">{wave}</span>
          </div>
        </div>
      </div>

      <div
        className={styles.canvasWrapper}
        id="wrapper-tower-defense"
        onClick={handleCanvasClick}
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={560}
          className={styles.gameCanvas}
          id="canvas-tower-defense"
        />

        {gameOver && (
          <div className={styles.overlay} id="td-gameover-overlay">
            <h2 className={styles.overlayTitle}>CORE DESTROYED</h2>
            <div className={styles.overlayScore}>Waves Survived: <strong>{wave}</strong> • Score: <strong>{score}</strong></div>
            <button
              className={styles.restartButton}
              onClick={initGame}
              id="btn-td-restart"
            >
              Rebuild Defenses (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Tap open ground off the path to deploy turrets (40 Gold)
      </div>

      {/* Mobile Turret Quick Deploy Button */}
      <div className={styles.mobileControls} id="td-mobile-controls">
        <button
          className={styles.placeBtn}
          onClick={() => {
            // Place next turret at strategic default coordinates
            const spots = [{ x: 180, y: 350 }, { x: 180, y: 70 }, { x: 180, y: 490 }];
            const available = spots.find(s => !turretsRef.current.some(t => Math.hypot(t.x - s.x, t.y - s.y) < 30));
            if (available) placeTurret(available.x, available.y);
          }}
          id="btn-td-deploy-turret"
          aria-label="Deploy Turret"
        >
          ⚡ DEPLOY TURRET (40G)
        </button>
      </div>
    </div>
  );
});

TowerDefenseLite.displayName = 'TowerDefenseLite';
