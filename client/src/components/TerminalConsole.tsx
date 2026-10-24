import React, { useRef, useEffect } from 'react';
import styles from './TerminalConsole.module.css';
import { TerminalEntry } from '../types/telemetry';

interface TerminalConsoleProps {
  logs: TerminalEntry[];
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({ logs }) => {
  const bodyRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  const getColorClass = (type: TerminalEntry['type']) => {
    switch (type) {
      case 'green': return styles.logGreen;
      case 'blue': return styles.logBlue;
      case 'yellow': return styles.logYellow;
      case 'rose': return styles.logRose;
      default: return styles.logDim;
    }
  };

  return (
    <div className={styles.container} id="terminalBox">
      <div className={styles.header}>
        <div className={styles.dots}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotYellow}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
        </div>
        <div className={styles.title}>Staging Automated Smoke Test Stream — EP13-01</div>
        <div className={styles.time} id="terminalTime">LIVE TELEMETRY</div>
      </div>
      <pre className={styles.body} ref={bodyRef}>
        {logs.map((log) => (
          <div key={log.id}>
            <span className={getColorClass(log.type)}>
              [{log.time}] {log.message}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
};
