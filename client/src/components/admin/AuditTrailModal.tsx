import React, { useState, useEffect, useCallback } from 'react';
import styles from './AuditTrailModal.module.css';
import { AuditEvent } from '../../types/admin';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (msg: string, type: 'green' | 'yellow' | 'rose' | 'blue' | 'dim') => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  onLog,
}) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/audit-events?limit=50', {
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch audit events');
      }
      setEvents(data.events || []);
      onLog(`Audit log refreshed: ${data.events.length} records retrieved`, 'blue');
    } catch (err: any) {
      setError(err.message);
      onLog(`Audit query error: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  }, [onLog]);

  useEffect(() => {
    if (isOpen) {
      fetchAuditEvents();
    }
  }, [isOpen, fetchAuditEvents]);

  if (!isOpen) return null;

  const getPillClass = (action: string) => {
    switch (action) {
      case 'GAME_CREATED':
        return styles.pillCreate;
      case 'GAME_PUBLISHED':
        return styles.pillPublish;
      case 'GAME_UNPUBLISHED':
        return styles.pillUnpublish;
      case 'ACCESS_DENIED':
        return styles.pillDeny;
      case 'LICENSING_UPDATED':
        return styles.pillLicensing;
      default:
        return styles.pillDefault;
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.tag}>EP11-02 • ADMINISTRATIVE AUDIT TRAIL</span>
            <h3 className={styles.title}>System Mutation & Security Log</h3>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.btnRefresh}
              onClick={fetchAuditEvents}
              disabled={loading}
              id="btnRefreshAudit"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              <span>Refresh</span>
            </button>
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
        </div>

        <div className={styles.body}>
          {error && (
            <div style={{ color: '#ff3366', fontSize: '0.85rem' }}>
              Error: {error}
            </div>
          )}

          {loading ? (
            <div className={styles.emptyState}>Loading audit records...</div>
          ) : events.length === 0 ? (
            <div className={styles.emptyState}>No administrative mutations recorded yet.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target Resource</th>
                    <th>Mutation Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ whiteSpace: 'nowrap', color: '#94a3b8' }}>
                        {new Date(ev.createdAt).toLocaleTimeString()} {new Date(ev.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`${styles.actionPill} ${getPillClass(ev.action)}`}>
                          {ev.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {ev.actorName} {ev.actorRole ? `(${ev.actorRole})` : ''}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                        {ev.resource}
                      </td>
                      <td>
                        <div className={styles.detailsCode} title={JSON.stringify(ev.details, null, 2)}>
                          {JSON.stringify(ev.details)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
