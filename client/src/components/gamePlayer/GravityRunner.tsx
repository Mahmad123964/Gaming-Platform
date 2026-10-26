import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './EndlessNeonRunner.module.css';

export interface GravityRunnerRef {
  restart: () => void;
  getScore: () => number;
}

interface GravityRunnerProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Hazard {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'SPIKE' | 'CRYSTAL';
  surface: 'FLOOR' | 'CEILING';
}

export const GravityRunner = forwardRef<GravityRunnerRef, GravityRunnerProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [distance, setDistance] = useState<number>(0);
  const [gravityState, setGravityState] = useState<'DOWN' | 'UP'>('DOWN');
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const distanceRef = useRef<number>(0);
  const gravityDirRef = useRef<number>(1); // 1 = down, -1 = up
  const runningRef = useRef<boolean>(true);

  const playerRef = useRef<{
    x: number;
    y: number;
    vy: number;
    onSurface: boolean;
    radius: number;
  }>({
    x: 60,
    y: 380,
    vy: 0,
    onSurface: true,
    radius: 12
  });

  const hazardsRef = useRef<Hazard[]>([]);
  const nextSpawnRef = useRef<number>(50);
  const nextIdRef = useRef<number>(1);
  const speedRef = useRef<number>(4.8);

  const invertGravity = useCallback(() => {
    if (gameOver) return;
    gravityDirRef.current = -gravityDirRef.current;
    setGravityState(gravityDirRef.current === 1 ? 'DOWN' : 'UP');
  }, [gameOver]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    distanceRef.current = 0;
    gravityDirRef.current = 1;
    hazardsRef.current = [];
    playerRef.current = { x: 60, y: 380, vy: 0, onSurface: true, radius: 12 };
    setScore(0);
    setDistance(0);
    setGravityState('DOWN');
    setGameOver(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') invertGravity();
    };

    window.addEventListener('keydown', handleKeyDown);

    const FLOOR_Y = 400;
    const CEILING_Y = 60;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space background
      ctx.fillStyle = '#080816';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ceiling and Floor Platforms
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 0, canvas.width, CEILING_Y);
      ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y);

      // Neon Platform edges
      ctx.strokeStyle = '#818CF8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, CEILING_Y); ctx.lineTo(canvas.width, CEILING_Y);
      ctx.moveTo(0, FLOOR_Y); ctx.lineTo(canvas.width, FLOOR_Y);
      ctx.stroke();

      if (!gameOver) {
        // Distance counter
        distanceRef.current += 1;
        if (distanceRef.current % 12 === 0) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
          setDistance(Math.floor(distanceRef.current / 12));
          if (onScoreUpdate) onScoreUpdate(scoreRef.current);
        }

        // Player physics
        const p = playerRef.current;
        p.vy += 0.55 * gravityDirRef.current;
        p.y += p.vy;

        // Collision with floor
        if (p.y >= FLOOR_Y - p.radius) {
          p.y = FLOOR_Y - p.radius;
          p.vy = 0;
          p.onSurface = true;
        } else if (p.y <= CEILING_Y + p.radius) {
          p.y = CEILING_Y + p.radius;
          p.vy = 0;
          p.onSurface = true;
        } else {
          p.onSurface = false;
        }

        // Spawn hazards
        nextSpawnRef.current -= 1;
        if (nextSpawnRef.current <= 0) {
          nextSpawnRef.current = Math.max(30, 55 - Math.floor(distanceRef.current / 450));
          const surface = Math.random() > 0.5 ? 'FLOOR' : 'CEILING';
          const isSpike = Math.random() > 0.3;
          hazardsRef.current.push({
            id: nextIdRef.current++,
            x: canvas.width + 20,
            y: surface === 'FLOOR' ? FLOOR_Y - 24 : CEILING_Y,
            w: 20,
            h: 24,
            type: isSpike ? 'SPIKE' : 'CRYSTAL',
            surface
          });
        }

        // Move hazards & collision
        for (let i = hazardsRef.current.length - 1; i >= 0; i--) {
          const h = hazardsRef.current[i];
          h.x -= speedRef.current;

          // Player bounding box collision
          const collidesX = Math.abs((p.x) - (h.x + h.w / 2)) < (p.radius + h.w / 2);
          const collidesY = Math.abs((p.y) - (h.y + h.h / 2)) < (p.radius + h.h / 2);

          if (collidesX && collidesY) {
            if (h.type === 'CRYSTAL') {
              scoreRef.current += 20;
              setScore(scoreRef.current);
              if (onScoreUpdate) onScoreUpdate(scoreRef.current);
              hazardsRef.current.splice(i, 1);
              continue;
            } else {
              setGameOver(true);
              if (onGameOver) onGameOver(scoreRef.current);
              break;
            }
          }

          if (h.x < -40) {
            hazardsRef.current.splice(i, 1);
          }
        }
      }

      // Draw Hazards
      for (const h of hazardsRef.current) {
        if (h.type === 'SPIKE') {
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          if (h.surface === 'FLOOR') {
            ctx.moveTo(h.x, h.y + h.h);
            ctx.lineTo(h.x + h.w / 2, h.y);
            ctx.lineTo(h.x + h.w, h.y + h.h);
          } else {
            ctx.moveTo(h.x, h.y);
            ctx.lineTo(h.x + h.w / 2, h.y + h.h);
            ctx.lineTo(h.x + h.w, h.y);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Crystal
          ctx.fillStyle = '#00F0FF';
          ctx.beginPath();
          ctx.arc(h.x + 10, h.y + 12, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Draw Player Runner
      const p = playerRef.current;
      ctx.fillStyle = '#A855F7'; // Neon Purple Quantum Runner
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gravity aura ring
      ctx.strokeStyle = gravityDirRef.current === 1 ? '#38BDF8' : '#F43F5E';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

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
  }, [gravityState, invertGravity, onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-gravity-runner">
      <div className={styles.scoreboard} id="gravity-runner-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-gravity-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>DISTANCE</span>
          <span className={styles.value} id="score-gravity-dist">{distance}m</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>GRAVITY</span>
          <span className={styles.value} id="score-gravity-dir">{gravityState === 'DOWN' ? 'FLOOR (▼)' : 'CEILING (▲)'}</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-gravity-runner"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="gravity-runner-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-gravity-invert"
          onClick={invertGravity}
        >
          🔄 Invert Gravity (Flip Ceiling / Floor)
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="gravity-runner-gameover">
          <h3 className={styles.overlayTitle}>KINETIC IMPACT — TERMINATED</h3>
          <p className={styles.overlayText}>
            Distance Survived: {distance}m | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-gravity-restart"
            onClick={restart}
          >
            Launch Gravity Shift
          </button>
        </div>
      )}
    </div>
  );
});

GravityRunner.displayName = 'GravityRunner';
