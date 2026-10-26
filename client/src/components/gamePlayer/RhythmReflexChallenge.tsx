import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface RhythmReflexChallengeRef {
  restart: () => void;
  getScore: () => number;
}

interface RhythmReflexChallengeProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface Note {
  id: number;
  lane: number; // 0, 1, 2, 3
  y: number;
  hit: boolean;
}

export const RhythmReflexChallenge = forwardRef<RhythmReflexChallengeRef, RhythmReflexChallengeProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [status, setStatus] = useState<string>('Strike the falling notes as they align with the bottom strike line!');

  const scoreRef = useRef<number>(initialScore);
  const runningRef = useRef<boolean>(true);
  const notesRef = useRef<Note[]>([
    { id: 1, lane: 0, y: -20, hit: false },
    { id: 2, lane: 2, y: -70, hit: false },
    { id: 3, lane: 1, y: -130, hit: false },
    { id: 4, lane: 3, y: -190, hit: false },
    { id: 5, lane: 0, y: -260, hit: false },
    { id: 6, lane: 2, y: -320, hit: false }
  ]);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setStatus('Strike the falling notes as they align with the bottom strike line!');
    notesRef.current = [
      { id: 1, lane: 0, y: -20, hit: false },
      { id: 2, lane: 2, y: -70, hit: false },
      { id: 3, lane: 1, y: -130, hit: false },
      { id: 4, lane: 3, y: -190, hit: false },
      { id: 5, lane: 0, y: -260, hit: false },
      { id: 6, lane: 2, y: -320, hit: false }
    ];
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const strikeLane = useCallback((laneIndex: number) => {
    const notes = notesRef.current;
    const strikeY = 215; // Bottom strike line
    let hitFound = false;

    for (const note of notes) {
      if (note.lane === laneIndex && !note.hit) {
        const diff = Math.abs(note.y - strikeY);
        if (diff < 18) {
          // PERFECT hit!
          note.hit = true;
          hitFound = true;
          setCombo(c => {
            const next = c + 1;
            setMaxCombo(m => Math.max(m, next));
            return next;
          });
          updateScore(scoreRef.current + 100);
          setStatus('🎵 PERFECT TIMING! +100 PTS');
          break;
        } else if (diff < 36) {
          // GOOD hit!
          note.hit = true;
          hitFound = true;
          setCombo(c => {
            const next = c + 1;
            setMaxCombo(m => Math.max(m, next));
            return next;
          });
          updateScore(scoreRef.current + 50);
          setStatus('GOOD! +50 PTS');
          break;
        }
      }
    }

    if (!hitFound) {
      setCombo(0);
      setStatus('MISS! Combo broken.');
    }
  }, [updateScore]);

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

      // Dark synthwave track
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      const laneW = W / 4;

      // Draw 4 Lane Track Separators
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneW, 0);
        ctx.lineTo(i * laneW, H);
        ctx.stroke();
      }

      // Draw Strike Line at bottom
      const strikeY = 215;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, strikeY);
      ctx.lineTo(W, strikeY);
      ctx.stroke();

      // Lane colors
      const laneColors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

      // Update notes
      const notes = notesRef.current;
      for (const n of notes) {
        if (!n.hit) {
          n.y += 2.4; // Fall speed

          // Passed strike line without hitting
          if (n.y > strikeY + 30) {
            n.hit = true;
            setCombo(0);
          }
        }

        // Draw note if not hit
        if (!n.hit && n.y > -20 && n.y < H + 20) {
          ctx.fillStyle = laneColors[n.lane];
          ctx.beginPath();
          ctx.roundRect(n.lane * laneW + 8, n.y - 10, laneW - 16, 20, 6);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Loop / respawn notes
        if (n.y > H + 40) {
          n.y = -50 - Math.random() * 200;
          n.lane = Math.floor(Math.random() * 4);
          n.hit = false;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={styles.container} id="rhythm-reflex-challenge-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Beat Score</span>
          <span className={styles.scoreValue} id="rhythm-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Combo Streak</span>
          <span className={styles.scoreValue} style={{ color: combo > 5 ? '#facc15' : '#38bdf8' }}>
            {combo}x
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Max Combo</span>
          <span className={styles.scoreValue}>{maxCombo}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className={styles.gameCanvas}
          id="rhythm-canvas"
        />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#ec4899', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-rhythm-lane-0"
          onClick={() => strikeLane(0)}
          style={{ width: '70px', minHeight: '48px' }}
        >
          Track 1
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-rhythm-lane-1"
          onClick={() => strikeLane(1)}
          style={{ width: '70px', minHeight: '48px' }}
        >
          Track 2
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-rhythm-lane-2"
          onClick={() => strikeLane(2)}
          style={{ width: '70px', minHeight: '48px' }}
        >
          Track 3
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-rhythm-lane-3"
          onClick={() => strikeLane(3)}
          style={{ width: '70px', minHeight: '48px' }}
        >
          Track 4
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-rhythm-restart"
          onClick={restart}
        >
          Restart Beat Track
        </button>
      </div>
    </div>
  );
});

RhythmReflexChallenge.displayName = 'RhythmReflexChallenge';
