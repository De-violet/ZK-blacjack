// Hi-Lo Card Counting System
// 2-6 = +1, 7-9 = 0, 10-A = -1

import { Card, Rank } from './blackjack';

/**
 * Returns the Hi-Lo count value for a given card rank.
 * 2-6 = +1, 7-9 = 0, 10/J/Q/K/A = -1
 */
export function getHiLoValue(rank: Rank): number {
  if (['2', '3', '4', '5', '6'].includes(rank)) return 1;
  if (['7', '8', '9'].includes(rank)) return 0;
  // 10, J, Q, K, A
  return -1;
}

/**
 * Calculates the running count from a list of visible (face-up) cards.
 * Only counts cards that are faceUp = true.
 */
export function calculateRunningCount(cards: Card[]): number {
  return cards
    .filter(card => card.faceUp)
    .reduce((sum, card) => sum + getHiLoValue(card.rank), 0);
}

/**
 * Calculates the true count by dividing the running count by decks remaining.
 * True count = running count / decks remaining
 */
export function calculateTrueCount(runningCount: number, decksRemaining: number): number {
  if (decksRemaining <= 0) return runningCount;
  return runningCount / decksRemaining;
}

/**
 * Calculates deck penetration as a percentage.
 * How deep into the shoe we are.
 */
export function getDeckPenetration(cardsDealt: number, totalCards: number): number {
  if (totalCards <= 0) return 0;
  return Math.min(100, (cardsDealt / totalCards) * 100);
}

/**
 * Returns betting/playing advice based on the true count.
 * True count > 2: player advantage, increase bet
 * True count < -2: house advantage, decrease bet
 * True count near 0: neutral
 */
export function getCountAdvice(trueCount: number): {
  action: string;
  description: string;
  betAdvice: string;
} {
  if (trueCount >= 3) {
    return {
      action: 'Strong Advantage',
      description: 'Deck is very favorable — many high cards remain',
      betAdvice: 'Increase bet significantly (3-5x base)',
    };
  }
  if (trueCount >= 2) {
    return {
      action: 'Player Advantage',
      description: 'Deck favors the player — more 10s and Aces remain',
      betAdvice: 'Increase bet moderately (2-3x base)',
    };
  }
  if (trueCount >= 1) {
    return {
      action: 'Slight Edge',
      description: 'Slightly favorable — marginally more high cards',
      betAdvice: 'Slightly increase bet or hold steady',
    };
  }
  if (trueCount > -1) {
    return {
      action: 'Neutral',
      description: 'Deck is roughly balanced — no significant edge',
      betAdvice: 'Maintain base bet',
    };
  }
  if (trueCount > -2) {
    return {
      action: 'Slight Disadvantage',
      description: 'Slightly unfavorable — more low cards remain',
      betAdvice: 'Consider decreasing bet slightly',
    };
  }
  if (trueCount > -3) {
    return {
      action: 'House Advantage',
      description: 'Deck favors the house — more low cards remain',
      betAdvice: 'Decrease bet (minimum or sit out)',
    };
  }
  return {
    action: 'Strong Disadvantage',
    description: 'Deck is very unfavorable — very few high cards remain',
    betAdvice: 'Sit out or bet minimum',
  };
}
