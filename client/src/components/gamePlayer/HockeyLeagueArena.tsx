import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface HockeyLeagueArenaRef {
  restart: () => void;
  getScore: () => number;
}

interface HockeyLeagueArenaProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const HockeyLeagueArena = forwardRef<HockeyLeagueArenaRef, HockeyLeagueArenaProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [teamGoals, setTeamGoals] = useState<number>(initialScore);
  const [oppGoals, setOppGoals] = useState<number>(0);
  const [period, setPeriod] = useState<number>(1);
  const [gameState, setGameState] = useState<'FACEOFF' | 'PLAYING' | 'GAME_OVER'>('FACEOFF');
  const [commentary, setCommentary] = useState<string>('3v3 Ice Rink Showdown! Tap Faceoff to drop the puck.');

  const scoreRef = useRef<number>(initialScore);
  const oppGoalsRef = useRef<number>(0);
  const puckRef = useRef({ x: 200, y: 130, vx: 0, vy: 0, active: false });
  
  // Players
  const pCenter = useRef({ x: 180, y: 130 });
  const pWinger = useRef({ x: 120, y: 70 });
  const oppGoalie = useRef({ x: 370, y: 130, vy: 1.5 });
  const teamGoalie = useRef({ x: 30, y: 130 });

  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newGoals: number) => {
    scoreRef.current = newGoals;
    setTeamGoals(newGoals);
    onScoreUpdate?.(newGoals);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    oppGoalsRef.current = 0;
    setTeamGoals(0);
    setOppGoals(0);
    setPeriod(1);
    setGameState('FACEOFF');
    setCommentary('Hockey Arena match restarted! First to 5 goals takes the cup.');
    puckRef.current = { x: 200, y: 130, vx: 0, vy: 0, active: false };
    pCenter.current = { x: 180, y: 130 };
    pWinger.current = { x: 120, y: 70 };
    oppGoalie.current = { x: 370, y: 130, vy: 1.5 };
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const faceoff = () => {
    if (gameState !== 'FACEOFF') return;
    setGameState('PLAYING');
    puckRef.current = {
      x: 200,
      y: 130,
      vx: (Math.random() > 0.5 ? 2.5 : -2.5),
      vy: (Math.random() - 0.5) * 2,
      active: true
    };
    setCommentary('Puck dropped! Skaters battle along the boards.');
  };

  const wristShot = () => {
    if (gameState !== 'PLAYING') return;
    const p = puckRef.current;
    p.vx = 6.5;
    p.vy = (Math.random() - 0.5) * 3;
    setCommentary('⚡ Quick-release wrist shot aimed top shelf!');
  };

  const slapShot = () => {
    if (gameState !== 'PLAYING') return;
    const p = puckRef.current;
    p.vx = 8.5;
    p.vy = (Math.random() - 0.5) * 1.5;
    setCommentary('💥 BOOMING 100mph SLAP SHOT from the blue line!');
  };

  const passPuck = () => {
    if (gameState !== 'PLAYING') return;
    const p = puckRef.current;
    p.vx = 4.0;
    p.vy = -2.8;
    setCommentary('Crisp tape-to-tape pass cross-ice to the winger!');
  };

  const pokeCheck = () => {
    if (gameState !== 'PLAYING') return;
    const p = puckRef.current;
    p.vx = -4.0;
    p.vy = (Math.random() - 0.5) * 4;
    setCommentary('🛡️ Defensive stick poke-check disrupts the rush!');
  };

  const goalScored = (team: 'TEAM' | 'OPP') => {
    puckRef.current.active = false;
    if (team === 'TEAM') {
      const next = scoreRef.current + 1;
      updateScore(next);
      setCommentary(`🚨 HE SHOOTS, HE SCORES! GOAL! (${next} - ${oppGoalsRef.current})`);
      if (next >= 5) {
        setGameState('GAME_OVER');
        setCommentary(`🏆 STANLEY CUP CHAMPIONS! Won 3v3 Arena ${next} - ${oppGoalsRef.current}!`);
        onGameOver?.(next);
        return;
      }
    } else {
      oppGoalsRef.current += 1;
      setOppGoals(oppGoalsRef.current);
      setCommentary(`Opponent scores on a rebound wrap-around. (${scoreRef.current} - ${oppGoalsRef.current})`);
      if (oppGoalsRef.current >= 5) {
        setGameState('GAME_OVER');
        setCommentary(`Game Over! Opponents won ${oppGoalsRef.current} - ${scoreRef.current}.`);
        onGameOver?.(scoreRef.current);
        return;
      }
    }
    setGameState('FACEOFF');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      // Ice surface (light ice blue)
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 400, 260);

      // Rounded boards
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 380, 240);

      // Red center line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(200, 10); ctx.lineTo(200, 250);
      ctx.stroke();

      // Blue lines
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(130, 10); ctx.lineTo(130, 250);
      ctx.moveTo(270, 10); ctx.lineTo(270, 250);
      ctx.stroke();

      // Center faceoff circle
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(200, 130, 35, 0, Math.PI * 2);
      ctx.stroke();

      // Goal Creases
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.arc(20, 130, 20, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(380, 130, 20, Math.PI / 2, 3 * Math.PI / 2);
      ctx.fill();

      // Goal nets (Red outline)
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.strokeRect(5, 115, 15, 30);
      ctx.strokeRect(380, 115, 15, 30);

      // Opponent Goalie AI Patrol
      const og = oppGoalie.current;
      og.y += og.vy;
      if (og.y > 145 || og.y < 115) og.vy *= -1;

      // Draw Goalies
      ctx.fillStyle = '#38bdf8'; // Team goalie
      ctx.fillRect(18, teamGoalie.current.y - 10, 8, 20);
      ctx.fillStyle = '#f43f5e'; // Opp goalie
      ctx.fillRect(og.x, og.y - 10, 8, 20);

      // Draw Skaters
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(pCenter.current.x, pCenter.current.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Puck Physics
      const p = puckRef.current;
      if (p.active) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.992; // Low ice friction
        p.vy *= 0.992;

        // Board bounces
        if (p.y < 16 || p.y > 244) p.vy *= -0.9;
        if (p.x < 15) {
          if (p.y > 115 && p.y < 145) {
            goalScored('OPP');
          } else {
            p.vx *= -0.9;
          }
        }
        if (p.x > 385) {
          if (p.y > 115 && p.y < 145) {
            // Check Goalie save
            if (Math.abs(p.y - og.y) < 12) {
              p.vx = -4.5;
              setCommentary('BLOCKED! Incredible glove save by the goalie!');
            } else {
              goalScored('TEAM');
            }
          } else {
            p.vx *= -0.9;
          }
        }

        // Draw Puck (Solid black disk)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
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
          <span>Team</span>
          <span className={styles.scoreValue}>{teamGoals}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Opponents</span>
          <span className={styles.scoreValue}>{oppGoals}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Period</span>
          <span className={styles.scoreValue}>P{period}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Format</span>
          <span className={styles.scoreValue}>3v3 Rink</span>
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
          id="btn-hockey-wristshot"
          onClick={wristShot}
          disabled={gameState !== 'PLAYING'}
        >
          🏒 Wrist Shot
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-hockey-slapshot"
          onClick={slapShot}
          disabled={gameState !== 'PLAYING'}
        >
          💥 Slap Shot
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-hockey-pass"
          onClick={passPuck}
          disabled={gameState !== 'PLAYING'}
        >
          Pass Slot
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-hockey-pokecheck"
          onClick={gameState === 'FACEOFF' ? faceoff : pokeCheck}
        >
          {gameState === 'FACEOFF' ? 'Drop Faceoff' : '🛡️ Poke Check'}
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-hockey-restart"
          onClick={restart}
        >
          Restart Match
        </button>
      </div>
    </div>
  );
});

HockeyLeagueArena.displayName = 'HockeyLeagueArena';
