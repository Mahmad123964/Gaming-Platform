import React, { useEffect } from 'react';
import styles from './UpgradePromptModal.module.css';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlans: () => void;
  gameTitle: string;
  requiredPlan?: string;
  reason?: 'unsubscribed' | 'expired';
  expiredAt?: string;
}

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  onOpenPlans,
  gameTitle,
  requiredPlan = 'Nexus Pro',
  reason = 'unsubscribed',
  expiredAt
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-prompt-title"
      id="upgrade-prompt-modal"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Banner */}
        <div className={styles.banner}>
          <div className={styles.bannerIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className={styles.bannerText}>
            <span className={styles.tierTag} id="upgrade-required-tier-tag">
              {requiredPlan.toUpperCase()} REQUIRED
            </span>
            <h3 className={styles.title} id="upgrade-prompt-title">
              {reason === 'expired' ? 'Membership Renewal Required' : 'Premium Membership Required'}
            </h3>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Dismiss upgrade dialog"
            id="btn-dismiss-upgrade-modal"
          >
            ✕
          </button>
        </div>

        {/* Body (EP08-04, AC-30.1, AC-30.2, AC-30.3) */}
        <div className={styles.body}>
          <div className={styles.messageBox} id="upgrade-denial-message">
            <p className={styles.gameNotice}>
              {reason === 'expired' ? (
                <>
                  Your subscription expired on{' '}
                  <strong style={{ color: '#FF0055' }}>
                    {expiredAt ? new Date(expiredAt).toLocaleDateString() : 'recently'}
                  </strong>
                  . Please renew your membership to continue launching{' '}
                  <span className={styles.highlightGame}>"{gameTitle}"</span> (AC-28.3).
                </>
              ) : (
                <>
                  <span className={styles.highlightGame}>"{gameTitle}"</span> is reserved for players with an active{' '}
                  <span className={styles.highlightPlan}>{requiredPlan}</span> membership (AC-28.2, AC-30.1).
                </>
              )}
            </p>
          </div>

          <div className={styles.perksTitle}>Unlock with {requiredPlan}:</div>
          <ul className={styles.perksList}>
            <li className={styles.perkItem}>
              <span className={styles.perkIcon}>✓</span>
              <span>Unlimited access to all premium arcade & strategy titles</span>
            </li>
            <li className={styles.perkItem}>
              <span className={styles.perkIcon}>✓</span>
              <span>Priority matchmaking queues with zero-latency bot scrims</span>
            </li>
            <li className={styles.perkItem}>
              <span className={styles.perkIcon}>✓</span>
              <span>Cross-device cloud save sync and exclusive profile badges</span>
            </li>
          </ul>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.upgradeBtn}
              onClick={() => {
                onClose();
                onOpenPlans();
              }}
              id="btn-upgrade-cta-direct"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              View Plans & Upgrade (AC-30.2)
            </button>
            <button
              type="button"
              className={styles.dismissBtn}
              onClick={onClose}
              id="btn-upgrade-maybe-later"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
