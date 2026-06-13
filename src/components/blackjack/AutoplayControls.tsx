'use client';

import { useGameStore, AutoplaySpeed, AutoplayStrategy } from '@/store/game-store';
import { getBasicStrategyAction } from '@/lib/basic-strategy';
import { canSplit as canSplitCards } from '@/lib/blackjack';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Zap, Gauge, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const SPEED_OPTIONS: { value: AutoplaySpeed; label: string; delay: number }[] = [
  { value: 'slow', label: 'Slow', delay: 2000 },
  { value: 'medium', label: 'Med', delay: 1000 },
  { value: 'fast', label: 'Fast', delay: 500 },
];

const HANDS_OPTIONS = [5, 10, 25, 50, Infinity];

export function AutoplayControls() {
  const {
    isAutoplay,
    autoplaySpeed,
    autoplayHandsRemaining,
    autoplayHandsTotal,
    autoplayStrategy,
    autoplayStopBelow,
    autoplayStopAbove,
    phase,
    result,
    playerHand,
    dealerHand,
    isSplitMode,
    splitHands,
    activeSplitIndex,
    balance,
    isAnimating,
    startAutoplay,
    stopAutoplay,
    setAutoplaySpeed,
    setAutoplayStrategy,
    setAutoplayStopBelow,
    setAutoplayStopAbove,
    decrementAutoplayHands,
    getSuggestedBet,
    recordBetResult,
    placeBet,
    clearBet,
    startGame,
    hit,
    stand,
    doubleDown,
    split: splitAction,
    surrender,
    declineInsurance,
    newRound,
  } = useGameStore();

  const [selectedHands, setSelectedHands] = useState<number>(10);
  const [showSettings, setShowSettings] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getSpeedDelay = useCallback(() => {
    return SPEED_OPTIONS.find(s => s.value === autoplaySpeed)?.delay ?? 1000;
  }, [autoplaySpeed]);

  // Get the autoplay action based on strategy
  const getAutoplayAction = useCallback((): 'hit' | 'stand' | 'double' | 'split' | 'surrender' | null => {
    if (autoplayStrategy === 'random') {
      const actions: ('hit' | 'stand' | 'double')[] = ['hit', 'stand', 'double'];
      // Only allow double on first 2 cards
      const canDouble = playerHand.length === 2 && balance >= useGameStore.getState().currentBet;
      const availableActions = canDouble ? actions : actions.filter(a => a !== 'double');
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    }

    // Basic strategy
    const currentHand = isSplitMode && splitHands.length > 0
      ? splitHands[activeSplitIndex]?.cards ?? playerHand
      : playerHand;

    if (!currentHand || currentHand.length === 0) return null;
    if (dealerHand.length === 0) return null;

    const dealerUpCard = dealerHand[0];
    const canDoubleDown = currentHand.length === 2 && balance >= useGameStore.getState().currentBet;
    const canSplitHand = !isSplitMode && currentHand.length === 2 && canSplitCards(currentHand) && balance >= useGameStore.getState().currentBet;
    const canSurrender = currentHand.length === 2 && !isSplitMode;

    const action = getBasicStrategyAction(
      currentHand,
      dealerUpCard,
      canDoubleDown,
      canSplitHand,
      canSurrender
    );

    switch (action) {
      case 'H': return 'hit';
      case 'S': return 'stand';
      case 'D': return 'double';
      case 'DH': return canDoubleDown ? 'double' : 'hit';
      case 'DS': return canDoubleDown ? 'double' : 'stand';
      case 'P': return 'split';
      case 'R': return 'surrender';
      default: return 'stand';
    }
  }, [autoplayStrategy, playerHand, dealerHand, isSplitMode, splitHands, activeSplitIndex, balance]);

  // Main autoplay loop — re-runs on every relevant state change
  useEffect(() => {
    if (!isAutoplay) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const delay = getSpeedDelay();

    // Don't act while animating
    if (isAnimating) return;

    // Handle different phases
    if (phase === 'betting') {
      // Place bet using strategy
      const suggestedBet = getSuggestedBet();
      if (balance < 10) {
        stopAutoplay();
        return;
      }
      // Check stop conditions
      if (balance <= autoplayStopBelow || balance >= autoplayStopAbove) {
        stopAutoplay();
        return;
      }

      timeoutRef.current = setTimeout(() => {
        if (!useGameStore.getState().isAutoplay) return;
        clearBet();
        placeBet(suggestedBet);
        // Start game on next tick so bet state is updated
        setTimeout(() => {
          if (useGameStore.getState().isAutoplay) {
            startGame();
          }
        }, 50);
      }, delay);

    } else if (phase === 'insurance') {
      // Always decline insurance in autoplay
      timeoutRef.current = setTimeout(() => {
        if (!useGameStore.getState().isAutoplay) return;
        declineInsurance();
      }, delay);

    } else if (phase === 'playing') {
      // Take action based on strategy
      const action = getAutoplayAction();
      if (action) {
        timeoutRef.current = setTimeout(() => {
          if (!useGameStore.getState().isAutoplay) return;
          switch (action) {
            case 'hit': hit(); break;
            case 'stand': stand(); break;
            case 'double': doubleDown(); break;
            case 'split': splitAction(); break;
            case 'surrender': surrender(); break;
          }
        }, delay);
      }

    } else if (phase === 'result') {
      // Record result and start new round
      timeoutRef.current = setTimeout(() => {
        if (!useGameStore.getState().isAutoplay) return;

        // Record bet result for strategy tracking
        const wasWin = result === 'win' || result === 'blackjack';
        const wasPush = result === 'push';
        if (!wasPush) {
          recordBetResult(wasWin);
        }

        decrementAutoplayHands();

        // Check if we should continue
        const state = useGameStore.getState();
        if (!state.isAutoplay) return;
        if (state.balance <= autoplayStopBelow || state.balance >= autoplayStopAbove) {
          stopAutoplay();
          return;
        }

        newRound();
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAutoplay, phase, isAnimating, result, playerHand, splitHands, activeSplitIndex, getSpeedDelay, getAutoplayAction, getSuggestedBet, balance, autoplayStopBelow, autoplayStopAbove, clearBet, placeBet, startGame, declineInsurance, hit, stand, doubleDown, splitAction, surrender, recordBetResult, decrementAutoplayHands, newRound, stopAutoplay]);

  const handleToggleAutoplay = () => {
    if (isAutoplay) {
      stopAutoplay();
    } else {
      startAutoplay(selectedHands);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gray-900/80 border border-gray-700/40 rounded-xl overflow-hidden">
        {/* Main Controls Row */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Play/Stop Button */}
          <Button
            size="sm"
            onClick={handleToggleAutoplay}
            className={`h-8 px-3 text-xs font-bold gap-1.5 transition-all duration-200 ${
              isAutoplay
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isAutoplay ? (
              <>
                <Square className="w-3 h-3" />
                STOP
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                AUTO
              </>
            )}
          </Button>

          {/* Pulsing AUTO indicator */}
          <AnimatePresence>
            {isAutoplay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] px-2 py-0.5">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex items-center gap-1"
                  >
                    <Zap className="w-2.5 h-2.5" />
                    AUTO
                  </motion.span>
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress indicator */}
          {isAutoplay && autoplayHandsTotal > 0 && (
            <span className="text-[10px] text-gray-400 font-mono">
              {autoplayHandsTotal === Infinity
                ? `∞ hands`
                : `${autoplayHandsTotal - autoplayHandsRemaining}/${autoplayHandsTotal}`}
            </span>
          )}

          {/* Speed selector */}
          <div className="flex items-center gap-0.5 ml-auto">
            <Gauge className="w-3 h-3 text-gray-500 mr-1" />
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed.value}
                onClick={() => setAutoplaySpeed(speed.value)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-150 ${
                  autoplaySpeed === speed.value
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >
                {speed.label}
              </button>
            ))}
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded transition-all duration-150 ${
              showSettings ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-700/30"
            >
              <div className="px-3 py-2.5 space-y-2.5">
                {/* Hands count */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-12 flex-shrink-0">Hands</span>
                  <div className="flex gap-1">
                    {HANDS_OPTIONS.map((count) => (
                      <button
                        key={String(count)}
                        onClick={() => setSelectedHands(count)}
                        disabled={isAutoplay}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 ${
                          selectedHands === count
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-gray-500 hover:text-gray-300 border border-gray-700/30'
                        } ${isAutoplay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {count === Infinity ? '∞' : count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy selection */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-12 flex-shrink-0">Strategy</span>
                  <div className="flex gap-1">
                    {(['basic', 'random'] as AutoplayStrategy[]).map((strat) => (
                      <button
                        key={strat}
                        onClick={() => setAutoplayStrategy(strat)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 ${
                          autoplayStrategy === strat
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'text-gray-500 hover:text-gray-300 border border-gray-700/30'
                        }`}
                      >
                        {strat === 'basic' ? '📊 Basic' : '🎲 Random'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stop conditions */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 w-12 flex-shrink-0">Stop</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-gray-500">
                      Below $
                      <input
                        type="number"
                        value={autoplayStopBelow}
                        onChange={(e) => setAutoplayStopBelow(Number(e.target.value))}
                        className="w-14 bg-gray-800 border border-gray-700/50 rounded px-1.5 py-0.5 text-[10px] text-gray-300 text-center"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-gray-500">
                      Above $
                      <input
                        type="number"
                        value={autoplayStopAbove}
                        onChange={(e) => setAutoplayStopAbove(Number(e.target.value))}
                        className="w-16 bg-gray-800 border border-gray-700/50 rounded px-1.5 py-0.5 text-[10px] text-gray-300 text-center"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
