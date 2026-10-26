import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface PhysicsPinballArcadeRef {
  restart: () => void;
  getScore: () => number;
}

interface PhysicsPinballArcadeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const PhysicsPinballArcade = forwardRef<PhysicsPinballArcadeRef, PhysicsPinballArcadeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [ballsRemaining, setBallsRemaining] = useState<number>(3);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [statusText, setStatusText] = useState<string>('Pinball Arcade: Plunge the steel ball, hit glowing bumpers, keep it off the drain!');
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');

  const scoreRef = useRef<number>(initialScore);
  const ball = useRef({ x: 340, y: 240, vx: 0, vy: 0, radius: 6, active: false });
  const bumpers = useRef([
    { x: 160, y: 80, radius: 18, color: '#f43f5e', points: 100 },
    { x: 240, y: 80, radius: 18, color: '#eab308', points: 100 },
    { x: 200, y: 130, radius: 22, color: '#00F0FF', points: 150 }
  ]);
  const leftFlipper = useRef({ active: false, timer: 0 });
  const rightFlipper = useRef({ active: false, timer: 0 });
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setBallsRemaining(3);
    setMultiplier(1);
    setGameState('READY');
    setStatusText('Pinball machine reset! Pull plunger to launch Ball 1.');
    ball.current = { x: 340, y: 240, vx: 0, vy: 0, radius: 6, active: false };
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const plunge = () => {
    if (gameState !== 'READY' && ball.current.active) return;
    setGameState('PLAYING');
    ball.current = {
      x: 340,
      y: 220,
      vx: -1.2,
      vy: -11.5, // Plunger spring force
      radius: 6,
      active: true
    };
    setStatusText('💥 PLUNGER RELEASED! Steel ball propelled into upper orbit!');
  };

  const flipLeft = () => {
    leftFlipper.current = { active: true, timer: 12 };
    const b = ball.current;
    if (b.active && b.x > 110 && b.x < 180 && b.y > 210 && b.y < 250) {
      b.vy = -9.0;
      b.vx = 4.5;
      setStatusText('⚡ Left flipper solid hit! High shot to right bumpers!');
    }
  };

  const flipRight = () => {
    rightFlipper.current = { active: true, timer: 12 };
    const b = ball.current;
    if (b.active && b.x > 200 && b.x < 270 && b.y > 210 && b.y < 250) {
      b.vy = -9.0;
      b.vx = -4.5;
      setStatusText('⚡ Right flipper power flip! Ball aimed at upper loop!');
    }
  };

  const dualFlip = () => {
    flipLeft();
    flipRight();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      const b = ball.current;

      if (b.active) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.22; // Gravity
        b.vx *= 0.992; // Table friction

        // Outer wall bounces
        if (b.x < 75) {
          b.x = 75;
          b.vx *= -0.85;
        }
        if (b.x > 325 && b.y < 200) {
          b.x = 325;
          b.vx *= -0.85;
        }
        if (b.y < 20) {
          b.y = 20;
          b.vy *= -0.85;
        }

        // Bumper collisions
        bumpers.current.forEach(bmp => {
          const dist = Math.hypot(b.x - bmp.x, b.y - bmp.y);
          if (dist < b.radius + bmp.radius) {
            const angle = Math.atan2(b.y - bmp.y, b.x - bmp.x);
            b.vx = Math.cos(angle) * 7.5;
            b.vy = Math.sin(angle) * 7.5;

            const bonus = bmp.points * multiplier;
            const nextScore = scoreRef.current + bonus;
            updateScore(nextScore);
            setStatusText(`💥 BUMPER JACKPOT! +${bonus} PTS!`);
          }
        });

        // Drain Chute (Bottom loss at y > 265)
        if (b.y > 265) {
          b.active = false;
          setBallsRemaining(br => {
            const next = br - 1;
            if (next <= 0) {
              setGameState('GAME_OVER');
              setStatusText(`💀 BALL 3 DRAINED! Game Over. Final Pinball Score: ${scoreRef.current}`);
              onGameOver?.(scoreRef.current);
            } else {
              setGameState('READY');
              setStatusText(`Ball Drained! ${next} Balls Remaining. Pull plunger.`);
            }
            return next;
          });
        }
      }

      // Flipper timers
      if (leftFlipper.current.timer > 0) leftFlipper.current.timer -= 1;
      if (rightFlipper.current.timer > 0) rightFlipper.current.timer -= 1;

      // Draw Retro Pinball Cabinet
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 400, 280);

      // Wooden Side Rails
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(60, 0, 15, 280);
      ctx.fillRect(325, 0, 15, 280);

      // Plunger lane (Right side 325-360)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(330, 100, 25, 180);

      // Arc curve at top
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(200, 100, 125, Math.PI, 2 * Math.PI);
      ctx.stroke();

      // Draw Bumpers (Neon Glow)
      bumpers.current.forEach(bmp => {
        ctx.fillStyle = bmp.color;
        ctx.beginPath();
        ctx.arc(bmp.x, bmp.y, bmp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('100', bmp.x, bmp.y + 3);
      });

      // Draw Flippers
      // Left Flipper at (130, 240)
      ctx.strokeStyle = leftFlipper.current.timer > 0 ? '#38bdf8' : '#e2e8f0';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(120, 235);
      ctx.lineTo(165, leftFlipper.current.timer > 0 ? 220 : 245);
      ctx.stroke();

      // Right Flipper at (250, 240)
      ctx.strokeStyle = rightFlipper.current.timer > 0 ? '#38bdf8' : '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(260, 235);
      ctx.lineTo(215, rightFlipper.current.timer > 0 ? 220 : 245);
      ctx.stroke();

      // Draw Steel Ball
      if (b.active || gameState === 'READY') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gameState, multiplier, onGameOver, updateScore]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Pinball Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Balls</span>
          <span className={styles.scoreValue}>{ballsRemaining} / 3</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Multiplier</span>
          <span className={styles.scoreValue}>{multiplier}X</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Format</span>
          <span className={styles.scoreValue}>Arcade Classic</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={280} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '24px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-pinball-plunge"
          onClick={plunge}
          disabled={ball.current.active}
        >
          🚀 Plunge Ball
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pinball-flip-left"
          onClick={flipLeft}
          disabled={gameState !== 'PLAYING'}
        >
          ◀ Left Flip
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pinball-flip-right"
          onClick={flipRight}
          disabled={gameState !== 'PLAYING'}
        >
          Right Flip ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-pinball-dual-flip"
          onClick={dualFlip}
          disabled={gameState !== 'PLAYING'}
        >
          ⚡ Dual Flip
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-pinball-restart"
          onClick={restart}
        >
          Restart Pinball Arcade
        </button>
      </div>
    </div>
  );
});

PhysicsPinballArcade.displayName = 'PhysicsPinballArcade';
