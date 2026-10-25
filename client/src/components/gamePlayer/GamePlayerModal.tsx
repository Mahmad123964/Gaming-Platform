import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './GamePlayerModal.module.css';
import { CyberInvadersCanvas, CyberInvadersRef } from './CyberInvadersCanvas';

interface GamePlayerModalProps {
  gameIdOrSlug: string;
  onClose: () => void;
  onLog?: (message: string, type?: 'green' | 'blue' | 'yellow' | 'rose' | 'dim') => void;
}

interface LaunchData {
  launchTicket: string;
  sessionId: string;
  game: {
    id: string;
    title: string;
    slug: string;
    description: string;
    launchUrl: string;
    isPremium: boolean;
    category?: { id: string; name: string; slug: string };
    minPlayers: number;
    maxPlayers: number;
    supportsBots: boolean;
  };
  compatibility: {
    status: string;
    code: string;
    message: string;
    details?: any;
  };
}

export const GamePlayerModal: React.FC<GamePlayerModalProps> = ({
  gameIdOrSlug,
  onClose,
  onLog
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ message: string; code?: string; details?: any } | null>(null);
  const [launchData, setLaunchData] = useState<LaunchData | null>(null);
  const [score, setScore] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const canvasRef = useRef<CyberInvadersRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize Game Launch Lifecycle (EP03-01, EP03-03, EP03-04, EP04-01)
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    // Evaluate client capabilities
    const clientCapabilities = {
      hasCanvas: !!document.createElement('canvas').getContext,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };

    fetch(`/api/v1/games/${encodeURIComponent(gameIdOrSlug)}/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ clientCapabilities })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const err = new Error(data.message || `Launch failed with HTTP ${res.status}`);
          (err as any).code = data.error || 'LaunchError';
          (err as any).details = data.details;
          (err as any).status = res.status;
          throw err;
        }
        return data as LaunchData;
      })
      .then((data) => {
        if (!mounted) return;
        const resolvedSessionId = data.sessionId || (data as any).session?.sessionId || '';
        data.sessionId = resolvedSessionId;
        setLaunchData(data);
        setLoading(false);
        if (onLog) {
          onLog(`Game launched successfully: "${data.game.title}" (Session: ${resolvedSessionId.slice(0, 12)}...)`, 'green');
          if (data.compatibility.status === 'INCONCLUSIVE') {
            onLog(`Compatibility notice: ${data.compatibility.message}`, 'yellow');
          }
        }
      })
      .catch((err: any) => {
        if (!mounted) return;
        setLoading(false);
        setError({
          message: err.message,
          code: err.code,
          details: err.details
        });
        if (onLog) {
          onLog(`Game launch blocked: ${err.message}`, 'rose');
        }
      });

    return () => {
      mounted = false;
    };
  }, [gameIdOrSlug, onLog]);

  // Handle Session Restart (EP04-03, AC-15.1, AC-15.3)
  const handleRestart = useCallback(async () => {
    if (!launchData) return;

    try {
      const res = await fetch(`/api/v1/sessions/${encodeURIComponent(launchData.sessionId)}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (res.ok) {
        setScore(0);
        if (canvasRef.current) {
          canvasRef.current.restart();
        }
        if (onLog) {
          onLog(`Session restarted: Score reset to 0, wave 1 reinitialized (AC-15.1, AC-15.3).`, 'blue');
        }
      } else {
        if (onLog) {
          onLog(`Restart failed: ${data.message}`, 'rose');
        }
      }
    } catch (e: any) {
      if (onLog) onLog(`Restart network error: ${e.message}`, 'rose');
    }
  }, [launchData, onLog]);

  // Handle Return to Catalog & Session Termination (EP04-01, AC-13.3)
  const handleExitAndReturn = useCallback(async () => {
    if (launchData) {
      const activeSessionId = launchData.sessionId || (launchData as any).session?.sessionId;
      if (activeSessionId) {
        try {
          await fetch(`/api/v1/sessions/${encodeURIComponent(activeSessionId)}/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (onLog) {
            onLog(`Single-player session ${activeSessionId.slice(0, 12)} concluded and marked ended (AC-13.3).`, 'dim');
          }
        } catch (_) {}
      }
    }
    onClose();
  }, [launchData, onClose, onLog]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleExitAndReturn();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-player-title"
      id="game-player-modal"
    >
      <div className={styles.modalContainer} ref={containerRef}>
        {/* Top Header Bar */}
        <div className={styles.topBar}>
          <div className={styles.titleArea}>
            <svg className={styles.gameIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="4" />
              <line x1="6" y1="12" x2="10" y2="12" />
              <line x1="8" y1="10" x2="8" y2="14" />
              <circle cx="15" cy="11" r="1" />
              <circle cx="17" cy="13" r="1" />
            </svg>
            <h2 id="game-player-title" className={styles.gameTitle}>
              {launchData?.game.title || 'Game Player Container'}
            </h2>
            <div className={styles.badgeGroup}>
              {launchData?.game.category && (
                <span className={styles.categoryBadge}>{launchData.game.category.name}</span>
              )}
              <span className={styles.modeBadge} id="badge-solo-mode">Single Player</span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.exitButton}
              onClick={handleExitAndReturn}
              id="btn-exit-game"
              aria-label="Exit Game and Return to Catalog"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Exit to Catalog
            </button>
          </div>
        </div>

        {/* Telemetry Strip (Active when game loaded) */}
        {launchData && !error && (
          <div className={styles.telemetryStrip} id="game-telemetry-bar">
            <div className={styles.telemetryLeft}>
              <div className={styles.telemetryItem}>
                <span>SESSION:</span>
                <span className={styles.telemetryValue} id="telemetry-session-id">
                  {(launchData.sessionId || (launchData as any).session?.sessionId || '').slice(0, 14)}...
                </span>
              </div>
              <div className={styles.telemetryItem}>
                <span>LIVE SCORE:</span>
                <span className={styles.telemetryValue} id="telemetry-live-score">
                  {score}
                </span>
              </div>
            </div>

            <div className={styles.telemetryRight}>
              <button
                className={`${styles.toolButton} ${soundEnabled ? styles.toolButtonActive : ''}`}
                onClick={() => setSoundEnabled(v => !v)}
                title={soundEnabled ? 'Mute Sound (8-Bit Audio Active)' : 'Unmute Sound'}
                id="btn-toggle-sound"
                aria-label="Toggle Sound"
              >
                {soundEnabled ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                )}
              </button>

              <button
                className={styles.toolButton}
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                id="btn-toggle-fullscreen"
                aria-label="Toggle Fullscreen"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Viewport Area */}
        <div className={styles.viewportArea}>
          {/* Loading State */}
          {loading && (
            <div className={styles.loadingSpinner} id="game-loading-state">
              <div className={styles.spinnerOrb} />
              <div>Initiating authorized runtime container & licensing clearance...</div>
            </div>
          )}

          {/* Error / Restriction State (AC-9.2, AC-9.3, AC-11.1, AC-12.1) */}
          {error && (
            <div className={`${styles.alertBanner} ${styles.alertError}`} id="game-launch-error-banner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF0055" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Launch Authorization Failed:</strong> {error.message}
                {error.code === 'VIP_SUBSCRIPTION_REQUIRED' && (
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#E2E8F0' }}>
                    This title is reserved for Obsidian VIP subscribers. Upgrade your entitlement via the billing portal to access.
                  </div>
                )}
                {error.code === 'CANVAS_UNSUPPORTED' && (
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#E2E8F0' }}>
                    Your current client does not support HTML5 Canvas rendering. Please update your browser to Chrome, Edge, or Safari.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compatibility Inconclusive Warning (AC-11.3) */}
          {launchData?.compatibility.status === 'INCONCLUSIVE' && (
            <div className={`${styles.alertBanner} ${styles.alertWarning}`} id="compatibility-fallback-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <strong>Compatibility Notice:</strong> {launchData.compatibility.message}
              </div>
            </div>
          )}

          {/* Active Playable Canvas Viewport */}
          {launchData && !error && (
            <>
              <CyberInvadersCanvas
                ref={canvasRef}
                soundEnabled={soundEnabled}
                onScoreUpdate={(s) => setScore(s)}
                onGameOver={(finalScore) => {
                  if (onLog) {
                    onLog(`Game Over recorded for "${launchData.game.title}". Final Score: ${finalScore}`, 'yellow');
                  }
                }}
              />

              {/* In-Game Footer Controls */}
              <div className={styles.footerControls}>
                <button
                  className={styles.restartBtn}
                  onClick={handleRestart}
                  id="btn-session-restart"
                  title="Restart session and reset score to 0 (AC-15.1, AC-15.3)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  Restart Mission
                </button>

                <button
                  className={styles.returnCatalogBtn}
                  onClick={handleExitAndReturn}
                  id="btn-return-catalog"
                >
                  Return to Catalog
                </button>
              </div>
            </>
          )}

          {/* If launch failed, provide Return button */}
          {error && (
            <button
              className={styles.returnCatalogBtn}
              onClick={onClose}
              id="btn-dismiss-error"
              style={{ marginTop: '20px' }}
            >
              Return to Catalog
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
