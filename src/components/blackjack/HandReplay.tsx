'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  History,
  Trophy,
  X,
} from 'lucide-react';
import { useGameStore } from '@/store/game-store';
import type { GameResult, GameHistoryEntry } from '@/store/game-store';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getResultLabel(result: GameResult | null): string {
  if (!result) return '—';
  switch (result) {
    case 'win':
      return 'Win';
    case 'lose':
      return 'Lose';
    case 'push':
      return 'Push';
    case 'blackjack':
      return 'Blackjack!';
    case 'dealerBlackjack':
      return 'Dealer BJ';
    case 'surrender':
      return 'Surrender';
    case 'split':
      return 'Split';
    default:
      return result;
  }
}

function getResultColor(result: GameResult | null): string {
  if (!result) return 'bg-gray-600 text-gray-200';
  switch (result) {
    case 'win':
      return 'bg-green-600 text-white';
    case 'blackjack':
      return 'bg-yellow-500 text-gray-900';
    case 'lose':
    case 'dealerBlackjack':
      return 'bg-red-600 text-white';
    case 'push':
      return 'bg-gray-500 text-gray-100';
    case 'surrender':
      return 'bg-orange-600 text-white';
    case 'split':
      return 'bg-blue-600 text-white';
    default:
      return 'bg-gray-600 text-gray-200';
  }
}

