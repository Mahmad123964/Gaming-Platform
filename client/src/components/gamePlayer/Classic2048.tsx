/**
 * NexusPlay — Classic 2048 Game Engine
 * 
 * Based on 2048 by Gabriele Cirulli (March 2014)
 * Conceptualized by Veewo Studio (1024) and Asher Vollmer (Threes).
 * 
 * LICENSE NOTICE:
 * The MIT License (MIT)
 * Copyright (c) 2014 Gabriele Cirulli
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 */

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './Classic2048.module.css';

export interface Classic2048Ref {
  restart: () => void;
  getScore: () => number;
}

interface Classic2048Props {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number, maxTile: number) => void;
  onRestart?: () => void;
}

type Direction = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';

interface TileData {
  id: number;
  val: number;
  merged?: boolean;
}

type GridState = (TileData | null)[][];

let nextTileId = 1;

export const Classic2048 = forwardRef<Classic2048Ref, Classic2048Props>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [grid, setGrid] = useState<GridState>(() => createEmptyGrid());
  const [score, setScore] = useState<number>(initialScore);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexusplay_2048_best');
      return saved ? parseInt(saved, 10) : 0;
    } catch (_) {
      return 0;
    }
  });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  function createEmptyGrid(): GridState {
    return [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null]
    ];
  }

  // Get all empty coordinates
  const getEmptyCells = useCallback((g: GridState): { r: number; c: number }[] => {
    const cells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!g[r][c]) cells.push({ r, c });
      }
    }
    return cells;
  }, []);

  // Add random tile (90% chance of 2, 10% chance of 4)
  const addRandomTile = useCallback((g: GridState): boolean => {
    const empty = getEmptyCells(g);
    if (empty.length === 0) return false;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    g[r][c] = { id: nextTileId++, val };
    return true;
  }, [getEmptyCells]);

  // Restart game session
  const restart = useCallback(() => {
    const newGrid = createEmptyGrid();
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setKeepPlaying(false);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [addRandomTile, onScoreUpdate, onRestart]);

  // Expose imperative handle for external modal controls
  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }), [restart, score]);

  // Initial mount setup
  useEffect(() => {
    const newGrid = createEmptyGrid();
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
  }, [addRandomTile]);

  // Check if any valid moves remain
  const checkGameOver = useCallback((g: GridState): boolean => {
    // 1. If any empty cell, game is not over
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!g[r][c]) return false;
      }
    }
    // 2. Check horizontal and vertical merges
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = g[r][c]?.val;
        if (c < 3 && g[r][c + 1]?.val === val) return false;
        if (r < 3 && g[r + 1][c]?.val === val) return false;
      }
    }
    return true;
  }, []);

  // Move execution engine
  const move = useCallback((dir: Direction) => {
    if (gameOver && !keepPlaying) return;

    let hasMoved = false;
    let gainedScore = 0;
    const newGrid: GridState = grid.map(row => row.map(tile => tile ? { ...tile, merged: false } : null));

    const slideRow = (row: (TileData | null)[]): { newRow: (TileData | null)[]; scoreDelta: number; moved: boolean } => {
      // 1. Filter non-null
      const tiles = row.filter((t): t is TileData => t !== null);
      const result: (TileData | null)[] = [];
      let scoreDelta = 0;
      let moved = false;

      let i = 0;
      while (i < tiles.length) {
        if (i + 1 < tiles.length && tiles[i].val === tiles[i + 1].val) {
          // Merge
          const newVal = tiles[i].val * 2;
          scoreDelta += newVal;
          result.push({ id: nextTileId++, val: newVal, merged: true });
          moved = true;
          i += 2;
        } else {
          result.push({ id: tiles[i].id, val: tiles[i].val });
          i++;
        }
      }

      while (result.length < 4) {
        result.push(null);
      }

      for (let idx = 0; idx < 4; idx++) {
        if (row[idx]?.val !== result[idx]?.val) {
          moved = true;
        }
      }

      return { newRow: result, scoreDelta, moved };
    };

    if (dir === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const { newRow, scoreDelta, moved } = slideRow(newGrid[r]);
        newGrid[r] = newRow;
        gainedScore += scoreDelta;
        if (moved) hasMoved = true;
      }
    } else if (dir === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const reversed = [...newGrid[r]].reverse();
        const { newRow, scoreDelta, moved } = slideRow(reversed);
        newGrid[r] = newRow.reverse();
        gainedScore += scoreDelta;
        if (moved) hasMoved = true;
      }
    } else if (dir === 'UP') {
      for (let c = 0; c < 4; c++) {
        const col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
        const { newRow, scoreDelta, moved } = slideRow(col);
        for (let r = 0; r < 4; r++) {
          newGrid[r][c] = newRow[r];
        }
        gainedScore += scoreDelta;
        if (moved) hasMoved = true;
      }
    } else if (dir === 'DOWN') {
      for (let c = 0; c < 4; c++) {
        const col = [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]];
        const { newRow, scoreDelta, moved } = slideRow(col);
        for (let r = 0; r < 4; r++) {
          newGrid[3 - r][c] = newRow[r];
        }
        gainedScore += scoreDelta;
        if (moved) hasMoved = true;
      }
    }

    if (hasMoved) {
      addRandomTile(newGrid);
      const nextScore = score + gainedScore;
      setScore(nextScore);
      if (onScoreUpdate) onScoreUpdate(nextScore);

      if (nextScore > bestScore) {
        setBestScore(nextScore);
        try { localStorage.setItem('nexusplay_2048_best', String(nextScore)); } catch (_) {}
      }

      // Check win condition (2048 tile)
      let reached2048 = false;
      let maxVal = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const val = newGrid[r][c]?.val || 0;
          if (val > maxVal) maxVal = val;
          if (val >= 2048) reached2048 = true;
        }
      }

      if (reached2048 && !gameWon && !keepPlaying) {
        setGameWon(true);
      }

      // Check game over
      if (checkGameOver(newGrid)) {
        setGameOver(true);
        if (onGameOver) onGameOver(nextScore, maxVal);
      }

      setGrid(newGrid);
    }
  }, [grid, score, bestScore, gameOver, gameWon, keepPlaying, addRandomTile, checkGameOver, onScoreUpdate, onGameOver]);

  // Keyboard navigation listener (EP04-01, Task 7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          move('UP');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          move('RIGHT');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          move('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          move('LEFT');
          break;
        case 'r':
        case 'R':
          restart();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, restart]);

  // Touch Swipe Gesture Handlers for Mobile (Task 6 & 7)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const dx = touchEnd.x - touchStartRef.current.x;
    const dy = touchEnd.y - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Minimum swipe threshold (24px)
    if (Math.max(absDx, absDy) > 24) {
      if (absDx > absDy) {
        move(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        move(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStartRef.current = null;
  };

  const getTileClass = (val: number) => {
    switch (val) {
      case 2: return styles.tile2;
      case 4: return styles.tile4;
      case 8: return styles.tile8;
      case 16: return styles.tile16;
      case 32: return styles.tile32;
      case 64: return styles.tile64;
      case 128: return styles.tile128;
      case 256: return styles.tile256;
      case 512: return styles.tile512;
      case 1024: return styles.tile1024;
      case 2048: return styles.tile2048;
      default: return styles.tileSuper;
    }
  };

  return (
    <div
      className={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      id="classic-2048-container"
    >
      {/* Header with Title and Counters */}
      <div className={styles.headerBar}>
        <div className={styles.titleArea}>
          <h1 className={styles.gameTitle} id="game-title-2048">2048</h1>
          <div className={styles.gameSubtitle}>Classic Open-Source Puzzle</div>
        </div>

        <div className={styles.scoresArea}>
          <div className={styles.scoreBox} id="score-box-current">
            <div className={styles.scoreLabel}>Score</div>
            <div className={styles.scoreValue} id="val-2048-score">{score}</div>
          </div>
          <div className={styles.scoreBox} id="score-box-best">
            <div className={styles.scoreLabel}>Best</div>
            <div className={styles.scoreValue} id="val-2048-best">{bestScore}</div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className={styles.controlBar}>
        <div className={styles.howToPlay}>
          Use <strong>Arrow Keys</strong> or <strong>Swipe</strong> to merge tiles!
        </div>
        <button
          className={styles.newGameBtn}
          onClick={restart}
          id="btn-new-game-2048"
          title="Restart a new 2048 session"
        >
          New Game
        </button>
      </div>

      {/* 4x4 Grid Board */}
      <div
        className={styles.gridBoard}
        ref={boardRef}
        tabIndex={0}
        aria-label="2048 Board"
        id="board-2048-grid"
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className={styles.gridCell} id={`cell-${r}-${c}`}>
              {cell && (
                <div
                  className={`${styles.tile} ${getTileClass(cell.val)} ${cell.merged ? styles.tileMerged : ''}`}
                  id={`tile-${r}-${c}`}
                  data-value={cell.val}
                >
                  {cell.val}
                </div>
              )}
            </div>
          ))
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className={styles.overlay} id="overlay-game-over">
            <div className={styles.overlayTitle}>Game Over!</div>
            <div className={styles.overlayDesc}>No more valid moves remaining.</div>
            <button className={styles.tryAgainBtn} onClick={restart} id="btn-try-again-2048">
              Try Again
            </button>
          </div>
        )}

        {/* Game Won Overlay */}
        {gameWon && !keepPlaying && (
          <div className={styles.overlay} id="overlay-game-won">
            <div className={styles.overlayTitle}>You Win! 🎉</div>
            <div className={styles.overlayDesc}>You reached the 2048 tile!</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={styles.tryAgainBtn}
                onClick={() => setKeepPlaying(true)}
                id="btn-keep-playing-2048"
                style={{ background: '#10B981', color: '#FFFFFF' }}
              >
                Keep Going
              </button>
              <button className={styles.tryAgainBtn} onClick={restart} id="btn-restart-won-2048">
                New Game
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile & Accessibility D-Pad Controls (Task 6 & 7) */}
      <div className={styles.dpadContainer} id="dpad-2048-controls">
        <button
          className={styles.dpadBtn}
          onClick={() => move('UP')}
          title="Move Up (Arrow Up / W)"
          id="btn-dpad-up"
          aria-label="Move Up"
        >
          ▲
        </button>
        <div className={styles.dpadRow}>
          <button
            className={styles.dpadBtn}
            onClick={() => move('LEFT')}
            title="Move Left (Arrow Left / A)"
            id="btn-dpad-left"
            aria-label="Move Left"
          >
            ◀
          </button>
          <button
            className={styles.dpadBtn}
            onClick={() => move('DOWN')}
            title="Move Down (Arrow Down / S)"
            id="btn-dpad-down"
            aria-label="Move Down"
          >
            ▼
          </button>
          <button
            className={styles.dpadBtn}
            onClick={() => move('RIGHT')}
            title="Move Right (Arrow Right / D)"
            id="btn-dpad-right"
            aria-label="Move Right"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Preservation of License Notices & Attribution (Task 3 & 4) */}
      <div className={styles.attributionBar} id="attribution-notice-2048">
        <strong>2048 Classic</strong> • Created by <strong>Gabriele Cirulli</strong> (2014) under the <strong>MIT License</strong>.
        Conceptually inspired by <em>1024</em> by Veewo Studio and <em>Threes</em> by Asher Vollmer.
        NexusPlay preserves all redistribution and author attribution rights.
      </div>
    </div>
  );
});

Classic2048.displayName = 'Classic2048';
