import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface FormulaSprintRef {
  restart: () => void;
  getScore: () => number;
}

interface FormulaSprintProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const FormulaSprint = forwardRef<FormulaSprintRef, FormulaSprintProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [speed, setSpeed] = useState<number>(0);
  const [lap, setLap] = useState<number>(1);
  const [drsReady, setDrsReady] = useState<boolean>(true);
  const [gameState, setGameState] = useState<'RACING' | 'FINISHED' | 'CRASHED'>('RACING');
  const [statusText, setStatusText] = useState<string>('Grand Prix Sprint: Complete 3 fast laps! Use DRS in straights.');

  const scoreRef = useRef<number>(initialScore);
  const carRef = useRef({ x: 200, y: 220, vx: 0, speed: 0, maxSpeed: 280, progress: 0 });
  const opponentsRef = useRef([
    { x: 170, y: 80, speed: 180, color: '#f43f5e' },
    { x: 230, y: -40, speed: 210, color: '#eab308' },
    { x: 190, y: -160, speed: 195, color: '#a855f7' }
  ]);
  const animRef = useRef<number | null>(null);
  const trackOffset = useRef<number>(0);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setSpeed(0);
    setLap(1);
    setDrsReady(true);
    setGameState('RACING');
    setStatusText('Grand Prix restarted! Throttle up and overtake rival cars.');
    carRef.current = { x: 200, y: 220, vx: 0, speed: 0, maxSpeed: 280, progress: 0 };
    trackOffset.current = 0;
    opponentsRef.current = [
      { x: 170, y: 80, speed: 180, color: '#f43f5e' },
      { x: 230, y: -40, speed: 210, color: '#eab308' },
      { x: 190, y: -160, speed: 195, color: '#a855f7' }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const accelerate = () => {
    if (gameState !== 'RACING') return;
    carRef.current.speed = Math.min(carRef.current.maxSpeed, carRef.current.speed + 35);
    setSpeed(Math.round(carRef.current.speed));
  };

  const brake = () => {
    if (gameState !== 'RACING') return;
    carRef.current.speed = Math.max(0, carRef.current.speed - 45);
    setSpeed(Math.round(carRef.current.speed));
  };

  const steerLeft = () => {
    if (gameState !== 'RACING') return;
    carRef.current.x = Math.max(90, carRef.current.x - 22);
  };

  const steerRight = () => {
    if (gameState !== 'RACING') return;
    carRef.current.x = Math.min(310, carRef.current.x + 22);
  };

  const activateDRS = () => {
    if (gameState !== 'RACING' || !drsReady) return;
    setDrsReady(false);
    carRef.current.speed = Math.min(340, carRef.current.speed + 75);
    setSpeed(Math.round(carRef.current.speed));
    setStatusText('⚡ DRS ACTIVATED! Maximum aerodynamic downforce & speed boost!');
    setTimeout(() => {
      setDrsReady(true);
      setStatusText('DRS zone recharged and available.');
    }, 4000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      const c = carRef.current;
      trackOffset.current = (trackOffset.current + c.speed * 0.05) % 40;
      c.progress += c.speed * 0.01;

      // Update lap count (each lap = 1000 progress units)
      const currentLap = Math.min(3, Math.floor(c.progress / 1000) + 1);
      setLap(currentLap);

      // Score accumulation based on distance and overtakes
      const currentPoints = Math.floor(c.progress * 0.5);
      if (currentPoints > scoreRef.current) {
        updateScore(currentPoints);
      }

      if (c.progress >= 3000 && gameState === 'RACING') {
        setGameState('FINISHED');
        setStatusText(`🏁 CHECKERED FLAG! Grand Prix Victory! Final Score: ${currentPoints}`);
        onGameOver?.(currentPoints);
      }

      // Draw Circuit Track
      ctx.fillStyle = '#0f172a'; // Off-track grass/run-off
      ctx.fillRect(0, 0, 400, 280);

      // Asphalt Track
      ctx.fillStyle = '#334155';
      ctx.fillRect(80, 0, 240, 280);

      // Red/White Kerbs
      for (let y = -40; y < 320; y += 40) {
        const drawY = y + trackOffset.current;
        ctx.fillStyle = Math.floor(drawY / 40) % 2 === 0 ? '#ef4444' : '#ffffff';
        ctx.fillRect(72, drawY, 8, 20);
        ctx.fillRect(320, drawY, 8, 20);
      }

      // Center track lane dashes
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(200, 0); ctx.lineTo(200, 280);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Opponent Cars
      opponentsRef.current.forEach(opp => {
        opp.y += (c.speed - opp.speed) * 0.05;
        if (opp.y > 320) {
          opp.y = -60 - Math.random() * 80;
          opp.x = 100 + Math.random() * 180;
        }

        // Collision check
        if (Math.abs(c.x - opp.x) < 22 && Math.abs(c.y - opp.y) < 32 && gameState === 'RACING') {
          c.speed = Math.max(0, c.speed - 60);
          setStatusText('⚠️ Contact with rival car! Speed scrubbed!');
        }

        ctx.fillStyle = opp.color;
        ctx.fillRect(opp.x - 10, opp.y - 18, 20, 36);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(opp.x - 14, opp.y - 14, 4, 10); // Tires
        ctx.fillRect(opp.x + 10, opp.y - 14, 4, 10);
        ctx.fillRect(opp.x - 14, opp.y + 6, 4, 10);
        ctx.fillRect(opp.x + 10, opp.y + 6, 4, 10);
      });

      // Draw Player F1 Car (Cyan/Blue aero chassis)
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(c.x - 10, c.y - 18, 20, 36);
      // Front wing
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(c.x - 16, c.y - 20, 32, 5);
      // Rear wing
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(c.x - 14, c.y + 16, 28, 5);
      // Tires
      ctx.fillStyle = '#020617';
      ctx.fillRect(c.x - 14, c.y - 12, 4, 9);
      ctx.fillRect(c.x + 10, c.y - 12, 4, 9);
      ctx.fillRect(c.x - 14, c.y + 8, 4, 9);
      ctx.fillRect(c.x + 10, c.y + 8, 4, 9);

      // Deceleration drag
      if (c.speed > 0) {
        c.speed = Math.max(0, c.speed - 0.2);
        setSpeed(Math.round(c.speed));
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gameState]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Points</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Speed</span>
          <span className={styles.scoreValue}>{speed} KM/H</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Lap</span>
          <span className={styles.scoreValue}>{lap} / 3</span>
        </div>
        <div className={styles.scoreItem}>
          <span>DRS</span>
          <span className={styles.scoreValue}>{drsReady ? 'READY' : 'CHARGING'}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={280} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '24px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-formula-throttle"
          onClick={accelerate}
          disabled={gameState !== 'RACING'}
        >
          🚀 Throttle
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-formula-brake"
          onClick={brake}
          disabled={gameState !== 'RACING'}
        >
          🛑 Brake
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-formula-steer-left"
          onClick={steerLeft}
          disabled={gameState !== 'RACING'}
        >
          ◀ Steer L
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-formula-steer-right"
          onClick={steerRight}
          disabled={gameState !== 'RACING'}
        >
          Steer R ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-formula-drs"
          onClick={activateDRS}
          disabled={!drsReady || gameState !== 'RACING'}
        >
          ⚡ DRS Turbo
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-formula-restart"
          onClick={restart}
        >
          Restart Grand Prix
        </button>
      </div>
    </div>
  );
});

FormulaSprint.displayName = 'FormulaSprint';
