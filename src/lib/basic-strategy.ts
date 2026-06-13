// Basic Blackjack Strategy - Standard 6-Deck, Dealer Hits Soft 17
// H=Hit, S=Stand, D=Double(if allowed else Hit), P=Split, R=Surrender, DH=Double or Hit, DS=Double or Stand

import { Card, Rank } from './blackjack';

export type StrategyAction = 'H' | 'S' | 'D' | 'P' | 'R' | 'DH' | 'DS';

// Dealer upcard values for lookup: 2,3,4,5,6,7,8,9,10,A
type DealerUp = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'A';

function getRankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank);
}

function isSoftHand(cards: Card[]): boolean {
  let score = 0;
  let aces = 0;
  for (const card of cards) {
    score += getRankValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  // Soft hand = has an Ace counted as 11
  return aces > 0 && score <= 21;
}

function getHandTotal(cards: Card[]): number {
  let score = 0;
  let aces = 0;
  for (const card of cards) {
    score += getRankValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function isPair(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  const v1 = getRankValue(cards[0].rank);
  const v2 = getRankValue(cards[1].rank);
  return v1 === v2;
}

function normalizeRank(rank: Rank): DealerUp {
  if (['K', 'Q', 'J'].includes(rank)) return '10';
  return rank as DealerUp;
}

// ─── Hard Totals Strategy (5-21) ─────────────────────────────
// Indexed by player total (5-21), then by dealer upcard [2,3,4,5,6,7,8,9,10,A]
const HARD_STRATEGY: Record<number, Record<DealerUp, StrategyAction>> = {
  5:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  6:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  7:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  8:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  9:  { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  10: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
  11: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'D','A':'H' },
  12: { '2':'H','3':'H','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  13: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  14: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  15: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'R','A':'H' },
  16: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'R','10':'R','A':'R' },
  17: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  18: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  19: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
};

// ─── Soft Totals Strategy (Ace + 2-9) ────────────────────────
// Key = Ace + card value (e.g., A+2 = "A2", A+7 = "A7")
// For soft hands with more than 2 cards, we use the total
const SOFT_STRATEGY: Record<string, Record<DealerUp, StrategyAction>> = {
  'A2': { '2':'H','3':'H','4':'H','5':'DH','6':'DH','7':'H','8':'H','9':'H','10':'H','A':'H' },
  'A3': { '2':'H','3':'H','4':'H','5':'DH','6':'DH','7':'H','8':'H','9':'H','10':'H','A':'H' },
  'A4': { '2':'H','3':'H','4':'DH','5':'DH','6':'DH','7':'H','8':'H','9':'H','10':'H','A':'H' },
  'A5': { '2':'H','3':'H','4':'DH','5':'DH','6':'DH','7':'H','8':'H','9':'H','10':'H','A':'H' },
  'A6': { '2':'H','3':'DH','4':'DH','5':'DH','6':'DH','7':'H','8':'H','9':'H','10':'H','A':'H' },
  'A7': { '2':'DS','3':'DS','4':'DS','5':'DS','6':'DS','7':'S','8':'S','9':'H','10':'H','A':'H' },
  'A8': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  'A9': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
};

// ─── Pairs Strategy ──────────────────────────────────────────
// Key = pair value (e.g., "2,2", "A,A", "10,10")
const PAIR_STRATEGY: Record<string, Record<DealerUp, StrategyAction>> = {
  'A,A': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
  '2,2': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '3,3': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '4,4': { '2':'H','3':'H','4':'H','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '5,5': { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
  '6,6': { '2':'P','3':'P','4':'P','5':'P','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '7,7': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '8,8': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
  '9,9': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'S','8':'P','9':'P','10':'S','A':'S' },
  '10,10': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
};

/**
 * Returns the basic strategy action for the given hand and dealer up card.
 */
export function getBasicStrategyAction(
  playerCards: Card[],
  dealerUpCard: Card,
  canDouble: boolean,
  canSplit: boolean,
  canSurrender: boolean
): StrategyAction {
  if (playerCards.length === 0) return 'H';

  const dealerUp = normalizeRank(dealerUpCard.rank);
  const total = getHandTotal(playerCards);
  const soft = isSoftHand(playerCards);

  // Check for pairs first (only with exactly 2 cards)
  if (canSplit && isPair(playerCards) && playerCards.length === 2) {
    const r1 = playerCards[0].rank;
    const r2 = playerCards[1].rank;
    let pairKey: string;

    if (r1 === 'A' && r2 === 'A') {
      pairKey = 'A,A';
    } else {
      const v1 = getRankValue(r1);
      const v2 = getRankValue(r2);
      if (v1 === v2) {
        pairKey = `${v1},${v2}`;
      } else {
        // Shouldn't reach here but fallback
        pairKey = `${v1},${v2}`;
      }
    }

    const pairStrategy = PAIR_STRATEGY[pairKey];
    if (pairStrategy) {
      const action = pairStrategy[dealerUp];
      if (action === 'P') return 'P';
      // If pair strategy says not to split, fall through to hard/soft strategy
    }
  }

  // Soft hands (only with 2 cards for the specific lookup)
  if (soft && playerCards.length === 2) {
    const aceIndex = playerCards.findIndex(c => c.rank === 'A');
    const otherCard = aceIndex === 0 ? playerCards[1] : playerCards[0];
    const otherValue = getRankValue(otherCard.rank);
    // Clamp to valid range for soft strategy
    const softKey = otherValue >= 2 && otherValue <= 9 ? `A${otherValue}` : null;

    if (softKey && SOFT_STRATEGY[softKey]) {
      let action = SOFT_STRATEGY[softKey][dealerUp];
      action = adjustAction(action, canDouble, canSurrender);
      return action;
    }
  }

  // For soft hands with more than 2 cards, use total-based lookup
  // but treat soft totals via the hard total chart (since you can't double)
  if (soft && playerCards.length > 2) {
    // Can't double or surrender with more than 2 cards
    // Use total to determine hit/stand
    if (total >= 19) return 'S';
    if (total === 18) {
      if (['9', '10', 'A'].includes(dealerUp)) return 'H';
      return 'S';
    }
    return 'H';
  }

  // Hard totals
  const hardStrategy = HARD_STRATEGY[total];
  if (hardStrategy) {
    let action = hardStrategy[dealerUp];
    action = adjustAction(action, canDouble, canSurrender);
    return action;
  }

  // Fallback
  return total >= 17 ? 'S' : 'H';
}

/**
 * Adjusts strategy action based on what's actually available.
 * D -> DH (Double or Hit) if can't double
 * DS -> S if can't double
 * R -> H if can't surrender
 */
function adjustAction(action: StrategyAction, canDouble: boolean, canSurrender: boolean): StrategyAction {
  if (!canDouble) {
    if (action === 'D') return 'H';
    if (action === 'DH') return 'H';
    if (action === 'DS') return 'S';
  }
  if (!canSurrender && action === 'R') {
    return 'H';
  }
  return action;
}

/**
 * Returns a human-readable label for a strategy action.
 */
export function getStrategyLabel(action: StrategyAction): string {
  switch (action) {
    case 'H': return 'Hit';
    case 'S': return 'Stand';
    case 'D': return 'Double';
    case 'P': return 'Split';
    case 'R': return 'Surrender';
    case 'DH': return 'Double or Hit';
    case 'DS': return 'Double or Stand';
  }
}

/**
 * Returns a detailed description for a strategy action.
 */
export function getStrategyDescription(action: StrategyAction): string {
  switch (action) {
    case 'H': return 'Take another card from the dealer';
    case 'S': return 'Keep your current hand and end your turn';
    case 'D': return 'Double your bet and receive exactly one more card';
    case 'P': return 'Split your pair into two separate hands';
    case 'R': return 'Forfeit half your bet and end the hand';
    case 'DH': return 'Double down if allowed, otherwise hit';
    case 'DS': return 'Double down if allowed, otherwise stand';
  }
}

/**
 * Returns a Tailwind CSS color class for a strategy action.
 * H=emerald, S=amber, D=purple, P=cyan, R=orange, DH=teal, DS=violet
 */
export function getStrategyColor(action: StrategyAction): string {
  switch (action) {
    case 'H': return 'text-emerald-400';
    case 'S': return 'text-amber-400';
    case 'D': return 'text-purple-400';
    case 'P': return 'text-cyan-400';
    case 'R': return 'text-orange-400';
    case 'DH': return 'text-teal-400';
    case 'DS': return 'text-violet-400';
  }
}

/**
 * Returns a Tailwind CSS background color class for a strategy action badge.
 */
export function getStrategyBgColor(action: StrategyAction): string {
  switch (action) {
    case 'H': return 'bg-emerald-500/20 border-emerald-500/30';
    case 'S': return 'bg-amber-500/20 border-amber-500/30';
    case 'D': return 'bg-purple-500/20 border-purple-500/30';
    case 'P': return 'bg-cyan-500/20 border-cyan-500/30';
    case 'R': return 'bg-orange-500/20 border-orange-500/30';
    case 'DH': return 'bg-teal-500/20 border-teal-500/30';
    case 'DS': return 'bg-violet-500/20 border-violet-500/30';
  }
}
