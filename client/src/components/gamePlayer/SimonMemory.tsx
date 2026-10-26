import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './SimonMemory.module.css';

export interface SimonMemoryRef {
  restart: () => void;
  getScore: () => number;
}

interface SimonMemoryProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type ColorId = 0 | 1 | 2 | 3; // 0: Green, 1: Red, 2: Yellow, 3: Blue
const FREQUENCIES = [329.63, 261.63, 220.0, 164.81]; // E4, C4, A3, E3

export const SimonMemory = forwardRef<SimonMemoryRef, SimonMemoryProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [sequence, setSequence] = useState<ColorId[]>([]);
  const [playerIdx, setPlayerIdx] = useState<number>(0);
  const [isPlayingSeq, setIsPlayingSeq] = useState<boolean>(false);
  const [activeLit, setActiveLit] = useState<ColorId | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [round, setRound] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((freq: number, duration = 0.25) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + duration);
    } catch (_) {}
  }, []);

  const playSequence = useCallback((seq: ColorId[]) => {
    setIsPlayingSeq(true);
    let step = 0;

    const interval = setInterval(() => {
      if (step >= seq.length) {
        clearInterval(interval);
        setActiveLit(null);
        setIsPlayingSeq(false);
        setPlayerIdx(0);
        return;
      }

      const color = seq[step];
      setActiveLit(color);
      playBeep(FREQUENCIES[color], 0.3);

      setTimeout(() => {
        setActiveLit(null);
      }, 350);

      step++;
    }, 600);
  }, [playBeep]);

  const startNewRound = useCallback((currentSeq: ColorId[]) => {
    const nextColor = Math.floor(Math.random() * 4) as ColorId;
    const newSeq = [...currentSeq, nextColor];
    setSequence(newSeq);
    setRound(newSeq.length);
    setTimeout(() => {
      playSequence(newSeq);
    }, 700);
  }, [playSequence]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setRound(1);
    setGameOver(false);
    onScoreUpdate?.(0);
    onRestart?.();
    startNewRound([]);
  }, [onScoreUpdate, onRestart, startNewRound]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  useEffect(() => {
    restart();
  }, []);

  const handlePadClick = (color: ColorId) => {
    if (isPlayingSeq || gameOver) return;

    setActiveLit(color);
    playBeep(FREQUENCIES[color], 0.2);
    setTimeout(() => setActiveLit(null), 200);

    if (sequence[playerIdx] === color) {
      // Correct input in sequence!
      const nextIdx = playerIdx + 1;
      setPlayerIdx(nextIdx);

      if (nextIdx === sequence.length) {
        // Round successfully reproduced!
        const newScore = score + sequence.length * 20;
        scoreRef.current = newScore;
        setScore(newScore);
        onScoreUpdate?.(newScore);
        startNewRound(sequence);
      }
    } else {
      // Wrong input -> Game Over!
      playBeep(110, 0.6); // Low buzz
      setGameOver(true);
      onGameOver?.(scoreRef.current);
    }
  };

  return (
    <div className={styles.container} id="game-simon-memory">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>SIMON MEMORY</h3>
          <span>Audio-Visual Reflex Pattern</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>ROUND</span>
            <span className={styles.statValue} id="val-simon-round">{round}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-simon-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.simonPad} id="pad-simon-container">
        {/* Quadrant 0: Green */}
        <button
          className={`${styles.quadrant} ${styles.quadGreen} ${activeLit === 0 ? styles.quadLit : ''}`}
          onClick={() => handlePadClick(0)}
          disabled={isPlayingSeq || gameOver}
          id="btn-simon-0"
          aria-label="Green Pad"
        />

        {/* Quadrant 1: Red */}
        <button
          className={`${styles.quadrant} ${styles.quadRed} ${activeLit === 1 ? styles.quadLit : ''}`}
          onClick={() => handlePadClick(1)}
          disabled={isPlayingSeq || gameOver}
          id="btn-simon-1"
          aria-label="Red Pad"
        />

        {/* Quadrant 2: Yellow */}
        <button
          className={`${styles.quadrant} ${styles.quadYellow} ${activeLit === 2 ? styles.quadLit : ''}`}
          onClick={() => handlePadClick(2)}
          disabled={isPlayingSeq || gameOver}
          id="btn-simon-2"
          aria-label="Yellow Pad"
        />

        {/* Quadrant 3: Blue */}
        <button
          className={`${styles.quadrant} ${styles.quadBlue} ${activeLit === 3 ? styles.quadLit : ''}`}
          onClick={() => handlePadClick(3)}
          disabled={isPlayingSeq || gameOver}
          id="btn-simon-3"
          aria-label="Blue Pad"
        />

        <div className={styles.centerHub}>
          <span>{isPlayingSeq ? 'LISTEN' : gameOver ? 'FAILED' : 'REPEAT'}</span>
        </div>
      </div>

      {gameOver && (
        <div style={{ marginTop: '10px', color: '#EF4444', fontWeight: 800, textAlign: 'center' }} id="simon-gameover-banner">
          ❌ SEQUENCE BROKEN! FINAL SCORE: {score} PTS
        </div>
      )}

      <div className={styles.footer}>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Watch & listen to pattern, then repeat sequence
        </div>
        <button
          className={styles.restartButton}
          onClick={restart}
          id="btn-simon-restart"
        >
          New Pattern
        </button>
      </div>
    </div>
  );
});

SimonMemory.displayName = 'SimonMemory';
