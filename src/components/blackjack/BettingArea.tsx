'use client';

import { useGameStore } from '@/store/game-store';
import { CHIP_VALUES } from '@/lib/blackjack';
import { Button } from '@/components/ui/button';
import { RotateCcw, Coins, Repeat } from 'lucide-react';
import { safePlay, playChipClick, playCardDeal } from '@/lib/sounds';
import { useState, useCallback, useRef } from 'react';

const CHIP_STYLES: Record<number, { bg: string; ring: string; shadow: string }> = {
  10:  { bg: 'bg-blue-500', ring: 'ring-blue-300/40', shadow: 'shadow-blue-500/30' },
  25:  { bg: 'bg-green-500', ring: 'ring-green-300/40', shadow: 'shadow-green-500/30' },
  50:  { bg: 'bg-red-500', ring: 'ring-red-300/40', shadow: 'shadow-red-500/30' },
  100: { bg: 'bg-gray-700', ring: 'ring-gray-400/40', shadow: 'shadow-gray-500/30' },
  250: { bg: 'bg-purple-500', ring: 'ring-purple-300/40', shadow: 'shadow-purple-500/30' },
  500: { bg: 'bg-amber-500', ring: 'ring-amber-300/40', shadow: 'shadow-amber-500/30' },
};

export function BettingArea() {
  const { balance, currentBet, lastBet, placeBet, clearBet, startGame, quickBet } = useGameStore();

  const canQuickBet = lastBet > 0 && balance >= lastBet && currentBet === 0;
  const canDeal = currentBet >= 10;

  const [justPlaced, setJustPlaced] = useState<number | null>(null);
  const prevBetRef = useRef(0);
  const [milestoneFlash, setMilestoneFlash] = useState(false);

  const handleChipClick = useCallback((value: number) => {
    const canAfford = balance >= value && currentBet + value <= 500;
    if (!canAfford) return;

    safePlay(playChipClick);
    setJustPlaced(value);
    placeBet(value);

    const prevBet = currentBet;
    const newBet = currentBet + value;
    if (
      (Math.floor(newBet / 100) > Math.floor(prevBet / 100)) ||
      (prevBet < 100 && newBet >= 100)
    ) {
      setMilestoneFlash(true);
      setTimeout(() => setMilestoneFlash(false), 600);
    }

    setTimeout(() => setJustPlaced(null), 400);
  }, [balance, currentBet, placeBet]);

  const handleDeal = useCallback(() => {
    if (!canDeal) return;
    safePlay(playCardDeal);
    startGame();
  }, [canDeal, startGame]);

  const handleClear = useCallback(() => {
    clearBet();
  }, [clearBet]);

  const handleQuickBet = useCallback(() => {
    if (!canQuickBet) return;
    safePlay(playChipClick);
    quickBet();
  }, [canQuickBet, quickBet]);

  return (
    <div className="w-full max-w-md mx-auto space-y-2">
      {/* Current bet display */}
      <div className="flex items-center justify-center relative">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all duration-300 ${
            currentBet > 0
              ? 'bg-amber-900/30 border-amber-500/30 shadow-lg shadow-amber-500/10'
              : 'bg-gray-800/30 border-gray-700/20'
          }`}
          style={{
            ...(currentBet > 0 ? { animation: 'bet-glow-ring 2s ease-in-out infinite' } : {}),
            ...(milestoneFlash ? { animation: 'milestone-flash 0.6s ease-out' } : {}),
          }}
        >
          <Coins
            className={`w-3.5 h-3.5 transition-colors duration-300 ${
              currentBet > 0 ? 'text-amber-400' : 'text-gray-500'
            }`}
            style={justPlaced !== null ? { animation: 'coin-bounce 0.4s ease-out' } : undefined}
          />
          <span
            className={`font-mono text-base sm:text-lg font-bold transition-colors duration-300 ${
              currentBet > 0 ? 'text-amber-200' : 'text-gray-500'
            }`}
            style={justPlaced !== null ? { animation: 'bet-flash 0.3s ease-out' } : undefined}
          >
            ${currentBet}
          </span>
          {canQuickBet && (
            <button
              onClick={handleQuickBet}
              className="ml-1 text-[9px] text-amber-400/60 hover:text-amber-300 transition-colors"
              title="Repeat last bet"
            >
              <Repeat className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Chip buttons - compact */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {CHIP_VALUES.map((value) => {
          const style = CHIP_STYLES[value];
          const canAfford = balance >= value && currentBet + value <= 500;
          const wasJustPlaced = justPlaced === value;

          return (
            <button
              key={value}
              onClick={() => handleChipClick(value)}
              disabled={!canAfford}
              className={`
                relative w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold text-[10px] sm:text-xs text-white
                transition-all duration-200 ease-out
                ${style.bg} ring-2 ${style.ring} shadow-md ${style.shadow}
                ${
                  canAfford
                    ? 'cursor-pointer hover:scale-110 hover:-translate-y-0.5 active:scale-95'
                    : 'opacity-25 cursor-not-allowed grayscale'
                }
              `}
              style={{
                backgroundImage: canAfford
                  ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25) 0%, transparent 55%)'
                  : undefined,
                animation: wasJustPlaced ? 'chip-place 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
              }}
            >
              {/* Inner dashed ring */}
              <div className="absolute inset-[4px] rounded-full border border-dashed border-white/25 pointer-events-none" />
              <span className="relative z-10">${value}</span>
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={currentBet === 0}
          className="border-gray-600/50 text-gray-300 hover:bg-gray-800 hover:text-white min-h-[36px] text-xs transition-all duration-200"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleDeal}
          disabled={!canDeal}
          className={`font-bold px-8 min-h-[36px] text-sm transition-all duration-300 relative overflow-hidden ${
            canDeal
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          style={canDeal ? { animation: 'deal-glow 2s ease-in-out infinite' } : undefined}
        >
          {canDeal && (
            <span className="absolute inset-0 pointer-events-none overflow-hidden">
              <span
                className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                style={{ animation: 'golden-shimmer 2.5s ease-in-out infinite' }}
              />
            </span>
          )}
          DEAL
        </Button>
      </div>

      {/* Bet limits */}
      <p className="text-center text-[8px] sm:text-[9px] text-gray-600 tracking-wide">
        MIN $10 — MAX $500
      </p>
    </div>
  );
}
