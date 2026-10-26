import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface FootballPenaltyTournamentRef {
  restart: () => void;
  getScore: () => number;
}

interface FootballPenaltyTournamentProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const FootballPenaltyTournament = forwardRef<FootballPenaltyTournamentRef, FootballPenaltyTournamentProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [goals, setGoals] = useState<number>(initialScore);
  const [round, setRound] = useState<number>(1);
  const [saves, setSaves] = useState<number>(0);
  const [role, setRole] = useState<'KICKER' | 'GOALIE'>('KICKER');
  const [status, setStatus] = useState<string>('Round 1: Pick aim direction and unleash penalty kick!');
  const [shotActive, setShotActive] = useState<boolean>(false);

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const aimRef = useRef<number>(180); // Goal target X
  const powerRef = useRef<number>(50); // Oscillating power
  const ballRef = useRef({
    x: 180,
    y: 215,
    targetX: 180,
    targetY: 65,
    t: 0,
    active: false
  });

  const goalieRef = useRef({
    x: 180,
    y: 70,
    diveDir: 'CENTER' as 'LEFT' | 'CENTER' | 'RIGHT',
    diving: false
  });

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setGoals(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setGoals(0);
    setRound(1);
    setSaves(0);
    setRole('KICKER');
    setStatus('Round 1: Pick aim direction and unleash penalty kick!');
    setShotActive(false);
    aimRef.current = 180;
    ballRef.current = { x: 180, y: 215, targetX: 180, targetY: 65, t: 0, active: false };
    goalieRef.current = { x: 180, y: 70, diveDir: 'CENTER', diving: false };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const aim = useCallback((dir: 'LEFT' | 'CENTER' | 'RIGHT') => {
    if (shotActive) return;
    if (dir === 'LEFT') {
      aimRef.current = 120;
      setStatus('Aim locked: Bottom-left corner!');
    } else if (dir === 'RIGHT') {
      aimRef.current = 240;
      setStatus('Aim locked: Top-right corner!');
    } else {
      aimRef.current = 180;
      setStatus('Aim locked: Straight down the middle!');
    }
  }, [shotActive]);

  const shootKicker = useCallback(() => {
    if (shotActive || role !== 'KICKER') return;
    setShotActive(true);

    // AI goalie picks a dive direction
    const dives: ('LEFT' | 'CENTER' | 'RIGHT')[] = ['LEFT', 'CENTER', 'RIGHT'];
    const aiDive = dives[Math.floor(Math.random() * dives.length)];
    goalieRef.current.diveDir = aiDive;
    goalieRef.current.diving = true;

    ballRef.current = {
      x: 180,
      y: 215,
      targetX: aimRef.current,
      targetY: 65,
      t: 0,
      active: true
    };

    setTimeout(() => {
      // Evaluate goal vs save
      const shotX = aimRef.current;
      const saved = (shotX < 150 && aiDive === 'LEFT') ||
                    (shotX > 210 && aiDive === 'RIGHT') ||
                    (shotX >= 150 && shotX <= 210 && aiDive === 'CENTER');

      if (saved) {
        setStatus('❌ SAVED! Goalkeeper guessed correctly and parried!');
      } else {
        updateScore(scoreRef.current + 100);
        setStatus('⚽ GOAL! Clean strike finds the back of the net!');
      }

      setTimeout(() => {
        setRole('GOALIE');
        setShotActive(false);
        goalieRef.current.diving = false;
        ballRef.current.active = false;
        setStatus('Your turn in goal! Prepare to dive as CPU strikes!');
      }, 1200);
    }, 600);
  }, [shotActive, role, updateScore]);

  const goalieDive = useCallback((dir: 'LEFT' | 'CENTER' | 'RIGHT') => {
    if (shotActive || role !== 'GOALIE') return;
    setShotActive(true);
    goalieRef.current.diveDir = dir;
    goalieRef.current.diving = true;

    const cpuAims = [120, 180, 240];
    const cpuTarget = cpuAims[Math.floor(Math.random() * cpuAims.length)];

    ballRef.current = {
      x: 180,
      y: 215,
      targetX: cpuTarget,
      targetY: 65,
      t: 0,
      active: true
    };

    setTimeout(() => {
      const saved = (cpuTarget === 120 && dir === 'LEFT') ||
                    (cpuTarget === 240 && dir === 'RIGHT') ||
                    (cpuTarget === 180 && dir === 'CENTER');

      if (saved) {
        setSaves(s => s + 1);
        updateScore(scoreRef.current + 150);
        setStatus('🧤 HEROIC SAVE! You blocked the CPU penalty kick!');
      } else {
        setStatus('CPU scored! Too quick into the side netting.');
      }

      setTimeout(() => {
        setRound(r => r + 1);
        setRole('KICKER');
        setShotActive(false);
        goalieRef.current.diving = false;
        ballRef.current.active = false;
        setStatus(`Round ${round + 1}: Kicker mode ready!`);
      }, 1200);
    }, 600);
  }, [shotActive, role, round, updateScore]);

  // Canvas render loop
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

      // Pitch grass with striped mown pattern
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#166534';
      for (let y = 0; y < H; y += 20) {
        if ((y / 20) % 2 === 0) ctx.fillRect(0, y, W, 10);
      }

      // Penalty box lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 40, W - 100, H - 40);

      // Penalty spot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(180, 215, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Goal frame (Crossbar & Posts)
      const goalLeft = 100;
      const goalWidth = 160;
      const goalHeight = 50;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.strokeRect(goalLeft, 20, goalWidth, goalHeight);

      // Goal netting
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      for (let x = goalLeft + 10; x < goalLeft + goalWidth; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, 20 + goalHeight);
        ctx.stroke();
      }

      // Aim cursor indicator (When in kicker mode)
      if (role === 'KICKER' && !shotActive) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(aimRef.current, 45, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(aimRef.current - 16, 45);
        ctx.lineTo(aimRef.current + 16, 45);
        ctx.moveTo(aimRef.current, 29);
        ctx.lineTo(aimRef.current, 61);
        ctx.stroke();
      }

      // Goalie animation
      const g = goalieRef.current;
      let goalieX = 180;
      if (g.diving) {
        if (g.diveDir === 'LEFT') goalieX = 130;
        if (g.diveDir === 'RIGHT') goalieX = 230;
      }
      ctx.fillStyle = '#eab308'; // Goalie neon jersey
      ctx.fillRect(goalieX - 12, 45, 24, 22);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(goalieX, 38, 7, 0, Math.PI * 2);
      ctx.fill();

      // Ball animation
      const b = ballRef.current;
      if (b.active) {
        b.t = Math.min(1, b.t + 0.05);
        b.x = 180 + (b.targetX - 180) * b.t;
        b.y = 215 + (b.targetY - 215) * b.t;
      }

      // Draw Football
      const drawBallX = b.active ? b.x : 180;
      const drawBallY = b.active ? b.y : 215;
      const ballRadius = b.active ? 6 - b.t * 2 : 6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(drawBallX, drawBallY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [role, shotActive]);

  return (
    <div className={styles.container} id="football-penalty-tournament-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Points</span>
          <span className={styles.scoreValue} id="penalty-score">{goals}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Round</span>
          <span className={styles.scoreValue}>{round} / 5</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Role</span>
          <span className={styles.scoreValue}>{role}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Saves</span>
          <span className={styles.scoreValue}>{saves}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="penalty-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      {role === 'KICKER' ? (
        <div className={styles.touchControls}>
          <button
            type="button"
            className={styles.touchBtn}
            id="btn-penalty-aim-left"
            onClick={() => aim('LEFT')}
            disabled={shotActive}
          >
            ◀ Aim Left
          </button>
          <button
            type="button"
            className={styles.touchBtn}
            id="btn-penalty-aim-center"
            onClick={() => aim('CENTER')}
            disabled={shotActive}
          >
            Aim Center
          </button>
          <button
            type="button"
            className={styles.touchBtn}
            id="btn-penalty-aim-right"
            onClick={() => aim('RIGHT')}
            disabled={shotActive}
          >
            Aim Right ▶
          </button>
          <button
            type="button"
            className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
            id="btn-penalty-shoot"
            onClick={shootKicker}
            disabled={shotActive}
          >
            ⚽ Unleash Shot
          </button>
        </div>
      ) : (
        <div className={styles.touchControls}>
          <button
            type="button"
            className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
            id="btn-penalty-dive-left"
            onClick={() => goalieDive('LEFT')}
            disabled={shotActive}
          >
            🧤 Dive Left
          </button>
          <button
            type="button"
            className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
            id="btn-penalty-dive-center"
            onClick={() => goalieDive('CENTER')}
            disabled={shotActive}
          >
            Stay Center
          </button>
          <button
            type="button"
            className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
            id="btn-penalty-dive-right"
            onClick={() => goalieDive('RIGHT')}
            disabled={shotActive}
          >
            Dive Right 🧤
          </button>
        </div>
      )}

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-penalty-restart"
          onClick={restart}
        >
          Restart Tournament
        </button>
      </div>
    </div>
  );
});

FootballPenaltyTournament.displayName = 'FootballPenaltyTournament';
