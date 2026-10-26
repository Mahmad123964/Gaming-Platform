import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TicTacToePro.module.css';

export interface LightsOutNeonRef {
  restart: () => void;
  getScore: () => number;
}

interface LightsOutNeonProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const SIZE = 5;

// Generate guaranteed solvable board by applying random toggle operations from all-off state
function generateSolvableBoard(): boolean[][] {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const flip = (board: boolean[][], r: number, c: number) => {
    board[r][c] = !board[r][c];
    if (r > 0) board[r - 1][c] = !board[r - 1][c];
    if (r < SIZE - 1) board[r + 1][c] = !board[r + 1][c];
    if (c > 0) board[r][c - 1] = !board[r][c - 1];
    if (c < SIZE - 1) board[r][c + 1] = !board[r][c + 1];
  };

  // 6 random deterministic moves to guarantee a solvable non-trivial puzzle
  const initialMoves = [[0, 1], [1, 3], [2, 2], [3, 0], [4, 4], [2, 0]];
  for (const [r, c] of initialMoves) {
    flip(b, r, c);
  }
  return b;
}

export const LightsOutNeon = forwardRef<LightsOutNeonRef, LightsOutNeonProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [moves, setMoves] = useState<number>(0);
  const [board, setBoard] = useState<boolean[][]>(() => generateSolvableBoard());
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  const toggleCell = useCallback((r: number, c: number) => {
    if (gameOver) return;

    setBoard(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = !next[r][c];
      if (r > 0) next[r - 1][c] = !next[r - 1][c];
      if (r < SIZE - 1) next[r + 1][c] = !next[r + 1][c];
      if (c > 0) next[r][c - 1] = !next[r][c - 1];
      if (c < SIZE - 1) next[r][c + 1] = !next[r][c + 1];

      // Check all lights off
      let allOff = true;
      for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
          if (next[i][j]) {
            allOff = false;
            break;
          }
        }
      }

      setMoves(m => {
        const nextMoves = m + 1;
        if (allOff) {
          setGameOver(true);
          setVictory(true);
          const winScore = Math.max(100, 300 - nextMoves * 10);
          setScore(winScore);
          if (onScoreUpdate) onScoreUpdate(winScore);
          if (onGameOver) onGameOver(winScore);
        }
        return nextMoves;
      });

      return next;
    });
  }, [gameOver, onGameOver, onScoreUpdate]);

  const restart = useCallback(() => {
    setBoard(generateSolvableBoard());
    setMoves(0);
    setScore(0);
    setGameOver(false);
    setVictory(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  // Count active lights
  const activeCount = board.flat().filter(Boolean).length;

  return (
    <div className={styles.container} id="game-lights-out-neon">
      <div className={styles.scoreboard} id="lights-out-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-lights-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>MOVES</span>
          <span className={styles.value} id="score-lights-moves">{moves}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>ACTIVE LIGHTS</span>
          <span className={styles.value} id="score-lights-active">{activeCount} / 25</span>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94A3B8', margin: '6px 0' }}>
        Tap any cell to toggle it and its 4 neighbors. Extinguish all neon lamps!
      </p>

      {/* 5x5 Matrix Board */}
      <div
        id="grid-lights-out"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gap: '8px',
          maxWidth: '300px',
          margin: '12px auto',
          padding: '14px',
          background: '#0B132B',
          borderRadius: '10px'
        }}
      >
        {board.map((row, r) =>
          row.map((isOn, c) => (
            <button
              key={`light-${r}-${c}`}
              id={`cell-light-${r}-${c}`}
              type="button"
              onClick={() => toggleCell(r, c)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                border: isOn ? '2px solid #00F0FF' : '1px solid #334155',
                background: isOn ? 'radial-gradient(circle, #00F0FF 0%, #0284C7 100%)' : '#1E293B',
                boxShadow: isOn ? '0 0 16px rgba(0, 240, 255, 0.7)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              aria-label={`Row ${r + 1} Column ${c + 1} light is ${isOn ? 'ON' : 'OFF'}`}
            />
          ))
        )}
      </div>

      {gameOver && (
        <div className={styles.overlay} id="lights-out-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'ALL LIGHTS EXTINGUISHED!' : 'PUZZLE COMPLETE'}
          </h3>
          <p className={styles.overlayText}>
            Moves Taken: {moves} | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-lights-out-restart"
            onClick={restart}
          >
            Play Next Layout
          </button>
        </div>
      )}
    </div>
  );
});

LightsOutNeon.displayName = 'LightsOutNeon';
