'use client';

import { useGameStore } from '@/store/game-store';
import { Card, DECK_SIZE } from '@/lib/blackjack';
import { calculateRunningCount, calculateTrueCount, getCountAdvice } from '@/lib/card-counter';
import {
  getBasicStrategyAction,
  getStrategyLabel,
  getStrategyDescription,
  getStrategyColor,
  getStrategyBgColor,
  StrategyAction,
} from '@/lib/basic-strategy';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export function CardCounterDisplay() {
  const {
    playerHand,
    dealerHand,
    phase,
    showCardCounter,
    toggleCardCounter,
    isSplitMode,
    splitHands,
    activeSplitIndex,
    cardsDealtTotal,
  } = useGameStore();

  const [isExpanded, setIsExpanded] = useState(false);

  // Collect all visible cards for counting
  const allVisibleCards: Card[] = [
    ...playerHand.filter(c => c.faceUp),
    ...dealerHand.filter(c => c.faceUp),
    ...(isSplitMode ? splitHands.flatMap(h => h.cards.filter(c => c.faceUp)) : []),
  ];

  const runningCount = calculateRunningCount(allVisibleCards);
  const cardsRemaining = DECK_SIZE - cardsDealtTotal;
  const decksRemaining = Math.max(1, cardsRemaining / 52);
  const trueCount = calculateTrueCount(runningCount, decksRemaining);
  const countAdvice = getCountAdvice(trueCount);

  // Determine current hand for strategy
  const currentHand = isSplitMode
    ? splitHands[activeSplitIndex]?.cards ?? []
    : playerHand;

  // Dealer up card (first face-up card)
  const dealerUpCard = dealerHand.find(c => c.faceUp) ?? dealerHand[0];

  // Calculate basic strategy
  const canDouble = currentHand.length === 2 && phase === 'playing';
  const canSplit = currentHand.length === 2 && phase === 'playing';
  const canSurrender = currentHand.length === 2 && phase === 'playing' && !isSplitMode;

  const strategyAction: StrategyAction | null =
    phase === 'playing' && currentHand.length >= 2 && dealerUpCard
      ? getBasicStrategyAction(currentHand, dealerUpCard, canDouble, canSplit, canSurrender)
      : null;

  // Color for running count
  const rcColor =
    runningCount > 0 ? 'text-emerald-400' :
    runningCount < 0 ? 'text-red-400' :
    'text-gray-400';

  // Color for true count
  const tcColor =
    trueCount > 1 ? 'text-emerald-400' :
    trueCount < -1 ? 'text-red-400' :
    'text-gray-400';

  // Trend icon
  const TrendIcon =
    trueCount > 1 ? TrendingUp :
    trueCount < -1 ? TrendingDown :
    Minus;

  if (!showCardCounter) return null;

  return (
    <div className="relative z-30">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 right-0 w-64 sm:w-72 rounded-xl border border-white/10 bg-gray-900/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-gray-800/50">
              <div className="flex items-center gap-1.5">
                <TrendIcon className={`w-3.5 h-3.5 ${tcColor}`} />
                <span className="text-xs font-semibold text-gray-200">Card Counter</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-md hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Collapse card counter"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Count Values */}
            <div className="px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">Running Count</span>
                <span className={`text-sm font-mono font-bold ${rcColor}`}>
                  {runningCount > 0 ? '+' : ''}{runningCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">True Count</span>
                <span className={`text-sm font-mono font-bold ${tcColor}`}>
                  {trueCount > 0 ? '+' : ''}{trueCount.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">Decks Left</span>
                <span className="text-sm font-mono text-gray-300">
                  {decksRemaining.toFixed(1)}
                </span>
              </div>

              {/* Count Advice */}
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    trueCount >= 2 ? 'text-emerald-400' :
                    trueCount <= -2 ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {countAdvice.action}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">{countAdvice.description}</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5">{countAdvice.betAdvice}</p>
              </div>
            </div>

            {/* Strategy Section */}
            {strategyAction && (
              <div className="px-3 py-2.5 border-t border-white/10 bg-gray-800/30">
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="w-3 h-3 text-gray-500" />
                  <span className="text-[11px] text-gray-400 font-semibold">Basic Strategy</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-xs font-bold px-2.5 py-0.5 border ${getStrategyBgColor(strategyAction)} ${getStrategyColor(strategyAction)}`}
                  >
                    {strategyAction}
                  </Badge>
                  <div>
                    <p className={`text-xs font-semibold ${getStrategyColor(strategyAction)}`}>
                      {getStrategyLabel(strategyAction)}
                    </p>
                    <p className="text-[9px] text-gray-500 leading-tight mt-0.5">
                      {getStrategyDescription(strategyAction)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Hi-Lo Reference */}
            <div className="px-3 py-2 border-t border-white/5 bg-gray-800/20">
              <p className="text-[9px] text-gray-600 text-center">
                Hi-Lo: 2-6 = +1 | 7-9 = 0 | 10-A = -1
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-900/80 backdrop-blur-sm border border-white/10 hover:border-white/20 shadow-lg shadow-black/30 transition-all hover:bg-gray-800/80 cursor-pointer"
            aria-label="Expand card counter"
          >
            <Eye className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] font-mono text-gray-400">RC:</span>
            <span className={`text-[10px] font-mono font-bold ${rcColor}`}>
              {runningCount > 0 ? '+' : ''}{runningCount}
            </span>
            <span className="text-[10px] text-gray-600">|</span>
            <span className="text-[10px] font-mono text-gray-400">TC:</span>
            <span className={`text-[10px] font-mono font-bold ${tcColor}`}>
              {trueCount > 0 ? '+' : ''}{trueCount.toFixed(1)}
            </span>
            {strategyAction && (
              <>
                <span className="text-[10px] text-gray-600">|</span>
                <Badge
                  className={`text-[8px] font-bold px-1 py-0 border ${getStrategyBgColor(strategyAction)} ${getStrategyColor(strategyAction)}`}
                >
                  {strategyAction}
                </Badge>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
