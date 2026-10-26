import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface TacticalGridBattleRef {
  restart: () => void;
  getScore: () => number;
}

interface TacticalGridBattleProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Unit {
  id: string;
  name: string;
  team: 'PLAYER' | 'ENEMY';
  r: number;
  c: number;
  hp: number;
  maxHp: number;
  atk: number;
  range: number;
  color: string;
  alive: boolean;
}

const INITIAL_UNITS: Unit[] = [
  { id: 'p1', name: 'Commander', team: 'PLAYER', r: 4, c: 1, hp: 50, maxHp: 50, atk: 20, range: 2, color: '#38bdf8', alive: true },
  { id: 'p2', name: 'Sniper', team: 'PLAYER', r: 5, c: 2, hp: 30, maxHp: 30, atk: 35, range: 4, color: '#06b6d4', alive: true },
  { id: 'p3', name: 'Mech Tank', team: 'PLAYER', r: 5, c: 0, hp: 80, maxHp: 80, atk: 25, range: 1, color: '#0284c7', alive: true },
  { id: 'e1', name: 'Enforcer', team: 'ENEMY', r: 0, c: 3, hp: 50, maxHp: 50, atk: 18, range: 2, color: '#ef4444', alive: true },
  { id: 'e2', name: 'Drone', team: 'ENEMY', r: 1, c: 4, hp: 35, maxHp: 35, atk: 22, range: 3, color: '#f87171', alive: true },
  { id: 'e3', name: 'Heavy Bot', team: 'ENEMY', r: 0, c: 5, hp: 75, maxHp: 75, atk: 25, range: 1, color: '#dc2626', alive: true }
];

