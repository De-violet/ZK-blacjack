'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/game-store';

type GameResult =
  | 'win'
  | 'lose'
  | 'push'
  | 'blackjack'
  | 'dealerBlackjack'
  | 'surrender'
  | 'split'
  | null;

interface GameHistoryEntry {
  id: number;
  result: GameResult;
  bet: number;
  payout: number;
  playerScore: number;
  dealerScore: number;
  timestamp: number;
}

const SCORE_BUCKETS = [17, 18, 19, 20, 21] as const;
const BUCKET_LABELS = ['17', '18', '19', '20', '21', 'Bust'] as const;

function getDealerOutcome(
  entry: GameHistoryEntry
): 'bust' | 'won' | 'push' | 'other' {
  if (entry.dealerScore > 21) return 'bust';
  if (
    entry.result === 'lose' ||
    entry.result === 'dealerBlackjack' ||
    entry.result === 'surrender'
  )
    return 'won';
  if (entry.result === 'push') return 'push';
  return 'other';
}

export default function DealerStatsTracker() {
  const history = useGameStore((s) => s.history);

  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;

    const entries = history as GameHistoryEntry[];
    const total = entries.length;

    // Dealer bust rate
    const bustCount = entries.filter((e) => e.dealerScore > 21).length;
    const bustRate = (bustCount / total) * 100;

    // Average dealer score (cap at 21 for display purposes, use raw for average)
    const avgScore =
      entries.reduce((sum, e) => sum + Math.min(e.dealerScore, 30), 0) / total;

    // Dealer blackjack frequency
    const dealerBJCount = entries.filter(
      (e) => e.result === 'dealerBlackjack'
    ).length;
    const dealerBJRate = (dealerBJCount / total) * 100;

    // Score distribution
    const distribution: Record<string, number> = {
      '17': 0,
      '18': 0,
      '19': 0,
      '20': 0,
      '21': 0,
      Bust: 0,
    };

    entries.forEach((e) => {
      if (e.dealerScore > 21) {
        distribution['Bust']++;
      } else if (e.dealerScore >= 17) {
        distribution[String(e.dealerScore)]++;
      } else {
        // Scores below 17 are rare for a completed dealer hand
        // but we bucket them into the closest label
        distribution['17']++;
      }
    });

    const maxDist = Math.max(...Object.values(distribution), 1);

    // Recent dealer results (last 20)
    const recentOutcomes = entries.slice(-20).map((e) => ({
      outcome: getDealerOutcome(e),
      dealerScore: e.dealerScore,
    }));

    return {
      total,
      bustRate,
      avgScore,
      dealerBJRate,
      dealerBJCount,
      bustCount,
      distribution,
      maxDist,
      recentOutcomes,
    };
  }, [history]);

  if (!stats) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm p-3 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dealer Stats
          </h3>
          <span className="text-[10px] text-muted-foreground/60">
            {stats.total} hand{stats.total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-center rounded-md bg-background/60 px-2 py-1.5"
          >
            <div className="text-sm font-bold text-emerald-400">
              {stats.bustRate.toFixed(0)}%
            </div>
            <div className="text-[10px] text-muted-foreground">Bust Rate</div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center rounded-md bg-background/60 px-2 py-1.5"
          >
            <div className="text-sm font-bold text-amber-400">
              {stats.avgScore.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">Avg Score</div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-center rounded-md bg-background/60 px-2 py-1.5"
          >
            <div className="text-sm font-bold text-rose-400">
              {stats.dealerBJRate.toFixed(0)}%
            </div>
            <div className="text-[10px] text-muted-foreground">BJ Freq</div>
          </motion.div>
        </div>

        {/* Mini Bar Chart — Score Distribution */}
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wide">
            Score Distribution
          </div>
          <div className="flex items-end gap-1 h-16">
            {BUCKET_LABELS.map((label, i) => {
              const count = stats.distribution[label];
              const heightPct = (count / stats.maxDist) * 100;
              const isBust = label === 'Bust';

              return (
                <motion.div
                  key={label}
                  className="flex-1 flex flex-col items-center gap-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                >
                  {/* Count above bar */}
                  <span className="text-[9px] text-muted-foreground/80 tabular-nums">
                    {count > 0 ? count : ''}
                  </span>

                  {/* Bar */}
                  <div className="w-full relative" style={{ height: '48px' }}>
                    <motion.div
                      className={`absolute bottom-0 left-0 right-0 rounded-sm ${
                        isBust
                          ? 'bg-emerald-500/70'
                          : 'bg-primary/50'
                      }`}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(heightPct, 4)}%` }}
                      transition={{
                        delay: 0.15 + i * 0.06,
                        duration: 0.4,
                        ease: 'easeOut',
                      }}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[9px] font-medium ${
                      isBust
                        ? 'text-emerald-400'
                        : 'text-muted-foreground/70'
                    }`}
                  >
                    {label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Dealer Results Dots */}
        {stats.recentOutcomes.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wide">
              Recent Dealer Results
            </div>
            <div className="flex flex-wrap gap-1">
              {stats.recentOutcomes.map((entry, i) => {
                const dotColor =
                  entry.outcome === 'bust'
                    ? 'bg-emerald-500'
                    : entry.outcome === 'won'
                      ? 'bg-red-500'
                      : entry.outcome === 'push'
                        ? 'bg-zinc-400'
                        : 'bg-zinc-300';

                const tooltip =
                  entry.outcome === 'bust'
                    ? `Bust (${entry.dealerScore})`
                    : entry.outcome === 'won'
                      ? `Dealer won (${entry.dealerScore})`
                      : entry.outcome === 'push'
                        ? `Push (${entry.dealerScore})`
                        : `Other (${entry.dealerScore})`;

                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.02, type: 'spring', stiffness: 500 }}
                    className={`w-2 h-2 rounded-full ${dotColor} ring-1 ring-black/10`}
                    title={tooltip}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-muted-foreground/60">
                  Bust
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[9px] text-muted-foreground/60">
                  Dealer Won
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span className="text-[9px] text-muted-foreground/60">
                  Push
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
