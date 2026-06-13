// Blackjack Game Logic - Pure Functions

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface Hand {
  cards: Card[];
  score: number;
  isBlackjack: boolean;
  isBusted: boolean;
}

export type GamePhase = 'betting' | 'insurance' | 'playing' | 'split' | 'dealerTurn' | 'result';
export type GameResult = 'win' | 'lose' | 'push' | 'blackjack' | 'dealerBlackjack' | 'surrender' | 'split' | null;
export type InsuranceResult = 'won' | 'lost' | null;

export interface SplitHand {
  cards: Card[];
  bet: number;
  result: GameResult;
  isDone: boolean;
  isDoubled: boolean;
}


export interface GameState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: GamePhase;
  result: GameResult;
  balance: number;
  currentBet: number;
  message: string;
  stats: GameStats;
  isAnimating: boolean;
}

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  biggestWin: number;
  currentStreak: number;
  bestStreak: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(numDecks: number = 6): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, faceUp: true });
      }
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  // Fisher-Yates shuffle using Math.random() (Phase 1 - will be replaced with hashing in Phase 3)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getCardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank);
}

export function calculateScore(cards: Card[]): number {
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue; // Don't count face-down cards
    score += getCardValue(card.rank);
    if (card.rank === 'A') aces++;
  }

  // Adjust for aces
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}

export function calculateScoreAllCards(cards: Card[]): number {
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    score += getCardValue(card.rank);
    if (card.rank === 'A') aces++;
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateScoreAllCards(cards) === 21;
}

export function isBusted(cards: Card[]): boolean {
  return calculateScoreAllCards(cards) > 21;
}

export function dealCard(deck: Card[], faceUp: boolean = true): { card: Card; remainingDeck: Card[] } {
  const newDeck = [...deck];
  const card = { ...newDeck.pop()!, faceUp };
  return { card, remainingDeck: newDeck };
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
}

export function getSuitColor(suit: Suit): string {
  return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
}

export function getDealerAction(dealerHand: Card[]): 'hit' | 'stand' {
  const score = calculateScoreAllCards(dealerHand);
  // Standard rules: Dealer hits on 16 or less, stands on hard 17+
  // Hits on soft 17 (Ace counted as 11 + 6)
  if (score < 17) return 'hit';
  if (score === 17) {
    // Check for soft 17: an Ace is counted as 11
    let acesAsEleven = 0;
    let totalWithoutAceAdjust = 0;
    for (const card of dealerHand) {
      totalWithoutAceAdjust += getCardValue(card.rank);
      if (card.rank === 'A') acesAsEleven++;
    }
    // If totalWithoutAceAdjust > 17, we had to reduce aces. 
    // Soft 17 means there's still an ace counted as 11.
    let adjusted = totalWithoutAceAdjust;
    let acesLeft = acesAsEleven;
    while (adjusted > 21 && acesLeft > 0) {
      adjusted -= 10;
      acesLeft--;
    }
    // If acesLeft > 0, we have a soft hand
    if (acesLeft > 0 && adjusted === 17) return 'hit'; // Soft 17
    return 'stand';
  }
  return 'stand';
}

export function determineResult(playerHand: Card[], dealerHand: Card[]): GameResult {
  const playerScore = calculateScoreAllCards(playerHand);
  const dealerScore = calculateScoreAllCards(dealerHand);
  const playerBJ = isBlackjack(playerHand);
  const dealerBJ = isBlackjack(dealerHand);

  // Both blackjack = push
  if (playerBJ && dealerBJ) return 'push';
  // Player blackjack = blackjack win (1.5x payout)
  if (playerBJ) return 'blackjack';
  // Dealer blackjack = special loss
  if (dealerBJ) return 'dealerBlackjack';
  // Player surrendered
  // (surrender is handled in the store, not here)
  // Player busted
  if (playerScore > 21) return 'lose';
  // Dealer busted
  if (dealerScore > 21) return 'win';
  // Compare scores
  if (playerScore > dealerScore) return 'win';
  if (playerScore < dealerScore) return 'lose';
  return 'push';
}

export function calculatePayout(result: GameResult, bet: number): number {
  switch (result) {
    case 'blackjack': return Math.floor(bet * 2.5); // 1.5x + original bet
    case 'win': return bet * 2;
    case 'push': return bet;
    case 'lose': return 0;
    case 'dealerBlackjack': return 0;
    case 'surrender': return Math.floor(bet * 0.5); // Return half the bet
    case 'split': return 0; // Split result is handled per-hand
    default: return 0;
  }
}

