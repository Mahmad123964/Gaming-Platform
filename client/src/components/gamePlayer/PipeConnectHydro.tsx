import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TicTacToePro.module.css';

export interface PipeConnectHydroRef {
  restart: () => void;
  getScore: () => number;
}

interface PipeConnectHydroProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const SIZE = 4;

// Rotation angles: 0, 90, 180, 270 degrees
interface PipeTile {
  type: 'STRAIGHT' | 'ELBOW';
  rot: number; // 0, 90, 180, 270
}

export const PipeConnectHydro = forwardRef<PipeConnectHydroRef, PipeConnectHydroProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [moves, setMoves] = useState<number>(0);
  const [flowing, setFlowing] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  // Initial grid with scrambled pipe rotations
  const [grid, setGrid] = useState<PipeTile[][]>([
    [{ type: 'ELBOW', rot: 180 }, { type: 'STRAIGHT', rot: 90 }, { type: 'ELBOW', rot: 270 }, { type: 'STRAIGHT', rot: 0 }],
    [{ type: 'STRAIGHT', rot: 90 }, { type: 'ELBOW', rot: 0 }, { type: 'STRAIGHT', rot: 0 }, { type: 'ELBOW', rot: 90 }],
    [{ type: 'ELBOW', rot: 90 }, { type: 'STRAIGHT', rot: 90 }, { type: 'ELBOW', rot: 180 }, { type: 'STRAIGHT', rot: 0 }],
    [{ type: 'STRAIGHT', rot: 0 }, { type: 'ELBOW', rot: 270 }, { type: 'STRAIGHT', rot: 90 }, { type: 'ELBOW', rot: 0 }]
  ]);

  const rotatePipe = useCallback((r: number, c: number) => {
    if (gameOver) return;

    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c].rot = (next[r][c].rot + 90) % 360;
      setMoves(m => m + 1);
      return next;
    });
  }, [gameOver]);

  // Check if pipe connects in direction: 'TOP', 'BOTTOM', 'LEFT', 'RIGHT'
  const hasOpening = (tile: PipeTile, dir: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'): boolean => {
    const { type, rot } = tile;
    if (type === 'STRAIGHT') {
      if (rot === 0 || rot === 180) return dir === 'TOP' || dir === 'BOTTOM';
      return dir === 'LEFT' || dir === 'RIGHT';
    } else { // ELBOW
      // 0 deg: TOP & RIGHT (└)
      if (rot === 0) return dir === 'TOP' || dir === 'RIGHT';
      // 90 deg: RIGHT & BOTTOM (┌)
      if (rot === 90) return dir === 'RIGHT' || dir === 'BOTTOM';
      // 180 deg: BOTTOM & LEFT (┐)
      if (rot === 180) return dir === 'BOTTOM' || dir === 'LEFT';
      // 270 deg: LEFT & TOP (┘)
      return dir === 'LEFT' || dir === 'TOP';
    }
  };

  const testFlow = useCallback(() => {
    if (gameOver) return;
    setFlowing(true);

    // Simple path traversal from (0,0) to (3,3)
    let curR = 0;
    let curC = 0;
    let fromDir: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' = 'LEFT'; // Water enters (0,0) from LEFT
    let connected = false;

    const visited = new Set<string>();

    for (let step = 0; step < 16; step++) {
      const key = `${curR},${curC}`;
      if (visited.has(key)) break;
      visited.add(key);

      const tile = grid[curR][curC];
      // Check water entry
      if (!hasOpening(tile, fromDir)) break;

      // Find exit
      const dirs: Array<'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'> = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
      const exitDir = dirs.find(d => d !== fromDir && hasOpening(tile, d));
      if (!exitDir) break;

      if (curR === 3 && curC === 3) {
        connected = true;
        break;
      }

      // Step to next tile
      if (exitDir === 'TOP') { curR -= 1; fromDir = 'BOTTOM'; }
      else if (exitDir === 'BOTTOM') { curR += 1; fromDir = 'TOP'; }
      else if (exitDir === 'LEFT') { curC -= 1; fromDir = 'RIGHT'; }
      else if (exitDir === 'RIGHT') { curC += 1; fromDir = 'LEFT'; }

      if (curR < 0 || curR >= SIZE || curC < 0 || curC >= SIZE) break;
    }

    if (connected) {
      setGameOver(true);
      setVictory(true);
      const winScore = Math.max(100, 250 - moves * 10);
      setScore(winScore);
      if (onScoreUpdate) onScoreUpdate(winScore);
      if (onGameOver) onGameOver(winScore);
    } else {
      setTimeout(() => setFlowing(false), 800);
    }
  }, [gameOver, grid, moves, onGameOver, onScoreUpdate]);

  const restart = useCallback(() => {
    setGrid([
      [{ type: 'ELBOW', rot: 180 }, { type: 'STRAIGHT', rot: 90 }, { type: 'ELBOW', rot: 270 }, { type: 'STRAIGHT', rot: 0 }],
      [{ type: 'STRAIGHT', rot: 90 }, { type: 'ELBOW', rot: 0 }, { type: 'STRAIGHT', rot: 0 }, { type: 'ELBOW', rot: 90 }],
      [{ type: 'ELBOW', rot: 90 }, { type: 'STRAIGHT', rot: 90 }, { type: 'ELBOW', rot: 180 }, { type: 'STRAIGHT', rot: 0 }],
      [{ type: 'STRAIGHT', rot: 0 }, { type: 'ELBOW', rot: 270 }, { type: 'STRAIGHT', rot: 90 }, { type: 'ELBOW', rot: 0 }]
    ]);
    setMoves(0);
    setScore(0);
    setFlowing(false);
    setGameOver(false);
    setVictory(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  const getPipeGlyph = (tile: PipeTile) => {
    if (tile.type === 'STRAIGHT') {
      return (tile.rot === 0 || tile.rot === 180) ? '┃' : '━';
    } else {
      if (tile.rot === 0) return '┗';
      if (tile.rot === 90) return '┏';
      if (tile.rot === 180) return '┓';
      return '┛';
    }
  };

  return (
    <div className={styles.container} id="game-pipe-connect-hydro">
      <div className={styles.scoreboard} id="pipe-connect-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-pipe-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>ROTATIONS</span>
          <span className={styles.value} id="score-pipe-moves">{moves}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>FLOW</span>
          <span className={styles.value} id="score-pipe-flow">{flowing ? 'PUMPING 💧' : 'STANDBY'}</span>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94A3B8', margin: '6px 0' }}>
        Tap pipe sections to rotate 90°. Connect Valve (Top-Left) to Drain (Bottom-Right)!
      </p>

      {/* 4x4 Grid */}
      <div
        id="grid-pipe-connect"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gap: '8px',
          maxWidth: '280px',
          margin: '12px auto',
          padding: '12px',
          background: '#0B132B',
          borderRadius: '8px'
        }}
      >
        {grid.map((row, r) =>
          row.map((tile, c) => (
            <button
              key={`pipe-${r}-${c}`}
              id={`cell-pipe-${r}-${c}`}
              type="button"
              onClick={() => rotatePipe(r, c)}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: flowing ? 'rgba(56, 189, 248, 0.25)' : '#1E293B',
                color: '#38BDF8',
                fontSize: '1.6rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {getPipeGlyph(tile)}
            </button>
          ))
        )}
      </div>

      {/* Mobile Controls */}
      <div className={styles.mobileControls} id="pipe-connect-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-pipe-flow-test"
          onClick={testFlow}
          disabled={gameOver}
        >
          💧 Open Valve / Test Hydro Flow
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="pipe-connect-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'HYDRO FLOW CONNECTED!' : 'PIPE LEAK DETECTED'}
          </h3>
          <p className={styles.overlayText}>
            Continuous Water Circuit Verified! Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-pipe-connect-restart"
            onClick={restart}
          >
            Connect Next Circuit
          </button>
        </div>
      )}
    </div>
  );
});

PipeConnectHydro.displayName = 'PipeConnectHydro';
