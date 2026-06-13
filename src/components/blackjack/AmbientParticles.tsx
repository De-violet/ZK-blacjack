'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface DustParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

// Pre-computed particle positions to avoid Math.random() hydration mismatches
// Deterministic pseudo-random using a simple seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function generateParticles(count: number): DustParticle[] {
  const particles: DustParticle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: seededRandom(i * 7 + 1) * 100,
      y: seededRandom(i * 7 + 2) * 100,
      size: seededRandom(i * 7 + 3) * 3 + 1,
      duration: seededRandom(i * 7 + 4) * 16 + 12,
      delay: seededRandom(i * 7 + 5) * 10,
      drift: (seededRandom(i * 7 + 6) - 0.5) * 40,
      opacity: seededRandom(i * 7 + 7) * 0.05 + 0.03,
    });
  }
  return particles;
}

const PARTICLES = generateParticles(8);

export function AmbientParticles() {
  // Defer rendering to after hydration to avoid mismatches from framer-motion initial styles
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needed for hydration safety
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: 0,
          }}
          animate={{
            y: [0, -240],
            x: [0, p.drift],
            opacity: [0, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
            opacity: {
              duration: p.duration,
              times: [0, 0.7, 1],
            },
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,255,255,0.4) 100%)',
          }}
        />
      ))}
    </div>
  );
}
