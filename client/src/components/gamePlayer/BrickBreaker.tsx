import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './BrickBreaker.module.css';

export interface BrickBreakerRef {
  restart: () => void;
  getScore: () => number;
}

interface BrickBreakerProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  color: string;
  points: number;
}

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 6;

const ROW_COLORS = [
  '#FF0055', // Ruby
  '#FF5500', // Orange
  '#FFB800', // Amber
  '#00F0FF', // Cyan
  '#10B981'  // Emerald
];

export const BrickBreaker = forwardRef<BrickBreakerRef, BrickBreakerProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [lives, setLives] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  // Mutable refs for high-performance physics animation loop
  const paddleXRef = useRef<number>(200);
  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
    x: 240,
    y: 350,
    vx: 3.5,
    vy: -4
  });
  const bricksRef = useRef<Brick[]>([]);
  const scoreRef = useRef<number>(initialScore);
  const livesRef = useRef<number>(3);
  const runningRef = useRef<boolean>(true);

  // Initialize Bricks
  const initBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const brickW = 50;
    const brickH = 16;
    const padding = 6;
    const offsetTop = 40;
    const offsetLeft = 16;

    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: offsetLeft + c * (brickW + padding),
          y: offsetTop + r * (brickH + padding),
          width: brickW,
          height: brickH,
          hp: 1,
          color: ROW_COLORS[r % ROW_COLORS.length],
          points: (BRICK_ROWS - r) * 10
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const restart = useCallback(() => {
    paddleXRef.current = 200;
    ballRef.current = { x: 240, y: 340, vx: (Math.random() > 0.5 ? 3.5 : -3.5), vy: -4 };
    scoreRef.current = 0;
    livesRef.current = 3;
    runningRef.current = true;
    setScore(0);
    setLives(3);
    setGameOver(false);
    setVictory(false);
    initBricks();
    onScoreUpdate?.(0);
    onRestart?.();
  }, [initBricks, onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  // Initial load
  useEffect(() => {
    initBricks();
  }, [initBricks]);

  // Mouse / Pointer Drag movement
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!runningRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scale = 480 / rect.width;
    const canvasX = clientX * scale;
    paddleXRef.current = Math.max(0, Math.min(480 - PADDLE_WIDTH, canvasX - PADDLE_WIDTH / 2));
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!runningRef.current) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        paddleXRef.current = Math.max(0, paddleXRef.current - 25);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        paddleXRef.current = Math.min(480 - PADDLE_WIDTH, paddleXRef.current + 25);
      } else if (e.key === 'r' || e.key === 'R') {
        if (!runningRef.current) restart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restart]);

  // Main physics loop
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
        const ball = ballRef.current;
        const paddleX = paddleXRef.current;

        // Move ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall collisions
        if (ball.x - BALL_RADIUS <= 0) {
          ball.x = BALL_RADIUS;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + BALL_RADIUS >= width) {
          ball.x = width - BALL_RADIUS;
          ball.vx = -Math.abs(ball.vx);
        }

        if (ball.y - BALL_RADIUS <= 0) {
          ball.y = BALL_RADIUS;
          ball.vy = Math.abs(ball.vy);
        }

        // Paddle collision
        const paddleY = height - 30;
        if (
          ball.y + BALL_RADIUS >= paddleY &&
          ball.y - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
          ball.x >= paddleX &&
          ball.x <= paddleX + PADDLE_WIDTH &&
          ball.vy > 0
        ) {
          ball.vy = -Math.abs(ball.vy);
          // Angle ball depending on where it hits paddle
          const hitOffset = (ball.x - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
          ball.vx = hitOffset * 5;
        }

        // Brick collision
        const bricks = bricksRef.current;
        for (let i = 0; i < bricks.length; i++) {
          const b = bricks[i];
          if (b.hp > 0) {
            if (
              ball.x + BALL_RADIUS >= b.x &&
              ball.x - BALL_RADIUS <= b.x + b.width &&
              ball.y + BALL_RADIUS >= b.y &&
              ball.y - BALL_RADIUS <= b.y + b.height
            ) {
              b.hp = 0;
              ball.vy = -ball.vy;
              const newScore = scoreRef.current + b.points;
              scoreRef.current = newScore;
              setScore(newScore);
              onScoreUpdate?.(newScore);

              // Check victory
              if (bricks.every(br => br.hp <= 0)) {
                runningRef.current = false;
                setVictory(true);
                onGameOver?.(newScore);
              }
              break;
            }
          }
        }

        // Bottom pit (lose life)
        if (ball.y - BALL_RADIUS > height) {
          livesRef.current -= 1;
          setLives(livesRef.current);

          if (livesRef.current <= 0) {
            runningRef.current = false;
            setGameOver(true);
            onGameOver?.(scoreRef.current);
          } else {
            // Respawn ball
            ball.x = paddleX + PADDLE_WIDTH / 2;
            ball.y = paddleY - 15;
            ball.vx = Math.random() > 0.5 ? 3.5 : -3.5;
            ball.vy = -4;
          }
        }
      }

      // Render Scene
      ctx.fillStyle = '#070A12';
      ctx.fillRect(0, 0, width, height);

      // Bricks
      bricksRef.current.forEach(b => {
        if (b.hp > 0) {
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 6;
          ctx.fillRect(b.x, b.y, b.width, b.height);
        }
      });

      // Paddle (neon cyan bar)
      const paddleX = paddleXRef.current;
      const paddleY = height - 30;
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      ctx.fillRect(paddleX, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Ball (glowing amber)
      const ball = ballRef.current;
      ctx.fillStyle = '#FFB800';
      ctx.shadowColor = '#FFB800';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-brick-breaker">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>BRICK BREAKER</h3>
          <span>Arcade Neon Breakout</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>LIVES</span>
            <span className={styles.statValue} id="val-breaker-lives">{'♥'.repeat(lives)}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-breaker-score">{score}</span>
          </div>
        </div>
      </div>

      <div
        className={styles.canvasWrapper}
        onPointerMove={handlePointerMove}
        id="wrapper-brick-breaker"
      >
        <canvas
          ref={canvasRef}
          width={480}
          height={400}
          className={styles.gameCanvas}
          id="canvas-brick-breaker"
        />

        {(gameOver || victory) && (
          <div className={styles.overlay} id="breaker-gameover-overlay">
            <h2 className={`${styles.overlayTitle} ${victory ? styles.overlayVictory : ''}`}>
              {victory ? 'VICTORY CLEARED!' : 'GAME OVER'}
            </h2>
            <div className={styles.overlayScore}>Final Score: <strong>{score}</strong></div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-breaker-restart"
            >
              Play Again (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Controls: Move mouse / Touch to guide paddle • Arrows Left/Right • R to restart
      </div>

      {/* Mobile Touch Steer Buttons */}
      <div className={styles.mobileButtons} id="breaker-mobile-buttons">
        <button
          className={styles.actionButton}
          onClick={() => { paddleXRef.current = Math.max(0, paddleXRef.current - 35); }}
          id="btn-breaker-left"
          aria-label="Paddle Left"
        >
          ◀
        </button>
        <button
          className={styles.actionButton}
          onClick={() => { paddleXRef.current = Math.min(480 - PADDLE_WIDTH, paddleXRef.current + 35); }}
          id="btn-breaker-right"
          aria-label="Paddle Right"
        >
          ▶
        </button>
      </div>
    </div>
  );
});

BrickBreaker.displayName = 'BrickBreaker';
