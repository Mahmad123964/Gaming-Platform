import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface DesertRallyAdventureRef {
  restart: () => void;
  getScore: () => number;
}

interface DesertRallyAdventureProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const DesertRallyAdventure = forwardRef<DesertRallyAdventureRef, DesertRallyAdventureProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [checkpoint, setCheckpoint] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [nitroCount, setNitroCount] = useState<number>(3);
  const [statusText, setStatusText] = useState<string>('Desert Rally: Race through checkpoints before time expires!');
  const [gameState, setGameState] = useState<'RACING' | 'TIMEOUT' | 'VICTORY'>('RACING');

  const scoreRef = useRef<number>(initialScore);
  const buggy = useRef({ x: 200, y: 220, vx: 0, speed: 0, maxSpeed: 160 });
  const hazards = useRef([
    { x: 140, y: -50, type: 'ROCK' },
    { x: 260, y: -180, type: 'DUNE' },
    { x: 190, y: -300, type: 'CHECKPOINT' }
  ]);
  const animRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setCheckpoint(1);
    setTimeRemaining(30);
    setNitroCount(3);
    setGameState('RACING');
    setStatusText('Rally restarted! Floor the gas pedal across the dunes.');
    buggy.current = { x: 200, y: 220, vx: 0, speed: 0, maxSpeed: 160 };
    hazards.current = [
      { x: 140, y: -50, type: 'ROCK' },
      { x: 260, y: -180, type: 'DUNE' },
      { x: 190, y: -300, type: 'CHECKPOINT' }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const steerLeft = () => {
    if (gameState !== 'RACING') return;
    buggy.current.x = Math.max(60, buggy.current.x - 25);
  };

  const steerRight = () => {
    if (gameState !== 'RACING') return;
    buggy.current.x = Math.min(340, buggy.current.x + 25);
  };

  const gas = () => {
    if (gameState !== 'RACING') return;
    buggy.current.speed = Math.min(buggy.current.maxSpeed, buggy.current.speed + 30);
  };

  const fireNitro = () => {
    if (gameState !== 'RACING' || nitroCount <= 0) return;
    setNitroCount(n => n - 1);
    buggy.current.speed = Math.min(220, buggy.current.speed + 60);
    setStatusText('🔥 NITRO BOOST ACTIVATED! Blasting across the desert!');
  };

  useEffect(() => {
    if (gameState !== 'RACING') return;
    const interval = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(interval);
          setGameState('TIMEOUT');
          setStatusText(`Time Expired! Rally stage ended. Final Score: ${scoreRef.current}`);
          onGameOver?.(scoreRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [gameState, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      const b = buggy.current;
      const speedMultiplier = b.speed * 0.05;

      // Update hazards & checkpoints
      hazards.current.forEach(h => {
        h.y += speedMultiplier;
        if (h.y > 280) {
          h.y = -60 - Math.random() * 100;
          h.x = 80 + Math.random() * 240;
        }

        // Collision detection
        if (Math.abs(b.x - h.x) < 26 && Math.abs(b.y - h.y) < 26 && gameState === 'RACING') {
          if (h.type === 'CHECKPOINT') {
            h.y = -250;
            setCheckpoint(cp => {
              const next = cp + 1;
              setTimeRemaining(t => t + 15);
              const bonus = 200;
              const nextScore = scoreRef.current + bonus;
              updateScore(nextScore);
              setStatusText(`🏁 CHECKPOINT ${next}! +15s Time & +200 PTS!`);
              if (next > 5) {
                setGameState('VICTORY');
                setStatusText(`🏆 DAKAR RALLY CHAMPION! Victory Score: ${nextScore}`);
                onGameOver?.(nextScore);
              }
              return next;
            });
          } else if (h.type === 'ROCK') {
            b.speed = Math.max(0, b.speed - 50);
            h.y = -100;
            setStatusText('💥 Struck a boulder! Suspension jarred!');
          }
        }
      });

      // Score accumulation based on distance traveled
      if (b.speed > 0 && gameState === 'RACING') {
        const distPoints = scoreRef.current + Math.floor(b.speed * 0.02);
        updateScore(distPoints);
        b.speed = Math.max(0, b.speed - 0.15); // Sand resistance drag
      }

      // Draw Desert Sand Dunes (Warm Ochre / Gold sand)
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, 400, 280);

      // Tire tracks / Track trail
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.x - 8, 280); ctx.lineTo(b.x - 8, 230);
      ctx.moveTo(b.x + 8, 280); ctx.lineTo(b.x + 8, 230);
      ctx.stroke();

      // Draw Hazards & Checkpoints
      hazards.current.forEach(h => {
        if (h.type === 'CHECKPOINT') {
          // Checkpoint gate
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(h.x - 30, h.y - 6, 60, 12);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('CHECKPOINT', h.x - 28, h.y + 3);
        } else if (h.type === 'ROCK') {
          // Boulder
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(h.x, h.y, 12, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sand dune bump
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.ellipse(h.x, h.y, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Dune Buggy (Cyan roll cage + giant tires)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(b.x - 12, b.y - 16, 24, 32);
      // Roll cage frame
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - 10, b.y - 12, 20, 24);
      // Big sand tires
      ctx.fillStyle = '#020617';
      ctx.fillRect(b.x - 16, b.y - 14, 5, 12);
      ctx.fillRect(b.x + 11, b.y - 14, 5, 12);
      ctx.fillRect(b.x - 16, b.y + 4, 5, 12);
      ctx.fillRect(b.x + 11, b.y + 4, 5, 12);

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
          <span>Rally Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Checkpoint</span>
          <span className={styles.scoreValue}>{checkpoint} / 5</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Time</span>
          <span className={styles.scoreValue}>{timeRemaining}s</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Nitro</span>
          <span className={styles.scoreValue}>{nitroCount} ⚡</span>
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
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-desert-gas"
          onClick={gas}
          disabled={gameState !== 'RACING'}
        >
          🚀 Gas
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-desert-steer-left"
          onClick={steerLeft}
          disabled={gameState !== 'RACING'}
        >
          ◀ Steer Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-desert-steer-right"
          onClick={steerRight}
          disabled={gameState !== 'RACING'}
        >
          Steer Right ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-desert-nitro"
          onClick={fireNitro}
          disabled={nitroCount <= 0 || gameState !== 'RACING'}
        >
          ⚡ Nitro Boost
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-desert-restart"
          onClick={restart}
        >
          Restart Rally Stage
        </button>
      </div>
    </div>
  );
});

DesertRallyAdventure.displayName = 'DesertRallyAdventure';
