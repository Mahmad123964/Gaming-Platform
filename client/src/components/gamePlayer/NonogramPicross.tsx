import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './MinesweeperRetro.module.css';

export interface NonogramPicrossRef {
  restart: () => void;
  getScore: () => number;
}

interface NonogramPicrossProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const SIZE = 5;

// Heart silhouette target solution (1 = filled, 0 = empty)
const TARGET_SOLUTION: number[][] = [
  [0, 1, 0, 1, 0],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0]
];

const ROW_CLUES = [[1, 1], [5], [5], [3], [1]];
const COL_CLUES = [[2], [4], [4], [4], [2]];

export const NonogramPicross = forwardRef<NonogramPicrossRef, NonogramPicrossProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [mode, setMode] = useState<'FILL' | 'CROSS'>('FILL');
  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
  );
  const [mistakes, setMistakes] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  const checkVictory = (currentGrid: number[][]) => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const isTarget = TARGET_SOLUTION[r][c] === 1;
        const isFilled = currentGrid[r][c] === 1;
        if (isTarget !== isFilled) return false;
      }
    }
    return true;
  };

  const handleCellClick = useCallback((r: number, c: number) => {
    if (gameOver) return;

    setGrid(prev => {
      const next = prev.map(row => [...row]);
      if (mode === 'FILL') {
        next[r][c] = next[r][c] === 1 ? 0 : 1;
      } else {
        next[r][c] = next[r][c] === 2 ? 0 : 2; // 2 = marked cross
      }

      // Check correctness
      if (mode === 'FILL' && next[r][c] === 1 && TARGET_SOLUTION[r][c] !== 1) {
        setMistakes(m => {
          const newM = m + 1;
          if (newM >= 3) {
            setGameOver(true);
            if (onGameOver) onGameOver(score);
          }
          return newM;
        });
      }

      if (checkVictory(next)) {
        setGameOver(true);
        setVictory(true);
        const winScore = score + 200 - mistakes * 25;
        setScore(winScore);
        if (onScoreUpdate) onScoreUpdate(winScore);
        if (onGameOver) onGameOver(winScore);
      }

      return next;
    });
  }, [gameOver, mistakes, mode, onGameOver, onScoreUpdate, score]);

  const restart = useCallback(() => {
    setGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill(0)));
    setScore(0);
    setMistakes(0);
    setGameOver(false);
    setVictory(false);
    setMode('FILL');
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  return (
    <div className={styles.container} id="game-nonogram-picross">
      <div className={styles.scoreboard} id="nonogram-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-nono-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>TOOL</span>
          <span className={styles.value} id="score-nono-tool">{mode === 'FILL' ? 'FILL (■)' : 'MARK (✕)'}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>MISTAKES</span>
          <span className={styles.value} id="score-nono-err">{mistakes} / 3</span>
        </div>
      </div>

      {/* Nonogram Clue Matrix Container */}
      <div
        id="grid-nonogram-board"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 8px',
          background: '#0B132B',
          borderRadius: '8px',
          margin: '12px auto',
          maxWidth: '340px'
        }}
      >
        {/* Top Column Clues */}
        <div style={{ display: 'flex', marginLeft: '60px', marginBottom: '6px' }}>
          {COL_CLUES.map((clue, idx) => (
            <div
              key={`col-clue-${idx}`}
              style={{
                width: '44px',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: '#38BDF8',
                fontWeight: 700
              }}
            >
              {clue.join('\n')}
            </div>
          ))}
        </div>

        {/* Rows with Left Row Clues */}
        {grid.map((row, r) => (
          <div key={`row-${r}`} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Row Clue */}
            <div
              style={{
                width: '56px',
                textAlign: 'right',
                paddingRight: '8px',
                fontSize: '0.75rem',
                color: '#38BDF8',
                fontWeight: 700
              }}
            >
              {ROW_CLUES[r].join(' ')}
            </div>

            {/* Grid Cells */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
              {row.map((cell, c) => (
                <button
                  key={`cell-${r}-${c}`}
                  id={`cell-picross-${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: cell === 1 ? '#00F0FF' : cell === 2 ? '#334155' : '#1E293B',
                    color: cell === 2 ? '#EF4444' : '#0F172A',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {cell === 2 ? '✕' : ''}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Touch Tool Toggle */}
      <div className={styles.mobileControls} id="nonogram-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-nono-toggle-mode"
          onClick={() => setMode(m => m === 'FILL' ? 'CROSS' : 'FILL')}
        >
          {mode === 'FILL' ? 'Mode: ■ Fill Active (Tap to switch to ✕ Mark)' : 'Mode: ✕ Mark Active (Tap to switch to ■ Fill)'}
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="nonogram-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'PICROSS PUZZLE SOLVED!' : 'TOO MANY MISTAKES'}
          </h3>
          <p className={styles.overlayText}>
            Pattern Completed: Heart Silhouette | Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-nonogram-restart"
            onClick={restart}
          >
            Solve Again
          </button>
        </div>
      )}
    </div>
  );
});

NonogramPicross.displayName = 'NonogramPicross';
