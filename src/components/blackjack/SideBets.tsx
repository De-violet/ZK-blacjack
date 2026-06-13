'use client';

import { useGameStore } from '@/store/game-store';
import { SIDE_BET_MIN, SIDE_BET_MAX } from '@/lib/blackjack';
import type { PerfectPairType, TwentyOnePlusThreeType } from '@/lib/blackjack';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, X, Heart, Diamond, Club, Spade, Sparkles, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

const SIDE_BET_CHIPS = [5, 10, 25, 50, 100] as const;

const CHIP_COLORS_SB: Record<number, { bg: string; border: string; text: string }> = {
  5: { bg: 'bg-orange-500', border: 'border-orange-300', text: 'text-white' },
  10: { bg: 'bg-blue-500', border: 'border-blue-300', text: 'text-white' },
  25: { bg: 'bg-green-500', border: 'border-green-300', text: 'text-white' },
  50: { bg: 'bg-red-500', border: 'border-red-300', text: 'text-white' },
  100: { bg: 'bg-gray-800', border: 'border-gray-400', text: 'text-white' },
};

const PP_PAYOUTS: { type: PerfectPairType; label: string; payout: string; color: string }[] = [
  { type: 'perfect', label: 'Perfect Pair', payout: '25:1', color: 'text-rose-300' },
  { type: 'colored', label: 'Colored Pair', payout: '12:1', color: 'text-rose-400' },
  { type: 'mixed', label: 'Mixed Pair', payout: '6:1', color: 'text-rose-500' },
];

const PP3_PAYOUTS: { type: TwentyOnePlusThreeType; label: string; payout: string; color: string }[] = [
  { type: 'suitedTrips', label: 'Suited Trips', payout: '100:1', color: 'text-cyan-300' },
  { type: 'straightFlush', label: 'Straight Flush', payout: '40:1', color: 'text-cyan-400' },
  { type: 'threeOfAKind', label: 'Three of a Kind', payout: '30:1', color: 'text-teal-400' },
  { type: 'straight', label: 'Straight', payout: '10:1', color: 'text-teal-500' },
  { type: 'flush', label: 'Flush', payout: '5:1', color: 'text-teal-600' },
];

function SuitIcon({ suit, className }: { suit: string; className?: string }) {
  switch (suit) {
    case 'hearts': return <Heart className={className} />;
    case 'diamonds': return <Diamond className={className} />;
    case 'clubs': return <Club className={className} />;
    case 'spades': return <Spade className={className} />;
    default: return null;
  }
}

function SideBetResultBadge({
  type,
  winAmount,
  label,
  colorClass,
}: {
  type: string | null;
  winAmount: number;
  label: string;
  colorClass: string;
}) {
  if (!type) return null;

  const isWin = winAmount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Badge
        className={`${colorClass} border px-3 py-1 text-xs font-bold ${
          isWin
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            : 'bg-red-500/20 border-red-500/40 text-red-300'
        }`}
      >
        {isWin ? (
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {label}: +${winAmount}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <X className="w-3 h-3" />
            {label}: No match
          </span>
        )}
      </Badge>
    </motion.div>
  );
}

