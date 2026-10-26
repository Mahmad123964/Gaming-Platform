import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface IslandSurvivalBuilderRef {
  restart: () => void;
  getScore: () => number;
}

interface IslandSurvivalBuilderProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const IslandSurvivalBuilder = forwardRef<IslandSurvivalBuilderRef, IslandSurvivalBuilderProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [wood, setWood] = useState<number>(10);
  const [food, setFood] = useState<number>(100);
  const [water, setWater] = useState<number>(100);
  const [day, setDay] = useState<number>(1);
  const [shelterLevel, setShelterLevel] = useState<number>(0);
  const [signalFireLit, setSignalFireLit] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Tropical Island Castaway: Gather resources, construct shelter, light signal fire!');
  const [gameState, setGameState] = useState<'SURVIVING' | 'RESCUED' | 'PERISHED'>('SURVIVING');

  const scoreRef = useRef<number>(initialScore);
  const woodRef = useRef<number>(10);
  const foodRef = useRef<number>(100);
  const waterRef = useRef<number>(100);
  const shelterRef = useRef<number>(0);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    woodRef.current = 10;
    foodRef.current = 100;
    waterRef.current = 100;
    shelterRef.current = 0;
    setScore(0);
    setWood(10);
    setFood(100);
    setWater(100);
    setDay(1);
    setShelterLevel(0);
    setSignalFireLit(false);
    setGameState('SURVIVING');
    setStatusText('Island expedition restarted! Forage timber and fresh spring water.');
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const chopWood = () => {
    if (gameState !== 'SURVIVING') return;
    woodRef.current += 15;
    setWood(woodRef.current);
    foodRef.current = Math.max(0, foodRef.current - 5);
    waterRef.current = Math.max(0, waterRef.current - 8);
    setFood(foodRef.current);
    setWater(waterRef.current);
    const bonus = 30;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('🪓 Chopped palm driftwood (+15 Timber, -5 Food, -8 Water).');
    checkVitals();
  };

  const gatherFood = () => {
    if (gameState !== 'SURVIVING') return;
    foodRef.current = Math.min(100, foodRef.current + 25);
    waterRef.current = Math.max(0, waterRef.current - 5);
    setFood(foodRef.current);
    setWater(waterRef.current);
    const bonus = 25;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('🥥 Harvested fresh ripe coconuts (+25 Food).');
    checkVitals();
  };

  const fetchWater = () => {
    if (gameState !== 'SURVIVING') return;
    waterRef.current = Math.min(100, waterRef.current + 30);
    setWater(waterRef.current);
    const bonus = 25;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('💧 Collected freshwater from jungle waterfall (+30 Water).');
    checkVitals();
  };

  const buildShelter = () => {
    if (gameState !== 'SURVIVING' || woodRef.current < 25) return;
    woodRef.current -= 25;
    setWood(woodRef.current);
    shelterRef.current += 1;
    setShelterLevel(shelterRef.current);
    const bonus = 150;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);

    if (shelterRef.current >= 3 && !signalFireLit) {
      setSignalFireLit(true);
      setGameState('RESCUED');
      setStatusText(`🔥 SIGNAL FIRE LIT! Rescue plane spotted the smoke plume! Victory Score: ${nextScore + 300}`);
      onGameOver?.(nextScore + 300);
    } else {
      setStatusText(`🏕️ Shelter upgraded to Tier ${shelterRef.current}/3 (+150 PTS)!`);
    }
    checkVitals();
  };

  const checkVitals = () => {
    if (foodRef.current <= 0 || waterRef.current <= 0) {
      setGameState('PERISHED');
      setStatusText(`💀 DEHYDRATION! Succumbed to the tropical elements. Final Score: ${scoreRef.current}`);
      onGameOver?.(scoreRef.current);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      // Deep Azure Ocean
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 400, 260);

      // Sandy Island Atoll (Golden Sand ellipse)
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(200, 160, 160, 80, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jungle center (Lush green foliage)
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(200, 150, 90, 45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Palm trees
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(140, 110, 6, 25);
      ctx.fillRect(250, 120, 6, 25);
      // Palm fronds
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.arc(143, 110, 15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(253, 120, 15, 0, Math.PI * 2); ctx.fill();

      // Shelter structure at center
      if (shelterRef.current > 0) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(185, 140, 30, 20); // Hut walls
        ctx.fillStyle = '#ca8a04';
        // Thatch roof
        ctx.beginPath();
        ctx.moveTo(180, 140); ctx.lineTo(200, 122); ctx.lineTo(220, 140);
        ctx.closePath();
        ctx.fill();
      }

      // Signal Fire on beach
      if (signalFireLit) {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(290, 165, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(290, 162, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [signalFireLit]);

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Survival Score</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Timber</span>
          <span className={styles.scoreValue}>{wood} Logs</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Hydration</span>
          <span className={styles.scoreValue} style={{ color: water < 25 ? '#ef4444' : '#38bdf8' }}>{water}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Shelter</span>
          <span className={styles.scoreValue}>T{shelterLevel} / 3</span>
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
          id="btn-island-chop-wood"
          onClick={chopWood}
          disabled={gameState !== 'SURVIVING'}
        >
          🪓 Chop Timber
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-island-gather-food"
          onClick={gatherFood}
          disabled={gameState !== 'SURVIVING'}
        >
          🥥 Forage Food
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-island-fetch-water"
          onClick={fetchWater}
          disabled={gameState !== 'SURVIVING'}
        >
          💧 Fetch Water
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-island-build-shelter"
          onClick={buildShelter}
          disabled={wood < 25 || gameState !== 'SURVIVING'}
        >
          🏕️ Build Shelter (25W)
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-island-restart"
          onClick={restart}
        >
          Restart Island Survival
        </button>
      </div>
    </div>
  );
});

IslandSurvivalBuilder.displayName = 'IslandSurvivalBuilder';
