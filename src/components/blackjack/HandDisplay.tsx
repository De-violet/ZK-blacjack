'use client';

import { Card as CardType, calculateScore, calculateScoreAllCards, isBlackjack as isHandBlackjack } from '@/lib/blackjack';
import { PlayingCard } from './PlayingCard';

interface HandDisplayProps {
  cards: CardType[];
  label: string;
  hideScore?: boolean;
  isDealer?: boolean;
  isActive?: boolean;
  isResultPhase?: boolean;
  isWinningHand?: boolean;
  isDealerTurn?: boolean;
}

export function HandDisplay({ cards, label, hideScore = false, isDealer = false, isActive = false, isResultPhase = false, isWinningHand = false, isDealerTurn = false }: HandDisplayProps) {
  const hasHiddenCard = cards.some(c => !c.faceUp);
  const score = hasHiddenCard ? calculateScore(cards) : calculateScoreAllCards(cards);
  const handIsBlackjack = isHandBlackjack(cards);
  const isBust = !hasHiddenCard && score > 21;
  const isPerfect = !hasHiddenCard && score === 21;

  // Use score as animation key
  const scoreKey = `${score}-${cards.length}-${cards.filter(c => c.faceUp).length}`;

  // Overlap based on card count - tighter overlaps
  const getOverlap = () => {
    const len = cards.length;
    if (len <= 2) return '-space-x-2 sm:-space-x-4';
    if (len <= 4) return '-space-x-4 sm:-space-x-6';
    return '-space-x-6 sm:-space-x-8';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Label & Score row */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className={`w-4 sm:w-6 h-px ${isDealer ? 'bg-gradient-to-r from-transparent to-amber-500/30' : 'bg-gradient-to-r from-transparent to-emerald-500/30'}`} />
        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] ${isDealer ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
          {label}
        </span>
        <div className={`w-4 sm:w-6 h-px ${isDealer ? 'bg-gradient-to-l from-transparent to-amber-500/30' : 'bg-gradient-to-l from-transparent to-emerald-500/30'}`} />

        {cards.length > 0 && (
          <div
            key={scoreKey}
            className={`relative font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${
              isBust ? 'bg-red-900/60 text-red-300 border border-red-500/40' :
              handIsBlackjack ? 'bg-amber-900/50 text-amber-200 border border-amber-500/40' :
              isPerfect ? 'bg-amber-900/40 text-amber-300 border border-amber-500/30' :
              isDealer ? 'bg-amber-900/25 text-amber-300/80 border border-amber-700/20' :
              'bg-emerald-900/25 text-emerald-300/80 border border-emerald-700/20'
            }`}
            style={{ animation: 'score-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {hasHiddenCard ? `${score}+?` : score}
            {handIsBlackjack && !hasHiddenCard && (
              <span className="absolute -top-1.5 -right-1.5 text-[7px] font-bold text-amber-300 bg-amber-600/80 rounded-full w-3.5 h-3.5 flex items-center justify-center">BJ</span>
            )}
            {isBust && (<span className="ml-0.5 text-red-400 text-[8px]">BUST</span>)}
          </div>
        )}

        {isActive && (
          <span className="text-[8px] font-bold text-cyan-400 bg-cyan-900/30 border border-cyan-500/30 rounded-full px-1.5 py-0.5 uppercase tracking-wider">Active</span>
        )}
      </div>

      {/* Cards container */}
      <div className="flex items-center justify-center">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center gap-1">
            {/* Ghost card silhouette */}
            <div
              className={`w-[52px] h-[72px] sm:w-[64px] sm:h-[90px] rounded-md border border-dashed relative overflow-hidden ${
                isDealer ? 'border-amber-600/15' : 'border-emerald-600/15'
              }`}
              style={{
                background: isDealer
                  ? 'linear-gradient(135deg, rgba(180,130,60,0.04) 0%, rgba(180,130,60,0.08) 50%, rgba(180,130,60,0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(52,211,153,0.04) 0%, rgba(52,211,153,0.08) 50%, rgba(52,211,153,0.04) 100%)',
                animation: 'ghost-pulse 3s ease-in-out infinite',
              }}
            >
              <div className={`absolute inset-[4px] rounded-[3px] border ${
                isDealer ? 'border-amber-600/10' : 'border-emerald-600/10'
              }`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 rotate-45 rounded-[2px] ${
                    isDealer ? 'border border-amber-500/15' : 'border border-emerald-500/15'
                  }`} />
                </div>
              </div>
            </div>
            <span className={`text-[8px] font-medium tracking-wider ${
              isDealer ? 'text-amber-500/25' : 'text-emerald-500/25'
            }`}>
              Waiting
            </span>
          </div>
        ) : (
          <div className={`flex ${getOverlap()}`}>
            {cards.map((card, index) => (
              <PlayingCard
                key={`card-${index}-${card.rank}-${card.suit}-${cards.length}`}
                card={card}
                index={index}
                isResultPhase={isResultPhase}
                isWinningHand={isWinningHand}
                isDealer={isDealer}
                isDealerReveal={isDealer && isResultPhase && index === 1 && card.faceUp}
              />
            ))}
          </div>
        )}
      </div>

      {isBust && (
        <div className="absolute inset-0 pointer-events-none bg-red-500/10 rounded-lg" style={{ animation: 'bust-red-flash 0.8s ease-out forwards' }} />
      )}
    </div>
  );
}
