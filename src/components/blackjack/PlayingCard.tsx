'use client';

import { Card as CardType, getSuitSymbol, getSuitColor } from '@/lib/blackjack';

interface PlayingCardProps {
  card: CardType;
  index?: number;
  compact?: boolean;
  isBlackjack?: boolean;
  isResultPhase?: boolean;
  isWinningHand?: boolean;
  isDealerReveal?: boolean;
  isDealer?: boolean;
}

export function PlayingCard({
  card,
  index = 0,
  compact = false,
  isResultPhase = false,
  isWinningHand = false,
  isDealerReveal = false,
  isDealer = false,
}: PlayingCardProps) {
  const isRed = getSuitColor(card.suit) === 'red';
  const suitSymbol = getSuitSymbol(card.suit);
  const isAce = card.rank === 'A';
  const isFace = ['J', 'Q', 'K'].includes(card.rank);
  const isTen = card.rank === '10';

  // Smaller card sizes to fit viewport without scrolling
  const sizeClass = compact
    ? 'w-10 h-14 sm:w-12 sm:h-[68px]'
    : 'w-[52px] h-[72px] sm:w-[64px] sm:h-[90px]';

  // Animation class based on context
  const animClass = isDealerReveal
    ? 'animate-card-flip'
    : isDealer
      ? 'animate-card-deal-left'
      : 'animate-card-deal';

  // Win glow on result phase - golden for winning hands
  const winGlow = isResultPhase && isWinningHand;

  // Stagger delay via CSS custom property
  const staggerDelay = `${index * 0.12}s`;

  // Card back - elegant diamond pattern
  if (!card.faceUp) {
    return (
      <div
        className={`${sizeClass} rounded-md flex-shrink-0 overflow-hidden relative ${animClass}`}
        style={{
          background: 'linear-gradient(135deg, #1e120a 0%, #3a2214 50%, #1e120a 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          border: '1px solid rgba(180,130,60,0.25)',
          animationDelay: staggerDelay,
        }}
      >
        {/* Inner border */}
        <div className="absolute inset-[2px] rounded-[3px] border border-amber-600/20" />
        {/* Diamond pattern */}
        <div
          className="absolute inset-[4px] rounded-[2px] overflow-hidden"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(255,215,0,0.04) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(255,215,0,0.04) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(255,215,0,0.04) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(255,215,0,0.04) 75%)
            `,
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
          }}
        />
        {/* Center diamond ornament */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rotate-45 border border-amber-400/30 rounded-[2px]">
            <div className="absolute inset-[2px] rotate-0 border border-amber-300/20 rounded-[1px]" />
          </div>
        </div>
      </div>
    );
  }

  const colorClass = isRed ? 'text-red-600' : 'text-gray-800';
  const suitColorClass = isRed ? 'text-red-500' : 'text-gray-700';

  return (
    <div
      className={`${sizeClass} rounded-md flex-shrink-0 bg-white overflow-hidden relative ${winGlow ? 'animate-card-win-gold' : animClass}`}
      style={{
        boxShadow: winGlow
          ? '0 0 10px rgba(255,215,0,0.35), 0 2px 8px rgba(0,0,0,0.3)'
          : isAce
            ? '0 0 6px rgba(255,215,0,0.15), 0 2px 6px rgba(0,0,0,0.25)'
            : '0 2px 6px rgba(0,0,0,0.25)',
        border: winGlow
          ? '1px solid rgba(255,215,0,0.4)'
          : '1px solid rgba(200,200,200,0.3)',
        animationDelay: winGlow ? undefined : staggerDelay,
      }}
    >
      {/* Ace golden shimmer */}
      {isAce && (
        <div
          className="absolute inset-0 pointer-events-none rounded-md"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255,215,0,0.08) 0%, transparent 60%)',
          }}
        />
      )}

      {/* Face card subtle tint */}
      {isFace && (
        <div
          className={`absolute inset-0 pointer-events-none rounded-md ${isRed ? 'bg-red-50/30' : 'bg-gray-50/20'}`}
        />
      )}

      {/* Top-left rank & suit */}
      <div className="absolute top-[1px] left-[2px] sm:top-[2px] sm:left-[3px] flex flex-col items-center leading-none">
        <span className={`font-bold ${colorClass} ${isTen ? 'text-[6px] sm:text-[8px]' : 'text-[8px] sm:text-[10px]'}`}>
          {card.rank}
        </span>
        <span className={`${suitColorClass} text-[6px] sm:text-[8px] leading-none`}>
          {suitSymbol}
        </span>
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isAce ? (
          <div className="relative flex items-center justify-center">
            <div className="absolute w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-amber-300/20" />
            <span className={`${suitColorClass} text-lg sm:text-2xl select-none`}>
              {suitSymbol}
            </span>
          </div>
        ) : isFace ? (
          <div className="flex flex-col items-center gap-[1px]">
            <span
              className={`${colorClass} font-serif font-bold text-xs sm:text-sm select-none leading-none`}
            >
              {card.rank}
            </span>
            <span className={`${suitColorClass} text-[7px] sm:text-[10px] select-none leading-none`}>
              {suitSymbol}
            </span>
          </div>
        ) : (
          <span className={`${suitColorClass} text-sm sm:text-lg select-none`}>
            {suitSymbol}
          </span>
        )}
      </div>

      {/* Bottom-right rank & suit */}
      <div className="absolute bottom-[1px] right-[2px] sm:bottom-[2px] sm:right-[3px] flex flex-col items-center leading-none rotate-180">
        <span className={`font-bold ${colorClass} ${isTen ? 'text-[6px] sm:text-[8px]' : 'text-[8px] sm:text-[10px]'}`}>
          {card.rank}
        </span>
        <span className={`${suitColorClass} text-[6px] sm:text-[8px] leading-none`}>
          {suitSymbol}
        </span>
      </div>

      {/* Subtle inner border */}
      <div className="absolute inset-[1.5px] rounded-[3px] border border-gray-100/40 pointer-events-none" />

      {/* Glossy highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none rounded-md" />
    </div>
  );
}
