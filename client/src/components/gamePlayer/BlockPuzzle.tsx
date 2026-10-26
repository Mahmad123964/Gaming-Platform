import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './BlockPuzzle.module.css';

export interface BlockPuzzleRef {
  restart: () => void;
  getScore: () => number;
}

interface BlockPuzzleProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const COLS = 10;
const ROWS = 20;

const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00F0FF' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3B82F6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#F59E0B' },
  O: { shape: [[1, 1], [1, 1]], color: '#FFB800' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#10B981' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#A855F7' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#FF0055' }
};

type TetrominoKey = keyof typeof TETROMINOES;
const KEYS: TetrominoKey[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

interface Piece {
  matrix: number[][];
  color: string;
  x: number;
  y: number;
}

export const BlockPuzzle = forwardRef<BlockPuzzleRef, BlockPuzzleProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [linesCleared, setLinesCleared] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const gridRef = useRef<(string | null)[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const currentPieceRef = useRef<Piece | null>(null);
  const scoreRef = useRef<number>(initialScore);
  const linesRef = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  const spawnPiece = useCallback((): boolean => {
    const key = KEYS[Math.floor(Math.random() * KEYS.length)];
    const proto = TETROMINOES[key];
    const piece: Piece = {
      matrix: proto.shape.map(r => [...r]),
      color: proto.color,
      x: Math.floor((COLS - proto.shape[0].length) / 2),
      y: 0
    };

    // Check immediate collision on spawn -> Game Over
    const grid = gridRef.current;
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] && grid[piece.y + r][piece.x + c]) {
          return false;
        }
      }
    }
    currentPieceRef.current = piece;
    return true;
  }, []);

  const restart = useCallback(() => {
    gridRef.current = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    scoreRef.current = 0;
    linesRef.current = 0;
    runningRef.current = true;
    setScore(0);
    setLinesCleared(0);
    setGameOver(false);
    spawnPiece();
    onScoreUpdate?.(0);
    onRestart?.();
  }, [spawnPiece, onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  // Initial piece
  useEffect(() => {
    spawnPiece();
  }, [spawnPiece]);

  // Collision detection
  const collides = (piece: Piece, offsetX: number, offsetY: number, matrix = piece.matrix): boolean => {
    const grid = gridRef.current;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const targetX = piece.x + c + offsetX;
          const targetY = piece.y + r + offsetY;
          if (targetX < 0 || targetX >= COLS || targetY >= ROWS) return true;
          if (targetY >= 0 && grid[targetY][targetX]) return true;
        }
      }
    }
    return false;
  };

  // Lock piece & clear lines
  const lockPiece = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece) return;

    const grid = gridRef.current;
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c]) {
          const py = piece.y + r;
          const px = piece.x + c;
          if (py >= 0 && py < ROWS) {
            grid[py][px] = piece.color;
          }
        }
      }
    }

    // Clear completed lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(cell => cell !== null)) {
        grid.splice(r, 1);
        grid.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // Recheck same row index after shift
      }
    }

    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] || cleared * 200;
      scoreRef.current += points;
      linesRef.current += cleared;
      setScore(scoreRef.current);
      setLinesCleared(linesRef.current);
      onScoreUpdate?.(scoreRef.current);
    }

    // Spawn next piece
    if (!spawnPiece()) {
      runningRef.current = false;
      setGameOver(true);
      onGameOver?.(scoreRef.current);
    }
  }, [spawnPiece, onGameOver, onScoreUpdate]);

  const moveLeft = useCallback(() => {
    const p = currentPieceRef.current;
    if (p && !collides(p, -1, 0)) p.x -= 1;
  }, []);

  const moveRight = useCallback(() => {
    const p = currentPieceRef.current;
    if (p && !collides(p, 1, 0)) p.x += 1;
  }, []);

  const moveDown = useCallback(() => {
    const p = currentPieceRef.current;
    if (!p) return;
    if (!collides(p, 0, 1)) {
      p.y += 1;
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  const rotate = useCallback(() => {
    const p = currentPieceRef.current;
    if (!p) return;
    // Transpose and reverse rows for 90deg clockwise rotation
    const rotated = p.matrix[0].map((_, i) => p.matrix.map(row => row[i]).reverse());
    if (!collides(p, 0, 0, rotated)) {
      p.matrix = rotated;
    }
  }, []);

  const hardDrop = useCallback(() => {
    const p = currentPieceRef.current;
    if (!p) return;
    while (!collides(p, 0, 1)) {
      p.y += 1;
    }
    lockPiece();
  }, [lockPiece]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!runningRef.current) {
        if (e.key === 'r' || e.key === 'R') restart();
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, moveDown, rotate, hardDrop, restart]);

  // Game tick loop (falling gravity)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!runningRef.current) return;
      moveDown();
    }, 600);
    return () => clearInterval(interval);
  }, [moveDown]);

  // Canvas rendering loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cellW = width / COLS;
      const cellH = height / ROWS;

      // Dark background
      ctx.fillStyle = '#090D18';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
      ctx.lineWidth = 1;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellH);
        ctx.lineTo(width, r * cellH);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellW, 0);
        ctx.lineTo(c * cellW, height);
        ctx.stroke();
      }

      // Draw locked grid
      const grid = gridRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            ctx.fillStyle = grid[r][c]!;
            ctx.shadowColor = grid[r][c]!;
            ctx.shadowBlur = 4;
            ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
          }
        }
      }

      // Draw falling piece
      const piece = currentPieceRef.current;
      if (piece) {
        ctx.fillStyle = piece.color;
        ctx.shadowColor = piece.color;
        ctx.shadowBlur = 8;
        for (let r = 0; r < piece.matrix.length; r++) {
          for (let c = 0; c < piece.matrix[r].length; c++) {
            if (piece.matrix[r][c]) {
              const py = piece.y + r;
              const px = piece.x + c;
              if (py >= 0) {
                ctx.fillRect(px * cellW + 1, py * cellH + 1, cellW - 2, cellH - 2);
              }
            }
          }
        }
      }

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className={styles.container} id="game-block-puzzle">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>BLOCK PUZZLE</h3>
          <span>Tetromino Matrix Engine</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>LINES</span>
            <span className={styles.statValue} id="val-block-lines">{linesCleared}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-block-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.canvasWrapper} id="wrapper-block-puzzle">
        <canvas
          ref={canvasRef}
          width={280}
          height={560}
          className={styles.gameCanvas}
          id="canvas-block-puzzle"
        />

        {gameOver && (
          <div className={styles.overlay} id="block-gameover-overlay">
            <h2 className={styles.overlayTitle}>MATRIX FULL</h2>
            <div className={styles.overlayScore}>Final Score: <strong>{score}</strong></div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-block-restart"
            >
              Reboot Grid (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Controls: Arrows Left/Right • Up to Rotate • Down for Soft Drop • Space to Hard Drop
      </div>

      {/* Mobile Controls */}
      <div className={styles.mobileControls} id="block-mobile-controls">
        <button className={styles.actionButton} onClick={moveLeft} id="btn-block-left" aria-label="Move Left">◀</button>
        <button className={styles.actionButton} onClick={rotate} id="btn-block-rotate" aria-label="Rotate">⟳</button>
        <button className={styles.actionButton} onClick={moveRight} id="btn-block-right" aria-label="Move Right">▶</button>
        <button className={styles.actionButton} onClick={moveDown} id="btn-block-drop" aria-label="Soft Drop">▼</button>
        <button className={styles.actionButton} onClick={hardDrop} id="btn-block-harddrop" aria-label="Hard Drop">⤓</button>
      </div>
    </div>
  );
});

BlockPuzzle.displayName = 'BlockPuzzle';