function getResultBadgeVariant(
  result: GameResult | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!result) return 'secondary';
  switch (result) {
    case 'win':
    case 'blackjack':
      return 'default';
    case 'lose':
    case 'dealerBlackjack':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function isWinResult(result: GameResult | null): boolean {
  return result === 'win' || result === 'blackjack';
}

function isLossResult(result: GameResult | null): boolean {
  return result === 'lose' || result === 'dealerBlackjack' || result === 'surrender';
}

function isBlackjackResult(result: GameResult | null): boolean {
  return result === 'blackjack';
}

function isBustScore(score: number): boolean {
  return score > 21;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ScoreDisplay({
  label,
  score,
  isBust,
  isBlackjack,
}: {
  label: string;
  score: number;
  isBust: boolean;
  isBlackjack: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-medium uppercase tracking-wider text-gray-400">
        {label}
      </span>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${label}-${score}-${isBust}-${isBlackjack}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative"
        >
          {isBlackjack && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="absolute -top-5 -right-5"
            >
              <Trophy className="h-5 w-5 text-yellow-400" />
            </motion.div>
          )}

          <div
            className={`
              flex items-center justify-center rounded-xl border-2 px-8 py-4
              text-4xl font-bold
              ${
                isBust
                  ? 'border-red-500/50 bg-red-950/40 text-red-400'
                  : isBlackjack
                    ? 'border-yellow-500/50 bg-yellow-950/30 text-yellow-300'
                    : 'border-gray-600/50 bg-gray-800/60 text-white'
              }
            `}
          >
            {isBust ? (
              <span className="flex items-center gap-2">
                <X className="h-7 w-7" />
                {score}
              </span>
            ) : (
              score
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ResultBanner({ result }: { result: GameResult | null }) {
  const label = getResultLabel(result);
  const win = isWinResult(result);
  const loss = isLossResult(result);
  const bj = isBlackjackResult(result);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`result-${result}`}
        initial={{ y: -30, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          flex items-center justify-center rounded-lg px-6 py-3 text-xl font-bold
          ${
            win
              ? 'bg-green-600/20 text-green-400 ring-1 ring-green-500/40'
              : loss
                ? 'bg-red-600/20 text-red-400 ring-1 ring-red-500/40'
                : 'bg-gray-600/20 text-gray-300 ring-1 ring-gray-500/40'
          }
        `}
      >
        {bj && <Trophy className="mr-2 h-6 w-6 text-yellow-400" />}
        {label}
      </motion.div>
    </AnimatePresence>
  );
}

function HandListItem({
  entry,
  isSelected,
  onClick,
}: {
  entry: GameHistoryEntry;
  isSelected: boolean;
  onClick: () => void;
}) {
  const resultColor = getResultColor(entry.result);
  const resultLabel = getResultLabel(entry.result);
  const netPayout = entry.payout - entry.bet;

  return (
    <button
      onClick={onClick}
      className={`
        w-full rounded-lg border p-3 text-left transition-all duration-200
        ${
          isSelected
            ? 'border-gray-500 bg-gray-800/80 ring-1 ring-gray-400/30'
            : 'border-gray-700/40 bg-gray-800/30 hover:border-gray-600/60 hover:bg-gray-800/60'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <Badge
          variant={getResultBadgeVariant(entry.result)}
          className={`${resultColor} border-0 text-xs font-semibold`}
        >
          {resultLabel}
        </Badge>
        <span className="text-xs text-gray-500">
          {formatTimeAgo(entry.timestamp)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm text-gray-300">
          {entry.playerScore} vs {entry.dealerScore}
        </span>
        <span
          className={`text-sm font-medium ${
            netPayout > 0
              ? 'text-green-400'
              : netPayout < 0
                ? 'text-red-400'
                : 'text-gray-400'
          }`}
        >
          {netPayout > 0 ? '+' : ''}
          {netPayout !== 0 ? `$${Math.abs(netPayout)}` : '—'}
        </span>
      </div>

      {entry.isSplit && entry.splitResults && (
        <div className="mt-1 flex items-center gap-1">
          <span className="text-xs text-gray-500">Split:</span>
          {entry.splitResults.map((sr, i) => (
            <Badge
              key={i}
              variant="outline"
              className={`border-0 px-1 py-0 text-[10px] ${getResultColor(sr)}`}
            >
              {getResultLabel(sr)}
            </Badge>
          ))}
        </div>
      )}

      {entry.insuranceBet !== undefined && entry.insuranceBet > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          Insurance: ${entry.insuranceBet}{' '}
          {entry.insuranceResult === 'won' ? '(won)' : entry.insuranceResult === 'lost' ? '(lost)' : ''}
        </div>
      )}
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface HandReplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HandReplay({ open, onOpenChange }: HandReplayProps) {
  const history = useGameStore((s) => s.history);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Reverse so most recent is first for display
  const reversedHistory = useMemo(
    () => [...history].reverse(),
    [history]
  );

  const selectedEntry = useMemo(
    () => (selectedIndex !== null ? reversedHistory[selectedIndex] : null),
    [selectedIndex, reversedHistory]
  );

  const canGoPrev = selectedIndex !== null && selectedIndex > 0;
  const canGoNext =
    selectedIndex !== null && selectedIndex < reversedHistory.length - 1;

  const goToPrev = useCallback(() => {
    if (canGoPrev) setSelectedIndex((i) => (i !== null ? i - 1 : null));
  }, [canGoPrev]);

  const goToNext = useCallback(() => {
    if (canGoNext) setSelectedIndex((i) => (i !== null ? i + 1 : null));
  }, [canGoNext]);

  const selectHand = useCallback(
    (index: number) => {
      setSelectedIndex(index);
    },
    []
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setSelectedIndex(null);
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-4xl border-gray-700/50 bg-gray-900 p-0 text-white sm:max-w-4xl">
        <DialogHeader className="border-b border-gray-700/50 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <History className="h-5 w-5 text-gray-400" />
            Hand Replay
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-col md:flex-row">
          {/* ── Hand List ──────────────────────────────────────────── */}
          <div className="flex flex-col border-b border-gray-700/50 md:w-72 md:border-b-0 md:border-r">
            <div className="px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Past Hands ({reversedHistory.length})
              </p>
            </div>

            {reversedHistory.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 py-12">
                <p className="text-sm text-gray-500">No hands played yet</p>
              </div>
            ) : (
              <div className="max-h-96 flex-1 space-y-2 overflow-y-auto px-4 pb-4 md:max-h-[60vh]">
                {reversedHistory.map((entry, i) => (
                  <HandListItem
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedIndex === i}
                    onClick={() => selectHand(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Replay Panel ───────────────────────────────────────── */}
          <div className="flex flex-1 flex-col">
            {!selectedEntry ? (
              <div className="flex flex-1 items-center justify-center px-6 py-16">
                <div className="text-center">
                  <History className="mx-auto mb-3 h-12 w-12 text-gray-700" />
                  <p className="text-sm text-gray-500">
                    Select a hand to replay
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col">
                {/* Scores */}
                <div className="flex items-center justify-around gap-4 px-6 py-8">
                  <ScoreDisplay
                    label="Player"
                    score={selectedEntry.playerScore}
                    isBust={isBustScore(selectedEntry.playerScore)}
                    isBlackjack={
                      isBlackjackResult(selectedEntry.result) &&
                      selectedEntry.playerScore === 21
                    }
                  />

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-bold text-gray-500">VS</span>
                  </div>

                  <ScoreDisplay
                    label="Dealer"
                    score={selectedEntry.dealerScore}
                    isBust={isBustScore(selectedEntry.dealerScore)}
                    isBlackjack={
                      selectedEntry.result === 'dealerBlackjack' &&
                      selectedEntry.dealerScore === 21
                    }
                  />
                </div>

                {/* Result Banner */}
                <div className="px-6">
                  <ResultBanner result={selectedEntry.result} />
                </div>

                {/* Bet / Payout Details */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`details-${selectedEntry.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: 0.15 }}
                    className="mt-6 space-y-3 px-6"
                  >
                    <div className="flex items-center justify-between rounded-lg bg-gray-800/50 px-4 py-3">
                      <span className="text-sm text-gray-400">Bet</span>
                      <span className="font-mono text-sm font-semibold text-white">
                        ${selectedEntry.bet}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-gray-800/50 px-4 py-3">
                      <span className="text-sm text-gray-400">Payout</span>
                      <span
                        className={`font-mono text-sm font-semibold ${
                          selectedEntry.payout > selectedEntry.bet
                            ? 'text-green-400'
                            : selectedEntry.payout < selectedEntry.bet
                              ? 'text-red-400'
                              : 'text-gray-300'
                        }`}
                      >
                        ${selectedEntry.payout}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-gray-800/50 px-4 py-3">
                      <span className="text-sm text-gray-400">Net</span>
                      <span
                        className={`font-mono text-sm font-bold ${
                          selectedEntry.payout - selectedEntry.bet > 0
                            ? 'text-green-400'
                            : selectedEntry.payout - selectedEntry.bet < 0
                              ? 'text-red-400'
                              : 'text-gray-400'
                        }`}
                      >
                        {selectedEntry.payout - selectedEntry.bet > 0
                          ? '+'
                          : ''}
                        ${selectedEntry.payout - selectedEntry.bet}
                      </span>
                    </div>

                    {selectedEntry.insuranceBet !== undefined &&
                      selectedEntry.insuranceBet > 0 && (
                        <div className="flex items-center justify-between rounded-lg bg-gray-800/50 px-4 py-3">
                          <span className="text-sm text-gray-400">
                            Insurance
                          </span>
                          <span
                            className={`font-mono text-sm font-semibold ${
                              selectedEntry.insuranceResult === 'won'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            ${selectedEntry.insuranceBet}{' '}
                            {selectedEntry.insuranceResult === 'won'
                              ? '(won)'
                              : '(lost)'}
                          </span>
                        </div>
                      )}

                    {selectedEntry.isSplit &&
                      selectedEntry.splitResults &&
                      selectedEntry.splitPayouts && (
                        <div className="space-y-2 rounded-lg bg-gray-800/50 px-4 py-3">
                          <span className="text-sm text-gray-400">
                            Split Hands
                          </span>
                          {selectedEntry.splitResults.map((sr, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between pl-2"
                            >
                              <Badge
                                variant="outline"
                                className={`border-0 text-xs ${getResultColor(sr)}`}
                              >
                                Hand {i + 1}: {getResultLabel(sr)}
                              </Badge>
                              <span
                                className={`font-mono text-xs ${
                                  (selectedEntry.splitPayouts?.[i] ?? 0) > 0
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}
                              >
                                ${selectedEntry.splitPayouts?.[i] ?? 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="mt-auto flex items-center justify-between border-t border-gray-700/50 px-6 py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canGoPrev}
                    onClick={goToPrev}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>

                  <span className="text-xs text-gray-500">
                    {selectedIndex !== null
                      ? `${selectedIndex + 1} / ${reversedHistory.length}`
                      : ''}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canGoNext}
                    onClick={goToNext}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
