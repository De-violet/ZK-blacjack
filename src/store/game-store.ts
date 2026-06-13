'use client';

import { create } from 'zustand';
import {
  Card,
  GamePhase,
  GameResult,
  GameStats,
  InsuranceResult,
  SplitHand,
  PerfectPairType,
  TwentyOnePlusThreeType,
  DEFAULT_STATS,
  createDeck,
  shuffleDeck,
  dealCard,
  isBlackjack,
  isBusted,
  determineResult,
  calculatePayout,
  calculateInsurancePayout,
  getResultMessage,
  calculateScoreAllCards,
  getDealerAction,
  canSplit as canSplitCards,
  isSplitAces,
  checkPerfectPair,
  check21Plus3,
  INITIAL_BALANCE,
  MIN_BET,
  MAX_BET,
  SIDE_BET_MIN,
  SIDE_BET_MAX,
} from '@/lib/blackjack';
import {
  SeedCommitment,
  RevealedSeed,
  seededShuffle,
  sha256,
  parseAbbreviatedDeck,
  createStandardDeckAbbreviated,
  generateClientSeed,
  RoundHistoryEntry,
} from '@/lib/provably-fair';
import {
  ZKCommitment,
  ZKCardProof,
  ZKVerificationResult,
  verifyMerkleProof,
  verifyVRFProof,
  verifyRangeProof,
  verifyZKProof,
} from '@/lib/zk-crypto';

export type AutoplaySpeed = 'slow' | 'medium' | 'fast';
export type AutoplayStrategy = 'basic' | 'random';
export type BetStrategy = 'flat' | 'martingale' | 'paroli' | '1-3-2-6' | 'percentage' | 'count';

export interface GameHistoryEntry {
  id: number;
  result: GameResult;
  bet: number;
  payout: number;
  playerScore: number;
  dealerScore: number;
  timestamp: number;
  insuranceBet?: number;
  insuranceResult?: InsuranceResult;
  isSplit?: boolean;
  splitResults?: GameResult[];
  splitPayouts?: number[];
}

interface GameStore {
  // State
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
  showStats: boolean;
  history: GameHistoryEntry[];
  insuranceBet: number;
  insuranceResult: InsuranceResult;
  balanceHistory: number[];
  // Split state
  splitHands: SplitHand[];
  activeSplitIndex: number;
  isSplitMode: boolean;
  lastBet: number;
  // Card counter state
  cardsDealtTotal: number;
  showCardCounter: boolean;
  // Autoplay state
  isAutoplay: boolean;
  autoplaySpeed: AutoplaySpeed;
  autoplayHandsRemaining: number;
  autoplayHandsTotal: number;
  autoplayStrategy: AutoplayStrategy;
  autoplayStopBelow: number;
  autoplayStopAbove: number;
  // Bet strategy state
  betStrategy: BetStrategy;
  betStrategyBase: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  lastResultWasWin: boolean | null;
  sequence1326Index: number;
  // Side bet state
  perfectPairBet: number;
  twentyOnePlusThreeBet: number;
  perfectPairResult: { type: PerfectPairType; payout: number; winAmount: number } | null;
  twentyOnePlusThreeResult: { type: TwentyOnePlusThreeType; payout: number; winAmount: number } | null;
  // Provably fair state
  seedCommitment: SeedCommitment | null;
  revealedSeed: RevealedSeed | null;
  isSeedVerified: boolean | null;
  provablyFairEnabled: boolean;
  deckOrderHash: string | null;
  initialDeckOrder: string[] | null; // abbreviated deck from server for verification
  roundHistory: RoundHistoryEntry[];
  // ZK Phase 4 state
  zkCommitment: ZKCommitment | null;
  zkCardProofs: ZKCardProof[];
  zkVerification: ZKVerificationResult | null;
  zkEnabled: boolean;
  showZKPanel: boolean;

  // Actions
  placeBet: (amount: number) => void;
  clearBet: () => void;
  startGame: () => void; // internally async but typed as void for zustand
  quickBet: () => void;
  hit: () => void;
  stand: () => void;
  doubleDown: () => void;
  surrender: () => void;
  takeInsurance: () => void;
  declineInsurance: () => void;
  newRound: () => void;
  resetGame: () => void;
  toggleStats: () => void;
  showProvablyFairPanel: boolean;
  toggleProvablyFairPanel: () => void;
  // Split actions
  split: () => void;
  hitSplit: () => void;
  standSplit: () => void;
  doubleDownSplit: () => void;
  playDealerForSplitHands: () => void;
  finishSplitRound: (currentDeck: Card[], splitHands: SplitHand[]) => void;
  // Card counter actions
  toggleCardCounter: () => void;
  // Autoplay actions
  startAutoplay: (hands: number) => void;
  stopAutoplay: () => void;
  setAutoplaySpeed: (speed: AutoplaySpeed) => void;
  setAutoplayStrategy: (strategy: AutoplayStrategy) => void;
  setAutoplayStopBelow: (amount: number) => void;
  setAutoplayStopAbove: (amount: number) => void;
  decrementAutoplayHands: () => void;
  // Bet strategy actions
  setBetStrategy: (strategy: BetStrategy) => void;
  setBetStrategyBase: (amount: number) => void;
  getSuggestedBet: () => number;
  recordBetResult: (wasWin: boolean) => void;
  // Side bet actions
  placePerfectPairBet: (amount: number) => void;
  place21Plus3Bet: (amount: number) => void;
  clearSideBets: () => void;
  // Provably fair actions
  toggleProvablyFair: () => void;
  verifyProvablyFair: () => Promise<boolean>;
  // ZK Phase 4 actions
  toggleZKPanel: () => void;
  toggleZK: () => void;
  verifyZKRound: () => Promise<ZKVerificationResult | null>;
  fetchCardProofs: (positions: number[]) => Promise<void>;
}

let historyId = 0;

function getSideBetWinnings(state: { perfectPairResult: { winAmount: number } | null; twentyOnePlusThreeResult: { winAmount: number } | null }): number {
  return (state.perfectPairResult?.winAmount ?? 0) + (state.twentyOnePlusThreeResult?.winAmount ?? 0);
}

function updateStats(stats: GameStats, result: GameResult, netGain: number): GameStats {
  const newStats = { ...stats };
  newStats.totalGames++;

  switch (result) {
    case 'blackjack':
      newStats.blackjacks++;
      newStats.wins++;
      newStats.currentStreak = Math.max(0, newStats.currentStreak) + 1;
      if (netGain > newStats.biggestWin) newStats.biggestWin = netGain;
      break;
    case 'win':
      newStats.wins++;
      newStats.currentStreak = Math.max(0, newStats.currentStreak) + 1;
      if (netGain > newStats.biggestWin) newStats.biggestWin = netGain;
      break;
    case 'lose':
    case 'dealerBlackjack':
    case 'surrender':
      newStats.losses++;
      newStats.currentStreak = Math.min(0, newStats.currentStreak) - 1;
      break;
    case 'push':
      newStats.pushes++;
      newStats.currentStreak = 0;
      break;
    case 'split':
      // Split is not a terminal result for stats
      break;
  }

  if (newStats.currentStreak > 0 && newStats.currentStreak > newStats.bestStreak) {
    newStats.bestStreak = newStats.currentStreak;
  }

  return newStats;
}

