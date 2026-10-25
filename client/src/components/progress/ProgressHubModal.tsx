import React, { useState, useEffect } from 'react';
import styles from './ProgressHubModal.module.css';

interface ProgressHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeGame?: (slug: string) => void;
  onLog?: (msg: string, color?: string) => void;
}

type TabType = 'history' | 'achievements' | 'checkpoint';

export const ProgressHubModal: React.FC<ProgressHubModalProps> = ({
  isOpen,
  onClose,
  onResumeGame,
  onLog
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [loading, setLoading] = useState<boolean>(true);
  const [historyData, setHistoryData] = useState<any>(null);
  const [achievementsData, setAchievementsData] = useState<any>(null);
  const [checkpointData, setCheckpointData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    Promise.all([
      fetch('/api/v1/progress/history?limit=10', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/v1/progress/achievements', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/v1/progress/checkpoint/cyber-invaders', { credentials: 'include' }).then(r => r.ok ? r.json() : null)
    ])
      .then(([hist, ach, cp]) => {
        setHistoryData(hist);
        setAchievementsData(ach);
        setCheckpointData(cp);
        setLoading(false);
        if (onLog) {
          onLog('Player career progress, session history, and achievements synchronized.', 'dim');
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [isOpen, onLog]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} id="progress-hub-overlay">
      <div className={styles.modal} onClick={e => e.stopPropagation()} id="progress-hub-modal">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.careerIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div className={styles.titleArea}>
              <h2 id="progress-hub-title">Player Career & Milestones</h2>
              <div className={styles.playerTag}>Obsidian Arcade Progress Engine • Sprint 05</div>
            </div>
          </div>

          <button
            className={styles.closeButton}
            onClick={onClose}
            id="btn-close-progress-hub"
            aria-label="Close Career Hub"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabBar} role="tablist">
          <button
            className={`${styles.tabButton} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
            id="tab-history"
            role="tab"
            aria-selected={activeTab === 'history'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Recent Sessions (Last 10)
          </button>

          <button
            className={`${styles.tabButton} ${activeTab === 'achievements' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('achievements')}
            id="tab-achievements"
            role="tab"
            aria-selected={activeTab === 'achievements'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2" />
            </svg>
            Achievements ({achievementsData?.unlockedCount || 0}/{achievementsData?.totalAchievements || 5})
          </button>

          <button
            className={`${styles.tabButton} ${activeTab === 'checkpoint' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('checkpoint')}
            id="tab-checkpoint"
            role="tab"
            aria-selected={activeTab === 'checkpoint'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Saved Progress Checkpoint
          </button>
        </div>

        {/* Tab Contents */}
        <div className={styles.contentArea}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }} id="progress-loading">
              Loading player career records & synchronization...
            </div>
          ) : (
            <>
              {/* Tab 1: Recent Sessions History (EP07-03, AC-25.1..25.3) */}
              {activeTab === 'history' && (
                <div id="view-history-tab">
                  {historyData?.isEmpty || !historyData?.history || historyData.history.length === 0 ? (
                    <div className={styles.emptyState} id="history-empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p>{historyData?.emptyMessage || 'No completed game sessions recorded yet (AC-25.3).'}</p>
                    </div>
                  ) : (
                    <table className={styles.historyTable} id="history-table">
                      <thead>
                        <tr>
                          <th>Game Title</th>
                          <th>Completed At</th>
                          <th>Wave Reached</th>
                          <th>Duration</th>
                          <th>Score</th>
                          <th>Verification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.history.map((record: any) => (
                          <tr key={record.id} id={`history-row-${record.id}`}>
                            <td style={{ fontWeight: 600 }}>{record.gameTitle}</td>
                            <td style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                              {new Date(record.completedAt).toLocaleString()}
                            </td>
                            <td>Wave {record.level}</td>
                            <td>{record.durationSeconds}s</td>
                            <td className={styles.scoreCell}>{record.score.toLocaleString()}</td>
                            <td>
                              {record.verificationStatus === 'PLAUSIBILITY_CHECK_PASSED' || record.verificationStatus === 'verified' ? (
                                <span className={styles.badgePlausibility} title="Client-reported outcome passed heuristic velocity & boundary plausibility checks">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                  </svg>
                                  Plausibility Checked
                                </span>
                              ) : record.verificationStatus === 'AUTHORITATIVELY_VERIFIED' ? (
                                <span className={styles.badgeAuthoritative} title="Server-authoritatively verified gameplay simulation">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  Authoritative
                                </span>
                              ) : (
                                <span className={styles.badgeUnverified} title="Score exceeds plausibility thresholds or lacks telemetry">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                  </svg>
                                  Unverified
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Achievements (EP07-04, AC-26.1..26.3) */}
              {activeTab === 'achievements' && (
                <div id="view-achievements-tab">
                  <div className={styles.achievementsStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Achievements Unlocked</span>
                      <span className={styles.statValue} id="achievements-unlocked-count">
                        {achievementsData?.unlockedCount || 0} / {achievementsData?.totalAchievements || 5}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Gamerscore Points</span>
                      <span className={styles.statValue} style={{ color: '#00F0FF' }} id="achievements-total-points">
                        {achievementsData?.totalPoints || 0} PTS
                      </span>
                    </div>
                  </div>

                  {achievementsData?.isEmpty ? (
                    <div className={styles.emptyState} id="achievements-empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2" />
                      </svg>
                      <p>{achievementsData.emptyMessage}</p>
                    </div>
                  ) : (
                    <div className={styles.achievementsGrid} id="achievements-grid">
                      {achievementsData?.achievements?.map((ach: any) => (
                        <div
                          key={ach.id}
                          className={`${styles.achCard} ${ach.unlocked ? styles.achCardUnlocked : styles.achCardLocked}`}
                          id={`achievement-card-${ach.code.toLowerCase()}`}
                        >
                          <div className={`${styles.achIcon} ${ach.unlocked ? styles.achIconUnlocked : styles.achIconLocked}`}>
                            {ach.unlocked ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                          </div>
                          <div className={styles.achBody}>
                            <h4 className={styles.achTitle}>{ach.title}</h4>
                            <p className={styles.achDesc}>{ach.description}</p>
                            <div className={styles.achMetaRow}>
                              <div className={styles.achPoints}>+{ach.points} POINTS</div>
                              {ach.unlocked && (
                                <span className={styles.achProvisionalBadge} title="Provisional milestone earned via client-reported single-player gameplay">
                                  {ach.verificationType || 'PROVISIONAL'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Saved Checkpoint Progress (EP07-02, AC-24.1..24.3) */}
              {activeTab === 'checkpoint' && (
                <div id="view-checkpoint-tab">
                  {checkpointData?.hasSavedProgress && checkpointData.progress ? (
                    <div className={styles.checkpointCard} id="checkpoint-active-card">
                      <div className={styles.checkpointInfo}>
                        <h3>{checkpointData.gameTitle}</h3>
                        <div className={styles.checkpointMeta}>
                          <span><strong>Current Level:</strong> Wave {checkpointData.progress.level}</span>
                          <span><strong>Saved Score:</strong> {checkpointData.progress.score.toLocaleString()} pts</span>
                          <span><strong>Last Saved:</strong> {new Date(checkpointData.progress.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <button
                        className={styles.resumeBtn}
                        onClick={() => {
                          onClose();
                          if (onResumeGame) onResumeGame(checkpointData.gameSlug);
                        }}
                        id="btn-resume-mission"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Resume at Wave {checkpointData.progress.level}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.emptyState} id="checkpoint-empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      <p>{checkpointData?.message || 'No saved progress checkpoint found for Cyber Invaders. Play a mission to establish your saved wave (AC-24.2).'}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
