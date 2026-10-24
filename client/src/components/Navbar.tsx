import React from 'react';
import styles from './Navbar.module.css';

interface NavbarProps {
  environment: string;
  isOnline: boolean;
  latencyMs: number | null;
  onProbe: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  environment,
  isOnline,
  latencyMs,
  onProbe,
}) => {
  return (
    <header className={styles.navbar} id="mainNavbar">
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
          <span className={styles.brandText}>
            NEXUS<span className={styles.highlight}>PLAY</span>
          </span>
          <span className={styles.envBadge}>{environment}</span>
        </div>

        <nav className={styles.navLinks} id="primaryNav" aria-label="Main Navigation">
          <a href="#overview" className={`${styles.navLink} ${styles.navLinkActive}`}>Overview</a>
          <a href="#telemetry" className={styles.navLink}>SRE Telemetry</a>
          <a href="#roadmap" className={styles.navLink}>Sprint Roadmap</a>
        </nav>

        <div className={styles.actions}>
          <div className={styles.connectionPill} id="connStatus">
            <span
              className={`${styles.statusDot} ${isOnline ? styles.statusDotPulse : ''}`}
              style={{ background: isOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}
            />
            <span>{isOnline ? 'Gateway Online' : 'Gateway Offline'}</span>
            <span className={styles.latency}>
              {latencyMs !== null ? `${latencyMs} ms` : '-- ms'}
            </span>
          </div>

          <button
            type="button"
            className={styles.btnProbe}
            onClick={onProbe}
            id="btnRefreshHealth"
            title="Trigger instant API health check probe"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Probe Health
          </button>
        </div>
      </div>
    </header>
  );
};
