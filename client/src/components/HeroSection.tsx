import React from 'react';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  uptimeSeconds: number;
  pipelineStatus: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  uptimeSeconds,
  pipelineStatus,
}) => {
  return (
    <section className={styles.heroSection} id="overview">
      <div className={styles.heroTag}>
        <span className={styles.pulseDot} aria-hidden="true" />
        <span>Sprint 00 Baseline • React 19 + TypeScript Core</span>
      </div>

      <h1 className={styles.heroTitle}>
        The High-Reliability <br />
        <span className={styles.gradientText}>Online Gaming Platform</span>
      </h1>

      <p className={styles.heroSubtitle}>
        Engineered for 100+ authorized browser games, real-time matchmaking, secure progression,
        and high-availability concurrency of 10,000 simultaneous players.
      </p>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>10,000</div>
          <div className={styles.statDesc}>Target CCU Concurrency</div>
          <span className={`${styles.statBadge} ${styles.badgeEmerald}`}>OBJ-06 Ready</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>100+</div>
          <div className={styles.statDesc}>Planned Game Library</div>
          <span className={`${styles.statBadge} ${styles.badgeViolet}`}>Solo & Multiplayer</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>
            {uptimeSeconds > 0 ? `${uptimeSeconds}s` : '99.9%'}
          </div>
          <div className={styles.statDesc}>Active Gateway Uptime</div>
          <span className={`${styles.statBadge} ${styles.badgeCyan}`}>SRE Monitored</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>{pipelineStatus}</div>
          <div className={styles.statDesc}>Staging Smoke Suite</div>
          <span className={`${styles.statBadge} ${styles.badgeEmerald}`}>EP13-01 Active</span>
        </div>
      </div>
    </section>
  );
};
