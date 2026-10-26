import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface BusinessTycoonMiniRef {
  restart: () => void;
  getScore: () => number;
}

interface BusinessTycoonMiniProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

export const BusinessTycoonMini = forwardRef<BusinessTycoonMiniRef, BusinessTycoonMiniProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [cash, setCash] = useState<number>(1000);
  const [inventory, setInventory] = useState<number>(20);
  const [unitPrice, setUnitPrice] = useState<number>(30);
  const [marketShare, setMarketShare] = useState<number>(15);
  const [quarter, setQuarter] = useState<number>(1);
  const [statusText, setStatusText] = useState<string>('Corporate Conglomerate: Manage manufacturing output, pricing, and advertising!');
  const [gameState, setGameState] = useState<'OPERATING' | 'BANKRUPT' | 'IPO_SUCCESS'>('OPERATING');

  const scoreRef = useRef<number>(initialScore);
  const cashRef = useRef<number>(1000);
  const invRef = useRef<number>(20);
  const priceRef = useRef<number>(30);
  const shareRef = useRef<number>(15);
  const animRef = useRef<number | null>(null);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    cashRef.current = 1000;
    invRef.current = 20;
    priceRef.current = 30;
    shareRef.current = 15;
    setScore(0);
    setCash(1000);
    setInventory(20);
    setUnitPrice(30);
    setMarketShare(15);
    setQuarter(1);
    setGameState('OPERATING');
    setStatusText('Business operations restarted! Optimize profit margins.');
    onRestart?.();
  }, [onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const produceGoods = () => {
    if (gameState !== 'OPERATING' || cashRef.current < 200) return;
    cashRef.current -= 200; // Raw materials cost
    invRef.current += 25;
    setCash(cashRef.current);
    setInventory(invRef.current);
    setStatusText('🏭 Production batch complete: +25 Units manufactured (-$200 cost).');
  };

  const increasePrice = () => {
    if (gameState !== 'OPERATING') return;
    priceRef.current = Math.min(80, priceRef.current + 5);
    setUnitPrice(priceRef.current);
    setStatusText(`Pricing increased to $${priceRef.current} per unit.`);
  };

  const decreasePrice = () => {
    if (gameState !== 'OPERATING') return;
    priceRef.current = Math.max(10, priceRef.current - 5);
    setUnitPrice(priceRef.current);
    setStatusText(`Pricing discounted to $${priceRef.current} per unit.`);
  };

  const launchMarketing = () => {
    if (gameState !== 'OPERATING' || cashRef.current < 150) return;
    cashRef.current -= 150;
    shareRef.current = Math.min(100, shareRef.current + 12);
    setCash(cashRef.current);
    setMarketShare(shareRef.current);
    const bonus = 100;
    const nextScore = scoreRef.current + bonus;
    updateScore(nextScore);
    setStatusText('📢 Viral advertising campaign launched! Brand market share expanded (+12%).');
  };

  // Quarterly sales cycle
  useEffect(() => {
    if (gameState !== 'OPERATING') return;
    const interval = setInterval(() => {
      // Calculate consumer demand based on price and market share
      const demand = Math.round((100 - priceRef.current) * (shareRef.current / 40));
      const unitsSold = Math.min(invRef.current, Math.max(0, demand));
      const revenue = unitsSold * priceRef.current;
      const overhead = 120; // Fixed quarterly operating expenses
      const netQuarterProfit = revenue - overhead;

      invRef.current -= unitsSold;
      cashRef.current += netQuarterProfit;
      setInventory(invRef.current);
      setCash(cashRef.current);

      const quarterBonus = Math.max(0, netQuarterProfit * 2);
      const nextScore = scoreRef.current + quarterBonus;
      updateScore(nextScore);

      setQuarter(q => {
        const nextQ = q + 1;
        setStatusText(`📊 Quarter ${q} Results: Sold ${unitsSold} units. Net Profit: +$${netQuarterProfit} (Overhead -$${overhead})`);
        if (cashRef.current <= 0) {
          setGameState('BANKRUPT');
          setStatusText(`💥 CHAPTER 11 BANKRUPTCY! Cash reserves depleted. Final Valuation Score: ${scoreRef.current}`);
          onGameOver?.(scoreRef.current);
        } else if (cashRef.current >= 4000) {
          setGameState('IPO_SUCCESS');
          setStatusText(`🏆 WALL STREET IPO SUCCESS! Corporate valuation reached $4,000! Final Score: ${nextScore + 1000}`);
          onGameOver?.(nextScore + 1000);
        }
        return nextQ;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [gameState, onGameOver, updateScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;

      // Executive Corporate Boardroom Theme
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // Financial stock chart grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let y = 30; y <= 230; y += 40) {
        ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(360, y); ctx.stroke();
      }

      // Cash Bar Chart
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(60, 230 - Math.min(180, (cashRef.current / 4000) * 180), 40, Math.min(180, (cashRef.current / 4000) * 180));
      // Inventory Bar Chart
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(160, 230 - Math.min(180, (invRef.current / 80) * 180), 40, Math.min(180, (invRef.current / 80) * 180));
      // Market Share Bar Chart
      ctx.fillStyle = '#10b981';
      ctx.fillRect(260, 230 - Math.min(180, (shareRef.current / 100) * 180), 40, Math.min(180, (shareRef.current / 100) * 180));

      // Axis labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cash ($)', 80, 245);
      ctx.fillText('Inventory', 180, 245);
      ctx.fillText('Market %', 280, 245);

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
          <span>Valuation</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Cash</span>
          <span className={styles.scoreValue} style={{ color: cash < 200 ? '#ef4444' : '#10b981' }}>${cash}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Stock</span>
          <span className={styles.scoreValue}>{inventory} Units</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Unit Price</span>
          <span className={styles.scoreValue}>${unitPrice}</span>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={260} className={styles.gameCanvas} />
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center', minHeight: '36px' }}>
        {statusText}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-tycoon-produce"
          onClick={produceGoods}
          disabled={cash < 200 || gameState !== 'OPERATING'}
        >
          🏭 Produce ($200)
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tycoon-price-up"
          onClick={increasePrice}
          disabled={gameState !== 'OPERATING'}
        >
          📈 Price +$5
        </button>
        <button
          type="button"
          className={styles.touchBtn}
          id="btn-tycoon-price-down"
          onClick={decreasePrice}
          disabled={gameState !== 'OPERATING'}
        >
          📉 Price -$5
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-tycoon-marketing"
          onClick={launchMarketing}
          disabled={cash < 150 || gameState !== 'OPERATING'}
        >
          📢 Ads ($150)
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-tycoon-restart"
          onClick={restart}
        >
          Restart Tycoon Simulation
        </button>
      </div>
    </div>
  );
});

BusinessTycoonMini.displayName = 'BusinessTycoonMini';
