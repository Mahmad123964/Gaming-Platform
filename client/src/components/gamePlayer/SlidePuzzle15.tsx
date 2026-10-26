import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './SlidePuzzle15.module.css';

export interface SlidePuzzle15Ref {
  restart: () => void;
  getScore: () => number;
}

interface SlidePuzzle15Props {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const SlidePuzzle15 = forwardRef<SlidePuzzle15Ref, SlidePuzzle15Props>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  // 4x4 board of numbers 1-15, with 0 representing empty slot
  const [board, setBoard] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [score, setScore] = useState<number>(initialScore);
  const [isWon, setIsWon] = useState<boolean>(false);

  // Generate scrambled board by performing 80 random legal moves from solved state
  // This guarantees mathematical solvability!
  const initGame = useCallback(() => {
    let current = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    let emptyIdx = 15;

    for (let step = 0; step < 80; step++) {
      const row = Math.floor(emptyIdx / 4);
      const col = emptyIdx % 4;
      const neighbors: number[] = [];

      if (row > 0) neighbors.push(emptyIdx - 4); // Up
      if (row < 3) neighbors.push(emptyIdx + 4); // Down
      if (col > 0) neighbors.push(emptyIdx - 1); // Left
      if (col < 3) neighbors.push(emptyIdx + 1); // Right

      const swapIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
      [current[emptyIdx], current[swapIdx]] = [current[swapIdx], current[emptyIdx]];
      emptyIdx = swapIdx;
    }

    setBoard(current);
    setMoves(0);
    setScore(0);
    setIsWon(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart: initGame,
    getScore: () => score
  }), [initGame, score]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleTileClick = (idx: number) => {
    if (isWon) return;
    const emptyIdx = board.indexOf(0);
    if (emptyIdx === -1) return;

    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const emptyRow = Math.floor(emptyIdx / 4);
    const emptyCol = emptyIdx % 4;

    const isAdjacent = (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
                       (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (isAdjacent) {
      const newBoard = [...board];
      [newBoard[idx], newBoard[emptyIdx]] = [newBoard[emptyIdx], newBoard[idx]];
      setBoard(newBoard);

      const newMoves = moves + 1;
      setMoves(newMoves);
      const newScore = score + 5;
      setScore(newScore);
      onScoreUpdate?.(newScore);

      // Check win condition [1, 2, ..., 15, 0]
      const solved = newBoard.slice(0, 15).every((val, i) => val === i + 1) && newBoard[15] === 0;
      if (solved) {
        setIsWon(true);
        const victoryBonus = newScore + 200;
        setScore(victoryBonus);
        onScoreUpdate?.(victoryBonus);
        onGameOver?.(victoryBonus);
      }
    }
  };

  return (
    <div className={styles.container} id="game-slide-puzzle-15">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>SLIDE PUZZLE 15</h3>
          <span>Classic Permutation Grid</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>MOVES</span>
            <span className={styles.statValue} id="val-slide-moves">{moves}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-slide-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.gridArea} id="grid-slide-puzzle">
        {board.map((val, idx) => (
          val !== 0 ? (
            <button
              key={idx}
              className={styles.tile}
              onClick={() => handleTileClick(idx)}
              id={`tile-slide-${val}`}
              aria-label={`Tile ${val}`}
            >
              {val}
            </button>
          ) : (
            <div key={idx} className={styles.emptySlot} id="slot-slide-empty" />
          )
        ))}
      </div>

      {isWon && (
        <div style={{ marginTop: '10px', color: '#10B981', fontWeight: 800, textAlign: 'center' }} id="slide-victory-banner">
          🎉 PUZZLE SOLVED IN {moves} MOVES!
        </div>
      )}

      <div className={styles.footer}>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Tap adjacent tile to slide into empty space
        </div>
        <button
          className={styles.restartButton}
          onClick={initGame}
          id="btn-slide-restart"
        >
          Reshuffle
        </button>
      </div>
    </div>
  );
});

SlidePuzzle15.displayName = 'SlidePuzzle15';
