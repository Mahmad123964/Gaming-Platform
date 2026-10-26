import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './WordGrid.module.css';

export interface AnagramSolverBlitzRef {
  restart: () => void;
  getScore: () => number;
}

interface AnagramSolverBlitzProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const BASE_LETTERS = ['P', 'L', 'A', 'N', 'E', 'T'];
const VALID_WORDS = new Set([
  'PLANET', 'PLANT', 'PLATE', 'PANEL', 'LEAPT', 'PLEAT',
  'PLAN', 'LANE', 'PALE', 'LEAP', 'NEAT', 'TAPE', 'PEAL', 'PATE', 'LATE',
  'TEA', 'EAT', 'ATE', 'PAN', 'NET', 'PET', 'PEN', 'ALE', 'APE', 'TAP', 'PAT', 'TAN', 'ANT', 'LET'
]);

export const AnagramSolverBlitz = forwardRef<AnagramSolverBlitzRef, AnagramSolverBlitzProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [letters, setLetters] = useState<string[]>(BASE_LETTERS);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('Form 3+ letter words from PLANET!');
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          setGameOver(true);
          if (onGameOver) onGameOver(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, onGameOver, score]);

  const toggleLetter = useCallback((idx: number) => {
    if (gameOver) return;
    setSelectedIndices(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx);
      return [...prev, idx];
    });
  }, [gameOver]);

  const clearSelection = useCallback(() => {
    if (gameOver) return;
    setSelectedIndices([]);
  }, [gameOver]);

  const shuffleLetters = useCallback(() => {
    if (gameOver) return;
    setLetters(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
    setSelectedIndices([]);
  }, [gameOver]);

  const submitWord = useCallback(() => {
    if (gameOver) return;
    const word = selectedIndices.map(i => letters[i]).join('');

    if (word.length < 3) {
      setMessage('Words must be at least 3 letters!');
      return;
    }

    if (foundWords.includes(word)) {
      setMessage(`"${word}" already discovered!`);
      setSelectedIndices([]);
      return;
    }

    if (VALID_WORDS.has(word)) {
      const pts = word.length === 3 ? 30 : word.length === 4 ? 50 : word.length === 5 ? 80 : 150;
      const newScore = score + pts;
      setScore(newScore);
      setFoundWords(fw => [...fw, word]);
      setMessage(`VALID! Found "${word}" (+${pts} PTS)!`);
      if (onScoreUpdate) onScoreUpdate(newScore);
    } else {
      setMessage(`"${word}" is not in dictionary.`);
    }

    setSelectedIndices([]);
  }, [gameOver, selectedIndices, letters, foundWords, score, onScoreUpdate]);

  const restart = useCallback(() => {
    setScore(0);
    setTimeLeft(60);
    setLetters(BASE_LETTERS);
    setSelectedIndices([]);
    setFoundWords([]);
    setMessage('New round! Unscramble words.');
    setGameOver(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  const currentConstructedWord = selectedIndices.map(i => letters[i]).join('');

  return (
    <div className={styles.container} id="game-anagram-solver-blitz">
      <div className={styles.scoreboard} id="anagram-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-anagram-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>CLOCK</span>
          <span className={styles.value} id="score-anagram-time">{timeLeft}s</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>FOUND</span>
          <span className={styles.value} id="score-anagram-found">{foundWords.length} Words</span>
        </div>
      </div>

      <div style={{
        background: '#0F172A',
        color: '#38BDF8',
        padding: '6px 12px',
        fontSize: '0.82rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }} id="anagram-message-bar">
        {message}
      </div>

      {/* Current Word Display */}
      <div
        id="anagram-current-word"
        style={{
          fontSize: '1.8rem',
          fontWeight: 900,
          color: '#00F0FF',
          letterSpacing: '4px',
          textAlign: 'center',
          minHeight: '44px',
          margin: '12px 0 6px 0'
        }}
      >
        {currentConstructedWord || '—'}
      </div>

      {/* 6 Scrambled Letter Tiles */}
      <div
        id="anagram-letter-tiles"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          margin: '10px auto',
          maxWidth: '340px'
        }}
      >
        {letters.map((char, idx) => {
          const isSelected = selectedIndices.includes(idx);
          return (
            <button
              key={`letter-${idx}`}
              id={`btn-anagram-tile-${idx}`}
              type="button"
              onClick={() => toggleLetter(idx)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                border: isSelected ? '2px solid #00F0FF' : '1px solid #334155',
                background: isSelected ? '#0284C7' : '#1E293B',
                color: '#FFFFFF',
                fontSize: '1.4rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {char}
            </button>
          );
        })}
      </div>

      {/* Action Controls */}
      <div className={styles.mobileControls} id="anagram-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-anagram-shuffle"
          onClick={shuffleLetters}
        >
          🔀 Shuffle
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-anagram-clear"
          onClick={clearSelection}
        >
          ✕ Clear
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-anagram-submit"
          onClick={submitWord}
          style={{ background: 'linear-gradient(135deg, #00F0FF 0%, #0284C7 100%)', color: '#0F172A', fontWeight: 800 }}
        >
          ✓ Submit Word
        </button>
      </div>

      {/* Discovered Words Pill Tray */}
      <div
        id="anagram-discovered-tray"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '8px',
          maxWidth: '320px',
          margin: '8px auto',
          maxHeight: '75px',
          overflowY: 'auto'
        }}
      >
        {foundWords.map((w, idx) => (
          <span
            key={`word-${idx}`}
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38BDF8',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {gameOver && (
        <div className={styles.overlay} id="anagram-gameover">
          <h3 className={styles.overlayTitle}>TIME EXPIRED — ROUND OVER</h3>
          <p className={styles.overlayText}>
            Words Unscrambled: {foundWords.length} | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-anagram-restart"
            onClick={restart}
          >
            Play Next Anagram Round
          </button>
        </div>
      )}
    </div>
  );
});

AnagramSolverBlitz.displayName = 'AnagramSolverBlitz';
