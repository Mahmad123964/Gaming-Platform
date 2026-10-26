import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface SpaceExplorationMissionRef {
  restart: () => void;
  getScore: () => number;
}

interface SpaceExplorationMissionProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const SpaceExplorationMission = forwardRef<SpaceExplorationMissionRef, SpaceExplorationMissionProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [fuel, setFuel] = useState<number>(100);
  const [sector, setSector] = useState<number>(1);
  const [minerals, setMinerals] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Deep Space Odyssey: Scan sectors, mine asteroids, navigate gravitational orbits!');
  const [gameState, setGameState] = useState<'EXPLORING' | 'FUEL_DEPLETED' | 'MISSION_COMPLETE'>('EXPLORING');

  const scoreRef = useRef<number>(initialScore);
  const ship = useRef({ x: 200, y: 150, vx: 0, vy: 0, angle: -Math.PI / 2 });
  const asteroids = useRef<{ x: number; y: number; radius: number; minerals: number; mined: boolean }[]>([
    { x: 80, y: 70, radius: 18, minerals: 50, mined: false },
    { x: 310, y: 80, radius: 24, minerals: 80, mined: false },
    { x: 160, y: 220, radius: 15, minerals: 40, mined: false }
  ]);
  const stars = useRef<{ x: number; y: number; r: number }[]>(
    Array.from({ length: 40 }, () => ({ x: Math.random() * 400, y: Math.random() * 260, r: Math.random() * 1.5 + 0.5 }))
  );
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setFuel(100);
    setSector(1);
    setMinerals(0);
    setGameState('EXPLORING');
    setStatusText('Space exploration mission restarted! Engage ion thrusters.');
    ship.current = { x: 200, y: 150, vx: 0, vy: 0, angle: -Math.PI / 2 };
    asteroids.current = [
      { x: 80, y: 70, radius: 18, minerals: 50, mined: false },
      { x: 310, y: 80, radius: 24, minerals: 80, mined: false },
      { x: 160, y: 220, radius: 15, minerals: 40, mined: false }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const thrust = () => {
    if (gameState !== 'EXPLORING') return;
    const s = ship.current;
    s.vx += Math.cos(s.angle) * 1.6;
    s.vy += Math.sin(s.angle) * 1.6;
    setFuel(f => {
      const next = Math.max(0, f - 4);
      if (next <= 0) {
        setGameState('FUEL_DEPLETED');
        setStatusText(`⚠️ Stranded in the void! Fuel depleted. Final Score: ${scoreRef.current}`);
        onGameOver?.(scoreRef.current);
      }
      return next;
    });
    setStatusText('🚀 Ion thrusters firing! Accelerating vector.');
  };

  const scanSector = () => {
    if (gameState !== 'EXPLORING') return;
    const bonus = 40;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('📡 Long-range sensor telemetry: High-density titanium asteroids detected! +40 PTS');
  };

  const fireMiningLaser = () => {
    if (gameState !== 'EXPLORING') return;
    const s = ship.current;
    let hit = false;
    asteroids.current.forEach(a => {
      if (!a.mined && Math.hypot(s.x - a.x, s.y - a.y) < a.radius + 60) {
        a.mined = true;
        hit = true;
        setMinerals(m => m + a.minerals);
        setFuel(f => Math.min(100, f + 15)); // Fuel refined from asteroid water ice
        const bonus = a.minerals * 2;
        const nextScore = scoreRef.current + bonus;
        updateScore(nextScore);
        setStatusText(`💎 Asteroid core excavated! +${a.minerals} Minerals (+${bonus} PTS, +15% Refined Fuel)`);
      }
    });

    if (!hit) {
      setStatusText('Mining laser beamed into open vacuum. Approach closer to an asteroid.');
    }
  };

  const jumpWarp = () => {
    if (gameState !== 'EXPLORING') return;
    setSector(sec => {
      const nextSec = sec + 1;
      const warpBonus = scoreRef.current + 300;
      updateScore(warpBonus);
      setFuel(f => Math.min(100, f + 20));
      asteroids.current = [
        { x: 50 + Math.random() * 80, y: 50 + Math.random() * 80, radius: 18, minerals: 60, mined: false },
        { x: 260 + Math.random() * 80, y: 60 + Math.random() * 80, radius: 22, minerals: 90, mined: false },
        { x: 150 + Math.random() * 100, y: 180 + Math.random() * 50, radius: 16, minerals: 50, mined: false }
      ];
      ship.current = { x: 200, y: 150, vx: 0, vy: 0, angle: -Math.PI / 2 };
      setStatusText(`🌌 HYPERSPACE WARP COMPLETE! Reached Sector ${nextSec}! +300 PTS`);
      if (nextSec >= 4) {
        setGameState('MISSION_COMPLETE');
        setStatusText(`🏆 GALAXY EXPLORED! Starfleet Mission Victorious! Final Score: ${warpBonus}`);
        onGameOver?.(warpBonus);
      }
      return nextSec;
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

      const s = ship.current;
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.985; // Inertial dampening
      s.vy *= 0.985;

      // Screen wrapping
      if (s.x < 10) s.x = 390;
      if (s.x > 390) s.x = 10;
      if (s.y < 10) s.y = 250;
      if (s.y > 250) s.y = 10;

      // Draw Deep Space (Dark Void + Nebula glow)
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, 400, 260);

      // Starfield
      ctx.fillStyle = '#ffffff';
      stars.current.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Asteroids
      asteroids.current.forEach(a => {
        ctx.fillStyle = a.mined ? '#334155' : '#78716c';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = a.mined ? '#475569' : '#00F0FF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (!a.mined) {
          // Mineral sparkle
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(a.x - 4, a.y - 4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Spaceship (Sleek Explorer craft)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);

      // Ship body
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();

      // Cockpit
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(2, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Mission Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Ion Fuel</span>
          <span className={styles.scoreValue} style={{ color: fuel < 25 ? '#ef4444' : '#38bdf8' }}>{fuel}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Sector</span>
          <span className={styles.scoreValue}>S{sector}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Minerals</span>
          <span className={styles.scoreValue}>{minerals} KG</span>
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
          id="btn-space-thrust"
          onClick={thrust}
          disabled={gameState !== 'EXPLORING'}
        >
          🚀 Thrust
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-space-scan"
          onClick={scanSector}
          disabled={gameState !== 'EXPLORING'}
        >
          📡 Sensor Scan
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-space-laser"
          onClick={fireMiningLaser}
          disabled={gameState !== 'EXPLORING'}
        >
          💎 Mine Asteroid
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-space-warp"
          onClick={jumpWarp}
          disabled={gameState !== 'EXPLORING'}
        >
          🌌 Warp Jump
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-space-restart"
          onClick={restart}
        >
          Restart Deep Space Expedition
        </button>
      </div>
    </div>
  );
});

SpaceExplorationMission.displayName = 'SpaceExplorationMission';
