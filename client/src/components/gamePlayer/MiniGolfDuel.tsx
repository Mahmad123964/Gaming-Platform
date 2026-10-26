import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface MiniGolfDuelRef {
  restart: () => void;
  getScore: () => number;
}

interface MiniGolfDuelProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const MiniGolfDuel = forwardRef<MiniGolfDuelRef, MiniGolfDuelProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hole, setHole] = useState<number>(1);
  const [strokes, setStrokes] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(initialScore);
  const [aimAngle, setAimAngle] = useState<number>(-90); // degrees, -90 is straight up
  const [power, setPower] = useState<number>(60); // 20 to 100
  const [status, setStatus] = useState<string>('Aim your putt, adjust power, and sink the ball in the cup!');
  const [ballMoving, setBallMoving] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const ballRef = useRef({
    x: 180,
    y: 220,
    vx: 0,
    vy: 0,
    radius: 5,
    inCup: false
  });

  const cupRef = useRef({ x: 180, y: 55, radius: 10 });
  const wallsRef = useRef([
    { x: 100, y: 120, w: 160, h: 12 } // Center bumper obstacle
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setTotalScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setTotalScore(0);
    setHole(1);
    setStrokes(0);
    setAimAngle(-90);
    setPower(60);
    setBallMoving(false);
    setStatus('Aim your putt, adjust power, and sink the ball in the cup!');
    ballRef.current = { x: 180, y: 220, vx: 0, vy: 0, radius: 5, inCup: false };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const adjustAim = useCallback((delta: number) => {
    if (ballMoving) return;
    setAimAngle(prev => {
      const next = Math.max(-160, Math.min(-20, prev + delta));
      return next;
    });
  }, [ballMoving]);

  const adjustPower = useCallback(() => {
    if (ballMoving) return;
    setPower(p => (p >= 90 ? 30 : p + 20));
  }, [ballMoving]);

  const putt = useCallback(() => {
    if (ballMoving || ballRef.current.inCup) return;
    const rad = (aimAngle * Math.PI) / 180;
    const speed = (power / 100) * 8.5;

    ballRef.current.vx = Math.cos(rad) * speed;
    ballRef.current.vy = Math.sin(rad) * speed;
    setBallMoving(true);
    setStrokes(s => s + 1);
    setStatus('Putt away! Watching green roll and banking angles...');
  }, [ballMoving, aimAngle, power]);

  // Main canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    runningRef.current = true;
    let animId: number;

    const render = () => {
      if (!runningRef.current) return;
      const W = canvas.width;
      const H = canvas.height;

      // Putting green felt (Vibrant emerald green)
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, 0, W, H);

      // Course wooden borders
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, W - 14, H - 14);

      // Water Hazard (Blue pond on right side)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(W - 40, 160, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.fillText('WATER', W - 58, 164);

      // Center wooden bumper
      for (const wall of wallsRef.current) {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      }

      // Cup & Flagpin
      const cup = cupRef.current;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cup.x, cup.y, cup.radius, 0, Math.PI * 2);
      ctx.fill();

      // Flagstick & Flag (Bright red triangle)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cup.x, cup.y);
      ctx.lineTo(cup.x, cup.y - 25);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(cup.x, cup.y - 25);
      ctx.lineTo(cup.x + 14, cup.y - 18);
      ctx.lineTo(cup.x, cup.y - 11);
      ctx.fill();

      // Ball physics & motion
      const b = ballRef.current;
      if (ballMoving && !b.inCup) {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.982; // Green rolling friction
        b.vy *= 0.982;

        // Wall boundary rebounds
        if (b.x < 22 || b.x > W - 22) {
          b.vx = -b.vx * 0.85;
          b.x = b.x < 22 ? 22 : W - 22;
        }
        if (b.y < 22 || b.y > H - 22) {
          b.vy = -b.vy * 0.85;
          b.y = b.y < 22 ? 22 : H - 22;
        }

        // Center bumper obstacle collision
        for (const wall of wallsRef.current) {
          if (b.x > wall.x - b.radius && b.x < wall.x + wall.w + b.radius &&
              b.y > wall.y - b.radius && b.y < wall.y + wall.h + b.radius) {
            b.vy = -b.vy * 0.85;
          }
        }

        // Water hazard penalty check
        const distToWater = Math.hypot(b.x - (W - 40), b.y - 160);
        if (distToWater < 24) {
          b.x = 180;
          b.y = 220;
          b.vx = 0;
          b.vy = 0;
          setBallMoving(false);
          setStatus('Splash! Ball in water hazard. 1 penalty stroke added.');
        }

        // Cup sink check
        const distToCup = Math.hypot(b.x - cup.x, b.y - cup.y);
        const ballSpeed = Math.hypot(b.vx, b.vy);
        if (distToCup < cup.radius + 2 && ballSpeed < 3.2) {
          b.inCup = true;
          b.vx = 0;
          b.vy = 0;
          b.x = cup.x;
          b.y = cup.y;
          setBallMoving(false);
          updateScore(scoreRef.current + 250);
          setStatus('⛳ HOLE IN ONE! Fantastic precision putt into the cup!');
        }

        // Stop condition
        if (ballSpeed < 0.08) {
          b.vx = 0;
          b.vy = 0;
          setBallMoving(false);
          setStatus('Ball stopped. Line up your next putt!');
        }
      }

      // Draw Aim Guide when stationary
      if (!ballMoving && !b.inCup) {
        const rad = (aimAngle * Math.PI) / 180;
        const guideLen = 40 + (power / 100) * 30;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + Math.cos(rad) * guideLen, b.y + Math.sin(rad) * guideLen);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Golf Ball (Glossy white dimpled)
      if (!b.inCup) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [ballMoving, aimAngle, power, updateScore]);

  return (
    <div className={styles.container} id="mini-golf-duel-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Points</span>
          <span className={styles.scoreValue} id="golf-score">{totalScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Hole</span>
          <span className={styles.scoreValue}>{hole} (Par 2)</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Strokes</span>
          <span className={styles.scoreValue}>{strokes}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Power</span>
          <span className={styles.scoreValue}>{power}%</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="golf-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#10b981', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-golf-aim-left"
          onClick={() => adjustAim(-10)}
          disabled={ballMoving}
        >
          ◀ Aim Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-golf-power"
          onClick={adjustPower}
          disabled={ballMoving}
        >
          Power: {power}%
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-golf-putt"
          onClick={putt}
          disabled={ballMoving || ballRef.current.inCup}
        >
          ⛳ Take Putt
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-golf-aim-right"
          onClick={() => adjustAim(10)}
          disabled={ballMoving}
        >
          Aim Right ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-golf-restart"
          onClick={restart}
        >
          New Round of Mini Golf
        </button>
      </div>
    </div>
  );
});

MiniGolfDuel.displayName = 'MiniGolfDuel';
