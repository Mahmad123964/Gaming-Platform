import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ConnectFour.module.css';

export interface ConnectFourRef {
  restart: () => void;
  getScore: () => number;
}

interface ConnectFourProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (winner: string) => void;
  onRestart?: () => void;
}

type Disc = 'RED' | 'YELLOW' | null;

const COLS = 7;
const ROWS = 6;

export const ConnectFour = forwardRef<ConnectFourRef, ConnectFourProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [board, setBoard] = useState<Disc[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [turn, setTurn] = useState<'RED' | 'YELLOW'>('RED');
  const [vsAi, setVsAi] = useState<boolean>(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState<number>(initialScore);

  const initGame = useCallback(() => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setTurn('RED');
    setWinner(null);
    setScore(0);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart: initGame,
    getScore: () => score
  }), [initGame, score]);

  const checkWin = (b: Disc[][]): 'RED' | 'YELLOW' | 'TIE' | null => {
    // 1. Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const d = b[r][c];
        if (d && d === b[r][c + 1] && d === b[r][c + 2] && d === b[r][c + 3]) {
          return d;
        }
      }
    }
    // 2. Vertical
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c < COLS; c++) {
        const d = b[r][c];
        if (d && d === b[r + 1][c] && d === b[r + 2][c] && d === b[r + 3][c]) {
          return d;
        }
      }
    }
    // 3. Diagonal Up-Right
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const d = b[r][c];
        if (d && d === b[r - 1][c + 1] && d === b[r - 2][c + 2] && d === b[r - 3][c + 3]) {
          return d;
        }
      }
    }
    // 4. Diagonal Down-Right
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const d = b[r][c];
        if (d && d === b[r + 1][c + 1] && d === b[r + 2][c + 2] && d === b[r + 3][c + 3]) {
          return d;
        }
      }
    }
    // 5. Full grid Tie
    if (b.every(row => row.every(slot => slot !== null))) {
      return 'TIE';
    }
    return null;
  };

  const dropDisc = (col: number, currentBoard: Disc[][], player: 'RED' | 'YELLOW'): { success: boolean; newBoard: Disc[][] } => {
    // Drop to bottom-most empty row in column
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (currentBoard[r][col] === null) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) return { success: false, newBoard: currentBoard };

    const newBoard = currentBoard.map(row => [...row]);
    newBoard[targetRow][col] = player;
    return { success: true, newBoard };
  };

  // Bot move logic: checks winning drop, blocks human 3-in-a-row, takes center
  const makeAiMove = (currentBoard: Disc[][]) => {
    // 1. Can AI win in 1 drop?
    for (let c = 0; c < COLS; c++) {
      const res = dropDisc(c, currentBoard, 'YELLOW');
      if (res.success && checkWin(res.newBoard) === 'YELLOW') {
        applyMove(c, 'YELLOW', currentBoard);
        return;
      }
    }
    // 2. Can Human win in 1 drop? Block!
    for (let c = 0; c < COLS; c++) {
      const res = dropDisc(c, currentBoard, 'RED');
      if (res.success && checkWin(res.newBoard) === 'RED') {
        applyMove(c, 'YELLOW', currentBoard);
        return;
      }
    }
    // 3. Prefer center column 3
    if (currentBoard[0][3] === null) {
      applyMove(3, 'YELLOW', currentBoard);
      return;
    }
    // 4. Any valid column
    const validCols = [2, 4, 1, 5, 0, 6].filter(c => currentBoard[0][c] === null);
    if (validCols.length > 0) {
      applyMove(validCols[0], 'YELLOW', currentBoard);
    }
  };

  const applyMove = (col: number, player: 'RED' | 'YELLOW', b = board) => {
    const { success, newBoard } = dropDisc(col, b, player);
    if (!success) return;

    setBoard(newBoard);
    const result = checkWin(newBoard);

    if (result) {
      setWinner(result);
      if (result === 'RED') {
        const newScore = score + 100;
        setScore(newScore);
        onScoreUpdate?.(newScore);
      }
      onGameOver?.(result);
      return;
    }

    const nextTurn = player === 'RED' ? 'YELLOW' : 'RED';
    setTurn(nextTurn);

    if (vsAi && nextTurn === 'YELLOW') {
      setTimeout(() => {
        makeAiMove(newBoard);
      }, 350);
    }
  };

  const handleColumnClick = (col: number) => {
    if (winner) return;
    if (vsAi && turn !== 'RED') return;
    applyMove(col, turn);
  };

  return (
    <div className={styles.container} id="game-connect-four">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>CONNECT FOUR</h3>
          <span>Vertical Gravity 4-in-a-Row</span>
        </div>
        <button
          className={styles.modeToggle}
          onClick={() => { setVsAi(!vsAi); initGame(); }}
          id="btn-c4-toggle-mode"
        >
          {vsAi ? 'Mode: vs AI Bot' : 'Mode: 2-Player'}
        </button>
      </div>

      <div className={styles.statusBar} id="val-c4-status">
        {winner ? (
          winner === 'TIE' ? "Match Concluded: Stalemate Draw!" : `Player ${winner} Victorious!`
        ) : (
          `Current Drop: Player ${turn === 'RED' ? 'Red (You)' : (vsAi ? 'Yellow (Bot)' : 'Yellow')}`
        )}
      </div>

      {/* Column Drop Buttons */}
      <div className={styles.columnButtons} id="c4-column-buttons">
        {[0, 1, 2, 3, 4, 5, 6].map(col => (
          <button
            key={col}
            className={styles.colBtn}
            onClick={() => handleColumnClick(col)}
            disabled={board[0][col] !== null || !!winner}
            id={`btn-c4-drop-${col}`}
            aria-label={`Drop Column ${col}`}
          >
            ▼
          </button>
        ))}
      </div>

      <div className={styles.boardGrid} id="board-connect-four">
        {board.map((row, r) =>
          row.map((disc, c) => (
            <div
              key={`${r}-${c}`}
              className={styles.slot}
              onClick={() => handleColumnClick(c)}
              id={`slot-c4-${r}-${c}`}
            >
              {disc === 'RED' && <div className={styles.discRed} />}
              {disc === 'YELLOW' && <div className={styles.discYellow} />}
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Connect 4 discs horizontally, vertically or diagonally
        </div>
        <button
          className={styles.restartButton}
          onClick={initGame}
          id="btn-c4-restart"
        >
          Reset Grid
        </button>
      </div>
    </div>
  );
});

ConnectFour.displayName = 'ConnectFour';
