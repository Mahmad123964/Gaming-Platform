import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface ChessTacticalAcademyRef {
  restart: () => void;
  getScore: () => number;
}

interface ChessTacticalAcademyProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Puzzle {
  id: number;
  title: string;
  theme: string;
  fenDesc: string;
  options: { label: string; move: string; isCorrect: boolean; feedback: string }[];
  hint: string;
}

const PUZZLES: Puzzle[] = [
  {
    id: 1,
    title: 'Puzzle 1: Back-Rank Deliverance',
    theme: 'Back-Rank Checkmate',
    fenDesc: 'White Rook on d1, Black King castled on g8 trapped behind h7-g7-f7 pawns.',
    options: [
      { label: 'A', move: '1. Rd8# (Back-Rank Mate)', isCorrect: true, feedback: 'BRILLIANT! 1. Rd8# delivers instant checkmate! Black king cannot escape.' },
      { label: 'B', move: '1. h4 (Quiet Pawn Push)', isCorrect: false, feedback: 'Inaccurate. 1. h4 allows Black to create an escape square (luft) with ...h6.' },
      { label: 'C', move: '1. Re1 (Lateral Shift)', isCorrect: false, feedback: 'Passivity. 1. Re1 misses the decisive tactical blow on d8.' }
    ],
    hint: 'Look for the vulnerable back rank! Black king has no luft (breathing room).'
  },
  {
    id: 2,
    title: 'Puzzle 2: The Royal Equine Fork',
    theme: 'Knight Fork',
    fenDesc: 'White Knight on d5, Black King on e8, Black Rook on a8.',
    options: [
      { label: 'A', move: '1. Nc7+ (King & Rook Fork)', isCorrect: true, feedback: 'TACTICAL MASTERSTROKE! 1. Nc7+ checks the King and attacks the corner Rook simultaneously!' },
      { label: 'B', move: '1. Nf6+ (Defended Check)', isCorrect: false, feedback: 'Blunder. 1. Nf6+ allows 1...gxf6 capturing your knight.' },
      { label: 'C', move: '1. Ne3 (Retreat)', isCorrect: false, feedback: 'Misses the winning tactical opportunity on c7.' }
    ],
    hint: 'Which square attacks the Black King with check while simultaneously threatening the unprotected a8 Rook?'
  },
  {
    id: 3,
    title: 'Puzzle 3: The Grandmaster Skewer',
    theme: 'Queen Diagonal Skewer',
    fenDesc: 'White Bishop on d4, Black King on g7, Black Queen on h8 on the long diagonal.',
    options: [
      { label: 'A', move: '1. Be5+ (Long Diagonal Skewer)', isCorrect: true, feedback: 'EXCELLENT TACTIC! 1. Be5+ forces the Black King to move, winning the Black Queen on h8!' },
      { label: 'B', move: '1. Bc3 (Defensive Slide)', isCorrect: false, feedback: 'Too slow. Black moves their Queen to safety.' },
      { label: 'C', move: '1. Bxg7 (Even Trade)', isCorrect: false, feedback: 'Trading even material without winning the Black Queen.' }
    ],
    hint: 'Attack the high-value piece in front, forcing it to reveal the target behind it along the diagonal!'
  }
];

