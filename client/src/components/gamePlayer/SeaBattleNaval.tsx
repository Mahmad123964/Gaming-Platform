import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './MinesweeperRetro.module.css';

export interface SeaBattleNavalRef {
  restart: () => void;
  getScore: () => number;
}

interface SeaBattleNavalProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const SIZE = 6;

interface Ship {
  name: string;
  coords: Array<{ r: number; c: number }>;
  hits: number;
}

function generateFleet(): Ship[] {
  return [
    { name: 'Carrier', coords: [{ r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }], hits: 0 },
    { name: 'Cruiser', coords: [{ r: 3, c: 4 }, { r: 4, c: 4 }], hits: 0 },
    { name: 'Patrol', coords: [{ r: 4, c: 1 }], hits: 0 }
  ];
}

export const SeaBattleNaval = forwardRef<SeaBattleNavalRef, SeaBattleNavalProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [shots, setShots] = useState<number>(18);
  const [fleet, setFleet] = useState<Ship[]>(() => generateFleet());
  const [firedGrid, setFiredGrid] = useState<Array<Array<'EMPTY' | 'HIT' | 'MISS'>>>(() =>
    Array.from({ length: SIZE }, () => Array(SIZE).fill('EMPTY'))
  );
  const [log, setLog] = useState<string>('Select ocean coordinates to launch missile salvo.');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  const fireCoordinate = useCallback((r: number, c: number) => {
    if (gameOver || shots <= 0) return;
    if (firedGrid[r][c] !== 'EMPTY') return;

    const nextFired = firedGrid.map(row => [...row]);
    let hitFound = false;

    // Check hit on fleet
    const nextFleet = fleet.map(ship => {
      const match = ship.coords.find(pt => pt.r === r && pt.c === c);
      if (match) {
        hitFound = true;
        const newHits = ship.hits + 1;
        if (newHits === ship.coords.length) {
          setLog(`TARGET DESTROYED! Sunk the enemy ${ship.name}!`);
        } else {
          setLog(`DIRECT HIT! Struck enemy ${ship.name}!`);
        }
        return { ...ship, hits: newHits };
      }
      return ship;
    });

    nextFired[r][c] = hitFound ? 'HIT' : 'MISS';
    if (!hitFound) setLog(`Splash! Water salvo at (${r + 1}, ${c + 1}) was a miss.`);

    setFiredGrid(nextFired);
    setFleet(nextFleet);

    const nextShots = shots - 1;
    setShots(nextShots);

    const ptsGained = hitFound ? 50 : 0;
    const newScore = score + ptsGained;
    setScore(newScore);
    if (onScoreUpdate) onScoreUpdate(newScore);

    // Check all ships sunk
    const allSunk = nextFleet.every(s => s.hits === s.coords.length);
    if (allSunk) {
      setGameOver(true);
      setVictory(true);
      const winScore = newScore + nextShots * 20;
      setScore(winScore);
      setLog('NAVAL FLEET ELIMINATED! Full tactical victory!');
      if (onScoreUpdate) onScoreUpdate(winScore);
      if (onGameOver) onGameOver(winScore);
    } else if (nextShots <= 0) {
      setGameOver(true);
      setLog('Ammo depleted! Strategic retreat.');
      if (onGameOver) onGameOver(newScore);
    }
  }, [firedGrid, fleet, gameOver, onGameOver, onScoreUpdate, score, shots]);

  const restart = useCallback(() => {
    setFleet(generateFleet());
    setFiredGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill('EMPTY')));
    setShots(18);
    setScore(0);
    setGameOver(false);
    setVictory(false);
    setLog('New naval sector charted. Launch missile salvo.');
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  const sunkCount = fleet.filter(s => s.hits === s.coords.length).length;

  return (
    <div className={styles.container} id="game-sea-battle-naval">
      <div className={styles.scoreboard} id="sea-battle-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-naval-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>AMMO</span>
          <span className={styles.value} id="score-naval-ammo">{shots} Salvos</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SUNK</span>
          <span className={styles.value} id="score-naval-sunk">{sunkCount} / 3 Ships</span>
        </div>
      </div>

      <div style={{
        background: '#0F172A',
        color: '#38BDF8',
        padding: '6px 12px',
        fontSize: '0.8rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }} id="naval-log-text">
        {log}
      </div>

      {/* 6x6 Ocean Grid */}
      <div
        id="grid-naval-ocean"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gap: '4px',
          maxWidth: '300px',
          margin: '12px auto',
          padding: '12px',
          background: '#041E42', // Deep Navy Blue
          borderRadius: '8px'
        }}
      >
        {firedGrid.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`naval-${r}-${c}`}
              id={`cell-naval-${r}-${c}`}
              type="button"
              onClick={() => fireCoordinate(r, c)}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '4px',
                border: '1px solid #1E3A8A',
                background: cell === 'HIT' ? '#EF4444' : cell === 'MISS' ? '#64748B' : '#0F2A59',
                color: '#FFFFFF',
                fontSize: '1.1rem',
                fontWeight: 900,
                cursor: cell === 'EMPTY' ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {cell === 'HIT' ? '💥' : cell === 'MISS' ? '•' : ''}
            </button>
          ))
        )}
      </div>

      {gameOver && (
        <div className={styles.overlay} id="sea-battle-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'FLEET DESTROYED — VICTORY!' : 'SALVO AMMO EXHAUSTED'}
          </h3>
          <p className={styles.overlayText}>
            Enemy Ships Sunk: {sunkCount}/3 | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-sea-battle-restart"
            onClick={restart}
          >
            Deploy Next Battle Fleet
          </button>
        </div>
      )}
    </div>
  );
});

SeaBattleNaval.displayName = 'SeaBattleNaval';
