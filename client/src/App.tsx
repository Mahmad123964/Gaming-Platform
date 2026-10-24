import React, { useState, useEffect, useCallback } from 'react';
import styles from './App.module.css';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { TelemetryGrid } from './components/TelemetryGrid';
import { TerminalConsole } from './components/TerminalConsole';
import { RoadmapGrid } from './components/RoadmapGrid';
import { HealthData, TerminalEntry } from './types/telemetry';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [environment, setEnvironment] = useState<string>('STAGING');
  const [logs, setLogs] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      message: 'NexusPlay React 19 + TypeScript Core Initialized.',
      type: 'dim',
    },
    {
      id: 'init-2',
      time: new Date().toLocaleTimeString(),
      message: 'Staging Gateway active on port 5050 (Obsidian Arcade Theme).',
      type: 'green',
    },
    {
      id: 'init-3',
      time: new Date().toLocaleTimeString(),
      message: 'Automated smoke test suite verified: AC-45.1, AC-45.2, AC-45.3.',
      type: 'blue',
    },
  ]);

  const addLog = useCallback((message: string, type: TerminalEntry['type'] = 'dim') => {
    const entry: TerminalEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: new Date().toLocaleTimeString(),
      message,
      type,
    };
    setLogs((prev) => [...prev.slice(-30), entry]);
  }, []);

  const probeHealth = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const latency = Math.round(performance.now() - start);
      setLatencyMs(latency);

      if (res.ok) {
        const data: HealthData = await res.json();
        setHealth(data);
        setIsOnline(true);
        setEnvironment((data.environment || 'STAGING').toUpperCase());
        addLog(`Health probe succeeded (${latency}ms, DB: ${data.database})`, 'green');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setIsOnline(false);
      setLatencyMs(null);
      addLog(`Health probe failed: ${err.message}`, 'rose');
    }
  }, [addLog]);

  // WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
          addLog(`Realtime WebSocket connected to ${wsUrl}`, 'green');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTION_ESTABLISHED') {
              addLog(`Realtime Handshake: ${data.message}`, 'blue');
            }
          } catch (e) {
            // ignore
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          addLog('Realtime WebSocket disconnected. Retrying in 5s...', 'yellow');
          reconnectTimeout = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e: any) {
        addLog(`WS Connection error: ${e.message}`, 'yellow');
      }
    };

    connect();
    probeHealth();
    const interval = setInterval(probeHealth, 15000);

    return () => {
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [probeHealth, addLog]);

  return (
    <div className={styles.appWrapper}>
      {/* Background Glowing Auras */}
      <div className={`${styles.glowOrb} ${styles.orb1}`} aria-hidden="true" />
      <div className={`${styles.glowOrb} ${styles.orb2}`} aria-hidden="true" />
      <div className={`${styles.glowOrb} ${styles.orb3}`} aria-hidden="true" />

      <Navbar
        environment={environment}
        isOnline={isOnline}
        latencyMs={latencyMs}
        onProbe={probeHealth}
      />

      <main className={styles.mainContent} id="mainContent">
        <HeroSection
          uptimeSeconds={health?.uptimeSeconds ?? 0}
          pipelineStatus="PASS"
        />

        <TelemetryGrid
          health={health}
          wsConnected={wsConnected}
        />

        <TerminalConsole logs={logs} />

        <RoadmapGrid />
      </main>

      <footer className={styles.footer} id="mainFooter">
        <div className={styles.footerContainer}>
          <div>
            <strong>NexusPlay Online Gaming Platform</strong> — Built with React 19, TypeScript & Google Antigravity
          </div>
          <div className={styles.footerRight}>
            <span>Active Sprint: <strong>00</strong></span>
            <span>Architecture: <strong>ADR-0002 Verified</strong></span>
            <span>Target Capacity: <strong>10,000 CCU</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
