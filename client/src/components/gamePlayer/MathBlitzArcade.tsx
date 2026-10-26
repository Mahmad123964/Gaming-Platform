import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './Classic2048.module.css';

export interface MathBlitzArcadeRef {
  restart: () => void;
  getScore: () => number;
}

interface MathBlitzArcadeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface MathProblem {
  question: string;
  answer: number;
  options: number[];
}

function generateProblem(): MathProblem {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a = 0;
  let b = 0;
  let ans = 0;

  if (op === '+') {
    a = Math.floor(Math.random() * 40) + 10;
    b = Math.floor(Math.random() * 40) + 10;
    ans = a + b;
  } else if (op === '-') {
    a = Math.floor(Math.random() * 50) + 20;
    b = Math.floor(Math.random() * a) + 5;
    ans = a - b;
  } else {
    a = Math.floor(Math.random() * 12) + 2;
    b = Math.floor(Math.random() * 12) + 2;
    ans = a * b;
  }

  // 3 unique distractors
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1) * (op === '×' ? 2 : 1);
    const fake = ans + delta;
    if (fake !== ans && fake >= 0) distractors.add(fake);
  }

  const allOpts = Array.from(distractors).concat([ans]);
  // Shuffle options
  for (let i = allOpts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOpts[i], allOpts[j]] = [allOpts[j], allOpts[i]];
  }

  return {
    question: `${a} ${op} ${b} = ?`,
    answer: ans,
    options: allOpts
  };
}

export const MathBlitzArcade = forwardRef<MathBlitzArcadeRef, MathBlitzArcadeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [streak, setStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [problem, setProblem] = useState<MathProblem>(() => generateProblem());
  const [feedback, setFeedback] = useState<string>('Select the correct calculation to build your streak multiplier!');
  const [gameOver, setGameOver] = useState<boolean>(false);

  useEffect(() => {
    if (gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          setGameOver(true);
          if (onGameOver) onGameOver(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver, onGameOver, score]);

  const handleSelectOption = useCallback((opt: number) => {
    if (gameOver) return;

    if (opt === problem.answer) {
      const newStreak = streak + 1;
      const mult = Math.min(4, Math.floor(newStreak / 3) + 1);
      const pts = 25 * mult;
      const newScore = score + pts;

      setScore(newScore);
      setStreak(newStreak);
      setTimeLeft(t => Math.min(60, t + 2)); // +2s time bonus
      setFeedback(`CORRECT! +${pts} PTS (${mult}x Multiplier)!`);
      if (onScoreUpdate) onScoreUpdate(newScore);
    } else {
      setStreak(0);
      setTimeLeft(t => Math.max(0, t - 4)); // -4s penalty
      setFeedback(`INCORRECT! Answer was ${problem.answer}. Streak reset.`);
    }

    setProblem(generateProblem());
  }, [gameOver, onScoreUpdate, problem.answer, score, streak]);

  const restart = useCallback(() => {
    setScore(0);
    setStreak(0);
    setTimeLeft(45);
    setProblem(generateProblem());
    setFeedback('New arithmetic sprint started!');
    setGameOver(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  const mult = Math.min(4, Math.floor(streak / 3) + 1);

  return (
    <div className={styles.container} id="game-math-blitz-arcade">
      <div className={styles.scoreboard} id="math-blitz-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-math-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>CLOCK</span>
          <span className={styles.value} id="score-math-time">{timeLeft}s</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>STREAK</span>
          <span className={styles.value} id="score-math-streak">{streak} 🔥 ({mult}x)</span>
        </div>
      </div>

      <div style={{
        background: '#0F172A',
        color: '#38BDF8',
        padding: '6px 12px',
        fontSize: '0.82rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }} id="math-feedback-bar">
        {feedback}
      </div>

      {/* Math Problem Billboard */}
      <div
        id="math-problem-display"
        style={{
          fontSize: '2.4rem',
          fontWeight: 900,
          color: '#F8FAFC',
          textAlign: 'center',
          margin: '20px 0 16px 0',
          letterSpacing: '2px',
          textShadow: '0 0 12px rgba(0, 240, 255, 0.5)'
        }}
      >
        {problem.question}
      </div>

      {/* 4 Answer Choice Buttons */}
      <div
        id="math-answer-buttons"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          maxWidth: '300px',
          margin: '12px auto'
        }}
      >
        {problem.options.map((opt, idx) => (
          <button
            key={`opt-${idx}`}
            id={`btn-math-ans-${idx}`}
            type="button"
            onClick={() => handleSelectOption(opt)}
            style={{
              padding: '16px 0',
              borderRadius: '8px',
              border: '2px solid #38BDF8',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#00F0FF',
              fontSize: '1.4rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              transition: 'transform 0.1s ease'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {gameOver && (
        <div className={styles.overlay} id="math-blitz-gameover">
          <h3 className={styles.overlayTitle}>TIME EXPIRED — SPRINT OVER</h3>
          <p className={styles.overlayText}>
            Max Streak: {streak} | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-math-blitz-restart"
            onClick={restart}
          >
            Play Next Math Blitz
          </button>
        </div>
      )}
    </div>
  );
});

MathBlitzArcade.displayName = 'MathBlitzArcade';
