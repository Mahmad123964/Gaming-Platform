import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface RobotCombatArenaRef {
  restart: () => void;
  getScore: () => number;
}

interface RobotCombatArenaProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const RobotCombatArena = forwardRef<RobotCombatArenaRef, RobotCombatArenaProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [aiHp, setAiHp] = useState<number>(100);
  const [score, setScore] = useState<number>(initialScore);
  const [wins, setWins] = useState<number>(0);
  const [status, setStatus] = useState<string>('Engage the rival battlebot! Spin sawblade and time pneumatic flips.');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const playerRef = useRef({
    x: 100,
    y: 130,
    angle: 0,
    speed: 3.0,
    spinning: false,
    flipping: false,
    shield: false
  });

  const aiRef = useRef({
    x: 260,
    y: 130,
    angle: Math.PI,
    speed: 2.2,
    hp: 100
  });

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setPlayerHp(100);
    setAiHp(100);
    setWins(0);
    setStatus('Engage the rival battlebot! Spin sawblade and time pneumatic flips.');
    playerRef.current = { x: 100, y: 130, angle: 0, speed: 3.0, spinning: false, flipping: false, shield: false };
    aiRef.current = { x: 260, y: 130, angle: Math.PI, speed: 2.2, hp: 100 };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const throttleForward = useCallback(() => {
    const p = playerRef.current;
    p.x = Math.max(40, Math.min(320, p.x + Math.cos(p.angle) * 16));
    p.y = Math.max(40, Math.min(220, p.y + Math.sin(p.angle) * 16));
  }, []);

  const spinSawblade = useCallback(() => {
    const p = playerRef.current;
    p.spinning = true;
    setStatus('⚡ HORIZONTAL SAWBLADE SPINNING at 8,000 RPM!');
    setTimeout(() => { p.spinning = false; }, 2000);
  }, []);

  const pneumaticFlip = useCallback(() => {
    const p = playerRef.current;
    const ai = aiRef.current;
    p.flipping = true;
    setStatus('💥 PNEUMATIC FLIPPER DEPLOYED!');

    // Check contact range
    if (Math.hypot(p.x - ai.x, p.y - ai.y) < 45) {
      ai.hp = Math.max(0, ai.hp - 25);
      setAiHp(Math.round(ai.hp));
      ai.x += Math.cos(p.angle) * 30; // Knockback
      updateScore(scoreRef.current + 100);
      setStatus('🎯 DIRECT HIT! Rival flipped and took critical damage!');
      if (ai.hp <= 0) {
        setWins(w => w + 1);
        setStatus('🏆 KNOCKOUT VICTORY! Rival robot incapacitated!');
      }
    }
    setTimeout(() => { p.flipping = false; }, 600);
  }, [updateScore]);

  const toggleShield = useCallback(() => {
    const p = playerRef.current;
    p.shield = !p.shield;
    setStatus(p.shield ? '🛡️ EMP Defense Shield Active!' : 'Shield lowered.');
  }, []);

  // Main canvas loop
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

      // Steel battlebox arena floor
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, W, H);

      // Warning hazard stripes around perimeter
      ctx.fillStyle = '#eab308';
      for (let x = 0; x < W; x += 30) {
        ctx.fillRect(x, 0, 15, 8);
        ctx.fillRect(x, H - 8, 15, 8);
      }
      for (let y = 0; y < H; y += 30) {
        ctx.fillRect(0, y, 8, 15);
        ctx.fillRect(W - 8, y, 8, 15);
      }

      // Arena Pulverizer spike trap
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px sans-serif';
      ctx.fillText('PIT', W / 2 - 8, H / 2 + 3);

      const p = playerRef.current;
      const ai = aiRef.current;

      // AI tracks player
      const angleToPlayer = Math.atan2(p.y - ai.y, p.x - ai.x);
      ai.angle = angleToPlayer;
      if (Math.hypot(p.x - ai.x, p.y - ai.y) > 35) {
        ai.x += Math.cos(angleToPlayer) * ai.speed;
        ai.y += Math.sin(angleToPlayer) * ai.speed;
      } else {
        // AI ramming attack
        if (!p.shield) {
          setPlayerHp(hp => Math.max(0, hp - 0.25));
        }
      }

      // Player sawblade damage tick
      if (p.spinning && Math.hypot(p.x - ai.x, p.y - ai.y) < 40) {
        ai.hp = Math.max(0, ai.hp - 0.5);
        setAiHp(Math.round(ai.hp));
        updateScore(scoreRef.current + 2);
        // Sawblade sparks
        ctx.fillStyle = '#fbbf24';
        for (let k = 0; k < 4; k++) {
          ctx.fillRect(ai.x + (Math.random() - 0.5) * 20, ai.y + (Math.random() - 0.5) * 20, 2, 2);
        }
      }

      // Draw Player Robot (Armored blue wedge with spinning blade)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Chassis
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-15, -12, 30, 24);

      // Tracks / Wheels
      ctx.fillStyle = '#020617';
      ctx.fillRect(-18, -15, 36, 4);
      ctx.fillRect(-18, 11, 36, 4);

      // Weapon: Front sawblade
      ctx.strokeStyle = p.spinning ? '#38bdf8' : '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(18, 0, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Shield aura
      if (p.shield) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Draw AI Robot (Heavy red drum spinner)
      ctx.save();
      ctx.translate(ai.x, ai.y);
      ctx.rotate(ai.angle);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-16, -14, 32, 28);
      ctx.fillStyle = '#020617';
      ctx.fillRect(-18, -17, 36, 4);
      ctx.fillRect(-18, 13, 36, 4);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(14, -8, 8, 16); // Drum spinner
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [updateScore]);

  return (
    <div className={styles.container} id="robot-combat-arena-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Score</span>
          <span className={styles.scoreValue} id="bot-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Player Bot</span>
          <span className={styles.scoreValue} style={{ color: playerHp < 30 ? '#ef4444' : '#38bdf8' }}>
            {Math.round(playerHp)}%
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Rival AI</span>
          <span className={styles.scoreValue} style={{ color: aiHp < 30 ? '#ef4444' : '#f87171' }}>
            {Math.round(aiHp)}%
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Wins</span>
          <span className={styles.scoreValue}>{wins}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="bot-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-bot-forward"
          onClick={throttleForward}
        >
          ⚡ Throttle Ram
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-bot-spin"
          onClick={spinSawblade}
        >
          ⚙️ Sawblade Spin
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-bot-flip"
          onClick={pneumaticFlip}
        >
          💥 Pneumatic Flip
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-bot-shield"
          onClick={toggleShield}
        >
          🛡️ EMP Shield
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-bot-restart"
          onClick={restart}
        >
          Repair & Re-Enter Arena
        </button>
      </div>
    </div>
  );
});

RobotCombatArena.displayName = 'RobotCombatArena';
