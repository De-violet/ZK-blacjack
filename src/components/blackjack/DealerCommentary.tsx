'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useGameStore } from '@/store/game-store';
import { calculateScoreAllCards } from '@/lib/blackjack';
import type { Card } from '@/lib/blackjack';

interface DealerCommentaryProps {
  className?: string;
}

type CommentaryContext = {
  text: string;
  key: string;
};

function isSoftHand(hand: Card[]): boolean {
  const hasAce = hand.some((card) => card.rank === 'A');
  if (!hasAce) return false;
  // A soft hand is one where an Ace is being counted as 11
  // If counting Ace as 11 doesn't bust, it's soft
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'A') {
      aces += 1;
      score += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      score += 10;
    } else {
      score += parseInt(card.rank, 10);
    }
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  // Soft if an ace is still counted as 11 (aces remaining > 0 means some ace is 11)
  return aces > 0 && score <= 21;
}

// Simple deterministic hash to avoid Math.random() hydration mismatches
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function pickRandom<T>(arr: T[], seed: number = 0): T {
  // Deterministic selection to avoid hydration mismatches
  return arr[seed % arr.length];
}

function generateCommentary(
  phase: string,
  result: string | null,
  playerHand: Card[],
  dealerHand: Card[],
  currentBet: number,
  balance: number,
  stats: { wins: number; losses: number; pushes: number }
): CommentaryContext {
  const playerScore = calculateScoreAllCards(playerHand);
  const key = `${phase}-${result}-${playerScore}-${playerHand.length}-${dealerHand.length}`;
  const seed = simpleHash(key);

  // --- Betting phase ---
  if (phase === 'betting') {
    if (balance < 50) {
      return { text: pickRandom(['Place your bets! The table is hot tonight.', 'Feeling lucky? Minimum bet is $10.'], seed), key: key + '-bet1' };
    }
    if (balance >= 500) {
      return { text: pickRandom(['High roller at the table! Place your bets.', "Big stacks tonight. Let's see what you've got!"], seed), key: key + '-bet2' };
    }
    return { text: pickRandom(['Place your bets! The table is hot tonight.', 'Feeling lucky? Minimum bet is $10.', 'Step right up! Place your bet when ready.', 'The cards are waiting for you.'], seed), key: key + '-bet3' };
  }

  // --- Playing phase ---
  if (phase === 'playing') {
    const soft = isSoftHand(playerHand);

    if (playerScore === 21) {
      return { text: 'Twenty-one! Beautiful hand!', key: key + '-play21' };
    }

    if (soft) {
      if (playerScore >= 17) {
        return { text: 'Soft hand - the Ace gives you flexibility!', key: key + '-soft' };
      }
      return { text: pickRandom(['Soft hand - the Ace gives you flexibility!', 'A soft hand opens up possibilities. Play it right!'], seed), key: key + '-soft2' };
    }

    if (playerScore >= 17 && playerScore <= 20) {
      return { text: pickRandom(['Solid hand there. The question is... hit or stand?', "Strong total. But will the dealer beat it?", "You're sitting pretty. What's the move?"], seed), key: key + '-play17' };
    }

    if (playerScore >= 13 && playerScore <= 16) {
      return { text: pickRandom(['A tricky spot. The dealer could bust... or not.', "The danger zone. Trust your instincts.", "Tough decision. The cards don't make it easy."], seed), key: key + '-play13' };
    }

    if (playerScore < 13) {
      return { text: pickRandom(['Low total. You\'ll need another card.', "Not much to work with yet. Hit me!", "The only way is up. Take a card."], seed), key: key + '-playlow' };
    }

    return { text: 'Your move, player.', key: key + '-playdefault' };
  }

  // --- Dealer turn ---
  if (phase === 'dealer-turn') {
    if (dealerHand.length <= 2) {
      return { text: pickRandom(["Let's see what the dealer has...", 'Dealer reveals their hole card...'], seed), key: key + '-dreveal' };
    }
    const dealerScore = calculateScoreAllCards(dealerHand);
    if (dealerScore >= 17 && dealerScore <= 21) {
      return { text: pickRandom(['Dealer stands. Let\'s compare hands.', 'The dealer holds steady.'], seed), key: key + '-dstand' };
    }
    return { text: pickRandom(['Dealer draws another card...', 'And another one for the dealer...'], seed), key: key + '-ddraw' };
  }

  // --- Result phase ---
  if (phase === 'result' && result) {
    const winStreak = stats.wins > 0 && stats.wins > stats.losses;
    const loseStreak = stats.losses > 0 && stats.losses > stats.wins;

    if (result === 'blackjack') {
      return { text: pickRandom(['BLACKJACK! Pays 3 to 2! What a hand!', 'BLACKJACK! The best hand in the house!'], seed), key: key + '-bj' };
    }

    if (result === 'dealer-bust') {
      return { text: pickRandom(['Dealer busts! You win!', 'The dealer went over! Your win!'], seed), key: key + '-dbust' };
    }

    if (result === 'win') {
      if (winStreak && stats.wins >= 3) {
        return { text: pickRandom(["You're on a hot streak! Keep it going!", 'The player can\'t lose! What a run!'], seed), key: key + '-winstreak' };
      }
      return { text: pickRandom(['Winner winner! Nice play.', 'The player takes this one!', 'Well played! Chips to the player.'], seed), key: key + '-win' };
    }

    if (result === 'lose') {
      if (loseStreak && stats.losses >= 3) {
        return { text: pickRandom(['The house is running hot. Stay cool.', "Tough stretch. The cards will turn."], seed), key: key + '-losestreak' };
      }
      return { text: pickRandom(['The house takes this one. Better luck next hand.', 'So close! Shake it off.', "Not this time. Next hand's a new deal."], seed), key: key + '-lose' };
    }

    if (result === 'push') {
      return { text: pickRandom(['Push! It\'s a tie. Bet returned.', 'A draw. No winners, no losers this time.'], seed), key: key + '-push' };
    }

    if (result === 'surrender') {
      return { text: pickRandom(['Half bet returned. Live to fight another day.', 'Surrendered. Sometimes discretion is the better part of valor.'], seed), key: key + '-surr' };
    }
  }

  // --- Default / idle ---
  return { text: 'Welcome to the table!', key: 'default' };
}

