import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ArcadeCricket.module.css';

export interface BasketballShootoutRef {
  restart: () => void;
  getScore: () => number;
}

interface BasketballShootoutProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const BasketballShootout = forwardRef<BasketballShootoutRef, BasketballShootoutProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [streak, setStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [power, setPower] = useState<number>(50);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const streakRef = useRef<number>(0);
  const timeRef = useRef<number>(60);
  const powerRef = useRef<number>(50);
  const powerDirRef = useRef<number>(1.8);
  const runningRef = useRef<boolean>(true);

  const ballRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    gravity: number;
    active: boolean;
    scored: boolean;
  }>({
    x: 80,
    y: 380,
    vx: 0,
    vy: 0,
    gravity: 0.32,
    active: false,
    scored: false
  });

  const shoot = useCallback(() => {
    if (ballRef.current.active || gameOver) return;
    const p = powerRef.current; // 20 to 100
    // Ideal power is around 68-76
    const vx = 4.2 + (p / 100) * 2.8;
    const vy = -(7.5 + (p / 100) * 5.2);

    ballRef.current = {
      x: 80,
      y: 380,
      vx,
      vy,
      gravity: 0.32,
      active: true,
      scored: false
    };
  }, [gameOver]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    streakRef.current = 0;
    timeRef.current = 60;
    setScore(0);
    setStreak(0);
    setTimeLeft(60);
    setGameOver(false);
    ballRef.current.active = false;
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  // Countdown timer
  useEffect(() => {
    if (gameOver) return;
    const timer = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        clearInterval(timer);
        setGameOver(true);
        if (onGameOver) onGameOver(scoreRef.current);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') shoot();
    };
    window.addEventListener('keydown', handleKeyDown);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Arena background
      ctx.fillStyle = '#0B132B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Hardwood floor
      ctx.fillStyle = '#C28448';
      ctx.fillRect(0, 420, canvas.width, 60);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 420, canvas.width, 60);

      // Backboard (Right side)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(300, 120, 8, 100);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(300, 150, 6, 40);

      // Rim (Orange ring)
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(270, 190);
      ctx.lineTo(300, 190);
      ctx.stroke();

      // Net (Triangular mesh)
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(272, 192);
      ctx.lineTo(280, 220);
      ctx.lineTo(290, 220);
      ctx.lineTo(298, 192);
      ctx.stroke();

      // Power meter update
      if (!ballRef.current.active && !gameOver) {
        powerRef.current += powerDirRef.current;
        if (powerRef.current >= 95 || powerRef.current <= 15) {
          powerDirRef.current = -powerDirRef.current;
        }
        setPower(Math.round(powerRef.current));
      }

      // Ball Physics
      const b = ballRef.current;
      if (b.active) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += b.gravity;

        // Rim / Backboard collision
        const rimX = 285;
        const rimY = 190;
        const distToRim = Math.hypot(b.x - rimX, b.y - rimY);

        if (distToRim < 14 && b.vy > 0 && !b.scored) {
          // SWISH / SCORE!
          b.scored = true;
          streakRef.current += 1;
          const pts = (distToRim < 8 ? 3 : 2) * (streakRef.current > 2 ? 2 : 1);
          scoreRef.current += pts;
          setScore(scoreRef.current);
          setStreak(streakRef.current);
          if (onScoreUpdate) onScoreUpdate(scoreRef.current);
        }

        // Backboard bounce
        if (b.x >= 292 && b.y >= 120 && b.y <= 220) {
          b.vx = -Math.abs(b.vx) * 0.6;
          b.x = 290;
        }

        // Floor collision / reset
        if (b.y >= 415) {
          if (!b.scored) streakRef.current = 0;
          setStreak(streakRef.current);
          b.active = false;
        }
      }

      // Draw Ball
      const ballX = b.active ? b.x : 80;
      const ballY = b.active ? b.y : 380;
      ctx.fillStyle = '#EA580C'; // Basketball Orange
      ctx.beginPath();
      ctx.arc(ballX, ballY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ball ribs
      ctx.beginPath();
      ctx.moveTo(ballX - 11, ballY);
      ctx.lineTo(ballX + 11, ballY);
      ctx.moveTo(ballX, ballY - 11);
      ctx.lineTo(ballX, ballY + 11);
      ctx.stroke();

      // Power gauge visualization
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(20, 20, 160, 18);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(20, 20, 160, 18);

      const pNorm = powerRef.current / 100;
      const barColor = (powerRef.current >= 65 && powerRef.current <= 80) ? '#10B981' : '#F59E0B';
      ctx.fillStyle = barColor;
      ctx.fillRect(22, 22, 156 * pNorm, 14);

      // Sweet spot marker
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(22 + 156 * 0.68, 20, 156 * 0.12, 18);

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
  }, [gameOver, onGameOver, onScoreUpdate, shoot]);

  return (
    <div className={styles.container} id="game-basketball-shootout">
      <div className={styles.scoreboard} id="basketball-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-basket-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>STREAK</span>
          <span className={styles.value} id="score-basket-streak">{streak} 🔥</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>CLOCK</span>
          <span className={styles.value} id="score-basket-time">{timeLeft}s</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SHOT POWER</span>
          <span className={styles.value} id="score-basket-power">{power}%</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-basketball-shootout"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="basketball-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-basket-shoot"
          onClick={shoot}
          disabled={ballRef.current.active || gameOver}
        >
          🏀 Shoot Hoop (Time Sweet Spot)
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="basketball-gameover">
          <h3 className={styles.overlayTitle}>BUZZER SOUNDED!</h3>
          <p className={styles.overlayText}>
            Final Score: {score} PTS | Max Streak: {streak}
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-basketball-restart"
            onClick={restart}
          >
            Play Next Shootout
          </button>
        </div>
      )}
    </div>
  );
});

BasketballShootout.displayName = 'BasketballShootout';
