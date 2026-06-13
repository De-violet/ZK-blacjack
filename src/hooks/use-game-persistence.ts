'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/game-store';
import { INITIAL_BALANCE, DEFAULT_STATS } from '@/lib/blackjack';
import type { GameStats, GameHistoryEntry, BetStrategy } from '@/store/game-store';

const STORAGE_KEY = 'blackjack-game-state';
const DEBOUNCE_MS = 500;

interface PersistedState {
  balance: number;
  stats: GameStats;
  history: GameHistoryEntry[];
  balanceHistory: number[];
  lastBet: number;
  betStrategy: BetStrategy;
  betStrategyBase: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  lastResultWasWin: boolean | null;
  sequence1326Index: number;
  cardsDealtTotal: number;
}

function getPersistedFields(): (keyof PersistedState)[] {
  return [
    'balance',
    'stats',
    'history',
    'balanceHistory',
    'lastBet',
    'betStrategy',
    'betStrategyBase',
    'consecutiveWins',
    'consecutiveLosses',
    'lastResultWasWin',
    'sequence1326Index',
    'cardsDealtTotal',
  ];
}

function loadSavedState(): Partial<PersistedState> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const fields = getPersistedFields();
    const result: Partial<PersistedState> = {};

    for (const field of fields) {
      if (field in parsed) {
        result[field] = parsed[field];
      }
    }

    return result;
  } catch {
    return null;
  }
}

function getDefaultPersistedState(): PersistedState {
  return {
    balance: INITIAL_BALANCE,
    stats: { ...DEFAULT_STATS },
    history: [],
    balanceHistory: [],
    lastBet: 10,
    betStrategy: 'flat',
    betStrategyBase: 10,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    lastResultWasWin: null,
    sequence1326Index: 0,
    cardsDealtTotal: 0,
  };
}

function mergeWithDefaults(saved: Partial<PersistedState>): PersistedState {
  const defaults = getDefaultPersistedState();
  return { ...defaults, ...saved };
}

function saveState(state: PersistedState): void {
  if (typeof window === 'undefined') return;

  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // localStorage might be full or unavailable — silently ignore
  }
}

export function useGamePersistence() {
  const hasLoaded = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hasSavedState, setHasSavedState] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  });

  const store = useGameStore;

  // On mount, load saved state and hydrate the store
  useEffect(() => {
    if (hasLoaded.current) return;
    if (typeof window === 'undefined') return;

    const saved = loadSavedState();
    if (saved) {
      const merged = mergeWithDefaults(saved);

      // Hydrate store with persisted fields only
      store.setState({
        balance: merged.balance,
        stats: merged.stats,
        history: merged.history,
        balanceHistory: merged.balanceHistory,
        lastBet: merged.lastBet,
        betStrategy: merged.betStrategy,
        betStrategyBase: merged.betStrategyBase,
        consecutiveWins: merged.consecutiveWins,
        consecutiveLosses: merged.consecutiveLosses,
        lastResultWasWin: merged.lastResultWasWin,
        sequence1326Index: merged.sequence1326Index,
        cardsDealtTotal: merged.cardsDealtTotal,
      });
    }

    hasLoaded.current = true;
  }, []);

  // Subscribe to store changes and debounced-save persisted fields
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fields = getPersistedFields();

    const unsubscribe = store.subscribe((state) => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        const persisted: PersistedState = {} as PersistedState;
        for (const field of fields) {
          persisted[field] = state[field];
        }
        saveState(persisted);
        setHasSavedState(true);
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const clearSavedState = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedState(false);
    } catch {
      // Silently ignore
    }
  }, []);

  return { hasSavedState, clearSavedState };
}

export default useGamePersistence;
