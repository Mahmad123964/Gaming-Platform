import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ArcadeCricket.module.css';

export interface ArcadeCricketRef {
  restart: () => void;
  getScore: () => number;
}

interface ArcadeCricketProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type BallStatus = 'BOWLING' | 'PLAYED' | 'DEAD';

export const ArcadeCricket = forwardRef<ArcadeCricketRef, ArcadeCricketProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [runs, setRuns] = useState<number>(initialScore);
  const [wickets, setWickets] = useState<number>(0);
  const [ballsBowled, setBallsBowled] = useState<number>(0);
  const [commentary, setCommentary] = useState<string>('Bowler stepping up to delivery crease...');
  const [gameOver, setGameOver] = useState<boolean>(false);

  const runsRef = useRef<number>(initialScore);
  const wicketsRef = useRef<number>(0);
  const ballsRef = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  // Ball physics & state
  const ballRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    vx: number;
    vy: number;
    speed: number;
    radius: number;
    status: BallStatus;
    hasBounced: boolean;
  }>({
    x: 180,
    y: 80,
    targetX: 180,
    targetY: 420,
    vx: 0,
    vy: 5,
    speed: 5.5,
    radius: 7,
    status: 'DEAD',
    hasBounced: false
  });

  const batsmanSwingRef = useRef<{ isSwinging: boolean; swingTick: number; shotType: 'LOFT' | 'DEFEND' }>({
    isSwinging: false,
    swingTick: 0,
    shotType: 'LOFT'
  });

  const nextDeliveryDelayRef = useRef<number>(60);

  // Bowling pitch parameters
  const PITCH_TOP = 80;
  const PITCH_BOTTOM = 460;
  const BATSMAN_Y = 440;
  const MAX_WICKETS = 3;
  const MAX_BALLS = 12; // 2 Overs match

  const deliverBall = useCallback(() => {
    if (wicketsRef.current >= MAX_WICKETS || ballsRef.current >= MAX_BALLS) return;

    const variations = [-25, -15, 0, 15, 25];
    const targetX = 180 + variations[Math.floor(Math.random() * variations.length)];
    const speed = 4.8 + Math.random() * 2.2;

    ballRef.current = {
      x: 180,
      y: PITCH_TOP,
      targetX,
      targetY: 340 + Math.random() * 40,
      vx: (targetX - 180) / 45,
      vy: speed,
      speed,
      radius: 7,
      status: 'BOWLING',
      hasBounced: false
    };
    setCommentary('Here comes the bowler... Eyes on the seam!');
  }, []);

  const restart = useCallback(() => {
    runsRef.current = 0;
    wicketsRef.current = 0;
    ballsRef.current = 0;
    runningRef.current = true;
    nextDeliveryDelayRef.current = 40;
    setRuns(0);
    setWickets(0);
    setBallsBowled(0);
    setGameOver(false);
    setCommentary('New innings initiated! 2 Overs • 3 Wickets match.');
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => runsRef.current
  }), [restart]);

  // Player Shot Execution
  const triggerShot = useCallback((shotType: 'LOFT' | 'DEFEND') => {
    if (!runningRef.current) return;
    if (batsmanSwingRef.current.isSwinging) return;

    batsmanSwingRef.current = { isSwinging: true, swingTick: 0, shotType };
    const ball = ballRef.current;

    if (ball.status !== 'BOWLING') return;

    const distToBat = Math.abs(ball.y - BATSMAN_Y);
    const lateralDist = Math.abs(ball.x - 180);

    // Timing evaluation window
    if (distToBat < 24 && lateralDist < 45) {
      // PERFECT TIMING
      ball.status = 'PLAYED';
      ballsRef.current += 1;
      setBallsBowled(ballsRef.current);

      if (shotType === 'LOFT') {
        const scored = Math.random() > 0.4 ? 6 : 4;
        runsRef.current += scored;
        setRuns(runsRef.current);
        onScoreUpdate?.(runsRef.current);
        setCommentary(scored === 6 ? '💥 WHAT A SHOT! Dispatched deep into the cyber stands for SIX!' : '⚡ SWEET TIMING! Pierces the covers for FOUR!');
        ball.vy = -12;
        ball.vx = (Math.random() - 0.5) * 10;
      } else {
        const scored = Math.random() > 0.5 ? 2 : 1;
        runsRef.current += scored;
        setRuns(runsRef.current);
        onScoreUpdate?.(runsRef.current);
        setCommentary(`Solid defensive push! Quick running takes ${scored} run(s).`);
        ball.vy = -4;
        ball.vx = (Math.random() - 0.5) * 4;
      }
      nextDeliveryDelayRef.current = 90;
    } else if (distToBat < 55 && lateralDist < 55) {
      // GOOD / EDGED TIMING
      ball.status = 'PLAYED';
      ballsRef.current += 1;
      setBallsBowled(ballsRef.current);

      if (Math.random() > 0.35) {
        runsRef.current += 1;
        setRuns(runsRef.current);
        onScoreUpdate?.(runsRef.current);
        setCommentary('Thick edge squirts past slip for a single!');
        ball.vy = -5;
        ball.vx = (Math.random() > 0.5 ? 6 : -6);
      } else {
        setCommentary('Beaten outside off! Dot ball.');
        ball.vy = 4;
      }
      nextDeliveryDelayRef.current = 90;
    }
  }, [onScoreUpdate]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!runningRef.current) {
        if (e.key === 'r' || e.key === 'R') restart();
        return;
      }
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        triggerShot('LOFT');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        triggerShot('DEFEND');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerShot, restart]);

  // Main 60 FPS Engine Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Logic Update
      if (runningRef.current) {
        const ball = ballRef.current;

        // Batsman swing animation decay
        if (batsmanSwingRef.current.isSwinging) {
          batsmanSwingRef.current.swingTick += 1;
          if (batsmanSwingRef.current.swingTick > 18) {
            batsmanSwingRef.current.isSwinging = false;
          }
        }

        // Delivery queue countdown
        if (ball.status === 'DEAD') {
          nextDeliveryDelayRef.current -= 1;
          if (nextDeliveryDelayRef.current <= 0) {
            deliverBall();
          }
        }

        // Ball movement
        if (ball.status === 'BOWLING') {
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Bounce effect
          if (!ball.hasBounced && ball.y >= ball.targetY) {
            ball.hasBounced = true;
            ball.vy *= 0.85; // Slight friction after bounce
          }

          // Passed batsman -> Check Bowled / Missed
          if (ball.y > PITCH_BOTTOM) {
            ballsRef.current += 1;
            setBallsBowled(ballsRef.current);

            // Stumps hit check (width of middle 3 stumps: ~24px at center)
            if (Math.abs(ball.x - 180) < 16) {
              wicketsRef.current += 1;
              setWickets(wicketsRef.current);
              setCommentary('🔴 BOWLED HIM! Timber disturbed! Middle stump knocked out!');
            } else {
              setCommentary('Swing and a miss! Clean through to the keeper.');
            }

            ball.status = 'DEAD';
            nextDeliveryDelayRef.current = 80;

            // Check game-over conditions
            if (wicketsRef.current >= MAX_WICKETS || ballsRef.current >= MAX_BALLS) {
              runningRef.current = false;
              setGameOver(true);
              onGameOver?.(runsRef.current);
            }
          }
        } else if (ball.status === 'PLAYED') {
          ball.x += ball.vx;
          ball.y += ball.vy;

          if (ball.y < -30 || ball.x < -30 || ball.x > width + 30) {
            ball.status = 'DEAD';
            if (wicketsRef.current >= MAX_WICKETS || ballsRef.current >= MAX_BALLS) {
              runningRef.current = false;
              setGameOver(true);
              onGameOver?.(runsRef.current);
            }
          }
        }
      }

      // 2. Render Scene
      // Turf background
      ctx.fillStyle = '#091E13';
      ctx.fillRect(0, 0, width, height);

      // Pitch strip
      ctx.fillStyle = '#C2B280';
      ctx.fillRect(130, PITCH_TOP, 100, PITCH_BOTTOM - PITCH_TOP + 30);

      // Crease lines
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      // Bowling crease
      ctx.beginPath();
      ctx.moveTo(130, PITCH_TOP + 20);
      ctx.lineTo(230, PITCH_TOP + 20);
      ctx.stroke();

      // Popping crease (Batting)
      ctx.beginPath();
      ctx.moveTo(120, BATSMAN_Y);
      ctx.lineTo(240, BATSMAN_Y);
      ctx.stroke();

      // Pitch markers / Bowler bounce indicator
      const ball = ballRef.current;
      if (ball.status === 'BOWLING' && !ball.hasBounced) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ball.targetX, ball.targetY, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Bowler Stumps
      ctx.fillStyle = '#E2E8F0';
      for (let s = -1; s <= 1; s++) {
        ctx.fillRect(180 + s * 6 - 1, PITCH_TOP + 4, 3, 14);
      }

      // Batter Stumps (Wickets)
      for (let s = -1; s <= 1; s++) {
        ctx.fillRect(180 + s * 6 - 1, BATSMAN_Y + 12, 3, 16);
      }

      // Draw Batsman
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(180, BATSMAN_Y - 4, 10, 0, Math.PI * 2); // Helmet
      ctx.fill();

      // Bat
      ctx.save();
      ctx.translate(180, BATSMAN_Y);
      if (batsmanSwingRef.current.isSwinging) {
        ctx.rotate(-Math.PI / 3);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-4, -28, 8, 30);
      } else {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(8, -10, 6, 26);
      }
      ctx.restore();

      // Draw Cricket Ball
      if (ball.status !== 'DEAD') {
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [deliverBall, onGameOver]);

  const oversDisplay = `${Math.floor(ballsBowled / 6)}.${ballsBowled % 6}`;

  return (
    <div className={styles.container} id="game-arcade-cricket">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>ARCADE CRICKET</h3>
          <span>Super Overs Championship</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>RUNS</span>
            <span className={styles.statValue} id="val-cricket-score">{runs}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>WKTS</span>
            <span className={styles.statValue} id="val-cricket-wkts">{wickets}/{MAX_WICKETS}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>OVERS</span>
            <span className={styles.statValue} id="val-cricket-overs">{oversDisplay}/2.0</span>
          </div>
        </div>
      </div>

      <div className={styles.canvasWrapper} id="wrapper-arcade-cricket">
        <canvas
          ref={canvasRef}
          width={360}
          height={560}
          className={styles.gameCanvas}
          id="canvas-arcade-cricket"
        />

        {gameOver && (
          <div className={styles.overlay} id="cricket-gameover-overlay">
            <h2 className={styles.overlayTitle}>INNINGS CONCLUDED</h2>
            <div className={styles.overlayScore}>
              Final Total: <strong>{runs} Runs</strong> for {wickets} wickets
            </div>
            <div style={{ color: '#00F0FF', fontSize: '0.85rem' }}>
              Run Rate: {(runs / Math.max(0.1, ballsBowled / 6)).toFixed(1)} RPO
            </div>
            <button
              className={styles.restartButton}
              onClick={restart}
              id="btn-cricket-restart"
            >
              Play Next Match (R)
            </button>
          </div>
        )}
      </div>

      <div className={styles.commentaryBar} id="val-cricket-commentary">
        {commentary}
      </div>

      {/* Mobile Touch Controls */}
      <div className={styles.mobileControls} id="cricket-mobile-controls">
        <button
          className={styles.batButton}
          onClick={() => triggerShot('LOFT')}
          id="btn-cricket-loft"
          aria-label="Loft / Big Shot"
        >
          🏏 LOFT / DRIVE
        </button>
        <button
          className={styles.defendButton}
          onClick={() => triggerShot('DEFEND')}
          id="btn-cricket-defend"
          aria-label="Defensive Shot"
        >
          🛡️ DEFEND
        </button>
      </div>
    </div>
  );
});

ArcadeCricket.displayName = 'ArcadeCricket';
