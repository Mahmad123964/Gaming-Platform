import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface PhysicsMarbleMazeRef {
  restart: () => void;
  getScore: () => number;
}

interface PhysicsMarbleMazeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const PhysicsMarbleMaze = forwardRef<PhysicsMarbleMazeRef, PhysicsMarbleMazeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [level, setLevel] = useState<number>(1);
  const [status, setStatus] = useState<string>('Tilt the maze table to roll the marble into the green goal!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const marbleRef = useRef({
    x: 45,
    y: 45,
    vx: 0,
    vy: 0,
    radius: 7
  });

  const tiltRef = useRef({ ax: 0, ay: 0 });

  const mazeWallsRef = useRef([
    { x: 20, y: 80, w: 180, h: 10 },
    { x: 120, y: 140, w: 200, h: 10 },
    { x: 20, y: 190, w: 180, h: 10 },
    { x: 230, y: 20, w: 10, h: 90 },
    { x: 90, y: 140, w: 10, h: 60 }
  ]);

  const pitsRef = useRef([
    { x: 160, y: 50, r: 12 },
    { x: 60, y: 160, r: 12 },
    { x: 280, y: 170, r: 12 }
  ]);

  const goalRef = useRef({ x: 300, y: 220, r: 15 });

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setLevel(1);
    setStatus('Tilt the maze table to roll the marble into the green goal!');
    marbleRef.current = { x: 45, y: 45, vx: 0, vy: 0, radius: 7 };
    tiltRef.current = { ax: 0, ay: 0 };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const applyTilt = useCallback((dax: number, day: number) => {
    tiltRef.current.ax = Math.max(-0.6, Math.min(0.6, tiltRef.current.ax + dax));
    tiltRef.current.ay = Math.max(-0.6, Math.min(0.6, tiltRef.current.ay + day));
  }, []);

  // Main canvas loop
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

      // Wooden maze table surface
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, W, H);

      // Outer wooden rim
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, W - 16, H - 16);

      // Draw Green Goal Cup
      const g = goalRef.current;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Pit Holes (Hazard black pits)
      ctx.fillStyle = '#0f172a';
      for (const pit of pitsRef.current) {
        ctx.beginPath();
        ctx.arc(pit.x, pit.y, pit.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw Wooden Maze Walls
      ctx.fillStyle = '#78350f';
      for (const wall of mazeWallsRef.current) {
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      }

      // Marble physics
      const m = marbleRef.current;
      const t = tiltRef.current;

      m.vx += t.ax * 0.45;
      m.vy += t.ay * 0.45;
      m.vx *= 0.98; // Rolling friction
      m.vy *= 0.98;

      m.x += m.vx;
      m.y += m.vy;

      // Outer rim collisions
      if (m.x < 24) { m.x = 24; m.vx = -m.vx * 0.5; }
      if (m.x > W - 24) { m.x = W - 24; m.vx = -m.vx * 0.5; }
      if (m.y < 24) { m.y = 24; m.vy = -m.vy * 0.5; }
      if (m.y > H - 24) { m.y = H - 24; m.vy = -m.vy * 0.5; }

      // Maze wall collisions
      for (const wall of mazeWallsRef.current) {
        if (m.x + m.radius > wall.x && m.x - m.radius < wall.x + wall.w &&
            m.y + m.radius > wall.y && m.y - m.radius < wall.y + wall.h) {
          // Rebound
          m.vx = -m.vx * 0.6;
          m.vy = -m.vy * 0.6;
        }
      }

      // Pit hole fall check
      for (const pit of pitsRef.current) {
        if (Math.hypot(m.x - pit.x, m.y - pit.y) < pit.r) {
          // Marble fell into pit!
          m.x = 45;
          m.y = 45;
          m.vx = 0;
          m.vy = 0;
          setStatus('Oops! Marble plunged into a pit hole. Resetting to start.');
          break;
        }
      }

      // Goal reach check
      if (Math.hypot(m.x - g.x, m.y - g.y) < g.r) {
        m.x = 45;
        m.y = 45;
        m.vx = 0;
        m.vy = 0;
        updateScore(scoreRef.current + 250);
        setLevel(lvl => lvl + 1);
        setStatus('🎉 LEVEL COMPLETE! Marble safely rolled into the goal cup! +250 PTS');
      }

      // Draw Marble (Chrome silver metallic sphere with light reflection)
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Specular highlight dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x - 2, m.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [updateScore]);

  return (
    <div className={styles.container} id="physics-marble-maze-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Marble Score</span>
          <span className={styles.scoreValue} id="marble-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Maze Level</span>
          <span className={styles.scoreValue}>{level}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Table Tilt</span>
          <span className={styles.scoreValue}>
            {Math.round(tiltRef.current.ax * 10)}° / {Math.round(tiltRef.current.ay * 10)}°
          </span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="marble-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#fbbf24', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-marble-tilt-up"
          onClick={() => applyTilt(0, -0.2)}
        >
          ▲ Tilt Up
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-marble-tilt-down"
          onClick={() => applyTilt(0, 0.2)}
        >
          ▼ Tilt Down
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-marble-tilt-left"
          onClick={() => applyTilt(-0.2, 0)}
        >
          ◀ Tilt Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-marble-tilt-right"
          onClick={() => applyTilt(0.2, 0)}
        >
          Tilt Right ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-marble-restart"
          onClick={restart}
        >
          Restart Marble Maze
        </button>
      </div>
    </div>
  );
});

PhysicsMarbleMaze.displayName = 'PhysicsMarbleMaze';
