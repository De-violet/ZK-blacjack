'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

// ─── Chip color definitions (matching BettingArea) ───────────────────────────
const CHIP_COLORS: Record<
  number,
  { bg: string; border: string; text: string; ring: string }
> = {
  10: {
    bg: 'bg-blue-500',
    border: 'border-blue-300',
    text: 'text-white',
    ring: 'border-blue-200/40',
  },
  25: {
    bg: 'bg-green-500',
    border: 'border-green-300',
    text: 'text-white',
    ring: 'border-green-200/40',
  },
  50: {
    bg: 'bg-red-500',
    border: 'border-red-300',
    text: 'text-white',
    ring: 'border-red-200/40',
  },
  100: {
    bg: 'bg-gray-800',
    border: 'border-gray-400',
    text: 'text-white',
    ring: 'border-gray-300/40',
  },
  250: {
    bg: 'bg-purple-500',
    border: 'border-purple-300',
    text: 'text-white',
    ring: 'border-purple-200/40',
  },
  500: {
    bg: 'bg-amber-500',
    border: 'border-amber-300',
    text: 'text-amber-900',
    ring: 'border-amber-200/40',
  },
};

const DENOMINATIONS = [500, 250, 100, 50, 25, 10] as const;
const MAX_VISIBLE_CHIPS = 8;

// ─── Breakdown logic ─────────────────────────────────────────────────────────
// Greedily decompose amount into chip denominations, largest first
function decomposeAmount(amount: number): number[] {
  if (amount <= 0) return [];

  const chips: number[] = [];
  let remaining = amount;

  for (const denom of DENOMINATIONS) {
    while (remaining >= denom) {
      chips.push(denom);
      remaining -= denom;
    }
  }

  return chips;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface ChipStackProps {
  amount: number; // The total bet amount
}

// ─── Single chip rendered inside the stack ───────────────────────────────────
function SingleChip({
  denomination,
  index,
  totalChips,
}: {
  denomination: number;
  index: number;
  totalChips: number;
}) {
  const colors = CHIP_COLORS[denomination];
  if (!colors) return null;

  return (
    <motion.div
      initial={{ y: -18, opacity: 0, scale: 0.5 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, y: -10, transition: { duration: 0.18 } }}
      transition={{
        type: 'spring',
        stiffness: 450,
        damping: 24,
        delay: (totalChips - 1 - index) * 0.03,
      }}
      className="absolute flex justify-center"
      style={{
        bottom: index * 3,
        left: 0,
        right: 0,
        zIndex: index,
      }}
    >
      <div
        className={`
          relative w-7 h-7 rounded-full
          ${colors.bg} ${colors.border} ${colors.text}
          border shadow-md
          flex items-center justify-center
        `}
        style={{
          backgroundImage:
            'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25) 0%, transparent 55%)',
        }}
      >
        {/* Dashed inner ring */}
        <div
          className={`absolute inset-0.5 rounded-full border-[1.5px] border-dashed ${colors.ring}`}
        />
        <span
          className="relative z-10 font-bold leading-none select-none"
          style={{ fontSize: denomination >= 100 ? 7 : 8 }}
        >
          {denomination}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main ChipStack component ────────────────────────────────────────────────
export function ChipStack({ amount }: ChipStackProps) {
  const { visibleChips, overflowCount } = useMemo(() => {
    const allChips = decomposeAmount(amount);

    if (allChips.length <= MAX_VISIBLE_CHIPS) {
      return { visibleChips: allChips, overflowCount: 0 };
    }

    // Keep the top (highest-index) chips visible
    const visible = allChips.slice(allChips.length - MAX_VISIBLE_CHIPS);
    const overflowCount = allChips.length - MAX_VISIBLE_CHIPS;
    return { visibleChips: visible, overflowCount };
  }, [amount]);

  if (amount <= 0) {
    return null;
  }

  const stackHeight = visibleChips.length * 3 + 28;

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      className="relative flex flex-col items-center"
    >
      {/* Chip stack container */}
      <div className="relative" style={{ width: 28, height: stackHeight }}>
        <AnimatePresence mode="popLayout">
          {visibleChips.map((denom, i) => (
            <SingleChip
              key={`${amount}-${i}-${denom}`}
              denomination={denom}
              index={i}
              totalChips={visibleChips.length}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Overflow badge — shown when more than 8 chips needed */}
      <AnimatePresence>
        {overflowCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute -top-1.5 -right-3 z-50 flex items-center justify-center
              min-w-[18px] h-[18px] px-1 rounded-full bg-white/90 border border-gray-300 shadow-sm"
          >
            <span className="text-[8px] font-bold text-gray-800 leading-none">
              +{overflowCount}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
