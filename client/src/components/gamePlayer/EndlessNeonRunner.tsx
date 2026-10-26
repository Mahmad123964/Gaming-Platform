import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './EndlessNeonRunner.module.css';

export interface EndlessNeonRunnerRef {
  restart: () => void;
  getScore: () => number;
}

interface EndlessNeonRunnerProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Platform {
  x: number;
  y: number;
  width: number;
}

interface Hazard {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const EndlessNeonRunner = forwardRef<EndlessNeonRunnerRef, EndlessNeonRunnerProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const s = localStorage.getItem('nexusplay_runner_best');
      return s ? parseInt(s, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [gameOver, setGameOver] = useState<boolean>(false);

  const playerRef = useRef<{
    x: number;
    y: number;
    vy: number;
    isGrounded: boolean;
    jumpCount: number;
  }>({
    x: 60,
    y: 400,
    vy: 0,
    isGrounded: true,
    jumpCount: 0
  });

  const platformsRef = useRef<Platform[]>([
    { x: 0, y: 440, width: 420 },
    { x: 480, y: 440, width: 300 }
  ]);
  const hazardsRef = useRef<Hazard[]>([]);
  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);
  const worldSpeedRef = useRef<number>(4.2);

  const jump = useCallback(() => {
    if (!runningRef.current) return;
    const player = playerRef.current;
    if (player.jumpCount < 2) {
      player.vy = -8.8;
      player.isGrounded = false;
      player.jumpCount += 1;
    }
  }, []);

  const restart = useCallback(() => {
    playerRef.current = {
      x: 60,
      y: 400,
      vy: 0,
      isGrounded: true,
      jumpCount: 0
    };
    platformsRef.current = [
      { x: 0, y: 440, width: 420 },
      { x: 480, y: 440, width: 300 }
    ];
    hazardsRef.current = [];
    scoreRef.current = 0;
    worldSpeedRef.current = 4.2;
    runningRef.current = true;
    setScore(0);
    setGameOver(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }), [restart]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (runningRef.current) jump();
        else restart();
      } else if (e.key === 'r' || e.key === 'R') {
        if (!runningRef.current) restart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump, restart]);

  // Main 60 FPS Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const GRAVITY = 0.44;
    const PLAYER_SIZE = 22;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (runningRef.current) {
        const player = playerRef.current;
        const speed = worldSpeedRef.current;

        // Score distance increment
        scoreRef.current += 1;
        setScore(scoreRef.current);
        onScoreUpdate?.(scoreRef.current);

        // Gradually speed up
        worldSpeedRef.current = 4.2 + Math.min(4.5, scoreRef.current / 400);

        // Apply player gravity
        player.vy += GRAVITY;
        player.y += player.vy;
        player.isGrounded = false;

        // Platform collisions
        const platforms = platformsRef.current;
        for (const p of platforms) {
          p.x -= speed;
          if (
            player.x + PLAYER_SIZE > p.x &&
            player.x < p.x + p.width &&
            player.y + PLAYER_SIZE >= p.y &&
            player.y + PLAYER_SIZE - player.vy <= p.y + 12 &&
            player.vy >= 0
          ) {
            player.y = p.y - PLAYER_SIZE;
            player.vy = 0;
            player.isGrounded = true;
            player.jumpCount = 0;
          }
        }

        // Spawn new platforms
        const lastPlatform = platforms[platforms.length - 1];
        if (lastPlatform.x + lastPlatform.width < width + 100) {
          const gap = 80 + Math.random() * 90;
          const platW = 200 + Math.random() * 220;
          const platY = 380 + Math.random() * 80;
          platforms.push({ x: lastPlatform.x + lastPlatform.width + gap, y: platY, width: platW });

          // Spawn hazard on platform
          if (Math.random() > 0.4) {
            hazardsRef.current.push({
              x: lastPlatform.x + lastPlatform.width + gap + 80,
              y: platY - 18,
              width: 14,
              height: 18
            });
          }
        }

        // Remove off-screen platforms
        if (platforms[0].x + platforms[0].width < -50) {
          platforms.shift();
        }

        // Hazards update & collisions
        const hazards = hazardsRef.current;
        for (let i = hazards.length - 1; i >= 0; i--) {
          const h = hazards[i];
          h.x -= speed;

          if (
            player.x + PLAYER_SIZE > h.x &&
            player.x < h.x + h.width &&
            player.y + PLAYER_SIZE > h.y &&
            player.y < h.y + h.height
          ) {
            runningRef.current = false;
            setGameOver(true);
            onGameOver?.(scoreRef.current);
          }

          if (h.x + h.width < -20) {
            hazards.splice(i, 1);
          }
        }

        // Fall into abyss
        if (player.y > height + 40) {
          runningRef.current = false;
          setGameOver(true);
          onGameOver?.(scoreRef.current);
        }
      }

      // Render Scene
      ctx.fillStyle = '#090915';
      ctx.fillRect(0, 0, width, height);

      // Cyberpunk Grid Lines
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 100; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Platforms
      const platforms = platformsRef.current;
      for (const p of platforms) {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(p.x, p.y, p.width, height - p.y);

        ctx.fillStyle = '#EC4899';
        ctx.shadowColor = '#EC4899';
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x, p.y, p.width, 3);
        ctx.shadowBlur = 0;
      }

      // Draw Hazards (Neon Spikes)
      const hazards = hazardsRef.current;
      for (const h of hazards) {
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y + h.height);
        ctx.lineTo(h.x + h.width / 2, h.y);
        ctx.lineTo(h.x + h.width, h.y + h.height);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Player Runner
      const player = playerRef.current;
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
      ctx.shadowBlur = 0;

      // Trailing glow
      ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.fillRect(player.x - 8, player.y + 4, 8, PLAYER_SIZE - 8);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-neon-runner">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>ENDLESS NEON RUNNER</h3>
          <span>Cyber Rooftop Sprint</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>METERS</span>
            <span className={styles.statValue} id="val-runner-score">{score}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>BEST</span>
            <span className={styles.statValue} id="val-runner-best">{bestScore}</span>
          </div>
        </div>
      </div>

      <div
        className={styles.canvasWrapper}
        id="wrapper-neon-runner"
        onClick={jump}
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={560}
          className={styles.gameCanvas}
          id="canvas-neon-runner"
        />

        {gameOver && (
          <div className={styles.overlay} id="runner-gameover-overlay">
            <h2 className={styles.overlayTitle}>SIGNAL LOST</h2>
            <div className={styles.overlayScore}>Distance Cleared: <strong>{score}m</strong></div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-runner-restart"
            >
              Reboot Run (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.controlsHelp}>
        Spacebar or Tap to Jump • Double Jump in mid-air • Avoid red spikes
      </div>

      {/* Mobile Jump Button */}
      <div className={styles.mobileControls} id="runner-mobile-controls">
        <button
          className={styles.jumpBtn}
          onClick={jump}
          id="btn-runner-jump"
          aria-label="Jump / Double Jump"
        >
          ⚡ JUMP / DOUBLE JUMP
        </button>
      </div>
    </div>
  );
});

EndlessNeonRunner.displayName = 'EndlessNeonRunner';
