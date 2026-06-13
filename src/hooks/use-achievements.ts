'use client';

import { useState, useCallback, useEffect } from 'react';
import { ACHIEVEMENTS, STORAGE_KEY, Achievement, AchievementContext } from '@/lib/achievements';
import { GameStats } from '@/lib/blackjack';

function loadStoredAchievements(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: string[] = JSON.parse(stored);
      return new Set(parsed);
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

export function useAchievements() {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => new Set());
  const [isHydrated, setIsHydrated] = useState(false);
  const [recentUnlock, setRecentUnlock] = useState<Achievement | null>(null);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = loadStoredAchievements();
    if (stored.size > 0) {
      queueMicrotask(() => setUnlockedIds(stored));
    }
    queueMicrotask(() => setIsHydrated(true));
  }, []);

  const checkAchievements = useCallback(
    (stats: GameStats, context?: AchievementContext): Achievement[] => {
      const newlyUnlocked: Achievement[] = [];

      for (const achievement of ACHIEVEMENTS) {
        if (unlockedIds.has(achievement.id)) continue;
        if (achievement.condition(stats, context)) {
          newlyUnlocked.push(achievement);
        }
      }

      if (newlyUnlocked.length > 0) {
        const newIds = new Set([...unlockedIds, ...newlyUnlocked.map((a) => a.id)]);
        setUnlockedIds(newIds);
        setRecentUnlock(newlyUnlocked[0]);

        // Persist to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...newIds]));
        } catch {
          // Ignore storage errors
        }
      }

      return newlyUnlocked;
    },
    [unlockedIds]
  );

  const clearRecentUnlock = useCallback(() => {
    setRecentUnlock(null);
  }, []);

  return {
    achievements: ACHIEVEMENTS,
    unlockedIds,
    checkAchievements,
    recentUnlock,
    clearRecentUnlock,
  };
}
