import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './TicTacToePro.module.css';

export interface DotsAndBoxesRef {
  restart: () => void;
  getScore: () => number;
}

interface DotsAndBoxesProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

// 3x3 dots creates a 2x2 grid of boxes
// Horizontal edges: 3 rows of 2 edges (total 6)
// Vertical edges: 2 rows of 3 edges (total 6)
export const DotsAndBoxes = forwardRef<DotsAndBoxesRef, DotsAndBoxesProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [score, setScore] = useState<number>(initialScore);
  const [playerBoxes, setPlayerBoxes] = useState<number>(0);
  const [aiBoxes, setAiBoxes] = useState<number>(0);
  const [turn, setTurn] = useState<'PLAYER' | 'AI'>('PLAYER');

  // Edge states: null (unclaimed), 'PLAYER', 'AI'
  const [hEdges, setHEdges] = useState<(string | null)[][]>([
    [null, null],
    [null, null],
    [null, null]
  ]);
  const [vEdges, setVEdges] = useState<(string | null)[][]>([
    [null, null, null],
    [null, null, null]
  ]);

  // Box owners: null, 'PLAYER', 'AI' (2x2)
  const [boxes, setBoxes] = useState<(string | null)[][]>([
    [null, null],
    [null, null]
  ]);

  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  const checkCompletedBoxes = (
    h: (string | null)[][],
    v: (string | null)[][],
    b: (string | null)[][],
    claimer: 'PLAYER' | 'AI'
  ): { newBoxesFound: boolean; updatedBoxes: (string | null)[][] } => {
    let found = false;
    const nextB = b.map(row => [...row]);

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        if (nextB[r][c] === null) {
          const top = h[r][c] !== null;
          const bottom = h[r + 1][c] !== null;
          const left = v[r][c] !== null;
          const right = v[r][c + 1] !== null;

          if (top && bottom && left && right) {
            nextB[r][c] = claimer;
            found = true;
          }
        }
      }
    }
    return { newBoxesFound: found, updatedBoxes: nextB };
  };

  const claimEdge = useCallback((type: 'H' | 'V', r: number, c: number) => {
    if (gameOver || turn !== 'PLAYER') return;

    if (type === 'H' && hEdges[r][c] !== null) return;
    if (type === 'V' && vEdges[r][c] !== null) return;

    const nextH = hEdges.map(row => [...row]);
    const nextV = vEdges.map(row => [...row]);

    if (type === 'H') nextH[r][c] = 'PLAYER';
    if (type === 'V') nextV[r][c] = 'PLAYER';

    setHEdges(nextH);
    setVEdges(nextV);

    const check = checkCompletedBoxes(nextH, nextV, boxes, 'PLAYER');
    if (check.newBoxesFound) {
      setBoxes(check.updatedBoxes);
      const pCount = check.updatedBoxes.flat().filter(x => x === 'PLAYER').length;
      setPlayerBoxes(pCount);
      const newScore = pCount * 100;
      setScore(newScore);
      if (onScoreUpdate) onScoreUpdate(newScore);

      // Check game over
      const totalClaimed = check.updatedBoxes.flat().filter(Boolean).length;
      if (totalClaimed === 4) {
        setGameOver(true);
        setWinner('PLAYER');
        if (onGameOver) onGameOver(newScore + 100);
        return;
      }
      // Bonus turn for player!
      return;
    }

    // AI Turn
    setTurn('AI');
    setTimeout(() => {
      // Find available edge for AI
      const availableEdges: Array<{ type: 'H' | 'V'; r: number; c: number }> = [];
      for (let hr = 0; hr < 3; hr++) {
        for (let hc = 0; hc < 2; hc++) {
          if (nextH[hr][hc] === null) availableEdges.push({ type: 'H', r: hr, c: hc });
        }
      }
      for (let vr = 0; vr < 2; vr++) {
        for (let vc = 0; vc < 3; vc++) {
          if (nextV[vr][vc] === null) availableEdges.push({ type: 'V', r: vr, c: vc });
        }
      }

      if (availableEdges.length > 0) {
        const picked = availableEdges[Math.floor(Math.random() * availableEdges.length)];
        if (picked.type === 'H') nextH[picked.r][picked.c] = 'AI';
        if (picked.type === 'V') nextV[picked.r][picked.c] = 'AI';
        setHEdges([...nextH]);
        setVEdges([...nextV]);

        const aiCheck = checkCompletedBoxes(nextH, nextV, check.updatedBoxes, 'AI');
        if (aiCheck.newBoxesFound) {
          setBoxes(aiCheck.updatedBoxes);
          const aiCount = aiCheck.updatedBoxes.flat().filter(x => x === 'AI').length;
          setAiBoxes(aiCount);

          const totalClaimed = aiCheck.updatedBoxes.flat().filter(Boolean).length;
          if (totalClaimed === 4) {
            setGameOver(true);
            setWinner(playerBoxes > aiCount ? 'PLAYER' : 'AI');
            if (onGameOver) onGameOver(playerBoxes * 100);
            return;
          }
        }
      }
      setTurn('PLAYER');
    }, 400);
  }, [boxes, gameOver, hEdges, onGameOver, onScoreUpdate, playerBoxes, turn, vEdges]);

  const restart = useCallback(() => {
    setHEdges([[null, null], [null, null], [null, null]]);
    setVEdges([[null, null, null], [null, null, null]]);
    setBoxes([[null, null], [null, null]]);
    setPlayerBoxes(0);
    setAiBoxes(0);
    setScore(0);
    setTurn('PLAYER');
    setGameOver(false);
    setWinner(null);
    if (onScoreUpdate) onScoreUpdate(0);
    if (onRestart) onRestart();
  }, [onRestart, onScoreUpdate]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => score
  }));

  return (
    <div className={styles.container} id="game-dots-and-boxes">
      <div className={styles.scoreboard} id="dots-and-boxes-scoreboard">
        <div className={styles.scoreItem}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value} id="score-dots-pts">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>YOUR BOXES</span>
          <span className={styles.value} id="score-dots-player">{playerBoxes} 🟦</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>AI BOXES</span>
          <span className={styles.value} id="score-dots-ai">{aiBoxes} 🟥</span>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94A3B8', margin: '6px 0' }}>
        Tap lines between dots. Completing the 4th wall claims the box + bonus turn!
      </p>

      {/* Dots and Edges Board */}
      <div
        id="grid-dots-board"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '280px',
          margin: '16px auto',
          padding: '16px',
          background: '#0B132B',
          borderRadius: '10px'
        }}
      >
        {/* Row 0 Horizontal Edges & Dots */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
          <button
            type="button"
            id="edge-h-0-0"
            onClick={() => claimEdge('H', 0, 0)}
            style={{
              width: '80px',
              height: '8px',
              background: hEdges[0][0] === 'PLAYER' ? '#00F0FF' : hEdges[0][0] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
          <button
            type="button"
            id="edge-h-0-1"
            onClick={() => claimEdge('H', 0, 1)}
            style={{
              width: '80px',
              height: '8px',
              background: hEdges[0][1] === 'PLAYER' ? '#00F0FF' : hEdges[0][1] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
        </div>

        {/* Row 0 Vertical Edges & Box Centers */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            id="edge-v-0-0"
            onClick={() => claimEdge('V', 0, 0)}
            style={{
              width: '8px',
              height: '80px',
              background: vEdges[0][0] === 'PLAYER' ? '#00F0FF' : vEdges[0][0] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '84px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            {boxes[0][0] === 'PLAYER' ? '🟦' : boxes[0][0] === 'AI' ? '🟥' : ''}
          </div>
          <button
            type="button"
            id="edge-v-0-1"
            onClick={() => claimEdge('V', 0, 1)}
            style={{
              width: '8px',
              height: '80px',
              background: vEdges[0][1] === 'PLAYER' ? '#00F0FF' : vEdges[0][1] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '84px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            {boxes[0][1] === 'PLAYER' ? '🟦' : boxes[0][1] === 'AI' ? '🟥' : ''}
          </div>
          <button
            type="button"
            id="edge-v-0-2"
            onClick={() => claimEdge('V', 0, 2)}
            style={{
              width: '8px',
              height: '80px',
              background: vEdges[0][2] === 'PLAYER' ? '#00F0FF' : vEdges[0][2] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Row 1 Horizontal Edges & Dots */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
          <button
            type="button"
            id="edge-h-1-0"
            onClick={() => claimEdge('H', 1, 0)}
            style={{
              width: '80px',
              height: '8px',
              background: hEdges[1][0] === 'PLAYER' ? '#00F0FF' : hEdges[1][0] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
          <button
            type="button"
            id="edge-h-1-1"
            onClick={() => claimEdge('H', 1, 1)}
            style={{
              width: '80px',
              height: '8px',
              background: hEdges[1][1] === 'PLAYER' ? '#00F0FF' : hEdges[1][1] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
        </div>

        {/* Row 1 Vertical Edges & Box Centers */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            id="edge-v-1-0"
            onClick={() => claimEdge('V', 1, 0)}
            style={{
              width: '8px',
              height: '80px',
              background: vEdges[1][0] === 'PLAYER' ? '#00F0FF' : vEdges[1][0] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '84px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            {boxes[1][0] === 'PLAYER' ? '🟦' : boxes[1][0] === 'AI' ? '🟥' : ''}
          </div>
          <button
            type="button"
            id="edge-v-1-1"
            onClick={() => claimEdge('V', 1, 1)}
            style={{
              width: '8px',
              height: '80px',
              background: vEdges[1][1] === 'PLAYER' ? '#00F0FF' : vEdges[1][1] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '84px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            {boxes[1][1] === 'PLAYER' ? '🟦' : boxes[1][1] === 'AI' ? '🟥' : ''}
          </div>
          <button
            type="button"
            id="edge-v-1-2"
            onClick={() => claimEdge('V', 1, 2)}
            style={{
              width: '8px',
              height: '80px',
              background: vEdges[1][2] === 'PLAYER' ? '#00F0FF' : vEdges[1][2] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Row 2 Horizontal Edges & Dots */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
          <button
            type="button"
            id="edge-h-2-0"
            onClick={() => claimEdge('H', 2, 0)}
            style={{
              width: '80px',
              height: '8px',
              background: hEdges[2][0] === 'PLAYER' ? '#00F0FF' : hEdges[2][0] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
          <button
            type="button"
            id="edge-h-2-1"
            onClick={() => claimEdge('H', 2, 1)}
            style={{
              width: '80px',
              height: '8px',
              background: hEdges[2][1] === 'PLAYER' ? '#00F0FF' : hEdges[2][1] === 'AI' ? '#EF4444' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F8FAFC' }} />
        </div>
      </div>

      {gameOver && (
        <div className={styles.overlay} id="dots-and-boxes-gameover">
          <h3 className={styles.overlayTitle}>
            {winner === 'PLAYER' ? 'VICTORY — MOST BOXES CLAIMED!' : 'MATCH CONCLUDED'}
          </h3>
          <p className={styles.overlayText}>
            Boxes: Player {playerBoxes} vs AI {aiBoxes} | Final Score: {score} PTS
          </p>
          <button
            type="button"
            className={styles.restartBtn}
            id="btn-dots-restart"
            onClick={restart}
          >
            Play Next Grid Match
          </button>
        </div>
      )}
    </div>
  );
});

DotsAndBoxes.displayName = 'DotsAndBoxes';
