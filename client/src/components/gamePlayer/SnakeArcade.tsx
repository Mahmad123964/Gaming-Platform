import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './SnakeArcade.module.css';

export interface SnakeArcadeRef {
  restart: () => void;
  getScore: () => number;
}

interface SnakeArcadeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type Direction = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';
interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 20;

export const SnakeArcade = forwardRef<SnakeArcadeRef, SnakeArcadeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexusplay_snake_best');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Game state stored in refs to drive requestAnimationFrame or interval loop
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]);
  const dirRef = useRef<Direction>('RIGHT');
  const nextDirRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const scoreRef = useRef<number>(initialScore);
  const gameOverRef = useRef<boolean>(false);

  // Spawn food at open grid cell
  const spawnFood = useCallback(() => {
    const snake = snakeRef.current;
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const collides = snake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
      if (!collides) break;
    }
    foodRef.current = newFood;
  }, []);

  // Restart function
  const restart = useCallback(() => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    scoreRef.current = 0;
    gameOverRef.current = false;
    setScore(0);
    setGameOver(false);
    spawnFood();
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart, spawnFood]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  // Handle steering input
  const changeDirection = useCallback((newDir: Direction) => {
    if (gameOverRef.current) return;
    const current = dirRef.current;
    if (newDir === 'UP' && current !== 'DOWN') nextDirRef.current = 'UP';
    if (newDir === 'DOWN' && current !== 'UP') nextDirRef.current = 'DOWN';
    if (newDir === 'LEFT' && current !== 'RIGHT') nextDirRef.current = 'LEFT';
    if (newDir === 'RIGHT' && current !== 'LEFT') nextDirRef.current = 'RIGHT';
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
        case 'r':
        case 'R':
          if (gameOverRef.current) {
            e.preventDefault();
            restart();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, restart]);

  // Main game tick loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOverRef.current || isPaused) return;

      dirRef.current = nextDirRef.current;
      const head = { ...snakeRef.current[0] };

      switch (dirRef.current) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Wall collision check
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOverRef.current = true;
        setGameOver(true);
        onGameOver?.(scoreRef.current);
        return;
      }

      // Self collision check
      const selfCollide = snakeRef.current.some(seg => seg.x === head.x && seg.y === head.y);
      if (selfCollide) {
        gameOverRef.current = true;
        setGameOver(true);
        onGameOver?.(scoreRef.current);
        return;
      }

      const newSnake = [head, ...snakeRef.current];

      // Check food collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        const newScore = scoreRef.current + 10;
        scoreRef.current = newScore;
        setScore(newScore);
        onScoreUpdate?.(newScore);

        setHighScore(prev => {
          if (newScore > prev) {
            try { localStorage.setItem('nexusplay_snake_best', newScore.toString()); } catch {}
            return newScore;
          }
          return prev;
        });

        spawnFood();
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
    }, 120);

    return () => clearInterval(interval);
  }, [isPaused, onGameOver, onScoreUpdate, spawnFood]);

  // Canvas render loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cellSize = width / GRID_SIZE;

      // Clear background
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(width, i * cellSize);
        ctx.stroke();
      }

      // Draw Food (neon ruby orb)
      const food = foodRef.current;
      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(
        food.x * cellSize + cellSize / 2,
        food.y * cellSize + cellSize / 2,
        cellSize / 2.5,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Draw Snake (neon cyan & emerald)
      const snake = snakeRef.current;
      snake.forEach((seg, idx) => {
        ctx.shadowColor = idx === 0 ? '#00F0FF' : '#10B981';
        ctx.shadowBlur = idx === 0 ? 12 : 6;
        ctx.fillStyle = idx === 0 ? '#00F0FF' : '#10B981';
        ctx.fillRect(
          seg.x * cellSize + 1.5,
          seg.y * cellSize + 1.5,
          cellSize - 3,
          cellSize - 3
        );
      });

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className={styles.container} id="game-snake-arcade">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>SNAKE ARCADE</h3>
          <span>Classic Grid Survival</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-snake-score">{score}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>BEST</span>
            <span className={styles.statValue} id="val-snake-best">{highScore}</span>
          </div>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className={styles.gameCanvas}
          id="canvas-snake-game"
        />

        {gameOver && (
          <div className={styles.overlay} id="snake-gameover-overlay">
            <h2 className={styles.overlayTitle}>GAME OVER</h2>
            <div className={styles.overlayScore}>Final Score: <strong>{score}</strong></div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-snake-restart"
            >
              Play Again (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Controls: Arrows / WASD to steer • R to restart
      </div>

      {/* Mobile Touch D-Pad */}
      <div className={styles.dpad} id="snake-mobile-dpad">
        <button
          className={styles.dpadButton}
          onClick={() => changeDirection('UP')}
          id="btn-snake-up"
          aria-label="Up"
        >
          ▲
        </button>
        <div className={styles.dpadRow}>
          <button
            className={styles.dpadButton}
            onClick={() => changeDirection('LEFT')}
            id="btn-snake-left"
            aria-label="Left"
          >
            ◀
          </button>
          <button
            className={styles.dpadButton}
            onClick={() => changeDirection('DOWN')}
            id="btn-snake-down"
            aria-label="Down"
          >
            ▼
          </button>
          <button
            className={styles.dpadButton}
            onClick={() => changeDirection('RIGHT')}
            id="btn-snake-right"
            aria-label="Right"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
});

SnakeArcade.displayName = 'SnakeArcade';
