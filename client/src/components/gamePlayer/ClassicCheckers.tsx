import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ClassicCheckers.module.css';

export interface ClassicCheckersRef {
  restart: () => void;
  getScore: () => number;
}

interface ClassicCheckersProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (winner: string) => void;
  onRestart?: () => void;
}

type PieceType = 'CYAN' | 'RED' | null;
interface Piece {
  player: 'CYAN' | 'RED';
  isKing: boolean;
}

type BoardState = (Piece | null)[][];

export const ClassicCheckers = forwardRef<ClassicCheckersRef, ClassicCheckersProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  // Cyan starts at bottom (moves up), Red at top (moves down)
  const initBoard = (): BoardState => {
    const b: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) b[r][c] = { player: 'RED', isKing: false };
          else if (r > 4) b[r][c] = { player: 'CYAN', isKing: false };
        }
      }
    }
    return b;
  };

  const [board, setBoard] = useState<BoardState>(initBoard);
  const [turn, setTurn] = useState<'CYAN' | 'RED'>('CYAN');
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [vsAi, setVsAi] = useState<boolean>(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [cyanScore, setCyanScore] = useState<number>(initialScore);

  const countPieces = (b: BoardState) => {
    let cyan = 0;
    let red = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p?.player === 'CYAN') cyan++;
        if (p?.player === 'RED') red++;
      }
    }
    return { cyan, red };
  };

  const restart = useCallback(() => {
    const b = initBoard();
    setBoard(b);
    setTurn('CYAN');
    setSelectedPos(null);
    setValidMoves([]);
    setWinner(null);
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => cyanScore
  }), [restart, cyanScore]);

  // Compute valid diagonal steps & jumps for a selected piece
  const getMovesForPiece = useCallback((b: BoardState, r: number, c: number): [number, number][] => {
    const p = b[r][c];
    if (!p) return [];

    const moves: [number, number][] = [];
    const forwardDirs = p.isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : p.player === 'CYAN'
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]];

    for (const [dr, dc] of forwardDirs) {
      const nr = r + dr;
      const nc = c + dc;
      // Normal single step
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!b[nr][nc]) {
          moves.push([nr, nc]);
        } else if (b[nr][nc]?.player !== p.player) {
          // Jumping capture
          const jr = nr + dr;
          const jc = nc + dc;
          if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !b[jr][jc]) {
            moves.push([jr, jc]);
          }
        }
      }
    }
    return moves;
  }, []);

  const handleCellClick = (r: number, c: number) => {
    if (winner) return;

    // Selecting own piece
    const p = board[r][c];
    if (p && p.player === turn) {
      setSelectedPos([r, c]);
      setValidMoves(getMovesForPiece(board, r, c));
      return;
    }

    // Moving selected piece to target
    if (selectedPos && validMoves.some(([vr, vc]) => vr === r && vc === c)) {
      const [fromR, fromC] = selectedPos;
      const movingPiece = { ...board[fromR][fromC]! };
      const newBoard = board.map(row => [...row]);

      newBoard[fromR][fromC] = null;

      // Handle jumping capture removal
      if (Math.abs(r - fromR) === 2) {
        const midR = (fromR + r) / 2;
        const midC = (fromC + c) / 2;
        newBoard[midR][midC] = null;
        if (turn === 'CYAN') {
          const newScore = cyanScore + 20;
          setCyanScore(newScore);
          onScoreUpdate?.(newScore);
        }
      }

      // King promotion
      if (movingPiece.player === 'CYAN' && r === 0) movingPiece.isKing = true;
      if (movingPiece.player === 'RED' && r === 7) movingPiece.isKing = true;

      newBoard[r][c] = movingPiece;
      setBoard(newBoard);
      setSelectedPos(null);
      setValidMoves([]);

      // Check win
      const { cyan, red } = countPieces(newBoard);
      if (red === 0) {
        setWinner('CYAN');
        onGameOver?.('CYAN');
        return;
      }
      if (cyan === 0) {
        setWinner('RED');
        onGameOver?.('RED');
        return;
      }

      // Switch turn
      const nextTurn = turn === 'CYAN' ? 'RED' : 'CYAN';
      setTurn(nextTurn);

      // AI turn
      if (vsAi && nextTurn === 'RED') {
        setTimeout(() => {
          makeAiMove(newBoard);
        }, 300);
      }
    } else {
      setSelectedPos(null);
      setValidMoves([]);
    }
  };

  const makeAiMove = (currentBoard: BoardState) => {
    const redMoves: { from: [number, number]; to: [number, number]; isJump: boolean }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (currentBoard[r][c]?.player === 'RED') {
          const mvs = getMovesForPiece(currentBoard, r, c);
          for (const [tr, tc] of mvs) {
            redMoves.push({
              from: [r, c],
              to: [tr, tc],
              isJump: Math.abs(tr - r) === 2
            });
          }
        }
      }
    }

    if (redMoves.length === 0) {
      setWinner('CYAN');
      onGameOver?.('CYAN');
      return;
    }

    // Prioritize jump captures
    const jumps = redMoves.filter(m => m.isJump);
    const chosen = jumps.length > 0
      ? jumps[Math.floor(Math.random() * jumps.length)]
      : redMoves[Math.floor(Math.random() * redMoves.length)];

    const [fromR, fromC] = chosen.from;
    const [toR, toC] = chosen.to;
    const movingPiece = { ...currentBoard[fromR][fromC]! };
    const newBoard = currentBoard.map(row => [...row]);

    newBoard[fromR][fromC] = null;
    if (chosen.isJump) {
      const midR = (fromR + toR) / 2;
      const midC = (fromC + toC) / 2;
      newBoard[midR][midC] = null;
    }

    if (toR === 7) movingPiece.isKing = true;
    newBoard[toR][toC] = movingPiece;

    setBoard(newBoard);

    const { cyan } = countPieces(newBoard);
    if (cyan === 0) {
      setWinner('RED');
      onGameOver?.('RED');
      return;
    }

    setTurn('CYAN');
  };

  const counts = countPieces(board);

  return (
    <div className={styles.container} id="game-classic-checkers">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>CLASSIC CHECKERS</h3>
          <span>Draughts Tactical Grid</span>
        </div>
        <button
          className={styles.modeToggle}
          onClick={() => { setVsAi(!vsAi); restart(); }}
          id="btn-checkers-mode"
        >
          {vsAi ? 'Mode: vs AI Bot' : 'Mode: 2-Player'}
        </button>
      </div>

      <div className={styles.statusBar} id="val-checkers-turn">
        {winner ? `Game Over! Player ${winner} Won!` : `Current Turn: ${turn === 'CYAN' ? 'Cyan (You)' : 'Red (Bot)'}`}
      </div>

      <div className={styles.boardGrid} id="board-checkers-grid">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c;
            const isValidTarget = validMoves.some(([vr, vc]) => vr === r && vc === c);

            return (
              <button
                key={`${r}-${c}`}
                className={`${styles.cell} ${isDark ? styles.darkCell : styles.lightCell} ${isSelected ? styles.selectedCell : ''} ${isValidTarget ? styles.validTargetCell : ''}`}
                onClick={() => handleCellClick(r, c)}
                id={`checker-cell-${r}-${c}`}
                aria-label={`Row ${r} Col ${c}`}
              >
                {cell && (
                  <div className={`${styles.piece} ${cell.player === 'CYAN' ? styles.cyanPiece : styles.redPiece}`}>
                    {cell.isKing ? '♔' : ''}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.scorePills}>
          <div className={`${styles.pill} ${styles.pillCyan}`} id="val-checkers-cyan-count">
            Cyan: {counts.cyan}
          </div>
          <div className={`${styles.pill} ${styles.pillRed}`} id="val-checkers-red-count">
            Red: {counts.red}
          </div>
        </div>
        <button className={styles.restartButton} onClick={restart} id="btn-checkers-restart">
          Reset Board
        </button>
      </div>
    </div>
  );
});

ClassicCheckers.displayName = 'ClassicCheckers';
