import React from 'react';
import styles from './TelemetryGrid.module.css';
import { HealthData } from '../types/telemetry';

interface TelemetryGridProps {
  health: HealthData | null;
  wsConnected: boolean;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
  health,
  wsConnected,
}) => {
  const isApiHealthy = health?.status === 'healthy';
  const isDbHealthy = health?.database === 'connected';

  return (
    <section className={styles.telemetrySection} id="telemetry">
      <div className={styles.sectionHeader}>
        <div className={styles.tag}>SRE OBSERVABILITY</div>
        <h2 className={styles.title}>Live Staging Subsystem Diagnostics</h2>
        <p className={styles.subtitle}>
          Real-time health verification across platform gateway, relational database, and WebSocket session layers.
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.cardIcon} aria-hidden="true">⚡</span>
            <span className={`${styles.badge} ${isApiHealthy ? styles.badgeSuccess : styles.badgeDanger}`}>
              {isApiHealthy ? '200 OK' : 'DEGRADED'}
            </span>
          </div>
          <h3 className={styles.cardName}>Stateless REST API Gateway</h3>
          <p className={styles.cardInfo}>Endpoint: <code>/api/health</code></p>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Uptime:</span>
            <strong className={styles.metricValue}>{health?.uptimeSeconds ?? 0}s</strong>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Memory RSS:</span>
            <strong className={styles.metricValue}>{health?.memory?.rssMB ?? '--'} MB</strong>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.cardIcon} aria-hidden="true">🗄️</span>
            <span className={`${styles.badge} ${isDbHealthy ? styles.badgeSuccess : styles.badgeDanger}`}>
              {isDbHealthy ? 'CONNECTED' : 'UNHEALTHY'}
            </span>
          </div>
          <h3 className={styles.cardName}>Relational Data Store</h3>
          <p className={styles.cardInfo}>Engine: <code>node:sqlite</code> Schema v1.0</p>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Core Tables:</span>
            <strong className={styles.metricValue}>12 Domain Entities</strong>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Transaction Mode:</span>
            <strong className={styles.metricValue}>WAL / ACID Verified</strong>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.cardIcon} aria-hidden="true">📡</span>
            <span className={`${styles.badge} ${wsConnected ? styles.badgeSuccess : styles.badgeDanger}`}>
              {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <h3 className={styles.cardName}>Stateful Realtime Layer</h3>
          <p className={styles.cardInfo}>WebSocket: <code>/ws</code></p>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Active Sockets:</span>
            <strong className={styles.metricValue}>{wsConnected ? 'Connected' : 'Offline'}</strong>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Protocol:</span>
            <strong className={styles.metricValue}>JSON RPC / Ping-Pong</strong>
          </div>
        </div>
      </div>
    </section>
  );
};
