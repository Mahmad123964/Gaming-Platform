import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './NeonHorizonRacer.module.css';

export interface SunsetDriftRef {
  restart: () => void;
  getScore: () => number;
}

interface SunsetDriftProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface TrafficCar {
  id: number;
  x: number; // -1 to 1 (road offset)
  z: number; // distance ahead (0 to 1000)
  speed: number;
  color: string;
}

export const SunsetDrift = forwardRef<SunsetDriftRef, SunsetDriftProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [speedMph, setSpeedMph] = useState<number>(85);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [turboActive, setTurboActive] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const speedRef = useRef<number>(85);
  const distRef = useRef<number>(0);
  const playerXRef = useRef<number>(0); // -1 (left edge) to 1 (right edge)
  const curveRef = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  const trafficRef = useRef<TrafficCar[]>([]);
  const nextSpawnRef = useRef<number>(40);
  const nextIdRef = useRef<number>(1);

  const steer = useCallback((dir: 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    if (dir === 'LEFT') playerXRef.current = Math.max(-0.85, playerXRef.current - 0.12);
    if (dir === 'RIGHT') playerXRef.current = Math.min(0.85, playerXRef.current + 0.12);
  }, [gameOver]);

  const toggleTurbo = useCallback(() => {
    if (gameOver) return;
    setTurboActive(prev => {
      const next = !prev;
      speedRef.current = next ? 135 : 85;
      setSpeedMph(speedRef.current);
      return next;
    });
  }, [gameOver]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    speedRef.current = 85;
    distRef.current = 0;
    playerXRef.current = 0;
    trafficRef.current = [];
    setScore(0);
    setSpeedMph(85);
    setDistanceKm(0);
    setTurboActive(false);
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
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') steer('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') steer('RIGHT');
      if (e.key === ' ' || e.key === 'ArrowUp') toggleTurbo();
    };

    window.addEventListener('keydown', handleKeyDown);

    let roadOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Synthwave Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 220);
      skyGrad.addColorStop(0, '#1E1B4B');
      skyGrad.addColorStop(0.6, '#4C1D95');
      skyGrad.addColorStop(1, '#BE185D');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 220);

      // Neon Setting Sun
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(180, 160, 48, 0, Math.PI * 2);
      ctx.fill();

      // Sun horizontal synth bars
      ctx.fillStyle = '#BE185D';
      for (let y = 140; y <= 200; y += 8) {
        ctx.fillRect(130, y, 100, 3);
      }

      // Ground / Desert Grid
      ctx.fillStyle = '#0F0E17';
      ctx.fillRect(0, 220, canvas.width, 260);

      // Curving road perspective
      curveRef.current = Math.sin(roadOffset * 0.005) * 40;

      const horizonY = 220;
      const bottomY = 480;

      // Draw road segments
      ctx.fillStyle = '#18181B';
      ctx.beginPath();
      ctx.moveTo(150 + curveRef.current, horizonY);
      ctx.lineTo(210 + curveRef.current, horizonY);
      ctx.lineTo(340, bottomY);
      ctx.lineTo(20, bottomY);
      ctx.closePath();
      ctx.fill();

      // Road border stripes
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(150 + curveRef.current, horizonY);
      ctx.lineTo(20, bottomY);
      ctx.moveTo(210 + curveRef.current, horizonY);
      ctx.lineTo(340, bottomY);
      ctx.stroke();

      // Center dashed road markings
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 16]);
      ctx.beginPath();
      ctx.moveTo(180 + curveRef.current, horizonY);
      ctx.lineTo(180, bottomY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!gameOver) {
        roadOffset += speedRef.current * 0.08;
        distRef.current += speedRef.current * 0.001;
        setDistanceKm(Math.round(distRef.current * 10) / 10);

        scoreRef.current += Math.round(speedRef.current * 0.05);
        setScore(scoreRef.current);
        if (onScoreUpdate) onScoreUpdate(scoreRef.current);

        // Spawn traffic cars
        nextSpawnRef.current -= 1;
        if (nextSpawnRef.current <= 0) {
          nextSpawnRef.current = Math.max(25, 50 - Math.floor(scoreRef.current / 300));
          const spawnX = (Math.random() * 1.4 - 0.7);
          const colors = ['#00F0FF', '#EAB308', '#A855F7', '#22C55E'];
          trafficRef.current.push({
            id: nextIdRef.current++,
            x: spawnX,
            z: 800,
            speed: 35 + Math.random() * 20,
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }

        // Update traffic
        for (let i = trafficRef.current.length - 1; i >= 0; i--) {
          const tc = trafficRef.current[i];
          tc.z -= (speedRef.current - tc.speed) * 0.4;

          // Collision check near player (z between 40 and 120)
          if (tc.z < 120 && tc.z > 40) {
            const playerDist = Math.abs(tc.x - playerXRef.current);
            if (playerDist < 0.28) {
              setGameOver(true);
              if (onGameOver) onGameOver(scoreRef.current);
              break;
            } else if (playerDist < 0.42 && !((tc as any).nearMissRecorded)) {
              (tc as any).nearMissRecorded = true;
              scoreRef.current += 50; // Near miss bonus!
              setScore(scoreRef.current);
              if (onScoreUpdate) onScoreUpdate(scoreRef.current);
            }
          }

          if (tc.z <= 0) {
            trafficRef.current.splice(i, 1);
          }
        }
      }

      // Draw Traffic Cars (Back to Front)
      for (const tc of trafficRef.current) {
        if (tc.z <= 0) continue;
        const scale = (800 - tc.z) / 800; // 0 to 1
        const carY = horizonY + scale * (bottomY - horizonY);
        const roadW = 60 + scale * 260;
        const carX = 180 + curveRef.current * (1 - scale) + tc.x * (roadW / 2);
        const carW = 16 + scale * 34;
        const carH = 10 + scale * 20;

        ctx.fillStyle = tc.color;
        ctx.fillRect(carX - carW / 2, carY - carH, carW, carH);
        ctx.fillStyle = '#EF4444'; // Tail lights
        ctx.fillRect(carX - carW / 2 + 2, carY - 4, 4, 3);
        ctx.fillRect(carX + carW / 2 - 6, carY - 4, 4, 3);
      }

      // Draw Player Car at bottom
      const playerScreenX = 180 + playerXRef.current * 120;
      const playerScreenY = 430;

      // Car body
      ctx.fillStyle = '#EC4899'; // Synthwave Hot Pink Supercar
      ctx.fillRect(playerScreenX - 26, playerScreenY - 18, 52, 28);
      ctx.fillStyle = '#BE185D';
      ctx.fillRect(playerScreenX - 22, playerScreenY - 30, 44, 14); // Roof
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(playerScreenX - 18, playerScreenY - 26, 36, 9); // Windshield

      // Headlights / Taillights
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(playerScreenX - 24, playerScreenY - 2, 8, 4);
      ctx.fillRect(playerScreenX + 16, playerScreenY - 2, 8, 4);

      // Turbo exhaust fire
      if (turboActive) {
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(playerScreenX - 12, playerScreenY + 10);
        ctx.lineTo(playerScreenX - 6, playerScreenY + 24);
        ctx.lineTo(playerScreenX, playerScreenY + 10);
        ctx.moveTo(playerScreenX + 6, playerScreenY + 10);
        ctx.lineTo(playerScreenX + 12, playerScreenY + 24);
        ctx.lineTo(playerScreenX + 18, playerScreenY + 10);
        ctx.fill();
      }

      if (runningRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameOver, onGameOver, onScoreUpdate, steer, toggleTurbo, turboActive]);

  return (
    <div className={styles.container} id="game-sunset-drift">
      <div className={styles.scoreboard} id="sunset-drift-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-drift-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SPEED</span>
          <span className={styles.value} id="score-drift-speed">{speedMph} MPH</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>DISTANCE</span>
          <span className={styles.value} id="score-drift-dist">{distanceKm} KM</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>TURBO</span>
          <span className={styles.value} id="score-drift-turbo">{turboActive ? 'ENGAGED 🔥' : 'READY'}</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-sunset-drift"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="sunset-drift-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-drift-left"
          onClick={() => steer('LEFT')}
        >
          ◀ Steer Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-drift-turbo"
          onClick={toggleTurbo}
        >
          ⚡ Turbo Nitro
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-drift-right"
          onClick={() => steer('RIGHT')}
        >
          Steer Right ▶
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="sunset-drift-gameover">
          <h3 className={styles.overlayTitle}>HIGHWAY CRASH — DRIVE OVER</h3>
          <p className={styles.overlayText}>
            Distance Cruised: {distanceKm} KM | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-sunset-drift-restart"
            onClick={restart}
          >
            Cruise Sunset Highway
          </button>
        </div>
      )}
    </div>
  );
});

SunsetDrift.displayName = 'SunsetDrift';
