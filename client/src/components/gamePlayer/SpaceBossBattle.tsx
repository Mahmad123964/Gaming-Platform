import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface SpaceBossBattleRef {
  restart: () => void;
  getScore: () => number;
}

interface SpaceBossBattleProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const SpaceBossBattle = forwardRef<SpaceBossBattleRef, SpaceBossBattleProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [bossHp, setBossHp] = useState<number>(500);
  const [bossPhase, setBossPhase] = useState<number>(1);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [bombs, setBombs] = useState<number>(2);
  const [status, setStatus] = useState<string>('Dreadnought Mothership detected! Target the central shield core.');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const shipRef = useRef({ x: 180, y: 225, speed: 4.0 });
  const bossRef = useRef({
    x: 180,
    y: 65,
    vx: 1.5,
    width: 140,
    height: 45,
    hp: 500,
    maxHp: 500,
    phase: 1
  });

  const playerLasersRef = useRef<{ x: number; y: number; vy: number }[]>([]);
  const bossBulletsRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setBossHp(500);
    setBossPhase(1);
    setPlayerHp(100);
    setBombs(2);
    setStatus('Dreadnought Mothership detected! Target the central shield core.');
    shipRef.current = { x: 180, y: 225, speed: 4.0 };
    bossRef.current = { x: 180, y: 65, vx: 1.5, width: 140, height: 45, hp: 500, maxHp: 500, phase: 1 };
    playerLasersRef.current = [];
    bossBulletsRef.current = [];
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const moveShip = useCallback((dir: 'LEFT' | 'RIGHT') => {
    const s = shipRef.current;
    if (dir === 'LEFT') s.x = Math.max(30, s.x - 24);
    else s.x = Math.min(330, s.x + 24);
  }, []);

  const fireLasers = useCallback(() => {
    const s = shipRef.current;
    playerLasersRef.current.push(
      { x: s.x - 8, y: s.y - 12, vy: -7.5 },
      { x: s.x + 8, y: s.y - 12, vy: -7.5 }
    );
  }, []);

  const dropBomb = useCallback(() => {
    if (bombs <= 0) return;
    setBombs(b => b - 1);
    bossBulletsRef.current = []; // Clear enemy bullets
    const b = bossRef.current;
    b.hp = Math.max(0, b.hp - 80);
    setBossHp(b.hp);
    updateScore(scoreRef.current + 150);
    setStatus('💥 EMP MISSILE DETONATED! Heavy shield damage to Boss core!');
  }, [bombs, updateScore]);

  // Main canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    runningRef.current = true;
    let animId: number;
    let frame = 0;

    const render = () => {
      if (!runningRef.current) return;
      const W = canvas.width;
      const H = canvas.height;
      frame++;

      // Starfield background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 25; i++) {
        const starY = (i * 19 + frame * 1.5) % H;
        const starX = (i * 37) % W;
        ctx.fillRect(starX, starY, 1.5, 1.5);
      }

      // Update Boss
      const b = bossRef.current;
      b.x += b.vx;
      if (b.x < 110 || b.x > W - 110) b.vx = -b.vx;

      // Boss bullet generation
      if (frame % (b.phase === 3 ? 20 : b.phase === 2 ? 30 : 45) === 0) {
        if (b.phase === 1) {
          // Dual vertical lasers
          bossBulletsRef.current.push(
            { x: b.x - 35, y: b.y + 20, vx: 0, vy: 3.5 },
            { x: b.x + 35, y: b.y + 20, vx: 0, vy: 3.5 }
          );
        } else if (b.phase === 2) {
          // Radial 3-way spread
          bossBulletsRef.current.push(
            { x: b.x, y: b.y + 20, vx: -1.5, vy: 3.2 },
            { x: b.x, y: b.y + 20, vx: 0, vy: 3.8 },
            { x: b.x, y: b.y + 20, vx: 1.5, vy: 3.2 }
          );
        } else {
          // Phase 3: Radial 5-way barrage
          for (let angle = -0.6; angle <= 0.6; angle += 0.3) {
            bossBulletsRef.current.push({
              x: b.x,
              y: b.y + 20,
              vx: Math.sin(angle) * 3.5,
              vy: Math.cos(angle) * 3.5
            });
          }
        }
      }

      // Update player lasers
      const lasers = playerLasersRef.current;
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.y += l.vy;

        // Collision with boss
        if (l.x > b.x - b.width / 2 && l.x < b.x + b.width / 2 &&
            l.y > b.y - b.height / 2 && l.y < b.y + b.height / 2) {
          lasers.splice(i, 1);
          b.hp = Math.max(0, b.hp - 10);
          setBossHp(b.hp);
          updateScore(scoreRef.current + 10);

          // Check phase transition
          if (b.hp <= 150 && b.phase < 3) {
            b.phase = 3;
            setBossPhase(3);
            setStatus('⚠️ BOSS ENRAGED! Phase 3 Core Overload active!');
          } else if (b.hp <= 320 && b.phase < 2) {
            b.phase = 2;
            setBossPhase(2);
            setStatus('⚠️ BOSS SHIELD DAMAGED! Entering Phase 2 radial spread.');
          }

          if (b.hp <= 0) {
            setStatus('🏆 MOTHERSHIP DESTROYED! Galaxy saved from orbital siege!');
          }
          continue;
        }

        if (l.y < 0) lasers.splice(i, 1);
      }

      // Update boss bullets
      const bBullets = bossBulletsRef.current;
      const ship = shipRef.current;
      for (let i = bBullets.length - 1; i >= 0; i--) {
        const bb = bBullets[i];
        bb.x += bb.vx;
        bb.y += bb.vy;

        // Hit player
        if (Math.hypot(bb.x - ship.x, bb.y - ship.y) < 14) {
          bBullets.splice(i, 1);
          setPlayerHp(hp => {
            const next = Math.max(0, hp - 12);
            if (next <= 0) setStatus('Hull integrity lost! Ship destroyed.');
            return next;
          });
          continue;
        }

        if (bb.y > H + 20 || bb.x < 0 || bb.x > W) bBullets.splice(i, 1);
      }

      // Draw Boss Mothership
      ctx.fillStyle = b.phase === 3 ? '#ef4444' : b.phase === 2 ? '#f59e0b' : '#6366f1';
      ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);

      // Boss shield core (Glowing center)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Player Lasers
      ctx.fillStyle = '#38bdf8';
      for (const l of lasers) {
        ctx.fillRect(l.x - 1.5, l.y, 3, 10);
      }

      // Draw Boss Bullets
      ctx.fillStyle = '#f87171';
      for (const bb of bBullets) {
        ctx.beginPath();
        ctx.arc(bb.x, bb.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player Fighter
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y - 12);
      ctx.lineTo(ship.x - 12, ship.y + 10);
      ctx.lineTo(ship.x, ship.y + 4);
      ctx.lineTo(ship.x + 12, ship.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [updateScore]);

  return (
    <div className={styles.container} id="space-boss-battle-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Score</span>
          <span className={styles.scoreValue} id="boss-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Boss Core</span>
          <span className={styles.scoreValue} style={{ color: bossHp < 150 ? '#ef4444' : '#f59e0b' }}>
            {bossHp} HP (P{bossPhase})
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Hull Integrity</span>
          <span className={styles.scoreValue} style={{ color: playerHp < 30 ? '#ef4444' : '#38bdf8' }}>
            {playerHp}%
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>EMP Bombs</span>
          <span className={styles.scoreValue}>{bombs}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="boss-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#f59e0b', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-boss-left"
          onClick={() => moveShip('LEFT')}
        >
          ◀ Strafe Left
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-boss-fire"
          onClick={fireLasers}
        >
          ⚡ Dual Lasers
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-boss-bomb"
          onClick={dropBomb}
          disabled={bombs <= 0}
        >
          💥 EMP Missile
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-boss-right"
          onClick={() => moveShip('RIGHT')}
        >
          Strafe Right ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-boss-restart"
          onClick={restart}
        >
          Engage Next Boss Fleet
        </button>
      </div>
    </div>
  );
});

SpaceBossBattle.displayName = 'SpaceBossBattle';
