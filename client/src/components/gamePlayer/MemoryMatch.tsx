import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './MemoryMatch.module.css';

export interface MemoryMatchRef {
  restart: () => void;
  getScore: () => number;
}

interface MemoryMatchProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

interface CardItem {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const SYMBOLS = ['🚀', '⚡', '💎', '🔮', '👾', '🛡️', '🧬', '🤖'];

export const MemoryMatch = forwardRef<MemoryMatchRef, MemoryMatchProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [score, setScore] = useState<number>(initialScore);
  const [matchesCount, setMatchesCount] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);

  const initGame = useCallback(() => {
    // Generate 8 pairs of symbols (16 cards total)
    const deckSymbols = [...SYMBOLS, ...SYMBOLS];
    // Fisher-Yates shuffle
    for (let i = deckSymbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deckSymbols[i], deckSymbols[j]] = [deckSymbols[j], deckSymbols[i]];
    }

    const newDeck: CardItem[] = deckSymbols.map((sym, idx) => ({
      id: idx,
      symbol: sym,
      isFlipped: false,
      isMatched: false
    }));

    setCards(newDeck);
    setSelectedCards([]);
    setMoves(0);
    setScore(0);
    setMatchesCount(0);
    setIsWon(false);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart: initGame,
    getScore: () => score
  }), [initGame, score]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCardClick = (id: number) => {
    if (selectedCards.length >= 2 || isWon) return;

    const clickedCard = cards.find(c => c.id === id);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    // Flip clicked card
    const updatedCards = cards.map(c => c.id === id ? { ...c, isFlipped: true } : c);
    setCards(updatedCards);

    const newSelected = [...selectedCards, id];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newSelected;
      const firstCard = updatedCards.find(c => c.id === firstId)!;
      const secondCard = updatedCards.find(c => c.id === secondId)!;

      if (firstCard.symbol === secondCard.symbol) {
        // MATCH!
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === firstId || c.id === secondId) ? { ...c, isMatched: true } : c));
          setSelectedCards([]);
          const newScore = score + 30;
          setScore(newScore);
          onScoreUpdate?.(newScore);

          const newMatches = matchesCount + 1;
          setMatchesCount(newMatches);

          if (newMatches === 8) {
            setIsWon(true);
            onGameOver?.(newScore);
          }
        }, 300);
      } else {
        // MISMATCH -> flip back after brief reveal
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === firstId || c.id === secondId) ? { ...c, isFlipped: false } : c));
          setSelectedCards([]);
        }, 700);
      }
    }
  };

  return (
    <div className={styles.container} id="game-memory-match">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>MEMORY MATCH</h3>
          <span>Cognitive Neural Matrix</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>MOVES</span>
            <span className={styles.statValue} id="val-memory-moves">{moves}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-memory-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.gridArea} id="grid-memory-cards">
        {cards.map(card => {
          const isRevealed = card.isFlipped || card.isMatched;
          return (
            <button
              key={card.id}
              className={`${styles.card} ${card.isFlipped ? styles.cardFlipped : ''} ${card.isMatched ? styles.cardMatched : ''}`}
              onClick={() => handleCardClick(card.id)}
              disabled={isRevealed || selectedCards.length >= 2}
              id={`card-memory-${card.id}`}
              aria-label={`Memory card ${card.id}`}
            >
              {isRevealed ? (
                <span>{card.symbol}</span>
              ) : (
                <span className={styles.cardBack}>?</span>
              )}
            </button>
          );
        })}
      </div>

      {isWon && (
        <div style={{ marginTop: '12px', textAlign: 'center', color: '#10B981', fontWeight: 800 }} id="memory-victory-banner">
          🎉 MATRIX SYNCHRONIZED! ALL 8 PAIRS MATCHED!
        </div>
      )}

      <div className={styles.footer}>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Find all 8 matching pairs • Tap any card to flip
        </div>
        <button
          className={styles.restartButton}
          onClick={initGame}
          id="btn-memory-restart"
        >
          Shuffle Deck
        </button>
      </div>
    </div>
  );
});

MemoryMatch.displayName = 'MemoryMatch';
