'use client';

import { useGameStore, BetStrategy } from '@/store/game-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Equal,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  Eye,
  ChevronDown,
  Minus,
  ArrowUp,
  ArrowDown,
  Target,
} from 'lucide-react';
import { useState, useMemo } from 'react';

interface StrategyInfo {
  id: BetStrategy;
  name: string;
  description: string;
  icon: React.ReactNode;
  risk: 'conservative' | 'moderate' | 'aggressive';
  color: string;
  bgColor: string;
  borderColor: string;
  sparkline: number[];
}

const STRATEGIES: StrategyInfo[] = [
  {
    id: 'flat',
    name: 'Flat Bet',
    description: 'Same amount every hand. Low risk, steady play.',
    icon: <Equal className="w-3.5 h-3.5" />,
    risk: 'conservative',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    sparkline: [1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: 'martingale',
    name: 'Martingale',
    description: 'Double bet after loss, reset on win. Recovers losses fast but risky.',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    risk: 'aggressive',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    sparkline: [1, 2, 4, 1, 2, 4, 8],
  },
  {
    id: 'paroli',
    name: 'Reverse Martingale',
    description: 'Double after win, reset on loss. Ride winning streaks safely.',
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    risk: 'moderate',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    sparkline: [1, 2, 4, 1, 1, 2, 1],
  },
  {
    id: '1-3-2-6',
    name: '1-3-2-6 System',
    description: 'Bet 1×, 3×, 2×, 6× base on consecutive wins. Lock in profits.',
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    risk: 'moderate',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    sparkline: [1, 3, 2, 6, 1, 3, 2],
  },
  {
    id: 'percentage',
    name: 'Percentage',
    description: 'Bet 5% of current balance. Scales with your bankroll.',
    icon: <Percent className="w-3.5 h-3.5" />,
    risk: 'conservative',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    sparkline: [5, 4.5, 4, 4.5, 5, 5.5, 5],
  },
  {
    id: 'count',
    name: 'Count-Based',
    description: 'Increase bet when true count is favorable. Requires card counting.',
    icon: <Eye className="w-3.5 h-3.5" />,
    risk: 'moderate',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    sparkline: [1, 1, 2, 3, 2, 1, 1],
  },
];

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 16;
  const width = 56;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return <circle key={i} cx={x} cy={y} r="1.5" fill="currentColor" />;
      })}
    </svg>
  );
}

export function BetStrategies() {
  const {
    betStrategy,
    betStrategyBase,
    consecutiveWins,
    consecutiveLosses,
    sequence1326Index,
    balance,
    setBetStrategy,
    setBetStrategyBase,
    getSuggestedBet,
  } = useGameStore();

  const [showDetails, setShowDetails] = useState(false);
  const suggestedBet = getSuggestedBet();

  const currentStrategy = useMemo(
    () => STRATEGIES.find(s => s.id === betStrategy) ?? STRATEGIES[0],
    [betStrategy]
  );

  // Calculate the next bet display for the 1-3-2-6 system
  const sequenceLabel = useMemo(() => {
    if (betStrategy === '1-3-2-6') {
      const seq = [1, 3, 2, 6];
      const current = seq[sequence1326Index % 4];
      return `(${current}× base)`;
    }
    return '';
  }, [betStrategy, sequence1326Index]);

  // Win/loss indicator
  const streakIndicator = useMemo(() => {
    if (consecutiveWins > 0) return { icon: <ArrowUp className="w-2.5 h-2.5" />, text: `${consecutiveWins}W`, color: 'text-emerald-400' };
    if (consecutiveLosses > 0) return { icon: <ArrowDown className="w-2.5 h-2.5" />, text: `${consecutiveLosses}L`, color: 'text-red-400' };
    return { icon: <Minus className="w-2.5 h-2.5" />, text: '—', color: 'text-gray-500' };
  }, [consecutiveWins, consecutiveLosses]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gray-900/80 border border-gray-700/40 rounded-xl overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Current strategy badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${currentStrategy.bgColor} border ${currentStrategy.borderColor}`}>
            {currentStrategy.icon}
            <span className={`text-[10px] font-semibold ${currentStrategy.color}`}>
              {currentStrategy.name}
            </span>
          </div>

          {/* Suggested bet */}
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-amber-400/60" />
            <span className="text-[10px] text-gray-400">Next:</span>
            <span className="text-xs font-bold text-amber-300 font-mono">${suggestedBet}</span>
            {sequenceLabel && (
              <span className="text-[9px] text-gray-500">{sequenceLabel}</span>
            )}
          </div>

          {/* Streak indicator */}
          <div className="flex items-center gap-1">
            <span className={`flex items-center gap-0.5 text-[10px] ${streakIndicator.color}`}>
              {streakIndicator.icon}
              {streakIndicator.text}
            </span>
          </div>

          {/* Base bet control */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[9px] text-gray-500">Base</span>
            <div className="flex items-center">
              <button
                onClick={() => setBetStrategyBase(betStrategyBase - 5)}
                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors rounded"
              >
                −
              </button>
              <span className="text-[10px] font-mono text-gray-300 w-8 text-center">${betStrategyBase}</span>
              <button
                onClick={() => setBetStrategyBase(betStrategyBase + 5)}
                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors rounded"
              >
                +
              </button>
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-1 rounded transition-all duration-150 ${
              showDetails ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Strategy Selection Panel */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-700/30"
            >
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {STRATEGIES.map((strategy) => {
                    const isActive = betStrategy === strategy.id;
                    return (
                      <button
                        key={strategy.id}
                        onClick={() => setBetStrategy(strategy.id)}
                        className={`relative text-left p-2 rounded-lg border transition-all duration-200 ${
                          isActive
                            ? `${strategy.bgColor} ${strategy.borderColor}`
                            : 'border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className={strategy.color}>{strategy.icon}</span>
                            <span className={`text-[10px] font-semibold ${isActive ? strategy.color : 'text-gray-300'}`}>
                              {strategy.name}
                            </span>
                          </div>
                          <Badge
                            className={`text-[7px] px-1 py-0 h-4 ${
                              strategy.risk === 'conservative' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' :
                              strategy.risk === 'moderate' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                              'bg-red-500/15 text-red-400 border-red-500/25'
                            }`}
                          >
                            {strategy.risk === 'conservative' ? 'Low' : strategy.risk === 'moderate' ? 'Med' : 'High'}
                          </Badge>
                        </div>

                        {/* Mini sparkline */}
                        <div className={strategy.color}>
                          <MiniSparkline data={strategy.sparkline} color="currentColor" />
                        </div>

                        {/* Description on hover via title */}
                        <p className="text-[8px] text-gray-500 mt-0.5 leading-tight line-clamp-2" title={strategy.description}>
                          {strategy.description}
                        </p>

                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="strategy-indicator"
                            className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                              strategy.risk === 'conservative' ? 'bg-blue-400' :
                              strategy.risk === 'moderate' ? 'bg-amber-400' :
                              'bg-red-400'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
