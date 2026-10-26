import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './FlappyNeon.module.css';

export interface FlappyNeonRef {
  restart: () => void;
  getScore: () => number;
}

interface FlappyNeonProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

const GRAVITY = 0.38;
const JUMP_IMPULSE = -6.8;
const PIPE_WIDTH = 52;
const PIPE_GAP = 135;
const PIPE_SPEED = 2.4;

export const FlappyNeon = forwardRef<FlappyNeonRef, FlappyNeonProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const s = localStorage.getItem('nexusplay_flappy_best');
      return s ? parseInt(s, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [gameOver, setGameOver] = useState<boolean>(false);

  const birdYRef = useRef<number>(240);
  const birdVyRef = useRef<number>(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);
  const frameCountRef = useRef<number>(0);

  const flap = useCallback(() => {
    if (!runningRef.current) return;
    birdVyRef.current = JUMP_IMPULSE;
  }, []);

  const restart = useCallback(() => {
    birdYRef.current = 240;
    birdVyRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    runningRef.current = true;
    frameCountRef.current = 0;
    setScore(0);
    setGameOver(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (runningRef.current) flap();
        else restart();
      } else if (e.key === 'r' || e.key === 'R') {
        if (!runningRef.current) restart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flap, restart]);

  // Main 60 FPS Physics Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BIRD_X = 80;
    const BIRD_RADIUS = 12;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (runningRef.current) {
        frameCountRef.current += 1;

        // Apply bird gravity
        birdVyRef.current += GRAVITY;
        birdYRef.current += birdVyRef.current;

        // Floor and ceiling collisions
        if (birdYRef.current + BIRD_RADIUS >= height - 20) {
          birdYRef.current = height - 20 - BIRD_RADIUS;
          runningRef.current = false;
          setGameOver(true);
          onGameOver?.(scoreRef.current);
        } else if (birdYRef.current - BIRD_RADIUS <= 0) {
          birdYRef.current = BIRD_RADIUS;
          birdVyRef.current = 0;
        }

        // Spawn pipes every 100 frames (~1.6s)
        if (frameCountRef.current % 100 === 0) {
          const topH = 60 + Math.random() * (height - PIPE_GAP - 160);
          pipesRef.current.push({
            x: width,
            topHeight: topH,
            bottomY: topH + PIPE_GAP,
            passed: false
          });
        }

        // Update pipes
        const pipes = pipesRef.current;
        for (let i = pipes.length - 1; i >= 0; i--) {
          const p = pipes[i];
          p.x -= PIPE_SPEED;

          // Check score pass
          if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
            p.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            onScoreUpdate?.(scoreRef.current);

            setBestScore(prev => {
              if (scoreRef.current > prev) {
                try { localStorage.setItem('nexusplay_flappy_best', scoreRef.current.toString()); } catch {}
                return scoreRef.current;
              }
              return prev;
            });
          }

          // Check pipe collision
          if (
            BIRD_X + BIRD_RADIUS > p.x &&
            BIRD_X - BIRD_RADIUS < p.x + PIPE_WIDTH
          ) {
            if (
              birdYRef.current - BIRD_RADIUS < p.topHeight ||
              birdYRef.current + BIRD_RADIUS > p.bottomY
            ) {
              runningRef.current = false;
              setGameOver(true);
              onGameOver?.(scoreRef.current);
            }
          }

          // Remove off-screen pipes
          if (p.x + PIPE_WIDTH < -10) {
            pipes.splice(i, 1);
          }
        }
      }

      // Render Scene
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, width, height);

      // Grid background effect
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw Pipes (Neon Emerald Pillars)
      const pipes = pipesRef.current;
      for (const p of pipes) {
        ctx.fillStyle = '#10B981';
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 10;

        // Top pipe
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.fillRect(p.x - 3, p.topHeight - 14, PIPE_WIDTH + 6, 14);

        // Bottom pipe
        ctx.fillRect(p.x, p.bottomY, PIPE_WIDTH, height - p.bottomY - 20);
        ctx.fillRect(p.x - 3, p.bottomY, PIPE_WIDTH + 6, 14);

        ctx.shadowBlur = 0;
      }

      // Ground border
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, height - 20, width, 20);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(0, height - 20, width, 2);

      // Draw Bird (Neon Amber Orb with wing)
      const birdY = birdYRef.current;
      const vy = birdVyRef.current;
      const angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, vy * 0.08));

      ctx.save();
      ctx.translate(BIRD_X, birdY);
      ctx.rotate(angle);

      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(5, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0B0F19';
      ctx.beginPath();
      ctx.arc(6, -4, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(9, -2);
      ctx.lineTo(16, 1);
      ctx.lineTo(9, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-flappy-neon">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>FLAPPY NEON</h3>
          <span>Impulse Cyber Flight</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-flappy-score">{score}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>BEST</span>
            <span className={styles.statValue} id="val-flappy-best">{bestScore}</span>
          </div>
        </div>
      </div>

      <div
        className={styles.canvasWrapper}
        id="wrapper-flappy-neon"
        onClick={flap}
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={560}
          className={styles.gameCanvas}
          id="canvas-flappy-neon"
        />

        {gameOver && (
          <div className={styles.overlay} id="flappy-gameover-overlay">
            <h2 className={styles.overlayTitle}>IMPACT DETECTED</h2>
            <div className={styles.overlayScore}>Pipes Cleared: <strong>{score}</strong></div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-flappy-restart"
            >
              Reboot Thrusters (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Tap screen or Spacebar to flap wings • Avoid green laser pillars
      </div>

      {/* Mobile Touch Flap Button */}
      <div className={styles.mobileControls} id="flappy-mobile-controls">
        <button
          className={styles.flapButton}
          onClick={flap}
          id="btn-flappy-jump"
          aria-label="Flap Wings"
        >
          ⚡ FLAP WINGS
        </button>
      </div>
    </div>
  );
});

FlappyNeon.displayName = 'FlappyNeon';
