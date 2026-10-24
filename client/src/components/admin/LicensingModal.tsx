import React, { useState } from 'react';
import styles from './LicensingModal.module.css';
import { AdminGame, LicensingStatus } from '../../types/admin';
import { getCsrfToken } from '../../utils/csrf';

interface LicensingModalProps {
  isOpen: boolean;
  game: AdminGame | null;
  onClose: () => void;
  onSuccess: (updatedGameId: string, newLicensingStatus: LicensingStatus, autoUnpublished: boolean) => void;
  onLog: (msg: string, type: 'green' | 'yellow' | 'rose' | 'blue' | 'dim') => void;
}

export const LicensingModal: React.FC<LicensingModalProps> = ({
  isOpen,
  game,
  onClose,
  onSuccess,
  onLog,
}) => {
  if (!isOpen || !game) return null;

  const currentStatus = (game.licensing ? game.licensing.status : 'pending') as LicensingStatus;
  const [status, setStatus] = useState<LicensingStatus>(currentStatus);
  const [notes, setNotes] = useState<string>(game.licensing?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect whether changing away from approved on a published game
  const willAutoUnpublish = currentStatus === 'approved' && status !== 'approved' && game.isPublished;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/admin/games/${game.id}/licensing`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ status, notes })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Failed to update licensing status`);
      }

      onLog(
        `Licensing clearance for "${game.title}" set to [${status.toUpperCase()}].${
          data.result.autoUnpublished ? ' Game auto-unpublished (AC-37.3).' : ''
        }`,
        status === 'approved' ? 'green' : 'yellow'
      );

      onSuccess(game.id, status, Boolean(data.result.autoUnpublished));
      onClose();
    } catch (err: any) {
      setError(err.message);
      onLog(`Licensing update error: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.tag}>EP10-03 • LICENSING APPROVAL CONTROL</span>
            <h3 className={styles.title}>Distribution Clearance Review</h3>
          </div>
          <button
            type="button"
            className={styles.btnClose}
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <div className={styles.gameSummary}>
            <span className={styles.gameName}>{game.title}</span>
            <span className={`${styles.pubBadge} ${game.isPublished ? styles.pubBadgePublished : styles.pubBadgeDraft}`}>
              {game.isPublished ? '● Published' : '○ Draft'}
            </span>
          </div>

          {error && (
            <div className={styles.warningBanner}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {willAutoUnpublish && (
            <div className={styles.warningBanner} id="licensingAutoUnpublishWarning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <div>
                <strong>AC-37.3 Policy Trigger:</strong> Revoking or changing licensing status away from <code>Approved</code> will automatically unpublish <strong>{game.title}</strong> and remove it from public catalog discovery.
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div className={styles.approvalBanner}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Status allows public catalog publication (AC-36.1, AC-37.2).</span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="licensingStatusSelect" className={styles.label}>
              Licensing Status
            </label>
            <select
              id="licensingStatusSelect"
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as LicensingStatus)}
            >
              <option value="approved">Approved (Distribution Authorized)</option>
              <option value="pending">Pending Review (Draft / In Evaluation)</option>
              <option value="rejected">Rejected (Rights / IP Issues)</option>
              <option value="suspended">Suspended (Temporary Legal Hold)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="licensingNotes" className={styles.label}>
              Auditor / Legal Notes
            </label>
            <textarea
              id="licensingNotes"
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record legal license agreement ID, publisher authorization date, or grounds for suspension..."
              rows={3}
            />
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={loading}
              id="btnCancelLicensing"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading}
              id="btnSaveLicensing"
            >
              {loading ? 'Saving...' : 'Apply Licensing Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
