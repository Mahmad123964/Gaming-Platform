import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ArcadeCricket.module.css';

export interface SoccerFreeKickRef {
  restart: () => void;
  getScore: () => number;
}

interface SoccerFreeKickProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const SoccerFreeKick = forwardRef<SoccerFreeKickRef, SoccerFreeKickProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [goals, setGoals] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [curve, setCurve] = useState<'STRAIGHT' | 'CURL_LEFT' | 'CURL_RIGHT'>('STRAIGHT');
  const [commentary, setCommentary] = useState<string>('Aim your strike at the corners and press Shoot!');
  const [gameOver, setGameOver] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const goalsRef = useRef<number>(0);
  const attemptsRef = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  const aimRef = useRef<{ x: number; y: number }>({ x: 180, y: 140 });
  const ballRef = useRef<{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    active: boolean;
  }>({
    x: 180,
    y: 420,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    active: false
  });

  const keeperRef = useRef<{ x: number; y: number; vx: number; dive: boolean }>({
    x: 180,
    y: 160,
    vx: 2,
    dive: false
  });

  const shoot = useCallback(() => {
    if (ballRef.current.active || gameOver) return;
    const currentAttempts = attemptsRef.current + 1;
    attemptsRef.current = currentAttempts;
    setAttempts(currentAttempts);

    const targetX = aimRef.current.x;
    const targetY = aimRef.current.y;

    let curlVx = 0;
    if (curve === 'CURL_LEFT') curlVx = -1.8;
    if (curve === 'CURL_RIGHT') curlVx = 1.8;

    ballRef.current = {
      x: 180,
      y: 420,
      z: 0,
      vx: (targetX - 180) / 28 + curlVx * 0.3,
      vy: (targetY - 420) / 28,
      vz: 4.5,
      active: true
    };

    // Keeper dives towards anticipated landing
    keeperRef.current.dive = true;
    keeperRef.current.vx = (targetX > 180 ? 3.5 : -3.5);
    setCommentary(`Shot #${currentAttempts} launched with ${curve} spin!`);
  }, [curve, gameOver]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    goalsRef.current = 0;
    attemptsRef.current = 0;
    setScore(0);
    setGoals(0);
    setAttempts(0);
    setGameOver(false);
    ballRef.current.active = false;
    aimRef.current = { x: 180, y: 140 };
    setCommentary('New shootout! Aim for the top corners.');
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

    const handleCanvasClick = (e: MouseEvent) => {
      if (ballRef.current.active || gameOver) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(60, Math.min(300, e.clientX - rect.left));
      const y = Math.max(90, Math.min(180, e.clientY - rect.top));
      aimRef.current = { x, y };
    };

    canvas.addEventListener('click', handleCanvasClick);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Pitch background
      ctx.fillStyle = '#065F46';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Penalty box lines
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 180, 280, 300);

      // Goal Frame
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 5;
      ctx.strokeRect(60, 80, 240, 110);

      // Goal Netting
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 60; x <= 300; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, 80);
        ctx.lineTo(x, 190);
        ctx.stroke();
      }
      for (let y = 80; y <= 190; y += 15) {
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(300, y);
        ctx.stroke();
      }

      // Defensive Wall (3 players)
      ctx.fillStyle = '#DC2626';
      for (let i = 0; i < 3; i++) {
        const wx = 150 + i * 22;
        ctx.fillRect(wx, 280, 18, 44);
        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(wx + 9, 272, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#DC2626';
      }

      // Keeper
      const k = keeperRef.current;
      if (k.dive) {
        k.x += k.vx;
        k.x = Math.max(75, Math.min(285, k.x));
      }
      ctx.fillStyle = '#EAB308'; // Goalkeeper neon jersey
      ctx.fillRect(k.x - 14, k.y - 10, 28, 36);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(k.x, k.y - 18, 9, 0, Math.PI * 2);
      ctx.fill();

      // Aim Target Indicator
      if (!ballRef.current.active && !gameOver) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(aimRef.current.x, aimRef.current.y, 12, 0, Math.PI * 2);
        ctx.moveTo(aimRef.current.x - 16, aimRef.current.y);
        ctx.lineTo(aimRef.current.x + 16, aimRef.current.y);
        ctx.moveTo(aimRef.current.x, aimRef.current.y - 16);
        ctx.lineTo(aimRef.current.x, aimRef.current.y + 16);
        ctx.stroke();
      }

      // Ball Update
      const b = ballRef.current;
      if (b.active) {
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;

        if (curve === 'CURL_LEFT') b.vx -= 0.08;
        if (curve === 'CURL_RIGHT') b.vx += 0.08;

        // Arrival at goal plane
        if (b.y <= 160) {
          b.active = false;
          k.dive = false;

          const keeperDist = Math.abs(b.x - k.x);
          const inGoalX = b.x >= 65 && b.x <= 295;
          const inGoalY = b.y >= 85 && b.y <= 185;

          if (inGoalX && inGoalY && keeperDist > 28) {
            // GOAL!
            const isCorner = (b.x < 100 || b.x > 260) && b.y < 120;
            const pts = isCorner ? 150 : 100;
            scoreRef.current += pts;
            goalsRef.current += 1;
            setScore(scoreRef.current);
            setGoals(goalsRef.current);
            setCommentary(isCorner ? 'GOALAZO! Top corner screamer! (+150 PTS)' : 'GOAL! Past the keeper into the net! (+100 PTS)');
            if (onScoreUpdate) onScoreUpdate(scoreRef.current);
          } else if (keeperDist <= 28) {
            setCommentary('SAVED! Magnificent diving save by the goalkeeper!');
          } else {
            setCommentary('OFF TARGET! Strike flew wide of the woodwork.');
          }

          if (attemptsRef.current >= 5) {
            setGameOver(true);
            setCommentary(`Shootout concluded! Scored ${goalsRef.current} out of 5 goals. Total Score: ${scoreRef.current}`);
            if (onGameOver) onGameOver(scoreRef.current);
          }
        }
      }

      // Draw Ball
      const ballRadius = Math.max(5, 12 - (420 - b.y) * 0.015);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(b.x, b.y, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (runningRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [curve, gameOver, onGameOver, onScoreUpdate]);

  return (
    <div className={styles.container} id="game-soccer-free-kick">
      <div className={styles.scoreboard} id="soccer-free-kick-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-soccer-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>GOALS</span>
          <span className={styles.value} id="score-soccer-goals">{goals} / 5</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>ATTEMPTS</span>
          <span className={styles.value} id="score-soccer-attempts">{attempts} / 5</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SPIN</span>
          <span className={styles.value} id="badge-soccer-curve">{curve}</span>
        </div>
      </div>

      <div className={styles.commentaryBox} id="soccer-commentary-box">
        {commentary}
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-soccer-free-kick"
        />
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="soccer-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-soccer-aim-left"
          onClick={() => { aimRef.current.x = Math.max(70, aimRef.current.x - 30); }}
          disabled={ballRef.current.active || gameOver}
        >
          ◀ Aim Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-soccer-curve-toggle"
          onClick={() => {
            setCurve(prev => prev === 'STRAIGHT' ? 'CURL_LEFT' : prev === 'CURL_LEFT' ? 'CURL_RIGHT' : 'STRAIGHT');
          }}
          disabled={ballRef.current.active || gameOver}
        >
          Spin: {curve}
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-soccer-shoot"
          onClick={shoot}
          disabled={ballRef.current.active || gameOver}
        >
          ⚽ Shoot!
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-soccer-aim-right"
          onClick={() => { aimRef.current.x = Math.min(290, aimRef.current.x + 30); }}
          disabled={ballRef.current.active || gameOver}
        >
          Aim Right ▶
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="soccer-gameover">
          <h3 className={styles.overlayTitle}>SHOOTOUT COMPLETE</h3>
          <p className={styles.overlayText}>
            Goals Scored: {goals} / 5 | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-soccer-restart"
            onClick={restart}
          >
            Take Next Shootout
          </button>
        </div>
      )}
    </div>
  );
});

SoccerFreeKick.displayName = 'SoccerFreeKick';