export function SideBets() {
  const {
    balance,
    perfectPairBet,
    twentyOnePlusThreeBet,
    perfectPairResult,
    twentyOnePlusThreeResult,
    placePerfectPairBet,
    place21Plus3Bet,
    clearSideBets,
    phase,
  } = useGameStore();

  const isBettingPhase = phase === 'betting';
  const isResultPhase = phase === 'result';
  const isMobile = useMediaQuery('(max-width: 639px)');
  const [showPPPayout, setShowPPPayout] = useState(false);
  const [showPP3Payout, setShowPP3Payout] = useState(false);

  const totalSideBets = perfectPairBet + twentyOnePlusThreeBet;

  // Determine which result label to show
  const ppResultLabel = perfectPairResult?.type
    ? PP_PAYOUTS.find(p => p.type === perfectPairResult.type)?.label ?? ''
    : '';
  const pp3ResultLabel = twentyOnePlusThreeResult?.type
    ? PP3_PAYOUTS.find(p => p.type === twentyOnePlusThreeResult.type)?.label ?? ''
    : '';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Side bet panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Perfect Pairs Panel */}
        <motion.div
          whileHover={isBettingPhase ? { scale: 1.01 } : {}}
          transition={{ duration: 0.15 }}
        >
          <Card className={`relative overflow-hidden border transition-all duration-300 ${
            perfectPairBet > 0
              ? 'bg-rose-950/40 border-rose-500/40 shadow-lg shadow-rose-500/10'
              : 'bg-gray-900/60 border-gray-700/30'
          }`}>
            {/* Active indicator */}
            {perfectPairBet > 0 && (
              <motion.div
                className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <span className="text-rose-400">
                    <SuitIcon suit="hearts" className="w-4 h-4" />
                  </span>
                  <span className={perfectPairBet > 0 ? 'text-rose-300' : 'text-gray-300'}>
                    Perfect Pairs
                  </span>
                </CardTitle>
                {perfectPairBet > 0 && (
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] px-1.5 py-0">
                    ${perfectPairBet}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">
                Bet on your first two cards being a pair
              </p>
            </CardHeader>

            <CardContent className="px-4 pb-3 space-y-2">
              {/* Payout table - collapsible on mobile */}
              <div>
                <button
                  onClick={() => isMobile && setShowPPPayout(!showPPPayout)}
                  className="flex items-center justify-between w-full text-[10px] text-gray-500"
                >
                  <span>Payouts</span>
                  {isMobile && (
                    showPPPayout ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {(!isMobile || showPPPayout) && (
                  <div className="space-y-0.5 mt-1">
                    {PP_PAYOUTS.map((p) => (
                      <div key={p.type} className="flex items-center justify-between text-[10px]">
                        <span className={p.color}>{p.label}</span>
                        <span className="text-gray-400 font-mono">{p.payout}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bet controls - only during betting phase */}
              {isBettingPhase && (
                <div className="space-y-2 pt-1">
                  {/* Chip buttons */}
                  <div className="grid grid-cols-5 gap-1 sm:flex sm:flex-wrap sm:gap-1.5 sm:justify-center">
                    {SIDE_BET_CHIPS.map((value) => {
                      const colors = CHIP_COLORS_SB[value];
                      const canAfford = balance - twentyOnePlusThreeBet >= perfectPairBet + value;
                      const wouldExceedMax = perfectPairBet + value > SIDE_BET_MAX;

                      return (
                        <button
                          key={`pp-${value}`}
                          onClick={() => placePerfectPairBet(value)}
                          disabled={!canAfford || wouldExceedMax}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${colors.bg} ${colors.border} ${colors.text}
                            border-2 shadow-sm flex items-center justify-center mx-auto
                            font-bold text-[7px] sm:text-[8px]
                            transition-all duration-150
                            ${canAfford && !wouldExceedMax
                              ? 'cursor-pointer hover:scale-110 hover:-translate-y-0.5 active:scale-95'
                              : 'opacity-25 cursor-not-allowed'}`}
                        >
                          ${value}
                        </button>
                      );
                    })}
                  </div>

                  {/* Adjust buttons */}
                  {perfectPairBet > 0 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-rose-500/30 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300"
                        onClick={() => {
                          const newAmt = Math.max(0, perfectPairBet - SIDE_BET_MIN);
                          clearSideBets();
                          if (newAmt > 0) placePerfectPairBet(newAmt);
                          if (twentyOnePlusThreeBet > 0) place21Plus3Bet(twentyOnePlusThreeBet);
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-rose-300 font-mono text-xs font-bold min-w-[40px] text-center">
                        ${perfectPairBet}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-rose-500/30 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300"
                        onClick={() => placePerfectPairBet(SIDE_BET_MIN)}
                        disabled={perfectPairBet + SIDE_BET_MIN > SIDE_BET_MAX || balance - twentyOnePlusThreeBet < perfectPairBet + SIDE_BET_MIN}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-400/60 hover:text-rose-300 hover:bg-rose-900/20"
                        onClick={() => {
                          const pp3 = twentyOnePlusThreeBet;
                          clearSideBets();
                          if (pp3 > 0) place21Plus3Bet(pp3);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Result display */}
              {isResultPhase && perfectPairResult && (
                <div className="pt-1">
                  <AnimatePresence>
                    <SideBetResultBadge
                      type={perfectPairResult.type}
                      winAmount={perfectPairResult.winAmount}
                      label={ppResultLabel}
                      colorClass=""
                    />
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 21+3 Panel */}
        <motion.div
          whileHover={isBettingPhase ? { scale: 1.01 } : {}}
          transition={{ duration: 0.15 }}
        >
          <Card className={`relative overflow-hidden border transition-all duration-300 ${
            twentyOnePlusThreeBet > 0
              ? 'bg-cyan-950/40 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'bg-gray-900/60 border-gray-700/30'
          }`}>
            {/* Active indicator */}
            {twentyOnePlusThreeBet > 0 && (
              <motion.div
                className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <span className="text-cyan-400">
                    <Zap className="w-4 h-4" />
                  </span>
                  <span className={twentyOnePlusThreeBet > 0 ? 'text-cyan-300' : 'text-gray-300'}>
                    21+3
                  </span>
                </CardTitle>
                {twentyOnePlusThreeBet > 0 && (
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] px-1.5 py-0">
                    ${twentyOnePlusThreeBet}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">
                Your 2 cards + dealer up card make a poker hand
              </p>
            </CardHeader>

            <CardContent className="px-4 pb-3 space-y-2">
              {/* Payout table - collapsible on mobile */}
              <div>
                <button
                  onClick={() => isMobile && setShowPP3Payout(!showPP3Payout)}
                  className="flex items-center justify-between w-full text-[10px] text-gray-500"
                >
                  <span>Payouts</span>
                  {isMobile && (
                    showPP3Payout ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {(!isMobile || showPP3Payout) && (
                  <div className="space-y-0.5 mt-1">
                    {PP3_PAYOUTS.map((p) => (
                      <div key={p.type} className="flex items-center justify-between text-[10px]">
                        <span className={p.color}>{p.label}</span>
                        <span className="text-gray-400 font-mono">{p.payout}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bet controls - only during betting phase */}
              {isBettingPhase && (
                <div className="space-y-2 pt-1">
                  {/* Chip buttons */}
                  <div className="grid grid-cols-5 gap-1 sm:flex sm:flex-wrap sm:gap-1.5 sm:justify-center">
                    {SIDE_BET_CHIPS.map((value) => {
                      const colors = CHIP_COLORS_SB[value];
                      const canAfford = balance - perfectPairBet >= twentyOnePlusThreeBet + value;
                      const wouldExceedMax = twentyOnePlusThreeBet + value > SIDE_BET_MAX;

                      return (
                        <button
                          key={`pp3-${value}`}
                          onClick={() => place21Plus3Bet(value)}
                          disabled={!canAfford || wouldExceedMax}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${colors.bg} ${colors.border} ${colors.text}
                            border-2 shadow-sm flex items-center justify-center mx-auto
                            font-bold text-[7px] sm:text-[8px]
                            transition-all duration-150
                            ${canAfford && !wouldExceedMax
                              ? 'cursor-pointer hover:scale-110 hover:-translate-y-0.5 active:scale-95'
                              : 'opacity-25 cursor-not-allowed'}`}
                        >
                          ${value}
                        </button>
                      );
                    })}
                  </div>

                  {/* Adjust buttons */}
                  {twentyOnePlusThreeBet > 0 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30 hover:text-cyan-300"
                        onClick={() => {
                          const newAmt = Math.max(0, twentyOnePlusThreeBet - SIDE_BET_MIN);
                          const pp = perfectPairBet;
                          clearSideBets();
                          if (pp > 0) placePerfectPairBet(pp);
                          if (newAmt > 0) place21Plus3Bet(newAmt);
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-cyan-300 font-mono text-xs font-bold min-w-[40px] text-center">
                        ${twentyOnePlusThreeBet}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30 hover:text-cyan-300"
                        onClick={() => place21Plus3Bet(SIDE_BET_MIN)}
                        disabled={twentyOnePlusThreeBet + SIDE_BET_MIN > SIDE_BET_MAX || balance - perfectPairBet < twentyOnePlusThreeBet + SIDE_BET_MIN}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-900/20"
                        onClick={() => {
                          const pp = perfectPairBet;
                          clearSideBets();
                          if (pp > 0) placePerfectPairBet(pp);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Result display */}
              {isResultPhase && twentyOnePlusThreeResult && (
                <div className="pt-1">
                  <AnimatePresence>
                    <SideBetResultBadge
                      type={twentyOnePlusThreeResult.type}
                      winAmount={twentyOnePlusThreeResult.winAmount}
                      label={pp3ResultLabel}
                      colorClass=""
                    />
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Clear all side bets button */}
      {isBettingPhase && totalSideBets > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={clearSideBets}
            className="text-gray-400 hover:text-white border-gray-600/40 hover:bg-gray-800/50 text-[10px] h-7"
          >
            <X className="w-3 h-3 mr-1" />
            Clear Side Bets (${totalSideBets})
          </Button>
        </motion.div>
      )}
    </div>
  );
}
