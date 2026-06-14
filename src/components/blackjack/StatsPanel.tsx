'use client';

import { useGameStore } from '@/store/game-store';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StatsPanel() {
  const { stats, showStats, toggleStats, balance, history } = useGameStore();

  if (!showStats) return null;

  const totalDecisions = stats.wins + stats.losses;
  const winRate = totalDecisions > 0 ? ((stats.wins / totalDecisions) * 100).toFixed(1) : '0.0';
  const sessionProfit = balance - 1000;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleStats} />

      {/* Panel - slides in */}
      <div className="relative w-full max-w-sm bg-gray-900/95 backdrop-blur-md border-l border-gray-700/40 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/60">
          <h2 className="text-base font-bold text-white">Statistics</h2>
          <Button variant="ghost" size="sm" onClick={toggleStats} className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* Win Rate - big display */}
          <div className="text-center py-3">
            <div className="text-4xl font-bold text-emerald-400">{winRate}<span className="text-lg">%</span></div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5">Win Rate</div>
          </div>

          {/* Session Profit */}
          <div className="flex items-center justify-center gap-2 py-2 bg-gray-800/40 rounded-xl">
            {sessionProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : sessionProfit < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : (
              <Minus className="w-4 h-4 text-gray-400" />
            )}
            <span className={`text-lg font-bold font-mono ${sessionProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {sessionProfit >= 0 ? '+' : ''}{sessionProfit >= 0 ? `$${sessionProfit}` : `-$${Math.abs(sessionProfit)}`}
            </span>
            <span className="text-[10px] text-gray-500 uppercase">session</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Wins" value={stats.wins} color="text-emerald-400" bgColor="bg-emerald-900/20" />
            <StatBox label="Losses" value={stats.losses} color="text-red-400" bgColor="bg-red-900/20" />
            <StatBox label="Pushes" value={stats.pushes} color="text-gray-400" bgColor="bg-gray-800/40" />
            <StatBox label="Blackjacks" value={stats.blackjacks} color="text-amber-400" bgColor="bg-amber-900/20" />
          </div>

          {/* Streaks */}
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Best Streak" value={stats.bestStreak} color="text-emerald-400" bgColor="bg-emerald-900/15" />
            <StatBox label="Current Streak" value={stats.currentStreak} color="text-amber-400" bgColor="bg-amber-900/15" />
          </div>

          {/* Total Games */}
          <div className="text-center text-xs text-gray-500">
            {stats.totalGames} games played
          </div>

          {/* Recent History */}
          {history && history.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Recent Games</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {history.slice(-15).reverse().map((entry, i) => {
                  const isWin = entry.result === 'win' || entry.result === 'blackjack';
                  const isLoss = entry.result === 'lose' || entry.result === 'dealerBlackjack';
                  return (
                    <div key={i} className={`flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg transition-colors ${
                      isWin ? 'bg-emerald-900/15' : isLoss ? 'bg-red-900/10' : 'bg-gray-800/30'
                    }`}>
                      <span className={`font-medium ${
                        isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {entry.result === 'blackjack' ? '🎰 BJ!' : entry.result === 'win' ? '✓ Win' :
                         entry.result === 'lose' ? '✗ Loss' : entry.result === 'dealerBlackjack' ? '✗ DBJ' :
                         entry.result === 'surrender' ? '⚑ Sur' : '— Push'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-500">${entry.bet}</span>
                        <span className={`font-mono font-medium ${isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-500'}`}>
                          {entry.payout > entry.bet ? `+$${entry.payout - entry.bet}` :
                           entry.payout < entry.bet ? `-$${entry.bet - entry.payout}` : '$0'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
  return (
    <div className={`${bgColor} rounded-xl p-3 text-center`}>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
