import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface ZombieSurvivalMiniRef {
  restart: () => void;
  getScore: () => number;
}

interface ZombieSurvivalMiniProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const ZombieSurvivalMini = forwardRef<ZombieSurvivalMiniRef, ZombieSurvivalMiniProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [barricadeHp, setBarricadeHp] = useState<number>(100);
  const [ammo, setAmmo] = useState<number>(6);
  const [grenades, setGrenades] = useState<number>(2);
  const [wave, setWave] = useState<number>(1);
  const [statusText, setStatusText] = useState<string>('Zombie Outbreak: Guard the perimeter barricade from the undead horde!');
  const [gameState, setGameState] = useState<'DEFENDING' | 'OVERRUN'>('DEFENDING');

  const scoreRef = useRef<number>(initialScore);
  const barricadeRef = useRef<number>(100);
  const zombies = useRef<{ x: number; y: number; hp: number; speed: number }[]>([
    { x: 380, y: 80, hp: 40, speed: 0.6 },
    { x: 380, y: 140, hp: 40, speed: 0.5 },
    { x: 380, y: 200, hp: 60, speed: 0.4 }
  ]);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    barricadeRef.current = 100;
    setScore(0);
    setBarricadeHp(100);
    setAmmo(6);
    setGrenades(2);
    setWave(1);
    setGameState('DEFENDING');
    setStatusText('Outbreak defense restarted! Aim for zombie heads.');
    zombies.current = [
      { x: 380, y: 80, hp: 40, speed: 0.6 },
      { x: 380, y: 140, hp: 40, speed: 0.5 },
      { x: 380, y: 200, hp: 60, speed: 0.4 }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const shootZombie = () => {
    if (gameState !== 'DEFENDING' || ammo <= 0) return;
    setAmmo(a => a - 1);

    // Hit closest zombie
    let closestIdx = -1;
    let minX = 999;
    zombies.current.forEach((z, idx) => {
      if (z.x < minX) {
        minX = z.x;
        closestIdx = idx;
      }
    });

    if (closestIdx !== -1) {
      const target = zombies.current[closestIdx];
      target.hp -= 40;
      setStatusText('💥 BANG! Direct center-mass rifle shot!');
      if (target.hp <= 0) {
        zombies.current.splice(closestIdx, 1);
        const bonus = 120;
        const nextScore = scoreRef.current + bonus;
        updateScore(nextScore);
        setStatusText('🎯 Zombie neutralized! +120 PTS');
      }
    }
  };

  const reloadAmmo = () => {
    if (gameState !== 'DEFENDING') return;
    setAmmo(6);
    setStatusText('🔄 Mag reloaded! 6 rounds chambered.');
  };

  const repairBarricade = () => {
    if (gameState !== 'DEFENDING') return;
    barricadeRef.current = Math.min(100, barricadeRef.current + 25);
    setBarricadeHp(barricadeRef.current);
    setStatusText('🔨 Reinforced timber planks! Barricade repaired.');
  };

  const throwGrenade = () => {
    if (gameState !== 'DEFENDING' || grenades <= 0) return;
    setGrenades(g => g - 1);
    zombies.current = [];
    const bonus = 350;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('💣 BOOM! Frag grenade wiped out the entire wave!');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      // Update Zombies
      zombies.current.forEach(z => {
        if (z.x > 90) {
          z.x -= z.speed;
        } else {
          // Attacking barricade
          barricadeRef.current = Math.max(0, barricadeRef.current - 0.15);
          setBarricadeHp(Math.round(barricadeRef.current));
          if (barricadeRef.current <= 0 && gameState === 'DEFENDING') {
            setGameState('OVERRUN');
            setStatusText(`💀 BARRICADE BREACHED! Survivor outpost overrun. Final Score: ${scoreRef.current}`);
            onGameOver?.(scoreRef.current);
          }
        }
      });

      // Wave Respawn
      if (zombies.current.length === 0 && gameState === 'DEFENDING') {
        setWave(w => {
          const nextWave = w + 1;
          const waveBonus = scoreRef.current + 250;
          updateScore(waveBonus);
          setGrenades(g => g + 1);
          zombies.current = [
            { x: 380, y: 70, hp: 40 + nextWave * 10, speed: 0.6 + nextWave * 0.08 },
            { x: 380, y: 130, hp: 50 + nextWave * 10, speed: 0.5 + nextWave * 0.08 },
            { x: 380, y: 200, hp: 60 + nextWave * 10, speed: 0.4 + nextWave * 0.08 }
          ];
          setStatusText(`🧟 WAVE ${nextWave} APPROACHING! Fresh walker horde spotted!`);
          return nextWave;
        });
      }

      // Draw Dark Foggy Graveyard / Outpost
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // Barricade (Wooden Fence at x = 80)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(75, 40, 12, 180);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(75, 40, 12, 180);

      // Survivor behind barricade
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(45, 130, 10, 0, Math.PI * 2);
      ctx.fill();
      // Gun barrel pointing right
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(45, 130); ctx.lineTo(75, 130);
      ctx.stroke();

      // Draw Zombies (Green Rotten Walkers)
      zombies.current.forEach(z => {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(z.x, z.y, 9, 0, Math.PI * 2);
        ctx.fill();
        // Red glowing eyes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(z.x - 6, z.y - 3, 2, 2);
        ctx.fillRect(z.x - 2, z.y - 3, 2, 2);

        // HP bar above zombie
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(z.x - 10, z.y - 16, 20, 3);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(z.x - 10, z.y - 16, Math.max(0, z.hp * 0.35), 3);
      });

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
          <span>Survival Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Barricade</span>
          <span className={styles.scoreValue} style={{ color: barricadeHp < 30 ? '#ef4444' : '#38bdf8' }}>{barricadeHp}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Ammo</span>
          <span className={styles.scoreValue}>{ammo} / 6</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Grenades</span>
          <span className={styles.scoreValue}>{grenades} 💣</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={260} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '24px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-zombie-shoot"
          onClick={shootZombie}
          disabled={ammo <= 0 || gameState !== 'DEFENDING'}
        >
          💥 Shoot Rifle
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-zombie-reload"
          onClick={reloadAmmo}
          disabled={gameState !== 'DEFENDING'}
        >
          🔄 Reload Mag
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-zombie-barricade"
          onClick={repairBarricade}
          disabled={gameState !== 'DEFENDING'}
        >
          🔨 Repair Gate
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-zombie-grenade"
          onClick={throwGrenade}
          disabled={grenades <= 0 || gameState !== 'DEFENDING'}
        >
          💣 Frag Grenade
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-zombie-restart"
          onClick={restart}
        >
          Restart Outbreak Run
        </button>
      </div>
    </div>
  );
});

ZombieSurvivalMini.displayName = 'ZombieSurvivalMini';
