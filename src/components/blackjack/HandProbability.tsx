'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/game-store';
import { Card, Rank, Suit, calculateScoreAllCards } from '@/lib/blackjack';
import { Skull, TrendingDown, Shield, AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────
type RiskLevel = 'safe' | 'caution' | 'high' | 'critical';

interface RiskInfo {
  level: RiskLevel;
  percentage: number;
  recommendation: string;
  barColor: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
}

// ─── Determine if drawing a card of the given rank would bust ────
// This correctly handles soft hands (where an existing Ace counted
// as 11 can be demoted to 1 when a new card pushes the total over 21).
function wouldBust(hand: Card[], rank: Rank): boolean {
  // Simulate adding the card to the hand
  const testHand: Card[] = [
    ...hand,
    { suit: 'hearts' as Suit, rank, faceUp: true },
  ];
  return calculateScoreAllCards(testHand) > 21;
}

// ─── Calculate bust probability ───────────────────────────────────
// Counts how many cards in the remaining deck would bust the player,
// divided by the total number of remaining deck cards.
function calculateBustProbability(
  playerHand: Card[],
  deck: Card[]
): number {
  if (deck.length === 0) return 0;

  const currentScore = calculateScoreAllCards(playerHand);

  // Already busted or at 21 — no point hitting, but show 100% or 0%
  if (currentScore > 21) return 1.0;
  if (currentScore === 21) return 1.0; // Any card busts at 21

  // Group remaining deck cards by rank for efficiency
  const rankCounts: Partial<Record<Rank, number>> = {};
  for (const card of deck) {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  }

  // For each rank present in the deck, check if it would bust
  let bustCardCount = 0;
  const uniqueRanks = Object.keys(rankCounts) as Rank[];

  for (const rank of uniqueRanks) {
    if (wouldBust(playerHand, rank)) {
      bustCardCount += rankCounts[rank]!;
    }
  }

  return bustCardCount / deck.length;
}

// ─── Risk level classification ────────────────────────────────────
function getRiskInfo(bustPct: number): RiskInfo {
  if (bustPct < 0.3) {
    return {
      level: 'safe',
      percentage: Math.round(bustPct * 100),
      recommendation: 'Safe to hit',
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      glowColor: 'rgba(16, 185, 129, 0.3)',
    };
  }
  if (bustPct < 0.6) {
    return {
      level: 'caution',
      percentage: Math.round(bustPct * 100),
      recommendation: 'Caution',
      barColor: 'bg-amber-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      glowColor: 'rgba(245, 158, 11, 0.3)',
    };
  }
  if (bustPct < 0.8) {
    return {
      level: 'high',
      percentage: Math.round(bustPct * 100),
      recommendation: 'High risk!',
      barColor: 'bg-orange-500',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500/30',
      glowColor: 'rgba(249, 115, 22, 0.3)',
    };
  }
  return {
    level: 'critical',
    percentage: Math.round(bustPct * 100),
    recommendation: "Don't hit!",
    barColor: 'bg-red-500',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    glowColor: 'rgba(239, 68, 68, 0.3)',
  };
}

// ─── Icon selection ───────────────────────────────────────────────
function getRiskIcon(level: RiskLevel) {
  switch (level) {
    case 'safe':
      return <Shield className="h-3.5 w-3.5 text-emerald-400" />;
    case 'caution':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    case 'high':
      return <TrendingDown className="h-3.5 w-3.5 text-orange-400" />;
    case 'critical':
      return <Skull className="h-3.5 w-3.5 text-red-400" />;
  }
}

// ─── Component ────────────────────────────────────────────────────
export default function HandProbability() {
  const playerHand = useGameStore((s) => s.playerHand) as Card[];
  const deck = useGameStore((s) => s.deck) as Card[];
  const phase = useGameStore((s) => s.phase);

  // Only show during the playing phase when player has cards
  const isVisible = phase === 'playing' && playerHand.length > 0;

  // Calculate bust probability from actual remaining deck composition
  const bustProbability = useMemo(
    () => calculateBustProbability(playerHand, deck),
    [playerHand, deck]
  );

  const riskInfo = useMemo(
    () => getRiskInfo(bustProbability),
    [bustProbability]
  );

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={`risk-${riskInfo.level}`}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border ${riskInfo.borderColor} backdrop-blur-sm`}
        >
          {/* Risk icon */}
          <motion.div
            key={`icon-${riskInfo.level}`}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {getRiskIcon(riskInfo.level)}
          </motion.div>

          {/* Risk meter bar */}
          <div className="flex-1">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${riskInfo.barColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${riskInfo.percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  boxShadow: `0 0 8px 2px ${riskInfo.glowColor}`,
                }}
              />
            </div>
          </div>

          {/* Percentage */}
          <motion.span
            key={`pct-${riskInfo.percentage}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className={`text-xs font-mono font-semibold ${riskInfo.textColor} min-w-[32px] text-right`}
          >
            {riskInfo.percentage}%
          </motion.span>

          {/* Recommendation text */}
          <motion.span
            key={`rec-${riskInfo.level}`}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="text-[9px] text-gray-400 whitespace-nowrap"
          >
            {riskInfo.recommendation}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
