import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface CityTrafficManagerRef {
  restart: () => void;
  getScore: () => number;
}

interface CityTrafficManagerProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const CityTrafficManager = forwardRef<CityTrafficManagerRef, CityTrafficManagerProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [nsLight, setNsLight] = useState<'GREEN' | 'RED'>('GREEN');
  const [ewLight, setEwLight] = useState<'GREEN' | 'RED'>('RED');
  const [queueCount, setQueueCount] = useState<number>(0);
  const [clearedCars, setClearedCars] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('City Traffic Control: Coordinate signals to prevent downtown gridlock!');
  const [gameState, setGameState] = useState<'MANAGING' | 'GRIDLOCK'>('MANAGING');

  const scoreRef = useRef<number>(initialScore);
  const nsLightRef = useRef<'GREEN' | 'RED'>('GREEN');
  const ewLightRef = useRef<'GREEN' | 'RED'>('RED');
  const cars = useRef<{ id: number; dir: 'N' | 'S' | 'E' | 'W'; x: number; y: number; stopped: boolean }[]>([
    { id: 1, dir: 'N', x: 215, y: 240, stopped: false },
    { id: 2, dir: 'E', x: 40, y: 115, stopped: false }
  ]);
  const animRef = useRef<number | null>(null);
  const carIdCounter = useRef<number>(3);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    nsLightRef.current = 'GREEN';
    ewLightRef.current = 'RED';
    setScore(0);
    setNsLight('GREEN');
    setEwLight('RED');
    setQueueCount(0);
    setClearedCars(0);
    setGameState('MANAGING');
    setStatusText('Traffic dispatch restarted! Keep intersection flowing.');
    cars.current = [
      { id: 1, dir: 'N', x: 215, y: 240, stopped: false },
      { id: 2, dir: 'E', x: 40, y: 115, stopped: false }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const toggleNS = () => {
    if (gameState !== 'MANAGING') return;
    const next = nsLightRef.current === 'GREEN' ? 'RED' : 'GREEN';
    nsLightRef.current = next;
    setNsLight(next);
    if (next === 'GREEN') {
      ewLightRef.current = 'RED';
      setEwLight('RED');
    }
    setStatusText(`Signal Switched: North-South is ${next}.`);
  };

  const toggleEW = () => {
    if (gameState !== 'MANAGING') return;
    const next = ewLightRef.current === 'GREEN' ? 'RED' : 'GREEN';
    ewLightRef.current = next;
    setEwLight(next);
    if (next === 'GREEN') {
      nsLightRef.current = 'RED';
      setNsLight('RED');
    }
    setStatusText(`Signal Switched: East-West is ${next}.`);
  };

  const emergencyClear = () => {
    if (gameState !== 'MANAGING') return;
    cars.current = [];
    const bonus = 100;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('🚨 POLICE SIREN ESCORT! All intersection lanes cleared (+100 PTS)!');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let spawnCounter = 0;

    const render = () => {
      if (!running) return;

      spawnCounter++;
      if (spawnCounter % 90 === 0 && cars.current.length < 12 && gameState === 'MANAGING') {
        const dirs: ('N' | 'S' | 'E' | 'W')[] = ['N', 'S', 'E', 'W'];
        const chosenDir = dirs[Math.floor(Math.random() * dirs.length)];
        let startX = 215;
        let startY = 250;
        if (chosenDir === 'S') { startX = 185; startY = 10; }
        if (chosenDir === 'E') { startX = 10; startY = 115; }
        if (chosenDir === 'W') { startX = 390; startY = 145; }

        cars.current.push({
          id: carIdCounter.current++,
          dir: chosenDir,
          x: startX,
          y: startY,
          stopped: false
        });
      }

      // Update Cars
      let waiting = 0;
      for (let i = cars.current.length - 1; i >= 0; i--) {
        const c = cars.current[i];
        let canMove = true;

        if (c.dir === 'N') {
          if (c.y > 165 && c.y < 185 && nsLightRef.current === 'RED') canMove = false;
          if (canMove) c.y -= 1.6;
        } else if (c.dir === 'S') {
          if (c.y > 80 && c.y < 95 && nsLightRef.current === 'RED') canMove = false;
          if (canMove) c.y += 1.6;
        } else if (c.dir === 'E') {
          if (c.x > 150 && c.x < 170 && ewLightRef.current === 'RED') canMove = false;
          if (canMove) c.x += 1.6;
        } else if (c.dir === 'W') {
          if (c.x > 230 && c.x < 250 && ewLightRef.current === 'RED') canMove = false;
          if (canMove) c.x -= 1.6;
        }

        c.stopped = !canMove;
        if (c.stopped) waiting++;

        // Off screen completion
        if (c.x < -20 || c.x > 420 || c.y < -20 || c.y > 280) {
          cars.current.splice(i, 1);
          setClearedCars(cl => cl + 1);
          const bonus = 25;
          const nextScore = scoreRef.current + bonus;
          updateScore(nextScore);
        }
      }

      setQueueCount(waiting);
      if (waiting >= 8 && gameState === 'MANAGING') {
        setGameState('GRIDLOCK');
        setStatusText(`💥 TOTAL GRIDLOCK! City crossroads paralyzed. Final Score: ${scoreRef.current}`);
        onGameOver?.(scoreRef.current);
      }

      // Draw City Blocks (Buildings around intersection)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // 4 City Quad Buildings (Slate roofs)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 10, 150, 80);
      ctx.fillRect(240, 10, 150, 80);
      ctx.fillRect(10, 170, 150, 80);
      ctx.fillRect(240, 170, 150, 80);

      // Roads (Asphalt Gray)
      ctx.fillStyle = '#334155';
      ctx.fillRect(160, 0, 80, 260); // N-S Road
      ctx.fillRect(0, 90, 400, 80); // E-W Road

      // Road markings (yellow center lines)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      // NS
      ctx.beginPath(); ctx.moveTo(200, 0); ctx.lineTo(200, 90); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(200, 170); ctx.lineTo(200, 260); ctx.stroke();
      // EW
      ctx.beginPath(); ctx.moveTo(0, 130); ctx.lineTo(160, 130); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(240, 130); ctx.lineTo(400, 130); ctx.stroke();
      ctx.setLineDash([]);

      // Traffic Signal Indicators
      // NS Signal at corner (245, 80)
      ctx.fillStyle = nsLightRef.current === 'GREEN' ? '#22c55e' : '#ef4444';
      ctx.beginPath(); ctx.arc(245, 80, 6, 0, Math.PI * 2); ctx.fill();
      // EW Signal at corner (155, 80)
      ctx.fillStyle = ewLightRef.current === 'GREEN' ? '#22c55e' : '#ef4444';
      ctx.beginPath(); ctx.arc(155, 80, 6, 0, Math.PI * 2); ctx.fill();

      // Draw Cars
      cars.current.forEach(c => {
        ctx.fillStyle = c.stopped ? '#f59e0b' : '#38bdf8';
        if (c.dir === 'N' || c.dir === 'S') {
          ctx.fillRect(c.x - 7, c.y - 12, 14, 24);
        } else {
          ctx.fillRect(c.x - 12, c.y - 7, 24, 14);
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gameState, onGameOver, updateScore]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Traffic Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Queue Wait</span>
          <span className={styles.scoreValue} style={{ color: queueCount >= 6 ? '#ef4444' : '#38bdf8' }}>{queueCount} / 8</span>
        </div>
        <div className={styles.scoreItem}>
          <span>NS Light</span>
          <span className={styles.scoreValue} style={{ color: nsLight === 'GREEN' ? '#22c55e' : '#ef4444' }}>{nsLight}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>EW Light</span>
          <span className={styles.scoreValue} style={{ color: ewLight === 'GREEN' ? '#22c55e' : '#ef4444' }}>{ewLight}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={260} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '24px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-traffic-toggle-ns"
          onClick={toggleNS}
          disabled={gameState !== 'MANAGING'}
        >
          🚦 Toggle N-S
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-traffic-toggle-ew"
          onClick={toggleEW}
          disabled={gameState !== 'MANAGING'}
        >
          🚦 Toggle E-W
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-traffic-emergency-clear"
          onClick={emergencyClear}
          disabled={gameState !== 'MANAGING'}
        >
          🚨 Police Clear
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-traffic-restart"
          onClick={restart}
        >
          Restart Traffic Management
        </button>
      </div>
    </div>
  );
});

CityTrafficManager.displayName = 'CityTrafficManager';
