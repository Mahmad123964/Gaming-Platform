import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface PlatformAdventureRef {
  restart: () => void;
  getScore: () => number;
}

interface PlatformAdventureProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const PlatformAdventure = forwardRef<PlatformAdventureRef, PlatformAdventureProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [coins, setCoins] = useState<number>(initialScore);
  const [lives, setLives] = useState<number>(3);
  const [level, setLevel] = useState<number>(1);
  const [status, setStatus] = useState<string>('Leap across floating platforms and collect all star gems!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const heroRef = useRef({
    x: 50,
    y: 190,
    vx: 0,
    vy: 0,
    width: 16,
    height: 24,
    onGround: true,
    jumpsLeft: 2,
    attacking: false
  });

  const platformsRef = useRef([
    { x: 20, y: 220, w: 100, h: 14 },
    { x: 140, y: 180, w: 90, h: 14 },
    { x: 250, y: 140, w: 90, h: 14 },
    { x: 120, y: 100, w: 80, h: 14 },
    { x: 220, y: 70, w: 100, h: 14 }
  ]);

  const gemsRef = useRef([
    { x: 180, y: 155, collected: false },
    { x: 290, y: 115, collected: false },
    { x: 160, y: 75, collected: false },
    { x: 270, y: 45, collected: false }
  ]);

  const enemiesRef = useRef([
    { x: 160, y: 168, minX: 140, maxX: 220, vx: 1.2, alive: true }
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setCoins(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setCoins(0);
    setLives(3);
    setLevel(1);
    setStatus('Leap across floating platforms and collect all star gems!');
    heroRef.current = { x: 50, y: 190, vx: 0, vy: 0, width: 16, height: 24, onGround: true, jumpsLeft: 2, attacking: false };
    gemsRef.current.forEach(g => { g.collected = false; });
    enemiesRef.current = [{ x: 160, y: 168, minX: 140, maxX: 220, vx: 1.2, alive: true }];
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const move = useCallback((dir: 'LEFT' | 'RIGHT') => {
    const h = heroRef.current;
    h.vx = dir === 'LEFT' ? -3.5 : 3.5;
  }, []);

  const jump = useCallback(() => {
    const h = heroRef.current;
    if (h.jumpsLeft > 0) {
      h.vy = -6.8;
      h.onGround = false;
      h.jumpsLeft--;
      setStatus(h.jumpsLeft === 1 ? 'First Jump!' : 'Double Jump in mid-air!');
    }
  }, []);

  const swordAttack = useCallback(() => {
    const h = heroRef.current;
    h.attacking = true;
    setStatus('⚔️ Sword slash attack!');

    // Check hit on enemy
    for (const e of enemiesRef.current) {
      if (e.alive && Math.hypot(h.x - e.x, h.y - e.y) < 32) {
        e.alive = false;
        updateScore(scoreRef.current + 100);
        setStatus('💥 Sentry defeated! +100 PTS');
      }
    }
    setTimeout(() => { h.attacking = false; }, 300);
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

      // Synthwave dusk sky
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      // Distant mountain parallax
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(80, 160);
      ctx.lineTo(160, H);
      ctx.lineTo(240, 140);
      ctx.lineTo(320, H);
      ctx.fill();

      // Platform tiles
      for (const p of platformsRef.current) {
        ctx.fillStyle = '#10b981'; // Mossy top
        ctx.fillRect(p.x, p.y, p.w, 4);
        ctx.fillStyle = '#475569'; // Stone block
        ctx.fillRect(p.x, p.y + 4, p.w, p.h - 4);
      }

      // Hero physics
      const h = heroRef.current;
      h.x += h.vx;
      h.y += h.vy;
      h.vy += 0.32; // Gravity
      h.vx *= 0.85; // Drag

      // Boundary clamping
      h.x = Math.max(10, Math.min(W - 20, h.x));

      // Platform collisions
      h.onGround = false;
      for (const p of platformsRef.current) {
        if (h.x + h.width > p.x && h.x < p.x + p.w &&
            h.y + h.height >= p.y && h.y + h.height <= p.y + 10 && h.vy > 0) {
          h.y = p.y - h.height;
          h.vy = 0;
          h.onGround = true;
          h.jumpsLeft = 2; // Reset double jump
        }
      }

      // Pit fall check
      if (h.y > H + 20) {
        setLives(l => {
          const nextL = l - 1;
          if (nextL <= 0) setStatus('Game Over! Fell into abyss.');
          return nextL;
        });
        h.x = 50;
        h.y = 190;
        h.vy = 0;
      }

      // Star Gems collection
      for (const gem of gemsRef.current) {
        if (!gem.collected && Math.hypot(h.x - gem.x, h.y - gem.y) < 20) {
          gem.collected = true;
          updateScore(scoreRef.current + 50);
          setStatus('✨ Star Gem collected! +50 PTS');
        }
      }

      // Enemies patrol
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        e.x += e.vx;
        if (e.x < e.minX || e.x > e.maxX) e.vx = -e.vx;

        // Player touch damage
        if (!h.attacking && Math.hypot(h.x - e.x, h.y - e.y) < 18) {
          setLives(l => Math.max(0, l - 1));
          h.vy = -4.0;
          setStatus('Ouch! Bumped into slime sentry.');
        }

        // Draw Enemy Slime
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(e.x - 8, e.y, 16, 4);
      }

      // Draw Star Gems
      for (const gem of gemsRef.current) {
        if (!gem.collected) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(gem.x, gem.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Draw Hero Character
      ctx.fillStyle = '#38bdf8'; // Cyan hero suit
      ctx.fillRect(h.x - 8, h.y, 16, 24);
      ctx.fillStyle = '#f8fafc'; // Headband
      ctx.fillRect(h.x - 8, h.y + 4, 16, 4);

      // Sword slash visual
      if (h.attacking) {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(h.x + 14, h.y + 12, 14, -Math.PI / 4, Math.PI / 4);
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
    <div className={styles.container} id="platform-adventure-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Gems Score</span>
          <span className={styles.scoreValue} id="plat-score">{coins}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Lives</span>
          <span className={styles.scoreValue} style={{ color: lives <= 1 ? '#ef4444' : '#38bdf8' }}>
            {'❤️'.repeat(Math.max(0, lives))}
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Level</span>
          <span className={styles.scoreValue}>{level}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="plat-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-plat-left"
          onClick={() => move('LEFT')}
        >
          ◀ Run Left
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-plat-jump"
          onClick={jump}
        >
          🦘 Jump
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-plat-attack"
          onClick={swordAttack}
        >
          ⚔️ Sword Slash
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-plat-right"
          onClick={() => move('RIGHT')}
        >
          Run Right ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-plat-restart"
          onClick={restart}
        >
          Restart Adventure
        </button>
      </div>
    </div>
  );
});

PlatformAdventure.displayName = 'PlatformAdventure';
