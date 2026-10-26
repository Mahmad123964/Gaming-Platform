import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface MiniCityBuilderRef {
  restart: () => void;
  getScore: () => number;
}

interface MiniCityBuilderProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type ZoneType = 'EMPTY' | 'RES' | 'COM' | 'IND' | 'PARK';

interface Plot {
  id: number;
  r: number;
  c: number;
  zone: ZoneType;
  level: number;
}

export const MiniCityBuilder = forwardRef<MiniCityBuilderRef, MiniCityBuilderProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [plots, setPlots] = useState<Plot[]>(
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      r: Math.floor(i / 4),
      c: i % 4,
      zone: i === 0 ? 'RES' : i === 5 ? 'PARK' : 'EMPTY',
      level: 1
    }))
  );

  const [funds, setFunds] = useState<number>(500);
  const [population, setPopulation] = useState<number>(120);
  const [selectedTool, setSelectedTool] = useState<ZoneType>('RES');
  const [score, setScore] = useState<number>(initialScore);
  const [status, setStatus] = useState<string>('Select a zoning tool and click plots to develop your metropolis!');

  const scoreRef = useRef<number>(initialScore);

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setFunds(500);
    setPopulation(120);
    setSelectedTool('RES');
    setStatus('Select a zoning tool and click plots to develop your metropolis!');
    setPlots(
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        r: Math.floor(i / 4),
        c: i % 4,
        zone: i === 0 ? 'RES' : i === 5 ? 'PARK' : 'EMPTY',
        level: 1
      }))
    );
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const buildZone = useCallback((plotId: number) => {
    const costMap: Record<ZoneType, number> = {
      EMPTY: 0,
      RES: 100,
      COM: 150,
      IND: 200,
      PARK: 75
    };

    const cost = costMap[selectedTool];
    if (funds < cost) {
      setStatus(`Insufficient municipal funds! Requires $${cost}. Collect taxes first.`);
      return;
    }

    setPlots(prev => {
      const target = prev.find(p => p.id === plotId);
      if (!target) return prev;

      if (target.zone === selectedTool) {
        // Upgrade existing plot
        setFunds(f => f - cost);
        updateScore(scoreRef.current + 50);
        setStatus(`Upgraded ${selectedTool} zone to Level ${target.level + 1}!`);
        return prev.map(p => p.id === plotId ? { ...p, level: p.level + 1 } : p);
      }

      setFunds(f => f - cost);
      const points = 100;
      updateScore(scoreRef.current + points);

      if (selectedTool === 'RES') setPopulation(pop => pop + 250);
      setStatus(`Zoned new ${selectedTool} plot! Population and civic revenue expanding.`);

      return prev.map(p => p.id === plotId ? { ...p, zone: selectedTool, level: 1 } : p);
    });
  }, [funds, selectedTool, updateScore]);

  const collectTaxes = useCallback(() => {
    let taxRevenue = 0;
    let popGrowth = 0;

    for (const p of plots) {
      if (p.zone === 'RES') { taxRevenue += 40 * p.level; popGrowth += 50; }
      if (p.zone === 'COM') taxRevenue += 80 * p.level;
      if (p.zone === 'IND') taxRevenue += 120 * p.level;
      if (p.zone === 'PARK') taxRevenue += 10;
    }

    setFunds(f => f + taxRevenue);
    setPopulation(pop => pop + popGrowth);
    updateScore(scoreRef.current + taxRevenue);
    setStatus(`💵 TAX HARVEST! Collected +$${taxRevenue} in municipal revenue. Population +${popGrowth}.`);
  }, [plots, updateScore]);

  const zoneColors: Record<ZoneType, string> = {
    EMPTY: '#1e293b',
    RES: '#3b82f6',
    COM: '#38bdf8',
    IND: '#f59e0b',
    PARK: '#10b981'
  };

  const zoneLabels: Record<ZoneType, string> = {
    EMPTY: 'Empty',
    RES: '🏡 Res',
    COM: '🏢 Com',
    IND: '🏭 Ind',
    PARK: '🌲 Park'
  };

  return (
    <div className={styles.container} id="mini-city-builder-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>City Score</span>
          <span className={styles.scoreValue} id="city-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Treasury</span>
          <span className={styles.scoreValue} style={{ color: '#22c55e' }}>${funds}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Population</span>
          <span className={styles.scoreValue}>{population.toLocaleString()}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Active Tool</span>
          <span className={styles.scoreValue}>{selectedTool}</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 68px)',
          gridTemplateRows: 'repeat(4, 68px)',
          gap: '8px',
          background: '#090d16',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          margin: '8px 0'
        }}
        id="city-grid"
      >
        {plots.map(plot => (
          <div
            key={plot.id}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '8px',
              background: zoneColors[plot.zone],
              border: '2px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease'
            }}
            id={`btn-city-plot-${plot.id}`}
            onClick={() => buildZone(plot.id)}
          >
            <span>{zoneLabels[plot.zone]}</span>
            {plot.zone !== 'EMPTY' && (
              <span style={{ fontSize: '9px', opacity: 0.85 }}>Lvl {plot.level}</span>
            )}
          </div>
        ))}
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${selectedTool === 'RES' ? styles.touchBtnPrimary : ''}`}
          id="btn-city-zone-res"
          onClick={() => setSelectedTool('RES')}
        >
          🏡 Res ($100)
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${selectedTool === 'COM' ? styles.touchBtnPrimary : ''}`}
          id="btn-city-zone-com"
          onClick={() => setSelectedTool('COM')}
        >
          🏢 Com ($150)
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${selectedTool === 'IND' ? styles.touchBtnPrimary : ''}`}
          id="btn-city-zone-ind"
          onClick={() => setSelectedTool('IND')}
        >
          🏭 Ind ($200)
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${selectedTool === 'PARK' ? styles.touchBtnPrimary : ''}`}
          id="btn-city-zone-park"
          onClick={() => setSelectedTool('PARK')}
        >
          🌲 Park ($75)
        </button>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-city-collect"
          onClick={collectTaxes}
        >
          💰 Collect Taxes
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-city-restart"
          onClick={restart}
        >
          Found New City
        </button>
      </div>
    </div>
  );
});

MiniCityBuilder.displayName = 'MiniCityBuilder';
