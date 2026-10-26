import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface TennisGrandSlamMiniRef {
  restart: () => void;
  getScore: () => number;
}

interface TennisGrandSlamMiniProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const POINTS = ['0', '15', '30', '40'];

export const TennisGrandSlamMini = forwardRef<TennisGrandSlamMiniRef, TennisGrandSlamMiniProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerGames, setPlayerGames] = useState<number>(initialScore);
  const [aiGames, setAiGames] = useState<number>(0);
  const [playerPointIdx, setPlayerPointIdx] = useState<number>(0);
  const [aiPointIdx, setAiPointIdx] = useState<number>(0);
  const [rallyCount, setRallyCount] = useState<number>(0);
  const [gameState, setGameState] = useState<'SERVE' | 'RALLY' | 'GAME_OVER'>('SERVE');
  const [statusText, setStatusText] = useState<string>('Grand Slam Final: First to 3 Games! Tap Serve.');

  const scoreRef = useRef<number>(initialScore);
  const pPtsRef = useRef<number>(0);
  const aiPtsRef = useRef<number>(0);
  const ballRef = useRef({ x: 200, y: 220, vx: 0, vy: 0, active: false, lastHitter: 'PLAYER' as 'PLAYER' | 'AI' });
  const playerRef = useRef({ x: 200, y: 235 });
  const aiRef = useRef({ x: 200, y: 45, speed: 2.8 });

  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((gamesWon: number) => {
    scoreRef.current = gamesWon;
    setPlayerGames(gamesWon);
    onScoreUpdate?.(gamesWon);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    pPtsRef.current = 0;
    aiPtsRef.current = 0;
    setPlayerGames(0);
    setAiGames(0);
    setPlayerPointIdx(0);
    setAiPointIdx(0);
    setRallyCount(0);
    setGameState('SERVE');
    setStatusText('Grand Slam Final restarted! Tap Serve.');
    ballRef.current = { x: 200, y: 220, vx: 0, vy: 0, active: false, lastHitter: 'PLAYER' };
    playerRef.current = { x: 200, y: 235 };
    aiRef.current = { x: 200, y: 45, speed: 2.8 };
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const serve = () => {
    if (gameState !== 'SERVE') return;
    setGameState('RALLY');
    setStatusText('Ace Serve sent down the "T" line!');
    ballRef.current = {
      x: playerRef.current.x,
      y: playerRef.current.y - 12,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -5.8,
      active: true,
      lastHitter: 'PLAYER'
    };
  };

  const hitShot = (shot: 'FOREHAND' | 'BACKHAND' | 'LOB') => {
    if (gameState !== 'RALLY') return;
    const b = ballRef.current;
    if (b.y < 140) {
      setStatusText('Wait for the ball to cross the net!');
      return;
    }

    if (shot === 'FOREHAND') {
      b.vx = 3.2;
      b.vy = -5.4;
      setStatusText('Heavy topspin forehand cross-court!');
    } else if (shot === 'BACKHAND') {
      b.vx = -3.2;
      b.vy = -5.2;
      setStatusText('Flat down-the-line backhand winner!');
    } else {
      b.vx = (Math.random() - 0.5) * 1.5;
      b.vy = -3.8;
      setStatusText('High defensive topspin lob over the net!');
    }
    b.lastHitter = 'PLAYER';
    setRallyCount(r => r + 1);
  };

  const winPoint = (winner: 'PLAYER' | 'AI', reason: string) => {
    ballRef.current.active = false;
    let p = pPtsRef.current;
    let a = aiPtsRef.current;

    if (winner === 'PLAYER') {
      if (p === 3 && a < 3) {
        // Player wins game
        pPtsRef.current = 0;
        aiPtsRef.current = 0;
        setPlayerPointIdx(0);
        setAiPointIdx(0);
        const newGames = scoreRef.current + 1;
        updateScore(newGames);
        if (newGames >= 3) {
          setGameState('GAME_OVER');
          setStatusText(`🏆 GRAND SLAM CHAMPION! Won match ${newGames} - ${aiGames}!`);
          onGameOver?.(newGames);
          return;
        }
        setStatusText(`GAME PLAYER! Leads ${newGames} - ${aiGames}`);
      } else {
        pPtsRef.current = p + 1;
        setPlayerPointIdx(p + 1);
        setStatusText(`Point Player: ${reason}`);
      }
    } else {
      if (a === 3 && p < 3) {
        // AI wins game
        pPtsRef.current = 0;
        aiPtsRef.current = 0;
        setPlayerPointIdx(0);
        setAiPointIdx(0);
        setAiGames(g => {
          const next = g + 1;
          if (next >= 3) {
            setGameState('GAME_OVER');
            setStatusText(`Match lost to AI: ${next} - ${scoreRef.current}`);
            onGameOver?.(scoreRef.current);
          } else {
            setStatusText(`Game Opponent: AI leads ${next} - ${scoreRef.current}`);
          }
          return next;
        });
      } else {
        aiPtsRef.current = a + 1;
        setAiPointIdx(a + 1);
        setStatusText(`Point Opponent: ${reason}`);
      }
    }

    setGameState('SERVE');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      // Tennis Court Surface (Clay / Roland Garros terracotta)
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, 400, 280);

      // Court Lines (White)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 20, 280, 240); // Outer boundary
      ctx.strokeRect(90, 20, 220, 240); // Singles lines

      // Net
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(50, 140); ctx.lineTo(350, 140);
      ctx.stroke();

      // Service boxes
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(90, 80); ctx.lineTo(310, 80);
      ctx.moveTo(90, 200); ctx.lineTo(310, 200);
      ctx.moveTo(200, 80); ctx.lineTo(200, 200);
      ctx.stroke();

      // Draw Player (Bottom)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(playerRef.current.x, playerRef.current.y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Draw AI Opponent (Top)
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(aiRef.current.x, aiRef.current.y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Ball Physics
      const b = ballRef.current;
      if (b.active) {
        b.x += b.vx;
        b.y += b.vy;

        // AI tracking
        if (b.vy < 0 && b.y < 120) {
          aiRef.current.x += (b.x - aiRef.current.x) * 0.08;
          if (Math.abs(b.x - aiRef.current.x) < 22 && Math.abs(b.y - aiRef.current.y) < 18) {
            b.vy = 5.2 + Math.random() * 0.8;
            b.vx = (Math.random() - 0.5) * 3.5;
            b.lastHitter = 'AI';
            setRallyCount(r => r + 1);
          }
        }

        // Out of court bounds check
        if (b.y < 15) {
          winPoint('PLAYER', 'Opponent missed return / ball long');
        } else if (b.y > 265) {
          winPoint('AI', 'Player unforced error / ball past baseline');
        } else if (b.x < 55 || b.x > 345) {
          winPoint(b.lastHitter === 'PLAYER' ? 'AI' : 'PLAYER', 'Shot wide outside tramlines');
        }

        // Draw Tennis Ball (Optic Yellow)
        ctx.fillStyle = '#ccff00';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#84cc16';
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

  const scoreDisplay = `${POINTS[Math.min(3, playerPointIdx)] || '40'} - ${POINTS[Math.min(3, aiPointIdx)] || '40'}`;

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Games (Set)</span>
          <span className={styles.scoreValue}>{playerGames} - {aiGames}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Game Points</span>
          <span className={styles.scoreValue}>{scoreDisplay}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Rally</span>
          <span className={styles.scoreValue}>{rallyCount}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Surface</span>
          <span className={styles.scoreValue}>Clay Court</span>
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
          id="btn-tennis-serve"
          onClick={serve}
          disabled={gameState === 'RALLY'}
        >
          🎾 Ace Serve
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-forehand"
          onClick={() => hitShot('FOREHAND')}
          disabled={gameState !== 'RALLY'}
        >
          Topspin Forehand
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-backhand"
          onClick={() => hitShot('BACKHAND')}
          disabled={gameState !== 'RALLY'}
        >
          Backhand Drive
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-tennis-lob"
          onClick={() => hitShot('LOB')}
          disabled={gameState !== 'RALLY'}
        >
          Topspin Lob
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-tennis-restart"
          onClick={restart}
        >
          Restart Match
        </button>
      </div>
    </div>
  );
});

TennisGrandSlamMini.displayName = 'TennisGrandSlamMini';
