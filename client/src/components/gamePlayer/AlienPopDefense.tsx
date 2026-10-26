import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TowerDefenseLite.module.css';

export interface AlienPopDefenseRef {
  restart: () => void;
  getScore: () => number;
}

interface AlienPopDefenseProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Warhead {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growing: boolean;
  done: boolean;
}

export const AlienPopDefense = forwardRef<AlienPopDefenseRef, AlienPopDefenseProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [citiesLeft, setCitiesLeft] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const citiesRef = useRef<boolean[]>([true, true, true]); // Left, Mid, Right
  const runningRef = useRef<boolean>(true);

  const warheadsRef = useRef<Warhead[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const nextSpawnRef = useRef<number>(40);
  const nextIdRef = useRef<number>(1);

  const launchFlak = useCallback((targetX: number, targetY: number) => {
    if (gameOver) return;
    explosionsRef.current.push({
      x: targetX,
      y: targetY,
      radius: 4,
      maxRadius: 36,
      growing: true,
      done: false
    });
  }, [gameOver]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    citiesRef.current = [true, true, true];
    warheadsRef.current = [];
    explosionsRef.current = [];
    setScore(0);
    setCitiesLeft(3);
    setWave(1);
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

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      launchFlak(x, Math.min(380, y));
    };

    canvas.addEventListener('click', handleCanvasClick);

    const cityX = [60, 180, 300];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Night sky
      ctx.fillStyle = '#050515';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // City ground base
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 420, canvas.width, 60);

      // Draw Cities
      for (let i = 0; i < 3; i++) {
        const cx = cityX[i];
        if (citiesRef.current[i]) {
          ctx.fillStyle = '#00F0FF';
          ctx.fillRect(cx - 24, 400, 48, 20);
          ctx.fillRect(cx - 14, 385, 28, 15);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx - 24, 400, 48, 20);
        } else {
          // Ruins
          ctx.fillStyle = '#475569';
          ctx.fillRect(cx - 20, 412, 40, 8);
        }
      }

      if (!gameOver) {
        // Spawn alien missiles
        nextSpawnRef.current -= 1;
        if (nextSpawnRef.current <= 0) {
          nextSpawnRef.current = Math.max(25, 55 - Math.floor(scoreRef.current / 300));
          const targetCityIdx = Math.floor(Math.random() * 3);
          const tx = cityX[targetCityIdx];
          warheadsRef.current.push({
            id: nextIdRef.current++,
            x: Math.random() * 320 + 20,
            y: 0,
            targetX: tx,
            targetY: 410,
            speed: 1.4 + Math.random() * 0.9
          });
        }

        // Update explosions
        for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
          const exp = explosionsRef.current[i];
          if (exp.growing) {
            exp.radius += 2.2;
            if (exp.radius >= exp.maxRadius) exp.growing = false;
          } else {
            exp.radius -= 1.8;
            if (exp.radius <= 0) {
              explosionsRef.current.splice(i, 1);
              continue;
            }
          }

          // Check warhead interception
          for (let j = warheadsRef.current.length - 1; j >= 0; j--) {
            const w = warheadsRef.current[j];
            if (Math.hypot(w.x - exp.x, w.y - exp.y) <= exp.radius) {
              scoreRef.current += 25;
              setScore(scoreRef.current);
              if (onScoreUpdate) onScoreUpdate(scoreRef.current);
              warheadsRef.current.splice(j, 1);
            }
          }
        }

        // Update warheads
        for (let i = warheadsRef.current.length - 1; i >= 0; i--) {
          const w = warheadsRef.current[i];
          const angle = Math.atan2(w.targetY - w.y, w.targetX - w.x);
          w.x += Math.cos(angle) * w.speed;
          w.y += Math.sin(angle) * w.speed;

          // Impact at ground
          if (w.y >= 405) {
            // Find closest city
            for (let c = 0; c < 3; c++) {
              if (Math.abs(w.x - cityX[c]) < 35 && citiesRef.current[c]) {
                citiesRef.current[c] = false;
                const remaining = citiesRef.current.filter(Boolean).length;
                setCitiesLeft(remaining);

                if (remaining === 0) {
                  setGameOver(true);
                  if (onGameOver) onGameOver(scoreRef.current);
                }
                break;
              }
            }
            warheadsRef.current.splice(i, 1);
          }
        }
      }

      // Draw Warhead smoke trails
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.5;
      for (const w of warheadsRef.current) {
        ctx.beginPath();
        ctx.moveTo(w.x, 0);
        ctx.lineTo(w.x, w.y);
        ctx.stroke();

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(w.x, w.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Explosions
      for (const exp of explosionsRef.current) {
        const grad = ctx.createRadialGradient(exp.x, exp.y, 2, exp.x, exp.y, exp.radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.4, '#FDE047');
        grad.addColorStop(0.8, '#F97316');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (runningRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [gameOver, launchFlak, onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-alien-pop-defense">
      <div className={styles.scoreboard} id="alien-pop-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-pop-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>CITIES</span>
          <span className={styles.value} id="score-pop-cities">{'🏙️ '.repeat(citiesLeft)}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SECTOR</span>
          <span className={styles.value} id="score-pop-wave">FLAK DEFENSE</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-alien-pop-defense"
        />
      </div>

      {/* Mobile Touch Quick Silo Fire Buttons */}
      <div className={styles.mobileControls} id="alien-pop-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pop-silo-left"
          onClick={() => launchFlak(60, 220)}
        >
          💥 Flak Sector Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pop-silo-mid"
          onClick={() => launchFlak(180, 200)}
        >
          💥 Flak Sector Mid
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pop-silo-right"
          onClick={() => launchFlak(300, 220)}
        >
          💥 Flak Sector Right
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="alien-pop-gameover">
          <h3 className={styles.overlayTitle}>ALL METROPOLISES OVERRUN</h3>
          <p className={styles.overlayText}>
            Defense Interceptions: {Math.floor(score / 25)} | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-alien-pop-restart"
            onClick={restart}
          >
            Re-arm Flak Batteries
          </button>
        </div>
      )}
    </div>
  );
});

AlienPopDefense.displayName = 'AlienPopDefense';
