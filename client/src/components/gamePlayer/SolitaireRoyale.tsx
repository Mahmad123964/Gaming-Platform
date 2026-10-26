import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './SolitaireRoyale.module.css';

export interface SolitaireRoyaleRef {
  restart: () => void;
  getScore: () => number;
}

interface SolitaireRoyaleProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
}

type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
interface Card {
  id: string;
  suit: Suit;
  value: number; // 1 (Ace) to 13 (King)
  isFaceUp: boolean;
}

const SUIT_ICONS: Record<Suit, string> = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠'
};

const VALUE_NAMES: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
};

export const SolitaireRoyale = forwardRef<SolitaireRoyaleRef, SolitaireRoyaleProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart
}, ref) => {
  // Create shuffled deck of 52 cards
  const createDeck = (): Card[] => {
    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    const cards: Card[] = [];
    for (const suit of suits) {
      for (let v = 1; v <= 13; v++) {
        cards.push({
          id: `${suit}-${v}`,
          suit,
          value: v,
          isFaceUp: false
        });
      }
    }
    // Fisher-Yates Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };

  // State setup
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [tableaus, setTableaus] = useState<Card[][]>([[], [], [], [], [], [], []]);
  const [score, setScore] = useState<number>(initialScore);
  const [moves, setMoves] = useState<number>(0);

  // Initialize new game
  const initGame = useCallback(() => {
    const deck = createDeck();
    const newTableaus: Card[][] = [[], [], [], [], [], [], []];

    let deckIdx = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[deckIdx++];
        if (row === col) card.isFaceUp = true;
        newTableaus[col].push(card);
      }
    }

    setTableaus(newTableaus);
    setStock(deck.slice(deckIdx));
    setWaste([]);
    setFoundations([[], [], [], []]);
    setScore(0);
    setMoves(0);
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useImperativeHandle(ref, () => ({
    restart: initGame,
    getScore: () => score
  }), [initGame, score]);

  // Click stockpile
  const handleStockClick = () => {
    if (stock.length === 0) {
      // Recycle waste
      if (waste.length > 0) {
        setStock(waste.map(c => ({ ...c, isFaceUp: false })).reverse());
        setWaste([]);
        setMoves(m => m + 1);
      }
      return;
    }

    const nextCard = { ...stock[stock.length - 1], isFaceUp: true };
    setStock(stock.slice(0, stock.length - 1));
    setWaste([...waste, nextCard]);
    setMoves(m => m + 1);
  };

  // Check if card can be placed on foundation
  const tryMoveToFoundation = (card: Card): boolean => {
    for (let fIdx = 0; fIdx < 4; fIdx++) {
      const pile = foundations[fIdx];
      if (pile.length === 0) {
        if (card.value === 1) { // Ace starts foundation
          const newF = [...foundations];
          newF[fIdx] = [card];
          setFoundations(newF);
          setScore(s => {
            const upd = s + 15;
            onScoreUpdate?.(upd);
            return upd;
          });
          return true;
        }
      } else {
        const top = pile[pile.length - 1];
        if (top.suit === card.suit && top.value + 1 === card.value) {
          const newF = [...foundations];
          newF[fIdx] = [...pile, card];
          setFoundations(newF);
          setScore(s => {
            const upd = s + 15;
            onScoreUpdate?.(upd);
            return upd;
          });
          return true;
        }
      }
    }
    return false;
  };

  // Move from waste
  const handleWasteCardClick = () => {
    if (waste.length === 0) return;
    const card = waste[waste.length - 1];

    // Try foundation first
    if (tryMoveToFoundation(card)) {
      setWaste(waste.slice(0, waste.length - 1));
      setMoves(m => m + 1);
      return;
    }

    // Try tableaus
    for (let t = 0; t < 7; t++) {
      const col = tableaus[t];
      if (col.length === 0) {
        if (card.value === 13) { // King on empty
          const newT = [...tableaus];
          newT[t] = [card];
          setTableaus(newT);
          setWaste(waste.slice(0, waste.length - 1));
          setMoves(m => m + 1);
          setScore(s => s + 5);
          return;
        }
      } else {
        const top = col[col.length - 1];
        const isOppColor = (['HEARTS', 'DIAMONDS'].includes(card.suit) && ['CLUBS', 'SPADES'].includes(top.suit)) ||
                           (['CLUBS', 'SPADES'].includes(card.suit) && ['HEARTS', 'DIAMONDS'].includes(top.suit));
        if (isOppColor && top.value === card.value + 1) {
          const newT = [...tableaus];
          newT[t] = [...col, card];
          setTableaus(newT);
          setWaste(waste.slice(0, waste.length - 1));
          setMoves(m => m + 1);
          setScore(s => s + 5);
          return;
        }
      }
    }
  };

  // Click card on tableau column
  const handleTableauCardClick = (colIdx: number, cardIdx: number) => {
    const col = tableaus[colIdx];
    const card = col[cardIdx];
    if (!card.isFaceUp) return;

    // If it's the top card, try foundation
    if (cardIdx === col.length - 1) {
      if (tryMoveToFoundation(card)) {
        const newCol = col.slice(0, col.length - 1);
        if (newCol.length > 0) newCol[newCol.length - 1].isFaceUp = true;
        const newT = [...tableaus];
        newT[colIdx] = newCol;
        setTableaus(newT);
        setMoves(m => m + 1);
        return;
      }
    }

    // Try moving stack to another column
    const stack = col.slice(cardIdx);
    const movingBase = stack[0];

    for (let t = 0; t < 7; t++) {
      if (t === colIdx) continue;
      const targetCol = tableaus[t];

      if (targetCol.length === 0) {
        if (movingBase.value === 13) {
          const newSource = col.slice(0, cardIdx);
          if (newSource.length > 0) newSource[newSource.length - 1].isFaceUp = true;
          const newT = [...tableaus];
          newT[colIdx] = newSource;
          newT[t] = stack;
          setTableaus(newT);
          setMoves(m => m + 1);
          setScore(s => s + 5);
          return;
        }
      } else {
        const targetTop = targetCol[targetCol.length - 1];
        const isOppColor = (['HEARTS', 'DIAMONDS'].includes(movingBase.suit) && ['CLUBS', 'SPADES'].includes(targetTop.suit)) ||
                           (['CLUBS', 'SPADES'].includes(movingBase.suit) && ['HEARTS', 'DIAMONDS'].includes(targetTop.suit));
        if (isOppColor && targetTop.value === movingBase.value + 1) {
          const newSource = col.slice(0, cardIdx);
          if (newSource.length > 0) newSource[newSource.length - 1].isFaceUp = true;
          const newT = [...tableaus];
          newT[colIdx] = newSource;
          newT[t] = [...targetCol, ...stack];
          setTableaus(newT);
          setMoves(m => m + 1);
          setScore(s => s + 5);
          return;
        }
      }
    }
  };

  const topWaste = waste.length > 0 ? waste[waste.length - 1] : null;

  return (
    <div className={styles.container} id="game-solitaire-royale">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>SOLITAIRE ROYALE</h3>
          <span>Classic Klondike Rules</span>
        </div>
        <div className={styles.statsArea}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>MOVES</span>
            <span className={styles.statValue} id="val-solitaire-moves">{moves}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue} id="val-solitaire-score">{score}</span>
          </div>
        </div>
      </div>

      <div className={styles.feltArea} id="solitaire-felt-area">
        {/* Top Row: Stock, Waste, and 4 Foundations */}
        <div className={styles.topRow}>
          <div className={styles.stockAndWaste}>
            {/* Stockpile */}
            <div
              className={`${styles.cardSlot} ${stock.length > 0 ? styles.cardBack : ''}`}
              onClick={handleStockClick}
              id="stockpile-btn"
              title="Click to deal cards"
            >
              {stock.length === 0 ? '↺' : ''}
            </div>

            {/* Waste Pile */}
            <div
              className={styles.cardSlot}
              onClick={handleWasteCardClick}
              id="waste-card-slot"
            >
              {topWaste && (
                <div
                  className={`${styles.card} ${['HEARTS', 'DIAMONDS'].includes(topWaste.suit) ? styles.cardRed : styles.cardBlack}`}
                  id="waste-card"
                >
                  <div className={styles.cardTop}>
                    <span>{VALUE_NAMES[topWaste.value]}</span>
                    <span>{SUIT_ICONS[topWaste.suit]}</span>
                  </div>
                  <div className={styles.cardSuitBig}>{SUIT_ICONS[topWaste.suit]}</div>
                  <div className={styles.cardTop} style={{ transform: 'rotate(180deg)' }}>
                    <span>{VALUE_NAMES[topWaste.value]}</span>
                    <span>{SUIT_ICONS[topWaste.suit]}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4 Foundations */}
          <div className={styles.foundations}>
            {foundations.map((fPile, fIdx) => {
              const top = fPile.length > 0 ? fPile[fPile.length - 1] : null;
              return (
                <div key={fIdx} className={styles.cardSlot} id={`foundation-${fIdx}`}>
                  {top ? (
                    <div className={`${styles.card} ${['HEARTS', 'DIAMONDS'].includes(top.suit) ? styles.cardRed : styles.cardBlack}`}>
                      <div className={styles.cardTop}>
                        <span>{VALUE_NAMES[top.value]}</span>
                        <span>{SUIT_ICONS[top.suit]}</span>
                      </div>
                      <div className={styles.cardSuitBig}>{SUIT_ICONS[top.suit]}</div>
                    </div>
                  ) : (
                    <span style={{ opacity: 0.3, fontSize: '1.2rem' }}>A</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 7 Tableau Columns */}
        <div className={styles.tableauArea}>
          {tableaus.map((col, cIdx) => (
            <div key={cIdx} className={styles.tableauColumn} id={`tableau-col-${cIdx}`}>
              {col.map((card, rIdx) => (
                <div
                  key={card.id}
                  className={styles.tableauCardWrapper}
                  style={{ top: `${rIdx * 20}px` }}
                  onClick={() => handleTableauCardClick(cIdx, rIdx)}
                >
                  {card.isFaceUp ? (
                    <div className={`${styles.card} ${['HEARTS', 'DIAMONDS'].includes(card.suit) ? styles.cardRed : styles.cardBlack}`}>
                      <div className={styles.cardTop}>
                        <span>{VALUE_NAMES[card.value]}</span>
                        <span>{SUIT_ICONS[card.suit]}</span>
                      </div>
                      <div className={styles.cardSuitBig} style={{ fontSize: '1.1rem' }}>
                        {SUIT_ICONS[card.suit]}
                      </div>
                    </div>
                  ) : (
                    <div className={`${styles.card} ${styles.cardBack}`} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Tip: Click top card to auto-move to foundations or valid columns
        </div>
        <button className={styles.restartButton} onClick={initGame} id="btn-solitaire-restart">
          New Deal
        </button>
      </div>
    </div>
  );
});

SolitaireRoyale.displayName = 'SolitaireRoyale';
