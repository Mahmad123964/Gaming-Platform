import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface OffRoadRallyRef {
  restart: () => void;
  getScore: () => number;
}

interface OffRoadRallyProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const OffRoadRally = forwardRef<OffRoadRallyRef, OffRoadRallyProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [distance, setDistance] = useState<number>(initialScore);
  const [speed, setSpeed] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [checkpoints, setCheckpoints] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Accelerate and navigate the muddy turns!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const carRef = useRef({
    x: 180,
    speed: 0,
    maxSpeed: 8,
    accel: 0.15,
    friction: 0.05,
    steerSpeed: 3.5,
    mudFactor: 1.0
  });

  const trackRef = useRef<{ y: number; curve: number; obstacles: { x: number; y: number; type: 'MUD' | 'ROCK' }[] }>({
    y: 0,
    curve: 0,
    obstacles: [
      { x: 120, y: -100, type: 'MUD' },
      { x: 240, y: -250, type: 'ROCK' },
      { x: 160, y: -400, type: 'MUD' },
      { x: 200, y: -550, type: 'ROCK' }
    ]
  });

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setDistance(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setDistance(0);
    setSpeed(0);
    setTimeLeft(30);
    setCheckpoints(0);
    setGameOver(false);
    setStatus('Accelerate and navigate the muddy turns!');
    carRef.current = { x: 180, speed: 0, maxSpeed: 8, accel: 0.15, friction: 0.05, steerSpeed: 3.5, mudFactor: 1.0 };
    trackRef.current = {
      y: 0,
      curve: 0,
      obstacles: [
        { x: 120, y: -100, type: 'MUD' },
        { x: 240, y: -250, type: 'ROCK' },
        { x: 160, y: -400, type: 'MUD' },
        { x: 200, y: -550, type: 'ROCK' }
      ]
    };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const steer = useCallback((dir: 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    const c = carRef.current;
    if (dir === 'LEFT') {
      c.x = Math.max(70, c.x - c.steerSpeed * 4);
    } else {
      c.x = Math.min(290, c.x + c.steerSpeed * 4);
    }
  }, [gameOver]);

  const gas = useCallback(() => {
    if (gameOver) return;
    const c = carRef.current;
    c.speed = Math.min(c.maxSpeed, c.speed + 1.2);
    setSpeed(Math.round(c.speed * 15));
  }, [gameOver]);

  const brake = useCallback(() => {
    if (gameOver) return;
    const c = carRef.current;
    c.speed = Math.max(0, c.speed - 2.0);
    setSpeed(Math.round(c.speed * 15));
  }, [gameOver]);

  // Game timer countdown
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameOver(true);
          setStatus('Time expired! Checkpoint rally ended.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver]);

  // Main canvas animation
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

      // Off-road dirt terrain background
      ctx.fillStyle = '#78350f'; // Reddish dirt
      ctx.fillRect(0, 0, W, H);

      // Dirt track road
      const trackLeft = 50;
      const trackWidth = 260;
      ctx.fillStyle = '#92400e';
      ctx.fillRect(trackLeft, 0, trackWidth, H);

      // Track boundary tyre barriers
      ctx.fillStyle = '#1e293b';
      for (let y = 0; y < H; y += 24) {
        ctx.fillRect(trackLeft - 10, (y + trackRef.current.y * 2) % H, 10, 16);
        ctx.fillRect(trackLeft + trackWidth, (y + trackRef.current.y * 2) % H, 10, 16);
      }

      // Track progression
      const c = carRef.current;
      if (!gameOver && c.speed > 0) {
        trackRef.current.y += c.speed;
        updateScore(scoreRef.current + Math.round(c.speed));

        // Obstacles movement & collision
        for (const obs of trackRef.current.obstacles) {
          obs.y += c.speed * 1.5;

          // Check hit
          if (Math.abs(obs.x - c.x) < 22 && Math.abs(obs.y - 200) < 22) {
            if (obs.type === 'MUD') {
              c.speed = Math.max(1.5, c.speed * 0.6);
              setStatus('Hit mud pit! Traction loss and speed halved.');
            } else {
              c.speed = Math.max(0, c.speed - 3.0);
              setStatus('Hit track boulder! Heavy impact!');
            }
          }

          // Respawn obstacle ahead
          if (obs.y > H + 50) {
            obs.y = -150 - Math.random() * 200;
            obs.x = 90 + Math.random() * 180;
            setCheckpoints(cp => cp + 1);
            setTimeLeft(t => Math.min(45, t + 4)); // Checkpoint time bonus
          }
        }
      }

      // Draw Obstacles (Mud and Rocks)
      for (const obs of trackRef.current.obstacles) {
        if (obs.type === 'MUD') {
          ctx.fillStyle = '#451a03';
          ctx.beginPath();
          ctx.ellipse(obs.x, obs.y, 18, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Draw Rally Buggy
      ctx.save();
      ctx.translate(c.x, 200);

      // Chassis (Vibrant rally yellow)
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-12, -22, 24, 44);

      // Cockpit / roll cage
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8, -12, 16, 22);

      // Heavy all-terrain tyres
      ctx.fillStyle = '#020617';
      ctx.fillRect(-16, -20, 6, 12); // Front left
      ctx.fillRect(10, -20, 6, 12);  // Front right
      ctx.fillRect(-16, 8, 6, 14);   // Rear left
      ctx.fillRect(10, 8, 6, 14);    // Rear right

      // Roof headlights
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-5, -22, 3, 0, Math.PI * 2);
      ctx.arc(5, -22, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [gameOver, updateScore]);

  return (
    <div className={styles.container} id="off-road-rally-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Distance</span>
          <span className={styles.scoreValue} id="rally-score">{distance} M</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Speed</span>
          <span className={styles.scoreValue}>{speed} KM/H</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Checkpoints</span>
          <span className={styles.scoreValue}>{checkpoints}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Time</span>
          <span className={styles.scoreValue} style={{ color: timeLeft < 10 ? '#ef4444' : '#38bdf8' }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="rally-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#fbbf24', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rally-left"
          onClick={() => steer('LEFT')}
          disabled={gameOver}
        >
          ◀ Steer Left
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-rally-gas"
          onClick={gas}
          disabled={gameOver}
        >
          ⚡ Gas Throttle
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-rally-brake"
          onClick={brake}
          disabled={gameOver}
        >
          🛑 Brake
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rally-right"
          onClick={() => steer('RIGHT')}
          disabled={gameOver}
        >
          Steer Right ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-rally-restart"
          onClick={restart}
        >
          Restart Rally
        </button>
      </div>
    </div>
  );
});

OffRoadRally.displayName = 'OffRoadRally';