export const ChessTacticalAcademy = forwardRef<ChessTacticalAcademyRef, ChessTacticalAcademyProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [puzzleIdx, setPuzzleIdx] = useState<number>(0);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Chess Academy: Find the best tactical move for White!');
  const [gameState, setGameState] = useState<'SOLVING' | 'COMPLETED'>('SOLVING');

  const scoreRef = useRef<number>(initialScore);
  const currentPuzzle = PUZZLES[puzzleIdx] || PUZZLES[0];

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setPuzzleIdx(0);
    setSolvedCount(0);
    setGameState('SOLVING');
    setStatusText('Tactical Academy restarted! Select the strongest continuation.');
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const selectMove = (choiceIdx: number) => {
    if (gameState !== 'SOLVING') return;
    const choice = currentPuzzle.options[choiceIdx];
    if (choice.isCorrect) {
      const bonus = 150;
      const nextScore = scoreRef.current + bonus;
      updateScore(nextScore);
      setSolvedCount(s => s + 1);
      setStatusText(choice.feedback);

      setTimeout(() => {
        if (puzzleIdx + 1 < PUZZLES.length) {
          setPuzzleIdx(idx => idx + 1);
          setStatusText(`Next Problem: ${PUZZLES[puzzleIdx + 1].title}`);
        } else {
          setGameState('COMPLETED');
          setStatusText(`🏆 GRANDMASTER DIPLOMA! All tactical puzzles solved perfectly! Score: ${nextScore}`);
          onGameOver?.(nextScore);
        }
      }, 1400);
    } else {
      setStatusText(`❌ ${choice.feedback} Try another move!`);
    }
  };

  const showHint = () => {
    if (gameState !== 'SOLVING') return;
    setStatusText(`💡 HINT: ${currentPuzzle.hint}`);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw 8x8 Chess Board (Wood grain tones)
    const tileSize = 30;
    const offsetX = 80;
    const offsetY = 10;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isDark = (r + c) % 2 === 1;
        ctx.fillStyle = isDark ? '#b45309' : '#fef3c7';
        ctx.fillRect(offsetX + c * tileSize, offsetY + r * tileSize, tileSize, tileSize);
      }
    }

    // Outer board border
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, 8 * tileSize, 8 * tileSize);

    // Draw Pieces for Current Puzzle
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (puzzleIdx === 0) {
      // Puzzle 1: White Rook d1, Black King g8, Black Pawns f7, g7, h7
      ctx.fillStyle = '#ffffff';
      ctx.fillText('♖', offsetX + 3 * tileSize + 15, offsetY + 7 * tileSize + 15); // Rd1
      ctx.fillStyle = '#000000';
      ctx.fillText('♚', offsetX + 6 * tileSize + 15, offsetY + 0 * tileSize + 15); // Kg8
      ctx.fillText('♟', offsetX + 5 * tileSize + 15, offsetY + 1 * tileSize + 15); // f7
      ctx.fillText('♟', offsetX + 6 * tileSize + 15, offsetY + 1 * tileSize + 15); // g7
      ctx.fillText('♟', offsetX + 7 * tileSize + 15, offsetY + 1 * tileSize + 15); // h7
    } else if (puzzleIdx === 1) {
      // Puzzle 2: White Knight d5, Black King e8, Black Rook a8
      ctx.fillStyle = '#ffffff';
      ctx.fillText('♘', offsetX + 3 * tileSize + 15, offsetY + 3 * tileSize + 15); // Nd5
      ctx.fillStyle = '#000000';
      ctx.fillText('♚', offsetX + 4 * tileSize + 15, offsetY + 0 * tileSize + 15); // Ke8
      ctx.fillText('♜', offsetX + 0 * tileSize + 15, offsetY + 0 * tileSize + 15); // Ra8
    } else {
      // Puzzle 3: White Bishop d4, Black King g7, Black Queen h8
      ctx.fillStyle = '#ffffff';
      ctx.fillText('♗', offsetX + 3 * tileSize + 15, offsetY + 4 * tileSize + 15); // Bd4
      ctx.fillStyle = '#000000';
      ctx.fillText('♚', offsetX + 6 * tileSize + 15, offsetY + 1 * tileSize + 15); // Kg7
      ctx.fillText('♛', offsetX + 7 * tileSize + 15, offsetY + 0 * tileSize + 15); // Qh8
    }
  }, [puzzleIdx]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Tactics Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Problem</span>
          <span className={styles.scoreValue}>{puzzleIdx + 1} / {PUZZLES.length}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Theme</span>
          <span className={styles.scoreValue}>{currentPuzzle.theme}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Solved</span>
          <span className={styles.scoreValue}>{solvedCount} Correct</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={260} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '36px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-chess-tactic-move-a"
          onClick={() => selectMove(0)}
          disabled={gameState !== 'SOLVING'}
        >
          {currentPuzzle.options[0].move}
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-chess-tactic-move-b"
          onClick={() => selectMove(1)}
          disabled={gameState !== 'SOLVING'}
        >
          {currentPuzzle.options[1].move}
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-chess-tactic-move-c"
          onClick={() => selectMove(2)}
          disabled={gameState !== 'SOLVING'}
        >
          {currentPuzzle.options[2].move}
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-chess-tactic-hint"
          onClick={showHint}
          disabled={gameState !== 'SOLVING'}
        >
          💡 Academy Hint
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-chess-tactic-restart"
          onClick={restart}
        >
          Restart Academy Course
        </button>
      </div>
    </div>
  );
});

ChessTacticalAcademy.displayName = 'ChessTacticalAcademy';
