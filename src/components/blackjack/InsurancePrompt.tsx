'use client';

import { useGameStore } from '@/store/game-store';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';

export function InsurancePrompt() {
  const { phase, currentBet, balance, takeInsurance, declineInsurance } = useGameStore();

  if (phase !== 'insurance') return null;

  const insuranceCost = Math.floor(currentBet / 2);
  const canAfford = balance >= insuranceCost;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="flex flex-col items-center gap-3 py-3 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        className="bg-gray-900/90 border border-amber-500/40 rounded-xl px-5 py-4 sm:px-6 sm:py-5 shadow-lg shadow-amber-500/10 backdrop-blur-sm max-w-sm w-full"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <h3 className="text-amber-400 font-bold text-sm sm:text-base">Insurance?</h3>
        </div>

        <p className="text-gray-300 text-xs sm:text-sm mb-1">
          Dealer shows <span className="text-amber-400 font-bold">Ace</span>!
        </p>
        <p className="text-gray-400 text-[11px] sm:text-xs mb-4">
          Insurance costs <span className="text-amber-300 font-bold">${insuranceCost}</span> (half your bet).
          Pays 2:1 if dealer has Blackjack.
        </p>

        <div className="flex gap-2">
          <Button
            onClick={takeInsurance}
            disabled={!canAfford}
            size="sm"
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/20 text-xs sm:text-sm"
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
            Take Insurance
          </Button>
          <Button
            onClick={declineInsurance}
            size="sm"
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-bold text-xs sm:text-sm"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
            No Thanks
          </Button>
        </div>

        {!canAfford && (
          <p className="text-red-400 text-[10px] sm:text-xs mt-2 text-center">
            Not enough balance for insurance
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