export function getResultMessage(result: GameResult): string {
  switch (result) {
    case 'blackjack': return '🎰 BLACKJACK! You win 1.5x!';
    case 'win': return '🎉 You Win!';
    case 'lose': return '😞 Dealer Wins';
    case 'dealerBlackjack': return '😱 Dealer Blackjack!';
    case 'surrender': return '🏳️ Surrendered — Half bet returned';
    case 'push': return '🤝 Push - Tie Game';
    case 'split': return '✌️ Split Hand — Playing both hands';
    default: return '';
  }
}

export function canSplit(hand: Card[]): boolean {
  if (hand.length !== 2) return false;
  const rank0 = hand[0].rank;
  const rank1 = hand[1].rank;
  // Same rank (e.g., two 8s, two Aces)
  if (rank0 === rank1) return true;
  // Face cards (10, J, Q, K) all count as 10, so any two of them can be split
  const faceRanks: Rank[] = ['10', 'J', 'Q', 'K'];
  if (faceRanks.includes(rank0) && faceRanks.includes(rank1)) return true;
  return false;
}

export function isSplitAces(hand: Card[]): boolean {
  return hand.length === 2 && hand[0].rank === 'A' && hand[1].rank === 'A';
}

export function calculateInsurancePayout(insuranceBet: number, dealerHasBJ: boolean): number {
  if (insuranceBet <= 0) return 0;
  if (dealerHasBJ) return insuranceBet * 3; // 2:1 payout + original insurance bet
  return 0;
}

export const DECK_SIZE = 312; // 6 decks × 52 cards
export const INITIAL_BALANCE = 1000;
export const MIN_BET = 10;
export const MAX_BET = 500;

export const CHIP_VALUES = [10, 25, 50, 100, 250, 500] as const;

export const DEFAULT_STATS: GameStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  biggestWin: 0,
  currentStreak: 0,
  bestStreak: 0,
};

// ─── Side Bets ──────────────────────────────────────────────────────

export type PerfectPairType = 'perfect' | 'colored' | 'mixed' | null;

export function checkPerfectPair(hand: Card[]): { type: PerfectPairType; payout: number } {
  if (hand.length !== 2) return { type: null, payout: 0 };
  if (hand[0].rank !== hand[1].rank) return { type: null, payout: 0 };

  const sameSuit = hand[0].suit === hand[1].suit;
  const sameColor = getSuitColor(hand[0].suit) === getSuitColor(hand[1].suit);

  if (sameSuit) return { type: 'perfect', payout: 25 };
  if (sameColor) return { type: 'colored', payout: 12 };
  return { type: 'mixed', payout: 6 };
}

export type TwentyOnePlusThreeType = 'suitedTrips' | 'straightFlush' | 'threeOfAKind' | 'straight' | 'flush' | null;

export function check21Plus3(playerHand: Card[], dealerUpCard: Card): { type: TwentyOnePlusThreeType; payout: number } {
  const cards = [...playerHand, dealerUpCard];
  if (cards.length !== 3) return { type: null, payout: 0 };

  // Check for suited trips (all same rank and suit - possible with 6 decks)
  const allSameRank = cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
  const allSameSuit = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

  if (allSameRank && allSameSuit) return { type: 'suitedTrips', payout: 100 };

  // Get numeric values for straight check
  const rankOrder: Record<string, number> = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
  const values = cards.map(c => rankOrder[c.rank]).sort((a, b) => a - b);

  // Check straight (consecutive, or A-Q-K wrapping)
  const isConsecutive = values[2] - values[0] === 2 && values[1] - values[0] === 1;
  const isAceHighStraight = values[0] === 1 && values[1] === 12 && values[2] === 13; // A-Q-K
  const isStraight = isConsecutive || isAceHighStraight;

  // Check three of a kind (non-suited)
  if (allSameRank) return { type: 'threeOfAKind', payout: 30 };

  if (isStraight && allSameSuit) return { type: 'straightFlush', payout: 40 };
  if (isStraight) return { type: 'straight', payout: 10 };
  if (allSameSuit) return { type: 'flush', payout: 5 };

  return { type: null, payout: 0 };
}

export const SIDE_BET_MIN = 5;
export const SIDE_BET_MAX = 100;
