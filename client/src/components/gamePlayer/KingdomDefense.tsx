import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface KingdomDefenseRef {
  restart: () => void;
  getScore: () => number;
}

interface KingdomDefenseProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const KingdomDefense = forwardRef<KingdomDefenseRef, KingdomDefenseProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [gold, setGold] = useState<number>(120);
  const [wallHp, setWallHp] = useState<number>(200);
  const [archers, setArchers] = useState<number>(2);
  const [wave, setWave] = useState<number>(1);
  const [statusText, setStatusText] = useState<string>('Kingdom Defense: Siege invaders march upon the royal fortress! Deploy archers.');
  const [gameState, setGameState] = useState<'DEFENDING' | 'FORTRESS_FALLEN'>('DEFENDING');

  const scoreRef = useRef<number>(initialScore);
  const goldRef = useRef<number>(120);
  const wallHpRef = useRef<number>(200);
  const archersRef = useRef<number>(2);
  const invaders = useRef<{ x: number; y: number; hp: number; speed: number }[]>([
    { x: 380, y: 110, hp: 50, speed: 0.5 },
    { x: 380, y: 170, hp: 80, speed: 0.4 },
    { x: 380, y: 220, hp: 40, speed: 0.6 }
  ]);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    goldRef.current = 120;
    wallHpRef.current = 200;
    archersRef.current = 2;
    setScore(0);
    setGold(120);
    setWallHp(200);
    setArchers(2);
    setWave(1);
    setGameState('DEFENDING');
    setStatusText('Kingdom defense restarted! Fortify battlements.');
    invaders.current = [
      { x: 380, y: 110, hp: 50, speed: 0.5 },
      { x: 380, y: 170, hp: 80, speed: 0.4 },
      { x: 380, y: 220, hp: 40, speed: 0.6 }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const hireArcher = () => {
    if (gameState !== 'DEFENDING' || goldRef.current < 50) return;
    goldRef.current -= 50;
    setGold(goldRef.current);
    archersRef.current += 1;
    setArchers(archersRef.current);
    setStatusText('🏹 Longbow archer stationed on castle parapet!');
  };

  const fireCatapult = () => {
    if (gameState !== 'DEFENDING' || goldRef.current < 70) return;
    goldRef.current -= 70;
    setGold(goldRef.current);
    invaders.current.forEach(inv => {
      inv.hp -= 70;
    });
    invaders.current = invaders.current.filter(inv => inv.hp > 0);
    const bonus = 200;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('💥 BOULDER CATAPULT! Devastating siege explosion!');
  };

  const repairWall = () => {
    if (gameState !== 'DEFENDING' || goldRef.current < 40) return;
    goldRef.current -= 40;
    setGold(goldRef.current);
    wallHpRef.current = Math.min(200, wallHpRef.current + 60);
    setWallHp(wallHpRef.current);
    setStatusText('🔨 Masons reconstructed damaged stone ramparts (+60 HP).');
  };

  const upgradeFortress = () => {
    if (gameState !== 'DEFENDING' || goldRef.current < 80) return;
    goldRef.current -= 80;
    setGold(goldRef.current);
    wallHpRef.current += 50;
    setWallHp(wallHpRef.current);
    const bonus = 150;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('🏰 Iron-reinforced portcullis installed! (+50 Max HP, +150 PTS)');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      // Archer volley auto-attack
      if (Math.random() < archersRef.current * 0.03 && invaders.current.length > 0) {
        const target = invaders.current[0];
        target.hp -= 25;
        if (target.hp <= 0) {
          invaders.current.shift();
          goldRef.current += 30;
          setGold(goldRef.current);
          const killBonus = 80;
          const nextScore = scoreRef.current + killBonus;
          updateScore(nextScore);
          setStatusText('🎯 Arrow pierced siege soldier! +30 Gold, +80 PTS');
        }
      }

      // Invaders march forward
      invaders.current.forEach(inv => {
        if (inv.x > 95) {
          inv.x -= inv.speed;
        } else {
          // Battering ram attack on wall
          wallHpRef.current = Math.max(0, wallHpRef.current - 0.2);
          setWallHp(Math.round(wallHpRef.current));
          if (wallHpRef.current <= 0 && gameState === 'DEFENDING') {
            setGameState('FORTRESS_FALLEN');
            setStatusText(`💀 CASTLE OVERRUN! The kingdom has fallen. Final Score: ${scoreRef.current}`);
            onGameOver?.(scoreRef.current);
          }
        }
      });

      // Wave Respawn
      if (invaders.current.length === 0 && gameState === 'DEFENDING') {
        setWave(w => {
          const nextWave = w + 1;
          const waveBonus = scoreRef.current + 250;
          updateScore(waveBonus);
          goldRef.current += 75;
          setGold(goldRef.current);
          invaders.current = [
            { x: 380, y: 100, hp: 50 + nextWave * 15, speed: 0.5 + nextWave * 0.05 },
            { x: 380, y: 160, hp: 80 + nextWave * 20, speed: 0.4 + nextWave * 0.05 },
            { x: 380, y: 220, hp: 40 + nextWave * 15, speed: 0.6 + nextWave * 0.05 }
          ];
          setStatusText(`⚔️ SIEGE WAVE ${nextWave} DESCENDING! +75 Gold treasury bonus.`);
          return nextWave;
        });
      }

      // Draw Green Meadow Battlefield
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, 400, 260);

      // Castle Wall & Towers (Left side at x = 80)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(40, 40, 50, 190);
      // Battlements
      ctx.fillStyle = '#475569';
      for (let y = 40; y < 230; y += 30) {
        ctx.fillRect(80, y, 15, 18);
      }

      // Royal Banner (Gold Lion on Blue)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(50, 50, 20, 28);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(60, 64, 5, 0, Math.PI * 2);
      ctx.fill();

      // Archers stationed on wall
      ctx.fillStyle = '#38bdf8';
      for (let i = 0; i < Math.min(5, archersRef.current); i++) {
        ctx.beginPath();
        ctx.arc(65, 80 + i * 28, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Invaders (Red Armored Orcs/Siege Soldiers)
      invaders.current.forEach(inv => {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(inv.x - 8, inv.y - 12, 16, 24);
        ctx.fillStyle = '#f87171';
        ctx.fillRect(inv.x - 6, inv.y - 8, 12, 6); // Helmet visor

        // Battering Ram / Weapon
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(inv.x - 14, inv.y); ctx.lineTo(inv.x - 2, inv.y);
        ctx.stroke();

        // HP bar above invader
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(inv.x - 10, inv.y - 18, 20, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(inv.x - 10, inv.y - 18, Math.max(0, inv.hp * 0.2), 3);
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
          <span>Defense Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Treasury</span>
          <span className={styles.scoreValue} style={{ color: '#eab308' }}>{gold} Gold</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Wall HP</span>
          <span className={styles.scoreValue} style={{ color: wallHp < 50 ? '#ef4444' : '#38bdf8' }}>{wallHp} HP</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Archers</span>
          <span className={styles.scoreValue}>{archers} Bows</span>
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
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-kingdom-hire-archer"
          onClick={hireArcher}
          disabled={gold < 50 || gameState !== 'DEFENDING'}
        >
          🏹 Archer (50G)
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-kingdom-catapult"
          onClick={fireCatapult}
          disabled={gold < 70 || gameState !== 'DEFENDING'}
        >
          💥 Catapult (70G)
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-kingdom-repair"
          onClick={repairWall}
          disabled={gold < 40 || gameState !== 'DEFENDING'}
        >
          🔨 Repair (40G)
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-kingdom-upgrade-wall"
          onClick={upgradeFortress}
          disabled={gold < 80 || gameState !== 'DEFENDING'}
        >
          🏰 Fortify (80G)
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-kingdom-restart"
          onClick={restart}
        >
          Restart Siege Defense
        </button>
      </div>
    </div>
  );
});

KingdomDefense.displayName = 'KingdomDefense';
