'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/game-store';
import { getBasicStrategyAction } from '@/lib/basic-strategy';
import { Card, calculateScoreAllCards, getCardValue } from '@/lib/blackjack';
import { AlertTriangle, Shield, TrendingUp, Hand, Swords } from 'lucide-react';

type StrengthLevel = 'strong' | 'medium' | 'weak';

interface StrengthInfo {
  level: StrengthLevel;
  label: string;
  percentage: number;
  bustProbability: number;
  isSoft: boolean;
  recommendation: string;
}

function estimateBustProbability(score: number, isSoft: boolean): number {
  if (score > 21) return 1.0;
  if (score <= 11) return 0.0;

  // Soft hands can never bust from a single hit — the Ace demotes from 11 to 1
  if (isSoft) return 0.0;

  // Cards that would bust the player
  const bustThreshold = 21 - score;
  // Standard deck distribution: 2-10, J(10), Q(10), K(10), A(1 or 11)
  // Cards with value > bustThreshold will bust
  const bustValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
  let bustCount = 0;
  for (const val of bustValues) {
    if (val > bustThreshold) bustCount++;
  }

  return Math.min(1, bustCount / 13);
}

function checkSoftHand(hand: Card[]): boolean {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    score += getCardValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return aces > 0 && score <= 21;
}

function calculateHandStrength(
  playerHand: Card[],
  dealerHand: Card[]
): StrengthInfo {
  const score = calculateScoreAllCards(playerHand);
  const soft = checkSoftHand(playerHand);
  const bustProb = estimateBustProbability(score, soft);
  const dealerUpCard = dealerHand[0];

  // Get basic strategy recommendation
  let recommendation = 'Stand';
  if (dealerUpCard) {
    try {
      const canDouble = playerHand.length === 2;
      const canSplit = playerHand.length === 2 && playerHand[0].rank === playerHand[1].rank;
      const canSurrender = playerHand.length === 2;
      const action = getBasicStrategyAction(playerHand, dealerUpCard, canDouble, canSplit, canSurrender);
      switch (action) {
        case 'H': recommendation = 'Hit'; break;
        case 'S': recommendation = 'Stand'; break;
        case 'D': case 'DH': recommendation = 'Double'; break;
        case 'DS': recommendation = 'Stand'; break;
        case 'P': recommendation = 'Split'; break;
        case 'R': recommendation = 'Surrender'; break;
        default: recommendation = 'Stand';
      }
    } catch {
      recommendation = 'Stand';
    }
  }

  // Determine strength level
  let level: StrengthLevel;
  let label: string;
  let percentage: number;

  if (score > 21) {
    level = 'weak';
    label = 'Busted!';
    percentage = 0;
  } else if (score >= 17 && score <= 21) {
    level = 'strong';
    label = 'Strong Hand';
    percentage = 80 + ((score - 17) / 4) * 20;
  } else if (score >= 13 && score <= 16) {
    level = 'medium';
    label = 'Caution';
    percentage = 45 + ((score - 13) / 3) * 30;
  } else {
    level = 'weak';
    label = 'Risky';
    percentage = 10 + ((score - 2) / 10) * 30;
  }

  // Soft hands get a slight boost since Ace provides flexibility
  if (soft && score <= 21) {
    percentage = Math.min(100, percentage + 10);
  }

  // Blackjack (21 with 2 cards) is the strongest
  if (score === 21 && playerHand.length === 2) {
    label = 'Blackjack!';
    percentage = 100;
    level = 'strong';
  }

  return {
    level,
    label,
    percentage,
    bustProbability: bustProb,
    isSoft: soft,
    recommendation,
  };
}

const strengthColors: Record<StrengthLevel, { bar: string; glow: string; text: string; bg: string }> = {
  strong: {
    bar: 'from-emerald-400 to-emerald-600',
    glow: 'shadow-emerald-500/40',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  medium: {
    bar: 'from-amber-400 to-amber-600',
    glow: 'shadow-amber-500/40',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  weak: {
    bar: 'from-red-400 to-red-600',
    glow: 'shadow-red-500/40',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
  },
};

function getRecommendationIcon(rec: string) {
  switch (rec) {
    case 'Hit':
      return <TrendingUp className="h-3.5 w-3.5" />;
    case 'Stand':
      return <Hand className="h-3.5 w-3.5" />;
    case 'Double':
      return <Swords className="h-3.5 w-3.5" />;
    case 'Split':
      return <Swords className="h-3.5 w-3.5" />;
    case 'Surrender':
      return <AlertTriangle className="h-3.5 w-3.5" />;
    default:
      return <Shield className="h-3.5 w-3.5" />;
  }
}

export default function HandStrengthMeter() {
  const playerHand = useGameStore((s) => s.playerHand) as Card[];
  const dealerHand = useGameStore((s) => s.dealerHand) as Card[];
  const phase = useGameStore((s) => s.phase);

  const strength = useMemo(
    () => calculateHandStrength(playerHand, dealerHand),
    [playerHand, dealerHand]
  );

  const colors = strengthColors[strength.level];
  const bustPct = Math.round(strength.bustProbability * 100);

  if (phase !== 'playing' || playerHand.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={strength.label}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`w-full max-w-xs rounded-lg border border-white/10 p-3 ${colors.bg} backdrop-blur-sm`}
      >
        {/* Header row: label + soft indicator */}
        <div className="mb-2 flex items-center justify-between">
          <motion.span
            key={strength.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-sm font-semibold ${colors.text}`}
          >
            {strength.label}
          </motion.span>
          {strength.isSoft && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60">
              Soft
            </span>
          )}
        </div>

        {/* Strength bar */}
        <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${colors.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${strength.percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              boxShadow: `0 0 12px 2px ${
                strength.level === 'strong'
                  ? 'rgba(52,211,153,0.35)'
                  : strength.level === 'medium'
                    ? 'rgba(251,191,36,0.35)'
                    : 'rgba(248,113,113,0.35)'
              }`,
            }}
          />
        </div>

        {/* Bottom row: recommendation */}
        <div className="flex items-center justify-between text-xs text-white/60">
          <span className="text-[10px] text-white/40">
            {strength.isSoft ? 'Soft hand — Ace flexibility' : `Hand strength: ${strength.percentage}%`}
          </span>

          <motion.div
            key={strength.recommendation}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${colors.bg} ${colors.text} font-medium`}
          >
            {getRecommendationIcon(strength.recommendation)}
            <span>{strength.recommendation}</span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
