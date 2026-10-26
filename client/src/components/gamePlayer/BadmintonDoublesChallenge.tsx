import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface BadmintonDoublesChallengeRef {
  restart: () => void;
  getScore: () => number;
}

interface BadmintonDoublesChallengeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const BadmintonDoublesChallenge = forwardRef<BadmintonDoublesChallengeRef, BadmintonDoublesChallengeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [teamScore, setTeamScore] = useState<number>(initialScore);
  const [oppScore, setOppScore] = useState<number>(0);
  const [rallyCount, setRallyCount] = useState<number>(0);
  const [gameState, setGameState] = useState<'SERVE' | 'RALLY' | 'GAME_OVER'>('SERVE');
  const [statusText, setStatusText] = useState<string>('Doubles Match: First to 11 Points! Tap Serve.');

  const scoreRef = useRef<number>(initialScore);
  const oppScoreRef = useRef<number>(0);
  const shuttleRef = useRef({ x: 90, y: 160, vx: 0, vy: 0, active: false, lastSide: 'TEAM' as 'TEAM' | 'OPP' });
  
  // 4 Players: Team Player 1 (user), Team Player 2 (partner AI), Opponent Front, Opponent Back
  const p1Ref = useRef({ x: 70, y: 200, targetX: 70 });
  const p2Ref = useRef({ x: 120, y: 130, targetX: 120 });
  const opp1Ref = useRef({ x: 280, y: 130 });
  const opp2Ref = useRef({ x: 330, y: 200 });

  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setTeamScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    oppScoreRef.current = 0;
    setTeamScore(0);
    setOppScore(0);
    setRallyCount(0);
    setGameState('SERVE');
    setStatusText('Doubles match restarted! Tap Serve.');
    shuttleRef.current = { x: 90, y: 160, vx: 0, vy: 0, active: false, lastSide: 'TEAM' };
    p1Ref.current = { x: 70, y: 200, targetX: 70 };
    p2Ref.current = { x: 120, y: 130, targetX: 120 };
    opp1Ref.current = { x: 280, y: 130 };
    opp2Ref.current = { x: 330, y: 200 };
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const serve = () => {
    if (gameState !== 'SERVE') return;
    setGameState('RALLY');
    setStatusText('Rally live! Coordinate court coverage with partner.');
    shuttleRef.current = {
      x: p1Ref.current.x + 10,
      y: p1Ref.current.y - 10,
      vx: 3.8 + Math.random() * 0.8,
      vy: -1.5,
      active: true,
      lastSide: 'TEAM'
    };
  };

  const hitShot = (shot: 'CLEAR' | 'SMASH' | 'DROP') => {
    if (gameState !== 'RALLY') return;
    const s = shuttleRef.current;
    if (s.x > 200) {
      setStatusText('Shuttlecock on opponent court side!');
      return;
    }

    if (shot === 'SMASH') {
      s.vx = 6.2;
      s.vy = 0.8;
      setStatusText('⚡ Steep jumping smash down the sideline!');
    } else if (shot === 'DROP') {
      s.vx = 2.4;
      s.vy = 0.2;
      setStatusText('Tumbling net drop into the forecourt.');
    } else {
      // CLEAR
      s.vx = 4.5;
      s.vy = -3.5;
      setStatusText('High defensive clear to baseline.');
    }
    s.lastSide = 'TEAM';
    setRallyCount(r => r + 1);
  };

  const awardPoint = (winner: 'TEAM' | 'OPP', reason: string) => {
    shuttleRef.current.active = false;
    if (winner === 'TEAM') {
      const next = scoreRef.current + 1;
      updateScore(next);
      if (next >= 11) {
        setGameState('GAME_OVER');
        setStatusText(`CHAMPIONS! Won doubles match ${next} - ${oppScoreRef.current}!`);
        onGameOver?.(next);
        return;
      }
      setStatusText(`Point to Team! ${reason} (${next} - ${oppScoreRef.current})`);
    } else {
      oppScoreRef.current += 1;
      setOppScore(oppScoreRef.current);
      if (oppScoreRef.current >= 11) {
        setGameState('GAME_OVER');
        setStatusText(`Match Lost! Opponents won ${oppScoreRef.current} - ${scoreRef.current}.`);
        onGameOver?.(scoreRef.current);
        return;
      }
      setStatusText(`Opponents point! ${reason} (${scoreRef.current} - ${oppScoreRef.current})`);
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

      // Draw court (green mat with white lines)
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, 400, 260);

      // Boundaries & Doubles alleys
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 40, 340, 180);
      // Center Net line
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(200, 35); ctx.lineTo(200, 225);
      ctx.stroke();

      // Service lines
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(130, 40); ctx.lineTo(130, 220); // Team short service line
      ctx.moveTo(270, 40); ctx.lineTo(270, 220); // Opponent short service line
      ctx.moveTo(30, 130); ctx.lineTo(130, 130); // Center line
      ctx.moveTo(270, 130); ctx.lineTo(370, 130);
      ctx.stroke();

      // Team Players (Blue and Cyan)
      ctx.fillStyle = '#38bdf8'; // Player 1 (user)
      ctx.beginPath();
      ctx.arc(p1Ref.current.x, p1Ref.current.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#67e8f9'; // Partner AI
      ctx.beginPath();
      ctx.arc(p2Ref.current.x, p2Ref.current.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Opponents (Rose and Amber)
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(opp1Ref.current.x, opp1Ref.current.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(opp2Ref.current.x, opp2Ref.current.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Physics loop
      const s = shuttleRef.current;
      if (s.active) {
        // Drag + gravity
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.985;
        s.vy += 0.08;

        // Partner AI assist if shuttle is near partner court zone
        if (s.x > 100 && s.x < 180 && s.lastSide === 'OPP') {
          p2Ref.current.y += (s.y - p2Ref.current.y) * 0.12;
          if (Math.abs(s.x - p2Ref.current.x) < 15 && Math.abs(s.y - p2Ref.current.y) < 20) {
            s.vx = 4.0;
            s.vy = -1.0;
            s.lastSide = 'TEAM';
            setRallyCount(r => r + 1);
          }
        }

        // Opponents AI Return
        if (s.x > 220 && s.lastSide === 'TEAM') {
          // Track to nearest opponent
          const targetOpp = s.y > 150 ? opp2Ref.current : opp1Ref.current;
          targetOpp.y += (s.y - targetOpp.y) * 0.1;

          if (Math.abs(s.x - targetOpp.x) < 16 && Math.abs(s.y - targetOpp.y) < 22) {
            s.vx = -(3.8 + Math.random() * 1.5);
            s.vy = (Math.random() - 0.4) * 2;
            s.lastSide = 'OPP';
            setRallyCount(r => r + 1);
          }
        }

        // Out of bounds / Ground hits
        if (s.x > 375) {
          awardPoint('TEAM', 'Opponent out of bounds');
        } else if (s.x < 25) {
          awardPoint('OPP', 'Shot landed out of bounds');
        } else if (s.y > 225 || s.y < 35) {
          awardPoint(s.lastSide === 'TEAM' ? 'OPP' : 'TEAM', 'Side fault');
        }

        // Draw shuttlecock
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
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
          <span>Team Score</span>
          <span className={styles.scoreValue}>{teamScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Opponents</span>
          <span className={styles.scoreValue}>{oppScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Rally</span>
          <span className={styles.scoreValue}>{rallyCount}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Mode</span>
          <span className={styles.scoreValue}>2v2 Doubles</span>
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
          id="btn-badminton-doubles-serve"
          onClick={serve}
          disabled={gameState === 'RALLY'}
        >
          🏸 Serve
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-badminton-doubles-clear"
          onClick={() => hitShot('CLEAR')}
          disabled={gameState !== 'RALLY'}
        >
          High Clear
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-badminton-doubles-smash"
          onClick={() => hitShot('SMASH')}
          disabled={gameState !== 'RALLY'}
        >
          ⚡ Smash
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-badminton-doubles-drop"
          onClick={() => hitShot('DROP')}
          disabled={gameState !== 'RALLY'}
        >
          Drop Shot
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-badminton-doubles-restart"
          onClick={restart}
        >
          Restart Match
        </button>
      </div>
    </div>
  );
});

BadmintonDoublesChallenge.displayName = 'BadmintonDoublesChallenge';
