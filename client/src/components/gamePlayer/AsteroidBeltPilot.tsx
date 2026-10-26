import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './GalacticDodge.module.css';

export interface AsteroidBeltPilotRef {
  restart: () => void;
  getScore: () => number;
}

interface AsteroidBeltPilotProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  tier: 1 | 2 | 3; // 3 = large, 2 = medium, 1 = small
}

interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export const AsteroidBeltPilot = forwardRef<AsteroidBeltPilotRef, AsteroidBeltPilotProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [wave, setWave] = useState<number>(1);
  const [shields, setShields] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const waveRef = useRef<number>(1);
  const shieldsRef = useRef<number>(3);
  const runningRef = useRef<boolean>(true);

  // Ship state
  const shipRef = useRef<{
    x: number;
    y: number;
    angle: number;
    vx: number;
    vy: number;
    thrusting: boolean;
  }>({
    x: 180,
    y: 240,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    thrusting: false
  });

  const asteroidsRef = useRef<Asteroid[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const nextIdRef = useRef<number>(1);

  const rotateShip = useCallback((dir: 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    const delta = dir === 'LEFT' ? -0.18 : 0.18;
    shipRef.current.angle += delta;
  }, [gameOver]);

  const thrust = useCallback(() => {
    if (gameOver) return;
    const s = shipRef.current;
    s.vx += Math.cos(s.angle) * 0.9;
    s.vy += Math.sin(s.angle) * 0.9;
    const maxSpeed = 7;
    const curSpeed = Math.hypot(s.vx, s.vy);
    if (curSpeed > maxSpeed) {
      s.vx = (s.vx / curSpeed) * maxSpeed;
      s.vy = (s.vy / curSpeed) * maxSpeed;
    }
  }, [gameOver]);

  const fireLaser = useCallback(() => {
    if (gameOver) return;
    const s = shipRef.current;
    lasersRef.current.push({
      x: s.x + Math.cos(s.angle) * 14,
      y: s.y + Math.sin(s.angle) * 14,
      vx: Math.cos(s.angle) * 9 + s.vx * 0.4,
      vy: Math.sin(s.angle) * 9 + s.vy * 0.4,
      life: 45
    });
  }, [gameOver]);

  const spawnWave = useCallback((w: number) => {
    const list: Asteroid[] = [];
    const count = 3 + w;
    for (let i = 0; i < count; i++) {
      let x = Math.random() * 360;
      let y = Math.random() * 480;
      // keep distance from center
      while (Math.hypot(x - 180, y - 240) < 90) {
        x = Math.random() * 360;
        y = Math.random() * 480;
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.4;
      list.push({
        id: nextIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 24,
        tier: 3
      });
    }
    asteroidsRef.current = list;
  }, []);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    waveRef.current = 1;
    shieldsRef.current = 3;
    setScore(0);
    setWave(1);
    setShields(3);
    setGameOver(false);
    shipRef.current = { x: 180, y: 240, angle: -Math.PI / 2, vx: 0, vy: 0, thrusting: false };
    lasersRef.current = [];
    spawnWave(1);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate, spawnWave]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  useEffect(() => {
    spawnWave(1);
  }, [spawnWave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') rotateShip('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rotateShip('RIGHT');
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') thrust();
      if (e.key === ' ' || e.key === 'f' || e.key === 'F') fireLaser();
    };

    window.addEventListener('keydown', handleKeyDown);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space void
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(40, 60, 2, 2);
      ctx.fillRect(150, 120, 2, 2);
      ctx.fillRect(280, 80, 2, 2);
      ctx.fillRect(310, 320, 2, 2);
      ctx.fillRect(70, 410, 2, 2);
      ctx.fillRect(210, 440, 2, 2);

      if (!gameOver) {
        const s = shipRef.current;

        // Apply friction
        s.vx *= 0.985;
        s.vy *= 0.985;
        s.x += s.vx;
        s.y += s.vy;

        // Screen wrap
        if (s.x < 0) s.x += canvas.width;
        if (s.x > canvas.width) s.x -= canvas.width;
        if (s.y < 0) s.y += canvas.height;
        if (s.y > canvas.height) s.y -= canvas.height;

        // Update lasers
        for (let i = lasersRef.current.length - 1; i >= 0; i--) {
          const l = lasersRef.current[i];
          l.x += l.vx;
          l.y += l.vy;
          l.life -= 1;

          // Screen wrap
          if (l.x < 0) l.x += canvas.width;
          if (l.x > canvas.width) l.x -= canvas.width;
          if (l.y < 0) l.y += canvas.height;
          if (l.y > canvas.height) l.y -= canvas.height;

          // Asteroid hits
          let hit = false;
          for (let j = asteroidsRef.current.length - 1; j >= 0; j--) {
            const ast = asteroidsRef.current[j];
            if (Math.hypot(l.x - ast.x, l.y - ast.y) < ast.radius) {
              hit = true;
              scoreRef.current += (4 - ast.tier) * 25;
              setScore(scoreRef.current);
              if (onScoreUpdate) onScoreUpdate(scoreRef.current);

              // Split asteroid
              if (ast.tier > 1) {
                const nextTier = (ast.tier - 1) as 1 | 2;
                const nextRad = ast.radius * 0.65;
                for (let k = 0; k < 2; k++) {
                  const ang = Math.random() * Math.PI * 2;
                  const spd = Math.hypot(ast.vx, ast.vy) * 1.35;
                  asteroidsRef.current.push({
                    id: nextIdRef.current++,
                    x: ast.x,
                    y: ast.y,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    radius: nextRad,
                    tier: nextTier
                  });
                }
              }
              asteroidsRef.current.splice(j, 1);
              break;
            }
          }

          if (hit || l.life <= 0) {
            lasersRef.current.splice(i, 1);
          }
        }

        // Update Asteroids & Ship Collision
        for (const ast of asteroidsRef.current) {
          ast.x += ast.vx;
          ast.y += ast.vy;

          if (ast.x < 0) ast.x += canvas.width;
          if (ast.x > canvas.width) ast.x -= canvas.width;
          if (ast.y < 0) ast.y += canvas.height;
          if (ast.y > canvas.height) ast.y -= canvas.height;

          // Ship collision
          if (Math.hypot(s.x - ast.x, s.y - ast.y) < (ast.radius + 10)) {
            shieldsRef.current -= 1;
            setShields(shieldsRef.current);
            s.vx = -s.vx * 1.5;
            s.vy = -s.vy * 1.5;

            if (shieldsRef.current <= 0) {
              setGameOver(true);
              if (onGameOver) onGameOver(scoreRef.current);
              break;
            }
          }
        }

        // Next Wave Check
        if (asteroidsRef.current.length === 0) {
          waveRef.current += 1;
          setWave(waveRef.current);
          scoreRef.current += 200; // Wave clear bonus
          setScore(scoreRef.current);
          if (onScoreUpdate) onScoreUpdate(scoreRef.current);
          spawnWave(waveRef.current);
        }
      }

      // Draw Lasers
      ctx.fillStyle = '#00F0FF';
      for (const l of lasersRef.current) {
        ctx.beginPath();
        ctx.arc(l.x, l.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Asteroids
      ctx.strokeStyle = '#94A3B8';
      ctx.fillStyle = '#1E293B';
      ctx.lineWidth = 2;
      for (const ast of asteroidsRef.current) {
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw Ship
      const s = shipRef.current;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);

      // Ship triangle
      ctx.strokeStyle = '#38BDF8';
      ctx.fillStyle = '#0284C7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shield bubble
      if (shieldsRef.current > 0) {
        ctx.strokeStyle = shieldsRef.current > 1 ? '#00F0FF' : '#EF4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      if (runningRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fireLaser, gameOver, onGameOver, onScoreUpdate, rotateShip, spawnWave, thrust]);

  return (
    <div className={styles.container} id="game-asteroid-belt-pilot">
      <div className={styles.scoreboard} id="asteroid-pilot-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-pilot-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SECTOR</span>
          <span className={styles.value} id="score-pilot-wave">WAVE {wave}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SHIELDS</span>
          <span className={styles.value} id="score-pilot-shields">{'🛡️'.repeat(shields)}</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-asteroid-belt-pilot"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="asteroid-pilot-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pilot-rot-left"
          onClick={() => rotateShip('LEFT')}
        >
          ↺ Rotate Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pilot-thrust"
          onClick={thrust}
        >
          ▲ Thruster
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pilot-fire"
          onClick={fireLaser}
        >
          ⚡ Fire Blaster
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pilot-rot-right"
          onClick={() => rotateShip('RIGHT')}
        >
          Rotate Right ↻
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="asteroid-pilot-gameover">
          <h3 className={styles.overlayTitle}>HULL BREACH — SHIP DESTROYED</h3>
          <p className={styles.overlayText}>
            Sector Cleared: Wave {wave} | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-asteroid-pilot-restart"
            onClick={restart}
          >
            Launch Replacement Vessel
          </button>
        </div>
      )}
    </div>
  );
});

AsteroidBeltPilot.displayName = 'AsteroidBeltPilot';