export const useGameStore = create<GameStore>((set, get) => ({
  deck: [],
  playerHand: [],
  dealerHand: [],
  phase: 'betting',
  result: null,
  balance: INITIAL_BALANCE,
  currentBet: 0,
  message: 'Place your bet to start!',
  stats: { ...DEFAULT_STATS },
  isAnimating: false,
  showStats: false,
  showProvablyFairPanel: false,
  history: [],
  insuranceBet: 0,
  insuranceResult: null,
  balanceHistory: [INITIAL_BALANCE],
  splitHands: [],
  activeSplitIndex: 0,
  isSplitMode: false,
  lastBet: 0,
  cardsDealtTotal: 0,
  showCardCounter: false,
  // Autoplay state
  isAutoplay: false,
  autoplaySpeed: 'medium',
  autoplayHandsRemaining: 0,
  autoplayHandsTotal: 0,
  autoplayStrategy: 'basic',
  autoplayStopBelow: 100,
  autoplayStopAbove: 2000,
  // Bet strategy state
  betStrategy: 'flat',
  betStrategyBase: 25,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  lastResultWasWin: null,
  sequence1326Index: 0,
  // Side bet state
  perfectPairBet: 0,
  twentyOnePlusThreeBet: 0,
  perfectPairResult: null,
  twentyOnePlusThreeResult: null,
  // Provably fair state
  seedCommitment: null,
  revealedSeed: null,
  isSeedVerified: null,
  provablyFairEnabled: true,
  deckOrderHash: null,
  initialDeckOrder: null,
  roundHistory: [],
  // ZK Phase 4 state
  zkCommitment: null,
  zkCardProofs: [],
  zkVerification: null,
  zkEnabled: true,
  showZKPanel: false,

  placeBet: (amount: number) => {
    const { balance, currentBet } = get();
    if (balance >= amount && currentBet + amount <= 500) {
      set({ currentBet: currentBet + amount, balance: balance - amount });
    }
  },

  quickBet: () => {
    const { lastBet, balance, currentBet } = get();
    if (lastBet > 0 && balance >= lastBet && currentBet === 0) {
      set({ currentBet: lastBet, balance: balance - lastBet });
    }
  },

  clearBet: () => {
    const { currentBet, balance } = get();
    set({ currentBet: 0, balance: balance + currentBet });
  },

  startGame: async () => {
    const { currentBet, perfectPairBet, twentyOnePlusThreeBet, balance } = get();
    if (currentBet < 10) return;

    // Calculate affordable side bet amounts
    let actualPPBet = perfectPairBet;
    let actualPP3Bet = twentyOnePlusThreeBet;
    if (balance < actualPPBet) {
      actualPPBet = 0;
      actualPP3Bet = 0;
    } else if (balance < actualPPBet + actualPP3Bet) {
      actualPP3Bet = balance - actualPPBet;
    }
    const actualSideBetsTotal = actualPPBet + actualPP3Bet;

    // Deduct side bets from balance
    set({ balance: balance - actualSideBetsTotal, perfectPairBet: actualPPBet, twentyOnePlusThreeBet: actualPP3Bet });

    // Save last bet for quick bet feature
    const savedLastBet = currentBet;

    // Provably fair seeded shuffle
    const { provablyFairEnabled, zkEnabled, seedCommitment: prevCommitment } = get();
    let commitment: SeedCommitment | null = null;
    let zkCommit: ZKCommitment | null = null;
    let deck: Card[];

    if (provablyFairEnabled) {
      // Call ZK API (Phase 4) or Phase 3 API
      const apiEndpoint = zkEnabled ? '/api/zk' : '/api/seed';
      try {
        const clientSeed = prevCommitment?.clientSeed || generateClientSeed();
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientSeed }),
        });
        const data = await response.json();
        commitment = {
          roundId: data.roundId,
          serverSeedHash: data.serverSeedHash,
          clientSeed: data.clientSeed,
          nonce: data.nonce,
          shuffledDeck: data.shuffledDeck,
        };
        // Phase 4: Store ZK commitment data
        if (data.zkCommitment) {
          zkCommit = data.zkCommitment;
        }
        // Convert abbreviated deck from server to Card objects
        deck = parseAbbreviatedDeck(commitment.shuffledDeck) as Card[];
      } catch {
        // Fallback to random shuffle if API fails
        deck = shuffleDeck(createDeck(6));
      }
    } else {
      deck = shuffleDeck(createDeck(6));
    }

    const { card: p1, remainingDeck: d1 } = dealCard(deck, true);
    const { card: d1Card, remainingDeck: d2 } = dealCard(d1, true);
    const { card: p2, remainingDeck: d3 } = dealCard(d2, true);
    const { card: d2Card, remainingDeck: d4 } = dealCard(d3, false);

    const playerHand = [p1, p2];
    const dealerHand = [d1Card, d2Card];

    // Calculate side bet results
    const ppResult = actualPPBet > 0 ? checkPerfectPair(playerHand) : { type: null as const, payout: 0 };
    const pp3Result = actualPP3Bet > 0 ? check21Plus3(playerHand, d1Card) : { type: null as const, payout: 0 };
    const ppWinAmount = ppResult.type ? actualPPBet * (ppResult.payout + 1) : 0;
    const pp3WinAmount = pp3Result.type ? actualPP3Bet * (pp3Result.payout + 1) : 0;
    const storedPPResult = actualPPBet > 0 ? { type: ppResult.type, payout: ppResult.payout, winAmount: ppWinAmount } : null;
    const storedPP3Result = actualPP3Bet > 0 ? { type: pp3Result.type, payout: pp3Result.payout, winAmount: pp3WinAmount } : null;

    // Check if dealer's face-up card is an Ace -> offer insurance
    const dealerShowsAce = d1Card.rank === 'A';

    if (dealerShowsAce) {
      set({
        deck: d4,
        playerHand,
        dealerHand,
        phase: 'insurance',
        result: null,
        message: "Dealer shows Ace! Insurance?",
        isAnimating: false,
        insuranceBet: 0,
        insuranceResult: null,
        splitHands: [],
        activeSplitIndex: 0,
        isSplitMode: false,
        lastBet: savedLastBet,
        cardsDealtTotal: get().cardsDealtTotal + 4,
        perfectPairResult: storedPPResult,
        twentyOnePlusThreeResult: storedPP3Result,
        seedCommitment: commitment,
        revealedSeed: null,
        isSeedVerified: null,
        initialDeckOrder: commitment?.shuffledDeck || null,
        zkCommitment: zkCommit,
        zkCardProofs: [],
        zkVerification: null,
      });
      return;
    }

    // No Ace shown - check for blackjacks directly
    const playerBJ = isBlackjack(playerHand);
    const dealerBJ = isBlackjack(dealerHand);

    if (playerBJ || dealerBJ) {
      const revealedDealerHand = dealerHand.map(c => ({ ...c, faceUp: true }));
      const result = determineResult(playerHand, revealedDealerHand);
      const payout = calculatePayout(result, currentBet);
      const newStats = updateStats(get().stats, result, payout - (result === 'lose' ? 0 : currentBet));
      const sideBetWinnings = ppWinAmount + pp3WinAmount;
      const newBalance = get().balance + payout + sideBetWinnings;
      const historyEntry: GameHistoryEntry = {
        id: ++historyId,
        result,
        bet: currentBet,
        payout,
        playerScore: calculateScoreAllCards(playerHand),
        dealerScore: calculateScoreAllCards(revealedDealerHand),
        timestamp: Date.now(),
      };

      set({
        deck: d4,
        playerHand,
        dealerHand: revealedDealerHand,
        phase: 'result',
        result,
        balance: newBalance,
        message: getResultMessage(result),
        stats: newStats,
        isAnimating: false,
        history: [historyEntry, ...get().history].slice(0, 20),
        balanceHistory: [...get().balanceHistory.slice(-49), newBalance],
        splitHands: [],
        activeSplitIndex: 0,
        isSplitMode: false,
        lastBet: savedLastBet,
        cardsDealtTotal: get().cardsDealtTotal + 4,
        perfectPairResult: storedPPResult,
        twentyOnePlusThreeResult: storedPP3Result,
        seedCommitment: commitment,
        revealedSeed: null,
        isSeedVerified: null,
        initialDeckOrder: commitment?.shuffledDeck || null,
        zkCommitment: zkCommit,
        zkCardProofs: [],
        zkVerification: null,
      });
      return;
    }

    set({
      deck: d4,
      playerHand,
      dealerHand,
      phase: 'playing',
      result: null,
      message: 'Your turn — Hit or Stand?',
      isAnimating: false,
      insuranceBet: 0,
      insuranceResult: null,
      splitHands: [],
      activeSplitIndex: 0,
      isSplitMode: false,
      lastBet: savedLastBet,
      cardsDealtTotal: get().cardsDealtTotal + 4,
      perfectPairResult: storedPPResult,
      twentyOnePlusThreeResult: storedPP3Result,
      seedCommitment: commitment,
      revealedSeed: null,
      isSeedVerified: null,
      initialDeckOrder: commitment?.shuffledDeck || null,
      zkCommitment: zkCommit,
      zkCardProofs: [],
      zkVerification: null,
    });
  },

  takeInsurance: () => {
    const { currentBet, balance, deck, playerHand, dealerHand } = get();
    if (get().phase !== 'insurance') return;

    const insuranceCost = Math.floor(currentBet / 2);
    if (balance < insuranceCost) return;

    const newBalance = balance - insuranceCost;

    // Check for blackjacks after insurance is taken
    const playerBJ = isBlackjack(playerHand);
    const dealerBJ = isBlackjack(dealerHand);

    if (playerBJ || dealerBJ) {
      const revealedDealerHand = dealerHand.map(c => ({ ...c, faceUp: true }));
      const result = determineResult(playerHand, revealedDealerHand);
      const payout = calculatePayout(result, currentBet);
      const insurancePayout = calculateInsurancePayout(insuranceCost, dealerBJ);
      const totalPayout = payout + insurancePayout;
      const insResult: InsuranceResult = dealerBJ ? 'won' : 'lost';
      const newStats = updateStats(get().stats, result, payout - (result === 'lose' ? 0 : currentBet));
      const finalBalance = newBalance + totalPayout + getSideBetWinnings(get());
      const historyEntry: GameHistoryEntry = {
        id: ++historyId,
        result,
        bet: currentBet,
        payout,
        playerScore: calculateScoreAllCards(playerHand),
        dealerScore: calculateScoreAllCards(revealedDealerHand),
        timestamp: Date.now(),
        insuranceBet: insuranceCost,
        insuranceResult: insResult,
      };

      set({
        dealerHand: revealedDealerHand,
        phase: 'result',
        result,
        balance: finalBalance,
        message: getResultMessage(result) + (dealerBJ ? ' Insurance pays 2:1!' : ''),
        stats: newStats,
        isAnimating: false,
        insuranceBet: insuranceCost,
        insuranceResult: insResult,
        history: [historyEntry, ...get().history].slice(0, 20),
        balanceHistory: [...get().balanceHistory.slice(-49), finalBalance],
      });
      return;
    }

    // No blackjacks - continue playing, insurance bet is lost if dealer doesn't have BJ
    set({
      phase: 'playing',
      balance: newBalance,
      insuranceBet: insuranceCost,
      message: `Insurance taken ($${insuranceCost}). Your turn — Hit or Stand?`,
    });
  },

  declineInsurance: () => {
    const { playerHand, dealerHand } = get();
    if (get().phase !== 'insurance') return;

    // Check for blackjacks after declining
    const playerBJ = isBlackjack(playerHand);
    const dealerBJ = isBlackjack(dealerHand);

    if (playerBJ || dealerBJ) {
      const { currentBet } = get();
      const revealedDealerHand = dealerHand.map(c => ({ ...c, faceUp: true }));
      const result = determineResult(playerHand, revealedDealerHand);
      const payout = calculatePayout(result, currentBet);
      const newStats = updateStats(get().stats, result, payout - (result === 'lose' ? 0 : currentBet));
      const newBalance = get().balance + payout + getSideBetWinnings(get());
      const historyEntry: GameHistoryEntry = {
        id: ++historyId,
        result,
        bet: currentBet,
        payout,
        playerScore: calculateScoreAllCards(playerHand),
        dealerScore: calculateScoreAllCards(revealedDealerHand),
        timestamp: Date.now(),
        insuranceBet: 0,
        insuranceResult: null,
      };

      set({
        dealerHand: revealedDealerHand,
        phase: 'result',
        result,
        balance: newBalance,
        message: getResultMessage(result),
        stats: newStats,
        isAnimating: false,
        insuranceBet: 0,
        insuranceResult: null,
        history: [historyEntry, ...get().history].slice(0, 20),
        balanceHistory: [...get().balanceHistory.slice(-49), newBalance],
      });
      return;
    }

    // No blackjacks - continue playing
    set({
      phase: 'playing',
      insuranceBet: 0,
      insuranceResult: null,
      message: 'Your turn — Hit or Stand?',
    });
  },

  hit: () => {
    const { isSplitMode } = get();
    if (get().phase !== 'playing') return;

    // In split mode, redirect to hitSplit
    if (isSplitMode) {
      get().hitSplit();
      return;
    }

    const { deck, playerHand } = get();
    const { card, remainingDeck } = dealCard(deck, true);
    const newHand = [...playerHand, card];

    if (isBusted(newHand)) {
      const { dealerHand, currentBet, insuranceBet } = get();
      const revealedDealerHand = dealerHand.map(c => ({ ...c, faceUp: true }));
      const dealerBJ = isBlackjack(dealerHand);
      const insurancePayout = calculateInsurancePayout(insuranceBet, dealerBJ);
      const insResult: InsuranceResult = insuranceBet > 0 ? (dealerBJ ? 'won' : 'lost') : null;
      const totalPayout = insurancePayout;
      const newStats = updateStats(get().stats, 'lose', 0);
      const newBalance = get().balance + totalPayout + getSideBetWinnings(get());
      const historyEntry: GameHistoryEntry = {
        id: ++historyId,
        result: 'lose',
        bet: currentBet,
        payout: totalPayout,
        playerScore: calculateScoreAllCards(newHand),
        dealerScore: calculateScoreAllCards(revealedDealerHand),
        timestamp: Date.now(),
        insuranceBet,
        insuranceResult: insResult,
      };

      set({
        deck: remainingDeck,
        playerHand: newHand,
        dealerHand: revealedDealerHand,
        phase: 'result',
        result: 'lose',
        balance: newBalance,
        message: '💥 Busted! You went over 21',
        stats: newStats,
        isAnimating: false,
        insuranceResult: insResult,
        history: [historyEntry, ...get().history].slice(0, 20),
        balanceHistory: [...get().balanceHistory.slice(-49), newBalance],
        cardsDealtTotal: get().cardsDealtTotal + 1,
      });
      return;
    }

    if (calculateScoreAllCards(newHand) === 21) {
      set({
        deck: remainingDeck,
        playerHand: newHand,
        cardsDealtTotal: get().cardsDealtTotal + 1,
      });
      setTimeout(() => get().stand(), 500);
      return;
    }

    set({
      deck: remainingDeck,
      playerHand: newHand,
      message: `Your score: ${calculateScoreAllCards(newHand)} — Hit or Stand?`,
      cardsDealtTotal: get().cardsDealtTotal + 1,
    });
  },

  stand: () => {
    const { isSplitMode } = get();
    if (get().phase !== 'playing') return;

    // In split mode, redirect to standSplit
    if (isSplitMode) {
      get().standSplit();
      return;
    }

    const { deck, playerHand, dealerHand, currentBet, balance, insuranceBet } = get();

    set({ phase: 'dealerTurn', message: "Dealer's turn...", isAnimating: true });

    const revealedHand = dealerHand.map(c => ({ ...c, faceUp: true }));
    let currentDeck = deck;
    let currentDealerHand = [...revealedHand];
    let dealerCardsDealt = 0;

    const dealerPlay = () => {
      const action = getDealerAction(currentDealerHand);

      if (action === 'hit') {
        const { card, remainingDeck } = dealCard(currentDeck, true);
        currentDeck = remainingDeck;
        currentDealerHand = [...currentDealerHand, card];
        dealerCardsDealt++;

        set({
          deck: currentDeck,
          dealerHand: currentDealerHand,
          cardsDealtTotal: get().cardsDealtTotal + 1,
        });

        setTimeout(dealerPlay, 600);
      } else {
        const result = determineResult(playerHand, currentDealerHand);
        const payout = calculatePayout(result, currentBet);
        const dealerBJ = isBlackjack(currentDealerHand);
        const insurancePayout = calculateInsurancePayout(insuranceBet, dealerBJ);
        const insResult: InsuranceResult = insuranceBet > 0 ? (dealerBJ ? 'won' : 'lost') : null;
        const totalPayout = payout + insurancePayout;
        const newStats = updateStats(get().stats, result, payout - (result === 'lose' ? 0 : currentBet));
        const newBalance = balance + totalPayout + getSideBetWinnings(get());
        const historyEntry: GameHistoryEntry = {
          id: ++historyId,
          result,
          bet: currentBet,
          payout: totalPayout,
          playerScore: calculateScoreAllCards(playerHand),
          dealerScore: calculateScoreAllCards(currentDealerHand),
          timestamp: Date.now(),
          insuranceBet,
          insuranceResult: insResult,
        };

        set({
          deck: currentDeck,
          dealerHand: currentDealerHand,
          phase: 'result',
          result,
          balance: newBalance,
          message: getResultMessage(result),
          stats: newStats,
          isAnimating: false,
          insuranceResult: insResult,
          history: [historyEntry, ...get().history].slice(0, 20),
          balanceHistory: [...get().balanceHistory.slice(-49), newBalance],
        });
      }
    };

    set({ dealerHand: revealedHand });
    setTimeout(dealerPlay, 700);
  },

  doubleDown: () => {
    const { isSplitMode } = get();
    if (get().phase !== 'playing') return;

    // In split mode, redirect to doubleDownSplit
    if (isSplitMode) {
      get().doubleDownSplit();
      return;
    }

    const { balance, currentBet, deck, playerHand } = get();
    if (playerHand.length !== 2) return;
    if (balance < currentBet) return;

    set({ balance: balance - currentBet, currentBet: currentBet * 2 });

    const { card, remainingDeck } = dealCard(deck, true);
    const newHand = [...playerHand, card];

    if (isBusted(newHand)) {
      const { dealerHand, currentBet: newBet, insuranceBet } = get();
      const revealedDealerHand = dealerHand.map(c => ({ ...c, faceUp: true }));
      const dealerBJ = isBlackjack(dealerHand);
      const insurancePayout = calculateInsurancePayout(insuranceBet, dealerBJ);
      const insResult: InsuranceResult = insuranceBet > 0 ? (dealerBJ ? 'won' : 'lost') : null;
      const totalPayout = insurancePayout;
      const newStats = updateStats(get().stats, 'lose', 0);
      const newBalance = get().balance + totalPayout + getSideBetWinnings(get());
      const historyEntry: GameHistoryEntry = {
        id: ++historyId,
        result: 'lose',
        bet: newBet,
        payout: totalPayout,
        playerScore: calculateScoreAllCards(newHand),
        dealerScore: calculateScoreAllCards(revealedDealerHand),
        timestamp: Date.now(),
        insuranceBet,
        insuranceResult: insResult,
      };

      set({
        deck: remainingDeck,
        playerHand: newHand,
        dealerHand: revealedDealerHand,
        phase: 'result',
        result: 'lose',
        balance: newBalance,
        message: '💥 Busted on Double Down!',
        stats: newStats,
        isAnimating: false,
        insuranceResult: insResult,
        history: [historyEntry, ...get().history].slice(0, 20),
        balanceHistory: [...get().balanceHistory.slice(-49), newBalance],
        cardsDealtTotal: get().cardsDealtTotal + 1,
      });
      return;
    }

    set({
      deck: remainingDeck,
      playerHand: newHand,
      message: `Doubled! Score: ${calculateScoreAllCards(newHand)}`,
      cardsDealtTotal: get().cardsDealtTotal + 1,
    });

    setTimeout(() => get().stand(), 500);
  },

  surrender: () => {
    const { currentBet, balance, dealerHand, playerHand, insuranceBet, isSplitMode } = get();
    if (get().phase !== 'playing' || playerHand.length !== 2) return;
    // Cannot surrender in split mode
    if (isSplitMode) return;

    const revealedDealerHand = dealerHand.map(c => ({ ...c, faceUp: true }));
    const payout = Math.floor(currentBet * 0.5);
    const dealerBJ = isBlackjack(dealerHand);
    const insurancePayout = calculateInsurancePayout(insuranceBet, dealerBJ);
    const insResult: InsuranceResult = insuranceBet > 0 ? (dealerBJ ? 'won' : 'lost') : null;
    const totalPayout = payout + insurancePayout;
    const newStats = updateStats(get().stats, 'surrender', 0);
    const newBalance = balance + totalPayout + getSideBetWinnings(get());
    const historyEntry: GameHistoryEntry = {
      id: ++historyId,
      result: 'surrender',
      bet: currentBet,
      payout: totalPayout,
      playerScore: calculateScoreAllCards(playerHand),
      dealerScore: calculateScoreAllCards(revealedDealerHand),
      timestamp: Date.now(),
      insuranceBet,
      insuranceResult: insResult,
    };

    set({
      dealerHand: revealedDealerHand,
      phase: 'result',
      result: 'surrender',
      balance: newBalance,
      message: getResultMessage('surrender'),
      stats: newStats,
      isAnimating: false,
      insuranceResult: insResult,
      history: [historyEntry, ...get().history].slice(0, 20),
      balanceHistory: [...get().balanceHistory.slice(-49), newBalance],
    });
  },

  // ─── Split Actions ─────────────────────────────────────

  split: () => {
    const { playerHand, currentBet, balance, deck } = get();
    if (get().phase !== 'playing') return;
    if (!canSplitCards(playerHand)) return;
    if (balance < currentBet) return; // Need another bet equal to current

    // Deduct another bet
    const newBalance = balance - currentBet;
    const splittingAces = isSplitAces(playerHand);

    // Create two new hands from the pair
    const hand1: SplitHand = {
      cards: [playerHand[0]],
      bet: currentBet,
      result: null,
      isDone: false,
      isDoubled: false,
    };
    const hand2: SplitHand = {
      cards: [playerHand[1]],
      bet: currentBet,
      result: null,
      isDone: false,
      isDoubled: false,
    };

    // Deal one card to each hand from the deck
    let currentDeck = deck;
    const { card: card1, remainingDeck: d1 } = dealCard(currentDeck, true);
    currentDeck = d1;
    hand1.cards = [...hand1.cards, card1];

    const { card: card2, remainingDeck: d2 } = dealCard(currentDeck, true);
    currentDeck = d2;
    hand2.cards = [...hand2.cards, card2];

    const splitHands = [hand1, hand2];

    // If splitting Aces: deal one card to each, then go directly to dealer turn
    if (splittingAces) {
      // Both hands are done - only one card each
      splitHands[0].isDone = true;
      splitHands[1].isDone = true;

      set({
        deck: currentDeck,
        balance: newBalance,
        splitHands,
        activeSplitIndex: 0,
        isSplitMode: true,
        playerHand: [], // Clear main hand in split mode
        message: "✌️ Split Aces! One card each — Dealer's turn...",
        cardsDealtTotal: get().cardsDealtTotal + 2,
      });

      // Go directly to dealer turn for split Aces
      setTimeout(() => {
        get().playDealerForSplitHands();
      }, 700);
      return;
    }

    set({
      deck: currentDeck,
      balance: newBalance,
      splitHands,
      activeSplitIndex: 0,
      isSplitMode: true,
      playerHand: [], // Clear main hand in split mode
      phase: 'playing',
      message: '✌️ Split! Playing Hand 1 — Hit or Stand?',
      cardsDealtTotal: get().cardsDealtTotal + 2,
    });
  },

  hitSplit: () => {
    const { deck, splitHands, activeSplitIndex } = get();
    if (!get().isSplitMode || get().phase !== 'playing') return;

    const currentHand = splitHands[activeSplitIndex];
    if (currentHand.isDone) return;

    const { card, remainingDeck } = dealCard(deck, true);
    const newCards = [...currentHand.cards, card];
    const newSplitHands = [...splitHands];
    newSplitHands[activeSplitIndex] = { ...currentHand, cards: newCards };

    // Check if busted
    if (isBusted(newCards)) {
      newSplitHands[activeSplitIndex] = {
        ...newSplitHands[activeSplitIndex],
        isDone: true,
        result: 'lose',
      };

      // Check if all hands are done
      const allDone = newSplitHands.every(h => h.isDone);
      if (allDone) {
        const allBusted = newSplitHands.every(h => h.result === 'lose');
        set({ deck: remainingDeck, splitHands: newSplitHands, cardsDealtTotal: get().cardsDealtTotal + 1 });

        if (allBusted) {
          get().finishSplitRound(remainingDeck, newSplitHands);
        } else {
          setTimeout(() => get().playDealerForSplitHands(), 500);
        }
        return;
      }

      // Move to next hand
      const nextIndex = activeSplitIndex + 1;
      if (nextIndex < newSplitHands.length) {
        set({
          deck: remainingDeck,
          splitHands: newSplitHands,
          activeSplitIndex: nextIndex,
          message: `✌️ Hand ${activeSplitIndex + 1} busted! Playing Hand ${nextIndex + 1} — Hit or Stand?`,
          cardsDealtTotal: get().cardsDealtTotal + 1,
        });
      }
      return;
    }

    // Score is 21 - auto-stand
    if (calculateScoreAllCards(newCards) === 21) {
      newSplitHands[activeSplitIndex] = {
        ...newSplitHands[activeSplitIndex],
        isDone: true,
      };

      const allDone = newSplitHands.every(h => h.isDone);
      if (allDone) {
        set({ deck: remainingDeck, splitHands: newSplitHands, cardsDealtTotal: get().cardsDealtTotal + 1 });
        setTimeout(() => get().playDealerForSplitHands(), 500);
        return;
      }

      const nextIndex = activeSplitIndex + 1;
      if (nextIndex < newSplitHands.length) {
        set({
          deck: remainingDeck,
          splitHands: newSplitHands,
          activeSplitIndex: nextIndex,
          message: `✌️ Hand ${activeSplitIndex + 1} stands at 21! Playing Hand ${nextIndex + 1} — Hit or Stand?`,
          cardsDealtTotal: get().cardsDealtTotal + 1,
        });
      }
      return;
    }

    set({
      deck: remainingDeck,
      splitHands: newSplitHands,
      message: `✌️ Hand ${activeSplitIndex + 1} score: ${calculateScoreAllCards(newCards)} — Hit or Stand?`,
      cardsDealtTotal: get().cardsDealtTotal + 1,
    });
  },

  standSplit: () => {
    const { splitHands, activeSplitIndex } = get();
    if (!get().isSplitMode || get().phase !== 'playing') return;

    const currentHand = splitHands[activeSplitIndex];
    if (currentHand.isDone) return;

    const newSplitHands = [...splitHands];
    newSplitHands[activeSplitIndex] = { ...currentHand, isDone: true };

    // Check if all hands are done
    const allDone = newSplitHands.every(h => h.isDone);
    if (allDone) {
      set({ splitHands: newSplitHands });
      setTimeout(() => get().playDealerForSplitHands(), 500);
      return;
    }

    // Move to next hand
    const nextIndex = activeSplitIndex + 1;
    if (nextIndex < newSplitHands.length) {
      set({
        splitHands: newSplitHands,
        activeSplitIndex: nextIndex,
        message: `✌️ Hand ${activeSplitIndex + 1} stands. Playing Hand ${nextIndex + 1} — Hit or Stand?`,
      });
    }
  },

  doubleDownSplit: () => {
    const { deck, splitHands, activeSplitIndex, balance } = get();
    if (!get().isSplitMode || get().phase !== 'playing') return;

    const currentHand = splitHands[activeSplitIndex];
    if (currentHand.isDone) return;
    // Can only double down on first two cards of the split hand
    if (currentHand.cards.length !== 2) return;
    if (balance < currentHand.bet) return;

    // Deduct the additional bet
    const newBalance = balance - currentHand.bet;
    const newBet = currentHand.bet * 2;

    const { card, remainingDeck } = dealCard(deck, true);
    const newCards = [...currentHand.cards, card];

    const newSplitHands = [...splitHands];
    newSplitHands[activeSplitIndex] = {
      ...currentHand,
      cards: newCards,
      bet: newBet,
      isDoubled: true,
      isDone: true, // Double down = stand after one card
    };

    // Check if busted
    if (isBusted(newCards)) {
      newSplitHands[activeSplitIndex] = {
        ...newSplitHands[activeSplitIndex],
        result: 'lose',
      };
    }

    set({
      deck: remainingDeck,
      splitHands: newSplitHands,
      balance: newBalance,
      cardsDealtTotal: get().cardsDealtTotal + 1,
    });

    // Check if all hands are done
    const allDone = newSplitHands.every(h => h.isDone);
    if (allDone) {
      const allBusted = newSplitHands.every(h => h.result === 'lose');
      if (allBusted) {
        get().finishSplitRound(remainingDeck, newSplitHands);
      } else {
        setTimeout(() => get().playDealerForSplitHands(), 500);
      }
      return;
    }

    // Move to next hand
    const nextIndex = activeSplitIndex + 1;
    if (nextIndex < newSplitHands.length) {
      set({
        activeSplitIndex: nextIndex,
        message: `✌️ Doubled Hand ${activeSplitIndex + 1}! Playing Hand ${nextIndex + 1} — Hit or Stand?`,
      });
    }
  },

  playDealerForSplitHands: () => {
    const { deck, dealerHand, splitHands, balance, insuranceBet } = get();

    set({ phase: 'dealerTurn', message: "Dealer's turn...", isAnimating: true });

    const revealedHand = dealerHand.map(c => ({ ...c, faceUp: true }));
    let currentDeck = deck;
    let currentDealerHand = [...revealedHand];

    set({ dealerHand: revealedHand });

    const dealerPlay = () => {
      const action = getDealerAction(currentDealerHand);

      if (action === 'hit') {
        const { card, remainingDeck } = dealCard(currentDeck, true);
        currentDeck = remainingDeck;
        currentDealerHand = [...currentDealerHand, card];

        set({
          deck: currentDeck,
          dealerHand: currentDealerHand,
          cardsDealtTotal: get().cardsDealtTotal + 1,
        });

        setTimeout(dealerPlay, 600);
      } else {
        // Dealer stands - resolve each split hand
        const currentSplitHands = [...splitHands];
        const dealerScore = calculateScoreAllCards(currentDealerHand);
        const dealerBJ = isBlackjack(currentDealerHand);

        let totalPayout = 0;
        let totalBet = 0;

        for (let i = 0; i < currentSplitHands.length; i++) {
          const hand = currentSplitHands[i];

          // Already determined as bust
          if (hand.result === 'lose') {
            totalBet += hand.bet;
            continue;
          }

          // Determine result for this hand (split hand BJ counts as 21, not natural BJ)
          const playerScore = calculateScoreAllCards(hand.cards);
          const playerBJ = isBlackjack(hand.cards);
          let result: GameResult;

          if (playerBJ) {
            // Split hand blackjack is just 21, not natural blackjack - pays 1:1
            if (dealerBJ) {
              result = 'push';
            } else {
              result = 'win';
            }
          } else if (playerScore > 21) {
            result = 'lose';
          } else if (dealerBJ) {
            result = 'dealerBlackjack';
          } else if (dealerScore > 21) {
            result = 'win';
          } else if (playerScore > dealerScore) {
            result = 'win';
          } else if (playerScore < dealerScore) {
            result = 'lose';
          } else {
            result = 'push';
          }

          currentSplitHands[i] = { ...hand, result, isDone: true };
          totalBet += hand.bet;

          // Calculate payout: split BJ pays 1:1 (not 1.5:1)
          if (playerBJ && result === 'win') {
            totalPayout += hand.bet * 2; // 1:1 payout + original bet
          } else {
            totalPayout += calculatePayout(result, hand.bet);
          }
        }

        // Add insurance payout
        const insurancePayout = calculateInsurancePayout(insuranceBet, dealerBJ);
        const insResult: InsuranceResult = insuranceBet > 0 ? (dealerBJ ? 'won' : 'lost') : null;
        totalPayout += insurancePayout;

        // Calculate combined result for stats and history
        const wins = currentSplitHands.filter(h => h.result === 'win' || h.result === 'blackjack').length;
        const losses = currentSplitHands.filter(h => h.result === 'lose' || h.result === 'dealerBlackjack').length;

        let combinedResult: GameResult;
        if (wins > 0 && losses === 0) combinedResult = 'win';
        else if (losses > 0 && wins === 0) combinedResult = 'lose';
        else if (wins === 0 && losses === 0) combinedResult = 'push';
        else combinedResult = 'push'; // Mixed results

        // Update stats for each hand
        let newStats = { ...get().stats };
        for (const hand of currentSplitHands) {
          newStats = updateStats(newStats, hand.result, 0);
        }

        const newBalance = balance + totalPayout + getSideBetWinnings(get());

        // Build result message
        const handResults = currentSplitHands.map((h, i) => {
          const score = calculateScoreAllCards(h.cards);
          const emoji = h.result === 'win' ? '✅' : h.result === 'lose' || h.result === 'dealerBlackjack' ? '❌' : '🤝';
          return `Hand ${i + 1}: ${score} ${emoji}`;
        }).join(' | ');

        const netGain = totalPayout - totalBet;
        const payoutMsg = netGain > 0 ? `+$${netGain}` : netGain === 0 ? '$0' : `-$${Math.abs(netGain)}`;

        const historyEntry: GameHistoryEntry = {
          id: ++historyId,
          result: combinedResult,
          bet: totalBet,
          payout: totalPayout,
          playerScore: calculateScoreAllCards(currentSplitHands[0].cards),
          dealerScore,
          timestamp: Date.now(),
          insuranceBet,
          insuranceResult: insResult,
          isSplit: true,
          splitResults: currentSplitHands.map(h => h.result),
          splitPayouts: currentSplitHands.map(h => {
            if (isBlackjack(h.cards) && h.result === 'win') return h.bet * 2;
            return calculatePayout(h.result, h.bet);
          }),
        };

        set({
          deck: currentDeck,
          dealerHand: currentDealerHand,
          splitHands: currentSplitHands,
          phase: 'result',
          result: combinedResult,
          balance: newBalance,
          message: `${handResults} — ${payoutMsg}`,
          stats: newStats,
          isAnimating: false,
          insuranceResult: insResult,
          history: [historyEntry, ...get().history].slice(0, 20),
          balanceHistory: [...get().balanceHistory.slice(-49), newBalance],
        });
      }
    };

    setTimeout(dealerPlay, 700);
  },

  finishSplitRound: (currentDeck: Card[], splitHands: SplitHand[]) => {
    const { dealerHand, balance, insuranceBet } = get();

    // All hands busted - reveal dealer cards and finish
    const revealedDealerHand = dealerHand.map(c => ({ ...c, faceUp: true }));
    const dealerBJ = isBlackjack(revealedDealerHand);
    const insurancePayout = calculateInsurancePayout(insuranceBet, dealerBJ);
    const insResult: InsuranceResult = insuranceBet > 0 ? (dealerBJ ? 'won' : 'lost') : null;

    let totalPayout = insurancePayout; // Only insurance, all hands lost
    let totalBet = 0;

    const updatedSplitHands = splitHands.map(h => {
      totalBet += h.bet;
      return { ...h, isDone: true, result: (h.result || 'lose') as GameResult };
    });

    // Update stats for each hand
    let newStats = { ...get().stats };
    for (const hand of updatedSplitHands) {
      newStats = updateStats(newStats, hand.result, 0);
    }

    const newBalance = balance + totalPayout + getSideBetWinnings(get());
    const dealerScore = calculateScoreAllCards(revealedDealerHand);

    const handResults = updatedSplitHands.map((h, i) => {
      const score = calculateScoreAllCards(h.cards);
      return `Hand ${i + 1}: ${score} ❌`;
    }).join(' | ');

    const historyEntry: GameHistoryEntry = {
      id: ++historyId,
      result: 'lose',
      bet: totalBet,
      payout: totalPayout,
      playerScore: calculateScoreAllCards(updatedSplitHands[0].cards),
      dealerScore,
      timestamp: Date.now(),
      insuranceBet,
      insuranceResult: insResult,
      isSplit: true,
      splitResults: updatedSplitHands.map(h => h.result),
      splitPayouts: updatedSplitHands.map(h => calculatePayout(h.result, h.bet)),
    };

    set({
      deck: currentDeck,
      dealerHand: revealedDealerHand,
      splitHands: updatedSplitHands,
      phase: 'result',
      result: 'lose',
      balance: newBalance,
      message: `${handResults} — All busted!`,
      stats: newStats,
      isAnimating: false,
      insuranceResult: insResult,
      history: [historyEntry, ...get().history].slice(0, 20),
      balanceHistory: [...get().balanceHistory.slice(-49), newBalance],
    });
  },

  newRound: () => {
    const { balance, seedCommitment, revealedSeed, isSeedVerified, roundHistory } = get();
    
    // Move current round to history before clearing
    let updatedHistory = [...roundHistory];
    if (seedCommitment) {
      const existingIdx = updatedHistory.findIndex(r => r.roundId === seedCommitment.roundId);
      const entry: RoundHistoryEntry = {
        roundId: seedCommitment.roundId,
        serverSeedHash: seedCommitment.serverSeedHash,
        serverSeed: revealedSeed?.serverSeed,
        clientSeed: seedCommitment.clientSeed,
        nonce: seedCommitment.nonce,
        shuffledDeck: seedCommitment.shuffledDeck,
        verified: isSeedVerified,
        timestamp: Date.now(),
      };
      if (existingIdx >= 0) {
        updatedHistory[existingIdx] = entry;
      } else {
        updatedHistory.push(entry);
      }
      // Keep last 20 rounds
      updatedHistory = updatedHistory.slice(-20);
    }

    if (balance < 10) {
      set({
        phase: 'betting',
        currentBet: 0,
        result: null,
        playerHand: [],
        dealerHand: [],
        message: '💰 Out of chips! Balance reset to $1,000.',
        balance: INITIAL_BALANCE,
        insuranceBet: 0,
        insuranceResult: null,
        balanceHistory: [...get().balanceHistory.slice(-49), INITIAL_BALANCE],
        splitHands: [],
        activeSplitIndex: 0,
        isSplitMode: false,
        perfectPairResult: null,
        twentyOnePlusThreeResult: null,
        perfectPairBet: 0,
        twentyOnePlusThreeBet: 0,
        seedCommitment: null,
        revealedSeed: null,
        isSeedVerified: null,
        initialDeckOrder: null,
        roundHistory: updatedHistory,
        zkCommitment: null,
        zkCardProofs: [],
        zkVerification: null,
      });
      return;
    }

    set({
      phase: 'betting',
      currentBet: 0,
      result: null,
      playerHand: [],
      dealerHand: [],
      message: 'Place your bet to start!',
      isAnimating: false,
      insuranceBet: 0,
      insuranceResult: null,
      splitHands: [],
      activeSplitIndex: 0,
      isSplitMode: false,
      perfectPairResult: null,
      twentyOnePlusThreeResult: null,
      seedCommitment: null,
      revealedSeed: null,
      isSeedVerified: null,
      initialDeckOrder: null,
      roundHistory: updatedHistory,
      zkCommitment: null,
      zkCardProofs: [],
      zkVerification: null,
      // Keep side bet amounts for convenience (they'll be deducted on next DEAL)
    });
  },

  resetGame: () => {
    historyId = 0;
    set({
      deck: [],
      playerHand: [],
      dealerHand: [],
      phase: 'betting',
      result: null,
      balance: INITIAL_BALANCE,
      currentBet: 0,
      message: 'Place your bet to start!',
      stats: { ...DEFAULT_STATS },
      isAnimating: false,
      history: [],
      insuranceBet: 0,
      insuranceResult: null,
      balanceHistory: [INITIAL_BALANCE],
      splitHands: [],
      activeSplitIndex: 0,
      isSplitMode: false,
      cardsDealtTotal: 0,
      isAutoplay: false,
      autoplayHandsRemaining: 0,
      autoplayHandsTotal: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastResultWasWin: null,
      sequence1326Index: 0,
      perfectPairBet: 0,
      twentyOnePlusThreeBet: 0,
      perfectPairResult: null,
      twentyOnePlusThreeResult: null,
      seedCommitment: null,
      revealedSeed: null,
      isSeedVerified: null,
      initialDeckOrder: null,
      roundHistory: [],
      zkCommitment: null,
      zkCardProofs: [],
      zkVerification: null,
    });
  },

  toggleStats: () => {
    set({ showStats: !get().showStats });
  },

  toggleProvablyFairPanel: () => {
    set({ showProvablyFairPanel: !get().showProvablyFairPanel });
  },

  toggleCardCounter: () => {
    set({ showCardCounter: !get().showCardCounter });
  },

  // ─── Autoplay Actions ────────────────────────────────────────
  startAutoplay: (hands: number) => {
    set({
      isAutoplay: true,
      autoplayHandsRemaining: hands,
      autoplayHandsTotal: hands,
    });
  },

  stopAutoplay: () => {
    set({
      isAutoplay: false,
      autoplayHandsRemaining: 0,
      autoplayHandsTotal: 0,
    });
  },

  setAutoplaySpeed: (speed: AutoplaySpeed) => {
    set({ autoplaySpeed: speed });
  },

  setAutoplayStrategy: (strategy: AutoplayStrategy) => {
    set({ autoplayStrategy: strategy });
  },

  setAutoplayStopBelow: (amount: number) => {
    set({ autoplayStopBelow: amount });
  },

  setAutoplayStopAbove: (amount: number) => {
    set({ autoplayStopAbove: amount });
  },

  decrementAutoplayHands: () => {
    const remaining = get().autoplayHandsRemaining - 1;
    if (remaining <= 0) {
      set({ isAutoplay: false, autoplayHandsRemaining: 0 });
    } else {
      set({ autoplayHandsRemaining: remaining });
    }
  },

  // ─── Bet Strategy Actions ────────────────────────────────────
  setBetStrategy: (strategy: BetStrategy) => {
    // Reset tracking when switching strategies
    set({
      betStrategy: strategy,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      sequence1326Index: 0,
      lastResultWasWin: null,
    });
  },

  setBetStrategyBase: (amount: number) => {
    set({ betStrategyBase: Math.max(MIN_BET, Math.min(MAX_BET, amount)) });
  },

  getSuggestedBet: () => {
    const { betStrategy, betStrategyBase, balance, consecutiveWins, consecutiveLosses, sequence1326Index } = get();
    let suggested = betStrategyBase;

    switch (betStrategy) {
      case 'flat':
        suggested = betStrategyBase;
        break;
      case 'martingale':
        // Double after each loss, reset on win
        suggested = betStrategyBase * Math.pow(2, consecutiveLosses);
        break;
      case 'paroli':
        // Double after each win (up to 3), reset on loss
        suggested = betStrategyBase * Math.pow(2, Math.min(consecutiveWins, 3));
        break;
      case '1-3-2-6': {
        const sequence = [1, 3, 2, 6];
        suggested = betStrategyBase * sequence[sequence1326Index % 4];
        break;
      }
      case 'percentage':
        // 5% of current balance
        suggested = Math.round(balance * 0.05);
        break;
      case 'count': {
        // Use card counting to adjust bet
        // This is a simplified version - the component will pass in more context
        // Base bet with count adjustment
        suggested = betStrategyBase;
        break;
      }
    }

    // Clamp to min/max bet limits
    return Math.max(MIN_BET, Math.min(Math.min(MAX_BET, balance), suggested));
  },

  recordBetResult: (wasWin: boolean) => {
    const { consecutiveWins, consecutiveLosses, sequence1326Index, betStrategy } = get();

    if (wasWin) {
      const newConsecutiveWins = consecutiveWins + 1;
      let newSequenceIndex = sequence1326Index;

      if (betStrategy === '1-3-2-6') {
        newSequenceIndex = (sequence1326Index + 1) % 4;
        // Reset after completing the sequence
        if (newSequenceIndex === 0 && sequence1326Index === 3) {
          // Completed full 1-3-2-6 cycle, reset
        }
      }

      // Paroli resets after 3 consecutive wins
      const resetWins = betStrategy === 'paroli' && newConsecutiveWins > 3;

      set({
        consecutiveWins: resetWins ? 0 : newConsecutiveWins,
        consecutiveLosses: 0,
        lastResultWasWin: true,
        sequence1326Index: resetWins ? 0 : newSequenceIndex,
      });
    } else {
      const newConsecutiveLosses = consecutiveLosses + 1;

      // Cap martingale at 5 losses to prevent astronomical bets
      const resetLosses = betStrategy === 'martingale' && newConsecutiveLosses > 5;

      set({
        consecutiveWins: 0,
        consecutiveLosses: resetLosses ? 0 : newConsecutiveLosses,
        lastResultWasWin: false,
        sequence1326Index: 0,
      });
    }
  },

  // ─── Side Bet Actions ────────────────────────────────────────
  placePerfectPairBet: (amount: number) => {
    const { balance, perfectPairBet, twentyOnePlusThreeBet } = get();
    const newAmount = perfectPairBet + amount;
    if (newAmount > SIDE_BET_MAX) return;
    if (newAmount < SIDE_BET_MIN && newAmount > 0) return;
    // Check that total pending side bets don't exceed available balance
    const totalPending = newAmount + twentyOnePlusThreeBet;
    if (totalPending > balance) return;
    set({ perfectPairBet: newAmount });
  },

  place21Plus3Bet: (amount: number) => {
    const { balance, perfectPairBet, twentyOnePlusThreeBet } = get();
    const newAmount = twentyOnePlusThreeBet + amount;
    if (newAmount > SIDE_BET_MAX) return;
    if (newAmount < SIDE_BET_MIN && newAmount > 0) return;
    // Check that total pending side bets don't exceed available balance
    const totalPending = perfectPairBet + newAmount;
    if (totalPending > balance) return;
    set({ twentyOnePlusThreeBet: newAmount });
  },

  clearSideBets: () => {
    set({ perfectPairBet: 0, twentyOnePlusThreeBet: 0 });
  },

  // ─── Provably Fair Actions ──────────────────────────────────────
  toggleProvablyFair: () => {
    set((state) => ({ provablyFairEnabled: !state.provablyFairEnabled }));
  },

  verifyProvablyFair: async () => {
    const { seedCommitment, initialDeckOrder, zkEnabled } = get();
    if (!seedCommitment) return false;

    try {
      // Call API to reveal the server seed
      // Use ZK API when ZK is enabled (also returns shuffle proof)
      const apiEndpoint = zkEnabled ? '/api/zk' : '/api/seed';
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: seedCommitment.roundId }),
      });
      const data = await response.json();
      if (!data.serverSeed) {
        set({ isSeedVerified: false, revealedSeed: null });
        return false;
      }

      const revealed: RevealedSeed = {
        roundId: seedCommitment.roundId,
        serverSeed: data.serverSeed,
        serverSeedHash: seedCommitment.serverSeedHash,
        clientSeed: data.clientSeed || seedCommitment.clientSeed,
        nonce: data.nonce || seedCommitment.nonce,
      };

      // Verify hash commitment: SHA-256(serverSeed) === serverSeedHash
      const computedHash = await sha256(revealed.serverSeed);
      const hashMatches = computedHash === revealed.serverSeedHash;

      // Verify shuffle: re-shuffle standard deck with revealed seeds and compare
      const standardDeck = createStandardDeckAbbreviated();
      const reshuffled = seededShuffle(standardDeck, revealed.serverSeed, revealed.clientSeed, revealed.nonce);
      const deckMatches = initialDeckOrder
        ? reshuffled.join(',') === initialDeckOrder.join(',')
        : hashMatches; // fallback if no deck order stored

      const isVerified = hashMatches && deckMatches;

      // Update round history with verification result
      const { roundHistory } = get();
      const existingIdx = roundHistory.findIndex(r => r.roundId === seedCommitment.roundId);
      const historyEntry: RoundHistoryEntry = {
        roundId: seedCommitment.roundId,
        serverSeedHash: seedCommitment.serverSeedHash,
        serverSeed: revealed.serverSeed,
        clientSeed: revealed.clientSeed,
        nonce: revealed.nonce,
        shuffledDeck: seedCommitment.shuffledDeck,
        verified: isVerified,
        timestamp: Date.now(),
      };
      let updatedHistory = [...roundHistory];
      if (existingIdx >= 0) {
        updatedHistory[existingIdx] = historyEntry;
      } else {
        updatedHistory.push(historyEntry);
      }
      updatedHistory = updatedHistory.slice(-20);

      set({
        revealedSeed: revealed,
        isSeedVerified: isVerified,
        roundHistory: updatedHistory,
      });

      return isVerified;
    } catch {
      set({ isSeedVerified: false, revealedSeed: null });
      return false;
    }
  },

  // ─── ZK Phase 4 Actions ────────────────────────────────────────

  toggleZKPanel: () => {
    set({ showZKPanel: !get().showZKPanel });
  },

  toggleZK: () => {
    set((state) => ({ zkEnabled: !state.zkEnabled }));
  },

  verifyZKRound: async () => {
    const { zkCommitment, seedCommitment, zkCardProofs } = get();
    if (!zkCommitment || !seedCommitment) return null;

    try {
      // Build the ZK round proof
      const roundProof = {
        commitment: zkCommitment,
        cardProofs: zkCardProofs,
      };

      // Verify the ZK proof
      const result = await verifyZKProof(roundProof, seedCommitment.serverSeedHash);

      set({ zkVerification: result });
      return result;
    } catch {
      return null;
    }
  },

  fetchCardProofs: async (positions: number[]) => {
    const { seedCommitment, zkEnabled } = get();
    if (!seedCommitment || !zkEnabled) return;

    try {
      const response = await fetch('/api/zk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: seedCommitment.roundId,
          cardPositions: positions,
        }),
      });
      const data = await response.json();

      if (data.cardProofs) {
        set({ zkCardProofs: data.cardProofs });
      }
    } catch {
      // Silently fail - card proofs are optional
    }
  },
}));
