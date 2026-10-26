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

  // True Optimal Minimax Algorithm for unbeatable AI
  const minimax = useCallback((b: CellValue[], depth: number, isMaximizing: boolean): number => {
    const outcome = checkWinner(b);
    if (outcome) {
      if (outcome.winner === 'O') return 10 - depth;
      if (outcome.winner === 'X') return depth - 10;
      if (outcome.winner === 'TIE') return 0;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          b[i] = 'O';
          const evalScore = minimax(b, depth + 1, false);
          b[i] = null;
          maxEval = Math.max(maxEval, evalScore);
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          b[i] = 'X';
          const evalScore = minimax(b, depth + 1, true);
          b[i] = null;
          minEval = Math.min(minEval, evalScore);
        }
      }
      return minEval;
    }
  }, []);

  const makeAiMove = useCallback((currentBoard: CellValue[]) => {
    const bCopy = [...currentBoard];
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (bCopy[i] === null) {
        bCopy[i] = 'O';
        const moveScore = minimax(bCopy, 0, false);
        bCopy[i] = null;
        if (moveScore > bestScore) {
          bestScore = moveScore;
          bestMove = i;
        }
      }
    }

    return bestMove;
  }, [minimax]);

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
          <span>Minimax Optimal AI & Local Match</span>
        </div>
        <button
          className={styles.modeToggle}
          onClick={() => { setVsAi(!vsAi); restart(); }}
          id="btn-ttt-toggle-ai"
        >
          {vsAi ? 'Mode: vs AI Bot (Minimax)' : 'Mode: 2-Player'}
        </button>
      </div>

      <div className={styles.statusBar} id="val-ttt-status">
        {winner ? (
          winner === 'TIE' ? "It's a Stalemate Draw!" : `Player ${winner} Victorious!`
        ) : (
          `Current Turn: Player ${isXNext ? 'X (You)' : (vsAi ? 'O (Minimax Bot)' : 'O')}`
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
