import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface ResourceDefenseRef {
  restart: () => void;
  getScore: () => number;
}

interface ResourceDefenseProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const ResourceDefense = forwardRef<ResourceDefenseRef, ResourceDefenseProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [minerals, setMinerals] = useState<number>(120);
  const [coreHp, setCoreHp] = useState<number>(100);
  const [turrets, setTurrets] = useState<number>(1);
  const [barricades, setBarricades] = useState<number>(2);
  const [wave, setWave] = useState<number>(1);
  const [score, setScore] = useState<number>(initialScore);
  const [status, setStatus] = useState<string>('Extract crystal minerals and construct defensive turrets!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const aliensRef = useRef<{ x: number; y: number; speed: number; hp: number }[]>([
    { x: 30, y: 20, speed: 1.0, hp: 20 },
    { x: 330, y: 30, speed: 1.1, hp: 20 }
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setMinerals(120);
    setCoreHp(100);
    setTurrets(1);
    setBarricades(2);
    setWave(1);
    setStatus('Extract crystal minerals and construct defensive turrets!');
    aliensRef.current = [
      { x: 30, y: 20, speed: 1.0, hp: 20 },
      { x: 330, y: 30, speed: 1.1, hp: 20 }
    ];
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const mineCrystals = useCallback(() => {
    setMinerals(m => m + 35);
    updateScore(scoreRef.current + 15);
    setStatus('💎 Fast extraction burst! +35 Minerals collected.');
  }, [updateScore]);

  const buildTurret = useCallback(() => {
    if (minerals < 100) {
      setStatus('Requires 100 minerals to build Laser Turret! Mine more crystals.');
      return;
    }
    setMinerals(m => m - 100);
    setTurrets(t => t + 1);
    updateScore(scoreRef.current + 50);
    setStatus('⚡ Automated Laser Turret operational! Perimeter firepower augmented.');
  }, [minerals, updateScore]);

  const buildBarricade = useCallback(() => {
    if (minerals < 50) {
      setStatus('Requires 50 minerals to erect Kinetic Barricade!');
      return;
    }
    setMinerals(m => m - 50);
    setBarricades(b => b + 1);
    updateScore(scoreRef.current + 25);
    setStatus('🛡️ Kinetic Barricade reinforced! Core absorbing capacity increased.');
  }, [minerals, updateScore]);

  const upgradeCore = useCallback(() => {
    if (minerals < 150) {
      setStatus('Requires 150 minerals for Core Shield Overcharge!');
      return;
    }
    setMinerals(m => m - 150);
    setCoreHp(h => Math.min(100, h + 30));
    updateScore(scoreRef.current + 80);
    setStatus('🔋 Core Generator shields recharged +30%!');
  }, [minerals, updateScore]);

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

      // Alien planetary ground
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, W, H);

      // Central Base Core (Cyan glowing dome)
      const coreX = W / 2;
      const coreY = H - 45;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(coreX, coreY, 26, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(coreX, coreY, 16, Math.PI, 0);
      ctx.fill();

      // Kinetic Barricades
      ctx.fillStyle = '#64748b';
      for (let i = 0; i < barricades; i++) {
        const bx = coreX - 60 + i * 30;
        ctx.fillRect(bx, coreY - 20, 20, 8);
      }

      // Laser Turrets
      for (let i = 0; i < turrets; i++) {
        const tx = coreX - 70 + (i % 2 === 0 ? -25 : 85);
        const ty = coreY - 15;
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(tx - 6, ty - 6, 12, 12);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx, ty - 14);
        ctx.stroke();

        // Turret auto-firing laser beam at first alien
        const aliens = aliensRef.current;
        if (aliens.length > 0 && frame % 15 === 0) {
          const target = aliens[0];
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty - 14);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          target.hp -= 8;
        }
      }

      // Update Alien Creeps
      const aliens = aliensRef.current;
      for (let i = aliens.length - 1; i >= 0; i--) {
        const a = aliens[i];
        // Move toward core
        const angle = Math.atan2(coreY - a.y, coreX - a.x);
        a.x += Math.cos(angle) * a.speed;
        a.y += Math.sin(angle) * a.speed;

        // Death check
        if (a.hp <= 0) {
          aliens.splice(i, 1);
          setMinerals(m => m + 20); // Creeps drop minerals
          updateScore(scoreRef.current + 30);
          continue;
        }

        // Core impact check
        if (Math.hypot(coreX - a.x, coreY - a.y) < 30) {
          aliens.splice(i, 1);
          setCoreHp(h => {
            const next = Math.max(0, h - 10);
            if (next <= 0) setStatus('BASE OVERRUN! Mining colony breached.');
            return next;
          });
          continue;
        }

        // Draw Alien Creep (Bio-chitin purple beetle)
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(a.x, a.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Wave respawn
      if (aliens.length === 0) {
        setWave(w => w + 1);
        for (let k = 0; k < 3; k++) {
          aliens.push({
            x: Math.random() * (W - 60) + 30,
            y: 20 + Math.random() * 30,
            speed: 1.1 + Math.random() * 0.4,
            hp: 25
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [barricades, turrets, updateScore]);

  return (
    <div className={styles.container} id="resource-defense-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Defense Score</span>
          <span className={styles.scoreValue} id="res-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Minerals</span>
          <span className={styles.scoreValue} style={{ color: '#38bdf8' }}>💎 {minerals}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Core Shield</span>
          <span className={styles.scoreValue} style={{ color: coreHp < 30 ? '#ef4444' : '#10b981' }}>
            {coreHp}%
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Turrets</span>
          <span className={styles.scoreValue}>{turrets}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="res-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-res-mine"
          onClick={mineCrystals}
        >
          ⛏️ Mine (+35)
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-res-build-turret"
          onClick={buildTurret}
        >
          ⚡ Laser Turret (100)
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-res-build-wall"
          onClick={buildBarricade}
        >
          🛡️ Barricade (50)
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-res-upgrade-core"
          onClick={upgradeCore}
        >
          🔋 Shield Boost (150)
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-res-restart"
          onClick={restart}
        >
          Re-establish Base Camp
        </button>
      </div>
    </div>
  );
});

ResourceDefense.displayName = 'ResourceDefense';
