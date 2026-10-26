import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TicTacToePro.module.css';

export interface LaserMirrorRelayRef {
  restart: () => void;
  getScore: () => number;
}

interface LaserMirrorRelayProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

const SIZE = 4;
type CellType = 'EMPTY' | 'MIRROR_SLASH' | 'MIRROR_BACKSLASH' | 'EMITTER' | 'SENSOR';

export const LaserMirrorRelay = forwardRef<LaserMirrorRelayRef, LaserMirrorRelayProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [moves, setMoves] = useState<number>(0);
  const [isLaserActive, setIsLaserActive] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  // Initial grid layout with mirrors that need rotation
  // Emitter at (0, 0) pointing East. Sensor at (3, 3) accepting South.
  // Desired path: (0,0)->(0,2)->(2,2)->(2,3)->(3,3)
  const [grid, setGrid] = useState<CellType[][]>([
    ['EMITTER', 'EMPTY', 'MIRROR_SLASH', 'EMPTY'],
    ['EMPTY', 'EMPTY', 'EMPTY', 'EMPTY'],
    ['EMPTY', 'EMPTY', 'MIRROR_BACKSLASH', 'MIRROR_SLASH'],
    ['EMPTY', 'EMPTY', 'EMPTY', 'SENSOR']
  ]);

  const rotateMirror = useCallback((r: number, c: number) => {
    if (gameOver) return;

    setGrid(prev => {
      const next = prev.map(row => [...row]);
      const cur = next[r][c];
      if (cur === 'MIRROR_SLASH') {
        next[r][c] = 'MIRROR_BACKSLASH';
      } else if (cur === 'MIRROR_BACKSLASH') {
        next[r][c] = 'MIRROR_SLASH';
      } else {
        return prev;
      }

      setMoves(m => m + 1);
      return next;
    });
  }, [gameOver]);

  const testLaser = useCallback(() => {
    if (gameOver) return;
    setIsLaserActive(true);

    // Ray trace: Start at (0, 0), going EAST (dx = 1, dy = 0)
    let curX = 0;
    let curY = 0;
    let dx = 1;
    let dy = 0;
    let reachedSensor = false;

    for (let step = 0; step < 16; step++) {
      curX += dx;
      curY += dy;

      if (curX < 0 || curX >= SIZE || curY < 0 || curY >= SIZE) break;

      const cell = grid[curY][curX];
      if (cell === 'SENSOR') {
        reachedSensor = true;
        break;
      } else if (cell === 'MIRROR_SLASH') { // '/' reflects: right->up, left->down, up->right, down->left
        if (dx === 1 && dy === 0) { dx = 0; dy = -1; }
        else if (dx === -1 && dy === 0) { dx = 0; dy = 1; }
        else if (dx === 0 && dy === 1) { dx = -1; dy = 0; }
        else if (dx === 0 && dy === -1) { dx = 1; dy = 0; }
      } else if (cell === 'MIRROR_BACKSLASH') { // '\' reflects: right->down, left->up, up->left, down->right
        if (dx === 1 && dy === 0) { dx = 0; dy = 1; }
        else if (dx === -1 && dy === 0) { dx = 0; dy = -1; }
        else if (dx === 0 && dy === 1) { dx = 1; dy = 0; }
        else if (dx === 0 && dy === -1) { dx = -1; dy = 0; }
      }
    }

    if (reachedSensor) {
      setGameOver(true);
      setVictory(true);
      const winScore = Math.max(100, 250 - moves * 10);
      setScore(winScore);
      if (onScoreUpdate) onScoreUpdate(winScore);
      if (onGameOver) onGameOver(winScore);
    } else {
      setTimeout(() => setIsLaserActive(false), 800);
    }
  }, [gameOver, grid, moves, onGameOver, onScoreUpdate]);

  const restart = useCallback(() => {
    setGrid([
      ['EMITTER', 'EMPTY', 'MIRROR_SLASH', 'EMPTY'],
      ['EMPTY', 'EMPTY', 'EMPTY', 'EMPTY'],
      ['EMPTY', 'EMPTY', 'MIRROR_BACKSLASH', 'MIRROR_SLASH'],
      ['EMPTY', 'EMPTY', 'EMPTY', 'SENSOR']
    ]);
    setMoves(0);
    setScore(0);
    setIsLaserActive(false);
    setGameOver(false);
    setVictory(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  return (
    <div className={styles.container} id="game-laser-mirror-relay">
      <div className={styles.scoreboard} id="laser-mirror-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-laser-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>ROTATIONS</span>
          <span className={styles.value} id="score-laser-moves">{moves}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>BEAM STATUS</span>
          <span className={styles.value} id="score-laser-status">{isLaserActive ? 'ACTIVE ⚡' : 'STANDBY'}</span>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94A3B8', margin: '6px 0' }}>
        Tap mirrors to rotate optical angle. Align the beam from Emitter to Sensor!
      </p>

      {/* 4x4 Optical Grid */}
      <div
        id="grid-laser-relay"
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
          row.map((cell, c) => {
            const isMirror = cell === 'MIRROR_SLASH' || cell === 'MIRROR_BACKSLASH';
            return (
              <button
                key={`mirror-${r}-${c}`}
                id={`cell-mirror-${r}-${c}`}
                type="button"
                onClick={() => rotateMirror(r, c)}
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '6px',
                  border: isMirror ? '2px solid #00F0FF' : '1px solid #334155',
                  background: cell === 'EMITTER' ? '#0284C7' : cell === 'SENSOR' ? '#10B981' : isMirror ? '#1E293B' : '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  cursor: isMirror ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {cell === 'EMITTER' ? '⚡' : cell === 'SENSOR' ? '🎯' : cell === 'MIRROR_SLASH' ? '╱' : cell === 'MIRROR_BACKSLASH' ? '╲' : ''}
              </button>
            );
          })
        )}
      </div>

      {/* Mobile Controls */}
      <div className={styles.mobileControls} id="laser-mirror-mobile-controls">
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-laser-pulse"
          onClick={testLaser}
          disabled={gameOver}
        >
          ⚡ Test Laser Relay Pulse
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="laser-mirror-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'OPTICAL RELAY LOCKED!' : 'CIRCUIT INCOMPLETE'}
          </h3>
          <p className={styles.overlayText}>
            Beam Connected! Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-laser-relay-restart"
            onClick={restart}
          >
            Reconfigure Optical Grid
          </button>
        </div>
      )}
    </div>
  );
});

LaserMirrorRelay.displayName = 'LaserMirrorRelay';
