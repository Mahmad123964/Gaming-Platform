import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ClassicCheckers.module.css';

export interface ChessMicroTacticsRef {
  restart: () => void;
  getScore: () => number;
}

interface ChessMicroTacticsProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type PieceColor = 'W' | 'B';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'P';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

const SIZE = 5;

// Initial 5x5 board setup
function initialChessBoard(): (ChessPiece | null)[][] {
  return [
    [{ type: 'R', color: 'B' }, { type: 'B', color: 'B' }, { type: 'Q', color: 'B' }, { type: 'K', color: 'B' }, { type: 'R', color: 'B' }],
    [{ type: 'P', color: 'B' }, { type: 'P', color: 'B' }, { type: 'P', color: 'B' }, { type: 'P', color: 'B' }, { type: 'P', color: 'B' }],
    [null, null, null, null, null],
    [{ type: 'P', color: 'W' }, { type: 'P', color: 'W' }, { type: 'P', color: 'W' }, { type: 'P', color: 'W' }, { type: 'P', color: 'W' }],
    [{ type: 'R', color: 'W' }, { type: 'B', color: 'W' }, { type: 'Q', color: 'W' }, { type: 'K', color: 'W' }, { type: 'R', color: 'W' }]
  ];
}

export const ChessMicroTactics = forwardRef<ChessMicroTacticsRef, ChessMicroTacticsProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [board, setBoard] = useState<(ChessPiece | null)[][]>(() => initialChessBoard());
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
  const [turn, setTurn] = useState<PieceColor>('W');
  const [commentary, setCommentary] = useState<string>('Select White piece to view tactical maneuvers.');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  const getPieceGlyph = (p: ChessPiece) => {
    const glyphs: Record<PieceColor, Record<PieceType, string>> = {
      W: { K: '♔', Q: '♕', R: '♖', B: '♗', P: '♙' },
      B: { K: '♚', Q: '♛', R: '♜', B: '♝', P: '♟' }
    };
    return glyphs[p.color][p.type];
  };

  const isLegalMove = (fromR: number, fromC: number, toR: number, toC: number, b: (ChessPiece | null)[][]): boolean => {
    const p = b[fromR][fromC];
    if (!p) return false;
    const dest = b[toR][toC];
    if (dest && dest.color === p.color) return false;

    const dr = toR - fromR;
    const dc = toC - fromC;
    const adr = Math.abs(dr);
    const adc = Math.abs(dc);

    if (p.type === 'P') {
      const forward = p.color === 'W' ? -1 : 1;
      // Normal 1-step push forward
      if (dc === 0 && dr === forward && !dest) return true;
      // Diagonal capture
      if (adc === 1 && dr === forward && dest && dest.color !== p.color) return true;
      return false;
    }
    if (p.type === 'K') {
      return adr <= 1 && adc <= 1;
    }
    if (p.type === 'R') {
      if (adr !== 0 && adc !== 0) return false;
      // Ray clear check
      const stepR = Math.sign(dr);
      const stepC = Math.sign(dc);
      let r = fromR + stepR;
      let c = fromC + stepC;
      while (r !== toR || c !== toC) {
        if (b[r][c] !== null) return false;
        r += stepR;
        c += stepC;
      }
      return true;
    }
    if (p.type === 'B') {
      if (adr !== adc) return false;
      const stepR = Math.sign(dr);
      const stepC = Math.sign(dc);
      let r = fromR + stepR;
      let c = fromC + stepC;
      while (r !== toR || c !== toC) {
        if (b[r][c] !== null) return false;
        r += stepR;
        c += stepC;
      }
      return true;
    }
    if (p.type === 'Q') {
      // Rook or Bishop movement
      if (adr === 0 || adc === 0 || adr === adc) {
        const stepR = Math.sign(dr);
        const stepC = Math.sign(dc);
        let r = fromR + stepR;
        let c = fromC + stepC;
        while (r !== toR || c !== toC) {
          if (b[r][c] !== null) return false;
          r += stepR;
          c += stepC;
        }
        return true;
      }
      return false;
    }
    return false;
  };

  const handleCellClick = useCallback((r: number, c: number) => {
    if (gameOver || turn !== 'W') return;

    if (selectedPos === null) {
      const piece = board[r][c];
      if (piece && piece.color === 'W') {
        setSelectedPos({ r, c });
        setCommentary(`Selected ${piece.type} at (${r},${c}). Tap destination.`);
      }
    } else {
      const fromR = selectedPos.r;
      const fromC = selectedPos.c;

      // Deselect or switch piece
      if (fromR === r && fromC === c) {
        setSelectedPos(null);
        return;
      }

      const targetPiece = board[r][c];
      if (targetPiece && targetPiece.color === 'W') {
        setSelectedPos({ r, c });
        return;
      }

      // Execute move if legal
      if (isLegalMove(fromR, fromC, r, c, board)) {
        const nextBoard = board.map(row => [...row]);
        const captured = nextBoard[r][c];
        nextBoard[r][c] = nextBoard[fromR][fromC];
        nextBoard[fromR][fromC] = null;

        setSelectedPos(null);
        setBoard(nextBoard);

        const ptsGained = captured ? 30 : 5;
        const newScore = score + ptsGained;
        setScore(newScore);
        if (onScoreUpdate) onScoreUpdate(newScore);

        if (captured && captured.type === 'K') {
          setGameOver(true);
          setWinner('PLAYER');
          setCommentary('CHECKMATE! Black King captured! Victory!');
          if (onGameOver) onGameOver(newScore + 200);
          return;
        }

        // AI Turn
        setTurn('B');
        setCommentary('AI calculating strategic response...');

        setTimeout(() => {
          // Find legal AI move
          const aiMoves: Array<{ fromR: number; fromC: number; toR: number; toC: number }> = [];
          for (let ar = 0; ar < SIZE; ar++) {
            for (let ac = 0; ac < SIZE; ac++) {
              const p = nextBoard[ar][ac];
              if (p && p.color === 'B') {
                for (let tr = 0; tr < SIZE; tr++) {
                  for (let tc = 0; tc < SIZE; tc++) {
                    if (isLegalMove(ar, ac, tr, tc, nextBoard)) {
                      aiMoves.push({ fromR: ar, fromC: ac, toR: tr, toC: tc });
                    }
                  }
                }
              }
            }
          }

          if (aiMoves.length > 0) {
            // Prioritize captures
            const captureMove = aiMoves.find(m => nextBoard[m.toR][m.toC] !== null);
            const chosen = captureMove || aiMoves[Math.floor(Math.random() * aiMoves.length)];

            const aiCaptured = nextBoard[chosen.toR][chosen.toC];
            nextBoard[chosen.toR][chosen.toC] = nextBoard[chosen.fromR][chosen.fromC];
            nextBoard[chosen.fromR][chosen.fromC] = null;
            setBoard([...nextBoard]);

            if (aiCaptured && aiCaptured.type === 'K') {
              setGameOver(true);
              setWinner('AI');
              setCommentary('Defeat: Your King has been captured.');
              if (onGameOver) onGameOver(newScore);
              return;
            }
            setCommentary('Your turn! Advance your tactical formation.');
          }
          setTurn('W');
        }, 500);
      } else {
        setCommentary('Illegal chess move. Choose valid target square.');
      }
    }
  }, [board, gameOver, onGameOver, onScoreUpdate, score, selectedPos, turn]);

  const restart = useCallback(() => {
    setBoard(initialChessBoard());
    setSelectedPos(null);
    setTurn('W');
    setScore(0);
    setGameOver(false);
    setWinner(null);
    setCommentary('New match initiated. White to move.');
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  return (
    <div className={styles.container} id="game-chess-micro-tactics">
      <div className={styles.scoreboard} id="chess-micro-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-chess-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>TURN</span>
          <span className={styles.value} id="score-chess-turn">{turn === 'W' ? 'WHITE (YOU)' : 'BLACK (AI)'}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>FORMAT</span>
          <span className={styles.value} id="score-chess-format">5x5 SILVERMAN</span>
        </div>
      </div>

      <div style={{
        background: '#0F172A',
        color: '#38BDF8',
        padding: '6px 12px',
        fontSize: '0.8rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }} id="chess-commentary-text">
        {commentary}
      </div>

      {/* 5x5 Chessboard */}
      <div
        id="board-chess-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          maxWidth: '300px',
          margin: '12px auto',
          border: '4px solid #334155',
          borderRadius: '6px'
        }}
      >
        {board.map((row, r) =>
          row.map((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selectedPos?.r === r && selectedPos?.c === c;

            return (
              <button
                key={`chess-${r}-${c}`}
                id={`cell-chess-${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                style={{
                  width: '58px',
                  height: '58px',
                  background: isSelected ? '#0284C7' : isDark ? '#78350F' : '#FDE68A',
                  border: isSelected ? '2px solid #00F0FF' : 'none',
                  fontSize: '2.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: piece?.color === 'W' ? '#FFFFFF' : '#1E293B',
                  textShadow: piece?.color === 'W' ? '0 1px 3px rgba(0,0,0,0.8)' : 'none'
                }}
              >
                {piece ? getPieceGlyph(piece) : ''}
              </button>
            );
          })
        )}
      </div>

      {gameOver && (
        <div className={styles.overlay} id="chess-micro-gameover">
          <h3 className={styles.overlayTitle}>
            {winner === 'PLAYER' ? 'VICTORY — CHECKMATE!' : 'CHECKMATE — GAME CONCLUDED'}
          </h3>
          <p className={styles.overlayText}>
            Match Result: {winner === 'PLAYER' ? 'White won' : 'Black won'} | Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-chess-restart"
            onClick={restart}
          >
            Play Next Mini-Chess Match
          </button>
        </div>
      )}
    </div>
  );
});

ChessMicroTactics.displayName = 'ChessMicroTactics';
