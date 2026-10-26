import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface CyberNinjaAdventureRef {
  restart: () => void;
  getScore: () => number;
}

interface CyberNinjaAdventureProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const CyberNinjaAdventure = forwardRef<CyberNinjaAdventureRef, CyberNinjaAdventureProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [health, setHealth] = useState<number>(100);
  const [shurikens, setShurikens] = useState<number>(5);
  const [scrolls, setScrolls] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Cyber Ninja: Ascend the neon pagoda, slash sentinels, collect scrolls!');
  const [gameState, setGameState] = useState<'PLAYING' | 'VICTORY' | 'GAME_OVER'>('PLAYING');

  const scoreRef = useRef<number>(initialScore);
  const ninja = useRef({ x: 60, y: 220, vx: 0, vy: 0, onGround: true, slashTimer: 0 });
  const platforms = useRef([
    { x: 40, y: 250, w: 320, h: 14 },
    { x: 120, y: 190, w: 160, h: 12 },
    { x: 60, y: 130, w: 120, h: 12 },
    { x: 220, y: 80, w: 140, h: 12 }
  ]);
  const enemies = useRef([
    { x: 200, y: 175, vx: 1.0, minX: 130, maxX: 260, hp: 30 },
    { x: 280, y: 65, vx: -1.2, minX: 230, maxX: 340, hp: 30 }
  ]);
  const stars = useRef<{ x: number; y: number; vx: number }[]>([]);
  const scrollItems = useRef([
    { x: 100, y: 110, collected: false },
    { x: 300, y: 60, collected: false }
  ]);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setHealth(100);
    setShurikens(5);
    setScrolls(0);
    setGameState('PLAYING');
    setStatusText('Ninja mission restarted! Leap between platforms.');
    ninja.current = { x: 60, y: 220, vx: 0, vy: 0, onGround: true, slashTimer: 0 };
    enemies.current = [
      { x: 200, y: 175, vx: 1.0, minX: 130, maxX: 260, hp: 30 },
      { x: 280, y: 65, vx: -1.2, minX: 230, maxX: 340, hp: 30 }
    ];
    stars.current = [];
    scrollItems.current = [
      { x: 100, y: 110, collected: false },
      { x: 300, y: 60, collected: false }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const jump = () => {
    if (gameState !== 'PLAYING') return;
    const n = ninja.current;
    if (n.onGround) {
      n.vy = -7.5;
      n.onGround = false;
      setStatusText('Wall leap executed!');
    }
  };

  const slashKatana = () => {
    if (gameState !== 'PLAYING') return;
    const n = ninja.current;
    n.slashTimer = 15;
    setStatusText('⚔️ KATANA SLASH! Flashing blade strike!');

    // Check hit on enemies within blade range
    enemies.current.forEach((e, idx) => {
      if (Math.abs(n.x - e.x) < 32 && Math.abs(n.y - e.y) < 25) {
        e.hp -= 30;
        if (e.hp <= 0) {
          enemies.current.splice(idx, 1);
          const bonus = 150;
          const nextScore = scoreRef.current + bonus;
          updateScore(nextScore);
          setStatusText('🎯 Sentinel sliced in half! +150 PTS');
        }
      }
    });
  };

  const throwShuriken = () => {
    if (gameState !== 'PLAYING' || shurikens <= 0) return;
    setShurikens(s => s - 1);
    const n = ninja.current;
    stars.current.push({ x: n.x + 12, y: n.y, vx: 6.5 });
    setStatusText('⚡ Shuriken star launched!');
  };

  const dashForward = () => {
    if (gameState !== 'PLAYING') return;
    ninja.current.x = Math.min(360, ninja.current.x + 35);
    setStatusText('💨 Shadow Dash!');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      const n = ninja.current;

      // Gravity and movement
      n.y += n.vy;
      n.vy += 0.32; // Gravity
      if (n.slashTimer > 0) n.slashTimer -= 1;

      // Platform collisions
      n.onGround = false;
      platforms.current.forEach(p => {
        if (n.x >= p.x - 10 && n.x <= p.x + p.w + 10 && n.y >= p.y - 12 && n.y <= p.y + 6 && n.vy >= 0) {
          n.y = p.y - 12;
          n.vy = 0;
          n.onGround = true;
        }
      });

      // Update Shurikens
      for (let i = stars.current.length - 1; i >= 0; i--) {
        const s = stars.current[i];
        s.x += s.vx;
        if (s.x > 400) {
          stars.current.splice(i, 1);
          continue;
        }

        // Hit enemies
        enemies.current.forEach((e, idx) => {
          if (Math.hypot(s.x - e.x, s.y - e.y) < 20) {
            e.hp -= 30;
            stars.current.splice(i, 1);
            if (e.hp <= 0) {
              enemies.current.splice(idx, 1);
              const bonus = 150;
              const nextScore = scoreRef.current + bonus;
              updateScore(nextScore);
              setStatusText('🎯 Shuriken headshot! +150 PTS');
            }
          }
        });
      }

      // Update Enemies
      enemies.current.forEach(e => {
        e.x += e.vx;
        if (e.x > e.maxX || e.x < e.minX) e.vx *= -1;

        // Touch player
        if (Math.hypot(n.x - e.x, n.y - e.y) < 18 && gameState === 'PLAYING') {
          setHealth(h => {
            const next = Math.max(0, h - 1);
            if (next <= 0) {
              setGameState('GAME_OVER');
              setStatusText(`💀 DEFEATED! The ninja has fallen. Final Score: ${scoreRef.current}`);
              onGameOver?.(scoreRef.current);
            }
            return next;
          });
        }
      });

      // Scroll collectibles
      scrollItems.current.forEach(sc => {
        if (!sc.collected && Math.hypot(n.x - sc.x, n.y - sc.y) < 22) {
          sc.collected = true;
          setScrolls(s => {
            const next = s + 1;
            const scrollBonus = scoreRef.current + 250;
            updateScore(scrollBonus);
            setStatusText(`📜 ANCIENT CYBER SCROLL FOUND! +250 PTS (${next}/2)`);
            if (next >= 2) {
              setGameState('VICTORY');
              setStatusText(`🏆 MISSION COMPLETE! Master Ninja Victory! Score: ${scrollBonus}`);
              onGameOver?.(scrollBonus);
            }
            return next;
          });
        }
      });

      // Draw Pagoda Night Background
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, 400, 280);

      // Neon Moon
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(340, 50, 28, 0, Math.PI * 2);
      ctx.fill();

      // Platforms (Neon pink/cyan ledge borders)
      platforms.current.forEach(p => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      });

      // Draw Scrolls
      scrollItems.current.forEach(sc => {
        if (!sc.collected) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(sc.x - 6, sc.y - 8, 12, 16);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(sc.x - 4, sc.y - 6, 8, 12);
        }
      });

      // Draw Shurikens
      ctx.fillStyle = '#ffffff';
      stars.current.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Enemies (Red Cyborg Sentinels)
      enemies.current.forEach(e => {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x - 8, e.y - 14, 16, 26);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(e.x - 6, e.y - 10, 12, 4); // Visor
      });

      // Draw Ninja (Sleek dark violet / cyan shinobi)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(n.x - 8, n.y - 14, 16, 26);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(n.x - 4, n.y - 10, 8, 3); // Mask eye slit

      // Katana slash arc
      if (n.slashTimer > 0) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(n.x + 14, n.y, 22, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
      }

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
          <span>Ninja Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Health</span>
          <span className={styles.scoreValue}>{health}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Shurikens</span>
          <span className={styles.scoreValue}>{shurikens} ⚡</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Scrolls</span>
          <span className={styles.scoreValue}>{scrolls} / 2</span>
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
          id="btn-ninja-jump"
          onClick={jump}
          disabled={gameState !== 'PLAYING'}
        >
          🥷 Wall Jump
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-ninja-slash"
          onClick={slashKatana}
          disabled={gameState !== 'PLAYING'}
        >
          ⚔️ Katana Slash
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-ninja-shuriken"
          onClick={throwShuriken}
          disabled={shurikens <= 0 || gameState !== 'PLAYING'}
        >
          ⚡ Throw Star
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-ninja-dash"
          onClick={dashForward}
          disabled={gameState !== 'PLAYING'}
        >
          💨 Shadow Dash
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-ninja-restart"
          onClick={restart}
        >
          Restart Pagoda Run
        </button>
      </div>
    </div>
  );
});

CyberNinjaAdventure.displayName = 'CyberNinjaAdventure';
