import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TowerDefenseLite.module.css';

export interface SpaceDefenseLaserRef {
  restart: () => void;
  getScore: () => number;
}

interface SpaceDefenseLaserProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Meteorite {
  id: number;
  x: number;
  y: number;
  speed: number;
  radius: number;
  angle: number;
}

export const SpaceDefenseLaser = forwardRef<SpaceDefenseLaserRef, SpaceDefenseLaserProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [planetHp, setPlanetHp] = useState<number>(100);
  const [wave, setWave] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const hpRef = useRef<number>(100);
  const waveRef = useRef<number>(1);
  const turretAngleRef = useRef<number>(-Math.PI / 2);
  const runningRef = useRef<boolean>(true);

  const meteoritesRef = useRef<Meteorite[]>([]);
  const beamRef = useRef<{ active: boolean; angle: number; ticks: number }>({ active: false, angle: 0, ticks: 0 });
  const nextSpawnRef = useRef<number>(45);
  const nextIdRef = useRef<number>(1);

  const rotateTurret = useCallback((dir: 'CCW' | 'CW') => {
    if (gameOver) return;
    const delta = dir === 'CCW' ? -0.16 : 0.16;
    turretAngleRef.current += delta;
  }, [gameOver]);

  const fireBeam = useCallback(() => {
    if (gameOver || beamRef.current.active) return;
    const ang = turretAngleRef.current;
    beamRef.current = { active: true, angle: ang, ticks: 8 };

    // Raycast hit detection against all meteorites within 0.15 rad of beam angle
    const CENTER_X = 180;
    const CENTER_Y = 240;

    for (let i = meteoritesRef.current.length - 1; i >= 0; i--) {
      const m = meteoritesRef.current[i];
      const mAngle = Math.atan2(m.y - CENTER_Y, m.x - CENTER_X);
      let diff = Math.abs(ang - mAngle);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

      if (diff < 0.22) {
        // Vaporized!
        scoreRef.current += 30;
        setScore(scoreRef.current);
        if (onScoreUpdate) onScoreUpdate(scoreRef.current);
        meteoritesRef.current.splice(i, 1);
      }
    }
  }, [gameOver, onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    hpRef.current = 100;
    waveRef.current = 1;
    turretAngleRef.current = -Math.PI / 2;
    meteoritesRef.current = [];
    beamRef.current = { active: false, angle: 0, ticks: 0 };
    setScore(0);
    setPlanetHp(100);
    setWave(1);
    setGameOver(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') rotateTurret('CCW');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rotateTurret('CW');
      if (e.key === ' ' || e.key === 'f' || e.key === 'F') fireBeam();
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (gameOver) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      turretAngleRef.current = Math.atan2(clickY - 240, clickX - 180);
      fireBeam();
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleCanvasClick);

    const CENTER_X = 180;
    const CENTER_Y = 240;
    const PLANET_RADIUS = 36;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space backdrop
      ctx.fillStyle = '#060B19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Defense perimeter orbit circle
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, 140, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!gameOver) {
        // Spawn meteorites
        nextSpawnRef.current -= 1;
        if (nextSpawnRef.current <= 0) {
          nextSpawnRef.current = Math.max(22, 50 - Math.floor(scoreRef.current / 350));
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnDist = 260;
          meteoritesRef.current.push({
            id: nextIdRef.current++,
            x: CENTER_X + Math.cos(spawnAngle) * spawnDist,
            y: CENTER_Y + Math.sin(spawnAngle) * spawnDist,
            speed: 1.2 + Math.random() * 0.9,
            radius: 9,
            angle: spawnAngle
          });
        }

        // Update meteorites
        for (let i = meteoritesRef.current.length - 1; i >= 0; i--) {
          const m = meteoritesRef.current[i];
          const distToCenter = Math.hypot(m.x - CENTER_X, m.y - CENTER_Y);
          const moveAngle = Math.atan2(CENTER_Y - m.y, CENTER_X - m.x);

          m.x += Math.cos(moveAngle) * m.speed;
          m.y += Math.sin(moveAngle) * m.speed;

          // Planetary impact
          if (distToCenter <= PLANET_RADIUS + m.radius) {
            hpRef.current = Math.max(0, hpRef.current - 15);
            setPlanetHp(hpRef.current);
            meteoritesRef.current.splice(i, 1);

            if (hpRef.current <= 0) {
              setGameOver(true);
              if (onGameOver) onGameOver(scoreRef.current);
              break;
            }
          }
        }

        // Laser beam decay
        if (beamRef.current.active) {
          beamRef.current.ticks -= 1;
          if (beamRef.current.ticks <= 0) {
            beamRef.current.active = false;
          }
        }
      }

      // Draw Laser Beam
      if (beamRef.current.active) {
        const bAng = beamRef.current.angle;
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(CENTER_X, CENTER_Y);
        ctx.lineTo(CENTER_X + Math.cos(bAng) * 320, CENTER_Y + Math.sin(bAng) * 320);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw Meteorites
      for (const m of meteoritesRef.current) {
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw Planet (Colony Home)
      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, PLANET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hpRef.current > 40 ? '#38BDF8' : '#F43F5E';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Atmospheric glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Draw Laser Turret at Center
      ctx.save();
      ctx.translate(CENTER_X, CENTER_Y);
      ctx.rotate(turretAngleRef.current);

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Turret barrel
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(0, -3.5, 26, 7);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, -3.5, 26, 7);

      ctx.restore();

      if (runningRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [fireBeam, gameOver, onGameOver, onScoreUpdate, rotateTurret]);

  return (
    <div className={styles.container} id="game-space-defense-laser">
      <div className={styles.scoreboard} id="space-defense-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-space-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>PLANET INTEGRITY</span>
          <span className={styles.value} id="score-space-hp">{planetHp}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SECTOR</span>
          <span className={styles.value} id="score-space-sector">ORBITAL</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-space-defense-laser"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="space-defense-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-space-rot-ccw"
          onClick={() => rotateTurret('CCW')}
        >
          ↺ Rotate CCW
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-space-fire-beam"
          onClick={fireBeam}
        >
          ⚡ Fire Laser Beam
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-space-rot-cw"
          onClick={() => rotateTurret('CW')}
        >
          Rotate CW ↻
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="space-defense-gameover">
          <h3 className={styles.overlayTitle}>ATMOSPHERIC BREACH — COLONY LOST</h3>
          <p className={styles.overlayText}>
            Final Defense Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-space-defense-restart"
            onClick={restart}
          >
            Re-establish Planetary Grid
          </button>
        </div>
      )}
    </div>
  );
});

SpaceDefenseLaser.displayName = 'SpaceDefenseLaser';
