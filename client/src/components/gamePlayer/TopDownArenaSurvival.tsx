import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface TopDownArenaSurvivalRef {
  restart: () => void;
  getScore: () => number;
}

interface TopDownArenaSurvivalProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const TopDownArenaSurvival = forwardRef<TopDownArenaSurvivalRef, TopDownArenaSurvivalProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [kills, setKills] = useState<number>(initialScore);
  const [wave, setWave] = useState<number>(1);
  const [hp, setHp] = useState<number>(100);
  const [bombs, setBombs] = useState<number>(2);
  const [status, setStatus] = useState<string>('Survive drone swarms! Fire plasma and deploy smart bombs.');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const playerRef = useRef({
    x: 180,
    y: 130,
    angle: 0,
    speed: 3.0,
    hp: 100
  });

  const bulletsRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);
  const dronesRef = useRef<{ x: number; y: number; speed: number; hp: number }[]>([
    { x: 40, y: 40, speed: 1.2, hp: 1 },
    { x: 320, y: 40, speed: 1.4, hp: 1 },
    { x: 180, y: 20, speed: 1.5, hp: 1 }
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setKills(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setKills(0);
    setWave(1);
    setHp(100);
    setBombs(2);
    setStatus('Survive drone swarms! Fire plasma and deploy smart bombs.');
    playerRef.current = { x: 180, y: 130, angle: 0, speed: 3.0, hp: 100 };
    bulletsRef.current = [];
    dronesRef.current = [
      { x: 40, y: 40, speed: 1.2, hp: 1 },
      { x: 320, y: 40, speed: 1.4, hp: 1 },
      { x: 180, y: 20, speed: 1.5, hp: 1 }
    ];
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const movePlayer = useCallback((dx: number, dy: number) => {
    const p = playerRef.current;
    p.x = Math.max(30, Math.min(330, p.x + dx * p.speed * 4));
    p.y = Math.max(30, Math.min(230, p.y + dy * p.speed * 4));
    p.angle = Math.atan2(dy, dx);
  }, []);

  const firePlasma = useCallback(() => {
    const p = playerRef.current;
    // Fire radial burst of 3 plasma bolts
    const spread = [-0.2, 0, 0.2];
    for (const offset of spread) {
      const angle = p.angle + offset;
      bulletsRef.current.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * 7.5,
        vy: Math.sin(angle) * 7.5
      });
    }
  }, []);

  const triggerBomb = useCallback(() => {
    if (bombs <= 0) return;
    setBombs(b => b - 1);
    const count = dronesRef.current.length;
    dronesRef.current = []; // Wipe all active drones
    updateScore(scoreRef.current + count * 50);
    setStatus('💥 SMART BOMB DETONATED! Swarm neutralized.');

    // Spawn next wave
    setTimeout(() => {
      setWave(w => w + 1);
      const newDrones = [];
      for (let i = 0; i < 4; i++) {
        newDrones.push({
          x: Math.random() > 0.5 ? 30 : 330,
          y: Math.random() * 200 + 20,
          speed: 1.3 + Math.random() * 0.5,
          hp: 1
        });
      }
      dronesRef.current = newDrones;
    }, 1000);
  }, [bombs, updateScore]);

  // Main canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    runningRef.current = true;
    let animId: number;

    const render = () => {
      if (!runningRef.current) return;
      const W = canvas.width;
      const H = canvas.height;

      // Dark cyber arena grid
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      // Neon grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Arena boundary forcefield
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, W - 20, H - 20);

      const p = playerRef.current;

      // Update bullets
      const bullets = bulletsRef.current;
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // Out of bounds check
        if (b.x < 10 || b.x > W - 10 || b.y < 10 || b.y > H - 10) {
          bullets.splice(i, 1);
          continue;
        }

        // Bullet vs drone collision check
        const drones = dronesRef.current;
        for (let j = drones.length - 1; j >= 0; j--) {
          const d = drones[j];
          if (Math.hypot(b.x - d.x, b.y - d.y) < 14) {
            bullets.splice(i, 1);
            drones.splice(j, 1);
            updateScore(scoreRef.current + 25);
            setStatus('Drone destroyed! +25 PTS');
            break;
          }
        }
      }

      // Update drones tracking player
      const drones = dronesRef.current;
      for (const d of drones) {
        const angle = Math.atan2(p.y - d.y, p.x - d.x);
        d.x += Math.cos(angle) * d.speed;
        d.y += Math.sin(angle) * d.speed;

        // Player collision
        if (Math.hypot(p.x - d.x, p.y - d.y) < 16) {
          p.hp = Math.max(0, p.hp - 0.2);
          setHp(Math.round(p.hp));
        }
      }

      // Wave respawn if all cleared
      if (drones.length === 0) {
        setWave(w => w + 1);
        for (let k = 0; k < 4; k++) {
          drones.push({
            x: Math.random() > 0.5 ? 25 : 335,
            y: Math.random() * 200 + 20,
            speed: 1.4 + Math.random() * 0.4,
            hp: 1
          });
        }
      }

      // Draw Bullets (Cyan plasma pulses)
      ctx.fillStyle = '#38bdf8';
      for (const b of bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Drones (Crimson mechanical quad-copters)
      for (const d of drones) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(d.x - 9, d.y - 9, 18, 18);
      }

      // Draw Player Ship (Cyan triangular fighter)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [updateScore]);

  return (
    <div className={styles.container} id="top-down-arena-survival-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Score</span>
          <span className={styles.scoreValue} id="arena-score">{kills}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Shield HP</span>
          <span className={styles.scoreValue} style={{ color: hp < 30 ? '#ef4444' : '#38bdf8' }}>
            {hp}%
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Wave</span>
          <span className={styles.scoreValue}>{wave}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Bombs</span>
          <span className={styles.scoreValue}>{bombs}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="arena-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-arena-move-up"
          onClick={() => movePlayer(0, -1)}
        >
          ▲ Up
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-arena-move-down"
          onClick={() => movePlayer(0, 1)}
        >
          ▼ Down
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-arena-move-left"
          onClick={() => movePlayer(-1, 0)}
        >
          ◀ Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-arena-move-right"
          onClick={() => movePlayer(1, 0)}
        >
          Right ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-arena-fire"
          onClick={firePlasma}
        >
          ⚡ Fire Plasma
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-arena-bomb"
          onClick={triggerBomb}
          disabled={bombs <= 0}
        >
          💥 Smart Bomb
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-arena-restart"
          onClick={restart}
        >
          Restart Arena Survival
        </button>
      </div>
    </div>
  );
});

TopDownArenaSurvival.displayName = 'TopDownArenaSurvival';
