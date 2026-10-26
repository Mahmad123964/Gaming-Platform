import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface MotorcycleCircuitRef {
  restart: () => void;
  getScore: () => number;
}

interface MotorcycleCircuitProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const MotorcycleCircuit = forwardRef<MotorcycleCircuitRef, MotorcycleCircuitProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [laps, setLaps] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [turboReady, setTurboReady] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('Throttle up and lean into the high-speed corners!');
  const [score, setScore] = useState<number>(initialScore);

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const bikeRef = useRef({
    x: 180,
    leanAngle: 0, // -30 to +30 degrees
    speed: 0,
    maxSpeed: 10,
    turbo: false,
    distance: 0
  });

  const rivalsRef = useRef([
    { x: 140, y: -80, speed: 7.5, color: '#ef4444' },
    { x: 220, y: -220, speed: 8.2, color: '#3b82f6' },
    { x: 170, y: -380, speed: 7.8, color: '#10b981' }
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setLaps(0);
    setSpeed(0);
    setTurboReady(true);
    setStatus('Throttle up and lean into the high-speed corners!');
    bikeRef.current = { x: 180, leanAngle: 0, speed: 0, maxSpeed: 10, turbo: false, distance: 0 };
    rivalsRef.current = [
      { x: 140, y: -80, speed: 7.5, color: '#ef4444' },
      { x: 220, y: -220, speed: 8.2, color: '#3b82f6' },
      { x: 170, y: -380, speed: 7.8, color: '#10b981' }
    ];
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const lean = useCallback((dir: 'LEFT' | 'RIGHT') => {
    const b = bikeRef.current;
    if (dir === 'LEFT') {
      b.leanAngle = Math.max(-25, b.leanAngle - 10);
      b.x = Math.max(60, b.x - 12);
    } else {
      b.leanAngle = Math.min(25, b.leanAngle + 10);
      b.x = Math.min(300, b.x + 12);
    }
  }, []);

  const gas = useCallback(() => {
    const b = bikeRef.current;
    b.speed = Math.min(b.turbo ? 14 : b.maxSpeed, b.speed + 1.5);
    setSpeed(Math.round(b.speed * 20));
  }, []);

  const triggerTurbo = useCallback(() => {
    if (!turboReady) return;
    const b = bikeRef.current;
    b.turbo = true;
    b.speed = 14;
    setTurboReady(false);
    setStatus('🚀 NITROS TURBO ENGAGED! 280 KM/H!');

    setTimeout(() => {
      b.turbo = false;
      b.speed = b.maxSpeed;
    }, 2500);

    setTimeout(() => {
      setTurboReady(true);
    }, 8000);
  }, [turboReady]);

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    runningRef.current = true;
    let animId: number;

    const render = () => {
      if (!runningRef.current) return;
      const W = canvas.width;
      const H = canvas.height;

      // Asphalt Grand Prix Circuit
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      // Curbs (Red and white alternating rumble strips)
      const trackLeft = 40;
      const trackRight = W - 40;
      const b = bikeRef.current;
      const offset = (b.distance * 2) % 40;

      for (let y = -40; y < H + 40; y += 20) {
        const isRed = Math.floor((y + offset) / 20) % 2 === 0;
        ctx.fillStyle = isRed ? '#dc2626' : '#ffffff';
        ctx.fillRect(trackLeft - 10, y + offset, 10, 20);
        ctx.fillRect(trackRight, y + offset, 10, 20);
      }

      // Track surface
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(trackLeft, 0, trackRight - trackLeft, H);

      // Center dashed road markers
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 20]);
      ctx.lineDashOffset = -b.distance * 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Movement & score updates
      if (b.speed > 0) {
        b.distance += b.speed;
        b.leanAngle *= 0.92; // Natural return to center
        updateScore(scoreRef.current + Math.round(b.speed * 2));

        // Lap counter check (Every 2500 distance units)
        const currentLap = Math.floor(b.distance / 2500);
        if (currentLap > laps) {
          setLaps(currentLap);
          setStatus(`🏁 Lap ${currentLap} Complete! Fast sector split!`);
        }

        // Rivals update
        for (const rival of rivalsRef.current) {
          rival.y += (b.speed - rival.speed) * 1.6;

          // Near-miss slipstream drafting
          if (Math.abs(rival.x - b.x) < 18 && Math.abs(rival.y - 200) < 30) {
            b.speed = Math.min(b.maxSpeed + 1, b.speed + 0.1);
            setStatus('Drafting slipstream! Aerodynamic boost.');
          }

          // Respawn rival
          if (rival.y > H + 100) {
            rival.y = -200 - Math.random() * 250;
            rival.x = 80 + Math.random() * 200;
          }
        }
      }

      // Draw Rivals (Superbikes)
      for (const rival of rivalsRef.current) {
        ctx.fillStyle = rival.color;
        ctx.fillRect(rival.x - 4, rival.y - 14, 8, 28);
        ctx.fillStyle = '#020617';
        ctx.fillRect(rival.x - 3, rival.y - 18, 6, 8); // Front tyre
        ctx.fillRect(rival.x - 3, rival.y + 10, 6, 8);  // Rear tyre
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(rival.x, rival.y - 2, 4, 0, Math.PI * 2); // Rider helmet
        ctx.fill();
      }

      // Draw Player Superbike
      ctx.save();
      ctx.translate(b.x, 200);
      ctx.rotate((b.leanAngle * Math.PI) / 180);

      // Tyres
      ctx.fillStyle = '#020617';
      ctx.fillRect(-3, -20, 6, 10); // Front tyre
      ctx.fillRect(-3, 10, 6, 12);  // Rear tyre

      // Fairings / Chassis (Kawasaki neon green)
      ctx.fillStyle = b.turbo ? '#06b6d4' : '#22c55e';
      ctx.fillRect(-6, -14, 12, 28);

      // Windscreen
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(-4, -16, 8, 6);

      // Rider helmet
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-3, -4, 6, 2); // Visor

      // Exhaust nitro flame
      if (b.turbo) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-3, 22);
        ctx.lineTo(3, 22);
        ctx.lineTo(0, 34);
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [laps, updateScore]);

  return (
    <div className={styles.container} id="motorcycle-circuit-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Points</span>
          <span className={styles.scoreValue} id="moto-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Speed</span>
          <span className={styles.scoreValue}>{speed} KM/H</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Lap</span>
          <span className={styles.scoreValue}>{laps + 1}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Turbo</span>
          <span className={styles.scoreValue} style={{ color: turboReady ? '#22c55e' : '#64748b' }}>
            {turboReady ? 'READY' : 'CHARGING'}
          </span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="moto-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#22c55e', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-moto-left"
          onClick={() => lean('LEFT')}
        >
          ◀ Lean Left
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-moto-gas"
          onClick={gas}
        >
          ⚡ Throttle
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-moto-turbo"
          onClick={triggerTurbo}
          disabled={!turboReady}
        >
          🚀 Nitro Turbo
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-moto-right"
          onClick={() => lean('RIGHT')}
        >
          Lean Right ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-moto-restart"
          onClick={restart}
        >
          Restart Circuit Race
        </button>
      </div>
    </div>
  );
});

MotorcycleCircuit.displayName = 'MotorcycleCircuit';
