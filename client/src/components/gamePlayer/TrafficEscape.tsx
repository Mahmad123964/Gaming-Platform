import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface TrafficEscapeRef {
  restart: () => void;
  getScore: () => number;
}

interface TrafficEscapeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Car {
  id: number;
  r: number;
  c: number;
  dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  color: string;
  type: string;
  escaped: boolean;
}

const INITIAL_LEVEL_CARS: Car[] = [
  { id: 0, r: 0, c: 2, dir: 'UP', color: '#ef4444', type: 'Sedan', escaped: false },
  { id: 1, r: 1, c: 1, dir: 'LEFT', color: '#3b82f6', type: 'Coupe', escaped: false },
  { id: 2, r: 1, c: 3, dir: 'RIGHT', color: '#10b981', type: 'Taxi', escaped: false },
  { id: 3, r: 2, c: 0, dir: 'LEFT', color: '#f59e0b', type: 'Van', escaped: false },
  { id: 4, r: 2, c: 2, dir: 'DOWN', color: '#8b5cf6', type: 'Truck', escaped: false },
  { id: 5, r: 3, c: 2, dir: 'DOWN', color: '#ec4899', type: 'Hatch', escaped: false },
  { id: 6, r: 3, c: 4, dir: 'RIGHT', color: '#06b6d4', type: 'Sports', escaped: false },
  { id: 7, r: 4, c: 1, dir: 'DOWN', color: '#84cc16', type: 'SUV', escaped: false }
];

export const TrafficEscape = forwardRef<TrafficEscapeRef, TrafficEscapeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [cars, setCars] = useState<Car[]>(INITIAL_LEVEL_CARS);
  const [score, setScore] = useState<number>(initialScore);
  const [level, setLevel] = useState<number>(1);
  const [status, setStatus] = useState<string>('Tap a car whose exit route is unobstructed!');

  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    setScore(0);
    setLevel(1);
    setStatus('Tap a car whose exit route is unobstructed!');
    setCars(INITIAL_LEVEL_CARS.map(c => ({ ...c, escaped: false })));
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  const escapeCar = useCallback((carId: number) => {
    setCars(prevCars => {
      const target = prevCars.find(c => c.id === carId);
      if (!target || target.escaped) return prevCars;

      // Check if forward path is clear of any other unescaped cars
      let blocked = false;
      for (const other of prevCars) {
        if (other.id === target.id || other.escaped) continue;

        if (target.dir === 'UP' && other.c === target.c && other.r < target.r) {
          blocked = true;
          break;
        }
        if (target.dir === 'DOWN' && other.c === target.c && other.r > target.r) {
          blocked = true;
          break;
        }
        if (target.dir === 'LEFT' && other.r === target.r && other.c < target.c) {
          blocked = true;
          break;
        }
        if (target.dir === 'RIGHT' && other.r === target.r && other.c > target.c) {
          blocked = true;
          break;
        }
      }

      if (blocked) {
        setStatus(`Honk! ${target.type} path is blocked by another vehicle!`);
        return prevCars;
      }

      // Successful escape!
      const nextCars = prevCars.map(c => c.id === carId ? { ...c, escaped: true } : c);
      const remaining = nextCars.filter(c => !c.escaped).length;
      const pointsEarned = 100;
      updateScore(score + pointsEarned);

      if (remaining === 0) {
        setStatus('🎉 INTERSECTION CLEARED! Perfect traffic routing!');
        setTimeout(() => {
          setLevel(l => l + 1);
          setCars(INITIAL_LEVEL_CARS.map(c => ({ ...c, escaped: false })));
          setStatus('Next level congested gridlock loaded!');
        }, 1200);
      } else {
        setStatus(`Vroom! ${target.type} escaped cleanly! ${remaining} vehicles remaining.`);
      }

      return nextCars;
    });
  }, [score, updateScore]);

  const escapedCount = cars.filter(c => c.escaped).length;

  return (
    <div className={styles.container} id="traffic-escape-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Score</span>
          <span className={styles.scoreValue} id="traffic-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Level</span>
          <span className={styles.scoreValue}>{level}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Cleared</span>
          <span className={styles.scoreValue}>{escapedCount} / {cars.length}</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 52px)',
          gridTemplateRows: 'repeat(5, 52px)',
          gap: '6px',
          background: '#1e293b',
          padding: '12px',
          borderRadius: '10px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          margin: '8px 0'
        }}
        id="traffic-grid"
      >
        {Array.from({ length: 25 }).map((_, idx) => {
          const r = Math.floor(idx / 5);
          const c = idx % 5;
          const car = cars.find(carItem => carItem.r === r && carItem.c === c && !carItem.escaped);

          const dirArrows = {
            UP: '▲',
            DOWN: '▼',
            LEFT: '◀',
            RIGHT: '▶'
          };

          return (
            <div
              key={idx}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '6px',
                background: car ? car.color : '#0f172a',
                border: car ? '2px solid #ffffff' : '1px dashed rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: car ? 'pointer' : 'default',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '12px',
                boxShadow: car ? '0 4px 10px rgba(0,0,0,0.4)' : 'none',
                transition: 'all 0.2s ease'
              }}
              id={car ? `btn-traffic-car-${car.id}` : undefined}
              onClick={car ? () => escapeCar(car.id) : undefined}
            >
              {car && (
                <>
                  <span style={{ fontSize: '16px' }}>{dirArrows[car.dir]}</span>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase' }}>{car.type}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-traffic-restart"
          onClick={restart}
        >
          Reset Intersection
        </button>
      </div>
    </div>
  );
});

TrafficEscape.displayName = 'TrafficEscape';
