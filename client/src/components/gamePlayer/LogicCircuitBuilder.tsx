import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface LogicCircuitBuilderRef {
  restart: () => void;
  getScore: () => number;
}

interface LogicCircuitBuilderProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type GateType = 'AND' | 'OR' | 'XOR' | 'NAND';

export const LogicCircuitBuilder = forwardRef<LogicCircuitBuilderRef, LogicCircuitBuilderProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [gate1, setGate1] = useState<GateType>('AND');
  const [gate2, setGate2] = useState<GateType>('OR');
  const [testA, setTestA] = useState<number>(1);
  const [testB, setTestB] = useState<number>(0);
  const [score, setScore] = useState<number>(initialScore);
  const [solved, setSolved] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Configure gates to build a Half-Adder: Out1 = XOR (Sum), Out2 = AND (Carry)');

  const scoreRef = React.useRef<number>(initialScore);

  const evalGate = (type: GateType, a: number, b: number): number => {
    if (type === 'AND') return (a && b) ? 1 : 0;
    if (type === 'OR') return (a || b) ? 1 : 0;
    if (type === 'XOR') return (a ^ b) ? 1 : 0;
    if (type === 'NAND') return !(a && b) ? 1 : 0;
    return 0;
  };

  const updateScore = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    onScoreUpdate?.(newScore);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setGate1('AND');
    setGate2('OR');
    setTestA(1);
    setTestB(0);
    setSolved(false);
    setStatus('Configure gates to build a Half-Adder: Out1 = XOR (Sum), Out2 = AND (Carry)');
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  const cycleGate1 = useCallback(() => {
    const sequence: GateType[] = ['AND', 'OR', 'XOR', 'NAND'];
    setGate1(curr => sequence[(sequence.indexOf(curr) + 1) % sequence.length]);
  }, []);

  const cycleGate2 = useCallback(() => {
    const sequence: GateType[] = ['AND', 'OR', 'XOR', 'NAND'];
    setGate2(curr => sequence[(sequence.indexOf(curr) + 1) % sequence.length]);
  }, []);

  const evaluateCircuit = useCallback(() => {
    // Half adder criteria: Gate1 should be XOR, Gate2 should be AND
    const tests = [
      { a: 0, b: 0, sum: 0, carry: 0 },
      { a: 0, b: 1, sum: 1, carry: 0 },
      { a: 1, b: 0, sum: 1, carry: 0 },
      { a: 1, b: 1, sum: 0, carry: 1 }
    ];

    let allPass = true;
    for (const t of tests) {
      const out1 = evalGate(gate1, t.a, t.b);
      const out2 = evalGate(gate2, t.a, t.b);
      if (out1 !== t.sum || out2 !== t.carry) {
        allPass = false;
        break;
      }
    }

    if (allPass) {
      setSolved(true);
      updateScore(scoreRef.current + 250);
      setStatus('💡 TRUTH TABLE VERIFIED! Circuit correctly synthesizes binary addition! +250 PTS');
    } else {
      setStatus(`Circuit mismatch! Current: Gate1=${gate1}, Gate2=${gate2}. Target: Out1=Sum, Out2=Carry.`);
    }
  }, [gate1, gate2, updateScore]);

  const out1 = evalGate(gate1, testA, testB);
  const out2 = evalGate(gate2, testA, testB);

  return (
    <div className={styles.container} id="logic-circuit-builder-game">
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span>Logic Score</span>
          <span className={styles.scoreValue} id="circuit-score">{score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Core Status</span>
          <span className={styles.scoreValue} style={{ color: solved ? '#10b981' : '#f59e0b' }}>
            {solved ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span>Inputs A / B</span>
          <span className={styles.scoreValue}>{testA} / {testB}</span>
        </div>
      </div>

      <div
        style={{
          width: '320px',
          background: '#090d16',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          margin: '8px 0',
          boxSizing: 'border-box'
        }}
        id="circuit-diagram"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <button
              type="button"
              className={styles.touchBtn}
              onClick={() => setTestA(a => a === 1 ? 0 : 1)}
              style={{ minHeight: '36px', padding: '6px 12px' }}
            >
              Input A: <strong>{testA}</strong>
            </button>
            <div style={{ height: '8px' }} />
            <button
              type="button"
              className={styles.touchBtn}
              onClick={() => setTestB(b => b === 1 ? 0 : 1)}
              style={{ minHeight: '36px', padding: '6px 12px' }}
            >
              Input B: <strong>{testB}</strong>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
              id="btn-circuit-gate-0"
              onClick={cycleGate1}
              style={{ minHeight: '40px', minWidth: '85px', fontSize: '13px' }}
            >
              [{gate1}] Gate
            </button>
            <button
              type="button"
              className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
              id="btn-circuit-gate-1"
              onClick={cycleGate2}
              style={{ minHeight: '40px', minWidth: '85px', fontSize: '13px' }}
            >
              [{gate2}] Gate
            </button>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: out1 === 1 ? '#38bdf8' : '#64748b', fontWeight: 'bold' }}>
              Out 1 (Sum): {out1}
            </div>
            <div style={{ height: '14px' }} />
            <div style={{ fontSize: '13px', color: out2 === 1 ? '#38bdf8' : '#64748b', fontWeight: 'bold' }}>
              Out 2 (Carry): {out2}
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '8px', borderRadius: '6px', fontSize: '11px', color: '#94a3b8' }}>
          Target: Half-Adder (Sum = A ⊕ B, Carry = A · B)
        </div>
      </div>

      <p style={{ margin: '8px 0', fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>
        {status}
      </p>

      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnSuccess}`}
          id="btn-circuit-eval"
          onClick={evaluateCircuit}
        >
          ⚡ Verify Truth Table
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-circuit-restart"
          onClick={restart}
        >
          Reset Logic Circuit
        </button>
      </div>
    </div>
  );
});

LogicCircuitBuilder.displayName = 'LogicCircuitBuilder';
