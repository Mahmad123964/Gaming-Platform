import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface NavalCommanderRef {
  restart: () => void;
  getScore: () => number;
}

interface NavalCommanderProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const NavalCommander = forwardRef<NavalCommanderRef, NavalCommanderProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tonnageSunk, setTonnageSunk] = useState<number>(initialScore);
  const [fleetHp, setFleetHp] = useState<number>(100);
  const [sonarActive, setSonarActive] = useState<boolean>(false);
  const [airstrikesLeft, setAirstrikesLeft] = useState<number>(2);
  const [status, setStatus] = useState<string>('Oceanic task force deployed! Ping sonar and launch torpedo spreads.');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);

  const shipRef = useRef({
    x: 180,
    y: 215,
    speed: 2.5,
    flank: false
  });

  const torpedoesRef = useRef<{ x: number; y: number; vy: number }[]>([]);
  const enemiesRef = useRef<{ x: number; y: number; type: 'SUB' | 'CRUISER'; hp: number; vx: number }[]>([
    { x: 80, y: 50, type: 'CRUISER', hp: 60, vx: 1.2 },
    { x: 260, y: 90, type: 'SUB', hp: 30, vx: -0.8 }
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setTonnageSunk(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setTonnageSunk(0);
    setFleetHp(100);
    setSonarActive(false);
    setAirstrikesLeft(2);
    setStatus('Oceanic task force deployed! Ping sonar and launch torpedo spreads.');
    shipRef.current = { x: 180, y: 215, speed: 2.5, flank: false };
    torpedoesRef.current = [];
    enemiesRef.current = [
      { x: 80, y: 50, type: 'CRUISER', hp: 60, vx: 1.2 },
      { x: 260, y: 90, type: 'SUB', hp: 30, vx: -0.8 }
    ];
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const steerFlagship = useCallback((dx: number) => {
    const s = shipRef.current;
    s.x = Math.max(50, Math.min(310, s.x + dx * 25));
  }, []);

  const pingSonar = useCallback(() => {
    setSonarActive(true);
    setStatus('🔊 SONAR ACTIVE! Submerged contacts revealed on radar sweep.');
    setTimeout(() => { setSonarActive(false); }, 3500);
  }, []);

  const fireTorpedo = useCallback(() => {
    const s = shipRef.current;
    torpedoesRef.current.push(
      { x: s.x - 12, y: s.y - 15, vy: -5.0 },
      { x: s.x + 12, y: s.y - 15, vy: -5.0 }
    );
    setStatus('Torpedo tubes 1 & 2 discharged! Acoustic homing engaged.');
  }, []);

  const launchAirstrike = useCallback(() => {
    if (airstrikesLeft <= 0) return;
    setAirstrikesLeft(a => a - 1);

    // Heavily damage all enemy warships
    const enemies = enemiesRef.current;
    let sunk = 0;
    for (const e of enemies) {
      e.hp -= 50;
      if (e.hp <= 0) sunk++;
    }
    const bonus = sunk * 150 + 50;
    updateScore(scoreRef.current + bonus);
    setStatus(`✈️ CARRIER AIR STRIKE DEPLOYED! Direct bomb hits on naval fleet. +${bonus} PTS`);
  }, [airstrikesLeft, updateScore]);

  const toggleFlankSpeed = useCallback(() => {
    const s = shipRef.current;
    s.flank = !s.flank;
    s.speed = s.flank ? 4.5 : 2.5;
    setStatus(s.flank ? '⚡ FLANK SPEED ORDERED! 34 Knots.' : 'Cruising speed restored.');
  }, []);

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

      // Deep ocean naval water
      ctx.fillStyle = '#082f49';
      ctx.fillRect(0, 0, W, H);

      // Radar sweep circles
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
      ctx.arc(W / 2, H / 2, 140, 0, Math.PI * 2);
      ctx.stroke();

      // Sonar pulse wave effect
      if (sonarActive) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, (frame * 3) % 150, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Torpedo physics
      const torps = torpedoesRef.current;
      const enemies = enemiesRef.current;

      for (let i = torps.length - 1; i >= 0; i--) {
        const t = torps[i];
        t.y += t.vy;

        // Check collision with enemy vessels
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (Math.hypot(t.x - e.x, t.y - e.y) < 22) {
            torps.splice(i, 1);
            e.hp -= 30;
            updateScore(scoreRef.current + 40);

            if (e.hp <= 0) {
              enemies.splice(j, 1);
              updateScore(scoreRef.current + 100);
              setStatus(`💥 TARGET SUNK! Enemy ${e.type} destroyed!`);
            }
            break;
          }
        }

        if (t.y < 0) torps.splice(i, 1);
      }

      // Enemy AI patrolling & respawn
      for (const e of enemies) {
        e.x += e.vx;
        if (e.x < 50 || e.x > W - 50) e.vx = -e.vx;

        // Draw Enemy
        if (e.type === 'CRUISER') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(e.x - 18, e.y - 8, 36, 16);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(e.x - 6, e.y - 5, 12, 10); // Bridge
        } else {
          // Submarine (Only fully visible if sonar is active)
          ctx.fillStyle = sonarActive ? '#38bdf8' : 'rgba(56, 189, 248, 0.25)';
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, 20, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Respawn new patrol group if empty
      if (enemies.length === 0) {
        enemies.push(
          { x: 80, y: 50, type: 'CRUISER', hp: 60, vx: 1.2 },
          { x: 260, y: 90, type: 'SUB', hp: 30, vx: -0.8 }
        );
      }

      // Draw Torpedoes (Cyan trails)
      ctx.fillStyle = '#38bdf8';
      for (const t of torps) {
        ctx.fillRect(t.x - 2, t.y, 4, 8);
      }

      // Draw Player Destroyer Flagship
      const s = shipRef.current;
      ctx.fillStyle = '#94a3b8'; // Naval haze grey
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 20); // Bow
      ctx.lineTo(s.x - 12, s.y + 16);
      ctx.lineTo(s.x + 12, s.y + 16);
      ctx.closePath();
      ctx.fill();

      // Gun turret & radar mast
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(s.x - 4, s.y - 8, 8, 14);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 8);
      ctx.lineTo(s.x, s.y - 22); // Main gun barrel
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, [sonarActive, updateScore]);

  return (
    <div className={styles.container} id="naval-commander-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Tonnage Sunk</span>
          <span className={styles.scoreValue} id="naval-score">{tonnageSunk} T</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Hull Integrity</span>
          <span className={styles.scoreValue}>{fleetHp}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Air Strikes</span>
          <span className={styles.scoreValue}>{airstrikesLeft}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Sonar</span>
          <span className={styles.scoreValue} style={{ color: sonarActive ? '#38bdf8' : '#64748b' }}>
            {sonarActive ? 'SWEEP' : 'STANDBY'}
          </span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="naval-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-naval-steer-left"
          onClick={() => steerFlagship(-1)}
        >
          ◀ Port Steer
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-naval-sonar"
          onClick={pingSonar}
          disabled={sonarActive}
        >
          🔊 Ping Sonar
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-naval-torpedo"
          onClick={fireTorpedo}
        >
          🚀 Torpedo Spread
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-naval-airstrike"
          onClick={launchAirstrike}
          disabled={airstrikesLeft <= 0}
        >
          ✈️ Air Strike
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-naval-steer-right"
          onClick={() => steerFlagship(1)}
        >
          Starboard Steer ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-naval-restart"
          onClick={restart}
        >
          Sortie Next Fleet Mission
        </button>
      </div>
    </div>
  );
});

NavalCommander.displayName = 'NavalCommander';
