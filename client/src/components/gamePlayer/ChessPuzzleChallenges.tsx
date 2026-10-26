import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface ChessPuzzleChallengesRef {
  restart: () => void;
  getScore: () => number;
}

interface ChessPuzzleChallengesProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

// 8x8 board representation
type Piece = { type: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'; color: 'w' | 'b' } | null;

interface Puzzle {
  id: number;
  title: string;
  theme: string;
  fenDesc: string;
  solutionMove: { from: [number, number]; to: [number, number] };
  board: Piece[][];
}

const PUZZLE_1_BOARD: Piece[][] = [
  // 0: 8th rank
  [null, null, null, { type: 'R', color: 'b' }, { type: 'K', color: 'b' }, null, null, { type: 'R', color: 'b' }],
  [{ type: 'P', color: 'b' }, { type: 'P', color: 'b' }, { type: 'P', color: 'b' }, null, null, { type: 'P', color: 'b' }, { type: 'P', color: 'b' }, { type: 'P', color: 'b' }],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [{ type: 'P', color: 'w' }, { type: 'P', color: 'w' }, { type: 'P', color: 'w' }, null, null, { type: 'P', color: 'w' }, { type: 'P', color: 'w' }, { type: 'P', color: 'w' }],
  [null, null, null, { type: 'R', color: 'w' }, { type: 'K', color: 'w' }, null, null, null]
];

export const ChessPuzzleChallenges = forwardRef<ChessPuzzleChallengesRef, ChessPuzzleChallengesProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [puzzleIdx, setPuzzleIdx] = useState<number>(0);
  const [board, setBoard] = useState<Piece[][]>(() => PUZZLE_1_BOARD.map(row => [...row]));
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [solved, setSolved] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Puzzle 1: White to move! Deliver back-rank checkmate.');

  const scoreRef = React.useRef<number>(initialScore);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setPuzzleIdx(0);
    setSelectedSquare(null);
    setSolved(false);
    setStatus('Puzzle 1: White to move! Deliver back-rank checkmate.');
    setBoard(PUZZLE_1_BOARD.map(row => [...row]));
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const handleSquareClick = useCallback((r: number, c: number) => {
    if (solved) return;

    if (!selectedSquare) {
      const piece = board[r][c];
      if (piece && piece.color === 'w') {
        setSelectedSquare([r, c]);
        setStatus(`Selected White ${piece.type} at [${r}, ${c}]. Select target destination.`);
      }
      return;
    }

    const [fromR, fromC] = selectedSquare;
    const piece = board[fromR][fromC];

    // Check solution move: White Rook moves from [7, 3] to [0, 3] (Rd8#)
    if (fromR === 7 && fromC === 3 && r === 0 && c === 3) {
      // Execute winning checkmate!
      const nextBoard = board.map(row => [...row]);
      nextBoard[0][3] = piece;
      nextBoard[7][3] = null;
      setBoard(nextBoard);
      setSelectedSquare(null);
      setSolved(true);
      updateScore(scoreRef.current + 200);
      setStatus('🏆 CHECKMATE! Rook slashes to d8 delivering back-rank mate! +200 PTS');
    } else {
      setSelectedSquare(null);
      setStatus('Not the winning tactical solution! Try another move.');
    }
  }, [board, selectedSquare, solved, updateScore]);

  const pieceSymbols: Record<string, string> = {
    Kw: '♔', Qw: '♕', Rw: '♖', Bw: '♗', Nw: '♘', Pw: '♙',
    Kb: '♚', Qb: '♛', Rb: '♜', Bb: '♝', Nb: '♞', Pb: '♟'
  };

  return (
    <div className={styles.container} id="chess-puzzle-challenges-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Tactics Score</span>
          <span className={styles.scoreValue} id="cpuzz-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Puzzle</span>
          <span className={styles.scoreValue}>1 / 3</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Status</span>
          <span className={styles.scoreValue} style={{ color: solved ? '#10b981' : '#f59e0b' }}>
            {solved ? 'SOLVED' : 'ACTIVE'}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 34px)',
          gridTemplateRows: 'repeat(8, 34px)',
          gap: '1px',
          background: '#090d16',
          padding: '6px',
          borderRadius: '8px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          margin: '6px 0'
        }}
        id="chess-puzzle-board"
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isLight = (r + c) % 2 === 0;
            const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: '34px',
                  height: '34px',
                  background: isSelected ? '#facc15' : isLight ? '#f1f5f9' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: cell && cell.color === 'w' ? '#0284c7' : '#0f172a',
                  userSelect: 'none'
                }}
                id={`cell-cpuzz-${r}-${c}`}
                onClick={() => handleSquareClick(r, c)}
              >
                {cell && pieceSymbols[`${cell.type}${cell.color}`]}
              </div>
            );
          })
        )}
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-cpuzz-hint"
          onClick={() => setStatus('Hint: The Black King has no flight square due to pawns in front of it!')}
        >
          💡 Tactical Hint
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-cpuzz-restart"
          onClick={restart}
        >
          Reset Chess Puzzle
        </button>
      </div>
    </div>
  );
});

ChessPuzzleChallenges.displayName = 'ChessPuzzleChallenges';
