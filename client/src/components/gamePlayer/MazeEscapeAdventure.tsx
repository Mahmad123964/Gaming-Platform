import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface MazeEscapeAdventureRef {
  restart: () => void;
  getScore: () => number;
}

interface MazeEscapeAdventureProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

// 1 = Wall, 0 = Path, 2 = Key, 3 = Locked Gate, 4 = Exit Ladder
const MAZE_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 2, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 3, 1, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 0, 4, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

export const MazeEscapeAdventure = forwardRef<MazeEscapeAdventureRef, MazeEscapeAdventureProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(45);
  const [statusText, setStatusText] = useState<string>('Labyrinth Escape: Navigate maze corridors, find the silver key, escape through the ladder!');
  const [gameState, setGameState] = useState<'EXPLORING' | 'ESCAPED' | 'TIMEOUT'>('EXPLORING');

  const scoreRef = useRef<number>(initialScore);
  const playerPos = useRef({ r: 1, c: 1 });
  const keyCollected = useRef<boolean>(false);
  const gateUnlocked = useRef<boolean>(false);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    playerPos.current = { r: 1, c: 1 };
    keyCollected.current = false;
    gateUnlocked.current = false;
    setScore(0);
    setHasKey(false);
    setTimeRemaining(45);
    setGameState('EXPLORING');
    setStatusText('Labyrinth expedition restarted! Search for the silver key.');
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const tryMove = (dr: number, dc: number) => {
    if (gameState !== 'EXPLORING') return;
    const nr = playerPos.current.r + dr;
    const nc = playerPos.current.c + dc;

    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 10) return;
    const tile = MAZE_GRID[nr][nc];

    // Wall collision
    if (tile === 1) {
      setStatusText('Blocked by ancient stone wall.');
      return;
    }

    // Gate collision
    if (tile === 3 && !gateUnlocked.current) {
      if (keyCollected.current) {
        gateUnlocked.current = true;
        setStatusText('🔓 SILVER KEY USED! Iron portcullis unlocked!');
      } else {
        setStatusText('🔒 Portcullis locked! You must retrieve the silver key first.');
        return;
      }
    }

    // Valid move
    playerPos.current = { r: nr, c: nc };

    // Key pickup
    if (tile === 2 && !keyCollected.current) {
      keyCollected.current = true;
      setHasKey(true);
      const bonus = 150;
      const nextScore = scoreRef.current + bonus;
      updateScore(nextScore);
      setStatusText('🗝️ SILVER KEY FOUND! Proceed to unlock the portcullis (+150 PTS).');
    }

    // Exit ladder
    if (tile === 4) {
      setGameState('ESCAPED');
      const winBonus = scoreRef.current + 350 + timeRemaining * 10;
      updateScore(winBonus);
      setStatusText(`🏆 LABYRINTH ESCAPED! Emerged to safety! Victory Score: ${winBonus}`);
      onGameOver?.(winBonus);
    }
  };

  useEffect(() => {
    if (gameState !== 'EXPLORING') return;
    const interval = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(interval);
          setGameState('TIMEOUT');
          setStatusText(`💀 TIME EXPIRED! Trapped in the dark labyrinth forever. Final Score: ${scoreRef.current}`);
          onGameOver?.(scoreRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const tileSize = 32;
    const offsetX = 40;
    const offsetY = 10;

    const render = () => {
      if (!running) return;

      // Dark Crypt Floor
      ctx.fillStyle = '#0a0d16';
      ctx.fillRect(0, 0, 400, 280);

      // Draw Grid
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 10; c++) {
          const tile = MAZE_GRID[r][c];
          const x = offsetX + c * tileSize;
          const y = offsetY + r * tileSize;

          if (tile === 1) {
            // Stone Wall
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, tileSize, tileSize);
          } else {
            // Path tile
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x, y, tileSize, tileSize);

            if (tile === 2 && !keyCollected.current) {
              // Silver Key
              ctx.fillStyle = '#e2e8f0';
              ctx.beginPath();
              ctx.arc(x + 16, y + 12, 5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillRect(x + 14, y + 14, 4, 10);
            } else if (tile === 3) {
              // Gate (Red if locked, Green if open)
              ctx.fillStyle = gateUnlocked.current ? '#22c55e' : '#ef4444';
              ctx.fillRect(x + 6, y + 4, tileSize - 12, tileSize - 8);
            } else if (tile === 4) {
              // Exit Ladder
              ctx.fillStyle = '#eab308';
              ctx.fillRect(x + 8, y + 4, 4, tileSize - 8);
              ctx.fillRect(x + 20, y + 4, 4, tileSize - 8);
              for (let ly = y + 8; ly < y + tileSize - 8; ly += 6) {
                ctx.fillRect(x + 8, ly, 16, 2);
              }
            }
          }
        }
      }

      // Draw Player Character (Cyan Explorer)
      const pr = playerPos.current.r;
      const pc = playerPos.current.c;
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(offsetX + pc * tileSize + 16, offsetY + pr * tileSize + 16, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

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
          <span>Maze Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Silver Key</span>
          <span className={styles.scoreValue} style={{ color: hasKey ? '#eab308' : '#94a3b8' }}>
            {hasKey ? 'ACQUIRED 🗝️' : 'SEARCHING'}
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Time Left</span>
          <span className={styles.scoreValue} style={{ color: timeRemaining < 15 ? '#ef4444' : '#38bdf8' }}>
            {timeRemaining}s
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Format</span>
          <span className={styles.scoreValue}>Procedural Crypt</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={280} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '24px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-maze-move-up"
          onClick={() => tryMove(-1, 0)}
          disabled={gameState !== 'EXPLORING'}
        >
          ▲ Move North
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-maze-move-down"
          onClick={() => tryMove(1, 0)}
          disabled={gameState !== 'EXPLORING'}
        >
          ▼ Move South
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-maze-move-left"
          onClick={() => tryMove(0, -1)}
          disabled={gameState !== 'EXPLORING'}
        >
          ◀ Move West
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-maze-move-right"
          onClick={() => tryMove(0, 1)}
          disabled={gameState !== 'EXPLORING'}
        >
          Move East ▶
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-maze-restart"
          onClick={restart}
        >
          Restart Labyrinth Escape
        </button>
      </div>
    </div>
  );
});

MazeEscapeAdventure.displayName = 'MazeEscapeAdventure';
