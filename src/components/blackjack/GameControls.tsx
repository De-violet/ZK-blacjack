'use client';

import { useGameStore } from '@/store/game-store';
import { calculatePayout, canSplit } from '@/lib/blackjack';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { safePlay, playWin, playLose, playBlackjack, playPush, playSurrender as playSurrenderSfx, playButtonClick, playDoubleDown, playSplit, playCardDeal } from '@/lib/sounds';
import { useEffect, useRef } from 'react';

export function GameControls() {
  const {
    phase, playerHand, balance, currentBet,
    hit, stand, doubleDown, surrender, split: splitAction,
    newRound, result, isAnimating,
  } = useGameStore();

  const isPlaying = phase === 'playing';
  const isResult = phase === 'result';
  const soundPlayedRef = useRef(false);

  const canDouble = isPlaying && playerHand.length === 2 && balance >= currentBet;
  const canSurrender = isPlaying && playerHand.length === 2;
  const canSplitHand = isPlaying && playerHand.length === 2 && canSplit(playerHand) && balance >= currentBet;

  useEffect(() => {
    if (isResult && result && !soundPlayedRef.current) {
      soundPlayedRef.current = true;
      switch (result) {
        case 'blackjack':
          safePlay(playBlackjack);
          break;
        case 'win':
          safePlay(playWin);
          break;
        case 'lose':
        case 'dealerBlackjack':
          safePlay(playLose);
          break;
        case 'push':
          safePlay(playPush);
          break;
        case 'surrender':
          safePlay(playSurrenderSfx);
          break;
      }
    }
    if (!isResult) {
      soundPlayedRef.current = false;
    }
  }, [isResult, result]);

  if (phase === 'betting' || phase === 'dealerTurn' || phase === 'insurance') return null;

  // ─── Result Phase ─────────────────────────────────────────
  if (isResult) {
    const payout = calculatePayout(result, currentBet);
    const netGain = payout - currentBet;

    const resultConfig: Record<string, { label: string; subText: string; emoji: string; bg: string; border: string; glow: string; animation: string }> = {
      blackjack:      { label: 'BLACKJACK', subText: 'Congratulations!', emoji: '🎰', bg: 'from-amber-500 to-yellow-400', border: 'border-amber-300/50', glow: 'shadow-amber-500/30', animation: 'result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' },
      win:            { label: 'YOU WIN', subText: 'Congratulations!', emoji: '🎉', bg: 'from-emerald-600 to-green-500', border: 'border-emerald-400/50', glow: 'shadow-emerald-500/30', animation: 'result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' },
      lose:           { label: 'DEALER WINS', subText: 'Better luck next time', emoji: '', bg: 'from-red-700 to-rose-600', border: 'border-red-400/30', glow: 'shadow-red-500/20', animation: 'bust-shake 0.4s ease-out' },
      dealerBlackjack:{ label: 'DEALER BJ', subText: 'Better luck next time', emoji: '', bg: 'from-red-800 to-rose-700', border: 'border-red-400/30', glow: 'shadow-red-500/20', animation: 'bust-shake 0.4s ease-out' },
      surrender:      { label: 'SURRENDERED', subText: 'Half your bet returned', emoji: '🏳️', bg: 'from-orange-600 to-amber-500', border: 'border-orange-400/30', glow: 'shadow-orange-500/20', animation: 'result-pop 0.4s ease-out' },
      push:           { label: 'PUSH', subText: 'Your bet is returned', emoji: '🤝', bg: 'from-gray-600 to-gray-500', border: 'border-gray-400/30', glow: '', animation: 'result-pop 0.4s ease-out' },
    };

    const config = resultConfig[result || 'push'] || resultConfig.push;
    const isPositive = netGain > 0;
    const isBlackjack = result === 'blackjack';

    return (
      <div className="flex flex-col items-center gap-1.5">
        {/* Result banner */}
        <div
          className={`relative px-6 py-2 rounded-xl font-bold text-base text-center bg-gradient-to-r ${config.bg} text-white shadow-xl ${config.glow} border ${config.border}`}
          style={{ animation: config.animation }}
        >
          <span className="mr-1">{config.emoji}</span>
          <span style={isBlackjack ? { animation: 'sparkle-glow 1.5s ease-in-out infinite' } : undefined}>
            {config.label}
          </span>
          {isBlackjack && (
            <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,215,0,0.15) 0%, transparent 60%)' }} />
          )}
        </div>

        {/* Payout display */}
        <div
          className="flex items-center gap-1.5"
          style={{ animation: 'result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both' }}
        >
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-lg border transition-all duration-300 ${
              isPositive ? 'bg-emerald-900/30 border-emerald-700/30' :
              netGain < 0 ? 'bg-red-900/30 border-red-700/30' :
              'bg-gray-800/50 border-gray-700/30'
            }`}
          >
            <span
              className={`font-mono font-bold text-sm ${
                isPositive ? 'text-emerald-400' : netGain < 0 ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {result === 'surrender'
                ? `-$${currentBet - payout}`
                : isPositive ? `+$${netGain}` : netGain === 0 ? '$0' : `-$${currentBet}`
              }
            </span>
          </div>
          {isBlackjack && (
            <span className="text-amber-400/70 text-[9px] font-medium bg-amber-900/20 px-1.5 py-0.5 rounded-full border border-amber-700/20">
              1.5× payout
            </span>
          )}
        </div>

        {/* New Round button */}
        <Button
          onClick={() => {
            safePlay(playButtonClick);
            newRound();
          }}
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-bold px-6 min-h-[36px] shadow-lg shadow-amber-500/20 transition-all duration-200"
          style={{ animation: 'result-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          New Round
          <span className="hidden sm:inline text-[9px] ml-1.5 opacity-60 font-normal">N</span>
        </Button>
      </div>
    );
  }

  // ─── Playing Phase ────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex flex-wrap justify-center gap-1.5 sm:gap-2"
        style={{ animation: 'result-pop 0.3s ease-out' }}
      >
        <Button
          onClick={() => {
            safePlay(playCardDeal);
            hit();
          }}
          disabled={!isPlaying || isAnimating}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold min-w-[64px] sm:min-w-[80px] min-h-[36px] text-xs shadow-md shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/30 active:scale-95"
          style={isPlaying && !isAnimating ? { animation: 'hit-pulse 2s ease-in-out infinite' } : undefined}
        >
          Hit <span className="hidden sm:inline text-[9px] ml-1 opacity-50">H</span>
        </Button>
        <Button
          onClick={() => {
            safePlay(playButtonClick);
            stand();
          }}
          disabled={!isPlaying || isAnimating}
          size="sm"
          variant="outline"
          className="border-amber-500/50 text-amber-300 hover:bg-amber-900/30 font-bold min-w-[64px] sm:min-w-[80px] min-h-[36px] text-xs transition-all duration-200 active:scale-95"
        >
          Stand <span className="hidden sm:inline text-[9px] ml-1 opacity-50">S</span>
        </Button>
        <Button
          onClick={() => {
            safePlay(playDoubleDown);
            doubleDown();
          }}
          disabled={!canDouble || isAnimating}
          size="sm"
          variant="outline"
          className="border-purple-500/50 text-purple-300 hover:bg-purple-900/30 font-bold min-w-[64px] sm:min-w-[80px] min-h-[36px] text-xs transition-all duration-200 active:scale-95"
        >
          Double <span className="hidden sm:inline text-[9px] ml-1 opacity-50">D</span>
        </Button>
        {canSplitHand && (
          <Button
            onClick={() => {
              safePlay(playSplit);
              splitAction();
            }}
            disabled={isAnimating}
            size="sm"
            variant="outline"
            className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/30 font-bold min-w-[64px] sm:min-w-[80px] min-h-[36px] text-xs transition-all duration-200 active:scale-95"
            style={{ animation: 'result-pop 0.3s ease-out' }}
          >
            Split
          </Button>
        )}
        {canSurrender && (
          <Button
            onClick={() => {
              safePlay(playSurrenderSfx);
              surrender();
            }}
            disabled={isAnimating}
            size="sm"
            variant="outline"
            className="border-orange-500/40 text-orange-400/70 hover:bg-orange-900/20 font-bold min-w-[64px] sm:min-w-[80px] min-h-[36px] text-xs transition-all duration-200 active:scale-95"
          >
            Surrender
          </Button>
        )}
      </div>
    </div>
  );
}
