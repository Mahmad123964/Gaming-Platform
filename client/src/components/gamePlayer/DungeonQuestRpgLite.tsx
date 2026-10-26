import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface DungeonQuestRpgLiteRef {
  restart: () => void;
  getScore: () => number;
}

interface DungeonQuestRpgLiteProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const DungeonQuestRpgLite = forwardRef<DungeonQuestRpgLiteRef, DungeonQuestRpgLiteProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [heroHp, setHeroHp] = useState<number>(100);
  const [heroMana, setHeroMana] = useState<number>(50);
  const [floor, setFloor] = useState<number>(1);
  const [enemyHp, setEnemyHp] = useState<number>(60);
  const [statusText, setStatusText] = useState<string>('Dungeon Depths: A ferocious Skeleton Guard blocks the corridor!');
  const [gameState, setGameState] = useState<'COMBAT' | 'LOOT' | 'VICTORY' | 'DEFEATED'>('COMBAT');

  const scoreRef = useRef<number>(initialScore);
  const hpRef = useRef<number>(100);
  const manaRef = useRef<number>(50);
  const eHpRef = useRef<number>(60);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    hpRef.current = 100;
    manaRef.current = 50;
    eHpRef.current = 60;
    setScore(0);
    setHeroHp(100);
    setHeroMana(50);
    setFloor(1);
    setEnemyHp(60);
    setGameState('COMBAT');
    setStatusText('Dungeon expedition restarted! Draw your sword.');
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const swordAttack = () => {
    if (gameState !== 'COMBAT') return;
    const dmg = 25 + Math.floor(Math.random() * 10);
    const newEhp = Math.max(0, eHpRef.current - dmg);
    eHpRef.current = newEhp;
    setEnemyHp(newEhp);
    setStatusText(`⚔️ Steel blade slash dealt ${dmg} physical damage!`);

    if (newEhp <= 0) {
      handleEnemyDefeated();
    } else {
      enemyTurn();
    }
  };

  const castFireball = () => {
    if (gameState !== 'COMBAT' || manaRef.current < 20) return;
    manaRef.current -= 20;
    setHeroMana(manaRef.current);
    const dmg = 45 + Math.floor(Math.random() * 15);
    const newEhp = Math.max(0, eHpRef.current - dmg);
    eHpRef.current = newEhp;
    setEnemyHp(newEhp);
    setStatusText(`🔥 INCINERATE! Blazing fireball detonated for ${dmg} magical damage!`);

    if (newEhp <= 0) {
      handleEnemyDefeated();
    } else {
      enemyTurn();
    }
  };

  const holyHeal = () => {
    if (gameState !== 'COMBAT' || manaRef.current < 15) return;
    manaRef.current -= 15;
    setHeroMana(manaRef.current);
    hpRef.current = Math.min(100, hpRef.current + 35);
    setHeroHp(hpRef.current);
    setStatusText('✨ Holy divine prayer restored +35 Health!');
    enemyTurn();
  };

  const enemyTurn = () => {
    setTimeout(() => {
      const eDmg = 12 + Math.floor(Math.random() * 8);
      const newHp = Math.max(0, hpRef.current - eDmg);
      hpRef.current = newHp;
      setHeroHp(newHp);
      setStatusText(`⚠️ Enemy counter-attack strikes for ${eDmg} damage!`);
      if (newHp <= 0) {
        setGameState('DEFEATED');
        setStatusText(`💀 SLOCK! Slain in the dark dungeon. Final Score: ${scoreRef.current}`);
        onGameOver?.(scoreRef.current);
      }
    }, 600);
  };

  const handleEnemyDefeated = () => {
    const killBonus = 150 + floor * 50;
    const nextScore = scoreRef.current + killBonus;
    updateScore(nextScore);
    setGameState('LOOT');
    setStatusText(`💀 Monster vanquished! A treasure chest appears! Tap Loot.`);
  };

  const lootChest = () => {
    if (gameState !== 'LOOT') return;
    const goldBonus = 100;
    const nextScore = scoreRef.current + goldBonus;
    updateScore(nextScore);
    manaRef.current = Math.min(50, manaRef.current + 25);
    setHeroMana(manaRef.current);

    setFloor(fl => {
      const nextFl = fl + 1;
      if (nextFl > 5) {
        setGameState('VICTORY');
        setStatusText(`🏆 DUNGEON CONQUERED! Ancient Lich defeated! Score: ${nextScore}`);
        onGameOver?.(nextScore);
      } else {
        setGameState('COMBAT');
        const nextEhp = 60 + nextFl * 20;
        eHpRef.current = nextEhp;
        setEnemyHp(nextEhp);
        setStatusText(`🪜 Descended to Floor ${nextFl}! A stronger fiend emerges!`);
      }
      return nextFl;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      // Dark Stone Dungeon Chamber
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // Stone Wall Cobblestone blocks
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 400; x += 40) {
        for (let y = 0; y <= 160; y += 20) {
          ctx.strokeRect(x, y, 40, 20);
        }
      }

      // Torches on walls
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(80, 80, 6, 0, Math.PI * 2);
      ctx.arc(320, 80, 6, 0, Math.PI * 2);
      ctx.fill();

      // Floor cobblestones (dark slate)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 160, 400, 100);

      // Draw Hero Knight (Left side)
      ctx.fillStyle = '#38bdf8'; // Blue armor
      ctx.fillRect(70, 160, 24, 40);
      ctx.fillStyle = '#f8fafc'; // Silver helmet
      ctx.fillRect(72, 144, 20, 16);
      // Sword
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(94, 180); ctx.lineTo(116, 165);
      ctx.stroke();

      // Draw Enemy (Right side)
      if (gameState === 'COMBAT') {
        ctx.fillStyle = '#ef4444'; // Red Skeleton / Fiend
        ctx.fillRect(300, 160, 26, 40);
        ctx.fillStyle = '#fef08a'; // Glowing eyes
        ctx.fillRect(304, 166, 4, 4);
        ctx.fillRect(316, 166, 4, 4);

        // Enemy HP Bar
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(290, 136, 46, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(290, 136, Math.max(0, (eHpRef.current / (60 + floor * 20)) * 46), 6);
      } else if (gameState === 'LOOT') {
        // Treasure Chest
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(295, 175, 36, 25);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(292, 170, 42, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(311, 182, 4, 6); // Keyhole
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [floor, gameState]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>RPG Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Hero HP</span>
          <span className={styles.scoreValue} style={{ color: heroHp < 30 ? '#ef4444' : '#38bdf8' }}>{heroHp} / 100</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Mana</span>
          <span className={styles.scoreValue} style={{ color: '#a855f7' }}>{heroMana} MP</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Floor</span>
          <span className={styles.scoreValue}>F{floor} / 5</span>
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
          id="btn-dungeon-attack"
          onClick={swordAttack}
          disabled={gameState !== 'COMBAT'}
        >
          ⚔️ Sword Slash
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-dungeon-fireball"
          onClick={castFireball}
          disabled={heroMana < 20 || gameState !== 'COMBAT'}
        >
          🔥 Fireball (20 MP)
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-dungeon-heal"
          onClick={holyHeal}
          disabled={heroMana < 15 || gameState !== 'COMBAT'}
        >
          ✨ Holy Heal (15 MP)
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-dungeon-loot"
          onClick={lootChest}
          disabled={gameState !== 'LOOT'}
        >
          💎 Open Chest
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-dungeon-restart"
          onClick={restart}
        >
          Restart Dungeon Descent
        </button>
      </div>
    </div>
  );
});

DungeonQuestRpgLite.displayName = 'DungeonQuestRpgLite';
