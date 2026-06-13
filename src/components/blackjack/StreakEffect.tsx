'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface StreakEffectProps {
  streak: number;
}

interface FlameParticle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  baseOpacity: number;
}

// Deterministic pseudo-random using a simple seed (SSR-safe)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function generateFlames(streak: number): FlameParticle[] {
  const count = Math.min(streak * 2, 10);
  const particles: FlameParticle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: seededRandom(i * 5 + 1) * 100,
      size: seededRandom(i * 5 + 2) * 40 + 20,
      duration: seededRandom(i * 5 + 3) * 2 + 1.5,
      delay: seededRandom(i * 5 + 4) * 2,
      baseOpacity: Math.min(0.08 + (streak - 3) * 0.03, 0.25),
    });
  }
  return particles;
}

export function StreakEffect({ streak }: StreakEffectProps) {
  const flames = useMemo(() => {
    if (streak < 3) return [];
    return generateFlames(streak);
  }, [streak]);

  if (streak < 3) return null;

  const intensity = Math.min((streak - 2) * 0.1, 0.4);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Bottom edge fire glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: intensity }}
        transition={{ duration: 1 }}
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: `linear-gradient(to top, rgba(255,100,0,${0.15 * Math.min(streak / 5, 1)}) 0%, rgba(255,165,0,${0.08 * Math.min(streak / 5, 1)}) 30%, transparent 100%)`,
        }}
      />

      {/* Left edge glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: intensity * 0.6 }}
        transition={{ duration: 1.2 }}
        className="absolute top-0 bottom-0 left-0 w-20"
        style={{
          background: `linear-gradient(to right, rgba(255,80,0,${0.1 * Math.min(streak / 5, 1)}) 0%, transparent 100%)`,
        }}
      />

      {/* Right edge glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: intensity * 0.6 }}
        transition={{ duration: 1.2 }}
        className="absolute top-0 bottom-0 right-0 w-20"
        style={{
          background: `linear-gradient(to left, rgba(255,80,0,${0.1 * Math.min(streak / 5, 1)}) 0%, transparent 100%)`,
        }}
      />

      {/* Animated flame particles at bottom */}
      {flames.map((f) => (
        <motion.div
          key={f.id}
          initial={{
            left: `${f.x}%`,
            bottom: -10,
            opacity: 0,
            scale: 0.5,
          }}
          animate={{
            bottom: [0, 30, 60],
            opacity: [0, f.baseOpacity, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: f.duration,
            delay: f.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: f.size,
            height: f.size,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            background: `radial-gradient(ellipse at 50% 80%, rgba(255,200,0,0.6) 0%, rgba(255,100,0,0.3) 40%, transparent 70%)`,
            filter: 'blur(4px)',
          }}
        />
      ))}

      {/* Streak counter fire badge */}
      {streak >= 3 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.05, 1], opacity: 1 }}
          transition={{
            scale: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
            opacity: { duration: 0.3 },
          }}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20"
        >
          <div
            className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-amber-100 border border-orange-400/50"
            style={{
              background: 'linear-gradient(135deg, rgba(255,100,0,0.7) 0%, rgba(255,165,0,0.5) 50%, rgba(255,80,0,0.7) 100%)',
              boxShadow: `0 0 ${streak >= 5 ? 20 : 10}px rgba(255,100,0,0.4), 0 0 4px rgba(255,200,0,0.3)`,
            }}
          >
            🔥 {streak} Streak
          </div>
        </motion.div>
      )}
    </div>
  );
}
