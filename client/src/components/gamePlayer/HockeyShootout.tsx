import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface HockeyShootoutRef {
  restart: () => void;
  getScore: () => number;
}

interface HockeyShootoutProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const HockeyShootout = forwardRef<HockeyShootoutRef, HockeyShootoutProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [goals, setGoals] = useState<number>(initialScore);
  const [shotsTaken, setShotsTaken] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [status, setStatus] = useState<string>('Deek the goalie and unleash your shot!');
  const [shotActive, setShotActive] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const puckRef = useRef({
    x: 180,
    y: 200,
    vx: 0,
    vy: 0,
    active: false,
    radius: 5
  });

  const skaterRef = useRef({ x: 180, y: 220, targetX: 180 });
  const goalieRef = useRef({ x: 180, y: 60, targetX: 180, width: 36, speed: 2.6 });

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setGoals(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setGoals(0);
    setShotsTaken(0);
    setRound(1);
    setStatus('Deek the goalie and unleash your shot!');
    setShotActive(false);
    puckRef.current = { x: 180, y: 200, vx: 0, vy: 0, active: false, radius: 5 };
    skaterRef.current = { x: 180, y: 220, targetX: 180 };
    goalieRef.current = { x: 180, y: 60, targetX: 180, width: 36, speed: 2.6 };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const deek = useCallback((direction: 'LEFT' | 'RIGHT' | 'CENTER') => {
    if (puckRef.current.active) return;
    if (direction === 'LEFT') {
      skaterRef.current.targetX = Math.max(80, skaterRef.current.targetX - 35);
      setStatus('Smooth deek to the left wing!');
    } else if (direction === 'RIGHT') {
      skaterRef.current.targetX = Math.min(280, skaterRef.current.targetX + 35);
      setStatus('Toe-drag deek to the right slot!');
    } else {
      skaterRef.current.targetX = 180;
      setStatus('Centering puck for direct angle!');
    }
  }, []);

  const shoot = useCallback((type: 'SLAPSHOT' | 'WRISTSHOT') => {
    if (puckRef.current.active) return;
    const s = skaterRef.current;
    const speed = type === 'SLAPSHOT' ? 7.2 : 5.8;
    const lateralDev = (Math.random() - 0.5) * 1.8;

    puckRef.current = {
      x: s.x,
      y: s.y - 10,
      vx: lateralDev,
      vy: -speed,
      active: true,
      radius: 5
    };
    setShotActive(true);
    setShotsTaken(st => st + 1);
    setStatus(type === 'SLAPSHOT' ? 'Thunderous Slapshot released!' : 'Quick-release Wristshot fired!');
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

      // Clean fresh sheet of ice
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, 0, W, H);

      // Ice rink markings
      ctx.strokeStyle = '#ef4444'; // Goal line red
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 50);
      ctx.lineTo(W - 30, 50);
      ctx.stroke();

      // Goal crease (Blue semi-circle)
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.arc(W / 2, 50, 32, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Net (Red posts + white mesh)
      const netX = W / 2 - 40;
      const netW = 80;
      ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
      ctx.fillRect(netX, 15, netW, 35);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.strokeRect(netX, 15, netW, 35);

      // Faceoff dots
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(80, 160, 4, 0, Math.PI * 2);
      ctx.arc(W - 80, 160, 4, 0, Math.PI * 2);
      ctx.fill();

      // Goalie AI movement
      const g = goalieRef.current;
      const p = puckRef.current;
      const sk = skaterRef.current;
      const targetX = p.active ? p.x : sk.x;
      g.targetX = Math.max(W / 2 - 30, Math.min(W / 2 + 30, targetX));
      g.x += (g.targetX - g.x) * 0.12;

      // Draw Goalie (Pads, blocker, glove)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(g.x - g.width / 2, g.y - 10, g.width, 18);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(g.x, g.y - 12, 7, 0, Math.PI * 2); // Helmet
      ctx.fill();

      // Puck physics
      if (p.active) {
        p.x += p.vx;
        p.y += p.vy;

        // Check Goalie save collision
        if (p.y <= 62 && p.y >= 45 && Math.abs(p.x - g.x) <= g.width / 2 + 2) {
          p.active = false;
          setShotActive(false);
          setStatus('GLOVE SAVE by the goaltender! Denied!');
        }

        // Check Goal
        if (p.y <= 48 && p.x >= netX + 4 && p.x <= netX + netW - 4 && p.active) {
          p.active = false;
          setShotActive(false);
          updateScore(scoreRef.current + 100);
          setStatus('🚨 HE SCORES! Bar down top-shelf goal!');
        }

        // Missed wide
        if (p.y <= 20 && p.active) {
          p.active = false;
          setShotActive(false);
          setStatus('Fired wide of the net off the glass!');
        }
      }

      // Draw Skater
      sk.x += (sk.targetX - sk.x) * 0.2;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(sk.x, sk.y, 8, 0, Math.PI * 2);
      ctx.fill();
      // Stick
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sk.x, sk.y);
      ctx.lineTo(sk.x + (p.active ? 0 : 8), sk.y - 12);
      ctx.stroke();

      // Draw Puck (Vulcanized black rubber)
      const puckDisplayX = p.active ? p.x : sk.x + 8;
      const puckDisplayY = p.active ? p.y : sk.y - 12;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(puckDisplayX, puckDisplayY, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [updateScore]);

  return (
    <div className={styles.container} id="hockey-shootout-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Goals</span>
          <span className={styles.scoreValue} id="hockey-score">{goals}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Shots</span>
          <span className={styles.scoreValue}>{shotsTaken}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Shooting %</span>
          <span className={styles.scoreValue}>
            {shotsTaken > 0 ? Math.round((goals / 100 / shotsTaken) * 100) : 0}%
          </span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="hockey-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-hockey-deek-left"
          onClick={() => deek('LEFT')}
          disabled={shotActive}
        >
          ◀ Deek Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-hockey-center"
          onClick={() => deek('CENTER')}
          disabled={shotActive}
        >
          Center Slot
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-hockey-deek-right"
          onClick={() => deek('RIGHT')}
          disabled={shotActive}
        >
          Deek Right ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-hockey-wristshot"
          onClick={() => shoot('WRISTSHOT')}
          disabled={shotActive}
        >
          🎯 Wrist Shot
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-hockey-slapshot"
          onClick={() => shoot('SLAPSHOT')}
          disabled={shotActive}
        >
          💥 Slapshot
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-hockey-restart"
          onClick={restart}
        >
          Next Shootout Round
        </button>
      </div>
    </div>
  );
});

HockeyShootout.displayName = 'HockeyShootout';
