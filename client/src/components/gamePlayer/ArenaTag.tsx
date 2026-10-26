import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface ArenaTagRef {
  restart: () => void;
  getScore: () => number;
}

interface ArenaTagProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const ArenaTag = forwardRef<ArenaTagRef, ArenaTagProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [survivalTime, setSurvivalTime] = useState<number>(0);
  const [isIt, setIsIt] = useState<boolean>(false);
  const [dashReady, setDashReady] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('Evade the IT runner! Outlast the clock in the arena.');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const playerRef = useRef({
    x: 180,
    y: 200,
    vx: 0,
    vy: 0,
    speed: 3.2,
    isIt: false
  });

  const botsRef = useRef([
    { id: 1, x: 80, y: 70, vx: 1.5, vy: 1.2, isIt: true, color: '#ef4444' }, // Bot 1 starts as IT
    { id: 2, x: 280, y: 80, vx: -1.2, vy: 1.5, isIt: false, color: '#f59e0b' },
    { id: 3, x: 180, y: 50, vx: 1.0, vy: -1.2, isIt: false, color: '#10b981' }
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setSurvivalTime(0);
    setIsIt(false);
    setDashReady(true);
    setStatus('Evade the IT runner! Outlast the clock in the arena.');
    playerRef.current = { x: 180, y: 200, vx: 0, vy: 0, speed: 3.2, isIt: false };
    botsRef.current = [
      { id: 1, x: 80, y: 70, vx: 1.5, vy: 1.2, isIt: true, color: '#ef4444' },
      { id: 2, x: 280, y: 80, vx: -1.2, vy: 1.5, isIt: false, color: '#f59e0b' },
      { id: 3, x: 180, y: 50, vx: 1.0, vy: -1.2, isIt: false, color: '#10b981' }
    ];
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const movePlayer = useCallback((dx: number, dy: number) => {
    const p = playerRef.current;
    p.x = Math.max(30, Math.min(330, p.x + dx * 24));
    p.y = Math.max(30, Math.min(230, p.y + dy * 24));
  }, []);

  const triggerDash = useCallback(() => {
    if (!dashReady) return;
    const p = playerRef.current;
    p.speed = 6.0;
    setDashReady(false);
    setStatus('⚡ SPRINT DASH ACTIVATED! High-speed evasion!');

    setTimeout(() => { p.speed = 3.2; }, 1500);
    setTimeout(() => { setDashReady(true); }, 5000);
  }, [dashReady]);

  // Main canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    runningRef.current = true;
    let animId: number;
    let frame = 0;

    const render = () => {
      if (!runningRef.current) return;
      const W = canvas.width;
      const H = canvas.height;
      frame++;

      // Arena floor (Dark modern sport tile)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      // Speed boost pads (Yellow neon chevrons)
      ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
      ctx.fillRect(60, 110, 40, 40);
      ctx.fillRect(260, 110, 40, 40);
      ctx.fillStyle = '#facc15';
      ctx.font = '10px sans-serif';
      ctx.fillText('BOOST', 64, 134);
      ctx.fillText('BOOST', 264, 134);

      // Arena walls
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, W - 30, H - 30);

      const p = playerRef.current;
      const bots = botsRef.current;

      // Survival score tick (when player is NOT it)
      if (frame % 60 === 0 && !p.isIt) {
        setSurvivalTime(t => t + 1);
        updateScore(scoreRef.current + 5);
      }

      // Check boost pad overlap
      if ((p.x > 60 && p.x < 100 && p.y > 110 && p.y < 150) ||
          (p.x > 260 && p.x < 300 && p.y > 110 && p.y < 150)) {
        p.speed = 4.8;
      }

      // AI Bots logic
      for (const b of bots) {
        // Find current IT entity
        const itEntity = p.isIt ? p : bots.find(bot => bot.isIt);

        if (b.isIt) {
          // Bot is IT: Chases closest target
          const target = p; // Primary pursuit target
          const angle = Math.atan2(target.y - b.y, target.x - b.x);
          b.vx = Math.cos(angle) * 2.2;
          b.vy = Math.sin(angle) * 2.2;
        } else if (itEntity) {
          // Bot is not IT: Runs away from whoever is IT
          const angle = Math.atan2(b.y - itEntity.y, b.x - itEntity.x);
          b.vx = Math.cos(angle) * 1.8;
          b.vy = Math.sin(angle) * 1.8;
        }

        b.x += b.vx;
        b.y += b.vy;

        // Bounce off arena walls
        if (b.x < 30 || b.x > W - 30) b.vx = -b.vx;
        if (b.y < 30 || b.y > H - 30) b.vy = -b.vy;

        // Tag collision check with Player
        if (Math.hypot(p.x - b.x, p.y - b.y) < 18) {
          if (b.isIt && !p.isIt) {
            // Bot tagged Player!
            b.isIt = false;
            p.isIt = true;
            setIsIt(true);
            setStatus('🚨 YOU ARE IT! Chase and tag one of the runners!');
          } else if (p.isIt && !b.isIt) {
            // Player tagged Bot!
            p.isIt = false;
            b.isIt = true;
            setIsIt(false);
            updateScore(scoreRef.current + 100);
            setStatus(`🏆 TAG SUCCESS! You tagged Bot ${b.id}! +100 PTS`);
          }
        }

        // Draw Bot
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // If bot is IT, draw red pulse halo
        if (b.isIt) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw Player Runner (Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // If player is IT, draw pulsating flame aura
      if (p.isIt) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [updateScore]);

  return (
    <div className={styles.container} id="arena-tag-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Tag Score</span>
          <span className={styles.scoreValue} id="tag-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Role</span>
          <span className={styles.scoreValue} style={{ color: isIt ? '#ef4444' : '#10b981' }}>
            {isIt ? 'YOU ARE IT' : 'RUNNER'}
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Survival</span>
          <span className={styles.scoreValue}>{survivalTime}s</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Dash</span>
          <span className={styles.scoreValue} style={{ color: dashReady ? '#facc15' : '#64748b' }}>
            {dashReady ? 'READY' : 'COOLDOWN'}
          </span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="tag-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tag-up"
          onClick={() => movePlayer(0, -1)}
        >
          ▲ Dash Up
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tag-down"
          onClick={() => movePlayer(0, 1)}
        >
          ▼ Dash Down
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tag-left"
          onClick={() => movePlayer(-1, 0)}
        >
          ◀ Run Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tag-right"
          onClick={() => movePlayer(1, 0)}
        >
          Run Right ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-tag-dash"
          onClick={triggerDash}
          disabled={!dashReady}
        >
          ⚡ Sprint Dash
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-tag-restart"
          onClick={restart}
        >
          Restart Arena Tag
        </button>
      </div>
    </div>
  );
});

ArenaTag.displayName = 'ArenaTag';
