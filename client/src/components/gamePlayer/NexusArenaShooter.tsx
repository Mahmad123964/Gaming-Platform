import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface NexusArenaShooterRef {
  restart: () => void;
  getScore: () => number;
}

interface NexusArenaShooterProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const NexusArenaShooter = forwardRef<NexusArenaShooterRef, NexusArenaShooterProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [health, setHealth] = useState<number>(100);
  const [wave, setWave] = useState<number>(1);
  const [shotgunAmmo, setShotgunAmmo] = useState<number>(3);
  const [statusText, setStatusText] = useState<string>('Arena Survival: Eliminate cyber-drones and survive hostile waves!');
  const [gameState, setGameState] = useState<'COMBAT' | 'GAME_OVER'>('COMBAT');

  const scoreRef = useRef<number>(initialScore);
  const healthRef = useRef<number>(100);
  const player = useRef({ x: 200, y: 150, vx: 0, vy: 0, speed: 3.5 });
  const bullets = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const enemies = useRef<{ x: number; y: number; hp: number; speed: number }[]>([
    { x: 50, y: 50, hp: 20, speed: 1.2 },
    { x: 350, y: 50, hp: 20, speed: 1.2 },
    { x: 200, y: 280, hp: 30, speed: 0.9 }
  ]);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    healthRef.current = 100;
    setScore(0);
    setHealth(100);
    setWave(1);
    setShotgunAmmo(3);
    setGameState('COMBAT');
    setStatusText('Arena combat restarted! Fire laser bursts at approaching drones.');
    player.current = { x: 200, y: 150, vx: 0, vy: 0, speed: 3.5 };
    bullets.current = [];
    enemies.current = [
      { x: 50, y: 50, hp: 20, speed: 1.2 },
      { x: 350, y: 50, hp: 20, speed: 1.2 },
      { x: 200, y: 280, hp: 30, speed: 0.9 }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const fireLaser = () => {
    if (gameState !== 'COMBAT') return;
    const p = player.current;
    bullets.current.push({ x: p.x, y: p.y, vx: 0, vy: -7.5, life: 60 });
    setStatusText('Laser bolt discharged!');
  };

  const fireShotgun = () => {
    if (gameState !== 'COMBAT' || shotgunAmmo <= 0) return;
    setShotgunAmmo(a => a - 1);
    const p = player.current;
    bullets.current.push({ x: p.x, y: p.y, vx: -3, vy: -6.5, life: 50 });
    bullets.current.push({ x: p.x, y: p.y, vx: 0, vy: -7.5, life: 50 });
    bullets.current.push({ x: p.x, y: p.y, vx: 3, vy: -6.5, life: 50 });
    setStatusText('💥 PLASMA SHOTGUN SPREAD FIRED!');
  };

  const dashMove = () => {
    if (gameState !== 'COMBAT') return;
    player.current.y = Math.max(40, player.current.y - 45);
    setStatusText('⚡ Tactical dash maneuver executed!');
  };

  const moveLeft = () => {
    if (gameState !== 'COMBAT') return;
    player.current.x = Math.max(30, player.current.x - 28);
  };

  const moveRight = () => {
    if (gameState !== 'COMBAT') return;
    player.current.x = Math.min(370, player.current.x + 28);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      const p = player.current;

      // Update Bullets
      for (let i = bullets.current.length - 1; i >= 0; i--) {
        const b = bullets.current[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 1;
        if (b.life <= 0 || b.y < 0 || b.y > 300 || b.x < 0 || b.x > 400) {
          bullets.current.splice(i, 1);
        }
      }

      // Update Enemies
      for (let i = enemies.current.length - 1; i >= 0; i--) {
        const e = enemies.current[i];
        // Move toward player
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          e.x += (dx / dist) * e.speed;
          e.y += (dy / dist) * e.speed;
        }

        // Bullet collision
        for (let j = bullets.current.length - 1; j >= 0; j--) {
          const b = bullets.current[j];
          if (Math.hypot(e.x - b.x, e.y - b.y) < 18) {
            e.hp -= 20;
            bullets.current.splice(j, 1);
            if (e.hp <= 0) {
              enemies.current.splice(i, 1);
              const bonus = 100;
              const nextScore = scoreRef.current + bonus;
              updateScore(nextScore);
              setStatusText('🎯 Enemy drone destroyed! +100 PTS');
              break;
            }
          }
        }

        // Player collision
        if (Math.hypot(e.x - p.x, e.y - p.y) < 18 && gameState === 'COMBAT') {
          healthRef.current = Math.max(0, healthRef.current - 15);
          setHealth(healthRef.current);
          setStatusText('⚠️ HULL BREACH! Shield hit!');
          if (healthRef.current <= 0) {
            setGameState('GAME_OVER');
            setStatusText(`💀 DEFEATED! Mech destroyed. Final Score: ${scoreRef.current}`);
            onGameOver?.(scoreRef.current);
          }
        }
      }

      // Wave Respawn
      if (enemies.current.length === 0 && gameState === 'COMBAT') {
        setWave(w => {
          const nextWave = w + 1;
          const waveBonus = scoreRef.current + 300;
          updateScore(waveBonus);
          setShotgunAmmo(a => a + 2);
          enemies.current = [
            { x: 30, y: 30, hp: 20 + nextWave * 10, speed: 1.2 + nextWave * 0.1 },
            { x: 370, y: 30, hp: 20 + nextWave * 10, speed: 1.2 + nextWave * 0.1 },
            { x: 200, y: 280, hp: 30 + nextWave * 10, speed: 1.0 + nextWave * 0.1 }
          ];
          setStatusText(`🌊 WAVE ${nextWave} INCOMING! Cyber reinforcements spawned!`);
          return nextWave;
        });
      }

      // Draw Sci-Fi Cyber Grid Arena
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 400, 300);

      // Neon grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 400; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke();
      }
      for (let y = 0; y <= 300; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(400, y); ctx.stroke();
      }

      // Arena boundary glow
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, 380, 280);

      // Draw Bullets
      ctx.fillStyle = '#00F0FF';
      bullets.current.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Enemies (Red Cyber Drones)
      ctx.fillStyle = '#f43f5e';
      enemies.current.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw Player Mech (Cyan Triangle ship)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 12);
      ctx.lineTo(p.x - 10, p.y + 10);
      ctx.lineTo(p.x + 10, p.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

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
          <span>Arena Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Shield Health</span>
          <span className={styles.scoreValue} style={{ color: health < 30 ? '#ef4444' : '#22c55e' }}>{health}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Wave</span>
          <span className={styles.scoreValue}>W{wave}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Shotgun</span>
          <span className={styles.scoreValue}>{shotgunAmmo} Shells</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={300} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '24px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-arena-fire"
          onClick={fireLaser}
          disabled={gameState !== 'COMBAT'}
        >
          ⚡ Laser Fire
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-arena-shotgun"
          onClick={fireShotgun}
          disabled={shotgunAmmo <= 0 || gameState !== 'COMBAT'}
        >
          💥 Shotgun Spread
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-arena-move-left"
          onClick={moveLeft}
          disabled={gameState !== 'COMBAT'}
        >
          ◀ Strafe L
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-arena-move-right"
          onClick={moveRight}
          disabled={gameState !== 'COMBAT'}
        >
          Strafe R ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-arena-dash"
          onClick={dashMove}
          disabled={gameState !== 'COMBAT'}
        >
          💨 Dash
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-arena-restart"
          onClick={restart}
        >
          Restart Arena Battle
        </button>
      </div>
    </div>
  );
});

NexusArenaShooter.displayName = 'NexusArenaShooter';
