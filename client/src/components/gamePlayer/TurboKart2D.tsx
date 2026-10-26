import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './NeonHorizonRacer.module.css';

export interface TurboKart2DRef {
  restart: () => void;
  getScore: () => number;
}

interface TurboKart2DProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const TurboKart2D = forwardRef<TurboKart2DRef, TurboKart2DProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [lap, setLap] = useState<number>(1);
  const [speedDisplay, setSpeedDisplay] = useState<number>(0);
  const [isDrifting, setIsDrifting] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const lapRef = useRef<number>(1);
  const runningRef = useRef<boolean>(true);

  // Kart physics state
  const kartRef = useRef<{
    x: number;
    y: number;
    angle: number; // in radians
    speed: number;
    maxSpeed: number;
    accel: number;
    friction: number;
    steerSpeed: number;
    drifting: boolean;
    checkpoints: boolean[];
  }>({
    x: 180,
    y: 400,
    angle: -Math.PI / 2, // Facing up
    speed: 0,
    maxSpeed: 6.5,
    accel: 0.18,
    friction: 0.96,
    steerSpeed: 0.065,
    drifting: false,
    checkpoints: [false, false, false, false]
  });

  const steer = useCallback((dir: 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    const k = kartRef.current;
    const mult = k.drifting ? 1.6 : 1.0;
    if (dir === 'LEFT') k.angle -= k.steerSpeed * mult;
    if (dir === 'RIGHT') k.angle += k.steerSpeed * mult;
  }, [gameOver]);

  const accelerate = useCallback(() => {
    if (gameOver) return;
    const k = kartRef.current;
    k.speed = Math.min(k.maxSpeed, k.speed + k.accel);
  }, [gameOver]);

  const toggleDrift = useCallback(() => {
    if (gameOver) return;
    kartRef.current.drifting = !kartRef.current.drifting;
    setIsDrifting(kartRef.current.drifting);
  }, [gameOver]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    lapRef.current = 1;
    setScore(0);
    setLap(1);
    setSpeedDisplay(0);
    setIsDrifting(false);
    setGameOver(false);
    kartRef.current = {
      x: 180,
      y: 400,
      angle: -Math.PI / 2,
      speed: 0,
      maxSpeed: 6.5,
      accel: 0.18,
      friction: 0.96,
      steerSpeed: 0.065,
      drifting: false,
      checkpoints: [false, false, false, false]
    };
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
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') steer('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') steer('RIGHT');
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') accelerate();
      if (e.key === ' ' || e.key === 'Shift') toggleDrift();
    };

    window.addEventListener('keydown', handleKeyDown);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Track grass background
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer track boundary (Asphalt)
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(180, 240, 150, 190, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner infield grass (Infield island)
      ctx.fillStyle = '#064E3B';
      ctx.beginPath();
      ctx.ellipse(180, 240, 75, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      // Kerbs (Red & White apex borders)
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.ellipse(180, 240, 150, 190, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(180, 240, 75, 110, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Finish / Start Line (at bottom straight x: 180, y: 350-430)
      ctx.fillStyle = '#FFFFFF';
      for (let y = 350; y <= 430; y += 10) {
        ctx.fillRect(176, y, 8, 5);
      }

      if (!gameOver) {
        const k = kartRef.current;

        // Apply friction
        k.speed *= k.friction;
        if (k.speed < 0.05) k.speed = 0;
        setSpeedDisplay(Math.round(k.speed * 20));

        // Movement
        k.x += Math.cos(k.angle) * k.speed;
        k.y += Math.sin(k.angle) * k.speed;

        // Drift bonus points
        if (k.drifting && k.speed > 2) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
          if (onScoreUpdate) onScoreUpdate(scoreRef.current);
        }

        // Distance from track center (180, 240)
        const dx = (k.x - 180) / 150;
        const dy = (k.y - 240) / 190;
        const distOuter = Math.hypot(dx, dy);

        const idx = (k.x - 180) / 75;
        const idy = (k.y - 240) / 110;
        const distInner = Math.hypot(idx, idy);

        // Off-track penalty
        if (distOuter > 1.05 || distInner < 0.95) {
          k.speed *= 0.88; // Grass friction slows kart down
        }

        // Checkpoints navigation
        if (k.x > 250 && k.y < 240) k.checkpoints[0] = true; // Sector 1
        if (k.x < 180 && k.y < 120) k.checkpoints[1] = true; // Sector 2
        if (k.x < 110 && k.y > 240) k.checkpoints[2] = true; // Sector 3

        // Crossing finish line from left to right (y around 390)
        if (k.x >= 180 && k.checkpoints[0] && k.checkpoints[1] && k.checkpoints[2]) {
          // Completed lap
          k.checkpoints = [false, false, false, false];
          scoreRef.current += 150;
          setScore(scoreRef.current);
          if (onScoreUpdate) onScoreUpdate(scoreRef.current);

          if (lapRef.current >= 3) {
            setGameOver(true);
            if (onGameOver) onGameOver(scoreRef.current);
          } else {
            lapRef.current += 1;
            setLap(lapRef.current);
          }
        }
      }

      // Draw Kart
      const k = kartRef.current;
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(k.angle);

      // Kart body
      ctx.fillStyle = k.drifting ? '#FFB800' : '#00F0FF';
      ctx.fillRect(-14, -8, 28, 16);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-14, -8, 28, 16);

      // Wheels
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-12, -11, 8, 3);
      ctx.fillRect(4, -11, 8, 3);
      ctx.fillRect(-12, 8, 8, 3);
      ctx.fillRect(4, 8, 8, 3);

      // Driver helmet
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

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
  }, [accelerate, gameOver, onGameOver, onScoreUpdate, steer, toggleDrift]);

  return (
    <div className={styles.container} id="game-turbo-kart-2d">
      <div className={styles.scoreboard} id="turbo-kart-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-kart-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>LAP</span>
          <span className={styles.value} id="score-kart-lap">{lap} / 3</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SPEED</span>
          <span className={styles.value} id="score-kart-speed">{speedDisplay} MPH</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>DRIFT</span>
          <span className={styles.value} id="score-kart-drift">{isDrifting ? 'DRIFTING 🔥' : 'OFF'}</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-turbo-kart-2d"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="turbo-kart-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-kart-left"
          onClick={() => steer('LEFT')}
        >
          ◀ Steer Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-kart-gas"
          onClick={accelerate}
        >
          ▲ Gas / Accel
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-kart-drift"
          onClick={toggleDrift}
        >
          ⚡ Drift Toggle
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-kart-right"
          onClick={() => steer('RIGHT')}
        >
          Steer Right ▶
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="turbo-kart-gameover">
          <h3 className={styles.overlayTitle}>CHECKERED FLAG — RACE WON!</h3>
          <p className={styles.overlayText}>
            Laps: 3/3 | Total Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-turbo-kart-restart"
            onClick={restart}
          >
            Drive Next Grand Prix
          </button>
        </div>
      )}
    </div>
  );
});

TurboKart2D.displayName = 'TurboKart2D';
