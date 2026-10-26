import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './SudokuClassic.module.css';

export interface SudokuClassicRef {
  restart: () => void;
  getScore: () => number;
}

interface SudokuClassicProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

// Preset valid 9x9 Sudoku puzzles with solution
const PUZZLE_BANK = [
  {
    initial: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ]
  }
];

export const SudokuClassic = forwardRef<SudokuClassicRef, SudokuClassicProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [board, setBoard] = useState<number[][]>([]);
  const [initialMask, setInitialMask] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState<number>(0);
  const [score, setScore] = useState<number>(initialScore);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [activePuzzleIdx, setActivePuzzleIdx] = useState<number>(0);

  const initGame = useCallback(() => {
    const p = PUZZLE_BANK[activePuzzleIdx % PUZZLE_BANK.length];
    const b = p.initial.map(row => [...row]);
    const mask = p.initial.map(row => row.map(val => val !== 0));

    setBoard(b);
    setInitialMask(mask);
    setSelectedCell([0, 2]); // default to first empty cell
    setMistakes(0);
    setScore(0);
    setIsWon(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [activePuzzleIdx, onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart: initGame,
    getScore: () => score
  }), [initGame, score]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const enterNumber = (num: number) => {
    if (!selectedCell || isWon || mistakes >= 3) return;
    const [r, c] = selectedCell;
    if (initialMask[r][c]) return; // Cannot edit original clue

    const p = PUZZLE_BANK[activePuzzleIdx % PUZZLE_BANK.length];
    const correctVal = p.solution[r][c];

    const newBoard = board.map(row => [...row]);

    if (num === 0) {
      // Erase
      newBoard[r][c] = 0;
      setBoard(newBoard);
      return;
    }

    if (num === correctVal) {
      newBoard[r][c] = num;
      setBoard(newBoard);
      const newScore = score + 15;
      setScore(newScore);
      onScoreUpdate?.(newScore);

      // Check win condition
      let complete = true;
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (newBoard[row][col] !== p.solution[row][col]) {
            complete = false;
          }
        }
      }

      if (complete) {
        setIsWon(true);
        const finalWinScore = newScore + 150;
        setScore(finalWinScore);
        onScoreUpdate?.(finalWinScore);
        onGameOver?.(finalWinScore);
      }
    } else {
      // Mistake!
      newBoard[r][c] = num;
      setBoard(newBoard);
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      if (newMistakes >= 3) {
        onGameOver?.(score);
      }
    }
  };

  // Keyboard support for typing digits 1-9 or Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= 9) {
        e.preventDefault();
        enterNumber(digit);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        enterNumber(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enterNumber]);

  return (
    <div className={styles.container} id="game-sudoku-classic">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>SUDOKU CLASSIC</h3>
          <span>9x9 Latin Square Logic</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>MISTAKES</span>
            <span className={styles.statValue} id="val-sudoku-mistakes" style={{ color: mistakes > 1 ? '#EF4444' : '#00F0FF' }}>
              {mistakes}/3
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-sudoku-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.boardGrid} id="grid-sudoku-board">
        {board.map((row, r) =>
          row.map((val, c) => {
            const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
            const isGiven = initialMask[r]?.[c];
            const p = PUZZLE_BANK[activePuzzleIdx % PUZZLE_BANK.length];
            const isIncorrect = val !== 0 && !isGiven && val !== p.solution[r][c];

            const borderR = (c === 2 || c === 5) ? styles.borderRight : '';
            const borderB = (r === 2 || r === 5) ? styles.borderBottom : '';

            return (
              <button
                key={`${r}-${c}`}
                className={`${styles.cell} ${isGiven ? styles.cellGiven : ''} ${isSelected ? styles.cellSelected : ''} ${isIncorrect ? styles.cellConflict : ''} ${borderR} ${borderB}`}
                onClick={() => setSelectedCell([r, c])}
                id={`cell-sudoku-${r}-${c}`}
                aria-label={`Row ${r} Col ${c}`}
              >
                {val !== 0 ? val : ''}
              </button>
            );
          })
        )}
      </div>

      {isWon && (
        <div style={{ marginTop: '10px', color: '#10B981', fontWeight: 800, textAlign: 'center' }} id="sudoku-victory-banner">
          🎉 SUDOKU SOLVED! PERFECT LATIN SQUARE!
        </div>
      )}

      {/* Number Pad for Mobile and Desktop Input */}
      <div className={styles.numberPad} id="sudoku-number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            className={styles.numpadBtn}
            onClick={() => enterNumber(n)}
            id={`btn-numpad-${n}`}
          >
            {n}
          </button>
        ))}
        <button
          className={`${styles.numpadBtn} ${styles.eraseBtn}`}
          onClick={() => enterNumber(0)}
          id="btn-numpad-erase"
          aria-label="Erase"
        >
          ⌫
        </button>
      </div>

      <button
        className={styles.restartButton}
        onClick={initGame}
        id="btn-sudoku-restart"
      >
        {mistakes >= 3 ? 'Grid Locked (Restart)' : 'New Puzzle Deal'}
      </button>
    </div>
  );
});

SudokuClassic.displayName = 'SudokuClassic';
