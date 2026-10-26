import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface ColorRhythmArenaRef {
  restart: () => void;
  getScore: () => number;
}

interface ColorRhythmArenaProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type RhythmColor = 'CYAN' | 'MAGENTA' | 'YELLOW';

export const ColorRhythmArena = forwardRef<ColorRhythmArenaRef, ColorRhythmArenaProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [combo, setCombo] = useState<number>(0);
  const [activeColor, setActiveColor] = useState<RhythmColor>('CYAN');
  const [notesHit, setNotesHit] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Color Rhythm: Match the laser gate color and strike pulses on the beat bar!');
  const [gameState, setGameState] = useState<'PLAYING' | 'SONG_COMPLETE'>('PLAYING');

  const scoreRef = useRef<number>(initialScore);
  const comboRef = useRef<number>(0);
  const activeColorRef = useRef<RhythmColor>('CYAN');
  const pulses = useRef<{ y: number; color: RhythmColor; speed: number }[]>([
    { y: -30, color: 'CYAN', speed: 2.8 },
    { y: -110, color: 'MAGENTA', speed: 2.8 },
    { y: -190, color: 'YELLOW', speed: 2.8 },
    { y: -270, color: 'CYAN', speed: 2.8 }
  ]);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    comboRef.current = 0;
    activeColorRef.current = 'CYAN';
    setScore(0);
    setCombo(0);
    setActiveColor('CYAN');
    setNotesHit(0);
    setGameState('PLAYING');
    setStatusText('Rhythm arena restarted! Switch colors in sync with beat pulses.');
    pulses.current = [
      { y: -30, color: 'CYAN', speed: 2.8 },
      { y: -110, color: 'MAGENTA', speed: 2.8 },
      { y: -190, color: 'YELLOW', speed: 2.8 },
      { y: -270, color: 'CYAN', speed: 2.8 }
    ];
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const setColor = (c: RhythmColor) => {
    activeColorRef.current = c;
    setActiveColor(c);
  };

  const strikePulse = () => {
    if (gameState !== 'PLAYING') return;
    const hitLineY = 220;
    let hit = false;

    for (let i = 0; i < pulses.current.length; i++) {
      const p = pulses.current[i];
      const dist = Math.abs(p.y - hitLineY);

      if (dist < 28) {
        hit = true;
        if (p.color === activeColorRef.current) {
          comboRef.current += 1;
          setCombo(comboRef.current);
          const points = dist < 12 ? 100 : 50;
          const totalBonus = points + comboRef.current * 10;
          const nextScore = scoreRef.current + totalBonus;
          updateScore(nextScore);
          setNotesHit(n => {
            const nextN = n + 1;
            if (nextN >= 20) {
              setGameState('SONG_COMPLETE');
              setStatusText(`🏆 PERFECT FULL COMBO! Song Mastered! Final Score: ${nextScore}`);
              onGameOver?.(nextScore);
            }
            return nextN;
          });
          setStatusText(dist < 12 ? `✨ PERFECT! +${totalBonus} PTS (Combo ${comboRef.current}x)` : `🎵 GREAT! +${totalBonus} PTS`);
        } else {
          comboRef.current = 0;
          setCombo(0);
          setStatusText(`❌ COLOR MISMATCH! Pulse was ${p.color}, your gate was ${activeColorRef.current}. Combo broken!`);
        }
        // Respawn pulse
        p.y = -60 - Math.random() * 80;
        const colors: RhythmColor[] = ['CYAN', 'MAGENTA', 'YELLOW'];
        p.color = colors[Math.floor(Math.random() * colors.length)];
        break;
      }
    }

    if (!hit) {
      comboRef.current = 0;
      setCombo(0);
      setStatusText('⚠️ Early strike into empty air! Combo reset.');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const hitLineY = 220;

    const render = () => {
      if (!running) return;

      // Update Pulses
      pulses.current.forEach(p => {
        p.y += p.speed;
        if (p.y > 270) {
          // Missed pulse
          p.y = -40 - Math.random() * 60;
          const colors: RhythmColor[] = ['CYAN', 'MAGENTA', 'YELLOW'];
          p.color = colors[Math.floor(Math.random() * colors.length)];
          comboRef.current = 0;
          setCombo(0);
        }
      });

      // Draw Dark Synthwave Highway
      ctx.fillStyle = '#070a13';
      ctx.fillRect(0, 0, 400, 260);

      // Highway Lane Track
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(100, 0, 200, 260);

      // Lane Guide Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(100, 0); ctx.lineTo(100, 260); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(300, 260); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(200, 0); ctx.lineTo(200, 260); ctx.stroke();

      // Hit Target Line (Glows in active color)
      const colorMap = {
        CYAN: '#00F0FF',
        MAGENTA: '#f43f5e',
        YELLOW: '#eab308'
      };
      ctx.strokeStyle = colorMap[activeColorRef.current];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(90, hitLineY); ctx.lineTo(310, hitLineY);
      ctx.stroke();

      // Draw Descending Pulses
      pulses.current.forEach(p => {
        ctx.fillStyle = colorMap[p.color];
        ctx.fillRect(140, p.y - 8, 120, 16);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(140, p.y - 8, 120, 16);
      });

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
          <span>Rhythm Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Combo</span>
          <span className={styles.scoreValue} style={{ color: '#00F0FF' }}>{combo}X 🔥</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Gate Color</span>
          <span className={styles.scoreValue} style={{ color: activeColor === 'CYAN' ? '#00F0FF' : activeColor === 'MAGENTA' ? '#f43f5e' : '#eab308' }}>
            {activeColor}
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Notes Hit</span>
          <span className={styles.scoreValue}>{notesHit} / 20</span>
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
          className={styles.touchBtn}
          id="btn-rhythm-color-cyan"
          style={{ background: activeColor === 'CYAN' ? '#0284c7' : '#0f172a' }}
          onClick={() => setColor('CYAN')}
        >
          🔵 Cyan
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rhythm-color-magenta"
          style={{ background: activeColor === 'MAGENTA' ? '#be123c' : '#0f172a' }}
          onClick={() => setColor('MAGENTA')}
        >
          🟣 Magenta
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-rhythm-color-yellow"
          style={{ background: activeColor === 'YELLOW' ? '#a16207' : '#0f172a' }}
          onClick={() => setColor('YELLOW')}
        >
          🟡 Yellow
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-rhythm-pulse-strike"
          onClick={strikePulse}
          disabled={gameState !== 'PLAYING'}
        >
          ⚡ STRIKE BEAT
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-rhythm-restart"
          onClick={restart}
        >
          Restart Rhythm Track
        </button>
      </div>
    </div>
  );
});

ColorRhythmArena.displayName = 'ColorRhythmArena';
