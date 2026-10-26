import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface UrbanTrafficRacerRef {
  restart: () => void;
  getScore: () => number;
}

interface UrbanTrafficRacerProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const LANES = [120, 200, 280];

export const UrbanTrafficRacer = forwardRef<UrbanTrafficRacerRef, UrbanTrafficRacerProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [speed, setSpeed] = useState<number>(100);
  const [nearMisses, setNearMisses] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Urban Highway: Weave through lanes! Near-misses grant +50 PTS.');
  const [gameState, setGameState] = useState<'RACING' | 'CRASHED'>('RACING');

  const scoreRef = useRef<number>(initialScore);
  const laneIdx = useRef<number>(1); // Middle lane
  const playerCar = useRef({ x: 200, y: 220, targetX: 200, speed: 120 });
  const trafficVehicles = useRef([
    { lane: 0, x: 120, y: -40, speed: 60, color: '#f43f5e', type: 'SEDAN' },
    { lane: 1, x: 200, y: -180, speed: 50, color: '#ca8a04', type: 'TRUCK' },
    { lane: 2, x: 280, y: -300, speed: 70, color: '#8b5cf6', type: 'SEDAN' }
  ]);
  const animRef = useRef<number | null>(null);
  const roadOffset = useRef<number>(0);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    laneIdx.current = 1;
    setScore(0);
    setSpeed(100);
    setNearMisses(0);
    setGameState('RACING');
    setStatusText('Highway run restarted! Weave through traffic lanes safely.');
    playerCar.current = { x: 200, y: 220, targetX: 200, speed: 120 };
    trafficVehicles.current = [
      { lane: 0, x: 120, y: -40, speed: 60, color: '#f43f5e', type: 'SEDAN' },
      { lane: 1, x: 200, y: -180, speed: 50, color: '#ca8a04', type: 'TRUCK' },
      { lane: 2, x: 280, y: -300, speed: 70, color: '#8b5cf6', type: 'SEDAN' }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const laneLeft = () => {
    if (gameState !== 'RACING') return;
    if (laneIdx.current > 0) {
      laneIdx.current -= 1;
      playerCar.current.targetX = LANES[laneIdx.current];
    }
  };

  const laneRight = () => {
    if (gameState !== 'RACING') return;
    if (laneIdx.current < 2) {
      laneIdx.current += 1;
      playerCar.current.targetX = LANES[laneIdx.current];
    }
  };

  const boostSpeed = () => {
    if (gameState !== 'RACING') return;
    playerCar.current.speed = Math.min(180, playerCar.current.speed + 30);
    setSpeed(playerCar.current.speed);
  };

  const brake = () => {
    if (gameState !== 'RACING') return;
    playerCar.current.speed = Math.max(80, playerCar.current.speed - 30);
    setSpeed(playerCar.current.speed);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      const p = playerCar.current;
      p.x += (p.targetX - p.x) * 0.2;

      roadOffset.current = (roadOffset.current + p.speed * 0.05) % 40;

      // Distance score
      if (gameState === 'RACING') {
        const nextScore = scoreRef.current + Math.floor(p.speed * 0.02);
        updateScore(nextScore);
      }

      // Draw Highway
      ctx.fillStyle = '#0f172a'; // Roadside shoulder
      ctx.fillRect(0, 0, 400, 280);

      // Highway surface
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(70, 0, 260, 280);

      // Outer barrier lines (solid yellow)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(70, 0); ctx.lineTo(70, 280);
      ctx.moveTo(330, 0); ctx.lineTo(330, 280);
      ctx.stroke();

      // Lane dividers (white dashed lines)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 16]);
      ctx.lineDashOffset = -roadOffset.current;
      ctx.beginPath();
      ctx.moveTo(160, 0); ctx.lineTo(160, 280);
      ctx.moveTo(240, 0); ctx.lineTo(240, 280);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update & Draw Traffic Vehicles
      trafficVehicles.current.forEach(v => {
        v.y += (p.speed - v.speed) * 0.04;
        if (v.y > 320) {
          v.y = -60 - Math.random() * 120;
          v.lane = Math.floor(Math.random() * 3);
          v.x = LANES[v.lane];
        }

        // Collision detection
        if (Math.abs(p.x - v.x) < 22 && Math.abs(p.y - v.y) < 36 && gameState === 'RACING') {
          setGameState('CRASHED');
          setStatusText(`💥 TOTAL CRASH! Highway pileup! Final Score: ${scoreRef.current}`);
          onGameOver?.(scoreRef.current);
        } else if (Math.abs(p.x - v.x) < 38 && Math.abs(p.y - v.y) < 20 && gameState === 'RACING') {
          // Near miss bonus
          setNearMisses(nm => {
            const next = nm + 1;
            const bonus = scoreRef.current + 50;
            updateScore(bonus);
            setStatusText('⚡ CLOSE CALL! +50 PTS Near-Miss bonus!');
            return next;
          });
        }

        // Draw traffic car
        ctx.fillStyle = v.color;
        const carHeight = v.type === 'TRUCK' ? 48 : 34;
        ctx.fillRect(v.x - 11, v.y - carHeight / 2, 22, carHeight);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(v.x - 9, v.y - carHeight / 2 + 4, 18, 8); // Windshield
        // Headlights / Taillights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(v.x - 9, v.y + carHeight / 2 - 3, 4, 3);
        ctx.fillRect(v.x + 5, v.y + carHeight / 2 - 3, 4, 3);
      });

      // Draw Player Sports Car (Electric Neon Green)
      ctx.fillStyle = '#10b981';
      ctx.fillRect(p.x - 11, p.y - 18, 22, 36);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(p.x - 9, p.y - 12, 18, 8); // Windshield
      // Headlights
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(p.x - 9, p.y - 18, 4, 3);
      ctx.fillRect(p.x + 5, p.y - 18, 4, 3);

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
          <span>Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Speed</span>
          <span className={styles.scoreValue}>{speed} KM/H</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Near Miss</span>
          <span className={styles.scoreValue}>{nearMisses} ⚡</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Lanes</span>
          <span className={styles.scoreValue}>3 Highway</span>
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
          className={styles.touchBtn}
          id="btn-traffic-lane-left"
          onClick={laneLeft}
          disabled={gameState !== 'RACING'}
        >
          ◀ Lane Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-traffic-lane-right"
          onClick={laneRight}
          disabled={gameState !== 'RACING'}
        >
          Lane Right ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-traffic-boost"
          onClick={boostSpeed}
          disabled={gameState !== 'RACING'}
        >
          🚀 Speed Boost
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-traffic-brake"
          onClick={brake}
          disabled={gameState !== 'RACING'}
        >
          🛑 Brake
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-traffic-restart"
          onClick={restart}
        >
          Restart Highway Run
        </button>
      </div>
    </div>
  );
});

UrbanTrafficRacer.displayName = 'UrbanTrafficRacer';
