import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface DriftChampionshipRef {
  restart: () => void;
  getScore: () => number;
}

interface DriftChampionshipProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const DriftChampionship = forwardRef<DriftChampionshipRef, DriftChampionshipProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [driftScore, setDriftScore] = useState<number>(initialScore);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [slipAngle, setSlipAngle] = useState<number>(0);
  const [status, setStatus] = useState<string>('Kick handbrake into corner to initiate high-angle drift!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const carRef = useRef({
    x: 180,
    angle: 0, // heading angle
    driftAngle: 0, // slip angle
    speed: 5.0,
    drifting: false,
    combo: 1.0
  });

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setDriftScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setDriftScore(0);
    setMultiplier(1);
    setSlipAngle(0);
    setStatus('Kick handbrake into corner to initiate high-angle drift!');
    carRef.current = { x: 180, angle: 0, driftAngle: 0, speed: 5.0, drifting: false, combo: 1.0 };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const steer = useCallback((dir: 'LEFT' | 'RIGHT') => {
    const c = carRef.current;
    if (dir === 'LEFT') {
      c.driftAngle = Math.max(-45, c.driftAngle - 12);
      c.x = Math.max(70, c.x - 8);
    } else {
      c.driftAngle = Math.min(45, c.driftAngle + 12);
      c.x = Math.min(290, c.x + 8);
    }
  }, []);

  const handbrake = useCallback(() => {
    const c = carRef.current;
    c.drifting = true;
    c.combo = Math.min(5.0, c.combo + 0.5);
    setMultiplier(Math.round(c.combo * 10) / 10);
    setStatus('🔥 E-BRAKE CLUTCH KICK! Sideways drift locked!');
  }, []);

  const throttle = useCallback(() => {
    const c = carRef.current;
    c.speed = Math.min(9.0, c.speed + 1.0);
  }, []);

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

      // Touge mountain road surface
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      // Curving road asphalt
      const roadCenter = W / 2 + Math.sin(frame * 0.03) * 40;
      const roadW = 200;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(roadCenter - roadW / 2, 0, roadW, H);

      // Red/white clipping rumble curbs
      for (let y = 0; y < H; y += 20) {
        const isRed = Math.floor((y + frame * 3) / 20) % 2 === 0;
        ctx.fillStyle = isRed ? '#ef4444' : '#f8fafc';
        ctx.fillRect(roadCenter - roadW / 2 - 8, (y + frame * 4) % H, 8, 16);
        ctx.fillRect(roadCenter + roadW / 2, (y + frame * 4) % H, 8, 16);
      }

      // Clipping zone pole (Bonus point trigger)
      const clipPoleX = roadCenter - roadW / 2 + 15;
      const clipPoleY = (frame * 5) % (H + 100) - 50;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(clipPoleX, clipPoleY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Car physics and drift score computation
      const c = carRef.current;
      const absSlip = Math.abs(c.driftAngle);
      setSlipAngle(Math.round(absSlip));

      if (absSlip > 15) {
        // High angle sustained drift
        const pointsThisFrame = Math.round((absSlip / 10) * c.combo);
        updateScore(scoreRef.current + pointsThisFrame);

        // Near-clipping zone proximity check
        if (Math.abs(c.x - clipPoleX) < 35 && Math.abs(200 - clipPoleY) < 35) {
          updateScore(scoreRef.current + 50);
          setStatus('🏆 CLIPPING POINT BONUS! +50 PTS');
        }
      }

      // Tire smoke VFX
      if (absSlip > 18) {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
        ctx.beginPath();
        ctx.arc(c.x - 10, 215, 6 + Math.random() * 8, 0, Math.PI * 2);
        ctx.arc(c.x + 10, 215, 6 + Math.random() * 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Drift Car (JDM Tuner Spec)
      ctx.save();
      ctx.translate(c.x, 200);
      ctx.rotate((c.driftAngle * Math.PI) / 180);

      // Chassis (Violet Synthwave Purple)
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(-14, -26, 28, 52);

      // Carbon fiber hood & roof
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, -22, 20, 16); // Hood
      ctx.fillRect(-10, -2, 20, 18);  // Roof

      // Windscreen
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-9, -6, 18, 4);

      // High rear GT wing spoiler
      ctx.fillStyle = '#020617';
      ctx.fillRect(-16, 22, 32, 6);

      // Tail lights
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-12, 24, 6, 2);
      ctx.fillRect(6, 24, 6, 2);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [updateScore]);

  return (
    <div className={styles.container} id="drift-championship-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Drift Score</span>
          <span className={styles.scoreValue} id="drift-score">{driftScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Multiplier</span>
          <span className={styles.scoreValue}>{multiplier}x</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Slip Angle</span>
          <span className={styles.scoreValue}>{slipAngle}°</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="drift-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#8b5cf6', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-drift-steer-left"
          onClick={() => steer('LEFT')}
        >
          ◀ Counter Left
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-drift-handbrake"
          onClick={handbrake}
        >
          ⚡ Handbrake Kick
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-drift-throttle"
          onClick={throttle}
        >
          Throttle
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-drift-steer-right"
          onClick={() => steer('RIGHT')}
        >
          Counter Right ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-drift-restart"
          onClick={restart}
        >
          New Drift Run
        </button>
      </div>
    </div>
  );
});

DriftChampionship.displayName = 'DriftChampionship';
