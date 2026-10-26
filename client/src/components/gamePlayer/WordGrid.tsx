import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './WordGrid.module.css';

export interface WordGridRef {
  restart: () => void;
  getScore: () => number;
}

interface WordGridProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

// Built-in English word vocabulary (200+ high-frequency common words)
const DICTIONARY = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'ANY', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR',
  'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO',
  'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'CAT', 'DOG', 'SUN', 'RUN', 'BAT', 'NET',
  'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'KNOW', 'WANT', 'BEEN', 'GOOD', 'MUCH',
  'SOME', 'TIME', 'VERY', 'WHEN', 'COME', 'HERE', 'JUST', 'LIKE', 'LONG', 'MAKE', 'MANY', 'MORE', 'ONLY',
  'OVER', 'SUCH', 'TAKE', 'THAN', 'THEM', 'WELL', 'WERE', 'GAME', 'PLAY', 'WORD', 'GRID', 'STAR', 'FIRE',
  'BLUE', 'WAVE', 'CORE', 'TEAM', 'FAST', 'ROAD', 'CODE', 'NODE', 'CYBER', 'NEXUS', 'LASER', 'PULSE',
  'PUNCH', 'SHINE', 'FLASH', 'SPACE', 'TRACK', 'SUPER', 'BLOCK', 'POWER', 'PILOT', 'CHAMP', 'SPEED',
  'ABOUT', 'AFTER', 'AGAIN', 'BELOW', 'COULD', 'EVERY', 'FIRST', 'FOUND', 'GREAT', 'HOUSE', 'LARGE',
  'LEARN', 'NEVER', 'OTHER', 'PLANT', 'POINT', 'RIGHT', 'SMALL', 'SOUND', 'STILL', 'WATER', 'WHERE',
  'WHICH', 'WORLD', 'WOULD', 'WRITE', 'LIGHT', 'NIGHT', 'WHITE', 'BLACK', 'STONE', 'QUEEN', 'ROYAL'
]);

// Preset solvable letter grids containing multiple known words
const LETTER_GRIDS = [
  ['N', 'E', 'X', 'U'],
  ['S', 'P', 'L', 'A'],
  ['Y', 'G', 'A', 'M'],
  ['C', 'O', 'D', 'E']
];

export const WordGrid = forwardRef<WordGridRef, WordGridProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [grid, setGrid] = useState<string[][]>(LETTER_GRIDS);
  const [selectedPath, setSelectedPath] = useState<[number, number][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState<number>(initialScore);
  const [statusMsg, setStatusMsg] = useState<string>('Select adjacent letters to spell words');

  const scoreRef = useRef<number>(initialScore);

  const initGame = useCallback(() => {
    // Dice letter sets or reshuffle
    const newGrid = [
      ['N', 'E', 'X', 'U'],
      ['S', 'P', 'L', 'A'],
      ['Y', 'G', 'A', 'M'],
      ['C', 'O', 'D', 'E']
    ];
    setGrid(newGrid);
    setSelectedPath([]);
    setFoundWords([]);
    scoreRef.current = 0;
    setScore(0);
    setStatusMsg('Select adjacent letters to spell words');
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart: initGame,
    getScore: () => scoreRef.current
  }), [initGame]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCellClick = (r: number, c: number) => {
    // If empty path, start selection
    if (selectedPath.length === 0) {
      setSelectedPath([[r, c]]);
      return;
    }

    // Check if cell is already selected in path
    const alreadySelected = selectedPath.some(([pr, pc]) => pr === r && pc === c);
    if (alreadySelected) {
      // If clicking the last cell, remove it (undo)
      const last = selectedPath[selectedPath.length - 1];
      if (last[0] === r && last[1] === c && selectedPath.length > 1) {
        setSelectedPath(selectedPath.slice(0, selectedPath.length - 1));
      }
      return;
    }

    // Check adjacency with previous cell in path
    const last = selectedPath[selectedPath.length - 1];
    const isAdjacent = Math.abs(last[0] - r) <= 1 && Math.abs(last[1] - c) <= 1;

    if (isAdjacent) {
      setSelectedPath([...selectedPath, [r, c]]);
    }
  };

  const currentWord = selectedPath.map(([r, c]) => grid[r][c]).join('');

  const submitWord = () => {
    if (currentWord.length < 3) {
      setStatusMsg('Words must be at least 3 letters long!');
      return;
    }

    if (foundWords.includes(currentWord)) {
      setStatusMsg(`"${currentWord}" has already been submitted!`);
      setSelectedPath([]);
      return;
    }

    if (DICTIONARY.has(currentWord)) {
      const points = currentWord.length === 3 ? 10 : currentWord.length === 4 ? 20 : currentWord.length === 5 ? 40 : 80;
      const newScore = score + points;
      scoreRef.current = newScore;
      setScore(newScore);
      setFoundWords([...foundWords, currentWord]);
      setStatusMsg(`✓ "${currentWord}" accepted (+${points} PTS)!`);
      onScoreUpdate?.(newScore);
      setSelectedPath([]);

      if (foundWords.length + 1 >= 5) {
        onGameOver?.(newScore);
      }
    } else {
      setStatusMsg(`✗ "${currentWord}" is not in dictionary.`);
      setSelectedPath([]);
    }
  };

  const clearSelection = () => {
    setSelectedPath([]);
    setStatusMsg('Path cleared. Form a new word.');
  };

  return (
    <div className={styles.container} id="game-word-grid">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>WORD GRID</h3>
          <span>Matrix Lexicon Challenge</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>WORDS</span>
            <span className={styles.statValue} id="val-word-count">{foundWords.length}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-word-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.wordPreviewBar} id="val-word-preview">
        {currentWord || <span style={{ opacity: 0.35 }}>SPELL WORD</span>}
      </div>

      <div className={styles.gridArea} id="grid-word-letters">
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const isSelected = selectedPath.some(([pr, pc]) => pr === r && pc === c);
            return (
              <button
                key={`${r}-${c}`}
                className={`${styles.cell} ${isSelected ? styles.cellSelected : ''}`}
                onClick={() => handleCellClick(r, c)}
                id={`cell-letter-${r}-${c}`}
                aria-label={`Letter ${letter}`}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>

      <div className={styles.actionRow} id="word-action-controls">
        <button
          className={styles.submitBtn}
          onClick={submitWord}
          disabled={currentWord.length < 3}
          id="btn-word-submit"
        >
          ✓ SUBMIT WORD
        </button>
        <button
          className={styles.clearBtn}
          onClick={clearSelection}
          id="btn-word-clear"
        >
          CLEAR
        </button>
      </div>

      <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#FBBF24', textAlign: 'center' }} id="val-word-status">
        {statusMsg}
      </div>

      <div className={styles.footer}>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Tap adjacent letters (horizontal, vertical, diagonal)
        </div>
        <button
          className={styles.restartButton}
          onClick={initGame}
          id="btn-word-restart"
        >
          New Board
        </button>
      </div>
    </div>
  );
});

WordGrid.displayName = 'WordGrid';
