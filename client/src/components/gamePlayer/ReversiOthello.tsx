import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ReversiOthello.module.css';

export interface ReversiOthelloRef {
  restart: () => void;
  getScore: () => number;
}

interface ReversiOthelloProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (winner: string) => void;
  onRestart?: () => void;
}

type Disc = 'BLACK' | 'WHITE' | null;
type BoardState = Disc[][];

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

export const ReversiOthello = forwardRef<ReversiOthelloRef, ReversiOthelloProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const initBoard = (): BoardState => {
    const b: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
    b[3][3] = 'WHITE';
    b[3][4] = 'BLACK';
    b[4][3] = 'BLACK';
    b[4][4] = 'WHITE';
    return b;
  };

  const [board, setBoard] = useState<BoardState>(initBoard);
  const [turn, setTurn] = useState<'BLACK' | 'WHITE'>('BLACK');
  const [vsAi, setVsAi] = useState<boolean>(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState<number>(initialScore);

  const getFlippableDiscs = useCallback((b: BoardState, r: number, c: number, player: 'BLACK' | 'WHITE'): [number, number][] => {
    if (b[r][c] !== null) return [];
    const opponent = player === 'BLACK' ? 'WHITE' : 'BLACK';
    const flippable: [number, number][] = [];

    for (const [dr, dc] of DIRS) {
      let curR = r + dr;
      let curC = c + dc;
      const ray: [number, number][] = [];

      while (curR >= 0 && curR < 8 && curC >= 0 && curC < 8 && b[curR][curC] === opponent) {
        ray.push([curR, curC]);
        curR += dr;
        curC += dc;
      }

      if (curR >= 0 && curR < 8 && curC >= 0 && curC < 8 && b[curR][curC] === player && ray.length > 0) {
        flippable.push(...ray);
      }
    }
    return flippable;
  }, []);

  const getLegalMoves = useCallback((b: BoardState, player: 'BLACK' | 'WHITE'): { r: number; c: number; flips: [number, number][] }[] => {
    const moves: { r: number; c: number; flips: [number, number][] }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const flips = getFlippableDiscs(b, r, c, player);
        if (flips.length > 0) {
          moves.push({ r, c, flips });
        }
      }
    }
    return moves;
  }, [getFlippableDiscs]);

  const countDiscs = (b: BoardState) => {
    let black = 0;
    let white = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c] === 'BLACK') black++;
        if (b[r][c] === 'WHITE') white++;
      }
    }
    return { black, white };
  };

  const restart = useCallback(() => {
    const b = initBoard();
    setBoard(b);
    setTurn('BLACK');
    setWinner(null);
    setScore(2);
    onScoreUpdate?.(2);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }), [restart, score]);

  const makeMove = useCallback((r: number, c: number, flips: [number, number][], player: 'BLACK' | 'WHITE', currentBoard = board) => {
    const newBoard = currentBoard.map(row => [...row]);
    newBoard[r][c] = player;
    for (const [fr, fc] of flips) {
      newBoard[fr][fc] = player;
    }

    setBoard(newBoard);
    const counts = countDiscs(newBoard);
    setScore(counts.black);
    onScoreUpdate?.(counts.black);

    const nextPlayer = player === 'BLACK' ? 'WHITE' : 'BLACK';
    const nextMoves = getLegalMoves(newBoard, nextPlayer);

    if (nextMoves.length > 0) {
      setTurn(nextPlayer);
      if (vsAi && nextPlayer === 'WHITE') {
        setTimeout(() => {
          makeAiMove(newBoard);
        }, 350);
      }
    } else {
      // Check if current player can move again (pass)
      const currentMovesAgain = getLegalMoves(newBoard, player);
      if (currentMovesAgain.length > 0) {
        // Opponent must pass!
        if (vsAi && player === 'WHITE') {
          setTimeout(() => {
            makeAiMove(newBoard);
          }, 350);
        }
      } else {
        // Both players have no legal moves -> Game Over!
        let outcome = 'TIE';
        if (counts.black > counts.white) outcome = 'BLACK';
        else if (counts.white > counts.black) outcome = 'WHITE';

        setWinner(outcome);
        onGameOver?.(outcome);
      }
    }
  }, [board, countDiscs, getLegalMoves, onGameOver, onScoreUpdate, vsAi]);

  const makeAiMove = (b: BoardState) => {
    const legalMoves = getLegalMoves(b, 'WHITE');
    if (legalMoves.length === 0) return;

    // Corner priority weighting
    const isCorner = (r: number, c: number) => (r === 0 || r === 7) && (c === 0 || c === 7);
    const cornerMove = legalMoves.find(m => isCorner(m.r, m.c));

    const chosen = cornerMove || legalMoves.reduce((best, m) => m.flips.length > best.flips.length ? m : best, legalMoves[0]);
    makeMove(chosen.r, chosen.c, chosen.flips, 'WHITE', b);
  };

  const handleCellClick = (r: number, c: number) => {
    if (winner) return;
    if (vsAi && turn !== 'BLACK') return;

    const flips = getFlippableDiscs(board, r, c, turn);
    if (flips.length > 0) {
      makeMove(r, c, flips, turn);
    }
  };

  const counts = countDiscs(board);
  const legalMoves = getLegalMoves(board, turn);

  return (
    <div className={styles.container} id="game-reversi-othello">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>REVERSI OTHELLO</h3>
          <span>8x8 Strategic Disc Flips</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>BLACK</span>
            <span className={styles.statValue} id="val-reversi-black">{counts.black}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>WHITE</span>
            <span className={styles.statValue} id="val-reversi-white" style={{ color: '#E2E8F0' }}>{counts.white}</span>
          </div>
        </div>
      </div>

      <div className={styles.statusBar} id="val-reversi-status">
        {winner ? (
          winner === 'TIE' ? "Match Ended: Deadlock Draw!" : `Player ${winner} Victorious!`
        ) : (
          `Turn: Player ${turn === 'BLACK' ? 'Black (You)' : (vsAi ? 'White (Bot)' : 'White')}`
        )}
      </div>

      <div className={styles.boardGrid} id="board-reversi-grid">
        {board.map((row, r) =>
          row.map((disc, c) => {
            const isLegal = legalMoves.some(m => m.r === r && m.c === c);
            return (
              <button
                key={`${r}-${c}`}
                className={styles.cell}
                onClick={() => handleCellClick(r, c)}
                disabled={disc !== null || (!isLegal && !!turn)}
                id={`cell-reversi-${r}-${c}`}
                aria-label={`Cell ${r} ${c}`}
              >
                {disc === 'BLACK' && <div className={styles.discBlack} />}
                {disc === 'WHITE' && <div className={styles.discWhite} />}
                {!disc && isLegal && <div className={styles.legalIndicator} />}
              </button>
            );
          })
        )}
      </div>

      <div className={styles.footer}>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Cyan dots denote legal capture squares
        </div>
        <button
          className={styles.restartButton}
          onClick={restart}
          id="btn-reversi-restart"
        >
          Reset Match
        </button>
      </div>
    </div>
  );
});

ReversiOthello.displayName = 'ReversiOthello';
