import React, { useState, useEffect, useCallback } from 'react';
import styles from './SubscriptionPlansModal.module.css';
import { User } from '../AuthModal';
import { getCsrfToken } from '../../utils/csrf';

interface Plan {
  id: string;
  name: string;
  priceCents: number;
  priceFormatted: string;
  currency: string;
  interval: string;
  features: string[];
  isPopular: boolean;
  tier: 'free' | 'pro' | 'ultimate';
}

interface SubscriptionInfo {
  tier: string;
  planId: string;
  status: 'active' | 'free' | 'expired' | 'cancelled';
  isActive: boolean;
  currentPeriodEnd: string | null;
  renewalDate: string | null;
  features: string[];
}

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenLogin: () => void;
  onLog?: (msg: string, type?: 'dim' | 'green' | 'blue' | 'yellow' | 'rose') => void;
  onSubscriptionUpdated?: () => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenLogin,
  onLog,
  onSubscriptionUpdated
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySubscription, setMySubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch public plans matrix (EP08-01, AC-27.1, AC-27.2, AC-27.3)
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/subscriptions/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch authenticated membership status (EP08-03, AC-29.1, AC-29.2, AC-29.3)
  const fetchMySubscription = useCallback(async () => {
    if (!currentUser) {
      setMySubscription(null);
      return;
    }
    try {
      const res = await fetch('/api/v1/subscriptions/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMySubscription(data.subscription || null);
      }
    } catch (e) {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setFeedback(null);
    Promise.all([fetchPlans(), fetchMySubscription()]).finally(() => {
      setLoading(false);
    });
  }, [isOpen, fetchPlans, fetchMySubscription]);

  // Handle escape key
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

  const handleSubscribe = async (plan: Plan) => {
    if (!currentUser) {
      onClose();
      onOpenLogin();
      return;
    }

    setSubscribingPlanId(plan.id);
    setFeedback(null);

    try {
      const res = await fetch('/api/v1/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        credentials: 'include',
        body: JSON.stringify({ planId: plan.id, paymentMethod: 'simulated_card' })
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ message: `Success! You are now subscribed to ${data.subscription?.tier || plan.name}.`, type: 'success' });
        setMySubscription(data.subscription);
        if (onLog) {
          onLog(`Membership upgraded to ${data.subscription?.tier} ($${(plan.priceCents / 100).toFixed(2)}/mo). Premium access unlocked!`, 'green');
        }
        if (onSubscriptionUpdated) {
          onSubscriptionUpdated();
        }
      } else {
        throw new Error(data.message || 'Subscription processing failed.');
      }
    } catch (err: any) {
      setFeedback({ message: err.message || 'Subscription upgrade failed. Please try again.', type: 'error' });
      if (onLog) {
        onLog(`Subscription upgrade failed: ${err.message}`, 'rose');
      }
    } finally {
      setSubscribingPlanId(null);
    }
  };

  const isCurrentPlan = (plan: Plan) => {
    if (!currentUser || !mySubscription) {
      return false;
    }
    if (plan.id === 'plan-free' && (mySubscription.status === 'free' || mySubscription.planId === 'plan-free')) {
      return true;
    }
    return mySubscription.planId === plan.id && mySubscription.isActive;
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-modal-title"
      id="plans-comparison-modal"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.tagRow}>
              <span className={styles.tag} id="plans-tag-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                EPIC 08 • PREMIUM ACCESS & ENTITLEMENTS
              </span>
            </div>
            <h2 className={styles.title} id="plans-modal-title">NexusPlay Membership Tiers</h2>
            <p className={styles.subtitle}>
              Compare player access entitlements across tiers. Unlock high-performance single-player campaigns, cloud sync, and competitive tournament matchmaking.
            </p>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close membership plans dialog"
            id="btn-close-plans"
          >
            ✕
          </button>
        </div>

        {/* Authenticated Membership Strip (EP08-03, AC-29.1, AC-29.2) */}
        <div className={styles.statusStrip} id="membership-status-strip">
          <div className={styles.statusUser}>
            <span>Player Status:</span>
            {currentUser ? (
              <>
                <strong>{currentUser.displayName}</strong>
                <span>• Current Tier: <strong>{mySubscription?.tier || 'Free Explorer'}</strong></span>
                <span
                  className={`${styles.statusBadge} ${
                    mySubscription?.status === 'active'
                      ? styles.badgeActive
                      : mySubscription?.status === 'expired'
                      ? styles.badgeExpired
                      : styles.badgeFree
                  }`}
                  id="membership-status-badge"
                >
                  {mySubscription?.status === 'active' ? 'ACTIVE PRO' : (mySubscription?.status || 'FREE')}
                </span>
              </>
            ) : (
              <span style={{ color: '#94A3B8' }}>Unauthenticated Guest (Browsing Public Plan Comparison)</span>
            )}
          </div>
          <div style={{ color: '#94A3B8', fontSize: '0.82rem' }} id="membership-expiry-text">
            {mySubscription?.isActive && mySubscription.renewalDate ? (
              <>Renews: <strong style={{ color: '#10B981' }}>{new Date(mySubscription.renewalDate).toLocaleDateString()}</strong></>
            ) : mySubscription?.status === 'expired' && mySubscription.renewalDate ? (
              <>Expired: <strong style={{ color: '#FF0055' }}>{new Date(mySubscription.renewalDate).toLocaleDateString()}</strong></>
            ) : (
              <span>Instant activation upon upgrade</span>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '0.85rem 2.5rem',
              background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 0, 85, 0.15)',
              borderBottom: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 0, 85, 0.3)'}`,
              color: feedback.type === 'success' ? '#10B981' : '#FF0055',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
            id="plan-feedback-banner"
          >
            {feedback.message}
          </div>
        )}

        {/* Plans Grid (EP08-01, AC-27.1, AC-27.2) */}
        <div className={styles.content}>
          <div className={styles.plansGrid} id="subscription-plans-grid">
            {plans.map((plan) => {
              const current = isCurrentPlan(plan);
              const isSubscribing = subscribingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`${styles.planCard} ${
                    plan.isPopular ? styles.planPopular : plan.tier === 'ultimate' ? styles.planUltimate : ''
                  }`}
                  id={`plan-card-${plan.id}`}
                >
                  {plan.isPopular && (
                    <div className={styles.popularBadge} id="badge-popular-plan">
                      ★ MOST POPULAR
                    </div>
                  )}
                  {plan.tier === 'ultimate' && (
                    <div className={styles.ultimateBadge} id="badge-ultimate-plan">
                      👑 ULTIMATE TIER
                    </div>
                  )}

                  <div className={styles.planHeader}>
                    <h3 className={styles.planName}>{plan.name}</h3>
                    <div className={styles.priceBlock}>
                      <span className={styles.priceAmount}>{plan.priceFormatted}</span>
                      <span className={styles.priceInterval}>/ {plan.interval}</span>
                    </div>
                  </div>

                  <ul className={styles.featureList}>
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className={styles.featureItem}>
                        <span className={styles.featureCheck}>✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                    {plan.id === 'plan-free' && (
                      <>
                        <li className={styles.featureItem} style={{ color: '#64748B' }}>
                          <span className={styles.featureCross}>✕</span>
                          <span>Premium Titles (Solar Siege, Quantum Break)</span>
                        </li>
                        <li className={styles.featureItem} style={{ color: '#64748B' }}>
                          <span className={styles.featureCross}>✕</span>
                          <span>Priority Matchmaking Queues</span>
                        </li>
                      </>
                    )}
                  </ul>

                  <button
                    type="button"
                    className={`${styles.actionBtn} ${
                      current
                        ? styles.btnCurrent
                        : plan.tier === 'ultimate'
                        ? styles.btnUltimate
                        : plan.isPopular
                        ? styles.btnPrimary
                        : styles.btnSecondary
                    }`}
                    disabled={current || isSubscribing}
                    onClick={() => handleSubscribe(plan)}
                    id={`btn-plan-action-${plan.id}`}
                  >
                    {isSubscribing ? (
                      'Simulating Processing...'
                    ) : current ? (
                      '✓ Current Plan'
                    ) : !currentUser ? (
                      'Sign In to Upgrade'
                    ) : plan.id === 'plan-free' ? (
                      'Select Free Tier'
                    ) : (
                      `Simulate Upgrade to ${plan.name}`
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className={styles.footerNote}>
            <span>🔒 Sandbox Simulation Mode (Live Payment Integration Reserved for Sprint 12)</span>
            <span>⚡ Zero-Latency AI Matchmaking Included</span>
            <span>↺ Cancel Anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};
