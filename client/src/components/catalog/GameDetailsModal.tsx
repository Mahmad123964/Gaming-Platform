import React, { useEffect, useState } from 'react';
import styles from './GameDetailsModal.module.css';
import { Game } from '../../types/catalog';

interface GameDetailsModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch?: (gameIdOrSlug: string, resume?: boolean) => void;
  onOpenMultiplayer?: (gameSlug: string) => void;
  onLog?: (msg: string, type?: 'dim' | 'green' | 'blue' | 'yellow' | 'rose') => void;
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({
  game,
  isOpen,
  onClose,
  onLaunch,
  onOpenMultiplayer,
  onLog
}) => {
  const [savedCheckpoint, setSavedCheckpoint] = useState<{ level: number; score: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !game) return;
    setSavedCheckpoint(null);
    fetch(`/api/v1/progress/checkpoint/${encodeURIComponent(game.slug)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.hasSavedProgress && data.progress) {
          setSavedCheckpoint(data.progress);
        }
      })
      .catch(() => {});
  }, [isOpen, game]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // AC-8.3: If game record is unavailable / not found / null
  if (!game) {
    return (
      <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="unavailable-title">
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close dialog">✕</button>
          <div className={styles.unavailableContainer}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-rose)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 id="unavailable-title" className={styles.unavailableTitle}>Game Record Unavailable</h2>
            <p className={styles.unavailableDesc}>
              The requested game catalog record could not be found, is unpublished, or is currently restricted under licensing and QA approval gates (AC-8.3).
            </p>
            <button className={styles.dismissBtn} onClick={onClose}>Return to Catalog</button>
          </div>
        </div>
      </div>
    );
  }

  const isPremium = game.isPremium;

  const handleLaunchClick = (resumeMode = false) => {
    if (onLaunch) {
      onLaunch(game.slug || game.id, resumeMode);
      onClose();
    } else if (isPremium) {
      if (onLog) {
        onLog(`Launch blocked: "${game.title}" requires an active Obsidian VIP membership (AC-8.2).`, 'yellow');
      }
    } else {
      if (onLog) {
        onLog(`Game launch intent registered for "${game.title}" (${game.mode.label}).`, 'green');
      }
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-modal-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} id={`game-details-${game.slug}`}>
        {/* Banner with 16:9 ratio */}
        <div className={styles.banner}>
          <div className={styles.bannerGlow} />
          <button className={styles.closeButton} onClick={onClose} aria-label="Close game details modal">✕</button>
          <svg className={styles.bannerIcon} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="6" width="20" height="12" rx="4" />
            <line x1="6" y1="12" x2="10" y2="12" />
            <line x1="8" y1="10" x2="8" y2="14" />
            <circle cx="15" cy="11" r="1" />
            <circle cx="17" cy="13" r="1" />
          </svg>
        </div>

        <div className={styles.body}>
          {/* Header row */}
          <div className={styles.headerRow}>
            <div>
              <h2 id="game-modal-title" className={styles.title}>{game.title}</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {game.category?.name || 'Authorized Title'}
              </span>
            </div>
            {/* Commercial Model Pill */}
            <span 
              className={styles.tierPill} 
              id="game-access-pill"
              style={
                game.commercialModel === 'EXTERNAL_STORE'
                  ? { background: 'rgba(6, 182, 212, 0.2)', color: '#38BDF8', border: '1px solid rgba(6, 182, 212, 0.45)' }
                  : game.commercialModel === 'UNAVAILABLE_PENDING_LICENSE'
                  ? { background: 'rgba(156, 163, 175, 0.2)', color: '#9CA3AF', border: '1px solid rgba(156, 163, 175, 0.4)' }
                  : game.commercialModel === 'PAID_ONE_TIME'
                  ? { background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.5)' }
                  : isPremium
                  ? { background: 'rgba(124, 58, 237, 0.25)', color: '#C084FC', border: '1px solid rgba(124, 58, 237, 0.6)' }
                  : { background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }
              }
            >
              {game.commercialModel === 'EXTERNAL_STORE'
                ? 'Official Store Referral'
                : game.commercialModel === 'UNAVAILABLE_PENDING_LICENSE'
                ? 'Pending Rights Clearance'
                : game.commercialModel === 'PAID_ONE_TIME'
                ? (game.pricing?.isOwned ? 'Owned License' : `Buy to Play (${game.pricing?.priceDisplay || '$3.99'})`)
                : (isPremium ? 'Obsidian VIP Required' : 'Free to Play')}
            </span>
          </div>

          {/* Description */}
          <p className={styles.desc}>{game.description}</p>

          {/* External Store Disclaimer Banner */}
          {game.commercialModel === 'EXTERNAL_STORE' && (
            <div style={{ padding: '12px 16px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }} id="external-store-notice">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <div style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                <strong>External Publisher Distribution:</strong> This title is published by <strong>{game.distribution?.publisher || 'Official Publisher'}</strong>. NexusPlay does not host, resell, or process payments for this game. Clicking below will open the official publisher store ({game.distribution?.externalStoreName || 'Official Store'}).
              </div>
            </div>
          )}

          {/* Pending Rights Review Banner */}
          {game.commercialModel === 'UNAVAILABLE_PENDING_LICENSE' && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }} id="license-pending-notice">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                <strong>Licensing Review Required:</strong> Commercial rights and distribution agreements for this game are currently under review. Gameplay launch is restricted until authorized by publisher.
              </div>
            </div>
          )}

          {/* AC-8.2: Prominent Premium Requirement Banner Before Launch (Only if legacy subscription-only) */}
          {isPremium && game.commercialModel !== 'PAID_ONE_TIME' && game.commercialModel !== 'EXTERNAL_STORE' && (
            <div className={styles.premiumRequirementBanner} id="premium-requirement-banner">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <div>
                <strong>Obsidian VIP Subscription Required:</strong> This premium title requires an active subscription entitlement before gameplay launch (AC-8.2).
              </div>
            </div>
          )}

          {/* Direct One-Time Ownership Notice */}
          {game.commercialModel === 'PAID_ONE_TIME' && !game.pricing?.isOwned && (
            <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }} id="paid-game-notice">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                <strong>Direct One-Time Purchase:</strong> Buy once to own lifetime access to this game. Regional price: <strong>{game.pricing?.priceDisplay || '$3.99'}</strong> ({game.pricing?.currency || 'USD'}).
              </div>
            </div>
          )}

          {/* AC-8.1: Mode and Access Requirements Metadata Grid */}
          <div className={styles.metaGrid} id="game-specs-grid">
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Gameplay Mode</span>
              <span className={styles.metaValue} id="spec-mode-type">{game.mode.label}</span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Player Capacity</span>
              <span className={styles.metaValue} id="spec-player-capacity">
                {game.minPlayers === game.maxPlayers ? `${game.minPlayers} Player` : `${game.minPlayers}–${game.maxPlayers} Players`}
              </span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Computer Opponents</span>
              <span className={styles.metaValue} id="spec-bot-support">
                {game.supportsBots ? 'AI Bots Supported' : 'Human Opponents Only'}
              </span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Commercial Model</span>
              <span className={styles.metaValue} id="spec-access-tier">
                {game.commercialModel === 'EXTERNAL_STORE' ? 'External Store' : (game.commercialModel === 'PAID_ONE_TIME' ? 'Paid One-Time' : (game.commercialModel === 'UNAVAILABLE_PENDING_LICENSE' ? 'Pending Rights' : 'Free to Play'))}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.footerActions}>
            <button className={styles.dismissBtn} onClick={onClose} id="btn-close-modal">
              Close
            </button>
            {savedCheckpoint && (
              <button
                className={styles.launchBtn}
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #00F0FF 100%)', border: 'none', color: '#0B0F19', fontWeight: 800 }}
                onClick={() => handleLaunchClick(true)}
                id="btn-resume-saved-level"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Resume at Wave {savedCheckpoint.level} (AC-24.1)
              </button>
            )}

            {/* ACTION BUTTON SWITCH */}
            {game.commercialModel === 'EXTERNAL_STORE' ? (
              <a
                href={game.distribution?.externalStoreUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.launchBtn}
                id="btn-open-official-store"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0EA5E9 0%, #00F0FF 100%)', color: '#0B0F19', fontWeight: 800 }}
              >
                Open {game.distribution?.externalStoreName || 'Official Store'} ↗
              </a>
            ) : game.commercialModel === 'UNAVAILABLE_PENDING_LICENSE' ? (
              <button
                disabled
                className={styles.launchBtn}
                id="btn-coming-soon"
                style={{ opacity: 0.5, cursor: 'not-allowed', background: '#374151' }}
              >
                Coming Soon (Rights Pending)
              </button>
            ) : (
              <button
                className={styles.launchBtn}
                onClick={() => handleLaunchClick(false)}
                id="btn-launch-game"
                aria-describedby={isPremium ? 'premium-requirement-banner' : undefined}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {isPremium ? 'Upgrade to Launch' : (savedCheckpoint ? 'Restart Mission' : 'Launch Game')}
              </button>
            )}

            {game.maxPlayers >= 2 && onOpenMultiplayer && game.commercialModel !== 'EXTERNAL_STORE' && game.commercialModel !== 'UNAVAILABLE_PENDING_LICENSE' && (
              <button
                className={styles.launchBtn}
                style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #00F0FF 100%)', border: 'none', color: '#0B0F19', fontWeight: 800 }}
                onClick={() => {
                  onClose();
                  onOpenMultiplayer(game.slug);
                }}
                id="btn-open-multiplayer-lobby"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Host 2P Lobby (EP05-01)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
