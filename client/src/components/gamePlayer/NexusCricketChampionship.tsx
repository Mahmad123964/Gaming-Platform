import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface NexusCricketChampionshipRef {
  restart: () => void;
  getScore: () => number;
}

interface NexusCricketChampionshipProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const NexusCricketChampionship = forwardRef<NexusCricketChampionshipRef, NexusCricketChampionshipProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [runs, setRuns] = useState<number>(initialScore);
  const [wickets, setWickets] = useState<number>(0);
  const [ballsBowled, setBallsBowled] = useState<number>(0);
  const [target] = useState<number>(36); // Chase 36 runs in 2 overs (12 balls)
  const [gameState, setGameState] = useState<'READY' | 'BOWLING' | 'BALL_IN_PLAY' | 'GAME_OVER'>('READY');
  const [commentary, setCommentary] = useState<string>('Welcome to the Nexus Cricket Championship! Target: 36 off 12 balls.');
  
  const scoreRef = useRef<number>(initialScore);
  const wicketsRef = useRef<number>(0);
  const ballsRef = useRef<number>(0);
  const ballRef = useRef({ x: 200, y: 80, vx: 0, vy: 0, active: false, speed: 4.5, pitchLength: 0 });
  const batsmanRef = useRef({ x: 200, y: 240, shotAngle: 0, shotPower: 0, state: 'STANCE' });
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newRuns: number) => {
    scoreRef.current = newRuns;
    setRuns(newRuns);
    onScoreUpdate?.(newRuns);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    wicketsRef.current = 0;
    ballsRef.current = 0;
    setRuns(0);
    setWickets(0);
    setBallsBowled(0);
    setGameState('READY');
    setCommentary('Match restarted! New innings: Target 36 off 12 balls.');
    ballRef.current = { x: 200, y: 80, vx: 0, vy: 0, active: false, speed: 4.5, pitchLength: 0 };
    batsmanRef.current = { x: 200, y: 240, shotAngle: 0, shotPower: 0, state: 'STANCE' };
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const bowlNextBall = () => {
    if (gameState !== 'READY' || ballsRef.current >= 12 || wicketsRef.current >= 3) return;
    setGameState('BOWLING');
    setCommentary('Bowler runs in... ball released toward good length!');
    const swing = (Math.random() - 0.5) * 1.8;
    ballRef.current = {
      x: 200,
      y: 80,
      vx: swing,
      vy: 4.8 + Math.random() * 1.2,
      active: true,
      speed: 5.0,
      pitchLength: 0
    };
  };

  const playShot = (shotType: 'DRIVE' | 'LOFT' | 'DEFEND') => {
    if (gameState !== 'BOWLING' && gameState !== 'BALL_IN_PLAY') return;
    const b = ballRef.current;
    const distanceToStumps = Math.abs(b.y - batsmanRef.current.y);

    if (distanceToStumps > 65) {
      setCommentary('Shot missed! Played too early.');
      return;
    }

    if (shotType === 'DEFEND') {
      b.vy = -1.2;
      b.vx = (Math.random() - 0.5) * 2;
      setCommentary('Solid defensive push down the pitch. Dot ball.');
      finishDelivery(0);
    } else if (shotType === 'DRIVE') {
      const timingScore = Math.max(0, 1 - distanceToStumps / 35);
      if (timingScore > 0.6) {
        b.vy = -5.5;
        b.vx = (Math.random() > 0.5 ? 1 : -1) * (2.5 + Math.random() * 2);
        const runsScored = timingScore > 0.85 ? 4 : 2;
        setCommentary(runsScored === 4 ? 'Glorious cover drive! Pierces the infield for FOUR!' : 'Nicely timed drive into the gap for a brace (2 runs).');
        finishDelivery(runsScored);
      } else {
        b.vy = -2.5;
        b.vx = 1.0;
        setCommentary('Inside edge squirts away for a single (1 run).');
        finishDelivery(1);
      }
    } else if (shotType === 'LOFT') {
      const timingScore = Math.max(0, 1 - distanceToStumps / 35);
      if (timingScore > 0.75) {
        b.vy = -7.5;
        b.vx = (Math.random() - 0.5) * 4;
        setCommentary('HIGH AND HANDSOME! Dispatched straight over long-on for SIX!');
        finishDelivery(6);
      } else if (timingScore > 0.4) {
        setCommentary('Mistimed aerial shot... caught by mid-off fielder! WICKET!');
        recordWicket();
      } else {
        setCommentary('Clean bowled! Missed a straight delivery. Timber!');
        recordWicket();
      }
    }
  };

  const recordWicket = () => {
    wicketsRef.current += 1;
    setWickets(wicketsRef.current);
    finishDelivery(0, true);
  };

  const finishDelivery = (runsMade: number, isWicket = false) => {
    ballsRef.current += 1;
    setBallsBowled(ballsRef.current);
    const newScore = scoreRef.current + runsMade;
    if (runsMade > 0) updateScore(newScore);

    setTimeout(() => {
      if (newScore >= target) {
        setGameState('GAME_OVER');
        setCommentary(`CHAMPIONS! Reached target of ${target} runs! Victory by ${3 - wicketsRef.current} wickets!`);
        onGameOver?.(newScore);
      } else if (wicketsRef.current >= 3) {
        setGameState('GAME_OVER');
        setCommentary(`All Out! Lost all 3 wickets. Final Score: ${newScore}/${wicketsRef.current}`);
        onGameOver?.(newScore);
      } else if (ballsRef.current >= 12) {
        setGameState('GAME_OVER');
        setCommentary(`Innings Over! Reached ${newScore}/${wicketsRef.current}. Needed ${target}. Match concluded.`);
        onGameOver?.(newScore);
      } else {
        setGameState('READY');
        ballRef.current.active = false;
        ballRef.current.x = 200;
        ballRef.current.y = 80;
      }
    }, 600);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      // Draw oval pitch & outfield
      ctx.fillStyle = '#14532d'; // Outfield green
      ctx.fillRect(0, 0, 400, 320);

      // Pitch strip
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(160, 50, 80, 220);

      // Crease lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(160, 85); ctx.lineTo(240, 85); // Bowling crease
      ctx.moveTo(160, 235); ctx.lineTo(240, 235); // Batting popping crease
      ctx.stroke();

      // Stumps (top & bottom)
      ctx.fillStyle = '#fef08a';
      // Bowler stumps
      ctx.fillRect(194, 76, 12, 5);
      // Batsman stumps
      ctx.fillRect(194, 240, 12, 5);

      // Batsman
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(batsmanRef.current.x, batsmanRef.current.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Bat
      ctx.fillStyle = '#d97706';
      ctx.fillRect(batsmanRef.current.x + 8, batsmanRef.current.y - 4, 14, 4);

      // Bowler
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(200, 65, 9, 0, Math.PI * 2);
      ctx.fill();

      // Ball movement
      const b = ballRef.current;
      if (b.active) {
        b.x += b.vx;
        b.y += b.vy;

        // Check if bowled (past popping crease without shot)
        if (b.y > 245 && gameState === 'BOWLING') {
          if (Math.abs(b.x - 200) < 12) {
            setCommentary('Bowled him! Straight onto the middle stump! OUT!');
            recordWicket();
          } else {
            setCommentary('Dot ball left alone to the keeper.');
            finishDelivery(0);
          }
        }

        // Draw cricket ball
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
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
  }, [gameState]);

  const oversText = `${Math.floor(ballsBowled / 6)}.${ballsBowled % 6} / 2.0`;

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Runs / Wkts</span>
          <span className={styles.scoreValue}>{runs} / {wickets}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Overs</span>
          <span className={styles.scoreValue}>{oversText}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Target</span>
          <span className={styles.scoreValue}>{target}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Req. Rate</span>
          <span className={styles.scoreValue}>{Math.max(0, ((target - runs) / Math.max(1, 12 - ballsBowled) * 6)).toFixed(1)}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={320} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '36px' }}>
        {commentary}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-cricket-bowl-next"
          onClick={bowlNextBall}
          disabled={gameState !== 'READY'}
        >
          🏏 Bowl Delivery
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cricket-bat-defend"
          onClick={() => playShot('DEFEND')}
          disabled={gameState !== 'BOWLING'}
        >
          🛡️ Defend
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cricket-bat-drive"
          onClick={() => playShot('DRIVE')}
          disabled={gameState !== 'BOWLING'}
        >
          ⚡ Cover Drive
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-cricket-bat-loft"
          onClick={() => playShot('LOFT')}
          disabled={gameState !== 'BOWLING'}
        >
          🚀 Lofted Six
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-cricket-restart"
          onClick={restart}
        >
          Restart Match
        </button>
      </div>
    </div>
  );
});

NexusCricketChampionship.displayName = 'NexusCricketChampionship';
