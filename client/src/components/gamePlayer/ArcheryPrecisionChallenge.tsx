import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface ArcheryPrecisionChallengeRef {
  restart: () => void;
  getScore: () => number;
}

interface ArcheryPrecisionChallengeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const ArcheryPrecisionChallenge = forwardRef<ArcheryPrecisionChallengeRef, ArcheryPrecisionChallengeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [arrowsLeft, setArrowsLeft] = useState<number>(5);
  const [wind, setWind] = useState<number>(2.4); // Crosswind in knots
  const [drawPower, setDrawPower] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Olympic Archery: Account for crosswind, draw bowstring, hit the 10-ring!');
  const [gameState, setGameState] = useState<'AIMING' | 'SHOOTING' | 'COMPLETED'>('AIMING');

  const scoreRef = useRef<number>(initialScore);
  const aimY = useRef<number>(130);
  const arrows = useRef<{ x: number; y: number; vx: number; vy: number; stuck: boolean; ringScore: number }[]>([]);
  const animRef = useRef<number | null>(null);
  const drawInterval = useRef<NodeJS.Timeout | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    aimY.current = 130;
    setScore(0);
    setArrowsLeft(5);
    setWind((Math.random() - 0.5) * 6);
    setDrawPower(0);
    setIsDrawing(false);
    setGameState('AIMING');
    setStatusText('Archery range reset! Aim for the gold bullseye.');
    arrows.current = [];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const startDraw = () => {
    if (gameState !== 'AIMING' || arrowsLeft <= 0 || isDrawing) return;
    setIsDrawing(true);
    setDrawPower(20);
    drawInterval.current = setInterval(() => {
      setDrawPower(p => {
        if (p >= 100) return 100;
        return p + 10;
      });
    }, 150);
  };

  const releaseArrow = () => {
    if (!isDrawing || gameState !== 'AIMING') return;
    if (drawInterval.current) clearInterval(drawInterval.current);
    setIsDrawing(false);
    setGameState('SHOOTING');
    setArrowsLeft(a => a - 1);

    const speed = (drawPower / 100) * 8.5;
    const arrowObj = {
      x: 60,
      y: aimY.current,
      vx: speed,
      vy: (130 - aimY.current) * 0.02,
      stuck: false,
      ringScore: 0
    };
    arrows.current.push(arrowObj);
    setStatusText('🏹 Arrow released! Tracking ballistics through the crosswind...');
  };

  const aimUp = () => {
    if (gameState !== 'AIMING') return;
    aimY.current = Math.max(70, aimY.current - 12);
  };

  const aimDown = () => {
    if (gameState !== 'AIMING') return;
    aimY.current = Math.min(190, aimY.current + 12);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const targetX = 350;
    const targetY = 130;

    const render = () => {
      if (!running) return;

      // Update Arrows in Flight
      arrows.current.forEach(arrow => {
        if (!arrow.stuck) {
          arrow.x += arrow.vx;
          arrow.y += arrow.vy;
          arrow.vy += 0.04; // Gravity drop
          arrow.y += wind * 0.02; // Crosswind deflection

          // Target Hit Check
          if (arrow.x >= targetX) {
            arrow.stuck = true;
            arrow.x = targetX;
            const distFromCenter = Math.abs(arrow.y - targetY);
            let pts = 0;
            if (distFromCenter < 8) pts = 10; // Gold Bullseye
            else if (distFromCenter < 16) pts = 9;
            else if (distFromCenter < 26) pts = 8; // Red
            else if (distFromCenter < 36) pts = 7;
            else if (distFromCenter < 48) pts = 6; // Blue
            else if (distFromCenter < 60) pts = 5;
            else if (distFromCenter < 72) pts = 4; // Black
            else if (distFromCenter < 85) pts = 2; // White
            else pts = 0; // Miss

            arrow.ringScore = pts;
            const nextScore = scoreRef.current + pts * 25;
            updateScore(nextScore);

            setStatusText(pts === 10 ? '🎯 GOLD BULLSEYE! PERFECT 10-RING (+250 PTS)!' : `Target Hit: ${pts} Ring (+${pts * 25} PTS)!`);
            setWind((Math.random() - 0.5) * 6);

            if (arrowsLeft <= 1) {
              setGameState('COMPLETED');
              setStatusText(`🏆 TOURNAMENT COMPLETED! Final Archery Score: ${nextScore}`);
              onGameOver?.(nextScore);
            } else {
              setGameState('AIMING');
            }
          }
        }
      });

      // Draw Archery Range (Grass Field & Sky)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // Green Turf
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 180, 400, 80);

      // Target Butt (Wood stand at x = 350)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(348, 170, 8, 50);

      // Target Rings (Face centered at 350, 130)
      const rings = [
        { r: 75, color: '#f8fafc' }, // White (1-2)
        { r: 55, color: '#0f172a' }, // Black (3-4)
        { r: 40, color: '#0284c7' }, // Blue (5-6)
        { r: 25, color: '#dc2626' }, // Red (7-8)
        { r: 12, color: '#eab308' }  // Gold 10-ring
      ];

      rings.forEach(ring => {
        ctx.fillStyle = ring.color;
        ctx.beginPath();
        ctx.arc(targetX, targetY, ring.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw Archer Bow (Left side at x = 60)
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(60, aimY.current, 28, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();

      // Bowstring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60 + Math.cos(-Math.PI / 3) * 28, aimY.current + Math.sin(-Math.PI / 3) * 28);
      if (isDrawing) {
        ctx.lineTo(40, aimY.current); // Drawn back
      } else {
        ctx.lineTo(60 + Math.cos(Math.PI / 3) * 28, aimY.current + Math.sin(Math.PI / 3) * 28);
      }
      ctx.stroke();

      // Draw Arrows
      arrows.current.forEach(a => {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x - 22, a.y); ctx.lineTo(a.x, a.y);
        ctx.stroke();

        // Feathers (fletching)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(a.x - 24, a.y - 3, 5, 6);
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [arrowsLeft, isDrawing, wind, onGameOver, updateScore]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Archery Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Arrows</span>
          <span className={styles.scoreValue}>{arrowsLeft} / 5</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Crosswind</span>
          <span className={styles.scoreValue} style={{ color: wind > 0 ? '#38bdf8' : '#f59e0b' }}>
            {wind > 0 ? `▶ +${wind.toFixed(1)}kt` : `◀ ${wind.toFixed(1)}kt`}
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Tension</span>
          <span className={styles.scoreValue}>{drawPower}%</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={260} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '24px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-archery-draw"
          onClick={startDraw}
          disabled={isDrawing || arrowsLeft <= 0 || gameState !== 'AIMING'}
        >
          🏹 Draw Bow
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-archery-release"
          onClick={releaseArrow}
          disabled={!isDrawing}
        >
          🎯 Release Arrow
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-archery-aim-up"
          onClick={aimUp}
          disabled={gameState !== 'AIMING'}
        >
          ▲ Aim Up
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-archery-aim-down"
          onClick={aimDown}
          disabled={gameState !== 'AIMING'}
        >
          ▼ Aim Down
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-archery-restart"
          onClick={restart}
        >
          Restart Archery Competition
        </button>
      </div>
    </div>
  );
});

ArcheryPrecisionChallenge.displayName = 'ArcheryPrecisionChallenge';
