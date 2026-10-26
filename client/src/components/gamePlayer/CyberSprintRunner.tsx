import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './EndlessNeonRunner.module.css';

export interface CyberSprintRunnerRef {
  restart: () => void;
  getScore: () => number;
}

interface CyberSprintRunnerProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Obstacle {
  id: number;
  lane: number; // 0, 1, 2
  y: number;
  type: 'BARRIER' | 'HIGH_LASER' | 'TOKEN';
}

export const CyberSprintRunner = forwardRef<CyberSprintRunnerRef, CyberSprintRunnerProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [distance, setDistance] = useState<number>(0);
  const [lane, setLane] = useState<number>(1);
  const [actionState, setActionState] = useState<'RUN' | 'JUMP' | 'SLIDE'>('RUN');
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const distanceRef = useRef<number>(0);
  const laneRef = useRef<number>(1); // 0, 1, 2
  const actionRef = useRef<'RUN' | 'JUMP' | 'SLIDE'>('RUN');
  const actionTicksRef = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  const obstaclesRef = useRef<Obstacle[]>([]);
  const nextSpawnRef = useRef<number>(60);
  const nextIdRef = useRef<number>(1);
  const speedRef = useRef<number>(5.5);

  const switchLane = useCallback((dir: 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    if (dir === 'LEFT' && laneRef.current > 0) {
      laneRef.current -= 1;
      setLane(laneRef.current);
    }
    if (dir === 'RIGHT' && laneRef.current < 2) {
      laneRef.current += 1;
      setLane(laneRef.current);
    }
  }, [gameOver]);

  const jump = useCallback(() => {
    if (gameOver || actionRef.current !== 'RUN') return;
    actionRef.current = 'JUMP';
    actionTicksRef.current = 24;
    setActionState('JUMP');
  }, [gameOver]);

  const slide = useCallback(() => {
    if (gameOver || actionRef.current !== 'RUN') return;
    actionRef.current = 'SLIDE';
    actionTicksRef.current = 24;
    setActionState('SLIDE');
  }, [gameOver]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    distanceRef.current = 0;
    laneRef.current = 1;
    actionRef.current = 'RUN';
    actionTicksRef.current = 0;
    speedRef.current = 5.5;
    obstaclesRef.current = [];
    setScore(0);
    setDistance(0);
    setLane(1);
    setActionState('RUN');
    setGameOver(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') switchLane('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') switchLane('RIGHT');
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') jump();
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') slide();
    };

    window.addEventListener('keydown', handleKeyDown);

    const laneX = [80, 180, 280];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cyber Grid Highway Background
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Lane dividers
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.moveTo(130, 0); ctx.lineTo(130, canvas.height);
      ctx.moveTo(230, 0); ctx.lineTo(230, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer highway borders
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 0, 300, canvas.height);

      if (!gameOver) {
        // Distance update
        distanceRef.current += 1;
        if (distanceRef.current % 10 === 0) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
          setDistance(Math.floor(distanceRef.current / 10));
          if (onScoreUpdate) onScoreUpdate(scoreRef.current);
        }

        // Action timer
        if (actionTicksRef.current > 0) {
          actionTicksRef.current -= 1;
          if (actionTicksRef.current === 0) {
            actionRef.current = 'RUN';
            setActionState('RUN');
          }
        }

        // Spawn obstacles
        nextSpawnRef.current -= 1;
        if (nextSpawnRef.current <= 0) {
          nextSpawnRef.current = Math.max(35, 65 - Math.floor(distanceRef.current / 400));
          const spawnLane = Math.floor(Math.random() * 3);
          const r = Math.random();
          const type: Obstacle['type'] = r < 0.4 ? 'BARRIER' : r < 0.7 ? 'HIGH_LASER' : 'TOKEN';
          obstaclesRef.current.push({
            id: nextIdRef.current++,
            lane: spawnLane,
            y: -30,
            type
          });
        }

        // Move obstacles & collision check
        const playerY = 380;
        const pLane = laneRef.current;
        const pAction = actionRef.current;

        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obs = obstaclesRef.current[i];
          obs.y += speedRef.current;

          // Collision detection
          if (obs.lane === pLane && Math.abs(obs.y - playerY) < 24) {
            if (obs.type === 'TOKEN') {
              // Collect token
              scoreRef.current += 25;
              setScore(scoreRef.current);
              if (onScoreUpdate) onScoreUpdate(scoreRef.current);
              obstaclesRef.current.splice(i, 1);
              continue;
            } else if (obs.type === 'BARRIER') {
              // Can only avoid by jumping
              if (pAction !== 'JUMP') {
                setGameOver(true);
                if (onGameOver) onGameOver(scoreRef.current);
                break;
              }
            } else if (obs.type === 'HIGH_LASER') {
              // Can only avoid by sliding
              if (pAction !== 'SLIDE') {
                setGameOver(true);
                if (onGameOver) onGameOver(scoreRef.current);
                break;
              }
            }
          }

          if (obs.y > canvas.height + 40) {
            obstaclesRef.current.splice(i, 1);
          }
        }
      }

      // Draw Obstacles
      for (const obs of obstaclesRef.current) {
        const ox = laneX[obs.lane];
        if (obs.type === 'BARRIER') {
          // Low barrier hurdle
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(ox - 30, obs.y - 12, 60, 24);
          ctx.strokeStyle = '#FCA5A5';
          ctx.lineWidth = 2;
          ctx.strokeRect(ox - 30, obs.y - 12, 60, 24);
        } else if (obs.type === 'HIGH_LASER') {
          // High laser beam
          ctx.strokeStyle = '#EC4899';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(ox - 36, obs.y);
          ctx.lineTo(ox + 36, obs.y);
          ctx.stroke();
          ctx.fillStyle = '#F43F5E';
          ctx.fillRect(ox - 40, obs.y - 8, 8, 16);
          ctx.fillRect(ox + 32, obs.y - 8, 8, 16);
        } else if (obs.type === 'TOKEN') {
          // Cyber Token
          ctx.fillStyle = '#FFB800';
          ctx.beginPath();
          ctx.arc(ox, obs.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Draw Player Avatar
      const px = laneX[laneRef.current];
      let py = 380;
      if (actionRef.current === 'JUMP') py -= 28;
      let pRadius = 14;
      if (actionRef.current === 'SLIDE') pRadius = 8;

      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(px, py, pRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cyber trail
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fillRect(px - 6, py + pRadius, 12, 16);

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
  }, [gameOver, jump, onGameOver, onScoreUpdate, slide, switchLane]);

  return (
    <div className={styles.container} id="game-cyber-sprint-runner">
      <div className={styles.scoreboard} id="cyber-sprint-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-sprint-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>DISTANCE</span>
          <span className={styles.value} id="score-sprint-dist">{distance}m</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>LANE</span>
          <span className={styles.value} id="score-sprint-lane">{lane === 0 ? 'LEFT' : lane === 1 ? 'MID' : 'RIGHT'}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>ACTION</span>
          <span className={styles.value} id="score-sprint-action">{actionState}</span>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-cyber-sprint-runner"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="cyber-sprint-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-sprint-left"
          onClick={() => switchLane('LEFT')}
        >
          ◀ Lane Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-sprint-jump"
          onClick={jump}
        >
          ▲ Jump
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-sprint-slide"
          onClick={slide}
        >
          ▼ Slide
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-sprint-right"
          onClick={() => switchLane('RIGHT')}
        >
          Lane Right ▶
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="cyber-sprint-gameover">
          <h3 className={styles.overlayTitle}>SYSTEM BREACH — CRASHED</h3>
          <p className={styles.overlayText}>
            Distance Survived: {distance}m | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-cyber-sprint-restart"
            onClick={restart}
          >
            Re-engage Sprint
          </button>
        </div>
      )}
    </div>
  );
});

CyberSprintRunner.displayName = 'CyberSprintRunner';
