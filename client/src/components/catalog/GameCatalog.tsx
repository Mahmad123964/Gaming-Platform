import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './GameCatalog.module.css';
import { Game, GameCategory, CatalogResponse, CategoriesResponse } from '../../types/catalog';
import { GameCard, GameCardSkeleton } from './GameCard';
import { GameDetailsModal } from './GameDetailsModal';
import { GamePlayerModal } from '../gamePlayer/GamePlayerModal';
import { ProgressHubModal } from '../progress/ProgressHubModal';

interface GameCatalogProps {
  onLog?: (msg: string, type?: 'dim' | 'green' | 'blue' | 'yellow' | 'rose') => void;
  onOpenMultiplayer?: (gameSlug: string) => void;
}

export const GameCatalog: React.FC<GameCatalogProps> = ({ onLog, onOpenMultiplayer }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('title:asc');
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal State for Game Details (AC-8.1 - AC-8.3)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // Sprint 04 & 05: Active Playable Session & Progress State (EP03-01, EP04-01, EP07-02)
  const [activePlayingSlug, setActivePlayingSlug] = useState<string | null>(null);
  const [resumePlaying, setResumePlaying] = useState<boolean>(false);
  const [isProgressHubOpen, setIsProgressHubOpen] = useState<boolean>(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Categories
  useEffect(() => {
    fetch('/api/v1/catalog/categories')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CategoriesResponse>;
      })
      .then((data) => {
        setCategories(data.categories || []);
      })
      .catch((err) => {
        console.error('Failed to load catalog categories:', err);
      });
  }, []);

  // Fetch Games with filters
  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('q', debouncedSearch.trim());
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (sortOption) params.append('sort', sortOption);
      params.append('limit', '24');

      const res = await fetch(`/api/v1/catalog/games?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CatalogResponse = await res.json();

      setGames(data.games || []);
      setTotalCount(data.pagination ? data.pagination.total : (data.games ? data.games.length : 0));

      if (onLog && (debouncedSearch || selectedCategory !== 'all')) {
        onLog(
          `Catalog query (search: "${debouncedSearch || '*'}", category: "${selectedCategory}") returned ${data.games.length} titles.`,
          'blue'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog');
      if (onLog) {
        onLog(`Catalog load error: ${err.message}`, 'rose');
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, sortOption, onLog]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleCardClick = (game: Game) => {
    setSelectedGame(game);
    setIsDetailsOpen(true);
    if (onLog) {
      onLog(`Opened game details for "${game.title}" (${game.access.label})`, 'dim');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    if (onLog) {
      onLog('Cleared catalog search and category filters (AC-7.3). Showing all published games.', 'dim');
    }
  };

  const isFilterActive = debouncedSearch.trim().length > 0 || selectedCategory !== 'all';

  return (
    <section className={styles.section} id="game-catalog" aria-label="Game Catalog Section">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.tagRow}>
          <span className={styles.tag}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="6" width="20" height="12" rx="4" />
              <line x1="6" y1="12" x2="10" y2="12" />
              <line x1="8" y1="10" x2="8" y2="14" />
              <circle cx="15" cy="11" r="1" />
              <circle cx="17" cy="13" r="1" />
            </svg>
            DISCOVERY ENGINE • SPRINT 02
          </span>
          <div className={styles.counterPill} id="catalog-count-pill">
            Showing <strong>{games.length}</strong> of <strong>{totalCount}</strong> published titles
          </div>
          <button
            type="button"
            className={styles.stateActionBtn}
            id="btn-open-career-hub"
            onClick={() => setIsProgressHubOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.15), rgba(0, 240, 255, 0.1))',
              border: '1px solid rgba(255, 184, 0, 0.4)',
              color: '#FFB800',
              borderRadius: '999px',
              cursor: 'pointer',
              fontWeight: 700,
              marginLeft: 'auto'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2" />
            </svg>
            Career & Milestones (Sprint 05)
          </button>
        </div>

        <h2 className={styles.title}>Obsidian Arcade Catalog</h2>
        <p className={styles.subtitle}>
          Explore authorized browser games engineered with instant loading, single-player and multiplayer modes, and Obsidian VIP access tiers.
        </p>
      </div>

      {/* Controls Container */}
      <div className={styles.controlsContainer}>
        {/* Search & Sort Row */}
        <div className={styles.searchSortRow}>
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              id="game-search-input"
              placeholder="Search published games by title (e.g. Cyber, Chess, Grid)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search games by title"
            />
            {searchTerm && (
              <button
                className={styles.clearSearchBtn}
                id="btn-clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.sortBox}>
            <label htmlFor="catalog-sort-select" className={styles.sortLabel}>Sort by</label>
            <select
              id="catalog-sort-select"
              className={styles.sortSelect}
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              aria-label="Sort catalog games"
            >
              <option value="title:asc">Title (A – Z)</option>
              <option value="title:desc">Title (Z – A)</option>
              <option value="created_at:desc">Newest Releases</option>
              <option value="players:desc">Player Capacity</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs (AC-7.1 - AC-7.3) */}
        <div className={styles.categoryTabs} role="tablist" aria-label="Game Categories">
          <button
            role="tab"
            aria-selected={selectedCategory === 'all'}
            className={`${styles.categoryTab} ${selectedCategory === 'all' ? styles.categoryTabActive : ''}`}
            id="cat-tab-all"
            onClick={() => setSelectedCategory('all')}
          >
            All Games
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={selectedCategory === cat.slug}
              className={`${styles.categoryTab} ${selectedCategory === cat.slug ? styles.categoryTabActive : ''}`}
              id={`cat-tab-${cat.slug}`}
              onClick={() => setSelectedCategory(cat.slug)}
            >
              {cat.name} {cat.published_game_count !== undefined ? `(${cat.published_game_count})` : ''}
            </button>
          ))}
        </div>

        {/* Active Filter Status & Reset Action (AC-7.3) */}
        {isFilterActive && (
          <div className={styles.filterStatusRow} id="catalog-active-filters">
            <span>
              Filtering by:{' '}
              {debouncedSearch && <strong>Search: "{debouncedSearch}" </strong>}
              {selectedCategory !== 'all' && <strong>Category: {selectedCategory} </strong>}
            </span>
            <button
              className={styles.resetFiltersBtn}
              id="btn-reset-filters"
              onClick={handleClearFilters}
            >
              Clear all filters (AC-7.3)
            </button>
          </div>
        )}
      </div>

      {/* Games Grid / States */}
      <div className={styles.gamesGrid} id="games-grid" aria-live="polite">
        {loading ? (
          // Skeleton Loading State
          Array.from({ length: 4 }).map((_, idx) => (
            <GameCardSkeleton key={`skeleton-${idx}`} />
          ))
        ) : error ? (
          // Error State
          <div className={styles.stateBox} id="catalog-error-state">
            <svg className={styles.stateIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-rose)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 className={styles.stateTitle}>Catalog Service Error</h3>
            <p className={styles.stateDesc}>{error}</p>
            <button className={styles.stateActionBtn} onClick={fetchGames}>Retry Probe</button>
          </div>
        ) : games.length === 0 ? (
          // Empty State or No Results State (AC-5.3, AC-6.2, AC-7.2)
          <div className={styles.stateBox} id="catalog-empty-state">
            <svg className={styles.stateIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h3 className={styles.stateTitle}>
              {isFilterActive ? 'No Matching Games Found' : 'No Published Games Available'}
            </h3>
            <p className={styles.stateDesc}>
              {isFilterActive
                ? `No published titles match your active filter criteria (search: "${debouncedSearch || 'none'}", category: "${selectedCategory}"). Try adjusting keywords or clearing category filters.`
                : 'The game catalog currently has no published titles available for public gameplay (AC-5.3). Check back shortly.'}
            </p>
            {isFilterActive && (
              <button className={styles.stateActionBtn} id="btn-empty-clear-filters" onClick={handleClearFilters}>
                Clear Active Filters (AC-7.3)
              </button>
            )}
          </div>
        ) : (
          // Published Games List (AC-5.1)
          games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onClick={handleCardClick}
            />
          ))
        )}
      </div>

      {/* Game Details Modal (AC-8.1, AC-8.2, AC-8.3, AC-24.1) */}
      <GameDetailsModal
        game={selectedGame}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedGame(null);
        }}
        onLaunch={(slugOrId, resume) => {
          setIsDetailsOpen(false);
          setResumePlaying(!!resume);
          setActivePlayingSlug(slugOrId);
        }}
        onOpenMultiplayer={onOpenMultiplayer}
        onLog={onLog}
      />

      {/* Progress Hub Modal (Sprint 05: EP07-01, EP07-02, EP07-03, EP07-04) */}
      <ProgressHubModal
        isOpen={isProgressHubOpen}
        onClose={() => setIsProgressHubOpen(false)}
        onResumeGame={(slug) => {
          setIsProgressHubOpen(false);
          setResumePlaying(true);
          setActivePlayingSlug(slug);
        }}
        onLog={onLog}
      />

      {/* Game Player Runtime Modal (Sprint 04 & 05: EP03-01, EP03-03, EP04-01, EP07-01, EP07-02) */}
      {activePlayingSlug && (
        <GamePlayerModal
          gameIdOrSlug={activePlayingSlug}
          resume={resumePlaying}
          onClose={() => {
            setActivePlayingSlug(null);
            setResumePlaying(false);
          }}
          onLog={onLog}
        />
      )}
    </section>
  );
};
