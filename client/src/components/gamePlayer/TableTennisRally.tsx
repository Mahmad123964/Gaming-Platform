import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './RetroPong.module.css';

export interface TableTennisRallyRef {
  restart: () => void;
  getScore: () => number;
}

interface TableTennisRallyProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const TableTennisRally = forwardRef<TableTennisRallyRef, TableTennisRallyProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerScore, setPlayerScore] = useState<number>(initialScore);
  const [aiScore, setAiScore] = useState<number>(0);
  const [rallyStreak, setRallyStreak] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  const playerRef = useRef<{ x: number; width: number; speed: number }>({ x: 140, width: 64, speed: 7 });
  const aiRef = useRef<{ x: number; width: number; speed: number }>({ x: 140, width: 64, speed: 3.5 });
  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number; radius: number }>({
    x: 180,
    y: 240,
    vx: 3,
    vy: 4,
    radius: 6
  });

  const pScoreRef = useRef<number>(initialScore);
  const aiScoreRef = useRef<number>(0);
  const rallyRef = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  const movePlayer = useCallback((dir: 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    const p = playerRef.current;
    if (dir === 'LEFT') {
      p.x = Math.max(20, p.x - p.speed * 4);
    } else {
      p.x = Math.min(340 - p.width, p.x + p.speed * 4);
    }
  }, [gameOver]);

  const smash = useCallback(() => {
    if (gameOver) return;
    const b = ballRef.current;
    if (b.y > 380 && b.vy > 0) {
      b.vy = -Math.abs(b.vy) * 1.35;
      b.vx *= 1.2;
    }
  }, [gameOver]);

  const restart = useCallback(() => {
    pScoreRef.current = 0;
    aiScoreRef.current = 0;
    rallyRef.current = 0;
    setPlayerScore(0);
    setAiScore(0);
    setRallyStreak(0);
    setGameOver(false);
    setWinner(null);
    ballRef.current = { x: 180, y: 240, vx: (Math.random() > 0.5 ? 3 : -3), vy: 4, radius: 6 };
    playerRef.current.x = 140;
    aiRef.current.x = 140;
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => pScoreRef.current * 20 + rallyRef.current * 5
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') movePlayer('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') movePlayer('RIGHT');
      if (e.key === ' ' || e.key === 'ArrowUp') smash();
    };

    window.addEventListener('keydown', handleKeyDown);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Table Tennis Surface
      ctx.fillStyle = '#064E3B'; // Deep Forest Green table
      ctx.fillRect(20, 20, 320, 440);

      // Outer white boundary lines
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 320, 440);

      // Center white line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(180, 20);
      ctx.lineTo(180, 460);
      ctx.stroke();

      // Net (Horizontal divider)
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(10, 238, 340, 4);
      ctx.strokeStyle = '#94A3B8';
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(10, 236, 340, 8);
      ctx.setLineDash([]);

      if (!gameOver) {
        // AI Tracking
        const b = ballRef.current;
        const ai = aiRef.current;
        const aiCenter = ai.x + ai.width / 2;
        if (b.y < 240) {
          if (b.x < aiCenter - 8) ai.x = Math.max(20, ai.x - ai.speed);
          if (b.x > aiCenter + 8) ai.x = Math.min(340 - ai.width, ai.x + ai.speed);
        }

        // Ball Physics
        b.x += b.vx;
        b.y += b.vy;

        // Wall Bounces
        if (b.x - b.radius <= 20 || b.x + b.radius >= 340) {
          b.vx = -b.vx;
          b.x = Math.max(20 + b.radius, Math.min(340 - b.radius, b.x));
        }

        // Player Paddle Collision (Bottom)
        const p = playerRef.current;
        if (b.y + b.radius >= 430 && b.y - b.radius <= 442) {
          if (b.x >= p.x && b.x <= p.x + p.width) {
            b.vy = -Math.abs(b.vy);
            const hitOffset = (b.x - (p.x + p.width / 2)) / (p.width / 2);
            b.vx = hitOffset * 4.5;
            rallyRef.current += 1;
            setRallyStreak(rallyRef.current);
            if (onScoreUpdate) onScoreUpdate(pScoreRef.current * 20 + rallyRef.current * 5);
          }
        }

        // AI Paddle Collision (Top)
        if (b.y - b.radius <= 50 && b.y + b.radius >= 38) {
          if (b.x >= ai.x && b.x <= ai.x + ai.width) {
            b.vy = Math.abs(b.vy);
            const hitOffset = (b.x - (ai.x + ai.width / 2)) / (ai.width / 2);
            b.vx = hitOffset * 4.5;
          }
        }

        // Point Scored
        if (b.y > 470) {
          // AI scores point
          aiScoreRef.current += 1;
          setAiScore(aiScoreRef.current);
          rallyRef.current = 0;
          setRallyStreak(0);
          b.x = 180;
          b.y = 240;
          b.vy = -3.5;
          b.vx = (Math.random() > 0.5 ? 2.5 : -2.5);

          if (aiScoreRef.current >= 5) {
            setGameOver(true);
            setWinner('AI RIVAL');
            if (onGameOver) onGameOver(pScoreRef.current * 20);
          }
        } else if (b.y < 10) {
          // Player scores point
          pScoreRef.current += 1;
          setPlayerScore(pScoreRef.current);
          b.x = 180;
          b.y = 240;
          b.vy = 3.5;
          b.vx = (Math.random() > 0.5 ? 2.5 : -2.5);
          if (onScoreUpdate) onScoreUpdate(pScoreRef.current * 20 + rallyRef.current * 5);

          if (pScoreRef.current >= 5) {
            setGameOver(true);
            setWinner('PLAYER');
            if (onGameOver) onGameOver(pScoreRef.current * 20 + rallyRef.current * 5);
          }
        }
      }

      // Draw Paddles
      // AI Paddle (Red)
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(aiRef.current.x, 38, aiRef.current.width, 10);
      ctx.fillStyle = '#B91C1C';
      ctx.fillRect(aiRef.current.x + aiRef.current.width / 2 - 3, 28, 6, 10); // Handle

      // Player Paddle (Cyan)
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(playerRef.current.x, 432, playerRef.current.width, 10);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(playerRef.current.x + playerRef.current.width / 2 - 3, 442, 6, 10); // Handle

      // Draw Ball
      ctx.fillStyle = '#F59E0B'; // Orange Table Tennis Ball
      ctx.beginPath();
      ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();

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
  }, [gameOver, movePlayer, onGameOver, onScoreUpdate, smash]);

  return (
    <div className={styles.container} id="game-table-tennis-rally">
      <div className={styles.scoreboard} id="table-tennis-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>PLAYER</span>
          <span className={styles.value} id="score-tennis-player">{playerScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>RALLY</span>
          <span className={styles.value} id="score-tennis-rally">{rallyStreak}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>AI RIVAL</span>
          <span className={styles.value} id="score-tennis-ai">{aiScore}</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-table-tennis-rally"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="table-tennis-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-left"
          onClick={() => movePlayer('LEFT')}
        >
          ◀ Steer Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-smash"
          onClick={smash}
        >
          ⚡ Smash
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-right"
          onClick={() => movePlayer('RIGHT')}
        >
          Steer Right ▶
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="table-tennis-gameover">
          <h3 className={styles.overlayTitle}>
            {winner === 'PLAYER' ? 'VICTORY — MATCH WON!' : 'MATCH CONCLUDED'}
          </h3>
          <p className={styles.overlayText}>
            Final Match Score: {playerScore} - {aiScore} | Longest Rally: {rallyStreak}
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-table-tennis-restart"
            onClick={restart}
          >
            Play Next Rally
          </button>
        </div>
      )}
    </div>
  );
});

TableTennisRally.displayName = 'TableTennisRally';
