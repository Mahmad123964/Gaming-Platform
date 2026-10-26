import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TowerDefenseLite.module.css';

export interface HexConquestRef {
  restart: () => void;
  getScore: () => number;
}

interface HexConquestProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Territory {
  id: number;
  name: string;
  owner: 'PLAYER' | 'AI';
  armies: number;
  adjacent: number[];
}

const INITIAL_TERRITORIES: Territory[] = [
  { id: 0, name: 'North Spire', owner: 'PLAYER', armies: 4, adjacent: [1, 2] },
  { id: 1, name: 'West Valley', owner: 'PLAYER', armies: 3, adjacent: [0, 2, 3] },
  { id: 2, name: 'Central Citadel', owner: 'AI', armies: 3, adjacent: [0, 1, 4, 5] },
  { id: 3, name: 'South Harbor', owner: 'PLAYER', armies: 3, adjacent: [1, 4] },
  { id: 4, name: 'East Badlands', owner: 'AI', armies: 4, adjacent: [2, 3, 6] },
  { id: 5, name: 'Frost Peak', owner: 'AI', armies: 3, adjacent: [2, 6] },
  { id: 6, name: 'Iron Fortress', owner: 'AI', armies: 5, adjacent: [4, 5] }
];

export const HexConquest = forwardRef<HexConquestRef, HexConquestProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [territories, setTerritories] = useState<Territory[]>(INITIAL_TERRITORIES);
  const [selectedHex, setSelectedHex] = useState<number | null>(null);
  const [log, setLog] = useState<string>('Select your territory (Cyan), then tap an adjacent enemy hex (Red) to invade!');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  const handleHexClick = useCallback((id: number) => {
    if (gameOver) return;

    const clicked = territories.find(t => t.id === id);
    if (!clicked) return;

    if (selectedHex === null) {
      if (clicked.owner === 'PLAYER') {
        setSelectedHex(id);
        setLog(`Commanding ${clicked.name} (${clicked.armies} armies). Tap adjacent target to attack.`);
      }
    } else {
      if (selectedHex === id) {
        setSelectedHex(null);
        return;
      }

      const source = territories.find(t => t.id === selectedHex);
      if (!source) return;

      if (clicked.owner === 'PLAYER') {
        // Switch selection to another player territory
        setSelectedHex(id);
        setLog(`Switched focus to ${clicked.name}.`);
        return;
      }

      // Check adjacency
      if (!source.adjacent.includes(id)) {
        setLog('Target territory is not adjacent! Choose direct neighbor.');
        return;
      }

      if (source.armies <= 1) {
        setLog('Need at least 2 armies to launch an invasion.');
        return;
      }

      // Attack roll
      const attackRoll = Math.floor(Math.random() * 6) + 1 + (source.armies > 3 ? 2 : 0);
      const defenseRoll = Math.floor(Math.random() * 6) + 1;

      setTerritories(prev => {
        const next = prev.map(t => ({ ...t }));
        const src = next.find(t => t.id === selectedHex)!;
        const dest = next.find(t => t.id === id)!;

        if (attackRoll > defenseRoll) {
          // Victory in territory!
          dest.owner = 'PLAYER';
          dest.armies = src.armies - 1;
          src.armies = 1;

          const ptsGained = 60;
          const newScore = score + ptsGained;
          setScore(newScore);
          setLog(`CONQUEST! Captured ${dest.name}! (Roll: ${attackRoll} vs ${defenseRoll})`);
          if (onScoreUpdate) onScoreUpdate(newScore);

          // Check if all territories conquered
          const allOwned = next.every(t => t.owner === 'PLAYER');
          if (allOwned) {
            setGameOver(true);
            setVictory(true);
            setLog('MAP DOMINATION! All enemy strongholds seized!');
            if (onGameOver) onGameOver(newScore + 200);
          }
        } else {
          // Attack repelled
          src.armies = Math.max(1, src.armies - 2);
          setLog(`Invasion repelled at ${dest.name}! Lost 2 armies. (Roll: ${attackRoll} vs ${defenseRoll})`);
        }

        setSelectedHex(null);
        return next;
      });
    }
  }, [gameOver, onGameOver, onScoreUpdate, score, selectedHex, territories]);

  const endTurn = useCallback(() => {
    if (gameOver) return;

    // AI Counter-attack
    setTerritories(prev => {
      const next = prev.map(t => ({ ...t }));
      const aiTerritories = next.filter(t => t.owner === 'AI' && t.armies > 1);

      if (aiTerritories.length > 0) {
        const attacker = aiTerritories[Math.floor(Math.random() * aiTerritories.length)];
        const playerTargets = attacker.adjacent
          .map(adjId => next.find(t => t.id === adjId)!)
          .filter(t => t.owner === 'PLAYER');

        if (playerTargets.length > 0) {
          const target = playerTargets[0];
          if (attacker.armies > target.armies) {
            target.owner = 'AI';
            target.armies = attacker.armies - 1;
            attacker.armies = 1;
            setLog(`Enemy AI counter-attacked and captured ${target.name}!`);
          }
        }
      }

      // Reinforce player territories (+1 each)
      for (const t of next) {
        if (t.owner === 'PLAYER' && t.armies < 8) t.armies += 1;
      }

      return next;
    });
  }, [gameOver]);

  const restart = useCallback(() => {
    setTerritories(INITIAL_TERRITORIES);
    setSelectedHex(null);
    setScore(0);
    setGameOver(false);
    setVictory(false);
    setLog('New tactical campaign. Seize the citadel.');
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  const playerCount = territories.filter(t => t.owner === 'PLAYER').length;

  return (
    <div className={styles.container} id="game-hex-conquest">
      <div className={styles.scoreboard} id="hex-conquest-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-hex-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>TERRITORIES</span>
          <span className={styles.value} id="score-hex-owned">{playerCount} / 7</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>TARGET</span>
          <span className={styles.value} id="score-hex-target">{selectedHex !== null ? `Hex ${selectedHex}` : 'NONE'}</span>
        </div>
      </div>

      <div style={{
        background: '#0F172A',
        color: '#38BDF8',
        padding: '6px 12px',
        fontSize: '0.8rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }} id="hex-log-text">
        {log}
      </div>

      {/* Hexagonal Territory Map Layout */}
      <div
        id="grid-hex-territories"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          maxWidth: '320px',
          margin: '14px auto',
          padding: '12px',
          background: '#0B132B',
          borderRadius: '8px'
        }}
      >
        {territories.map(t => {
          const isPlayer = t.owner === 'PLAYER';
          const isSelected = selectedHex === t.id;

          return (
            <button
              key={`hex-${t.id}`}
              id={`btn-hex-territory-${t.id}`}
              type="button"
              onClick={() => handleHexClick(t.id)}
              style={{
                height: '75px',
                borderRadius: '8px',
                border: isSelected ? '3px solid #00F0FF' : isPlayer ? '2px solid #0284C7' : '2px solid #DC2626',
                background: isPlayer ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                boxShadow: isSelected ? '0 0 14px rgba(0, 240, 255, 0.8)' : 'none'
              }}
            >
              <strong>{t.name}</strong>
              <span style={{ fontSize: '1rem', fontWeight: 900 }}>⚔️ {t.armies}</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{t.owner}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Controls */}
      <div className={styles.mobileControls} id="hex-conquest-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-hex-end-turn"
          onClick={endTurn}
          disabled={gameOver}
        >
          🛡️ End Turn & Fortify Armies (+1 per region)
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="hex-conquest-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'REALM UNIFIED — DOMINATION!' : 'CAMPAIGN CONCLUDED'}
          </h3>
          <p className={styles.overlayText}>
            Territories Captured: {playerCount}/7 | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-hex-restart"
            onClick={restart}
          >
            Launch Next Campaign
          </button>
        </div>
      )}
    </div>
  );
});

HexConquest.displayName = 'HexConquest';
