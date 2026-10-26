import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './WhackAMole.module.css';

export interface WhackAMoleRef {
  restart: () => void;
  getScore: () => number;
}

interface WhackAMoleProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const WhackAMole = forwardRef<WhackAMoleRef, WhackAMoleProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [whackedMole, setWhackedMole] = useState<number | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);
  const timerRef = useRef<any>(null);
  const moleTimerRef = useRef<any>(null);

  const spawnMole = useCallback(() => {
    if (!runningRef.current) return;
    const randomHole = Math.floor(Math.random() * 9);
    setActiveMole(randomHole);
    setWhackedMole(null);

    // Visible interval before mole goes back down
    const stayDuration = Math.max(550, 900 - (30 - timeLeft) * 12);
    moleTimerRef.current = setTimeout(() => {
      setActiveMole(null);
      // Brief pause before next pop
      if (runningRef.current) {
        moleTimerRef.current = setTimeout(spawnMole, 250);
      }
    }, stayDuration);
  }, [timeLeft]);

  const restart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current);

    scoreRef.current = 0;
    runningRef.current = true;
    setActiveMole(null);
    setWhackedMole(null);
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    onScoreUpdate?.(0);
    onRestart?.();

    // Start 30s countdown
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          runningRef.current = false;
          setActiveMole(null);
          setGameOver(true);
          onGameOver?.(scoreRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    spawnMole();
  }, [onScoreUpdate, onRestart, onGameOver, spawnMole]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  useEffect(() => {
    restart();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
    };
  }, []); // Run once on mount

  const handleHoleClick = (idx: number) => {
    if (!runningRef.current || gameOver) return;
    if (activeMole === idx && whackedMole !== idx) {
      setWhackedMole(idx);
      const newScore = score + 15;
      scoreRef.current = newScore;
      setScore(newScore);
      onScoreUpdate?.(newScore);

      // Fast retreat upon successful hit
      setTimeout(() => {
        setActiveMole(null);
        if (runningRef.current) spawnMole();
      }, 150);
    }
  };

  return (
    <div className={styles.container} id="game-whack-a-mole">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>WHACK-A-MOLE</h3>
          <span>Reflex Hammer Field</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>TIME</span>
            <span className={styles.statValue} id="val-mole-time" style={{ color: timeLeft < 6 ? '#EF4444' : '#00F0FF' }}>
              {timeLeft}s
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-mole-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.gridArea} id="grid-mole-burrows">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(idx => (
          <button
            key={idx}
            className={styles.hole}
            onClick={() => handleHoleClick(idx)}
            id={`hole-mole-${idx}`}
            aria-label={`Burrow ${idx}`}
          >
            {activeMole === idx && (
              <span className={`${styles.mole} ${whackedMole === idx ? styles.moleWhacked : ''}`}>
                {whackedMole === idx ? '💥' : '🐹'}
              </span>
            )}
          </button>
        ))}
      </div>

      {gameOver && (
        <div style={{ marginTop: '10px', color: '#10B981', fontWeight: 800, textAlign: 'center' }} id="mole-gameover-banner">
          ⏱️ TIME UP! FINAL SCORE: {score} POINTS!
        </div>
      )}

      <div className={styles.footer}>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Tap burrow as soon as the mole pops up
        </div>
        <button
          className={styles.restartButton}
          onClick={restart}
          id="btn-mole-restart"
        >
          {gameOver ? 'Play Again' : 'Reset Timer'}
        </button>
      </div>
    </div>
  );
});

WhackAMole.displayName = 'WhackAMole';
