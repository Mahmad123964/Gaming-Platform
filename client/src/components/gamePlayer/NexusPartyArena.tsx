import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface NexusPartyArenaRef {
  restart: () => void;
  getScore: () => number;
}

interface NexusPartyArenaProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const NexusPartyArena = forwardRef<NexusPartyArenaRef, NexusPartyArenaProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [round, setRound] = useState<number>(1);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Nexus Party Arena: Bump rival bots off the circular ring and hoard coins!');
  const [gameState, setGameState] = useState<'PLAYING' | 'RING_OUT' | 'CHAMPION'>('PLAYING');

  const scoreRef = useRef<number>(initialScore);
  const player = useRef({ x: 200, y: 130, vx: 0, vy: 0, radius: 12, alive: true });
  const bots = useRef([
    { id: 1, x: 130, y: 80, vx: 0.8, vy: 0.5, radius: 12, alive: true, color: '#f43f5e' },
    { id: 2, x: 270, y: 80, vx: -0.6, vy: 0.8, radius: 12, alive: true, color: '#eab308' },
    { id: 3, x: 200, y: 200, vx: 0.7, vy: -0.7, radius: 12, alive: true, color: '#a855f7' }
  ]);
  const coins = useRef<{ x: number; y: number }[]>([
    { x: 160, y: 130 },
    { x: 240, y: 130 }
  ]);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setRound(1);
    setCoinsCollected(0);
    setGameState('PLAYING');
    setStatusText('Party Arena restarted! Knock bots out of the ring.');
    player.current = { x: 200, y: 130, vx: 0, vy: 0, radius: 12, alive: true };
    bots.current = [
      { id: 1, x: 130, y: 80, vx: 0.8, vy: 0.5, radius: 12, alive: true, color: '#f43f5e' },
      { id: 2, x: 270, y: 80, vx: -0.6, vy: 0.8, radius: 12, alive: true, color: '#eab308' },
      { id: 3, x: 200, y: 200, vx: 0.7, vy: -0.7, radius: 12, alive: true, color: '#a855f7' }
    ];
    coins.current = [
      { x: 160, y: 130 },
      { x: 240, y: 130 }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const bumpDash = () => {
    if (gameState !== 'PLAYING') return;
    const p = player.current;
    p.vx += (Math.random() - 0.5) * 6;
    p.vy -= 4.5;
    setStatusText('💥 BUMPER SLAM! Launched heavy kinetic shockwave!');

    // Check collision with bots
    bots.current.forEach(bot => {
      if (bot.alive && Math.hypot(p.x - bot.x, p.y - bot.y) < 35) {
        bot.vx += (bot.x - p.x) * 0.4;
        bot.vy += (bot.y - p.y) * 0.4;
      }
    });
  };

  const moveLeft = () => {
    if (gameState !== 'PLAYING') return;
    player.current.vx -= 2.5;
  };

  const moveRight = () => {
    if (gameState !== 'PLAYING') return;
    player.current.vx += 2.5;
  };

  const superDash = () => {
    if (gameState !== 'PLAYING') return;
    player.current.vy += 3.5;
    setStatusText('⚡ Turbo Dash across the platform!');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      const p = player.current;
      const arenaCenterX = 200;
      const arenaCenterY = 130;
      const arenaRadius = 110;

      // Update Player
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;

      // Ring out check for player
      if (Math.hypot(p.x - arenaCenterX, p.y - arenaCenterY) > arenaRadius && gameState === 'PLAYING') {
        p.alive = false;
        setGameState('RING_OUT');
        setStatusText(`💥 RING OUT! Knocked off the party platform! Final Score: ${scoreRef.current}`);
        onGameOver?.(scoreRef.current);
      }

      // Update Bots
      let botsAlive = 0;
      bots.current.forEach(bot => {
        if (!bot.alive) return;
        bot.x += bot.vx;
        bot.y += bot.vy;
        bot.vx *= 0.96;
        bot.vy *= 0.96;

        // Bot AI movement towards center or coins
        bot.vx += (arenaCenterX - bot.x) * 0.005;
        bot.vy += (arenaCenterY - bot.y) * 0.005;

        // Bot ring out
        if (Math.hypot(bot.x - arenaCenterX, bot.y - arenaCenterY) > arenaRadius) {
          bot.alive = false;
          const killBonus = 200;
          const nextScore = scoreRef.current + killBonus;
          updateScore(nextScore);
          setStatusText('🎯 Bumper K.O.! Rival bot eliminated (+200 PTS)!');
        } else {
          botsAlive++;
        }
      });

      // Coin pickups
      for (let i = coins.current.length - 1; i >= 0; i--) {
        const c = coins.current[i];
        if (Math.hypot(p.x - c.x, p.y - c.y) < 18) {
          coins.current.splice(i, 1);
          setCoinsCollected(cc => cc + 1);
          const bonus = 50;
          const nextScore = scoreRef.current + bonus;
          updateScore(nextScore);
          setStatusText('🪙 Shiny party coin collected (+50 PTS)!');
        }
      }

      // Victory round check
      if (botsAlive === 0 && gameState === 'PLAYING') {
        setGameState('CHAMPION');
        const champBonus = scoreRef.current + 500;
        updateScore(champBonus);
        setStatusText(`🏆 PARTY CHAMPION! Sole survivor in the arena! Victory Score: ${champBonus}`);
        onGameOver?.(champBonus);
      }

      // Draw Fun Party Arena
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // Neon Circular Arena Platform
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(arenaCenterX, arenaCenterY, arenaRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Platform grid patterns
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(arenaCenterX, arenaCenterY, arenaRadius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Coins
      ctx.fillStyle = '#eab308';
      coins.current.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw Bots
      bots.current.forEach(bot => {
        if (!bot.alive) return;
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw Player (Electric Cyan Bumper Orb)
      if (p.alive) {
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gameState, onGameOver, updateScore]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Party Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Coins</span>
          <span className={styles.scoreValue}>{coinsCollected} 🪙</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Round</span>
          <span className={styles.scoreValue}>R{round}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Format</span>
          <span className={styles.scoreValue}>4-Player Free-for-All</span>
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
          id="btn-party-bump"
          onClick={bumpDash}
          disabled={gameState !== 'PLAYING'}
        >
          💥 Bumper Slam
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-party-move-left"
          onClick={moveLeft}
          disabled={gameState !== 'PLAYING'}
        >
          ◀ Steer Left
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-party-move-right"
          onClick={moveRight}
          disabled={gameState !== 'PLAYING'}
        >
          Steer Right ▶
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-party-dash"
          onClick={superDash}
          disabled={gameState !== 'PLAYING'}
        >
          ⚡ Super Dash
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-party-restart"
          onClick={restart}
        >
          Restart Party Arena
        </button>
      </div>
    </div>
  );
});

NexusPartyArena.displayName = 'NexusPartyArena';
