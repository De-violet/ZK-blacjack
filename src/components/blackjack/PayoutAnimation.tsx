'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Coins, TrendingUp, ArrowUp } from 'lucide-react';
import { useGameStore } from '@/store/game-store';
import type { GameResult } from '@/lib/blackjack';

// ─── Props ──────────────────────────────────────────────────────────
interface PayoutAnimationProps {
  result: GameResult | null;
  bet: number;
  payout: number;
  trigger: number; // changes to trigger animation (use stats.totalGames or a counter)
}

// ─── Color & style config per result type ───────────────────────────
type ResultStyle = {
  textColor: string;
  glowColor: string;
  glowSize: string;
  showParticles: boolean;
  prefix: string;
  suffix: string;
  direction: 'up' | 'down';
  icon: typeof DollarSign;
};

const RESULT_STYLES: Record<string, ResultStyle> = {
  blackjack: {
    textColor: 'text-amber-400',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    glowSize: '20px',
    showParticles: true,
    prefix: '+$',
    suffix: ' 1.5x!',
    direction: 'up',
    icon: Coins,
  },
  win: {
    textColor: 'text-emerald-400',
    glowColor: 'rgba(52, 211, 153, 0.5)',
    glowSize: '14px',
    showParticles: true,
    prefix: '+$',
    suffix: '',
    direction: 'up',
    icon: TrendingUp,
  },
  push: {
    textColor: 'text-gray-400',
    glowColor: 'rgba(156, 163, 175, 0.3)',
    glowSize: '8px',
    showParticles: false,
    prefix: '',
    suffix: '',
    direction: 'up',
    icon: DollarSign,
  },
  lose: {
    textColor: 'text-red-400',
    glowColor: 'rgba(248, 113, 113, 0.4)',
    glowSize: '10px',
    showParticles: false,
    prefix: '-$',
    suffix: '',
    direction: 'down',
    icon: ArrowUp,
  },
  dealerBlackjack: {
    textColor: 'text-red-400',
    glowColor: 'rgba(248, 113, 113, 0.4)',
    glowSize: '10px',
    showParticles: false,
    prefix: '-$',
    suffix: '',
    direction: 'down',
    icon: ArrowUp,
  },
};

// ─── Deterministic coin particle generator ──────────────────────────
// Uses the trigger value as a seed to avoid hydration mismatches
interface CoinParticle {
  id: number;
  angle: number;       // direction in degrees
  distance: number;    // how far the coin travels (px)
  rotation: number;    // spin amount
  delay: number;       // staggered start
  duration: number;    // animation length
  size: number;        // diameter in px
  opacity: number;
}

function generateCoinParticles(trigger: number, result: GameResult): CoinParticle[] {
  const isBlackjack = result === 'blackjack';
  const count = isBlackjack ? 10 : 6;

  // Simple deterministic pseudo-random based on trigger + index
  const seed = (i: number) => {
    const x = Math.sin(trigger * 9301 + i * 49297 + 233280) * 49297;
    return x - Math.floor(x); // 0..1
  };

  return Array.from({ length: count }, (_, i) => {
    const angle = seed(i) * 360;
    const distance = 60 + seed(i + 10) * 100; // 60-160px
    const rotation = (seed(i + 20) - 0.5) * 720; // -360..360
    const delay = i * 0.06;
    const duration = 0.8 + seed(i + 30) * 0.6; // 0.8-1.4s
    const size = isBlackjack ? 8 + Math.floor(seed(i + 40) * 8) : 6 + Math.floor(seed(i + 40) * 5);
    const opacity = 0.7 + seed(i + 50) * 0.3;

    return { id: i, angle, distance, rotation, delay, duration, size, opacity };
  });
}

// ─── Component ──────────────────────────────────────────────────────
export function PayoutAnimation({ result, bet, payout, trigger }: PayoutAnimationProps) {
  // Access the store (required by spec, available for future use)
  const stats = useGameStore((s) => s.stats);

  // Derive display values
  const netGain = payout - bet;
  const style = result ? RESULT_STYLES[result] : null;

  // Generate deterministic coin particles
  const particles = useMemo(() => {
    if (trigger === 0 || !result || !style?.showParticles) return [];
    return generateCoinParticles(trigger, result);
  }, [trigger, result, style?.showParticles]);

  // Determine display text
  const displayAmount = (() => {
    if (!result || !style) return '';
    if (result === 'push') return 'Bet Returned';
    if (style.direction === 'down') {
      // Loss: show the bet amount lost
      return `${style.prefix}${bet}`;
    }
    // Win/Blackjack: show net gain
    return `${style.prefix}${netGain}${style.suffix}`;
  })();

  // Don't render if no trigger or no result
  if (trigger === 0 || !result || !style) return null;

  const IconComponent = style.icon;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
      aria-hidden="true"
    >
      <AnimatePresence>
        {trigger > 0 && result && (
          <div key={trigger} className="relative">
            {/* ── Main payout text ─────────────────────────────── */}
            <motion.p
              key={`text-${trigger}`}
              initial={{
                y: style.direction === 'up' ? 60 : -20,
                scale: 1.3,
                opacity: 0,
              }}
              animate={{
                y: style.direction === 'up' ? [60, -20, -60] : [-20, 20, 60],
                scale: [1.3, 1.1, 0.9],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2,
                ease: [0.22, 1, 0.36, 1],
                opacity: {
                  duration: 2,
                  times: [0, 0.1, 0.7, 1],
                  ease: 'easeOut',
                },
              }}
              className={`
                absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                whitespace-nowrap font-bold text-3xl sm:text-5xl
                flex items-center gap-2
                ${style.textColor}
              `}
              style={{
                textShadow: `0 0 ${style.glowSize} ${style.glowColor}, 0 0 ${parseInt(style.glowSize) * 2}px ${style.glowColor}40`,
              }}
            >
              <IconComponent className="w-7 h-7 sm:w-10 sm:h-10" />
              {displayAmount}
            </motion.p>

            {/* ── Coin particles (wins/blackjack only) ──────────── */}
            {style.showParticles && particles.map((p) => {
              const rad = (p.angle * Math.PI) / 180;
              const endX = Math.cos(rad) * p.distance;
              const endY = Math.sin(rad) * p.distance;

              return (
                <motion.div
                  key={`coin-${trigger}-${p.id}`}
                  initial={{
                    x: 0,
                    y: 0,
                    scale: 1,
                    opacity: p.opacity,
                    rotate: 0,
                  }}
                  animate={{
                    x: endX,
                    y: endY,
                    scale: [1, 1.2, 0.4],
                    opacity: [p.opacity, p.opacity, 0],
                    rotate: p.rotation,
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    ease: [0.22, 1, 0.36, 1],
                    opacity: {
                      duration: p.duration,
                      delay: p.delay,
                      times: [0, 0.5, 1],
                      ease: 'easeOut',
                    },
                    scale: {
                      duration: p.duration,
                      delay: p.delay,
                      times: [0, 0.4, 1],
                      ease: 'easeOut',
                    },
                  }}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: p.size,
                    height: p.size,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #FFD700, #DAA520, #B8860B)',
                    boxShadow: '0 0 6px rgba(255, 215, 0, 0.6)',
                    marginLeft: -p.size / 2,
                    marginTop: -p.size / 2,
                  }}
                />
              );
            })}

            {/* ── Blackjack coin rain overlay ───────────────────── */}
            {result === 'blackjack' && (
              <motion.div
                initial={{ opacity: 0.7, scale: 0.3 }}
                animate={{ opacity: 0, scale: 2.5 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(255,215,0,0) 70%)',
                }}
              />
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
