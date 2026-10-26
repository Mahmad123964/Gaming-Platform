import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './GalacticDodge.module.css';

export interface GalacticDodgeRef {
  restart: () => void;
  getScore: () => number;
}

interface GalacticDodgeProps {
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
  size: 'L' | 'M' | 'S';
  points: number;
}

interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export const GalacticDodge = forwardRef<GalacticDodgeRef, GalacticDodgeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [shields, setShields] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const shipRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number; // in radians
    rotationSpeed: number;
    thrust: boolean;
  }>({
    x: 180,
    y: 280,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // Upward
    rotationSpeed: 0,
    thrust: false
  });

  const asteroidsRef = useRef<Asteroid[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const scoreRef = useRef<number>(initialScore);
  const shieldsRef = useRef<number>(3);
  const runningRef = useRef<boolean>(true);
  const invulnerableTicksRef = useRef<number>(0);

  let nextAsteroidId = 1;

  const spawnAsteroid = (size: 'L' | 'M' | 'S', x?: number, y?: number): Asteroid => {
    const isL = size === 'L';
    const isM = size === 'M';
    const radius = isL ? 26 : isM ? 16 : 10;
    const speed = isL ? 1.2 : isM ? 1.8 : 2.5;
    const angle = Math.random() * Math.PI * 2;

    const posX = x !== undefined ? x : (Math.random() > 0.5 ? 0 : 360);
    const posY = y !== undefined ? y : Math.random() * 560;

    return {
      id: nextAsteroidId++,
      x: posX,
      y: posY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      size,
      points: isL ? 20 : isM ? 40 : 80
    };
  };

  const initGame = useCallback(() => {
    shipRef.current = {
      x: 180,
      y: 280,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      rotationSpeed: 0,
      thrust: false
    };
    asteroidsRef.current = [
      spawnAsteroid('L', 40, 40),
      spawnAsteroid('L', 320, 80),
      spawnAsteroid('L', 60, 480),
      spawnAsteroid('M', 300, 440)
    ];
    lasersRef.current = [];
    scoreRef.current = 0;
    shieldsRef.current = 3;
    runningRef.current = true;
    invulnerableTicksRef.current = 60;
    setScore(0);
    setShields(3);
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

  const fireLaser = useCallback(() => {
    if (!runningRef.current) return;
    const ship = shipRef.current;
    const laserSpeed = 8.5;
    lasersRef.current.push({
      x: ship.x + Math.cos(ship.angle) * 16,
      y: ship.y + Math.sin(ship.angle) * 16,
      vx: Math.cos(ship.angle) * laserSpeed + ship.vx * 0.4,
      vy: Math.sin(ship.angle) * laserSpeed + ship.vy * 0.4,
      life: 50
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!runningRef.current) {
        if (e.key === 'r' || e.key === 'R') initGame();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        shipRef.current.rotationSpeed = -0.09;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        shipRef.current.rotationSpeed = 0.09;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        shipRef.current.thrust = true;
      } else if (e.code === 'Space') {
        e.preventDefault();
        fireLaser();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        shipRef.current.rotationSpeed = 0;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        shipRef.current.thrust = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [fireLaser, initGame]);

  // Main 60 FPS Engine Loop
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
        const ship = shipRef.current;

        if (invulnerableTicksRef.current > 0) {
          invulnerableTicksRef.current -= 1;
        }

        // Rotate & Thrust
        ship.angle += ship.rotationSpeed;
        if (ship.thrust) {
          ship.vx += Math.cos(ship.angle) * 0.16;
          ship.vy += Math.sin(ship.angle) * 0.16;
        }
        // Inertia friction
        ship.vx *= 0.985;
        ship.vy *= 0.985;
        ship.x += ship.vx;
        ship.y += ship.vy;

        // Screen wrap
        if (ship.x < -15) ship.x = width + 15;
        else if (ship.x > width + 15) ship.x = -15;
        if (ship.y < -15) ship.y = height + 15;
        else if (ship.y > height + 15) ship.y = -15;

        // Lasers update
        const lasers = lasersRef.current;
        for (let l = lasers.length - 1; l >= 0; l--) {
          const laser = lasers[l];
          laser.x += laser.vx;
          laser.y += laser.vy;
          laser.life -= 1;

          if (laser.life <= 0 || laser.x < 0 || laser.x > width || laser.y < 0 || laser.y > height) {
            lasers.splice(l, 1);
          }
        }

        // Asteroids update & collisions
        const asteroids = asteroidsRef.current;
        const newFragments: Asteroid[] = [];

        for (let i = asteroids.length - 1; i >= 0; i--) {
          const a = asteroids[i];
          a.x += a.vx;
          a.y += a.vy;

          // Screen wrap
          if (a.x < -a.radius) a.x = width + a.radius;
          else if (a.x > width + a.radius) a.x = -a.radius;
          if (a.y < -a.radius) a.y = height + a.radius;
          else if (a.y > height + a.radius) a.y = -a.radius;

          // Check Laser vs Asteroid
          let hitByLaser = false;
          for (let l = lasers.length - 1; l >= 0; l--) {
            const laser = lasers[l];
            const dist = Math.hypot(laser.x - a.x, laser.y - a.y);
            if (dist < a.radius + 3) {
              hitByLaser = true;
              lasers.splice(l, 1);
              break;
            }
          }

          if (hitByLaser) {
            scoreRef.current += a.points;
            setScore(scoreRef.current);
            onScoreUpdate?.(scoreRef.current);

            // Split asteroid
            if (a.size === 'L') {
              newFragments.push(spawnAsteroid('M', a.x, a.y), spawnAsteroid('M', a.x, a.y));
            } else if (a.size === 'M') {
              newFragments.push(spawnAsteroid('S', a.x, a.y), spawnAsteroid('S', a.x, a.y));
            }

            asteroids.splice(i, 1);
            continue;
          }

          // Check Ship vs Asteroid collision
          if (invulnerableTicksRef.current <= 0) {
            const shipDist = Math.hypot(ship.x - a.x, ship.y - a.y);
            if (shipDist < a.radius + 10) {
              shieldsRef.current -= 1;
              setShields(shieldsRef.current);
              invulnerableTicksRef.current = 90; // invulnerability grace period

              if (shieldsRef.current <= 0) {
                runningRef.current = false;
                setGameOver(true);
                onGameOver?.(scoreRef.current);
              }
            }
          }
        }

        // Add newly spawned fragments
        if (newFragments.length > 0) {
          asteroidsRef.current.push(...newFragments);
        }

        // Keep asteroid count active if cleared
        if (asteroids.length < 3) {
          asteroidsRef.current.push(spawnAsteroid('L'));
        }
      }

      // Render Scene
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, width, height);

      // Stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let s = 0; s < 35; s++) {
        const sx = (s * 47) % width;
        const sy = (s * 83) % height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw Asteroids
      const asteroids = asteroidsRef.current;
      for (const a of asteroids) {
        ctx.strokeStyle = '#94A3B8';
        ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw Lasers
      const lasers = lasersRef.current;
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8;
      for (const laser of lasers) {
        ctx.beginPath();
        ctx.arc(laser.x, laser.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw Spaceship
      const ship = shipRef.current;
      const isBlinking = invulnerableTicksRef.current > 0 && Math.floor(invulnerableTicksRef.current / 6) % 2 === 0;

      if (!isBlinking) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        ctx.strokeStyle = '#00F0FF';
        ctx.fillStyle = '#0B0F19';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, -9);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Thrust flame
        if (ship.thrust) {
          ctx.strokeStyle = '#FF0055';
          ctx.fillStyle = '#FFB800';
          ctx.beginPath();
          ctx.moveTo(-7, -4);
          ctx.lineTo(-16, 0);
          ctx.lineTo(-7, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-galactic-dodge">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>GALACTIC DODGE</h3>
          <span>Inertial Asteroid Defense</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-galactic-score">{score}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SHIELDS</span>
            <span className={styles.statValue} id="val-galactic-shields">{'🛡️'.repeat(shields)}</span>
          </div>
        </div>
      </div>

      <div className={styles.canvasWrapper} id="wrapper-galactic-dodge">
        <canvas
          ref={canvasRef}
          width={360}
          height={560}
          className={styles.gameCanvas}
          id="canvas-galactic-dodge"
        />

        {gameOver && (
          <div className={styles.overlay} id="galactic-gameover-overlay">
            <h2 className={styles.overlayTitle}>HULL DESTROYED</h2>
            <div className={styles.overlayScore}>Combat Score: <strong>{score}</strong></div>
            <button
              className={styles.restartButton}
              onClick={initGame}
              id="btn-galactic-restart"
            >
              Relaunch Cruiser (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Rotate with Left/Right • Thrust with Up • Fire lasers with Space
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="galactic-mobile-controls">
        <button
          className={styles.controlBtn}
          onPointerDown={() => { shipRef.current.rotationSpeed = -0.09; }}
          onPointerUp={() => { shipRef.current.rotationSpeed = 0; }}
          onPointerLeave={() => { shipRef.current.rotationSpeed = 0; }}
          id="btn-galactic-left"
          aria-label="Rotate Left"
        >
          ⟲
        </button>
        <button
          className={styles.controlBtn}
          onPointerDown={() => { shipRef.current.thrust = true; }}
          onPointerUp={() => { shipRef.current.thrust = false; }}
          onPointerLeave={() => { shipRef.current.thrust = false; }}
          id="btn-galactic-thrust"
          aria-label="Thrust Forward"
        >
          ▲
        </button>
        <button
          className={styles.controlBtn}
          onPointerDown={() => { shipRef.current.rotationSpeed = 0.09; }}
          onPointerUp={() => { shipRef.current.rotationSpeed = 0; }}
          onPointerLeave={() => { shipRef.current.rotationSpeed = 0; }}
          id="btn-galactic-right"
          aria-label="Rotate Right"
        >
          ⟳
        </button>
        <button
          className={styles.fireBtn}
          onClick={fireLaser}
          id="btn-galactic-fire"
          aria-label="Fire Pulse"
        >
          💥 FIRE
        </button>
      </div>
    </div>
  );
});

GalacticDodge.displayName = 'GalacticDodge';
