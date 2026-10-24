import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './ContentAdminConsole.module.css';
import { AdminGame, AdminGameCategory, LicensingStatus } from '../../types/admin';
import { GameEditorModal } from './GameEditorModal';
import { LicensingModal } from './LicensingModal';
import { AuditTrailModal } from './AuditTrailModal';
import { getCsrfToken } from '../../utils/csrf';

interface ContentAdminConsoleProps {
  onLog: (msg: string, type: 'green' | 'yellow' | 'rose' | 'blue' | 'dim') => void;
}

export const ContentAdminConsole: React.FC<ContentAdminConsoleProps> = ({ onLog }) => {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [categories, setCategories] = useState<AdminGameCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [licensingFilter, setLicensingFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'suspended'>('all');

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<AdminGame | null>(null);

  const [isLicensingOpen, setIsLicensingOpen] = useState(false);
  const [licensingGame, setLicensingGame] = useState<AdminGame | null>(null);

  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/categories', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch games
  const fetchGames = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (selectedCategory !== 'all') queryParams.set('category', selectedCategory);
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);
      if (licensingFilter !== 'all') queryParams.set('licensingStatus', licensingFilter);
      queryParams.set('limit', '50');

      const res = await fetch(`/api/v1/admin/games?${queryParams.toString()}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setGames(data.games || []);
      onLog(`Admin Console: Loaded ${data.games.length} game records (draft + published).`, 'blue');
    } catch (err: any) {
      setErrorBanner(err.message);
      onLog(`Admin fetch error: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, statusFilter, licensingFilter, onLog]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = games.length;
    const published = games.filter((g) => g.isPublished).length;
    const drafts = total - published;
    const approvedLic = games.filter((g) => g.licensing?.status === 'approved').length;
    const pendingLic = games.filter((g) => g.licensing?.status === 'pending').length;
    return { total, published, drafts, approvedLic, pendingLic };
  }, [games]);

  // Handle Publish / Unpublish Toggle
  const handleTogglePublication = async (game: AdminGame) => {
    const targetStatus = !game.isPublished;
    setErrorBanner(null);

    try {
      const res = await fetch(`/api/v1/admin/games/${game.id}/publish`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ isPublished: targetStatus })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to update publication status.`);
      }

      // Update local state
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, isPublished: targetStatus } : g))
      );

      onLog(
        targetStatus
          ? `Game "${game.title}" published! Now visible in public catalog (AC-36.1).`
          : `Game "${game.title}" unpublished. Removed from public discovery (AC-36.2).`,
        targetStatus ? 'green' : 'yellow'
      );
    } catch (err: any) {
      setErrorBanner(err.message);
      onLog(`Publication operation blocked: ${err.message}`, 'rose');
    }
  };

  // Modals helpers
  const handleOpenCreate = () => {
    setEditingGame(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (game: AdminGame) => {
    setEditingGame(game);
    setIsEditorOpen(true);
  };

  const handleOpenLicensing = (game: AdminGame) => {
    setLicensingGame(game);
    setIsLicensingOpen(true);
  };

  const handleEditorSuccess = (savedGame: AdminGame, isCreate: boolean) => {
    if (isCreate) {
      setGames((prev) => [savedGame, ...prev]);
    } else {
      setGames((prev) => prev.map((g) => (g.id === savedGame.id ? savedGame : g)));
    }
  };

  const handleLicensingSuccess = (
    gameId: string,
    newStatus: LicensingStatus,
    autoUnpublished: boolean
  ) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id === gameId) {
          return {
            ...g,
            isPublished: autoUnpublished ? false : g.isPublished,
            licensing: {
              ...g.licensing,
              status: newStatus
            }
          };
        }
        return g;
      })
    );
  };

  return (
    <section className={styles.section} id="adminConsole">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.tagRow}>
          <div className={styles.tag}>SPRINT 03 • CONTENT ADMINISTRATION</div>
        </div>
        <h2 className={styles.title}>Game Operations & Licensing Console</h2>
        <p className={styles.subtitle}>
          Authorized administrative interface for catalog metadata registration, draft-versus-published separation, distribution licensing clearance, and security audit tracking.
        </p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardCyan}`}>
          <span className={styles.statLabel}>Total Library</span>
          <span className={styles.statValue} id="adminStatTotal">{stats.total}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardEmerald}`}>
          <span className={styles.statLabel}>Published Live</span>
          <span className={styles.statValue} id="adminStatPublished">{stats.published}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAmber}`}>
          <span className={styles.statLabel}>Draft Content</span>
          <span className={styles.statValue} id="adminStatDrafts">{stats.drafts}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardEmerald}`}>
          <span className={styles.statLabel}>Approved Licensing</span>
          <span className={styles.statValue} id="adminStatApprovedLic">{stats.approvedLic}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardPurple}`}>
          <span className={styles.statLabel}>Pending Clearance</span>
          <span className={styles.statValue} id="adminStatPendingLic">{stats.pendingLic}</span>
        </div>
      </div>

      {/* Alert Banner */}
      {errorBanner && (
        <div className={styles.alertBanner} id="adminAlertBanner">
          <div className={styles.alertContent}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            className={styles.btnDismiss}
            onClick={() => setErrorBanner(null)}
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          {/* Search */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon} aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              id="adminSearchInput"
              type="text"
              className={styles.searchInput}
              placeholder="Search by title, slug, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category Select */}
          <select
            id="adminCategoryFilter"
            className={styles.select}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Publication Filter */}
          <select
            id="adminStatusFilter"
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Statuses (Draft + Published)</option>
            <option value="published">Published Only</option>
            <option value="draft">Drafts Only</option>
          </select>

          {/* Licensing Filter */}
          <select
            id="adminLicensingFilter"
            className={styles.select}
            value={licensingFilter}
            onChange={(e) => setLicensingFilter(e.target.value as any)}
          >
            <option value="all">All Licensing States</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setIsAuditOpen(true)}
            id="btnOpenAuditTrail"
            title="Inspect audit trail of all mutations"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Audit Trail</span>
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={fetchGames}
            disabled={loading}
            id="btnRefreshAdminGames"
            title="Reload games inventory"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenCreate}
            id="btnRegisterNewGame"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Register New Game</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>Loading game administration inventory...</div>
        ) : games.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <strong>No games match your current filter criteria</strong>
            <span>Try resetting search query or status filters.</span>
          </div>
        ) : (
          <table className={styles.table} id="adminGamesTable">
            <thead>
              <tr>
                <th>Game Listing</th>
                <th>Category</th>
                <th>Configuration</th>
                <th>Publication State</th>
                <th>Licensing Approval</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} id={`adminGameRow-${game.id}`}>
                  {/* Title & Slug */}
                  <td>
                    <div className={styles.gameIdentity}>
                      <span className={styles.gameTitle}>
                        {game.title}
                        {game.isPremium && <span className={styles.vipBadge}>VIP</span>}
                        {game.supportsBots && <span className={styles.botBadge}>BOTS</span>}
                      </span>
                      <span className={styles.gameSlug}>/{game.slug}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {game.category ? game.category.name : 'Uncategorized'}
                    </span>
                  </td>

                  {/* Configuration */}
                  <td>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {game.minPlayers === game.maxPlayers
                        ? `${game.minPlayers}P`
                        : `${game.minPlayers}–${game.maxPlayers}P`}
                      {' • '}
                      {game.maxPlayers > 1 ? 'Multiplayer' : 'Solo'}
                    </span>
                  </td>

                  {/* Publication State */}
                  <td>
                    <span
                      className={`${styles.badgePill} ${
                        game.isPublished ? styles.badgePublished : styles.badgeDraft
                      }`}
                      id={`pubBadge-${game.id}`}
                    >
                      {game.isPublished ? '● Published' : '○ Draft'}
                    </span>
                  </td>

                  {/* Licensing Approval */}
                  <td>
                    <span
                      className={`${styles.badgePill} ${
                        game.licensing?.status === 'approved'
                          ? styles.licensingApproved
                          : game.licensing?.status === 'pending'
                          ? styles.licensingPending
                          : game.licensing?.status === 'rejected'
                          ? styles.licensingRejected
                          : styles.licensingSuspended
                      }`}
                      id={`licBadge-${game.id}`}
                    >
                      {game.licensing ? game.licensing.status.toUpperCase() : 'PENDING'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className={styles.actionsCell}>
                      {/* Edit Metadata */}
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleOpenEdit(game)}
                        id={`btnEditGame-${game.id}`}
                        title="Edit title, category, description, players (EP10-01)"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit</span>
                      </button>

                      {/* Licensing Clearance */}
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleOpenLicensing(game)}
                        id={`btnLicensingGame-${game.id}`}
                        title="Update distribution licensing approval status (EP10-03)"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span>Licensing</span>
                      </button>

                      {/* Publish / Unpublish */}
                      {game.isPublished ? (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnUnpublish}`}
                          onClick={() => handleTogglePublication(game)}
                          id={`btnTogglePublish-${game.id}`}
                          title="Unpublish game (EP10-02)"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          <span>Unpublish</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnPublish}`}
                          onClick={() => handleTogglePublication(game)}
                          id={`btnTogglePublish-${game.id}`}
                          title="Publish game (EP10-02, requires approved licensing)"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Publish</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <GameEditorModal
        isOpen={isEditorOpen}
        game={editingGame}
        categories={categories}
        onClose={() => setIsEditorOpen(false)}
        onSuccess={handleEditorSuccess}
        onLog={onLog}
      />

      <LicensingModal
        isOpen={isLicensingOpen}
        game={licensingGame}
        onClose={() => setIsLicensingOpen(false)}
        onSuccess={handleLicensingSuccess}
        onLog={onLog}
      />

      <AuditTrailModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        onLog={onLog}
      />
    </section>
  );
};
