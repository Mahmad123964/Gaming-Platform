import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface StealthMazeMissionRef {
  restart: () => void;
  getScore: () => number;
}

interface StealthMazeMissionProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const StealthMazeMission = forwardRef<StealthMazeMissionRef, StealthMazeMissionProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [intel, setIntel] = useState<number>(initialScore);
  const [alertLevel, setAlertLevel] = useState<number>(0);
  const [terminalsHacked, setTerminalsHacked] = useState<number>(0);
  const [status, setStatus] = useState<string>('Evade guard searchlights, hack terminals, and extract unseen!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const spyRef = useRef({
    x: 45,
    y: 220,
    speed: 2.5
  });

  const guardsRef = useRef([
    { x: 120, y: 70, minX: 60, maxX: 180, vx: 1.2, facing: 'RIGHT' as 'LEFT' | 'RIGHT' },
    { x: 260, y: 150, minX: 190, maxX: 310, vx: -1.4, facing: 'LEFT' as 'LEFT' | 'RIGHT' }
  ]);

  const terminalsRef = useRef([
    { x: 180, y: 50, hacked: false },
    { x: 310, y: 215, hacked: false }
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setIntel(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setIntel(0);
    setAlertLevel(0);
    setTerminalsHacked(0);
    setStatus('Evade guard searchlights, hack terminals, and extract unseen!');
    spyRef.current = { x: 45, y: 220, speed: 2.5 };
    guardsRef.current = [
      { x: 120, y: 70, minX: 60, maxX: 180, vx: 1.2, facing: 'RIGHT' },
      { x: 260, y: 150, minX: 190, maxX: 310, vx: -1.4, facing: 'LEFT' }
    ];
    terminalsRef.current.forEach(t => { t.hacked = false; });
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const moveSpy = useCallback((dx: number, dy: number) => {
    const s = spyRef.current;
    s.x = Math.max(30, Math.min(330, s.x + dx * 20));
    s.y = Math.max(30, Math.min(230, s.y + dy * 20));
  }, []);

  const hackTerminal = useCallback(() => {
    const s = spyRef.current;
    let found = false;

    for (const t of terminalsRef.current) {
      if (!t.hacked && Math.hypot(s.x - t.x, s.y - t.y) < 35) {
        t.hacked = true;
        found = true;
        setTerminalsHacked(th => th + 1);
        updateScore(scoreRef.current + 250);
        setStatus('💾 TERMINAL HACKED! Confidential server blueprints extracted.');
        break;
      }
    }

    if (!found) {
      setStatus('No terminal in hacking range. Move closer to server racks.');
    }
  }, [updateScore]);

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

      // Dark concrete bunker facility
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      // Interior security partition walls
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 110, 150, 12);
      ctx.fillRect(210, 110, 150, 12);
      ctx.fillRect(180, 170, 12, 90);

      // Draw Terminals
      for (const t of terminalsRef.current) {
        ctx.fillStyle = t.hacked ? '#10b981' : '#38bdf8';
        ctx.fillRect(t.x - 10, t.y - 10, 20, 20);
        ctx.fillStyle = '#020617';
        ctx.fillRect(t.x - 7, t.y - 7, 14, 14);
        ctx.fillStyle = t.hacked ? '#34d399' : '#0ea5e9';
        ctx.fillRect(t.x - 4, t.y - 4, 8, 8); // Screen
      }

      // Guard AI patrols & vision cones
      const s = spyRef.current;
      let spottedThisFrame = false;

      for (const g of guardsRef.current) {
        g.x += g.vx;
        if (g.x < g.minX) {
          g.vx = Math.abs(g.vx);
          g.facing = 'RIGHT';
        } else if (g.x > g.maxX) {
          g.vx = -Math.abs(g.vx);
          g.facing = 'LEFT';
        }

        // Draw Searchlight Cone of Vision (Semi-transparent yellow cone)
        const coneDir = g.facing === 'RIGHT' ? 1 : -1;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x + coneDir * 80, g.y - 30);
        ctx.lineTo(g.x + coneDir * 80, g.y + 30);
        ctx.closePath();
        ctx.fill();

        // Check if spy is inside vision cone
        const dx = (s.x - g.x) * coneDir;
        const dy = Math.abs(s.y - g.y);
        if (dx > 0 && dx < 80 && dy < dx * 0.45) {
          spottedThisFrame = true;
        }

        // Draw Guard (Red tactical uniform)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f87171';
        ctx.fillRect(g.x + coneDir * 4, g.y - 3, 5, 6); // Flashlight
      }

      // Update Alert Level
      if (spottedThisFrame) {
        setAlertLevel(prev => {
          const next = Math.min(100, prev + 1.5);
          if (next >= 100) setStatus('🚨 INTRUDER DETECTED! Lockdown initiated!');
          return next;
        });
      } else {
        setAlertLevel(prev => Math.max(0, prev - 0.2));
      }

      // Draw Spy (Sleek black stealth operative)
      ctx.fillStyle = '#06b6d4'; // Cyan operative glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={styles.container} id="stealth-maze-mission-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Intel Score</span>
          <span className={styles.scoreValue} id="stealth-score">{intel}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Alert Meter</span>
          <span className={styles.scoreValue} style={{ color: alertLevel > 60 ? '#ef4444' : '#38bdf8' }}>
            {Math.round(alertLevel)}%
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Hacked</span>
          <span className={styles.scoreValue}>{terminalsHacked} / 2</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="stealth-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-stealth-up"
          onClick={() => moveSpy(0, -1)}
        >
          ▲ Sneak Up
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-stealth-down"
          onClick={() => moveSpy(0, 1)}
        >
          ▼ Sneak Down
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-stealth-left"
          onClick={() => moveSpy(-1, 0)}
        >
          ◀ Sneak Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-stealth-right"
          onClick={() => moveSpy(1, 0)}
        >
          Sneak Right ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-stealth-hack"
          onClick={hackTerminal}
        >
          💾 Hack Terminal
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-stealth-restart"
          onClick={restart}
        >
          Restart Stealth Mission
        </button>
      </div>
    </div>
  );
});

StealthMazeMission.displayName = 'StealthMazeMission';
