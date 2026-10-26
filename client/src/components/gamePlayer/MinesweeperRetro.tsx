import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './MinesweeperRetro.module.css';

export interface MinesweeperRetroRef {
  restart: () => void;
  getScore: () => number;
}

interface MinesweeperRetroProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

const GRID_SIZE = 9;
const TOTAL_MINES = 10;

const NUMBER_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#10B981',
  3: '#EF4444',
  4: '#7C3AED',
  5: '#F59E0B',
  6: '#06B6D4',
  7: '#E11D48',
  8: '#F8FAFC'
};

export const MinesweeperRetro = forwardRef<MinesweeperRetroRef, MinesweeperRetroProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [flagMode, setFlagMode] = useState<boolean>(false);
  const [score, setScore] = useState<number>(initialScore);

  const initGrid = useCallback(() => {
    const newGrid: Cell[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      newGrid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        newGrid[r][c] = {
          r,
          c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        };
      }
    }
    setGrid(newGrid);
    setGameStarted(false);
    setGameOver(false);
    setGameWon(false);
    setScore(0);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart: initGrid,
    getScore: () => score
  }), [initGrid, score]);

  useEffect(() => {
    initGrid();
  }, [initGrid]);

  // Place mines avoiding first clicked cell
  const populateMines = (firstR: number, firstC: number, currentGrid: Cell[][]) => {
    let placed = 0;
    while (placed < TOTAL_MINES) {
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      // Avoid first click and its 8 adjacent neighbors for comfortable start
      const isNearFirst = Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1;
      if (!currentGrid[r][c].isMine && !isNearFirst) {
        currentGrid[r][c].isMine = true;
        placed++;
      }
    }

    // Calculate neighbor counts
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!currentGrid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                if (currentGrid[nr][nc].isMine) count++;
              }
            }
          }
          currentGrid[r][c].neighborMines = count;
        }
      }
    }
  };

  // Recursive cascade reveal
  const revealCell = (r: number, c: number, targetGrid: Cell[][]): number => {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return 0;
    const cell = targetGrid[r][c];
    if (cell.isRevealed || cell.isFlagged) return 0;

    cell.isRevealed = true;
    let revealedCount = 1;

    // If 0 neighbors, cascade reveal all adjacent
    if (cell.neighborMines === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) {
            revealedCount += revealCell(r + dr, c + dc, targetGrid);
          }
        }
      }
    }
    return revealedCount;
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || gameWon) return;

    const cell = grid[r][c];
    if (cell.isRevealed) return;

    if (flagMode) {
      // Toggle flag
      const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
      newGrid[r][c].isFlagged = !newGrid[r][c].isFlagged;
      setGrid(newGrid);
      return;
    }

    if (cell.isFlagged) return;

    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));

    // On first click, generate safe field
    if (!gameStarted) {
      populateMines(r, c, newGrid);
      setGameStarted(true);
    }

    // Hit a mine -> Game Over!
    if (newGrid[r][c].isMine) {
      // Reveal all mines
      newGrid.forEach(row => row.forEach(cl => {
        if (cl.isMine) cl.isRevealed = true;
      }));
      setGrid(newGrid);
      setGameOver(true);
      onGameOver?.(score);
      return;
    }

    // Reveal safe cell & cascades
    const newlyRevealed = revealCell(r, c, newGrid);
    const newScore = score + newlyRevealed * 10;
    setScore(newScore);
    onScoreUpdate?.(newScore);
    setGrid(newGrid);

    // Check Victory (71 safe cells revealed)
    let safeRemaining = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!newGrid[row][col].isMine && !newGrid[row][col].isRevealed) {
          safeRemaining++;
        }
      }
    }

    if (safeRemaining === 0) {
      setGameWon(true);
      const bonusScore = newScore + 200;
      setScore(bonusScore);
      onScoreUpdate?.(bonusScore);
      onGameOver?.(bonusScore);
    }
  };

  const flagsPlaced = grid.reduce((acc, row) => acc + row.filter(c => c.isFlagged).length, 0);

  return (
    <div className={styles.container} id="game-minesweeper-retro">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>MINESWEEPER RETRO</h3>
          <span>Classic Demining Grid</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>MINES</span>
            <span className={styles.statValue} id="val-mines-remaining">{TOTAL_MINES - flagsPlaced}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-mines-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.gridArea} id="grid-minesweeper">
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isRev = cell.isRevealed;
            return (
              <button
                key={`${r}-${c}`}
                className={`${styles.cell} ${isRev ? styles.cellRevealed : ''} ${cell.isMine && isRev ? styles.cellMine : ''} ${cell.isFlagged ? styles.cellFlagged : ''}`}
                onClick={() => handleCellClick(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!cell.isRevealed && !gameOver && !gameWon) {
                    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
                    newGrid[r][c].isFlagged = !newGrid[r][c].isFlagged;
                    setGrid(newGrid);
                  }
                }}
                disabled={cell.isRevealed || gameOver || gameWon}
                id={`cell-mine-${r}-${c}`}
                aria-label={`Cell ${r} ${c}`}
              >
                {isRev ? (
                  cell.isMine ? '💣' : (cell.neighborMines > 0 ? (
                    <span style={{ color: NUMBER_COLORS[cell.neighborMines] }}>
                      {cell.neighborMines}
                    </span>
                  ) : '')
                ) : (
                  cell.isFlagged ? '🚩' : ''
                )}
              </button>
            );
          })
        )}
      </div>

      <div className={styles.controlsRow}>
        <button
          className={`${styles.flagToggle} ${flagMode ? styles.flagToggleActive : ''}`}
          onClick={() => setFlagMode(!flagMode)}
          id="btn-mine-flag-toggle"
          aria-label="Toggle Flag Placement Mode"
        >
          {flagMode ? '🚩 PLACING FLAGS' : '⛏️ REVEALING CELLS'}
        </button>
        <button
          className={styles.restartButton}
          onClick={initGrid}
          id="btn-mine-restart"
        >
          {gameOver ? '😵 New Field' : gameWon ? '😎 Defused!' : '🙂 Reset'}
        </button>
      </div>
    </div>
  );
});

MinesweeperRetro.displayName = 'MinesweeperRetro';
