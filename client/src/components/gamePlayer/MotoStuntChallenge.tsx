import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface MotoStuntChallengeRef {
  restart: () => void;
  getScore: () => number;
}

interface MotoStuntChallengeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const MotoStuntChallenge = forwardRef<MotoStuntChallengeRef, MotoStuntChallengeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [distance, setDistance] = useState<number>(0);
  const [stuntText, setStuntText] = useState<string>('Stunt Course: Gas over ramps, lean for flips, land safely!');
  const [gameState, setGameState] = useState<'RIDING' | 'CRASHED' | 'COURSE_CLEAR'>('RIDING');

  const scoreRef = useRef<number>(initialScore);
  const bike = useRef({
    x: 80,
    y: 200,
    vx: 0,
    vy: 0,
    angle: 0,
    rotSpeed: 0,
    isAirborne: false,
    flips: 0,
    rotationAccum: 0
  });

  const animRef = useRef<number | null>(null);
  const scrollX = useRef<number>(0);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setDistance(0);
    setStuntText('Challenge restarted! Accelerate and hit the stunt ramp.');
    setGameState('RIDING');
    bike.current = {
      x: 80,
      y: 200,
      vx: 0,
      vy: 0,
      angle: 0,
      rotSpeed: 0,
      isAirborne: false,
      flips: 0,
      rotationAccum: 0
    };
    scrollX.current = 0;
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const gas = () => {
    if (gameState !== 'RIDING') return;
    const b = bike.current;
    b.vx = Math.min(8.0, b.vx + 1.2);
  };

  const brake = () => {
    if (gameState !== 'RIDING') return;
    const b = bike.current;
    b.vx = Math.max(0, b.vx - 1.5);
  };

  const leanBack = () => {
    if (gameState !== 'RIDING') return;
    const b = bike.current;
    b.rotSpeed -= 0.08;
    if (b.isAirborne) {
      setStuntText('🔄 Air rotation! Lining up backflip...');
    }
  };

  const leanForward = () => {
    if (gameState !== 'RIDING') return;
    const b = bike.current;
    b.rotSpeed += 0.08;
    if (b.isAirborne) {
      setStuntText('🔄 Air rotation! Lining up frontflip...');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      const b = bike.current;

      if (gameState === 'RIDING') {
        // Scroll forward
        scrollX.current += b.vx;
        setDistance(Math.floor(scrollX.current / 10));

        // Physics
        b.x = 80;
        b.y += b.vy;
        b.vy += 0.28; // Gravity
        b.angle += b.rotSpeed;
        b.rotSpeed *= 0.94; // Rotational damping

        // Terrain height calculation (procedural hills and ramps)
        const worldX = scrollX.current + b.x;
        const rampStart = 400;
        const rampEnd = 550;
        let groundY = 220;

        if (worldX > rampStart && worldX < rampEnd) {
          // Launch ramp
          groundY = 220 - ((worldX - rampStart) / (rampEnd - rampStart)) * 80;
        } else if (worldX >= rampEnd && worldX < rampEnd + 200) {
          groundY = 240; // Gap
        } else {
          groundY = 220 + Math.sin(worldX * 0.015) * 20;
        }

        // Airborne detection
        if (b.y < groundY - 6) {
          b.isAirborne = true;
          b.rotationAccum += b.rotSpeed;
          if (Math.abs(b.rotationAccum) >= Math.PI * 2) {
            b.flips += 1;
            b.rotationAccum = 0;
            const bonus = 250;
            const nextScore = scoreRef.current + bonus;
            updateScore(nextScore);
            setStuntText('🔥 INCREDIBLE FLIP COMPLETED! +250 PTS!');
          }
        } else {
          // Landing check
          if (b.isAirborne) {
            b.isAirborne = false;
            // Check landing angle safety
            const normAngle = ((b.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            if (normAngle > 1.2 && normAngle < 5.0) {
              // Crashed upside down
              setGameState('CRASHED');
              setStuntText('💥 WIPEOUT! Head-first crash on landing!');
              onGameOver?.(scoreRef.current);
            } else {
              // Clean landing
              b.angle = 0;
              b.rotationAccum = 0;
              const landBonus = 50;
              updateScore(scoreRef.current + landBonus);
              setStuntText('✨ Clean touchdown! High score landing!');
            }
          }
          b.y = groundY;
          b.vy = 0;
        }

        // Friction
        b.vx = Math.max(0, b.vx - 0.03);

        // Distance completion
        if (scrollX.current > 3000) {
          setGameState('COURSE_CLEAR');
          const finalScore = scoreRef.current + 500;
          updateScore(finalScore);
          setStuntText(`🏆 COURSE CLEARED! Stunt Champion! Final Score: ${finalScore}`);
          onGameOver?.(finalScore);
        }
      }

      // Draw Sky & Clouds
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // Draw Terrain / Dirt surface
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, 260);
      for (let screenX = 0; screenX <= 400; screenX += 20) {
        const wx = scrollX.current + screenX;
        let gy = 220;
        if (wx > 400 && wx < 550) {
          gy = 220 - ((wx - 400) / 150) * 80;
        } else if (wx >= 550 && wx < 750) {
          gy = 240;
        } else {
          gy = 220 + Math.sin(wx * 0.015) * 20;
        }
        ctx.lineTo(screenX, gy);
      }
      ctx.lineTo(400, 260);
      ctx.closePath();
      ctx.fill();

      // Dirt Grass line
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw Motorcycle & Rider
      ctx.save();
      ctx.translate(b.x, b.y - 10);
      ctx.rotate(b.angle);

      // Chassis
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-12, -6, 24, 6);

      // Wheels
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-14, 6, 7, 0, Math.PI * 2);
      ctx.arc(14, 6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Rider helmet
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, -16, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gameState]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Stunt Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Distance</span>
          <span className={styles.scoreValue}>{distance} M</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Speed</span>
          <span className={styles.scoreValue}>{(bike.current.vx * 12).toFixed(0)} KM/H</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Course</span>
          <span className={styles.scoreValue}>Nitro Arena</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={260} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '24px' }}>
        {stuntText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-moto-gas"
          onClick={gas}
          disabled={gameState !== 'RIDING'}
        >
          🚀 Gas
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-moto-brake"
          onClick={brake}
          disabled={gameState !== 'RIDING'}
        >
          🛑 Brake
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-moto-lean-back"
          onClick={leanBack}
          disabled={gameState !== 'RIDING'}
        >
          🔄 Lean Back (Flip)
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-moto-lean-fwd"
          onClick={leanForward}
          disabled={gameState !== 'RIDING'}
        >
          Lean Fwd ⤵️
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-moto-restart"
          onClick={restart}
        >
          Restart Stunt Course
        </button>
      </div>
    </div>
  );
});

MotoStuntChallenge.displayName = 'MotoStuntChallenge';
