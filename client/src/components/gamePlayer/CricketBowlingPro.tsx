import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ArcadeCricket.module.css';

export interface CricketBowlingProRef {
  restart: () => void;
  getScore: () => number;
}

interface CricketBowlingProProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const CricketBowlingPro = forwardRef<CricketBowlingProRef, CricketBowlingProProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wickets, setWickets] = useState<number>(initialScore);
  const [runsConceded, setRunsConceded] = useState<number>(0);
  const [ballsBowled, setBallsBowled] = useState<number>(0);
  const [swingType, setSwingType] = useState<'SEAM' | 'OUTSWING' | 'INSWING'>('SEAM');
  const [ballState, setBallState] = useState<'AIMING' | 'BOWLING' | 'DEAD'>('AIMING');
  const [commentary, setCommentary] = useState<string>('Select pitch landing spot and tap Deliver Ball!');
  const [gameOver, setGameOver] = useState<boolean>(false);

  const wicketsRef = useRef<number>(initialScore);
  const runsRef = useRef<number>(0);
  const ballsRef = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  const aimRef = useRef<{ x: number; y: number }>({ x: 180, y: 320 });
  const ballRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    active: boolean;
    bounced: boolean;
  }>({
    x: 180,
    y: 100,
    vx: 0,
    vy: 0,
    active: false,
    bounced: false
  });

  const batsmanRef = useRef<{ x: number; y: number; state: 'READY' | 'SWING' }>({
    x: 180,
    y: 380,
    state: 'READY'
  });

  const deliverBall = useCallback(() => {
    if (ballRef.current.active || gameOver) return;
    const currentBalls = ballsRef.current + 1;
    ballsRef.current = currentBalls;
    setBallsBowled(currentBalls);

    const targetX = aimRef.current.x;
    const targetY = aimRef.current.y;
    const startX = 180;
    const startY = 80;

    let swingOffset = 0;
    if (swingType === 'OUTSWING') swingOffset = 1.2;
    if (swingType === 'INSWING') swingOffset = -1.2;

    const dx = (targetX - startX) / 40;
    const dy = (targetY - startY) / 40;

    ballRef.current = {
      x: startX,
      y: startY,
      vx: dx + swingOffset * 0.2,
      vy: Math.max(4.5, dy),
      active: true,
      bounced: false
    };
    setBallState('BOWLING');
    setCommentary(`Bowling delivery #${currentBalls} with ${swingType}...`);
  }, [gameOver, swingType]);

  const restart = useCallback(() => {
    wicketsRef.current = 0;
    runsRef.current = 0;
    ballsRef.current = 0;
    setWickets(0);
    setRunsConceded(0);
    setBallsBowled(0);
    setGameOver(false);
    setBallState('AIMING');
    ballRef.current.active = false;
    setCommentary('New innings! Select pitch target and deliver.');
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => wicketsRef.current * 100 - runsRef.current
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
      const x = Math.max(80, Math.min(280, e.clientX - rect.left));
      const y = Math.max(200, Math.min(360, e.clientY - rect.top));
      aimRef.current = { x, y };
    };

    canvas.addEventListener('click', handleCanvasClick);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Pitch background
      ctx.fillStyle = '#0F2A1E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Turf strip
      ctx.fillStyle = '#C1A172';
      ctx.fillRect(70, 60, 220, 360);

      // Crease markings
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 100);
      ctx.lineTo(280, 100);
      ctx.moveTo(80, 380);
      ctx.lineTo(280, 380);
      ctx.stroke();

      // Stumps (Bowler end)
      ctx.fillStyle = '#FFB800';
      ctx.fillRect(174, 75, 12, 10);

      // Stumps (Batsman end)
      ctx.fillStyle = '#FFB800';
      ctx.fillRect(174, 395, 12, 10);

      // Aim target circle
      if (!ballRef.current.active && !gameOver) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(aimRef.current.x, aimRef.current.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Update ball
      if (ballRef.current.active) {
        const b = ballRef.current;
        b.x += b.vx;
        b.y += b.vy;

        if (b.y >= aimRef.current.y && !b.bounced) {
          b.bounced = true;
          // Apply swing after bounce
          if (swingType === 'OUTSWING') b.vx += 0.8;
          if (swingType === 'INSWING') b.vx -= 0.8;
        }

        // Draw ball
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Check batsman impact at crease
        if (b.y >= 385) {
          b.active = false;
          setBallState('DEAD');

          // Batsman swing evaluation
          const distFromStumps = Math.abs(b.x - 180);
          if (distFromStumps < 14) {
            // Bowled / Wicket!
            const newWickets = wicketsRef.current + 1;
            wicketsRef.current = newWickets;
            setWickets(newWickets);
            setCommentary('TIMBER! Clean bowled through the gate! WICKET!');
            if (onScoreUpdate) onScoreUpdate(newWickets * 100 - runsRef.current);
          } else if (distFromStumps < 40) {
            // Defended / Dot ball
            setCommentary('Solid forward defensive. Dot ball.');
          } else if (distFromStumps < 70) {
            // Edge or single
            const runsAdded = Math.random() > 0.5 ? 1 : 2;
            runsRef.current += runsAdded;
            setRunsConceded(runsRef.current);
            setCommentary(`Edged through the covers for ${runsAdded} run(s).`);
            if (onScoreUpdate) onScoreUpdate(wicketsRef.current * 100 - runsRef.current);
          } else {
            // Boundary hit
            const runsAdded = 4;
            runsRef.current += runsAdded;
            setRunsConceded(runsRef.current);
            setCommentary('Punished through point for FOUR!');
            if (onScoreUpdate) onScoreUpdate(wicketsRef.current * 100 - runsRef.current);
          }

          // Check innings completion (12 balls or 3 wickets)
          if (ballsRef.current >= 12 || wicketsRef.current >= 3) {
            setGameOver(true);
            setCommentary(`Innings complete! Conceded ${runsRef.current} runs, took ${wicketsRef.current} wickets.`);
            if (onGameOver) onGameOver(wicketsRef.current * 100 - runsRef.current);
          } else {
            setTimeout(() => {
              if (runningRef.current) setBallState('AIMING');
            }, 800);
          }
        }
      }

      // Batsman avatar
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(batsmanRef.current.x, batsmanRef.current.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Bat
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(batsmanRef.current.x, batsmanRef.current.y + 4);
      ctx.lineTo(batsmanRef.current.x + 12, batsmanRef.current.y + 16);
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
  }, [deliverBall, gameOver, onGameOver, onScoreUpdate, swingType]);

  return (
    <div className={styles.container} id="game-cricket-bowling-pro">
      <div className={styles.scoreboard} id="cricket-bowling-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>WICKETS</span>
          <span className={styles.value} id="cricket-wickets-count">{wickets} / 3</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>OVERS</span>
          <span className={styles.value} id="cricket-overs-count">{Math.floor(ballsBowled / 6)}.{(ballsBowled % 6)} / 2.0</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>CONCEDED</span>
          <span className={styles.value} id="cricket-runs-conceded">{runsConceded}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SWING</span>
          <span className={styles.value} id="cricket-swing-badge">{swingType}</span>
        </div>
      </div>

      <div className={styles.commentaryBox} id="cricket-bowling-commentary">
        {commentary}
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className={styles.canvas}
          id="canvas-cricket-bowling-pro"
        />
      </div>

      {/* Mobile Touch & Desktop Controls */}
      <div className={styles.mobileControls} id="cricket-bowling-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cricket-deliver"
          onClick={deliverBall}
          disabled={ballState === 'BOWLING' || gameOver}
        >
          Deliver Ball
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cricket-swing-toggle"
          onClick={() => {
            setSwingType(prev => prev === 'SEAM' ? 'OUTSWING' : prev === 'OUTSWING' ? 'INSWING' : 'SEAM');
          }}
          disabled={ballState === 'BOWLING' || gameOver}
        >
          Swing: {swingType}
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="cricket-bowling-gameover">
          <h3 className={styles.overlayTitle}>INNINGS COMPLETE</h3>
          <p className={styles.overlayText}>
            Wickets: {wickets} | Runs Conceded: {runsConceded} | Score: {wickets * 100 - runsConceded}
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-cricket-bowling-restart"
            onClick={restart}
          >
            Bowl Next Match
          </button>
        </div>
      )}
    </div>
  );
});

CricketBowlingPro.displayName = 'CricketBowlingPro';
