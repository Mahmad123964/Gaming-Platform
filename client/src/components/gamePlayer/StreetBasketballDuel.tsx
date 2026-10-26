import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface StreetBasketballDuelRef {
  restart: () => void;
  getScore: () => number;
}

interface StreetBasketballDuelProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const StreetBasketballDuel = forwardRef<StreetBasketballDuelRef, StreetBasketballDuelProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerPoints, setPlayerPoints] = useState<number>(initialScore);
  const [oppPoints, setOppPoints] = useState<number>(0);
  const [shotClock, setShotClock] = useState<number>(14);
  const [possession, setPossession] = useState<'PLAYER' | 'AI'>('PLAYER');
  const [gameState, setGameState] = useState<'PLAYING' | 'SHOOTING' | 'GAME_OVER'>('PLAYING');
  const [commentary, setCommentary] = useState<string>('Streetball 1v1: First to 15 Points! You have the ball.');

  const scoreRef = useRef<number>(initialScore);
  const oppRef = useRef<number>(0);
  const playerPos = useRef({ x: 200, y: 220, space: 1.0 });
  const aiPos = useRef({ x: 200, y: 160, ankleBroken: false });
  const ballPos = useRef({ x: 200, y: 220, z: 0, vx: 0, vy: 0, vz: 0, active: false });
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newPoints: number) => {
    scoreRef.current = newPoints;
    setPlayerPoints(newPoints);
    onScoreUpdate?.(newPoints);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    oppRef.current = 0;
    setPlayerPoints(0);
    setOppPoints(0);
    setShotClock(14);
    setPossession('PLAYER');
    setGameState('PLAYING');
    setCommentary('Blacktop Duel restarted! First to 15 points wins.');
    playerPos.current = { x: 200, y: 220, space: 1.0 };
    aiPos.current = { x: 200, y: 160, ankleBroken: false };
    ballPos.current = { x: 200, y: 220, z: 0, vx: 0, vy: 0, vz: 0, active: false };
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const crossover = () => {
    if (gameState !== 'PLAYING' || possession !== 'PLAYER') return;
    const success = Math.random() > 0.35;
    if (success) {
      aiPos.current.ankleBroken = true;
      aiPos.current.x += (Math.random() > 0.5 ? 40 : -40);
      playerPos.current.space = 2.5;
      setCommentary('🔥 SHIFTY CROSSOVER! Defender lost his footing! Wide open!');
    } else {
      playerPos.current.space = 0.8;
      setCommentary('Defender stayed in front! Tight on-ball contest.');
    }
  };

  const shootJumper = () => {
    if (gameState !== 'PLAYING' || possession !== 'PLAYER') return;
    setGameState('SHOOTING');
    const isThree = playerPos.current.y > 210;
    const pts = isThree ? 3 : 2;
    const spaceBonus = playerPos.current.space * 0.25;
    const makeChance = (isThree ? 0.45 : 0.65) + spaceBonus;

    ballPos.current = {
      x: playerPos.current.x,
      y: playerPos.current.y,
      z: 10,
      vx: (200 - playerPos.current.x) * 0.05,
      vy: -4.5,
      vz: 4.0,
      active: true
    };

    setTimeout(() => {
      if (Math.random() < makeChance) {
        const next = scoreRef.current + pts;
        updateScore(next);
        setCommentary(`SWISH! Drained the ${pts}-pointer! (${next} - ${oppRef.current})`);
        if (next >= 15) {
          setGameState('GAME_OVER');
          setCommentary(`🏆 STREET KING! Won 1v1 showdown ${next} - ${oppRef.current}!`);
          onGameOver?.(next);
          return;
        }
      } else {
        setCommentary('Clank! Brick off the back rim! Rebounded by AI.');
      }
      aiTurn();
    }, 900);
  };

  const driveLayup = () => {
    if (gameState !== 'PLAYING' || possession !== 'PLAYER') return;
    setGameState('SHOOTING');
    playerPos.current.y = 110;
    const makeChance = aiPos.current.ankleBroken ? 0.9 : 0.55;

    setTimeout(() => {
      if (Math.random() < makeChance) {
        const next = scoreRef.current + 2;
        updateScore(next);
        setCommentary(`💥 SLAM DUNK! Posterized the defender for 2 points! (${next} - ${oppRef.current})`);
        if (next >= 15) {
          setGameState('GAME_OVER');
          setCommentary(`🏆 STREET KING! Victorious ${next} - ${oppRef.current}!`);
          onGameOver?.(next);
          return;
        }
      } else {
        setCommentary('DENIED! Heavy block at the rim by defender!');
      }
      aiTurn();
    }, 700);
  };

  const aiTurn = () => {
    setPossession('AI');
    setGameState('PLAYING');
    playerPos.current = { x: 200, y: 150, space: 1.0 };
    aiPos.current = { x: 200, y: 220, ankleBroken: false };
    setCommentary('Defense! AI has possession. Step up and contest.');

    setTimeout(() => {
      // AI shoots after 1.5s
      const aiMakes = Math.random() < 0.45;
      if (aiMakes) {
        oppRef.current += 2;
        setOppPoints(oppRef.current);
        if (oppRef.current >= 15) {
          setGameState('GAME_OVER');
          setCommentary(`Game Over! AI won ${oppRef.current} - ${scoreRef.current}.`);
          onGameOver?.(scoreRef.current);
          return;
        }
        setCommentary(`AI scores a turnaround fadeaway. (${scoreRef.current} - ${oppRef.current})`);
      } else {
        setCommentary('Good defense! AI shot rimmed out! Defensive rebound.');
      }
      setPossession('PLAYER');
      playerPos.current = { x: 200, y: 220, space: 1.0 };
      aiPos.current = { x: 200, y: 160, ankleBroken: false };
      setGameState('PLAYING');
    }, 1500);
  };

  const attemptSteal = () => {
    if (possession !== 'AI' || gameState !== 'PLAYING') return;
    if (Math.random() < 0.4) {
      setCommentary('⚡ POCKET PICK! Stripped the ball for a fast turnover!');
      setPossession('PLAYER');
      playerPos.current = { x: 200, y: 220, space: 1.5 };
      aiPos.current = { x: 200, y: 160, ankleBroken: false };
    } else {
      setCommentary('Reach-in gamble missed! Defender blown by.');
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

      // Asphalt blacktop half-court
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 400, 260);

      // Key & paint (Orange/Red)
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(150, 40, 100, 100);

      // 3-point line arc
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(200, 45, 140, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      // Free throw circle
      ctx.beginPath();
      ctx.arc(200, 140, 35, 0, Math.PI * 2);
      ctx.stroke();

      // Backboard & Rim
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(170, 38); ctx.lineTo(230, 38);
      ctx.stroke();

      // Orange hoop ring
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(200, 46, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Player (Blue)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(playerPos.current.x, playerPos.current.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Draw AI (Red)
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(aiPos.current.x, aiPos.current.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Draw Basketball if in air
      const b = ballPos.current;
      if (b.active) {
        b.x += b.vx;
        b.y += b.vy;
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

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
          <span>Player</span>
          <span className={styles.scoreValue}>{playerPoints}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Opponent</span>
          <span className={styles.scoreValue}>{oppPoints}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Ball</span>
          <span className={styles.scoreValue}>{possession}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Target</span>
          <span className={styles.scoreValue}>15 PTS</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={260} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '36px' }}>
        {commentary}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-streetball-shoot"
          onClick={shootJumper}
          disabled={possession !== 'PLAYER' || gameState !== 'PLAYING'}
        >
          🏀 Pull-Up Jumper
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-streetball-crossover"
          onClick={crossover}
          disabled={possession !== 'PLAYER' || gameState !== 'PLAYING'}
        >
          ⚡ Crossover
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-streetball-drive"
          onClick={driveLayup}
          disabled={possession !== 'PLAYER' || gameState !== 'PLAYING'}
        >
          💥 Drive & Dunk
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-streetball-steal"
          onClick={attemptSteal}
          disabled={possession !== 'AI' || gameState !== 'PLAYING'}
        >
          🛡️ Strip Steal
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-streetball-restart"
          onClick={restart}
        >
          Restart Match
        </button>
      </div>
    </div>
  );
});

StreetBasketballDuel.displayName = 'StreetBasketballDuel';
