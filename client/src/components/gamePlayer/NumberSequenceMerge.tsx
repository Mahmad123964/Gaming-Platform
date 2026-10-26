import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './Classic2048.module.css';

export interface NumberSequenceMergeRef {
  restart: () => void;
  getScore: () => number;
}

interface NumberSequenceMergeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const COLS = 5;
const ROWS = 7;

export const NumberSequenceMerge = forwardRef<NumberSequenceMergeRef, NumberSequenceMergeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [nextTile, setNextTile] = useState<number>(2);
  const [highestTile, setHighestTile] = useState<number>(2);
  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [gameOver, setGameOver] = useState<boolean>(false);

  const getRandomTile = () => {
    const vals = [2, 4, 8, 16];
    return vals[Math.floor(Math.random() * vals.length)];
  };

  const dropInColumn = useCallback((col: number) => {
    if (gameOver) return;

    setGrid(prev => {
      const nextGrid = prev.map(r => [...r]);

      // Find bottom-most empty row in this column
      let targetRow = -1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (nextGrid[r][col] === 0) {
          targetRow = r;
          break;
        }
      }

      if (targetRow === -1) {
        // Column is full
        return prev;
      }

      nextGrid[targetRow][col] = nextTile;

      // Check vertical and horizontal merges iteratively
      let merged = true;
      let pointsGained = 0;
      let maxVal = highestTile;

      while (merged) {
        merged = false;

        // Check vertical merge with row below
        if (targetRow < ROWS - 1 && nextGrid[targetRow][col] === nextGrid[targetRow + 1][col] && nextGrid[targetRow][col] > 0) {
          const newVal = nextGrid[targetRow][col] * 2;
          nextGrid[targetRow + 1][col] = newVal;
          nextGrid[targetRow][col] = 0;
          targetRow = targetRow + 1;
          pointsGained += newVal;
          maxVal = Math.max(maxVal, newVal);
          merged = true;
        }

        // Check horizontal merges with left or right
        if (col > 0 && nextGrid[targetRow][col] === nextGrid[targetRow][col - 1] && nextGrid[targetRow][col] > 0) {
          const newVal = nextGrid[targetRow][col] * 2;
          nextGrid[targetRow][col] = newVal;
          nextGrid[targetRow][col - 1] = 0;
          pointsGained += newVal;
          maxVal = Math.max(maxVal, newVal);
          merged = true;
        }
        if (col < COLS - 1 && nextGrid[targetRow][col] === nextGrid[targetRow][col + 1] && nextGrid[targetRow][col] > 0) {
          const newVal = nextGrid[targetRow][col] * 2;
          nextGrid[targetRow][col] = newVal;
          nextGrid[targetRow][col + 1] = 0;
          pointsGained += newVal;
          maxVal = Math.max(maxVal, newVal);
          merged = true;
        }

        // Apply gravity in all columns
        for (let c = 0; c < COLS; c++) {
          for (let r = ROWS - 2; r >= 0; r--) {
            if (nextGrid[r][c] > 0 && nextGrid[r + 1][c] === 0) {
              nextGrid[r + 1][c] = nextGrid[r][c];
              nextGrid[r][c] = 0;
            }
          }
        }
      }

      if (pointsGained > 0) {
        setScore(s => {
          const ns = s + pointsGained;
          if (onScoreUpdate) onScoreUpdate(ns);
          return ns;
        });
        setHighestTile(maxVal);
      }

      // Check if board full
      let isFull = true;
      for (let c = 0; c < COLS; c++) {
        if (nextGrid[0][c] === 0) {
          isFull = false;
          break;
        }
      }

      if (isFull) {
        setGameOver(true);
        if (onGameOver) onGameOver(score + pointsGained);
      }

      setNextTile(getRandomTile());
      return nextGrid;
    });
  }, [gameOver, highestTile, nextTile, onGameOver, onScoreUpdate, score]);

  const restart = useCallback(() => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setScore(0);
    setNextTile(2);
    setHighestTile(2);
    setGameOver(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  const getTileColor = (val: number) => {
    switch (val) {
      case 2: return '#0284C7';
      case 4: return '#06B6D4';
      case 8: return '#10B981';
      case 16: return '#F59E0B';
      case 32: return '#EF4444';
      case 64: return '#EC4899';
      case 128: return '#8B5CF6';
      case 256: return '#FFB800';
      default: return '#1E293B';
    }
  };

  return (
    <div className={styles.container} id="game-number-sequence-merge">
      <div className={styles.scoreboard} id="number-seq-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-seq-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>NEXT TILE</span>
          <span className={styles.value} id="score-seq-next">{nextTile}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>HIGHEST</span>
          <span className={styles.value} id="score-seq-highest">{highestTile}</span>
        </div>
      </div>

      {/* 5 Column Drop Buttons */}
      <div
        id="seq-column-drop-controls"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: '4px',
          maxWidth: '300px',
          margin: '6px auto'
        }}
      >
        {Array.from({ length: COLS }).map((_, c) => (
          <button
            key={`drop-btn-${c}`}
            id={`btn-seq-col-${c}`}
            type="button"
            className={styles.touchBtn}
            onClick={() => dropInColumn(c)}
            style={{
              padding: '8px 0',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: '#0F172A',
              border: '1px solid #38BDF8',
              color: '#38BDF8',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ▼ Col {c + 1}
          </button>
        ))}
      </div>

      {/* 7x5 Grid */}
      <div
        id="grid-number-sequence"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: '4px',
          padding: '12px',
          background: '#0B132B',
          borderRadius: '8px',
          maxWidth: '300px',
          margin: '8px auto'
        }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`cell-${r}-${c}`}
              id={`cell-seq-${r}-${c}`}
              style={{
                width: '52px',
                height: '46px',
                borderRadius: '6px',
                background: getTileColor(val),
                color: val > 0 ? '#FFFFFF' : 'transparent',
                fontWeight: 800,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: val > 0 ? '0 2px 6px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              {val > 0 ? val : ''}
            </div>
          ))
        )}
      </div>

      {gameOver && (
        <div className={styles.overlay} id="number-seq-gameover">
          <h3 className={styles.overlayTitle}>COLUMNS BLOCKED — GAME OVER</h3>
          <p className={styles.overlayText}>
            Highest Tile Reached: {highestTile} | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-number-seq-restart"
            onClick={restart}
          >
            Play Next Sequence
          </button>
        </div>
      )}
    </div>
  );
});

NumberSequenceMerge.displayName = 'NumberSequenceMerge';
