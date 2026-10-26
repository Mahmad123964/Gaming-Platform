import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface TennisChampionshipRef {
  restart: () => void;
  getScore: () => number;
}

interface TennisChampionshipProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const TennisChampionship = forwardRef<TennisChampionshipRef, TennisChampionshipProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerPoints, setPlayerPoints] = useState<number>(initialScore);
  const [gamesWon, setGamesWon] = useState<number>(0);
  const [aiGamesWon, setAiGamesWon] = useState<number>(0);
  const [rallyCount, setRallyCount] = useState<number>(0);
  const [state, setState] = useState<'READY' | 'PLAYING' | 'POINT_OVER'>('READY');
  const [commentary, setCommentary] = useState<string>('First Serve! Tap Serve Ball to begin.');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const ballRef = useRef({
    x: 180,
    y: 200,
    vx: 0,
    vy: 0,
    active: false,
    bounced: false,
    lastHit: 'PLAYER' as 'PLAYER' | 'AI'
  });

  const playerRef = useRef({ x: 180, y: 220, targetX: 180 });
  const aiRef = useRef({ x: 180, y: 50, speed: 2.4 });

  const updateScore = useCallback((newPoints: number) => {
    scoreRef.current = newPoints;
    setPlayerPoints(newPoints);
    onScoreUpdate?.(newPoints);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setPlayerPoints(0);
    setGamesWon(0);
    setAiGamesWon(0);
    setRallyCount(0);
    setState('READY');
    setCommentary('First Serve! Tap Serve Ball to begin.');
    ballRef.current = { x: 180, y: 200, vx: 0, vy: 0, active: false, bounced: false, lastHit: 'PLAYER' };
    playerRef.current = { x: 180, y: 220, targetX: 180 };
    aiRef.current = { x: 180, y: 50, speed: 2.4 };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const serve = useCallback(() => {
    if (state === 'PLAYING') return;
    ballRef.current = {
      x: playerRef.current.x,
      y: playerRef.current.y - 12,
      vx: (Math.random() - 0.5) * 2,
      vy: -4.5,
      active: true,
      bounced: false,
      lastHit: 'PLAYER'
    };
    setState('PLAYING');
    setCommentary('Clean serve into opponent court!');
  }, [state]);

  const returnShot = useCallback((type: 'TOPSPIN' | 'SLICE' | 'LOB') => {
    if (state !== 'PLAYING' || !ballRef.current.active) return;
    const b = ballRef.current;
    const p = playerRef.current;
    const dist = Math.hypot(b.x - p.x, b.y - p.y);

    if (dist > 50 || b.vy <= 0) {
      setCommentary('Missed timing window!');
      return;
    }

    if (type === 'TOPSPIN') {
      b.vy = -5.5;
      b.vx = (b.x - p.x) * 0.18 + (Math.random() - 0.5) * 1.5;
      setCommentary('Heavy Topspin groundstroke!');
    } else if (type === 'SLICE') {
      b.vy = -3.8;
      b.vx = (b.x - p.x) * 0.22 - 1.2;
      setCommentary('Backspin cross-court slice!');
    } else {
      // LOB
      b.vy = -4.2;
      b.vx = (b.x - p.x) * 0.12;
      setCommentary('Deep baseline lob!');
    }

    b.lastHit = 'PLAYER';
    setRallyCount(r => r + 1);
    updateScore(scoreRef.current + 15);
  }, [state, updateScore]);

  // Main canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    runningRef.current = true;
    let animId: number;

    const render = () => {
      if (!runningRef.current) return;
      const W = canvas.width;
      const H = canvas.height;

      // Grass court background
      ctx.fillStyle = '#15803d'; // Rich Wimbledon green
      ctx.fillRect(0, 0, W, H);

      // Tennis Court Lines
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 25, W - 80, H - 50); // Baseline & sidelines
      ctx.strokeRect(65, 55, W - 130, H - 110); // Service boxes

      // Service center line
      ctx.beginPath();
      ctx.moveTo(W / 2, 55);
      ctx.lineTo(W / 2, H - 55);
      ctx.stroke();

      // Center net
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(35, H / 2);
      ctx.lineTo(W - 35, H / 2);
      ctx.stroke();

      // Net mesh pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 40; x <= W - 40; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, H / 2 - 3);
        ctx.lineTo(x, H / 2 + 3);
        ctx.stroke();
      }

      // Ball physics
      const b = ballRef.current;
      if (b.active && state === 'PLAYING') {
        b.x += b.vx;
        b.y += b.vy;

        // Sideline rebound / bounds
        if (b.x < 30 || b.x > W - 30) {
          b.active = false;
          if (b.lastHit === 'PLAYER') {
            setAiGamesWon(g => g + 1);
            setCommentary('Ball sailed wide! Point to opponent.');
          } else {
            updateScore(scoreRef.current + 30);
            setGamesWon(g => g + 1);
            setCommentary('Opponent hit wide! Point to player.');
          }
          setState('POINT_OVER');
        }

        // Opponent (AI) court logic
        const ai = aiRef.current;
        if (b.y < H / 2) {
          if (ai.x < b.x) ai.x += ai.speed;
          if (ai.x > b.x) ai.x -= ai.speed;

          // AI hit return
          if (b.y <= 65 && Math.abs(b.x - ai.x) < 30 && b.lastHit === 'PLAYER') {
            b.vy = 4.2 + Math.random() * 1.5;
            b.vx = (b.x - ai.x) * 0.15 + (Math.random() - 0.5);
            b.lastHit = 'AI';
            setRallyCount(r => r + 1);
            setCommentary('Opponent returned deep groundstroke!');
          }
        }

        // Baseline miss checks
        if (b.y > H - 15) {
          b.active = false;
          setAiGamesWon(g => g + 1);
          setCommentary('Missed at baseline! Point to opponent.');
          setState('POINT_OVER');
        } else if (b.y < 15) {
          b.active = false;
          updateScore(scoreRef.current + 50);
          setGamesWon(g => g + 1);
          setCommentary('Winner past opponent baseline! Game point!');
          setState('POINT_OVER');
        }
      }

      // Draw Player (Bottom baseline)
      const p = playerRef.current;
      p.x += (p.targetX - p.x) * 0.2;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      // Racket
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x + 12, p.y - 4, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Draw AI Opponent (Top baseline)
      const ai = aiRef.current;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ai.x, ai.y, 8, 0, Math.PI * 2);
      ctx.fill();
      // Opponent racket
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ai.x - 12, ai.y + 4, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Tennis Ball (Optic Yellow)
      if (b.active) {
        ctx.fillStyle = '#ccff00';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [state, updateScore]);

  return (
    <div className={styles.container} id="tennis-championship-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Player Points</span>
          <span className={styles.scoreValue} id="tennis-points">{playerPoints}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Games (P / AI)</span>
          <span className={styles.scoreValue}>{gamesWon} - {aiGamesWon}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Rally</span>
          <span className={styles.scoreValue}>{rallyCount}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="tennis-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#ccff00', textAlign: 'center' }}>
        {commentary}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-tennis-serve"
          onClick={serve}
          disabled={state === 'PLAYING'}
        >
          🎾 Serve Ball
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-topspin"
          onClick={() => returnShot('TOPSPIN')}
          disabled={state !== 'PLAYING'}
        >
          Topspin Drive
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-slice"
          onClick={() => returnShot('SLICE')}
          disabled={state !== 'PLAYING'}
        >
          Backspin Slice
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-lob"
          onClick={() => returnShot('LOB')}
          disabled={state !== 'PLAYING'}
        >
          Deep Lob
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-move-left"
          onClick={() => { playerRef.current.targetX = Math.max(50, playerRef.current.targetX - 30); }}
        >
          ◀ Move Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tennis-move-right"
          onClick={() => { playerRef.current.targetX = Math.min(310, playerRef.current.targetX + 30); }}
        >
          Move Right ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-tennis-restart"
          onClick={restart}
        >
          Restart Championship
        </button>
      </div>
    </div>
  );
});

TennisChampionship.displayName = 'TennisChampionship';
