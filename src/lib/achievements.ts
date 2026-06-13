import { GameStats, GameResult } from './blackjack';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: GameStats, context?: AchievementContext) => boolean;
}

export interface AchievementContext {
  currentBalance: number;
  initialBalance: number;
  result: GameResult;
  bet: number;
  payout: number;
  wasDoubledDown: boolean;
  insuranceWon: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-hand',
    name: 'First Hand',
    description: 'Play your first hand',
    icon: '🃏',
    condition: (stats) => stats.totalGames >= 1,
  },
  {
    id: 'lucky-start',
    name: 'Lucky Start',
    description: 'Win your first hand',
    icon: '🍀',
    condition: (stats) => stats.wins >= 1,
  },
  {
    id: 'natural-21',
    name: 'Natural 21',
    description: 'Get your first blackjack',
    icon: '🎰',
    condition: (stats) => stats.blackjacks >= 1,
  },
  {
    id: 'hot-streak',
    name: 'Hot Streak',
    description: 'Win 3 hands in a row',
    icon: '🔥',
    condition: (stats) => stats.bestStreak >= 3,
  },
  {
    id: 'on-fire',
    name: 'On Fire!',
    description: 'Win 5 hands in a row',
    icon: '🌋',
    condition: (stats) => stats.bestStreak >= 5,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Win 10 hands in a row',
    icon: '⚡',
    condition: (stats) => stats.bestStreak >= 10,
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    description: 'Bet the maximum ($500)',
    icon: '💎',
    condition: (_stats, context) => context?.bet === 500,
  },
  {
    id: 'double-down-hero',
    name: 'Double Down Hero',
    description: 'Win a double down',
    icon: '🎯',
    condition: (_stats, context) =>
      context?.wasDoubledDown === true &&
      (context.result === 'win' || context.result === 'blackjack'),
  },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    description: 'Win after balance drops below $200',
    icon: '💪',
    condition: (_stats, context) =>
      (context?.currentBalance ?? 0) < 200 + (context?.bet ?? 0) &&
      (context?.result === 'win' || context?.result === 'blackjack'),
  },
  {
    id: 'century-club',
    name: 'Century Club',
    description: 'Play 100 hands',
    icon: '💯',
    condition: (stats) => stats.totalGames >= 100,
  },
  {
    id: 'insurance-pays',
    name: 'Insurance Pays',
    description: 'Win an insurance bet',
    icon: '🛡️',
    condition: (_stats, context) => context?.insuranceWon === true,
  },
  {
    id: 'double-your-money',
    name: 'Double Your Money',
    description: 'Reach $2,000 balance',
    icon: '💰',
    condition: (_stats, context) => (context?.currentBalance ?? 0) >= 2000,
  },
];

export const STORAGE_KEY = 'blackjack-achievements';
