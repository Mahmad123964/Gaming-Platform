import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface BadmintonChallengeRef {
  restart: () => void;
  getScore: () => number;
}

interface BadmintonChallengeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const BadmintonChallenge = forwardRef<BadmintonChallengeRef, BadmintonChallengeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerScore, setPlayerScore] = useState<number>(initialScore);
  const [aiScore, setAiScore] = useState<number>(0);
  const [rallyLength, setRallyLength] = useState<number>(0);
  const [gameState, setGameState] = useState<'SERVE' | 'RALLY' | 'GAME_OVER'>('SERVE');
  const [statusText, setStatusText] = useState<string>('Tap Serve to begin match!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  // Shuttlecock physics state
  const shuttleRef = useRef({
    x: 100,
    y: 180,
    vx: 0,
    vy: 0,
    active: false,
    lastHitter: 'PLAYER' as 'PLAYER' | 'AI'
  });

  const playerRef = useRef({ x: 80, y: 220, targetX: 80 });
  const aiRef = useRef({ x: 320, y: 220, speed: 2.2 });

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setPlayerScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setPlayerScore(0);
    setAiScore(0);
    setRallyLength(0);
    setGameState('SERVE');
    setStatusText('Tap Serve to begin match!');
    shuttleRef.current = { x: 100, y: 180, vx: 0, vy: 0, active: false, lastHitter: 'PLAYER' };
    playerRef.current = { x: 80, y: 220, targetX: 80 };
    aiRef.current = { x: 320, y: 220, speed: 2.2 };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const serve = useCallback(() => {
    if (gameState === 'GAME_OVER' || shuttleRef.current.active) return;
    shuttleRef.current = {
      x: playerRef.current.x + 10,
      y: playerRef.current.y - 20,
      vx: 3.8,
      vy: -4.5,
      active: true,
      lastHitter: 'PLAYER'
    };
    setGameState('RALLY');
    setStatusText('Rally active! Time your shots.');
  }, [gameState]);

  const hitShot = useCallback((shotType: 'CLEAR' | 'DROP' | 'SMASH') => {
    if (!shuttleRef.current.active || gameState !== 'RALLY') return;
    const s = shuttleRef.current;
    const p = playerRef.current;
    const dist = Math.hypot(s.x - p.x, s.y - p.y);

    if (dist > 65 || s.x > 200) {
      setStatusText('Too far from shuttlecock!');
      return;
    }

    if (shotType === 'SMASH') {
      s.vx = 6.2;
      s.vy = 2.5;
      setStatusText('Power Smash!');
    } else if (shotType === 'DROP') {
      s.vx = 2.8;
      s.vy = -2.0;
      setStatusText('Feather Drop Shot!');
    } else {
      // CLEAR
      s.vx = 4.2;
      s.vy = -6.0;
      setStatusText('High Clear to backcourt!');
    }

    s.lastHitter = 'PLAYER';
    setRallyLength(r => r + 1);
    updateScore(scoreRef.current + 10);
  }, [gameState, updateScore]);

  // Main canvas animation loop
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

      // Draw badminton court
      ctx.fillStyle = '#064e3b'; // Court green
      ctx.fillRect(0, 0, W, H);

      // Court boundary lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 40, W - 40, H - 70);

      // Center net
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(W / 2 - 2, 120, 4, H - 150);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      for (let y = 120; y < H - 30; y += 8) {
        ctx.beginPath();
        ctx.moveTo(W / 2 - 2, y);
        ctx.lineTo(W / 2 + 2, y);
        ctx.stroke();
      }

      // Net post top
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(W / 2, 120, 4, 0, Math.PI * 2);
      ctx.fill();

      // Shuttlecock simulation
      const s = shuttleRef.current;
      if (s.active && gameState === 'RALLY') {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.16; // Gravity
        s.vx *= 0.985; // Air drag

        // Net collision check
        if (Math.abs(s.x - W / 2) < 5 && s.y >= 120 && s.y <= H - 30) {
          s.active = false;
          if (s.lastHitter === 'PLAYER') {
            setAiScore(a => a + 1);
            setStatusText('Shuttle faulted into net! Point to AI.');
          } else {
            updateScore(scoreRef.current + 50);
            setStatusText('AI hit the net! Point to Player.');
          }
          setGameState('SERVE');
        }

        // Court floor collision
        if (s.y >= H - 32) {
          s.active = false;
          if (s.x > W / 2 && s.x < W - 20) {
            // Player hit landed in AI court
            updateScore(scoreRef.current + 50);
            setStatusText('Winning shot in AI court! Point to Player.');
          } else if (s.x <= W / 2 && s.x >= 20) {
            // Landed in player court
            setAiScore(a => a + 1);
            setStatusText('AI winner in your court! Point to AI.');
          } else {
            // Out of bounds
            if (s.lastHitter === 'PLAYER') {
              setAiScore(a => a + 1);
              setStatusText('Shot landed out of bounds! Point to AI.');
            } else {
              updateScore(scoreRef.current + 50);
              setStatusText('AI hit out of bounds! Point to Player.');
            }
          }
          setGameState('SERVE');
        }

        // AI court tracking and return
        const ai = aiRef.current;
        if (s.x > W / 2) {
          if (ai.x < s.x) ai.x += ai.speed;
          if (ai.x > s.x) ai.x -= ai.speed;

          // AI hit window
          if (Math.abs(s.x - ai.x) < 25 && Math.abs(s.y - ai.y) < 35 && s.lastHitter === 'PLAYER') {
            s.vx = -(3.2 + Math.random() * 2.5);
            s.vy = -(3.0 + Math.random() * 2.5);
            s.lastHitter = 'AI';
            setRallyLength(r => r + 1);
            setStatusText('AI returned the rally!');
          }
        }
      }

      // Draw Player (Left court)
      const p = playerRef.current;
      p.x += (p.targetX - p.x) * 0.15;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 15, 10, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillRect(p.x - 6, p.y - 5, 12, 20); // Torso
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x + 6, p.y);
      ctx.lineTo(p.x + 18, p.y - 12); // Racket arm
      ctx.stroke();

      // Draw AI Opponent (Right court)
      const ai = aiRef.current;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(ai.x, ai.y - 15, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(ai.x - 6, ai.y - 5, 12, 20);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ai.x - 6, ai.y);
      ctx.lineTo(ai.x - 18, ai.y - 12);
      ctx.stroke();

      // Draw Shuttlecock
      if (s.active) {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [gameState, updateScore]);

  return (
    <div className={styles.container} id="badminton-challenge-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Player</span>
          <span className={styles.scoreValue} id="badminton-score">{playerScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Rally</span>
          <span className={styles.scoreValue}>{rallyLength}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>AI Score</span>
          <span className={styles.scoreValue}>{aiScore}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={400}
          height={260}
          className={styles.gameCanvas}
          id="badminton-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-badminton-serve"
          onClick={serve}
          disabled={gameState === 'RALLY'}
        >
          🏸 Serve
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-badminton-clear"
          onClick={() => hitShot('CLEAR')}
          disabled={gameState !== 'RALLY'}
        >
          High Clear
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-badminton-drop"
          onClick={() => hitShot('DROP')}
          disabled={gameState !== 'RALLY'}
        >
          Drop Shot
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-badminton-smash"
          onClick={() => hitShot('SMASH')}
          disabled={gameState !== 'RALLY'}
        >
          ⚡ Smash
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-badminton-left"
          onClick={() => { playerRef.current.targetX = Math.max(30, playerRef.current.targetX - 25); }}
        >
          ◀ Move Back
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-badminton-right"
          onClick={() => { playerRef.current.targetX = Math.min(180, playerRef.current.targetX + 25); }}
        >
          Move Net ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-badminton-restart"
          onClick={restart}
        >
          Restart Match
        </button>
      </div>
    </div>
  );
});

BadmintonChallenge.displayName = 'BadmintonChallenge';
