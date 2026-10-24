import React from 'react';
import styles from './GameCard.module.css';
import { Game } from '../../types/catalog';

interface GameCardProps {
  game: Game;
  onClick: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const isPremium = game.isPremium;

  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.card}
      id={`game-card-${game.slug}`}
      onClick={() => onClick(game)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(game);
        }
      }}
      aria-label={`${game.title} - ${game.category?.name || 'Game'} - ${isPremium ? 'Obsidian VIP' : 'Free to Play'}`}
    >
      <div className={styles.coverContainer}>
        {/* Tier badge: Free vs Premium */}
        <span className={`${styles.tierBadge} ${isPremium ? styles.tierPremium : styles.tierFree}`}>
          {isPremium ? 'Obsidian VIP' : 'Free to Play'}
        </span>

        {/* Category tag */}
        {game.category && (
          <span className={styles.categoryBadge}>
            {game.category.name}
          </span>
        )}

        {/* Dynamic Glowing Cover Emblem */}
        <div className={styles.coverArtwork}>
          <svg className={styles.coverIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {game.category?.slug === 'puzzle' ? (
              <path d="M19.5 12c0-1.2-1-2-2.2-2H16V6.7C16 5.5 15 4.5 13.8 4.5c-1.2 0-2.2 1-2.2 2.2v3.3H8.3C7.1 10 6.1 11 6.1 12.2c0 1.2 1 2.2 2.2 2.2h3.3v3.3c0 1.2 1 2.2 2.2 2.2 1.2 0 2.2-1 2.2-2.2V14.4h1.3c1.2 0 2.2-1 2.2-2.4z" />
            ) : game.category?.slug === 'strategy' ? (
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            ) : game.category?.slug === 'card' ? (
              <path d="M4 4h16v16H4z M9 9h6v6H9z" />
            ) : game.category?.slug === 'action' ? (
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            ) : (
              <rect x="2" y="6" width="20" height="12" rx="4" />
            )}
          </svg>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{game.title}</h3>
        <p className={styles.description}>{game.description}</p>

        <div className={styles.metaRow}>
          <div className={styles.modeBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              {game.maxPlayers > 1 && (
                <>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </>
              )}
            </svg>
            <span>{game.mode.label}</span>
          </div>

          {game.supportsBots && (
            <span className={styles.botBadge}>AI Bots</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const GameCardSkeleton: React.FC = () => {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.skeletonCover} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonDesc} />
        <div className={styles.skeletonDesc} style={{ width: '75%' }} />
        <div className={styles.skeletonMeta} />
      </div>
    </div>
  );
};
