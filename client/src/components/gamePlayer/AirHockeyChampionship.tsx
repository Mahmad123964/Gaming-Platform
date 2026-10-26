import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface AirHockeyChampionshipRef {
  restart: () => void;
  getScore: () => number;
}

interface AirHockeyChampionshipProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const AirHockeyChampionship = forwardRef<AirHockeyChampionshipRef, AirHockeyChampionshipProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerGoals, setPlayerGoals] = useState<number>(initialScore);
  const [aiGoals, setAiGoals] = useState<number>(0);
  const [rallyHits, setRallyHits] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Air Hockey Championship: First to 7 Goals! Deflect rapid bank shots.');
  const [gameState, setGameState] = useState<'PLAYING' | 'MATCH_OVER'>('PLAYING');

  const scoreRef = useRef<number>(initialScore);
  const aiGoalsRef = useRef<number>(0);
  const puck = useRef({ x: 200, y: 130, vx: 3.5, vy: 2.2, radius: 8 });
  const playerMallet = useRef({ x: 80, y: 130, radius: 16 });
  const aiMallet = useRef({ x: 320, y: 130, radius: 16, targetY: 130 });
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newGoals: number) => {
    scoreRef.current = newGoals;
    setPlayerGoals(newGoals);
    onScoreUpdate?.(newGoals);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    aiGoalsRef.current = 0;
    setPlayerGoals(0);
    setAiGoals(0);
    setRallyHits(0);
    setGameState('PLAYING');
    setStatusText('Air hockey match restarted! Strike puck toward opponent goal.');
    puck.current = { x: 200, y: 130, vx: 3.5, vy: 2.2, radius: 8 };
    playerMallet.current = { x: 80, y: 130, radius: 16 };
    aiMallet.current = { x: 320, y: 130, radius: 16, targetY: 130 };
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const strikePuck = () => {
    if (gameState !== 'PLAYING') return;
    const p = puck.current;
    p.vx = 7.5;
    p.vy = (Math.random() - 0.5) * 4;
    setRallyHits(r => r + 1);
    setStatusText('⚡ HARD STRIKE! High velocity shot fired straight at goal!');
  };

  const defendBlock = () => {
    if (gameState !== 'PLAYING') return;
    playerMallet.current.x = 40;
    playerMallet.current.y = 130;
    const p = puck.current;
    if (p.x < 120) {
      p.vx = 5.0;
      p.vy *= -1;
      setRallyHits(r => r + 1);
      setStatusText('🛡️ Clean mallet block and clearance!');
    }
  };

  const bankShot = () => {
    if (gameState !== 'PLAYING') return;
    const p = puck.current;
    p.vx = 6.2;
    p.vy = (p.y > 130 ? -5.5 : 5.5);
    setRallyHits(r => r + 1);
    setStatusText('🎯 CUSHION BANK SHOT! Sharp angled carom off the rail!');
  };

  const scoreGoal = (scorer: 'PLAYER' | 'AI') => {
    puck.current.x = 200;
    puck.current.y = 130;
    puck.current.vx = scorer === 'PLAYER' ? -3.5 : 3.5;
    puck.current.vy = (Math.random() - 0.5) * 3;

    if (scorer === 'PLAYER') {
      const next = scoreRef.current + 1;
      updateScore(next);
      setStatusText(`🚨 GOAL! Player scores! (${next} - ${aiGoalsRef.current})`);
      if (next >= 7) {
        setGameState('MATCH_OVER');
        setStatusText(`🏆 AIR HOCKEY CHAMPION! Won championship 7 - ${aiGoalsRef.current}!`);
        onGameOver?.(next);
      }
    } else {
      aiGoalsRef.current += 1;
      setAiGoals(aiGoalsRef.current);
      setStatusText(`Opponent Goal! AI scores. (${scoreRef.current} - ${aiGoalsRef.current})`);
      if (aiGoalsRef.current >= 7) {
        setGameState('MATCH_OVER');
        setStatusText(`Match Lost! AI won 7 - ${scoreRef.current}.`);
        onGameOver?.(scoreRef.current);
      }
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

      const p = puck.current;
      const pm = playerMallet.current;
      const am = aiMallet.current;

      // Puck Physics (Zero Friction Rink)
      p.x += p.vx;
      p.y += p.vy;

      // Rail bounces (Top & Bottom)
      if (p.y < 20 || p.y > 240) {
        p.vy *= -1;
      }

      // Goal detection (Left & Right ends)
      if (p.x < 15) {
        if (p.y > 85 && p.y < 175) {
          scoreGoal('AI');
        } else {
          p.vx *= -1;
        }
      } else if (p.x > 385) {
        if (p.y > 85 && p.y < 175) {
          scoreGoal('PLAYER');
        } else {
          p.vx *= -1;
        }
      }

      // AI Mallet Tracking
      am.y += (p.y - am.y) * 0.08;
      if (am.y < 50) am.y = 50;
      if (am.y > 210) am.y = 210;

      // Mallet Collision - AI
      if (Math.hypot(p.x - am.x, p.y - am.y) < p.radius + am.radius) {
        p.vx = -(5.0 + Math.random() * 2);
        p.vy = (p.y - am.y) * 0.3;
        setRallyHits(r => r + 1);
      }

      // Mallet Collision - Player
      if (Math.hypot(p.x - pm.x, p.y - pm.y) < p.radius + pm.radius) {
        p.vx = 5.0 + Math.random() * 2;
        p.vy = (p.y - pm.y) * 0.3;
        setRallyHits(r => r + 1);
      }

      // Draw Air Hockey Table
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // White Rink Surface with Red Lines
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(15, 15, 370, 230);

      // Center Line & Faceoff Circle
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(200, 15); ctx.lineTo(200, 245);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(200, 130, 35, 0, Math.PI * 2);
      ctx.stroke();

      // Goal Pockets
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(5, 85, 10, 90);
      ctx.fillRect(385, 85, 10, 90);

      // Draw Player Mallet (Blue)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(pm.x, pm.y, pm.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw AI Mallet (Red)
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(am.x, am.y, am.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw Puck (Solid Black Disk with Red Rim)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Player Goals</span>
          <span className={styles.scoreValue}>{playerGoals}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>AI Opponent</span>
          <span className={styles.scoreValue}>{aiGoals}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Rally Hits</span>
          <span className={styles.scoreValue}>{rallyHits}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Format</span>
          <span className={styles.scoreValue}>First to 7</span>
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
          id="btn-airhockey-strike"
          onClick={strikePuck}
          disabled={gameState !== 'PLAYING'}
        >
          ⚡ Direct Strike
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-airhockey-defend"
          onClick={defendBlock}
          disabled={gameState !== 'PLAYING'}
        >
          🛡️ Defend Goal
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-airhockey-bankshot"
          onClick={bankShot}
          disabled={gameState !== 'PLAYING'}
        >
          🎯 Rail Bank Shot
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-airhockey-restart"
          onClick={restart}
        >
          Restart Air Hockey Match
        </button>
      </div>
    </div>
  );
});

AirHockeyChampionship.displayName = 'AirHockeyChampionship';
