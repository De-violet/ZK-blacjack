'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { GameResult } from '@/lib/blackjack';

// Casino-themed color palette
const CASINO_COLORS = ['#FFD700', '#10B981', '#FFFFFF', '#F59E0B'];
const GOLD_SPARKLE_COLORS = ['#FFD700', '#FFEC8B', '#FFF8DC', '#F59E0B', '#DAA520'];

type ParticleShape = 'rect' | 'circle';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  endRotation: number;
  color: string;
  shape: ParticleShape;
  delay: number;
  drift: number;
  duration: number;
  size: number;
  width: number;
  height: number;
  opacity: number;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateParticles(result: GameResult): Particle[] {
  const isBlackjack = result === 'blackjack';
  const isWin = result === 'win' || isBlackjack;

  if (!isWin) return [];

  const count = isBlackjack
    ? Math.floor(randomInRange(20, 25))
    : Math.floor(randomInRange(12, 18));

  const colors = isBlackjack
    ? [...CASINO_COLORS, ...GOLD_SPARKLE_COLORS]
    : CASINO_COLORS;

  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const isCircle = Math.random() > 0.6;
    const size = isBlackjack && Math.random() > 0.7
      ? randomInRange(8, 14)
      : randomInRange(4, 9);

    particles.push({
      id: i,
      x: randomInRange(10, 90),
      y: randomInRange(-5, 5),
      rotation: randomInRange(0, 360),
      endRotation: randomInRange(180, 720),
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: isCircle ? 'circle' : 'rect',
      delay: randomInRange(0, 0.4),
      drift: randomInRange(-80, 80),
      duration: randomInRange(2.0, 3.0),
      size,
      width: isCircle ? size : randomInRange(4, 10),
      height: isCircle ? size : randomInRange(6, 14),
      opacity: isBlackjack ? randomInRange(0.8, 1) : randomInRange(0.7, 1),
    });
  }

  return particles;
}

interface WinEffectsProps {
  result: GameResult | null;
  trigger: number;
}

export function WinEffects({ result, trigger }: WinEffectsProps) {
  const particles = useMemo(() => {
    if (trigger === 0) return [];
    if (!result) return [];
    return generateParticles(result);
  }, [trigger, result]);

  const isBlackjack = result === 'blackjack';
  const isWin = result === 'win' || isBlackjack;

  if (!isWin || particles.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <motion.div
          key={`${trigger}-${particle.id}`}
          initial={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            x: 0,
            y: 0,
            rotate: particle.rotation,
            opacity: particle.opacity,
            scale: isBlackjack ? 1.2 : 1,
          }}
          animate={{
            x: particle.drift,
            y: 800,
            rotate: particle.rotation + particle.endRotation,
            opacity: [particle.opacity, particle.opacity, 0],
            scale: isBlackjack
              ? [1.2, 1.1, 0.6, 0]
              : [1, 1, 0.5, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: [0.15, 0.6, 0.6, 1],
            opacity: {
              duration: particle.duration,
              delay: particle.delay,
              times: [0, 0.6, 1],
              ease: 'easeOut',
            },
            scale: {
              duration: particle.duration,
              delay: particle.delay,
              times: [0, 0.5, 0.8, 1],
              ease: 'easeOut',
            },
          }}
          style={{
            position: 'absolute',
            width: particle.shape === 'circle' ? particle.size : particle.width,
            height: particle.shape === 'circle' ? particle.size : particle.height,
            backgroundColor: particle.color,
            borderRadius: particle.shape === 'circle' ? '50%' : '2px',
            boxShadow:
              particle.color === '#FFD700' ||
              particle.color === '#FFEC8B' ||
              particle.color === '#DAA520'
                ? `0 0 ${isBlackjack ? 8 : 4}px ${particle.color}40`
                : 'none',
          }}
        />
      ))}

      {/* Blackjack gold burst overlay */}
      {isBlackjack && (
        <motion.div
          initial={{ opacity: 0.6, scale: 0.3 }}
          animate={{ opacity: 0, scale: 2.5 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(255,215,0,0) 70%)',
          }}
        />
      )}
    </div>
  );
}
