import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './BubbleShooter.module.css';

export interface BubbleShooterRef {
  restart: () => void;
  getScore: () => number;
}

interface BubbleShooterProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const BUBBLE_RADIUS = 18;
const GRID_COLS = 8;
const GRID_ROWS = 10;
const COLORS = ['#00F0FF', '#FF0055', '#FFB800', '#10B981', '#A855F7'];

interface Bubble {
  r: number;
  c: number;
  x: number;
  y: number;
  color: string;
}

export const BubbleShooter = forwardRef<BubbleShooterRef, BubbleShooterProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  // Mutable refs for real-time physics and aim
  const gridRef = useRef<(Bubble | null)[][]>([]);
  const currentBubbleRef = useRef<{ color: string; x: number; y: number; vx: number; vy: number; inFlight: boolean }>({
    color: COLORS[0],
    x: 190,
    y: 450,
    vx: 0,
    vy: 0,
    inFlight: false
  });
  const nextColorRef = useRef<string>(COLORS[1]);
  const aimAngleRef = useRef<number>(-Math.PI / 2); // pointing straight up
  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  // Calculate pixel position for grid cell
  const getCellPos = (r: number, c: number) => {
    const x = c * (BUBBLE_RADIUS * 2) + BUBBLE_RADIUS + (r % 2 === 1 ? BUBBLE_RADIUS : 0) + 20;
    const y = r * (BUBBLE_RADIUS * 1.73) + BUBBLE_RADIUS + 15;
    return { x, y };
  };

  // Initialize initial ceiling bubbles
  const initGrid = useCallback(() => {
    const g: (Bubble | null)[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      g[r] = [];
      const colsInRow = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < colsInRow; c++) {
        if (r < 4) {
          const color = COLORS[Math.floor(Math.random() * COLORS.length)];
          const { x, y } = getCellPos(r, c);
          g[r][c] = { r, c, x, y, color };
        } else {
          g[r][c] = null;
        }
      }
    }
    gridRef.current = g;
    currentBubbleRef.current = {
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      x: 190,
      y: 450,
      vx: 0,
      vy: 0,
      inFlight: false
    };
    nextColorRef.current = COLORS[Math.floor(Math.random() * COLORS.length)];
  }, []);

  const restart = useCallback(() => {
    initGrid();
    scoreRef.current = 0;
    runningRef.current = true;
    setScore(0);
    setGameOver(false);
    setVictory(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [initGrid, onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  useEffect(() => {
    initGrid();
  }, [initGrid]);

  // Pointer Aiming
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!runningRef.current || currentBubbleRef.current.inFlight) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 380 / rect.width;
    const scaleY = 500 / rect.height;
    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    const dx = clientX - 190;
    const dy = clientY - 450;
    let angle = Math.atan2(dy, dx);
    // Limit angle to upper hemisphere (-160 deg to -20 deg)
    angle = Math.max(-Math.PI * 0.9, Math.min(-Math.PI * 0.1, angle));
    aimAngleRef.current = angle;
  };

  // Pointer Fire Bubble
  const handlePointerDown = () => {
    if (!runningRef.current || currentBubbleRef.current.inFlight) return;
    const angle = aimAngleRef.current;
    const speed = 12;
    currentBubbleRef.current.vx = Math.cos(angle) * speed;
    currentBubbleRef.current.vy = Math.sin(angle) * speed;
    currentBubbleRef.current.inFlight = true;
  };

  // Find connected cluster of same color using BFS
  const findCluster = (startR: number, startC: number, targetColor: string): [number, number][] => {
    const grid = gridRef.current;
    const visited = new Set<string>();
    const cluster: [number, number][] = [];
    const queue: [number, number][] = [[startR, startC]];
    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      cluster.push([r, c]);

      // 6 hexagonal neighbors
      const isOdd = r % 2 === 1;
      const neighbors = isOdd
        ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
        : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

      for (const [dr, dc] of neighbors) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < GRID_ROWS) {
          const maxCols = nr % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
          if (nc >= 0 && nc < maxCols) {
            const key = `${nr},${nc}`;
            if (!visited.has(key)) {
              visited.add(key);
              const neighbor = grid[nr][nc];
              if (neighbor && neighbor.color === targetColor) {
                queue.push([nr, nc]);
              }
            }
          }
        }
      }
    }
    return cluster;
  };

  // Lock bubble into grid when it collides with ceiling or another bubble
  const lockBubbleIntoGrid = useCallback((x: number, y: number, color: string) => {
    const grid = gridRef.current;
    let closestR = 0;
    let closestC = 0;
    let minDist = Infinity;

    for (let r = 0; r < GRID_ROWS; r++) {
      const maxCols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < maxCols; c++) {
        if (!grid[r][c]) {
          const cellPos = getCellPos(r, c);
          const d = Math.hypot(cellPos.x - x, cellPos.y - y);
          if (d < minDist) {
            minDist = d;
            closestR = r;
            closestC = c;
          }
        }
      }
    }

    const { x: snappedX, y: snappedY } = getCellPos(closestR, closestC);
    grid[closestR][closestC] = {
      r: closestR,
      c: closestC,
      x: snappedX,
      y: snappedY,
      color
    };

    // Check cluster match (3 or more)
    const cluster = findCluster(closestR, closestC, color);
    if (cluster.length >= 3) {
      cluster.forEach(([r, c]) => {
        grid[r][c] = null;
      });
      const gained = cluster.length * 15;
      scoreRef.current += gained;

      // Handle detached floating bubbles not anchored to ceiling row 0
      const connected = new Set<string>();
      const queue: [number, number][] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        if (grid[0][c]) {
          queue.push([0, c]);
          connected.add(`0,${c}`);
        }
      }

      while (queue.length > 0) {
        const [qr, qc] = queue.shift()!;
        const isOdd = qr % 2 === 1;
        const neighbors = isOdd
          ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
          : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

        for (const [dr, dc] of neighbors) {
          const nr = qr + dr;
          const nc = qc + dc;
          if (nr >= 0 && nr < GRID_ROWS) {
            const maxCols = nr % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
            if (nc >= 0 && nc < maxCols) {
              const key = `${nr},${nc}`;
              if (!connected.has(key) && grid[nr][nc]) {
                connected.add(key);
                queue.push([nr, nc]);
              }
            }
          }
        }
      }

      let detachedCount = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        const maxCols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
        for (let c = 0; c < maxCols; c++) {
          if (grid[r][c] && !connected.has(`${r},${c}`)) {
            grid[r][c] = null;
            detachedCount++;
          }
        }
      }

      if (detachedCount > 0) {
        scoreRef.current += detachedCount * 25;
      }

      setScore(scoreRef.current);
      onScoreUpdate?.(scoreRef.current);
    }

    // Check victory (all cleared)
    let anyLeft = false;
    for (let r = 0; r < GRID_ROWS; r++) {
      if (grid[r].some(cell => cell !== null)) anyLeft = true;
    }
    if (!anyLeft) {
      runningRef.current = false;
      setVictory(true);
      onGameOver?.(scoreRef.current);
      return;
    }

    // Check game over (reached bottom row)
    if (grid[GRID_ROWS - 1].some(cell => cell !== null)) {
      runningRef.current = false;
      setGameOver(true);
      onGameOver?.(scoreRef.current);
      return;
    }

    // Reload turret
    currentBubbleRef.current = {
      color: nextColorRef.current,
      x: 190,
      y: 450,
      vx: 0,
      vy: 0,
      inFlight: false
    };
    nextColorRef.current = COLORS[Math.floor(Math.random() * COLORS.length)];
  }, [onGameOver, onScoreUpdate]);

  // Main 60 FPS physics & render loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Update in-flight bubble physics
      const b = currentBubbleRef.current;
      if (b.inFlight && runningRef.current) {
        b.x += b.vx;
        b.y += b.vy;

        // Bounce off left/right side walls
        if (b.x - BUBBLE_RADIUS <= 10) {
          b.x = 10 + BUBBLE_RADIUS;
          b.vx = Math.abs(b.vx);
        } else if (b.x + BUBBLE_RADIUS >= width - 10) {
          b.x = width - 10 - BUBBLE_RADIUS;
          b.vx = -Math.abs(b.vx);
        }

        // Ceiling collision
        if (b.y - BUBBLE_RADIUS <= 15) {
          b.inFlight = false;
          lockBubbleIntoGrid(b.x, b.y, b.color);
        } else {
          // Check collision against existing bubbles in grid
          const grid = gridRef.current;
          let collided = false;
          for (let r = 0; r < GRID_ROWS && !collided; r++) {
            const maxCols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
            for (let c = 0; c < maxCols; c++) {
              const target = grid[r][c];
              if (target) {
                const dist = Math.hypot(target.x - b.x, target.y - b.y);
                if (dist <= BUBBLE_RADIUS * 1.85) {
                  collided = true;
                  b.inFlight = false;
                  lockBubbleIntoGrid(b.x, b.y, b.color);
                  break;
                }
              }
            }
          }
        }
      }

      // ------------------------------------
      // Render Canvas
      // ------------------------------------
      ctx.fillStyle = '#080C17';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid Bubbles
      const grid = gridRef.current;
      for (let r = 0; r < GRID_ROWS; r++) {
        const maxCols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
        for (let c = 0; c < maxCols; c++) {
          const bubble = grid[r]?.[c];
          if (bubble) {
            ctx.fillStyle = bubble.color;
            ctx.shadowColor = bubble.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
            ctx.fill();

            // Bubble 3D specular highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(bubble.x - 5, bubble.y - 5, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Bottom Dead Line
      ctx.strokeStyle = 'rgba(255, 0, 85, 0.3)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(10, 410);
      ctx.lineTo(width - 10, 410);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Aiming Guide Line
      if (!b.inFlight && runningRef.current) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(190, 450);
        ctx.lineTo(
          190 + Math.cos(aimAngleRef.current) * 120,
          450 + Math.sin(aimAngleRef.current) * 120
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Active Turret Bubble
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Draw Next Bubble Indicator in corner
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px sans-serif';
      ctx.fillText('NEXT', 35, 475);

      ctx.fillStyle = nextColorRef.current;
      ctx.shadowColor = nextColorRef.current;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(50, 450, BUBBLE_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [lockBubbleIntoGrid]);

  return (
    <div className={styles.container} id="game-bubble-shooter">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>BUBBLE SHOOTER</h3>
          <span>Cluster Match Arc</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-bubble-score">{score}</span>
          </div>
        </div>
      </div>

      <div
        className={styles.canvasWrapper}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        id="wrapper-bubble-shooter"
      >
        <canvas
          ref={canvasRef}
          width={380}
          height={500}
          className={styles.gameCanvas}
          id="canvas-bubble-shooter"
        />

        {(gameOver || victory) && (
          <div className={styles.overlay} id="bubble-gameover-overlay">
            <h2 className={`${styles.overlayTitle} ${victory ? styles.overlayVictory : ''}`}>
              {victory ? 'BOARD CLEARED!' : 'GAME OVER'}
            </h2>
            <div className={styles.overlayScore}>Final Score: <strong>{score}</strong></div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-bubble-restart"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Controls: Move pointer to aim • Click or tap to shoot • Match 3+ colors to pop
      </div>
    </div>
  );
});

BubbleShooter.displayName = 'BubbleShooter';
