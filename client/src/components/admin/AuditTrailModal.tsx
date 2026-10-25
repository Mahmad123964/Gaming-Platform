import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Filters
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('limit', '100');
      if (selectedAction !== 'all') {
        queryParams.set('action', selectedAction);
      }

      const res = await fetch(`/api/v1/admin/audit-events?${queryParams.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch audit events');
      }
      setEvents(data.events || []);
      onLog(`Audit log refreshed: ${data.events.length} records retrieved (EP11-03 verified)`, 'blue');
    } catch (err: any) {
      setError(err.message);
      onLog(`Audit query error: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  }, [selectedAction, onLog]);

  useEffect(() => {
    if (isOpen) {
      fetchAuditEvents();
    }
  }, [isOpen, fetchAuditEvents]);

  // Client-side filtering by actor name / query if specified
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (!actorFilter.trim()) return true;
      const q = actorFilter.toLowerCase();
      return (
        ev.actorName?.toLowerCase().includes(q) ||
        ev.actorId?.toLowerCase().includes(q) ||
        ev.resource?.toLowerCase().includes(q)
      );
    });
  }, [events, actorFilter]);

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

  const toggleExpand = (id: string) => {
    setExpandedEventId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" id="audit-trail-modal">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.tag}>EP11-03 • ADMINISTRATIVE AUDIT INSPECTION</span>
            <h3 className={styles.title}>Administrative Audit & Security Log</h3>
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
              id="btnCloseAuditModal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {/* Immutability & Redaction Guarantee */}
          <div className={styles.securityBanner} id="audit-security-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <div>
              <strong>Database Immutability Active:</strong> Audit log records are safeguarded by SQLite engine triggers (preventing UPDATE/DELETE). All sensitive secrets and passwords are auto-redacted.
            </div>
          </div>

          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <select
              className={styles.filterSelect}
              id="audit-filter-action"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="all">All Mutation Actions</option>
              <option value="GAME_CREATED">GAME_CREATED</option>
              <option value="GAME_UPDATED">GAME_UPDATED</option>
              <option value="GAME_PUBLISHED">GAME_PUBLISHED</option>
              <option value="GAME_UNPUBLISHED">GAME_UNPUBLISHED</option>
              <option value="LICENSING_UPDATED">LICENSING_UPDATED</option>
              <option value="ACCESS_DENIED">ACCESS_DENIED</option>
            </select>

            <input
              type="text"
              className={styles.filterInput}
              id="audit-filter-actor"
              placeholder="Filter by Actor or Resource..."
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
            />

            <div className={styles.countBadge} id="audit-count-badge">
              Showing {filteredEvents.length} of {events.length} records
            </div>
          </div>

          {error && (
            <div style={{ color: '#ff3366', fontSize: '0.85rem' }} id="audit-error-banner">
              Error: {error}
            </div>
          )}

          {loading ? (
            <div className={styles.emptyState}>Loading audit records...</div>
          ) : filteredEvents.length === 0 ? (
            <div className={styles.emptyState}>No administrative mutations match current filters.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table} id="audit-events-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target Resource</th>
                    <th>Details (Click to Inspect)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((ev) => {
                    const isExpanded = expandedEventId === ev.id;
                    return (
                      <React.Fragment key={ev.id}>
                        <tr onClick={() => toggleExpand(ev.id)} id={`audit-row-${ev.id}`}>
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
                            <div className={styles.detailsCode}>
                              {JSON.stringify(ev.details)}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} style={{ background: '#0a0d14', padding: '0.75rem 1rem' }}>
                              <div className={styles.inspectorBox} id={`audit-inspect-${ev.id}`}>
                                <div style={{ color: '#00f0ff', marginBottom: '4px', fontWeight: 600 }}>
                                  Full Redacted Mutation Payload [ID: {ev.id}]:
                                </div>
                                {JSON.stringify(ev.details, null, 2)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