export const TacticalGridBattle = forwardRef<TacticalGridBattleRef, TacticalGridBattleProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('p1');
  const [score, setScore] = useState<number>(initialScore);
  const [turn, setTurn] = useState<number>(1);
  const [ap, setAp] = useState<number>(3); // Action points per turn
  const [status, setStatus] = useState<string>('Select unit, move into tactical cover, and fire on enemy squad!');

  const scoreRef = useRef<number>(initialScore);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setTurn(1);
    setAp(3);
    setSelectedUnitId('p1');
    setStatus('Select unit, move into tactical cover, and fire on enemy squad!');
    setUnits(INITIAL_UNITS.map(u => ({ ...u, hp: u.maxHp, alive: true })));
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const selectUnit = useCallback((id: string) => {
    setSelectedUnitId(id);
    const u = units.find(item => item.id === id);
    if (u) {
      setStatus(`Selected ${u.name} (HP: ${u.hp}/${u.maxHp}, Range: ${u.range}, ATK: ${u.atk})`);
    }
  }, [units]);

  const moveUnit = useCallback((dr: number, dc: number) => {
    if (ap <= 0) {
      setStatus('No Action Points remaining! Tap End Turn.');
      return;
    }
    setUnits(prev => {
      const active = prev.find(u => u.id === selectedUnitId && u.team === 'PLAYER' && u.alive);
      if (!active) return prev;

      const targetR = Math.max(0, Math.min(5, active.r + dr));
      const targetC = Math.max(0, Math.min(5, active.c + dc));

      // Check tile occupancy
      const occupied = prev.some(u => u.alive && u.r === targetR && u.c === targetC);
      if (occupied) {
        setStatus('Tile occupied by another combatant!');
        return prev;
      }

      setAp(a => a - 1);
      setStatus(`${active.name} repositioned to tactical sector [${targetR}, ${targetC}].`);
      return prev.map(u => u.id === active.id ? { ...u, r: targetR, c: targetC } : u);
    });
  }, [ap, selectedUnitId]);

  const attackEnemy = useCallback(() => {
    if (ap <= 0) {
      setStatus('No Action Points remaining! Tap End Turn.');
      return;
    }

    setUnits(prev => {
      const active = prev.find(u => u.id === selectedUnitId && u.team === 'PLAYER' && u.alive);
      if (!active) return prev;

      // Find enemies in range
      const validTargets = prev.filter(u => {
        if (!u.alive || u.team !== 'ENEMY') return false;
        const dist = Math.abs(u.r - active.r) + Math.abs(u.c - active.c);
        return dist <= active.range;
      });

      if (validTargets.length === 0) {
        setStatus(`No enemies within ${active.name}'s range (${active.range} tiles)! Move closer.`);
        return prev;
      }

      // Attack closest target
      const target = validTargets[0];
      const damage = active.atk;
      const targetNewHp = Math.max(0, target.hp - damage);
      setAp(a => a - 1);

      let nextScore = scoreRef.current + 25;
      if (targetNewHp <= 0) {
        nextScore += 100;
        setStatus(`🎯 CRITICAL HIT! ${active.name} neutralized ${target.name}! +125 PTS`);
      } else {
        setStatus(`💥 Hit ${target.name} for ${damage} DMG! (HP: ${targetNewHp}/${target.maxHp})`);
      }
      updateScore(nextScore);

      const nextUnits = prev.map(u => {
        if (u.id === target.id) {
          return { ...u, hp: targetNewHp, alive: targetNewHp > 0 };
        }
        return u;
      });

      const enemiesLeft = nextUnits.filter(u => u.team === 'ENEMY' && u.alive).length;
      if (enemiesLeft === 0) {
        setStatus('🏆 SQUAD VICTORY! Enemy battle group completely eliminated!');
      }

      return nextUnits;
    });
  }, [ap, selectedUnitId, updateScore]);

  const endTurn = useCallback(() => {
    setAp(3);
    setTurn(t => t + 1);
    setStatus(`Turn ${turn + 1}: Action Points recharged! AI retaliating...`);

    // Simple AI retaliation
    setUnits(prev => {
      const enemies = prev.filter(u => u.team === 'ENEMY' && u.alive);
      const players = prev.filter(u => u.team === 'PLAYER' && u.alive);
      if (enemies.length === 0 || players.length === 0) return prev;

      // Enemy attacks random player
      const attacker = enemies[0];
      const victim = players[Math.floor(Math.random() * players.length)];
      const victimNewHp = Math.max(0, victim.hp - 15);

      return prev.map(u => {
        if (u.id === victim.id) {
          return { ...u, hp: victimNewHp, alive: victimNewHp > 0 };
        }
        return u;
      });
    });
  }, [turn]);

  const activeUnit = units.find(u => u.id === selectedUnitId);

  return (
    <div className={styles.container} id="tactical-grid-battle-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Tactical Score</span>
          <span className={styles.scoreValue} id="tactical-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Turn</span>
          <span className={styles.scoreValue}>{turn}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Action Points</span>
          <span className={styles.scoreValue} style={{ color: ap > 0 ? '#38bdf8' : '#ef4444' }}>
            {ap} / 3 AP
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 44px)',
          gridTemplateRows: 'repeat(6, 44px)',
          gap: '4px',
          background: '#090d16',
          padding: '10px',
          borderRadius: '10px',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          margin: '8px 0'
        }}
        id="tactical-board"
      >
        {Array.from({ length: 36 }).map((_, idx) => {
          const r = Math.floor(idx / 6);
          const c = idx % 6;
          const unit = units.find(u => u.alive && u.r === r && u.c === c);
          const isSelected = unit && unit.id === selectedUnitId;

          return (
            <div
              key={idx}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '6px',
                background: unit ? (unit.team === 'PLAYER' ? '#0369a1' : '#b91c1c') : '#1e293b',
                border: isSelected ? '2px solid #facc15' : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: unit ? 'pointer' : 'default',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
                boxShadow: isSelected ? '0 0 10px #facc15' : 'none'
              }}
              id={unit ? `btn-tactical-unit-${unit.id}` : undefined}
              onClick={unit ? () => selectUnit(unit.id) : undefined}
            >
              {unit && (
                <>
                  <span>{unit.name.slice(0, 3)}</span>
                  <span style={{ fontSize: '8px', color: '#facc15' }}>{unit.hp}HP</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tactical-up"
          onClick={() => moveUnit(-1, 0)}
          disabled={ap <= 0}
        >
          ▲ Move North
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tactical-down"
          onClick={() => moveUnit(1, 0)}
          disabled={ap <= 0}
        >
          ▼ Move South
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tactical-left"
          onClick={() => moveUnit(0, -1)}
          disabled={ap <= 0}
        >
          ◀ Move West
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tactical-right"
          onClick={() => moveUnit(0, 1)}
          disabled={ap <= 0}
        >
          Move East ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-tactical-attack"
          onClick={attackEnemy}
          disabled={ap <= 0}
        >
          🎯 Target Attack
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-tactical-end-turn"
          onClick={endTurn}
        >
          ⏭️ End Turn
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-tactical-restart"
          onClick={restart}
        >
          Restart Tactical Battle
        </button>
      </div>
    </div>
  );
});

TacticalGridBattle.displayName = 'TacticalGridBattle';
