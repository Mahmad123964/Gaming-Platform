import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface FourPlayerPartyChallengeRef {
  restart: () => void;
  getScore: () => number;
}

interface FourPlayerPartyChallengeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Player {
  id: number;
  name: string;
  pos: number;
  stars: number;
  coins: number;
  color: string;
  isHuman: boolean;
}

const BOARD_SPACES = [
  { id: 0, type: 'START', label: 'GO' },
  { id: 1, type: 'BLUE', label: '+3C' },
  { id: 2, type: 'RED', label: '-3C' },
  { id: 3, type: 'STAR', label: '⭐' },
  { id: 4, type: 'BLUE', label: '+3C' },
  { id: 5, type: 'EVENT', label: '❓' },
  { id: 6, type: 'BLUE', label: '+3C' },
  { id: 7, type: 'RED', label: '-3C' },
  { id: 8, type: 'STAR', label: '⭐' },
  { id: 9, type: 'BLUE', label: '+3C' },
  { id: 10, type: 'EVENT', label: '❓' },
  { id: 11, type: 'RED', label: '-3C' },
  { id: 12, type: 'STAR', label: '⭐' },
  { id: 13, type: 'BLUE', label: '+3C' },
  { id: 14, type: 'EVENT', label: '❓' },
  { id: 15, type: 'BLUE', label: '+3C' }
];

export const FourPlayerPartyChallenge = forwardRef<FourPlayerPartyChallengeRef, FourPlayerPartyChallengeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'You (P1)', pos: 0, stars: 0, coins: 10, color: '#06b6d4', isHuman: true },
    { id: 1, name: 'NovaBot', pos: 0, stars: 0, coins: 10, color: '#ef4444', isHuman: false },
    { id: 2, name: 'CyberBot', pos: 0, stars: 0, coins: 10, color: '#f59e0b', isHuman: false },
    { id: 3, name: 'PixelBot', pos: 0, stars: 0, coins: 10, color: '#10b981', isHuman: false }
  ]);

  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);
  const [lastRoll, setLastRoll] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [score, setScore] = useState<number>(initialScore);
  const [status, setStatus] = useState<string>('Your turn! Roll the dice to advance around the party board.');

  const scoreRef = useRef<number>(initialScore);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setActivePlayerIdx(0);
    setLastRoll(0);
    setRound(1);
    setStatus('Your turn! Roll the dice to advance around the party board.');
    setPlayers([
      { id: 0, name: 'You (P1)', pos: 0, stars: 0, coins: 10, color: '#06b6d4', isHuman: true },
      { id: 1, name: 'NovaBot', pos: 0, stars: 0, coins: 10, color: '#ef4444', isHuman: false },
      { id: 2, name: 'CyberBot', pos: 0, stars: 0, coins: 10, color: '#f59e0b', isHuman: false },
      { id: 3, name: 'PixelBot', pos: 0, stars: 0, coins: 10, color: '#10b981', isHuman: false }
    ]);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const rollDice = useCallback(() => {
    const roll = Math.floor(Math.random() * 6) + 1;
    setLastRoll(roll);

    setPlayers(prev => {
      const p = prev[activePlayerIdx];
      const newPos = (p.pos + roll) % BOARD_SPACES.length;
      const space = BOARD_SPACES[newPos];

      let newStars = p.stars;
      let newCoins = p.coins;

      if (space.type === 'STAR') {
        if (newCoins >= 10) {
          newCoins -= 10;
          newStars += 1;
          setStatus(`⭐ ${p.name} traded 10 Coins for a STAR!`);
        } else {
          setStatus(`${p.name} landed on Star Space but needs 10 coins!`);
        }
      } else if (space.type === 'BLUE') {
        newCoins += 3;
        setStatus(`🪙 ${p.name} landed on Blue Space (+3 Coins).`);
      } else if (space.type === 'RED') {
        newCoins = Math.max(0, newCoins - 3);
        setStatus(`💥 ${p.name} landed on Red Space (-3 Coins).`);
      } else {
        // EVENT
        newCoins += 5;
        setStatus(`🎁 ${p.name} triggered Mystery Bonus (+5 Coins)!`);
      }

      // If human player, update score
      if (p.isHuman) {
        const calculatedScore = newStars * 100 + newCoins * 10;
        updateScore(calculatedScore);
      }

      const updated = prev.map((item, idx) => idx === activePlayerIdx ? {
        ...item,
        pos: newPos,
        stars: newStars,
        coins: newCoins
      } : item);

      return updated;
    });

    // Advance turn to next player
    setTimeout(() => {
      setActivePlayerIdx(curr => {
        const next = (curr + 1) % 4;
        if (next === 0) setRound(r => r + 1);
        if (next !== 0) {
          // AI turn auto-executes quickly
          setTimeout(() => rollDice(), 600);
        }
        return next;
      });
    }, 800);
  }, [activePlayerIdx, updateScore]);

  const human = players[0];

  return (
    <div className={styles.container} id="four-player-party-challenge-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Party Score</span>
          <span className={styles.scoreValue} id="party-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Stars</span>
          <span className={styles.scoreValue} style={{ color: '#facc15' }}>⭐ {human.stars}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Coins</span>
          <span className={styles.scoreValue} style={{ color: '#38bdf8' }}>🪙 {human.coins}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Turn</span>
          <span className={styles.scoreValue}>{players[activePlayerIdx].name}</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 68px)',
          gridTemplateRows: 'repeat(4, 68px)',
          gap: '8px',
          background: '#090d16',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(250, 204, 21, 0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          margin: '8px 0'
        }}
        id="party-board"
      >
        {BOARD_SPACES.map((space, idx) => {
          const herePlayers = players.filter(p => p.pos === idx);
          const bgMap: Record<string, string> = {
            START: '#10b981',
            BLUE: '#0284c7',
            RED: '#dc2626',
            STAR: '#d97706',
            EVENT: '#8b5cf6'
          };

          return (
            <div
              key={idx}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '8px',
                background: bgMap[space.type] || '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 'bold',
                position: 'relative'
              }}
              id={`space-party-${idx}`}
            >
              <span>{space.label}</span>
              <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                {herePlayers.map(p => (
                  <div
                    key={p.id}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: p.color,
                      border: '1px solid #ffffff'
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#facc15', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-party-roll-dice"
          onClick={rollDice}
          disabled={activePlayerIdx !== 0}
        >
          🎲 Roll Dice ({lastRoll > 0 ? `Rolled ${lastRoll}` : '1-6'})
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-party-restart"
          onClick={restart}
        >
          New Party Challenge
        </button>
      </div>
    </div>
  );
});

FourPlayerPartyChallenge.displayName = 'FourPlayerPartyChallenge';
