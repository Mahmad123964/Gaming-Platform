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

interface Piece {
  player: 'CYAN' | 'RED';
  isKing: boolean;
}

type BoardState = (Piece | null)[][];

interface MoveOption {
  from: [number, number];
  to: [number, number];
  isJump: boolean;
  mid?: [number, number];
}

export const ClassicCheckers = forwardRef<ClassicCheckersRef, ClassicCheckersProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  // Cyan starts at bottom (moves up towards row 0), Red at top (moves down towards row 7)
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
  const [inMultiJump, setInMultiJump] = useState<boolean>(false);
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
    setInMultiJump(false);
    setWinner(null);
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => cyanScore
  }), [restart, cyanScore]);

  // Compute all raw jumps for a single piece
  const getJumpsForPiece = useCallback((b: BoardState, r: number, c: number): MoveOption[] => {
    const p = b[r][c];
    if (!p) return [];

    const jumps: MoveOption[] = [];
    const dirs = p.isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : p.player === 'CYAN'
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]];

    for (const [dr, dc] of dirs) {
      const midR = r + dr;
      const midC = c + dc;
      const targetR = r + dr * 2;
      const targetC = c + dc * 2;

      if (targetR >= 0 && targetR < 8 && targetC >= 0 && targetC < 8) {
        const midPiece = b[midR]?.[midC];
        const targetPiece = b[targetR]?.[targetC];
        if (midPiece && midPiece.player !== p.player && !targetPiece) {
          jumps.push({
            from: [r, c],
            to: [targetR, targetC],
            isJump: true,
            mid: [midR, midC]
          });
        }
      }
    }
    return jumps;
  }, []);

  // Compute normal diagonal steps (non-jumps) for a single piece
  const getStepsForPiece = useCallback((b: BoardState, r: number, c: number): MoveOption[] => {
    const p = b[r][c];
    if (!p) return [];

    const steps: MoveOption[] = [];
    const dirs = p.isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : p.player === 'CYAN'
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]];

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr][nc]) {
        steps.push({
          from: [r, c],
          to: [nr, nc],
          isJump: false
        });
      }
    }
    return steps;
  }, []);

  // Compute all legal moves for active player enforcing mandatory captures
  const getAllLegalMoves = useCallback((b: BoardState, player: 'CYAN' | 'RED'): MoveOption[] => {
    const allJumps: MoveOption[] = [];
    const allSteps: MoveOption[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.player === player) {
          allJumps.push(...getJumpsForPiece(b, r, c));
          allSteps.push(...getStepsForPiece(b, r, c));
        }
      }
    }

    // MANDATORY CAPTURES RULE: If any jump exists, only jumps are legal moves
    if (allJumps.length > 0) {
      return allJumps;
    }
    return allSteps;
  }, [getJumpsForPiece, getStepsForPiece]);

  // Execute AI turn
  const makeAiMove = useCallback((currentBoard: BoardState) => {
    let aiBoard = currentBoard.map(row => [...row]);
    let aiTurnContinues = true;
    let currentPos: [number, number] | null = null;

    while (aiTurnContinues) {
      let candidateMoves: MoveOption[] = [];

      if (currentPos) {
        // Multi-jump continuation for active piece
        candidateMoves = getJumpsForPiece(aiBoard, currentPos[0], currentPos[1]);
      } else {
        candidateMoves = getAllLegalMoves(aiBoard, 'RED');
      }

      if (candidateMoves.length === 0) {
        if (!currentPos) {
          // No legal moves: Cyan wins by stalemate
          setWinner('CYAN');
          onGameOver?.('CYAN');
          return;
        }
        aiTurnContinues = false;
        break;
      }

      // Pick chosen move (prioritizes jumps)
      const jumps = candidateMoves.filter(m => m.isJump);
      const chosen = jumps.length > 0
        ? jumps[Math.floor(Math.random() * jumps.length)]
        : candidateMoves[Math.floor(Math.random() * candidateMoves.length)];

      const [fromR, fromC] = chosen.from;
      const [toR, toC] = chosen.to;
      const piece = { ...aiBoard[fromR][fromC]! };

      aiBoard[fromR][fromC] = null;
      if (chosen.isJump && chosen.mid) {
        aiBoard[chosen.mid[0]][chosen.mid[1]] = null;
      }

      // King promotion (crown on row 7)
      let newlyCrowned = false;
      if (toR === 7 && !piece.isKing) {
        piece.isKing = true;
        newlyCrowned = true;
      }

      aiBoard[toR][toC] = piece;

      // In draughts, if crowned during jump, turn ends; otherwise check for consecutive jump
      if (chosen.isJump && !newlyCrowned) {
        const nextJumps = getJumpsForPiece(aiBoard, toR, toC);
        if (nextJumps.length > 0) {
          currentPos = [toR, toC];
          aiTurnContinues = true;
          continue;
        }
      }

      aiTurnContinues = false;
    }

    setBoard(aiBoard);

    // Check if Cyan has remaining pieces or legal moves
    const counts = countPieces(aiBoard);
    if (counts.cyan === 0) {
      setWinner('RED');
      onGameOver?.('RED');
      return;
    }

    const cyanMoves = getAllLegalMoves(aiBoard, 'CYAN');
    if (cyanMoves.length === 0) {
      setWinner('RED');
      onGameOver?.('RED');
      return;
    }

    setTurn('CYAN');
  }, [countPieces, getAllLegalMoves, getJumpsForPiece, onGameOver]);

  const handleCellClick = (r: number, c: number) => {
    if (winner) return;
    if (turn !== 'CYAN' && vsAi) return;

    const legalMoves = inMultiJump && selectedPos
      ? getJumpsForPiece(board, selectedPos[0], selectedPos[1])
      : getAllLegalMoves(board, turn);

    // Check if selecting piece
    const clickedPiece = board[r][c];
    if (clickedPiece && clickedPiece.player === turn) {
      if (inMultiJump) {
        // In multi-jump, player cannot change selected piece
        return;
      }
      // Only allow selecting pieces that have moves in legalMoves
      const pieceMoves = legalMoves.filter(m => m.from[0] === r && m.from[1] === c);
      if (pieceMoves.length > 0) {
        setSelectedPos([r, c]);
        setValidMoves(pieceMoves.map(m => m.to));
      }
      return;
    }

    // Moving selected piece to target
    if (selectedPos && validMoves.some(([vr, vc]) => vr === r && vc === c)) {
      const [fromR, fromC] = selectedPos;
      const matchedMove = legalMoves.find(
        m => m.from[0] === fromR && m.from[1] === fromC && m.to[0] === r && m.to[1] === c
      );
      if (!matchedMove) return;

      const movingPiece = { ...board[fromR][fromC]! };
      const newBoard = board.map(row => [...row]);

      newBoard[fromR][fromC] = null;

      // Handle jumping capture removal
      if (matchedMove.isJump && matchedMove.mid) {
        newBoard[matchedMove.mid[0]][matchedMove.mid[1]] = null;
        if (turn === 'CYAN') {
          const newScore = cyanScore + 20;
          setCyanScore(newScore);
          onScoreUpdate?.(newScore);
        }
      }

      // King promotion (Cyan crowned on row 0)
      let newlyCrowned = false;
      if (movingPiece.player === 'CYAN' && r === 0 && !movingPiece.isKing) {
        movingPiece.isKing = true;
        newlyCrowned = true;
      }
      if (movingPiece.player === 'RED' && r === 7 && !movingPiece.isKing) {
        movingPiece.isKing = true;
        newlyCrowned = true;
      }

      newBoard[r][c] = movingPiece;

      // Check consecutive multi-jump continuation
      if (matchedMove.isJump && !newlyCrowned) {
        const nextJumps = getJumpsForPiece(newBoard, r, c);
        if (nextJumps.length > 0) {
          // Must continue jumping with this piece
          setBoard(newBoard);
          setSelectedPos([r, c]);
          setValidMoves(nextJumps.map(m => m.to));
          setInMultiJump(true);
          return;
        }
      }

      // Complete move and switch turn
      setBoard(newBoard);
      setSelectedPos(null);
      setValidMoves([]);
      setInMultiJump(false);

      // Check victory / stalemate
      const counts = countPieces(newBoard);
      if (counts.red === 0) {
        setWinner('CYAN');
        onGameOver?.('CYAN');
        return;
      }
      if (counts.cyan === 0) {
        setWinner('RED');
        onGameOver?.('RED');
        return;
      }

      const nextTurn = turn === 'CYAN' ? 'RED' : 'CYAN';
      const nextMoves = getAllLegalMoves(newBoard, nextTurn);
      if (nextMoves.length === 0) {
        // Stalemate: player with no moves loses
        const victorious = turn;
        setWinner(victorious);
        onGameOver?.(victorious);
        return;
      }

      setTurn(nextTurn);

      if (vsAi && nextTurn === 'RED') {
        setTimeout(() => {
          makeAiMove(newBoard);
        }, 300);
      }
    } else if (!inMultiJump) {
      setSelectedPos(null);
      setValidMoves([]);
    }
  };

  const counts = countPieces(board);

  return (
    <div className={styles.container} id="game-classic-checkers">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>CLASSIC CHECKERS</h3>
          <span>Draughts Tactical Grid • Mandatory Jumps</span>
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
        {winner
          ? `Game Over! Player ${winner} Won!`
          : inMultiJump
            ? `Multi-jump required! Continue jumping with Cyan at [${selectedPos?.[0]}, ${selectedPos?.[1]}]`
            : `Current Turn: ${turn === 'CYAN' ? 'Cyan (You)' : (vsAi ? 'Red (Bot)' : 'Red')}`}
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
