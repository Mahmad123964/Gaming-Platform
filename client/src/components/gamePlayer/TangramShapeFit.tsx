import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './SlidePuzzle15.module.css';

export interface TangramShapeFitRef {
  restart: () => void;
  getScore: () => number;
}

interface TangramShapeFitProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface TanPiece {
  id: number;
  name: string;
  shape: 'TRIANGLE_L' | 'TRIANGLE_S' | 'SQUARE' | 'RHOMBUS';
  rotation: number; // 0, 90, 180, 270
  placedSlot: number | null; // 0, 1, 2, 3 or null
}

const INITIAL_PIECES: TanPiece[] = [
  { id: 0, name: 'Large Triangle', shape: 'TRIANGLE_L', rotation: 0, placedSlot: null },
  { id: 1, name: 'Small Triangle', shape: 'TRIANGLE_S', rotation: 0, placedSlot: null },
  { id: 2, name: 'Cyan Square', shape: 'SQUARE', rotation: 0, placedSlot: null },
  { id: 3, name: 'Amber Rhombus', shape: 'RHOMBUS', rotation: 0, placedSlot: null }
];

// Target slots where each piece belongs (slot 0 needs piece 0, slot 1 needs piece 1, etc.)
const SLOTS = [
  { id: 0, label: 'Apex Peak', expectedId: 0 },
  { id: 1, label: 'Wing Flank', expectedId: 1 },
  { id: 2, label: 'Core Base', expectedId: 2 },
  { id: 3, label: 'Tail Anchor', expectedId: 3 }
];

export const TangramShapeFit = forwardRef<TangramShapeFitRef, TangramShapeFitProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [pieces, setPieces] = useState<TanPiece[]>(INITIAL_PIECES);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(0);
  const [moves, setMoves] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);

  const rotateSelected = useCallback(() => {
    if (selectedPieceId === null || gameOver) return;
    setPieces(prev =>
      prev.map(p => (p.id === selectedPieceId ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  }, [gameOver, selectedPieceId]);

  const placeInSlot = useCallback((slotId: number) => {
    if (selectedPieceId === null || gameOver) return;

    setPieces(prev => {
      // Free any piece currently in this slot
      const updated = prev.map(p => {
        if (p.placedSlot === slotId) return { ...p, placedSlot: null };
        if (p.id === selectedPieceId) return { ...p, placedSlot: slotId };
        return p;
      });

      // Check all slots correctly filled
      const allCorrect = SLOTS.every(s => {
        const pieceInSlot = updated.find(p => p.placedSlot === s.id);
        return pieceInSlot && pieceInSlot.id === s.expectedId;
      });

      setMoves(m => {
        const nextMoves = m + 1;
        if (allCorrect) {
          setGameOver(true);
          setVictory(true);
          const winScore = Math.max(100, 300 - nextMoves * 15);
          setScore(winScore);
          if (onScoreUpdate) onScoreUpdate(winScore);
          if (onGameOver) onGameOver(winScore);
        }
        return nextMoves;
      });

      return updated;
    });
  }, [gameOver, onGameOver, onScoreUpdate, selectedPieceId]);

  const restart = useCallback(() => {
    setPieces(INITIAL_PIECES);
    setSelectedPieceId(0);
    setMoves(0);
    setScore(0);
    setGameOver(false);
    setVictory(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  const selectedPiece = pieces.find(p => p.id === selectedPieceId);

  return (
    <div className={styles.container} id="game-tangram-shape-fit">
      <div className={styles.scoreboard} id="tangram-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-tangram-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>MOVES</span>
          <span className={styles.value} id="score-tangram-moves">{moves}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>SELECTED</span>
          <span className={styles.value} id="score-tangram-selected">{selectedPiece?.name || 'NONE'}</span>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94A3B8', margin: '6px 0' }}>
        Select a geometric tan from the tray, rotate it, and place it into matching silhouette slot!
      </p>

      {/* Target Silhouette Slots */}
      <div
        id="tangram-silhouette-slots"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          maxWidth: '300px',
          margin: '12px auto',
          padding: '14px',
          background: '#0B132B',
          borderRadius: '8px'
        }}
      >
        {SLOTS.map(slot => {
          const placed = pieces.find(p => p.placedSlot === slot.id);
          const isCorrect = placed && placed.id === slot.expectedId;

          return (
            <button
              key={`slot-${slot.id}`}
              id={`btn-tangram-slot-${slot.id}`}
              type="button"
              onClick={() => placeInSlot(slot.id)}
              style={{
                height: '75px',
                borderRadius: '6px',
                border: isCorrect ? '2px solid #10B981' : '1px dashed #38BDF8',
                background: placed ? '#1E293B' : 'rgba(56, 189, 248, 0.08)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{slot.label}</span>
              <strong style={{ color: isCorrect ? '#10B981' : '#38BDF8' }}>
                {placed ? `${placed.name} (✓)` : 'Tap to Place'}
              </strong>
            </button>
          );
        })}
      </div>

      {/* Piece Tray Inventory & Rotate Action */}
      <div
        id="tangram-piece-tray"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          maxWidth: '340px',
          margin: '10px auto',
          flexWrap: 'wrap'
        }}
      >
        {pieces.map(p => (
          <button
            key={`piece-${p.id}`}
            id={`btn-tangram-piece-${p.id}`}
            type="button"
            onClick={() => setSelectedPieceId(p.id)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: selectedPieceId === p.id ? '2px solid #00F0FF' : '1px solid #334155',
              background: p.placedSlot !== null ? '#0F172A' : '#1E293B',
              color: selectedPieceId === p.id ? '#00F0FF' : '#E2E8F0',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {p.name} {p.placedSlot !== null ? '📦' : ''}
          </button>
        ))}

        <button
          type="button"
          id="btn-tangram-rotate"
          onClick={rotateSelected}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            background: 'linear-gradient(135deg, #00F0FF 0%, #0284C7 100%)',
            color: '#0F172A',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            marginLeft: '4px'
          }}
        >
          ↺ Rotate ({selectedPiece?.rotation || 0}°)
        </button>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="tangram-gameover">
          <h3 className={styles.overlayTitle}>
            {victory ? 'TANGRAM SILHOUETTE SOLVED!' : 'COMPLETED'}
          </h3>
          <p className={styles.overlayText}>
            Moves: {moves} | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-tangram-restart"
            onClick={restart}
          >
            Solve Next Tangram
          </button>
        </div>
      )}
    </div>
  );
});

TangramShapeFit.displayName = 'TangramShapeFit';
