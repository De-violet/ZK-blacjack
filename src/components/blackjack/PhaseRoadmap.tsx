'use client';

import { motion } from 'framer-motion';
import { Check, Lock, Dice5, Wallet, Hash, FileCode } from 'lucide-react';
import { useState } from 'react';

type PhaseStatus = 'completed' | 'current' | 'upcoming';

interface Phase {
  number: number;
  name: string;
  shortName: string;
  description: string;
  status: PhaseStatus;
  icon: React.ReactNode;
  completedIcon: React.ReactNode;
}

const phases: Phase[] = [
  {
    number: 1,
    name: 'The Naked Game',
    shortName: 'Naked',
    description: 'Math.random() RNG — basic gameplay, no crypto',
    status: 'completed',
    icon: <Dice5 className="w-3.5 h-3.5" />,
    completedIcon: <Check className="w-3.5 h-3.5" />,
  },
  {
    number: 2,
    name: 'Web3 Wallet',
    shortName: 'Web3',
    description: 'Wallet connection & crypto betting',
    status: 'upcoming',
    icon: <Wallet className="w-3.5 h-3.5" />,
    completedIcon: <Check className="w-3.5 h-3.5" />,
  },
  {
    number: 3,
    name: 'Hash Lock',
    shortName: 'Hash',
    description: 'Provably fair hash commitment RNG',
    status: 'completed',
    icon: <Hash className="w-3.5 h-3.5" />,
    completedIcon: <Check className="w-3.5 h-3.5" />,
  },
  {
    number: 4,
    name: 'ZK Proofs',
    shortName: 'ZK',
    description: 'Zero-knowledge proof verification',
    status: 'upcoming',
    icon: <FileCode className="w-3.5 h-3.5" />,
    completedIcon: <Check className="w-3.5 h-3.5" />,
  },
];

// ─── Phase Node ──────────────────────────────────────────────
function PhaseNode({ phase, isLast }: { phase: Phase; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);

  const isCompleted = phase.status === 'completed' || phase.status === 'current';
  const isCurrent = phase.status === 'current';
  const isUpcoming = phase.status === 'upcoming';

  // Circle styles per status
  const circleClasses = isCurrent
    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
    : isCompleted
    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
    : 'bg-gray-800 border-gray-700 text-gray-600';

  // Connecting line styles
  const lineClasses = isCompleted
    ? 'bg-emerald-500/30'
    : 'bg-gray-800';

  return (
    <div className="flex items-center">
      {/* Phase circle + label */}
      <div
        className="flex flex-col items-center relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Tooltip on hover */}
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap
                       bg-gray-900 border border-gray-700/60 text-gray-300 text-[10px]
                       px-2 py-1 rounded-md shadow-lg z-10 pointer-events-none"
          >
            {phase.description}
          </motion.div>
        )}

        {/* Circle */}
        <motion.div
          className={`
            relative w-8 h-8 sm:w-8 sm:h-8 rounded-full border
            flex items-center justify-center
            transition-colors duration-300
            ${circleClasses}
          `}
          animate={
            isCompleted
              ? {
                  boxShadow: [
                    '0 0 6px 1px rgba(16,185,129,0.25)',
                    '0 0 14px 3px rgba(16,185,129,0.45)',
                    '0 0 6px 1px rgba(16,185,129,0.25)',
                  ],
                }
              : {}
          }
          transition={
            isCompleted
              ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
              : {}
          }
        >
          {isCompleted ? phase.completedIcon : isUpcoming ? <Lock className="w-3 h-3" /> : phase.icon}
        </motion.div>

        {/* Label below */}
        <span
          className={`
            mt-1.5 text-[9px] sm:text-[10px] font-medium leading-none whitespace-nowrap
            ${isCurrent ? 'text-amber-400/80' : isCompleted ? 'text-emerald-400/80' : 'text-gray-600'}
          `}
        >
          {phase.number}.{phase.shortName}
        </span>
      </div>

      {/* Connecting line */}
      {!isLast && (
        <div
          className={`
            h-[2px] w-6 sm:w-10 mx-0.5 rounded-full transition-colors duration-300
            ${lineClasses}
          `}
        />
      )}
    </div>
  );
}

// ─── PhaseRoadmap ────────────────────────────────────────────
export default function PhaseRoadmap({ className }: { className?: string }) {
  return (
    <div
      className={`
        inline-flex items-center justify-center
        bg-gray-950/60 border border-gray-800/50 rounded-lg
        px-4 py-3 sm:px-5 sm:py-3
        ${className ?? ''}
      `}
    >
      <div className="flex items-center">
        {phases.map((phase, i) => (
          <PhaseNode
            key={phase.number}
            phase={phase}
            isLast={i === phases.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
