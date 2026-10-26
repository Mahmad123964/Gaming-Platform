import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TicTacToePro.module.css';

export interface TicTacToeProRef {
  restart: () => void;
  getScore: () => number;
}

interface TicTacToeProProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (winner: string) => void;
  onRestart?: () => void;
}

type CellValue = 'X' | 'O' | null;

const WIN_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export const TicTacToePro = forwardRef<TicTacToeProRef, TicTacToeProProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [vsAi, setVsAi] = useState<boolean>(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState<{ x: number; o: number; ties: number }>({
    x: initialScore,
    o: 0,
    ties: 0
  });

  const checkWinner = (currentBoard: CellValue[]) => {
    for (const combo of WIN_COMBINATIONS) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], line: combo };
      }
    }
    if (currentBoard.every(cell => cell !== null)) {
      return { winner: 'TIE', line: null };
    }
    return null;
  };

  const restart = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scores.x
  }), [restart, scores.x]);

  // Minimax Bot Move
  const makeAiMove = useCallback((currentBoard: CellValue[]) => {
    // 1. Check if AI ('O') can win in 1 move
    for (let i = 0; i < 9; i++) {
      if (!currentBoard[i]) {
        const copy = [...currentBoard];
        copy[i] = 'O';
        const win = checkWinner(copy);
        if (win && win.winner === 'O') return i;
      }
    }
    // 2. Check if Human ('X') can win in 1 move -> block!
    for (let i = 0; i < 9; i++) {
      if (!currentBoard[i]) {
        const copy = [...currentBoard];
        copy[i] = 'X';
        const win = checkWinner(copy);
        if (win && win.winner === 'X') return i;
      }
    }
    // 3. Take center if available
    if (!currentBoard[4]) return 4;
    // 4. Take random available corner or side
    const available = currentBoard.map((val, idx) => (val === null ? idx : null)).filter(val => val !== null) as number[];
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    return -1;
  }, []);

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningLine(result.line);
      if (result.winner === 'X') {
        setScores(s => {
          const updated = { ...s, x: s.x + 1 };
          onScoreUpdate?.(updated.x);
          return updated;
        });
      } else if (result.winner === 'O') {
        setScores(s => ({ ...s, o: s.o + 1 }));
      } else {
        setScores(s => ({ ...s, ties: s.ties + 1 }));
      }
      onGameOver?.(result.winner);
      return;
    }

    if (vsAi && isXNext) {
      setIsXNext(false);
      // Trigger AI turn with slight human-like delay
      setTimeout(() => {
        const aiIdx = makeAiMove(newBoard);
        if (aiIdx !== -1) {
          newBoard[aiIdx] = 'O';
          setBoard([...newBoard]);
          const aiResult = checkWinner(newBoard);
          if (aiResult) {
            setWinner(aiResult.winner);
            setWinningLine(aiResult.line);
            if (aiResult.winner === 'O') {
              setScores(s => ({ ...s, o: s.o + 1 }));
            } else if (aiResult.winner === 'TIE') {
              setScores(s => ({ ...s, ties: s.ties + 1 }));
            }
            onGameOver?.(aiResult.winner);
          } else {
            setIsXNext(true);
          }
        }
      }, 250);
    } else {
      setIsXNext(!isXNext);
    }
  };

  return (
    <div className={styles.container} id="game-tictactoe-pro">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>TIC-TAC-TOE PRO</h3>
          <span>Neural AI & Local Match</span>
        </div>
        <button
          className={styles.modeToggle}
          onClick={() => { setVsAi(!vsAi); restart(); }}
          id="btn-ttt-toggle-ai"
        >
          {vsAi ? 'Mode: vs AI Bot' : 'Mode: 2-Player'}
        </button>
      </div>

      <div className={styles.statusBar} id="val-ttt-status">
        {winner ? (
          winner === 'TIE' ? "It's a Stalemate Draw!" : `Player ${winner} Victorious!`
        ) : (
          `Current Turn: Player ${isXNext ? 'X (You)' : (vsAi ? 'O (Bot)' : 'O')}`
        )}
      </div>

      <div className={styles.boardGrid} id="board-ttt-grid">
        {board.map((cell, idx) => (
          <button
            key={idx}
            className={`${styles.cell} ${cell === 'X' ? styles.cellX : cell === 'O' ? styles.cellO : ''} ${winningLine?.includes(idx) ? styles.cellWinning : ''}`}
            onClick={() => handleCellClick(idx)}
            disabled={cell !== null || winner !== null}
            id={`cell-ttt-${idx}`}
            aria-label={`Cell ${idx}`}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <label>PLAYER X</label>
          <span id="val-ttt-x-score">{scores.x}</span>
        </div>
        <div className={styles.scoreItem}>
          <label>TIES</label>
          <span id="val-ttt-ties">{scores.ties}</span>
        </div>
        <div className={styles.scoreItem}>
          <label>PLAYER O</label>
          <span id="val-ttt-o-score">{scores.o}</span>
        </div>
      </div>

      <button
        className={styles.restartButton}
        onClick={restart}
        id="btn-ttt-restart"
      >
        Reset Match
      </button>
    </div>
  );
});

TicTacToePro.displayName = 'TicTacToePro';
