import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import styles from './CyberInvadersCanvas.module.css';

export interface CyberInvadersRef {
  restart: () => void;
  pause: () => void;
  resume: () => void;
  getScore: () => number;
}

interface CyberInvadersProps {
  initialWave?: number;
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number, finalWave: number) => void;
  onRestart?: () => void;
  onWaveComplete?: (wave: number, score: number) => void;
  soundEnabled?: boolean;
}

type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

interface Invader {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  row: number;
  points: number;
  color: string;
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isPlayer: boolean;
  color: string;
}

interface BunkerBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
}

export const CyberInvadersCanvas = forwardRef<CyberInvadersRef, CyberInvadersProps>(({
  initialWave = 1,
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart,
  onWaveComplete,
  soundEnabled = true
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState<number>(initialScore);
  const [lives, setLives] = useState<number>(3);
  const [wave, setWave] = useState<number>(initialWave);

  // Audio Context (Synthesizer for retro 8-bit sound effects)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
      gain.gain.setValueAtTime(vol, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + duration);
    } catch (_) {}
  }, [soundEnabled]);

  // Game Engine Mutable State
  const stateRef = useRef({
    status: 'IDLE' as GameStatus,
    score: initialScore,
    lives: 3,
    wave: initialWave,
    playerX: 400 - 18,
    playerY: 460,
    playerWidth: 36,
    playerHeight: 18,
    playerSpeed: 6,
    keys: { left: false, right: false, shoot: false },
    lastShootTime: 0,
    bullets: [] as Bullet[],
    invaders: [] as Invader[],
    invaderDx: 1.5,
    invaderDropStep: 16,
    lastAlienShootTime: 0,
    alienShootInterval: 1200,
    bunkers: [] as BunkerBlock[],
    animationFrameId: 0,
    invaderAnimTick: 0
  });

  // Initialize Invader Grid
  const initInvaders = useCallback((waveNum: number) => {
    const invaders: Invader[] = [];
    const rows = 3;
    const cols = 6;
    const invWidth = 32;
    const invHeight = 20;
    const spacingX = 24;
    const spacingY = 18;
    const startX = 140;
    const startY = 60 + Math.min((waveNum - 1) * 15, 60);

    const rowColors = ['#FF0055', '#00F0FF', '#10B981'];
    const rowPoints = [30, 20, 10];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        invaders.push({
          x: startX + c * (invWidth + spacingX),
          y: startY + r * (invHeight + spacingY),
          width: invWidth,
          height: invHeight,
          alive: true,
          row: r,
          points: rowPoints[r],
          color: rowColors[r]
        });
      }
    }

    stateRef.current.invaders = invaders;
    stateRef.current.invaderDx = (1.5 + waveNum * 0.3) * (Math.random() > 0.5 ? 1 : -1);
    stateRef.current.alienShootInterval = Math.max(600, 1400 - waveNum * 150);
  }, []);

  // Initialize Defense Bunkers
  const initBunkers = useCallback(() => {
    const bunkers: BunkerBlock[] = [];
    const bunkerPositions = [150, 370, 590];
    const blockW = 8;
    const blockH = 8;

    for (const baseX of bunkerPositions) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          // Arch shape
          if (r === 2 && (c === 2)) continue;
          bunkers.push({
            x: baseX + c * blockW,
            y: 390 + r * blockH,
            width: blockW,
            height: blockH,
            hp: 3
          });
        }
      }
    }
    stateRef.current.bunkers = bunkers;
  }, []);

  // Reset entire game session (AC-15.1, AC-15.3)
  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.lives = 3;
    s.wave = 1;
    s.playerX = 400 - 18;
    s.bullets = [];
    s.keys = { left: false, right: false, shoot: false };
    s.status = 'PLAYING';

    setScore(0);
    setLives(3);
    setWave(1);
    setStatus('PLAYING');

    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();

    initInvaders(1);
    initBunkers();
    playTone(440, 'square', 0.15);
  }, [initInvaders, initBunkers, onScoreUpdate, onRestart, playTone]);

  // Restart exposure
  useImperativeHandle(ref, () => ({
    restart: resetGame,
    pause: () => {
      stateRef.current.status = 'PAUSED';
      setStatus('PAUSED');
    },
    resume: () => {
      stateRef.current.status = 'PLAYING';
      setStatus('PLAYING');
    },
    getScore: () => stateRef.current.score
  }));

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        stateRef.current.keys.left = true;
      }
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        stateRef.current.keys.right = true;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        stateRef.current.keys.shoot = true;
      }
      if (e.key === 'p' || e.key === 'P' || e.code === 'Escape') {
        if (stateRef.current.status === 'PLAYING') {
          stateRef.current.status = 'PAUSED';
          setStatus('PAUSED');
        } else if (stateRef.current.status === 'PAUSED') {
          stateRef.current.status = 'PLAYING';
          setStatus('PLAYING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        stateRef.current.keys.left = false;
      }
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        stateRef.current.keys.right = false;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        stateRef.current.keys.shoot = false;
      }
    };

    const handleForceGameOver = () => {
      stateRef.current.status = 'GAME_OVER';
      stateRef.current.lives = 0;
      setStatus('GAME_OVER');
      setLives(0);
      if (onGameOver) onGameOver(stateRef.current.score, stateRef.current.wave);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('forceGameOver', handleForceGameOver);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('forceGameOver', handleForceGameOver);
    };
  }, [onGameOver]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const s = stateRef.current;

      // 1. Clear Frame
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, 800, 500);

      // Draw subtle background grid and stars
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 800; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 500);
        ctx.stroke();
      }
      for (let y = 0; y < 500; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      if (s.status === 'PLAYING') {
        // --- 2. Update Player Position ---
        if (s.keys.left) {
          s.playerX = Math.max(10, s.playerX - s.playerSpeed);
        }
        if (s.keys.right) {
          s.playerX = Math.min(800 - s.playerWidth - 10, s.playerX + s.playerSpeed);
        }

        // --- 3. Player Shoot ---
        if (s.keys.shoot && timestamp - s.lastShootTime > 260) {
          s.lastShootTime = timestamp;
          s.bullets.push({
            x: s.playerX + s.playerWidth / 2 - 2,
            y: s.playerY - 4,
            width: 4,
            height: 12,
            vy: -8,
            isPlayer: true,
            color: '#00F0FF'
          });
          playTone(880, 'square', 0.08, 0.08);
        }

        // --- 4. Alien Shoot ---
        if (timestamp - s.lastAlienShootTime > s.alienShootInterval) {
          s.lastAlienShootTime = timestamp;
          const liveAliens = s.invaders.filter(a => a.alive);
          if (liveAliens.length > 0) {
            const shooter = liveAliens[Math.floor(Math.random() * liveAliens.length)];
            s.bullets.push({
              x: shooter.x + shooter.width / 2 - 2,
              y: shooter.y + shooter.height + 2,
              width: 4,
              height: 10,
              vy: 4.5,
              isPlayer: false,
              color: '#FF0055'
            });
            playTone(220, 'sawtooth', 0.06, 0.06);
          }
        }

        // --- 5. Update Invaders ---
        let edgeHit = false;
        const liveAliens = s.invaders.filter(a => a.alive);

        for (const alien of liveAliens) {
          alien.x += s.invaderDx;
          if (alien.x <= 20 || alien.x + alien.width >= 780) {
            edgeHit = true;
          }
          // Invasion reached bunkers/player
          if (alien.y + alien.height >= s.playerY) {
            s.status = 'GAME_OVER';
            setStatus('GAME_OVER');
            if (onGameOver) onGameOver(s.score, s.wave);
            playTone(110, 'sawtooth', 0.6, 0.2);
          }
        }

        if (edgeHit) {
          s.invaderDx = -s.invaderDx * 1.05; // Speed up slightly on edge bounce
          for (const alien of liveAliens) {
            alien.y += s.invaderDropStep;
          }
        }

        // Wave cleared check
        if (liveAliens.length === 0 && s.invaders.length > 0) {
          s.wave += 1;
          s.score += 500; // Wave bonus
          setWave(s.wave);
          setScore(s.score);
          if (onScoreUpdate) onScoreUpdate(s.score);
          if (onWaveComplete) onWaveComplete(s.wave, s.score);
          initInvaders(s.wave);
          playTone(660, 'sine', 0.3);
        }

        // --- 6. Update Bullets & Collisions ---
        for (let i = s.bullets.length - 1; i >= 0; i--) {
          const b = s.bullets[i];
          b.y += b.vy;

          // Out of screen
          if (b.y < -20 || b.y > 520) {
            s.bullets.splice(i, 1);
            continue;
          }

          let bulletConsumed = false;

          // Bunker collision
          for (const bunker of s.bunkers) {
            if (bunker.hp > 0 &&
                b.x < bunker.x + bunker.width &&
                b.x + b.width > bunker.x &&
                b.y < bunker.y + bunker.height &&
                b.y + b.height > bunker.y) {
              bunker.hp -= 1;
              bulletConsumed = true;
              playTone(180, 'noise' as any, 0.05);
              break;
            }
          }

          if (bulletConsumed) {
            s.bullets.splice(i, 1);
            continue;
          }

          if (b.isPlayer) {
            // Player bullet vs Aliens
            for (const alien of s.invaders) {
              if (alien.alive &&
                  b.x < alien.x + alien.width &&
                  b.x + b.width > alien.x &&
                  b.y < alien.y + alien.height &&
                  b.y + b.height > alien.y) {
                alien.alive = false;
                s.score += alien.points;
                setScore(s.score);
                if (onScoreUpdate) onScoreUpdate(s.score);
                bulletConsumed = true;
                playTone(330, 'triangle', 0.1, 0.12);
                break;
              }
            }
          } else {
            // Alien bomb vs Player
            if (b.x < s.playerX + s.playerWidth &&
                b.x + b.width > s.playerX &&
                b.y < s.playerY + s.playerHeight &&
                b.y + b.height > s.playerY) {
              bulletConsumed = true;
              s.lives -= 1;
              setLives(s.lives);
              playTone(150, 'sawtooth', 0.3, 0.2);

              if (s.lives <= 0) {
                s.status = 'GAME_OVER';
                setStatus('GAME_OVER');
                if (onGameOver) onGameOver(s.score, s.wave);
              }
            }
          }

          if (bulletConsumed) {
            s.bullets.splice(i, 1);
          }
        }
      }

      // --- 7. Render Game Objects ---

      // Render Bunkers
      for (const bunker of s.bunkers) {
        if (bunker.hp <= 0) continue;
        const opacity = bunker.hp === 3 ? 1 : bunker.hp === 2 ? 0.7 : 0.4;
        ctx.fillStyle = `rgba(0, 240, 255, ${opacity})`;
        ctx.fillRect(bunker.x, bunker.y, bunker.width, bunker.height);
      }

      // Render Invaders
      s.invaderAnimTick += 0.05;
      const legOffset = Math.sin(s.invaderAnimTick) > 0 ? 2 : 0;

      for (const alien of s.invaders) {
        if (!alien.alive) continue;

        ctx.fillStyle = alien.color;
        ctx.shadowColor = alien.color;
        ctx.shadowBlur = 8;

        // Draw pixelated alien body
        ctx.fillRect(alien.x + 4, alien.y + 2, alien.width - 8, alien.height - 6);
        // Eyes
        ctx.fillStyle = '#060913';
        ctx.fillRect(alien.x + 8, alien.y + 6, 4, 4);
        ctx.fillRect(alien.x + alien.width - 12, alien.y + 6, 4, 4);
        // Antennas / Legs
        ctx.fillStyle = alien.color;
        ctx.fillRect(alien.x + 2, alien.y + alien.height - 4 + legOffset, 4, 4);
        ctx.fillRect(alien.x + alien.width - 6, alien.y + alien.height - 4 - legOffset, 4, 4);
        ctx.shadowBlur = 0;
      }

      // Render Player Cannon
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      // Cannon Base
      ctx.fillRect(s.playerX, s.playerY + 8, s.playerWidth, s.playerHeight - 8);
      // Cannon Turret
      ctx.fillRect(s.playerX + s.playerWidth / 2 - 4, s.playerY, 8, 8);
      ctx.shadowBlur = 0;

      // Render Bullets
      for (const b of s.bullets) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.shadowBlur = 0;
      }

      // Ground defense line
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 485);
      ctx.lineTo(790, 485);
      ctx.stroke();

      s.animationFrameId = requestAnimationFrame(loop);
    };

    stateRef.current.animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animationFrameId);
    };
  }, [initInvaders, playTone, onGameOver, onScoreUpdate]);

  // Touch Controller Actions
  const handleTouchLeftStart = () => { stateRef.current.keys.left = true; };
  const handleTouchLeftEnd = () => { stateRef.current.keys.left = false; };
  const handleTouchRightStart = () => { stateRef.current.keys.right = true; };
  const handleTouchRightEnd = () => { stateRef.current.keys.right = false; };
  const handleTouchFire = () => {
    stateRef.current.keys.shoot = true;
    setTimeout(() => { stateRef.current.keys.shoot = false; }, 150);
  };

  return (
    <div className={styles.container} id="cyber-invaders-container">
      {/* 16:10 Responsive Canvas Viewport */}
      <div className={styles.canvasWrapper} id="game-canvas-viewport">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className={styles.canvas}
          id="cyber-invaders-canvas"
        />

        {/* Start / Idle Screen */}
        {status === 'IDLE' && (
          <div className={styles.overlayScreen} id="game-screen-idle">
            <h2 className={`${styles.titleText} ${styles.titleCyan}`}>Cyber Invaders</h2>
            <p className={styles.subText}>
              Defend the neon mainframe against advancing cybernetic invaders.
              Precision cannon controls active. Single-player solo session verified.
            </p>
            <button
              className={styles.actionButton}
              onClick={resetGame}
              id="btn-start-gameplay"
              autoFocus
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Mission
            </button>
            <div className={styles.keyHintBar}>
              <span><span className={styles.keyTag}>← / →</span> or <span className={styles.keyTag}>A / D</span> to Move</span>
              <span><span className={styles.keyTag}>SPACE</span> to Shoot</span>
              <span><span className={styles.keyTag}>P</span> to Pause</span>
            </div>
          </div>
        )}

        {/* Paused Screen */}
        {status === 'PAUSED' && (
          <div className={styles.overlayScreen} id="game-screen-paused">
            <h2 className={`${styles.titleText} ${styles.titleCyan}`}>System Suspended</h2>
            <p className={styles.subText}>Tactical simulation paused. Resume to re-engage invaders.</p>
            <button
              className={styles.actionButton}
              onClick={() => {
                stateRef.current.status = 'PLAYING';
                setStatus('PLAYING');
              }}
              id="btn-resume-gameplay"
            >
              Resume Defense
            </button>
            <button
              className={styles.secondaryButton}
              onClick={resetGame}
              id="btn-restart-from-pause"
            >
              Restart Simulation
            </button>
          </div>
        )}

        {/* Game Over Screen (AC-15.1, AC-15.3) */}
        {status === 'GAME_OVER' && (
          <div className={styles.overlayScreen} id="game-screen-gameover">
            <h2 className={`${styles.titleText} ${styles.titleRose}`}>Mainframe Breached</h2>
            <p className={styles.subText}>All defensive cannons neutralized. Simulation concluded.</p>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Final Score</span>
                <span className={styles.statValue} id="gameover-final-score">{score}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Waves Defended</span>
                <span className={styles.statValue} id="gameover-final-wave">{wave}</span>
              </div>
            </div>
            <button
              className={styles.actionButton}
              onClick={resetGame}
              id="btn-restart-gameplay"
              autoFocus
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Restart Mission (Reset Score)
            </button>
          </div>
        )}
      </div>

      {/* Touch & Pointer Controls for Mobile / Tablet Viewports */}
      <div className={styles.touchControls} id="game-touch-controls" aria-label="Touch Controls">
        <div className={styles.touchDpad}>
          <button
            className={styles.touchBtn}
            onPointerDown={handleTouchLeftStart}
            onPointerUp={handleTouchLeftEnd}
            onPointerLeave={handleTouchLeftEnd}
            id="touch-left-btn"
            aria-label="Move Left"
          >
            ◀
          </button>
          <button
            className={styles.touchBtn}
            onPointerDown={handleTouchRightStart}
            onPointerUp={handleTouchRightEnd}
            onPointerLeave={handleTouchRightEnd}
            id="touch-right-btn"
            aria-label="Move Right"
          >
            ▶
          </button>
        </div>

        <button
          className={styles.touchFireBtn}
          onPointerDown={handleTouchFire}
          id="touch-fire-btn"
          aria-label="Fire Cannon"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2" />
          </svg>
          PULSE FIRE
        </button>
      </div>
    </div>
  );
});

CyberInvadersCanvas.displayName = 'CyberInvadersCanvas';
