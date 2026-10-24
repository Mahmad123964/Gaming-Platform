import React, { useState, useEffect } from 'react';
import styles from './GameEditorModal.module.css';
import { AdminGame, AdminGameCategory } from '../../types/admin';
import { getCsrfToken } from '../../utils/csrf';

interface GameEditorModalProps {
  isOpen: boolean;
  game: AdminGame | null; // null for Create mode, AdminGame for Edit mode
  categories: AdminGameCategory[];
  onClose: () => void;
  onSuccess: (savedGame: AdminGame, isCreate: boolean) => void;
  onLog: (msg: string, type: 'green' | 'yellow' | 'rose' | 'blue' | 'dim') => void;
}

export const GameEditorModal: React.FC<GameEditorModalProps> = ({
  isOpen,
  game,
  categories,
  onClose,
  onSuccess,
  onLog,
}) => {
  const isCreate = !game;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [launchUrl, setLaunchUrl] = useState('');
  const [minPlayers, setMinPlayers] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(1);
  const [isPremium, setIsPremium] = useState(false);
  const [supportsBots, setSupportsBots] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (game) {
      setTitle(game.title);
      setSlug(game.slug);
      setCategoryId(game.category ? game.category.id : '');
      setDescription(game.description);
      setLaunchUrl(game.launchUrl);
      setMinPlayers(game.minPlayers);
      setMaxPlayers(game.maxPlayers);
      setIsPremium(game.isPremium);
      setSupportsBots(game.supportsBots);
    } else {
      setTitle('');
      setSlug('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setDescription('');
      setLaunchUrl('/games/new-game/index.html');
      setMinPlayers(1);
      setMaxPlayers(1);
      setIsPremium(false);
      setSupportsBots(false);
    }
    setFieldErrors({});
    setGeneralError(null);
  }, [game, categories, isOpen]);

  if (!isOpen) return null;

  // Auto-generate slug from title
  const handleAutoSlug = () => {
    const generated = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(generated);
    if (fieldErrors.slug) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.slug;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const payload = {
      title,
      slug,
      categoryId,
      description,
      launchUrl,
      minPlayers,
      maxPlayers,
      isPremium,
      supportsBots
    };

    const endpoint = isCreate ? '/api/v1/admin/games' : `/api/v1/admin/games/${game.id}`;
    const method = isCreate ? 'POST' : 'PUT';

    try {
      const res = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.validationErrors) {
          setFieldErrors(data.validationErrors);
        }
        throw new Error(data.message || `Request failed with HTTP ${res.status}`);
      }

      onLog(
        isCreate
          ? `Game registered: "${data.game.title}" (draft pending licensing approval)`
          : `Game metadata updated: "${data.game.title}"`,
        'green'
      );
      onSuccess(data.game, isCreate);
      onClose();
    } catch (err: any) {
      setGeneralError(err.message);
      onLog(`Admin error: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.tag}>
              {isCreate ? 'EP03-02 • NEW GAME REGISTRATION' : 'EP10-01 • EDIT GAME METADATA'}
            </span>
            <h3 className={styles.title}>
              {isCreate ? 'Register Game Launch & Metadata' : `Edit "${game.title}"`}
            </h3>
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
          {isCreate && (
            <div className={styles.infoBanner}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>
                New games are registered as <strong>Drafts (Unpublished)</strong> with <strong>Pending Licensing</strong>. They will not be visible in the public catalog until approved and published.
              </span>
            </div>
          )}

          {generalError && (
            <div className={styles.globalError}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span>{generalError}</span>
            </div>
          )}

          <div className={styles.formGrid}>
            {/* Title */}
            <div className={styles.formGroup}>
              <label htmlFor="adminGameTitle" className={styles.label}>
                Game Title <span className={styles.reqStar}>*</span>
              </label>
              <input
                id="adminGameTitle"
                type="text"
                className={`${styles.input} ${fieldErrors.title ? styles.inputError : ''}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Neon Horizon"
                required
              />
              {fieldErrors.title && <span className={styles.errorText}>{fieldErrors.title}</span>}
            </div>

            {/* Slug */}
            <div className={styles.formGroup}>
              <label htmlFor="adminGameSlug" className={styles.label}>
                <span>Game Slug <span className={styles.reqStar}>*</span></span>
                <button
                  type="button"
                  className={styles.helperAction}
                  onClick={handleAutoSlug}
                  title="Generate slug from title"
                >
                  Generate from title
                </button>
              </label>
              <input
                id="adminGameSlug"
                type="text"
                className={`${styles.input} ${fieldErrors.slug ? styles.inputError : ''}`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. neon-horizon"
                required
              />
              {fieldErrors.slug && <span className={styles.errorText}>{fieldErrors.slug}</span>}
            </div>

            {/* Category */}
            <div className={styles.formGroup}>
              <label htmlFor="adminGameCategory" className={styles.label}>
                Category <span className={styles.reqStar}>*</span>
              </label>
              <select
                id="adminGameCategory"
                className={`${styles.select} ${fieldErrors.categoryId ? styles.inputError : ''}`}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="" disabled>Select a category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && <span className={styles.errorText}>{fieldErrors.categoryId}</span>}
            </div>

            {/* Launch URL */}
            <div className={styles.formGroup}>
              <label htmlFor="adminGameLaunchUrl" className={styles.label}>
                Launch URL <span className={styles.reqStar}>*</span>
              </label>
              <input
                id="adminGameLaunchUrl"
                type="text"
                className={`${styles.input} ${fieldErrors.launchUrl ? styles.inputError : ''}`}
                value={launchUrl}
                onChange={(e) => setLaunchUrl(e.target.value)}
                placeholder="e.g. /games/neon-horizon/index.html"
                required
              />
              {fieldErrors.launchUrl && <span className={styles.errorText}>{fieldErrors.launchUrl}</span>}
            </div>

            {/* Description */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label htmlFor="adminGameDescription" className={styles.label}>
                <span>Description <span className={styles.reqStar}>*</span></span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {description.length}/1000 characters
                </span>
              </label>
              <textarea
                id="adminGameDescription"
                className={`${styles.textarea} ${fieldErrors.description ? styles.inputError : ''}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter rich gameplay description, mechanics, and objectives (10 - 1000 characters)..."
                rows={3}
                required
              />
              {fieldErrors.description && <span className={styles.errorText}>{fieldErrors.description}</span>}
            </div>

            {/* Min Players */}
            <div className={styles.formGroup}>
              <label htmlFor="adminGameMinPlayers" className={styles.label}>
                Min Players <span className={styles.reqStar}>*</span>
              </label>
              <input
                id="adminGameMinPlayers"
                type="number"
                min="1"
                max="32"
                className={`${styles.input} ${fieldErrors.minPlayers ? styles.inputError : ''}`}
                value={minPlayers}
                onChange={(e) => setMinPlayers(parseInt(e.target.value, 10) || 1)}
                required
              />
              {fieldErrors.minPlayers && <span className={styles.errorText}>{fieldErrors.minPlayers}</span>}
            </div>

            {/* Max Players */}
            <div className={styles.formGroup}>
              <label htmlFor="adminGameMaxPlayers" className={styles.label}>
                Max Players <span className={styles.reqStar}>*</span>
              </label>
              <input
                id="adminGameMaxPlayers"
                type="number"
                min={minPlayers}
                max="32"
                className={`${styles.input} ${fieldErrors.maxPlayers ? styles.inputError : ''}`}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10) || 1)}
                required
              />
              {fieldErrors.maxPlayers && <span className={styles.errorText}>{fieldErrors.maxPlayers}</span>}
            </div>

            {/* Premium Tier Checkbox */}
            <label className={styles.checkboxGroup}>
              <input
                id="adminGameIsPremium"
                type="checkbox"
                className={styles.checkbox}
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>Obsidian VIP Exclusive (Premium Tier)</span>
            </label>

            {/* Bot Support Checkbox */}
            <label className={styles.checkboxGroup}>
              <input
                id="adminGameSupportsBots"
                type="checkbox"
                className={styles.checkbox}
                checked={supportsBots}
                onChange={(e) => setSupportsBots(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>Supports AI Bot Players</span>
            </label>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={loading}
              id="btnCancelGameEditor"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading}
              id="btnSaveGameMetadata"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{isCreate ? 'Register Game Record' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
