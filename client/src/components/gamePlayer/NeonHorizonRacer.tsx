import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './NeonHorizonRacer.module.css';

export interface NeonHorizonRacerRef {
  restart: () => void;
  getScore: () => number;
}

interface NeonHorizonRacerProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface TrafficCar {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
}

interface EnergyOrb {
  id: number;
  x: number;
  y: number;
  radius: number;
}

const LANES = [80, 180, 280]; // 3 highway lanes in a 360px wide canvas

export const NeonHorizonRacer = forwardRef<NeonHorizonRacerRef, NeonHorizonRacerProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [speedKmh, setSpeedKmh] = useState<number>(120);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Mutable refs for real-time 60 FPS animation loop
  const playerLaneRef = useRef<number>(1); // Index 0, 1, 2 (starts in middle)
  const playerYRef = useRef<number>(440);
  const roadOffsetRef = useRef<number>(0);
  const trafficRef = useRef<TrafficCar[]>([]);
  const orbsRef = useRef<EnergyOrb[]>([]);
  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);
  const nextSpawnRef = useRef<number>(0);
  const nextOrbSpawnRef = useRef<number>(0);

  const restart = useCallback(() => {
    playerLaneRef.current = 1;
    trafficRef.current = [];
    orbsRef.current = [];
    scoreRef.current = 0;
    runningRef.current = true;
    setScore(0);
    setSpeedKmh(120);
    setGameOver(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  const moveLeft = useCallback(() => {
    if (!runningRef.current) return;
    if (playerLaneRef.current > 0) {
      playerLaneRef.current -= 1;
    }
  }, []);

  const moveRight = useCallback(() => {
    if (!runningRef.current) return;
    if (playerLaneRef.current < 2) {
      playerLaneRef.current += 1;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!runningRef.current) {
        if (e.key === 'r' || e.key === 'R') restart();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        moveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        moveRight();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, restart]);

  // Main 60 FPS Animation & Physics Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let nextEntityId = 1;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (runningRef.current) {
        // Continuous distance score
        scoreRef.current += 1;
        setScore(scoreRef.current);
        onScoreUpdate?.(scoreRef.current);

        // Speed increases with score
        const currentSpeed = 120 + Math.min(180, Math.floor(scoreRef.current / 20));
        setSpeedKmh(currentSpeed);

        // Scroll road lines
        roadOffsetRef.current = (roadOffsetRef.current + currentSpeed / 20) % 40;

        // Spawn traffic
        nextSpawnRef.current += 1;
        if (nextSpawnRef.current > Math.max(35, 75 - Math.floor(scoreRef.current / 80))) {
          nextSpawnRef.current = 0;
          const laneIdx = Math.floor(Math.random() * 3);
          const colors = ['#7928CA', '#FF0055', '#F59E0B', '#3B82F6'];
          trafficRef.current.push({
            id: nextEntityId++,
            x: LANES[laneIdx] - 18,
            y: -80,
            width: 36,
            height: 60,
            speed: currentSpeed / 30 - (Math.random() * 2 + 1),
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }

        // Spawn energy orbs
        nextOrbSpawnRef.current += 1;
        if (nextOrbSpawnRef.current > 120) {
          nextOrbSpawnRef.current = 0;
          const laneIdx = Math.floor(Math.random() * 3);
          orbsRef.current.push({
            id: nextEntityId++,
            x: LANES[laneIdx],
            y: -20,
            radius: 10
          });
        }

        // Move traffic
        trafficRef.current.forEach(car => {
          car.y += car.speed + 3;
        });
        trafficRef.current = trafficRef.current.filter(car => car.y < height + 100);

        // Move orbs
        orbsRef.current.forEach(orb => {
          orb.y += 4;
        });
        orbsRef.current = orbsRef.current.filter(orb => orb.y < height + 50);

        // Player bounds
        const playerX = LANES[playerLaneRef.current] - 18;
        const playerY = playerYRef.current;
        const playerW = 36;
        const playerH = 64;

        // Check Orb Pickup
        orbsRef.current = orbsRef.current.filter(orb => {
          const dist = Math.hypot(orb.x - (playerX + playerW / 2), orb.y - (playerY + playerH / 2));
          if (dist < 28) {
            scoreRef.current += 50;
            setScore(scoreRef.current);
            return false;
          }
          return true;
        });

        // Check Traffic Collision (Hitbox)
        for (const car of trafficRef.current) {
          if (
            playerX < car.x + car.width - 4 &&
            playerX + playerW > car.x + 4 &&
            playerY < car.y + car.height - 4 &&
            playerY + playerH > car.y + 4
          ) {
            runningRef.current = false;
            setGameOver(true);
            onGameOver?.(scoreRef.current);
            break;
          }
        }
      }

      // ----------------------------------------------------
      // Render Synthwave Cyberpunk Highway
      // ----------------------------------------------------
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, width, height);

      // Highway Road Surface
      ctx.fillStyle = '#0D1326';
      ctx.fillRect(30, 0, width - 60, height);

      // Highway Outer Shoulders (Neon Cyan boundaries)
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(30, 0); ctx.lineTo(30, height);
      ctx.moveTo(width - 30, 0); ctx.lineTo(width - 30, height);
      ctx.stroke();

      // Dashed Lane Dividers (Glowing Amber)
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 6;
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -roadOffsetRef.current;

      ctx.beginPath();
      ctx.moveTo(130, 0); ctx.lineTo(130, height);
      ctx.moveTo(230, 0); ctx.lineTo(230, height);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Render Energy Orbs (Glowing Cyan Pulse)
      orbsRef.current.forEach(orb => {
        ctx.fillStyle = '#00F0FF';
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Traffic Vehicles
      trafficRef.current.forEach(car => {
        ctx.fillStyle = car.color;
        ctx.shadowColor = car.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(car.x, car.y, car.width, car.height);

        // Tail lights
        ctx.fillStyle = '#FF0055';
        ctx.shadowColor = '#FF0055';
        ctx.shadowBlur = 6;
        ctx.fillRect(car.x + 4, car.y + car.height - 4, 8, 4);
        ctx.fillRect(car.x + car.width - 12, car.y + car.height - 4, 8, 4);
      });

      // Render Player Vehicle (Neon Ruby Synthwave Roadster)
      const playerX = LANES[playerLaneRef.current] - 18;
      const playerY = playerYRef.current;
      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 16;
      ctx.fillRect(playerX, playerY, 36, 64);

      // Player Cockpit Glass
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8;
      ctx.fillRect(playerX + 6, playerY + 16, 24, 20);

      // Headlights beam
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(playerX + 4, playerY);
      ctx.lineTo(playerX - 10, playerY - 70);
      ctx.lineTo(playerX + 46, playerY - 70);
      ctx.lineTo(playerX + 32, playerY);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-neon-horizon">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>NEON HORIZON</h3>
          <span>Cyberpunk Highway Racer</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>KM/H</span>
            <span className={styles.statValue} id="val-neon-speed">{speedKmh}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-neon-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.canvasWrapper} id="wrapper-neon-horizon">
        <canvas
          ref={canvasRef}
          width={360}
          height={560}
          className={styles.gameCanvas}
          id="canvas-neon-horizon"
        />

        {gameOver && (
          <div className={styles.overlay} id="neon-gameover-overlay">
            <h2 className={styles.overlayTitle}>CRASH TERMINATION</h2>
            <div className={styles.overlayScore}>Distance Score: <strong>{score}</strong></div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-neon-restart"
            >
              Reboot Engine (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Controls: Left / Right Arrows or A / D to steer • Collect Cyan Orbs (+50)
      </div>

      {/* Mobile Touch Steer Buttons */}
      <div className={styles.mobileButtons} id="neon-mobile-buttons">
        <button
          className={styles.actionButton}
          onClick={moveLeft}
          id="btn-neon-left"
          aria-label="Steer Left"
        >
          ◀
        </button>
        <button
          className={styles.actionButton}
          onClick={moveRight}
          id="btn-neon-right"
          aria-label="Steer Right"
        >
          ▶
        </button>
      </div>
    </div>
  );
});

NeonHorizonRacer.displayName = 'NeonHorizonRacer';
