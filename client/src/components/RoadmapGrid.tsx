import React from 'react';
import styles from './RoadmapGrid.module.css';

export const RoadmapGrid: React.FC = () => {
  return (
    <section className={styles.section} id="roadmap">
      <div className={styles.header}>
        <div className={styles.tag}>DELIVERY PLAYBOOK</div>
        <h2 className={styles.title}>Sprint-by-Sprint Execution Roadmap</h2>
        <p className={styles.subtitle}>
          Governed strictly under the Google Antigravity One-Sprint Rule across 15 Epics and 54 Stories.
        </p>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.cardActive}`} id="sprintCard00">
          <div className={styles.cardTop}>
            <span className={styles.phase}>PHASE 1</span>
            <span className={`${styles.pill} ${styles.pillCurrent}`}>VERIFIED • SPRINT 00</span>
          </div>
          <h3 className={styles.cardTitle}>Project Foundation & Pipeline</h3>
          <div className={styles.story}>Story: <code>EP13-01</code> (MoSCoW: Must)</div>
          <p className={styles.desc}>
            React 19 + TypeScript migration (ADR-0002), SQLite schema baseline, automated staging deployment pipeline, and multi-check smoke testing suite.
          </p>
          <div className={`${styles.status} ${styles.statusPassed}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Smoke Tests Verified • Staging Pipeline Active
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardActive}`} id="sprintCard01">
          <div className={styles.cardTop}>
            <span className={styles.phase}>PHASE 1</span>
            <span className={`${styles.pill} ${styles.pillCurrent}`}>VERIFIED • SPRINT 01</span>
          </div>
          <h3 className={styles.cardTitle}>Identity & Security</h3>
          <div className={styles.story}>Stories: <code>EP01-01</code> to <code>EP01-03</code>, <code>EP11-01</code></div>
          <p className={styles.desc}>
            Player registration, HttpOnly cookie sessions, HMAC CSRF protection, rate limiting, and cascade revocation.
          </p>
          <div className={`${styles.status} ${styles.statusPassed}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            49/49 Security Tests Passed • Verified
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardActive}`} id="sprintCard02">
          <div className={styles.cardTop}>
            <span className={styles.phase}>PHASE 1</span>
            <span className={`${styles.pill} ${styles.pillCurrent}`}>VERIFIED • SPRINT 02</span>
          </div>
          <h3 className={styles.cardTitle}>Game Discovery & Catalog</h3>
          <div className={styles.story}>Stories: <code>EP02-01</code> to <code>EP02-04</code></div>
          <p className={styles.desc}>
            Published catalog browsing, title search with debouncing, category filtering, and modal game details with mode metadata.
          </p>
          <div className={`${styles.status} ${styles.statusPassed}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            31/31 Catalog Tests Passed • Verified
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardActive}`} id="sprintCard03">
          <div className={styles.cardTop}>
            <span className={styles.phase}>PHASE 1</span>
            <span className={`${styles.pill} ${styles.pillCurrent}`}>CURRENT • SPRINT 03</span>
          </div>
          <h3 className={styles.cardTitle}>Content Administration</h3>
          <div className={styles.story}>Stories: <code>EP03-02</code>, <code>EP10-01</code> to <code>EP10-03</code>, <code>EP11-02</code></div>
          <p className={styles.desc}>
            Admin catalog CRUD, publishing controls, RBAC role-based protection, licensing approval gates, and administrative audit trail.
          </p>
          <div className={`${styles.status} ${styles.statusPassed}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Content Administration Active • RBAC & Licensing Gate
          </div>
        </div>
      </div>
    </section>
  );
};