export default function DealerCommentary({ className }: DealerCommentaryProps) {
  const phase = useGameStore((s) => s.phase);
  const result = useGameStore((s) => s.result);
  const playerHand = useGameStore((s) => s.playerHand);
  const dealerHand = useGameStore((s) => s.dealerHand);
  const currentBet = useGameStore((s) => s.currentBet);
  const balance = useGameStore((s) => s.balance);
  const stats = useGameStore((s) => s.stats);

  // Defer framer-motion rendering to avoid hydration mismatches
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needed for hydration safety
    setMounted(true);
  }, []);

  const commentary = useMemo(
    () => generateCommentary(phase, result, playerHand, dealerHand, currentBet, balance, stats),
    [phase, result, playerHand, dealerHand, currentBet, balance, stats]
  );

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-zinc-900/90 border border-amber-500/20 shadow-lg backdrop-blur-sm ${className ?? ''}`}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30">
        <Mic className="w-4 h-4 text-amber-400" />
      </div>

      <div className="relative flex-1 min-w-0 h-6 flex items-center overflow-hidden">
        {mounted ? (
          <AnimatePresence mode="wait">
            <motion.p
              key={commentary.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-sm font-medium text-amber-100/90 italic truncate whitespace-nowrap"
            >
              &ldquo;{commentary.text}&rdquo;
            </motion.p>
          </AnimatePresence>
        ) : (
          <p className="text-sm font-medium text-amber-100/90 italic truncate whitespace-nowrap">
            &ldquo;{commentary.text}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
