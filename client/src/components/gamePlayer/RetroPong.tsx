import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './RetroPong.module.css';

export interface RetroPongRef {
  restart: () => void;
  getScore: () => number;
}

interface RetroPongProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const PADDLE_W = 75;
const PADDLE_H = 12;
const BALL_R = 6;
const WINNING_SCORE = 7;

export const RetroPong = forwardRef<RetroPongRef, RetroPongProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerScore, setPlayerScore] = useState<number>(initialScore);
  const [aiScore, setAiScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  const playerXRef = useRef<number>(142);
  const aiXRef = useRef<number>(142);
  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number; speed: number }>({
    x: 180,
    y: 280,
    vx: 3,
    vy: 3.5,
    speed: 4.5
  });

  const pScoreRef = useRef<number>(initialScore);
  const aScoreRef = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  const resetBall = (towardsPlayer: boolean) => {
    ballRef.current = {
      x: 180,
      y: 280,
      vx: (Math.random() > 0.5 ? 2.5 : -2.5),
      vy: towardsPlayer ? 3.5 : -3.5,
      speed: 4.5
    };
  };

  const restart = useCallback(() => {
    playerXRef.current = 142;
    aiXRef.current = 142;
    pScoreRef.current = 0;
    aScoreRef.current = 0;
    runningRef.current = true;
    resetBall(true);
    setPlayerScore(0);
    setAiScore(0);
    setGameOver(false);
    setVictory(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => pScoreRef.current
  }), [restart]);

  // Pointer drag movement
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!runningRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 360 / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    playerXRef.current = Math.max(0, Math.min(360 - PADDLE_W, x - PADDLE_W / 2));
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!runningRef.current) {
        if (e.key === 'r' || e.key === 'R') restart();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        playerXRef.current = Math.max(0, playerXRef.current - 24);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        playerXRef.current = Math.min(360 - PADDLE_W, playerXRef.current + 24);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restart]);

  // Main 60 FPS Engine Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (runningRef.current) {
        const ball = ballRef.current;
        const pX = playerXRef.current;
        let aiX = aiXRef.current;

        // Ball movement
        ball.x += ball.vx;
        ball.y += ball.vy;

        // AI Paddle Tracking
        const aiCenter = aiX + PADDLE_W / 2;
        if (aiCenter < ball.x - 8) {
          aiX = Math.min(width - PADDLE_W, aiX + 2.8);
        } else if (aiCenter > ball.x + 8) {
          aiX = Math.max(0, aiX - 2.8);
        }
        aiXRef.current = aiX;

        // Left / Right wall bounce
        if (ball.x - BALL_R <= 0) {
          ball.x = BALL_R;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + BALL_R >= width) {
          ball.x = width - BALL_R;
          ball.vx = -Math.abs(ball.vx);
        }

        // Bottom Player Paddle Collision
        const pY = height - 30;
        if (
          ball.y + BALL_R >= pY &&
          ball.y - BALL_R <= pY + PADDLE_H &&
          ball.x >= pX &&
          ball.x <= pX + PADDLE_W &&
          ball.vy > 0
        ) {
          ball.vy = -Math.abs(ball.vy) * 1.05; // slight speedup
          const hitOffset = (ball.x - (pX + PADDLE_W / 2)) / (PADDLE_W / 2);
          ball.vx = hitOffset * 4.5;
        }

        // Top AI Paddle Collision
        const aiY = 20;
        if (
          ball.y - BALL_R <= aiY + PADDLE_H &&
          ball.y + BALL_R >= aiY &&
          ball.x >= aiX &&
          ball.x <= aiX + PADDLE_W &&
          ball.vy < 0
        ) {
          ball.vy = Math.abs(ball.vy) * 1.05;
          const hitOffset = (ball.x - (aiX + PADDLE_W / 2)) / (PADDLE_W / 2);
          ball.vx = hitOffset * 4.5;
        }

        // Point Scored by Player (ball exits top)
        if (ball.y < -10) {
          pScoreRef.current += 1;
          setPlayerScore(pScoreRef.current);
          onScoreUpdate?.(pScoreRef.current);

          if (pScoreRef.current >= WINNING_SCORE) {
            runningRef.current = false;
            setVictory(true);
            setGameOver(true);
            onGameOver?.(pScoreRef.current);
          } else {
            resetBall(false);
          }
        }

        // Point Scored by AI (ball exits bottom)
        if (ball.y > height + 10) {
          aScoreRef.current += 1;
          setAiScore(aScoreRef.current);

          if (aScoreRef.current >= WINNING_SCORE) {
            runningRef.current = false;
            setVictory(false);
            setGameOver(true);
            onGameOver?.(pScoreRef.current);
          } else {
            resetBall(true);
          }
        }
      }

      // Render Scene
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, width, height);

      // Center Court Net Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw AI Paddle (Top)
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 8;
      ctx.fillRect(aiXRef.current, 20, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;

      // Draw Player Paddle (Bottom)
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8;
      ctx.fillRect(playerXRef.current, height - 30, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;

      // Draw Ball
      const ball = ballRef.current;
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-retro-pong">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>RETRO PONG</h3>
          <span>Cyber Paddle Tennis</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>YOU</span>
            <span className={styles.statValue} id="val-pong-player">{playerScore}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>BOT</span>
            <span className={styles.statValue} id="val-pong-ai" style={{ color: '#EF4444' }}>{aiScore}</span>
          </div>
        </div>
      </div>

      <div
        className={styles.canvasWrapper}
        id="wrapper-retro-pong"
        onPointerMove={handlePointerMove}
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={560}
          className={styles.gameCanvas}
          id="canvas-retro-pong"
        />

        {gameOver && (
          <div className={styles.overlay} id="pong-gameover-overlay">
            <h2 className={styles.overlayTitle}>
              {victory ? 'MATCH VICTORIOUS!' : 'DEFEAT'}
            </h2>
            <div className={styles.overlayScore}>Final Score: {playerScore} - {aiScore}</div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-pong-restart"
            >
              Play Rematch (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Touch / drag on canvas or Left/Right arrows to steer paddle
      </div>

      {/* Mobile Steer Buttons */}
      <div className={styles.mobileControls} id="pong-mobile-controls">
        <button
          className={styles.steerBtn}
          onClick={() => { playerXRef.current = Math.max(0, playerXRef.current - 36); }}
          id="btn-pong-left"
          aria-label="Paddle Left"
        >
          ◀
        </button>
        <button
          className={styles.steerBtn}
          onClick={() => { playerXRef.current = Math.min(360 - PADDLE_W, playerXRef.current + 36); }}
          id="btn-pong-right"
          aria-label="Paddle Right"
        >
          ▶
        </button>
      </div>
    </div>
  );
});

RetroPong.displayName = 'RetroPong';
