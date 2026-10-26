import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './SnakeArcade.module.css';

export interface NeonPacMazeRef {
  restart: () => void;
  getScore: () => number;
}

interface NeonPacMazeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const COLS = 15;
const ROWS = 15;
const TILE = 24;

// 1 = Wall, 0 = Pellet, 2 = Power Pellet, 3 = Empty/Spawn
const INITIAL_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,0,0,0,1,0,0,0,1,0,0,0,2,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,3,0,0,0,0,0,0,1],
  [1,1,1,0,1,1,3,3,3,1,1,0,1,1,1],
  [1,0,0,0,1,3,3,3,3,3,1,0,0,0,1],
  [1,1,1,0,1,1,1,1,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
  [1,1,0,1,0,1,1,1,1,1,0,1,0,1,1],
  [1,2,0,0,0,0,0,3,0,0,0,0,0,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export const NeonPacMaze = forwardRef<NeonPacMazeRef, NeonPacMazeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [lives, setLives] = useState<number>(3);
  const [powerTime, setPowerTime] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const livesRef = useRef<number>(3);
  const runningRef = useRef<boolean>(true);
  const powerTicksRef = useRef<number>(0);

  const mazeRef = useRef<number[][]>(INITIAL_MAZE.map(row => [...row]));

  const pacmanRef = useRef<{
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    nextDirX: number;
    nextDirY: number;
    speed: number;
  }>({
    x: 7 * TILE + 12,
    y: 13 * TILE + 12,
    dirX: 0,
    dirY: 0,
    nextDirX: 0,
    nextDirY: 0,
    speed: 2
  });

  const ghostsRef = useRef<Array<{ x: number; y: number; dirX: number; dirY: number; color: string }>>([
    { x: 6 * TILE + 12, y: 7 * TILE + 12, dirX: 1, dirY: 0, color: '#EF4444' },
    { x: 8 * TILE + 12, y: 7 * TILE + 12, dirX: -1, dirY: 0, color: '#EC4899' }
  ]);

  const setDirection = useCallback((dx: number, dy: number) => {
    if (gameOver) return;
    pacmanRef.current.nextDirX = dx;
    pacmanRef.current.nextDirY = dy;
  }, [gameOver]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    powerTicksRef.current = 0;
    mazeRef.current = INITIAL_MAZE.map(row => [...row]);
    pacmanRef.current = {
      x: 7 * TILE + 12,
      y: 13 * TILE + 12,
      dirX: 0,
      dirY: 0,
      nextDirX: 0,
      nextDirY: 0,
      speed: 2
    };
    ghostsRef.current = [
      { x: 6 * TILE + 12, y: 7 * TILE + 12, dirX: 1, dirY: 0, color: '#EF4444' },
      { x: 8 * TILE + 12, y: 7 * TILE + 12, dirX: -1, dirY: 0, color: '#EC4899' }
    ];
    setScore(0);
    setLives(3);
    setPowerTime(0);
    setGameOver(false);
    setVictory(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

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
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') setDirection(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setDirection(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setDirection(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setDirection(1, 0);
    };

    window.addEventListener('keydown', handleKeyDown);

    const isWall = (gridX: number, gridY: number) => {
      if (gridX < 0 || gridX >= COLS || gridY < 0 || gridY >= ROWS) return true;
      return mazeRef.current[gridY][gridX] === 1;
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Maze background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!gameOver) {
        // Power ticks
        if (powerTicksRef.current > 0) {
          powerTicksRef.current -= 1;
          setPowerTime(Math.ceil(powerTicksRef.current / 60));
        }

        // Pacman movement logic
        const p = pacmanRef.current;
        const currentCol = Math.floor(p.x / TILE);
        const currentRow = Math.floor(p.y / TILE);

        // Turn logic on grid centers
        const isNearCenter = Math.abs((p.x % TILE) - 12) < 3 && Math.abs((p.y % TILE) - 12) < 3;
        if (isNearCenter && (p.nextDirX !== 0 || p.nextDirY !== 0)) {
          if (!isWall(currentCol + p.nextDirX, currentRow + p.nextDirY)) {
            p.dirX = p.nextDirX;
            p.dirY = p.nextDirY;
            p.x = currentCol * TILE + 12;
            p.y = currentRow * TILE + 12;
          }
        }

        // Forward movement
        if (!isWall(Math.floor((p.x + p.dirX * 12) / TILE), Math.floor((p.y + p.dirY * 12) / TILE))) {
          p.x += p.dirX * p.speed;
          p.y += p.dirY * p.speed;
        }

        // Pellet eating
        const tileVal = mazeRef.current[currentRow]?.[currentCol];
        if (tileVal === 0) {
          mazeRef.current[currentRow][currentCol] = 3;
          scoreRef.current += 10;
          setScore(scoreRef.current);
          if (onScoreUpdate) onScoreUpdate(scoreRef.current);
        } else if (tileVal === 2) {
          mazeRef.current[currentRow][currentCol] = 3;
          scoreRef.current += 50;
          powerTicksRef.current = 300; // 5 seconds
          setScore(scoreRef.current);
          if (onScoreUpdate) onScoreUpdate(scoreRef.current);
        }

        // Ghost AI Movement
        for (const g of ghostsRef.current) {
          const gCol = Math.floor(g.x / TILE);
          const gRow = Math.floor(g.y / TILE);
          const gCenter = Math.abs((g.x % TILE) - 12) < 2 && Math.abs((g.y % TILE) - 12) < 2;

          if (gCenter) {
            const possibleDirs: Array<{ dx: number; dy: number }> = [];
            const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
            for (const d of dirs) {
              if (d.dx !== -g.dirX || d.dy !== -g.dirY) { // avoid instant reverse
                if (!isWall(gCol + d.dx, gRow + d.dy)) possibleDirs.push(d);
              }
            }
            if (possibleDirs.length > 0) {
              const picked = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
              g.dirX = picked.dx;
              g.dirY = picked.dy;
            }
          }
          g.x += g.dirX * 1.5;
          g.y += g.dirY * 1.5;

          // Ghost collision
          if (Math.hypot(p.x - g.x, p.y - g.y) < 14) {
            if (powerTicksRef.current > 0) {
              // Ghost eaten!
              scoreRef.current += 150;
              setScore(scoreRef.current);
              g.x = 7 * TILE + 12;
              g.y = 7 * TILE + 12;
              if (onScoreUpdate) onScoreUpdate(scoreRef.current);
            } else {
              // Pacman lost life
              livesRef.current -= 1;
              setLives(livesRef.current);
              p.x = 7 * TILE + 12;
              p.y = 13 * TILE + 12;
              p.dirX = 0; p.dirY = 0;

              if (livesRef.current <= 0) {
                setGameOver(true);
                if (onGameOver) onGameOver(scoreRef.current);
                break;
              }
            }
          }
        }

        // Check Victory (no pellets left)
        let remainingPellets = 0;
        for (const r of mazeRef.current) {
          for (const cell of r) {
            if (cell === 0 || cell === 2) remainingPellets++;
          }
        }
        if (remainingPellets === 0) {
          setGameOver(true);
          setVictory(true);
          scoreRef.current += 500;
          setScore(scoreRef.current);
          if (onGameOver) onGameOver(scoreRef.current);
        }
      }

      // Draw Maze
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const type = mazeRef.current[r][c];
          const x = c * TILE;
          const y = r * TILE;

          if (type === 1) {
            // Neon Wall
            ctx.fillStyle = '#1E1B4B';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.strokeStyle = '#4338CA';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, TILE, TILE);
          } else if (type === 0) {
            // Small Pellet
            ctx.fillStyle = '#FDE047';
            ctx.beginPath();
            ctx.arc(x + 12, y + 12, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (type === 2) {
            // Power Pellet
            ctx.fillStyle = '#00F0FF';
            ctx.beginPath();
            ctx.arc(x + 12, y + 12, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Ghosts
      for (const g of ghostsRef.current) {
        ctx.fillStyle = powerTicksRef.current > 0 ? '#38BDF8' : g.color;
        ctx.beginPath();
        ctx.arc(g.x, g.y - 2, 8, Math.PI, 0, false);
        ctx.lineTo(g.x + 8, g.y + 6);
        ctx.lineTo(g.x - 8, g.y + 6);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(g.x - 3, g.y - 3, 2.5, 0, Math.PI * 2);
        ctx.arc(g.x + 3, g.y - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Pacman
      const p = pacmanRef.current;
      ctx.fillStyle = '#FFB800';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0.2 * Math.PI, 1.8 * Math.PI);
      ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();

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
  }, [gameOver, onGameOver, onScoreUpdate, setDirection]);

  return (
    <div className={styles.container} id="game-neon-pac-maze">
      <div className={styles.scoreboard} id="pac-maze-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-pac-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>LIVES</span>
          <span className={styles.value} id="score-pac-lives">{'🟡 '.repeat(lives)}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>POWER</span>
          <span className={styles.value} id="score-pac-power">{powerTime > 0 ? `${powerTime}s 🔥` : 'INACTIVE'}</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={COLS * TILE}
          height={ROWS * TILE}
          className={styles.canvas}
          id="canvas-neon-pac-maze"
        />
      </div>

      {/* Mobile Touch D-Pad */}
      <div
        id="pac-maze-mobile-controls"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          maxWidth: '200px',
          margin: '8px auto'
        }}
      >
        <div />
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pac-up"
          onClick={() => setDirection(0, -1)}
          style={{ padding: '8px' }}
        >
          ▲
        </button>
        <div />
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pac-left"
          onClick={() => setDirection(-1, 0)}
          style={{ padding: '8px' }}
        >
          ◀
        </button>
        <div />
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pac-right"
          onClick={() => setDirection(1, 0)}
          style={{ padding: '8px' }}
        >
          ▶
        </button>
        <div />
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pac-down"
          onClick={() => setDirection(0, 1)}
          style={{ padding: '8px' }}
        >
          ▼
        </button>
        <div />
      </div>

      {gameOver && (
        <div className={styles.overlay} id="neon-pac-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'MAZE CLEARED — VICTORY!' : 'GRID CORRUPTED — GAME OVER'}
          </h3>
          <p className={styles.overlayText}>
            Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-neon-pac-restart"
            onClick={restart}
          >
            Re-run Pac-Maze
          </button>
        </div>
      )}
    </div>
  );
});

NeonPacMaze.displayName = 'NeonPacMaze';
