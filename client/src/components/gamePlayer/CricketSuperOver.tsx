import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface CricketSuperOverRef {
  restart: () => void;
  getScore: () => number;
}

interface CricketSuperOverProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const CricketSuperOver = forwardRef<CricketSuperOverRef, CricketSuperOverProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [runs, setRuns] = useState<number>(initialScore);
  const [wickets, setWickets] = useState<number>(0);
  const [ballsBowled, setBallsBowled] = useState<number>(0);
  const targetRuns = 18; // Super over target
  const [deliveryType, setDeliveryType] = useState<string>('YORKER');
  const [state, setState] = useState<'READY' | 'BOWLING' | 'BALL_OVER' | 'MATCH_END'>('READY');
  const [commentary, setCommentary] = useState<string>('Target: 18 runs from 6 balls. Tap Bowl Delivery to start!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const ballRef = useRef({
    x: 180,
    y: 60,
    vx: 0,
    vy: 0,
    active: false,
    bounced: false
  });

  const batsmanRef = useRef({
    x: 180,
    y: 215,
    shotState: 'IDLE' as 'IDLE' | 'LOFT' | 'DRIVE' | 'SWEEP'
  });

  const updateScore = useCallback((newRuns: number) => {
    scoreRef.current = newRuns;
    setRuns(newRuns);
    onScoreUpdate?.(newRuns);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setRuns(0);
    setWickets(0);
    setBallsBowled(0);
    setState('READY');
    setCommentary('Target: 18 runs from 6 balls. Tap Bowl Delivery to start!');
    ballRef.current = { x: 180, y: 60, vx: 0, vy: 0, active: false, bounced: false };
    batsmanRef.current.shotState = 'IDLE';
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const startDelivery = useCallback(() => {
    if (state === 'BOWLING' || state === 'MATCH_END') return;
    const types = ['YORKER', 'BOUNCER', 'SLOWER', 'OUTSWING'];
    const selected = types[Math.floor(Math.random() * types.length)];
    setDeliveryType(selected);

    let vy = 4.8;
    let vx = (Math.random() - 0.5) * 0.8;
    if (selected === 'BOUNCER') vy = 5.6;
    if (selected === 'SLOWER') vy = 3.2;
    if (selected === 'OUTSWING') vx = 1.2;

    ballRef.current = {
      x: 180,
      y: 60,
      vx,
      vy,
      active: true,
      bounced: false
    };
    batsmanRef.current.shotState = 'IDLE';
    setState('BOWLING');
    setCommentary(`Bowler running in... releasing ${selected}!`);
  }, [state]);

  const playShot = useCallback((shot: 'LOFT' | 'DRIVE' | 'SWEEP') => {
    if (state !== 'BOWLING' || !ballRef.current.active) return;
    const b = ballRef.current;
    const bat = batsmanRef.current;
    bat.shotState = shot;

    const timingDist = Math.abs(b.y - bat.y);

    if (timingDist > 45) {
      // Missed timing
      b.active = false;
      setBallsBowled(prev => {
        const next = prev + 1;
        if (next >= 6 || wickets >= 2) setState('MATCH_END'); else setState('BALL_OVER');
        return next;
      });
      setCommentary('Beaten by pace and swing! Dot ball.');
      return;
    }

    // Shot evaluation based on delivery & shot
    let runsEarned = 0;
    if (shot === 'LOFT') {
      if (timingDist < 15) {
        runsEarned = 6;
        b.vy = -7.5;
        b.vx = (Math.random() - 0.5) * 4;
        setCommentary('💥 MASSIVE SIX! Dispatched over deep mid-wicket into the stands!');
      } else if (timingDist < 30) {
        runsEarned = 4;
        b.vy = -5.0;
        setCommentary('Four runs! Clears the inner ring and races to the rope.');
      } else {
        setWickets(w => {
          const nextW = w + 1;
          if (nextW >= 2) setState('MATCH_END');
          return nextW;
        });
        b.active = false;
        setCommentary('OUT! Mistimed lofted drive caught at long-on!');
      }
    } else if (shot === 'DRIVE') {
      runsEarned = timingDist < 20 ? 4 : 2;
      b.vy = -4.2;
      setCommentary(`Superb straight drive for ${runsEarned} runs!`);
    } else {
      // SWEEP
      runsEarned = timingDist < 25 ? 4 : 1;
      b.vy = -3.8;
      b.vx = -4.5;
      setCommentary(`Controlled sweep behind square for ${runsEarned} runs!`);
    }

    if (runsEarned > 0) {
      updateScore(scoreRef.current + runsEarned);
    }

    setBallsBowled(prev => {
      const next = prev + 1;
      if (next >= 6 || scoreRef.current + runsEarned >= targetRuns || wickets >= 2) {
        setState('MATCH_END');
      } else {
        setState('BALL_OVER');
      }
      return next;
    });
  }, [state, wickets, targetRuns, updateScore]);

  // Canvas loop
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

      // Cricket outfield (Lush dark green)
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, W, H);

      // Pitch (Brown rectangular strip)
      ctx.fillStyle = '#d97706';
      ctx.fillRect(W / 2 - 25, 40, 50, H - 70);

      // Popping creases (White)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 30, 70);
      ctx.lineTo(W / 2 + 30, 70); // Bowling crease
      ctx.moveTo(W / 2 - 30, H - 50);
      ctx.lineTo(W / 2 + 30, H - 50); // Batting crease
      ctx.stroke();

      // Stumps (Yellow)
      ctx.fillStyle = '#fef08a';
      // Bowler stumps
      ctx.fillRect(W / 2 - 8, 48, 16, 6);
      // Batsman stumps
      ctx.fillRect(W / 2 - 8, H - 42, 16, 6);

      // Ball animation
      const b = ballRef.current;
      if (b.active) {
        b.x += b.vx;
        b.y += b.vy;

        // Bounce on pitch
        if (b.y >= 140 && !b.bounced) {
          b.bounced = true;
          b.vy *= 0.95;
        }

        // Draw red cricket ball
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Batsman
      const bat = batsmanRef.current;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(bat.x, bat.y, 9, 0, Math.PI * 2);
      ctx.fill();
      // Bat
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(bat.x, bat.y);
      if (bat.shotState === 'LOFT') {
        ctx.lineTo(bat.x - 14, bat.y - 16);
      } else if (bat.shotState === 'SWEEP') {
        ctx.lineTo(bat.x - 18, bat.y + 4);
      } else {
        ctx.lineTo(bat.x + 12, bat.y - 12);
      }
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={styles.container} id="cricket-super-over-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Runs</span>
          <span className={styles.scoreValue} id="cricket-runs">{runs}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Wickets</span>
          <span className={styles.scoreValue}>{wickets} / 2</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Balls Left</span>
          <span className={styles.scoreValue}>{Math.max(0, 6 - ballsBowled)}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Target</span>
          <span className={styles.scoreValue}>{targetRuns}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="cso-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#fbbf24', textAlign: 'center' }}>
        {commentary}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-cso-bowl-next"
          onClick={startDelivery}
          disabled={state === 'BOWLING' || state === 'MATCH_END'}
        >
          🏏 Bowl Delivery
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-cso-loft"
          onClick={() => playShot('LOFT')}
          disabled={state !== 'BOWLING'}
        >
          🚀 Loft for 6
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cso-drive"
          onClick={() => playShot('DRIVE')}
          disabled={state !== 'BOWLING'}
        >
          Straight Drive
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cso-sweep"
          onClick={() => playShot('SWEEP')}
          disabled={state !== 'BOWLING'}
        >
          Square Sweep
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-cso-restart"
          onClick={restart}
        >
          Play Super Over Again
        </button>
      </div>
    </div>
  );
});

CricketSuperOver.displayName = 'CricketSuperOver';
