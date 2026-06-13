'use client';

import { useEffect } from 'react';
import { Achievement } from '@/lib/achievements';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

function playAchievementSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Ascending arpeggio: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });

    // Shimmer overtone
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.value = 2093; // C7
    shimmerGain.gain.setValueAtTime(0.05, now + 0.4);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.4);
    shimmer.stop(now + 1.0);

    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Audio not available
  }
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    if (!achievement) return;
    playAchievementSound();
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          key={achievement.id}
          initial={{ opacity: 0, y: -60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
        >
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-900/90 via-amber-800/90 to-amber-900/90 border border-amber-500/50 rounded-xl px-4 py-3 shadow-2xl shadow-amber-500/20 backdrop-blur-sm">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{achievement.icon}</span>
                <span className="text-amber-200 font-bold text-sm">{achievement.name}</span>
              </div>
              <span className="text-amber-400/70 text-xs">{achievement.description}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
