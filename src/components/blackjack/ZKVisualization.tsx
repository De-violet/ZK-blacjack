'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/game-store';
import {
  ShieldCheck, TreePine, Lock, Unlock, Eye, EyeOff,
  Hash, Zap, Check, AlertTriangle, Layers, ArrowRight,
  CircleDot, GitBranch, Binary, Shield
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────────────

type ZKFlowStep = 'commit' | 'build' | 'prove' | 'verify' | 'reveal';

interface ProofPathNode {
  level: number;
  hash: string;
  isTarget: boolean;
  isSibling: boolean;
  direction: 'left' | 'right' | 'root';
}

// ─── ZK Flow Pipeline ──────────────────────────────────────────

function ZKFlowPipeline({ currentStep, isRevealed }: {
  currentStep: ZKFlowStep;
  isRevealed: boolean;
}) {
  const steps: { id: ZKFlowStep; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'commit', label: 'Commit', icon: <Lock className="w-3 h-3" />, desc: 'Server locks seed' },
    { id: 'build', label: 'Build Tree', icon: <TreePine className="w-3 h-3" />, desc: 'Merkle root created' },
    { id: 'prove', label: 'Prove', icon: <Shield className="w-3 h-3" />, desc: 'Merkle proof per card' },
    { id: 'verify', label: 'Verify', icon: <ShieldCheck className="w-3 h-3" />, desc: 'Client checks proofs' },
    { id: 'reveal', label: 'Reveal', icon: <Unlock className="w-3 h-3" />, desc: 'Seed revealed post-round' },
  ];

  const stepOrder: ZKFlowStep[] = ['commit', 'build', 'prove', 'verify', 'reveal'];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-0.5">
        {steps.map((step, i) => {
          const isActive = i <= currentIndex;
          const isCurrent = i === currentIndex;
          const isRevealStep = step.id === 'reveal' && isRevealed;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Circle */}
                <motion.div
                  className={`
                    relative w-7 h-7 rounded-full border-2 flex items-center justify-center
                    transition-all duration-500
                    ${isCurrent
                      ? 'border-violet-400 bg-violet-500/20 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                      : isActive || isRevealStep
                        ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-400'
                        : 'border-gray-700 bg-gray-800/40 text-gray-600'
                    }
                  `}
                  animate={isCurrent ? {
                    boxShadow: [
                      '0 0 8px rgba(139,92,246,0.3)',
                      '0 0 16px rgba(139,92,246,0.6)',
                      '0 0 8px rgba(139,92,246,0.3)',
                    ]
                  } : {}}
                  transition={isCurrent ? { duration: 2, repeat: Infinity } : {}}
                >
                  {(isActive || isRevealStep) && !isCurrent ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    step.icon
                  )}
                </motion.div>

                {/* Label */}
                <span className={`mt-1 text-[7px] sm:text-[8px] font-bold leading-none whitespace-nowrap ${
                  isCurrent ? 'text-violet-300' :
                  isActive || isRevealStep ? 'text-emerald-400/80' : 'text-gray-600'
                }`}>
                  {step.label}
                </span>

                {/* Description */}
                <span className={`text-[6px] sm:text-[7px] leading-none mt-0.5 whitespace-nowrap ${
                  isCurrent ? 'text-violet-400/60' :
                  isActive ? 'text-emerald-500/40' : 'text-gray-700'
                }`}>
                  {step.desc}
                </span>
              </div>

              {/* Arrow between steps */}
              {i < steps.length - 1 && (
                <div className={`flex-shrink-0 w-3 sm:w-5 h-0.5 rounded-full mt-[-12px] ${
                  i < currentIndex ? 'bg-emerald-500/50' : 'bg-gray-700/50'
                }`}>
                  {i < currentIndex && (
                    <motion.div
                      className="h-full bg-emerald-400/70 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Merkle Tree Visualization (SVG) ───────────────────────────

function MerkleTreeViz({ zkCommitment, zkCardProofs, activeProofIndex }: {
  zkCommitment: NonNullable<ReturnType<typeof useGameStore.getState>['zkCommitment']>;
  zkCardProofs: ReturnType<typeof useGameStore.getState>['zkCardProofs'];
  activeProofIndex: number;
}) {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const activeProof = zkCardProofs[activeProofIndex];

  // Build proof path visualization
  const proofPath: ProofPathNode[] = useMemo(() => {
    if (!activeProof) return [];

    const path: ProofPathNode[] = [];
    const { siblings, path: directions, leafHash } = activeProof.merkleProof;

    // Add leaf
    path.push({
      level: 0,
      hash: leafHash,
      isTarget: true,
      isSibling: false,
      direction: directions[0] ? 'right' : 'left',
    });

    // Add each level
    for (let i = 0; i < siblings.length; i++) {
      // Sibling
      path.push({
        level: i + 1,
        hash: siblings[i],
        isTarget: false,
        isSibling: true,
        direction: directions[i] ? 'left' : 'right',
      });
    }

    // Add root
    path.push({
      level: siblings.length + 1,
      hash: zkCommitment.merkleRoot,
      isTarget: true,
      isSibling: false,
      direction: 'root',
    });

    return path;
  }, [activeProof, zkCommitment.merkleRoot]);

  // Animate proof verification
  useEffect(() => {
    if (activeProof && !isAnimating) {
      setAnimationStep(0);
      setIsAnimating(true);

      const totalSteps = proofPath.length;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setAnimationStep(step);
        if (step >= totalSteps) {
          clearInterval(interval);
          setIsAnimating(false);
        }
      }, 400);

      return () => clearInterval(interval);
    }
  }, [activeProofIndex, activeProof]);

  const truncateHash = (hash: string) => {
    if (hash.length <= 12) return hash;
    return `${hash.slice(0, 5)}...${hash.slice(-4)}`;
  };

  const totalLevels = proofPath.length;

  return (
    <div className="w-full">
      {/* SVG Merkle Tree */}
      <svg viewBox="0 0 280 320" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="merkleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="leafGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="siblingGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background abstract tree structure */}
        {/* Left branch (faded) */}
        <g opacity="0.15">
          <line x1="140" y1="50" x2="70" y2="110" stroke="#6b7280" strokeWidth="1" />
          <line x1="70" y1="110" x2="35" y2="170" stroke="#6b7280" strokeWidth="1" />
          <line x1="35" y1="170" x2="20" y2="230" stroke="#6b7280" strokeWidth="1" />
          <circle cx="70" cy="110" r="6" fill="#374151" />
          <circle cx="35" cy="170" r="5" fill="#374151" />
          <circle cx="20" cy="230" r="4" fill="#374151" />
        </g>
        {/* Right branch (faded) */}
        <g opacity="0.15">
          <line x1="140" y1="50" x2="210" y2="110" stroke="#6b7280" strokeWidth="1" />
          <line x1="210" y1="110" x2="245" y2="170" stroke="#6b7280" strokeWidth="1" />
          <line x1="245" y1="170" x2="260" y2="230" stroke="#6b7280" strokeWidth="1" />
          <circle cx="210" cy="110" r="6" fill="#374151" />
          <circle cx="245" cy="170" r="5" fill="#374151" />
          <circle cx="260" cy="230" r="4" fill="#374151" />
        </g>

        {/* Dots representing hidden leaves */}
        <g opacity="0.1">
          {[0,1,2,3,4,5,6,7].map(i => (
            <circle key={i} cx={20 + i * 35} cy={290} r="2" fill="#6b7280" />
          ))}
          <text x="140" y="308" textAnchor="middle" fill="#6b7280" fontSize="7" fontFamily="monospace">
            {zkCommitment.deckSize} leaves (hidden during play)
          </text>
        </g>

        {/* Active proof path - ANIMATED */}
        {proofPath.map((node, i) => {
          const isVisible = i < animationStep || !isAnimating;
          const isLast = i === proofPath.length - 1;
          const isFirst = i === 0;

          // Calculate position - leaf at bottom, root at top
          const y = isFirst ? 260 : isLast ? 35 : 260 - (i / (totalLevels - 1)) * 225;
          // Alternate left/right for siblings
          const xOffset = node.isSibling
            ? (node.direction === 'left' ? -55 : 55)
            : 0;
          const x = 140 + xOffset;

          // Connection line to next node
          const nextNode = i < proofPath.length - 1 ? proofPath[i + 1] : null;
          const nextY = nextNode
            ? (i + 1 === proofPath.length - 1 ? 35 : 260 - ((i + 1) / (totalLevels - 1)) * 225)
            : null;
          const nextXOffset = nextNode?.isSibling
            ? (nextNode.direction === 'left' ? -55 : 55)
            : 0;
          const nextX = nextNode ? 140 + nextXOffset : null;

          return (
            <g key={i} opacity={isVisible ? 1 : 0}>
              {/* Connection line */}
              {nextNode && nextY !== null && nextX !== null && (
                <motion.line
                  x1={x} y1={y - 8} x2={nextX} y2={nextY + 12}
                  stroke={node.isTarget ? '#8b5cf6' : '#f59e0b'}
                  strokeWidth={node.isTarget ? 2 : 1.5}
                  strokeDasharray={node.isSibling ? "4 2" : "none"}
                  opacity={0.6}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: isVisible ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Node circle */}
              <motion.circle
                cx={x} cy={y}
                r={isLast ? 14 : isFirst ? 10 : 7}
                fill={node.isTarget
                  ? (isLast ? 'url(#merkleGlow)' : 'url(#leafGlow)')
                  : 'url(#siblingGlow)'
                }
                stroke={node.isTarget
                  ? (isLast ? '#8b5cf6' : '#10b981')
                  : '#f59e0b'
                }
                strokeWidth={node.isTarget ? 2 : 1.5}
                filter={node.isTarget ? 'url(#glow)' : 'url(#softGlow)'}
                initial={{ scale: 0 }}
                animate={{ scale: isVisible ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />

              {/* Hash text */}
              {isVisible && (
                <motion.text
                  x={x + (isLast ? 20 : isFirst ? 14 : 12)}
                  y={y + 3}
                  fill={node.isTarget
                    ? (isLast ? '#c4b5fd' : '#6ee7b7')
                    : '#fbbf24'
                  }
                  fontSize={isLast ? "7" : "6"}
                  fontFamily="monospace"
                  initial={{ opacity: 0, x: x - 5 }}
                  animate={{ opacity: 1, x: x + (isLast ? 20 : isFirst ? 14 : 12) }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  {truncateHash(node.hash)}
                </motion.text>
              )}

              {/* Labels */}
              {isFirst && isVisible && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <text x={x} y={y + 22} textAnchor="middle" fill="#6ee7b7" fontSize="6" fontFamily="monospace">
                    LEAF: {activeProof?.card || '?'}
                  </text>
                  <text x={x} y={y + 30} textAnchor="middle" fill="#9ca3af" fontSize="5" fontFamily="monospace">
                    pos: {activeProof?.position ?? '-'}
                  </text>
                </motion.g>
              )}
              {isLast && isVisible && (
                <motion.text
                  x={x} y={y - 20}
                  textAnchor="middle" fill="#c4b5fd" fontSize="6" fontFamily="monospace"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  MERKLE ROOT
                </motion.text>
              )}
              {node.isSibling && isVisible && (
                <motion.text
                  x={x} y={y + 16}
                  textAnchor="middle" fill="#fbbf24" fontSize="5" fontFamily="monospace"
                  opacity={0.6}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                >
                  sibling
                </motion.text>
              )}
            </g>
          );
        })}

        {/* Animation pulse at root when verification completes */}
        {animationStep >= proofPath.length && proofPath.length > 0 && (
          <motion.circle
            cx={140} cy={35} r={14}
            fill="none" stroke="#8b5cf6" strokeWidth="1"
            initial={{ r: 14, opacity: 0.8 }}
            animate={{
              r: [14, 24, 14],
              opacity: [0.8, 0, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </svg>
    </div>
  );
}

// ─── Proof Chain (Vertical Hash Resolution) ────────────────────

function ProofChain({ proof, merkleRoot }: {
  proof: NonNullable<ReturnType<typeof useGameStore.getState>['zkCardProofs'][0]>;
  merkleRoot: string;
}) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const totalSteps = proof.merkleProof.siblings.length + 1; // siblings + root

  useEffect(() => {
    setVisibleSteps(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setVisibleSteps(step);
      if (step >= totalSteps) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, [proof, totalSteps]);

  const truncateHash = (hash: string) => {
    if (hash.length <= 10) return hash;
    return `${hash.slice(0, 4)}..${hash.slice(-3)}`;
  };

  return (
    <div className="space-y-0">
      {/* Leaf */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
          <CircleDot className="w-2.5 h-2.5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <div className="text-[7px] text-emerald-400 font-bold uppercase">Leaf (Card)</div>
          <code className="text-[8px] text-emerald-300/60 font-mono">
            {proof.card} @ pos {proof.position}
          </code>
        </div>
      </div>

      {/* Hash resolution steps */}
      {proof.merkleProof.siblings.map((sibling, i) => {
        const isVisible = i < visibleSteps;
        const isRight = proof.merkleProof.path[i];

        return (
          <AnimatePresence key={i}>
            {isVisible && (
              <motion.div
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                transition={{ duration: 0.25 }}
                className="ml-2.5 border-l border-amber-500/30 pl-2 py-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Binary className="w-2 h-2 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[6px] text-amber-400/60 uppercase">Level {i + 1} — {isRight ? 'Right' : 'Left'} sibling</div>
                    <code className="text-[7px] text-amber-300/40 font-mono">
                      {truncateHash(sibling)}
                    </code>
                  </div>
                  <ArrowRight className="w-2.5 h-2.5 text-amber-500/30 flex-shrink-0" />
                  <div className="text-[7px] text-violet-300/40 font-mono">
                    hash({isRight ? 'sib+cur' : 'cur+sib'})
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}

      {/* Root */}
      {visibleSteps >= totalSteps && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="ml-0 flex items-center gap-1.5 mt-0.5"
        >
          <div className="w-5 h-5 rounded bg-violet-500/20 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-2.5 h-2.5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[7px] text-violet-400 font-bold uppercase">Merkle Root</div>
            <code className="text-[8px] text-violet-300/60 font-mono">
              {truncateHash(merkleRoot)}
            </code>
          </div>
          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        </motion.div>
      )}
    </div>
  );
}

// ─── Knowledge Separator ────────────────────────────────────────
// Shows what the client knows vs doesn't know (the "Zero Knowledge" boundary)

function KnowledgeSeparator({ isRevealed, deckSize }: {
  isRevealed: boolean;
  deckSize: number;
}) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-2.5 border border-gray-700/20">
      <div className="flex items-center gap-1.5 mb-2">
        <Eye className="w-3 h-3 text-violet-400" />
        <span className="text-[8px] font-bold text-violet-300 uppercase tracking-wider">Zero Knowledge Boundary</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* Known */}
        <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Eye className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-[7px] font-bold text-emerald-400 uppercase">Client Knows</span>
          </div>
          <ul className="space-y-0.5 text-[7px] text-emerald-300/60">
            <li className="flex gap-1"><Check className="w-2 h-2 text-emerald-500 flex-shrink-0 mt-px" />Merkle Root</li>
            <li className="flex gap-1"><Check className="w-2 h-2 text-emerald-500 flex-shrink-0 mt-px" />Seed Hash</li>
            <li className="flex gap-1"><Check className="w-2 h-2 text-emerald-500 flex-shrink-0 mt-px" />Dealt Cards + Proofs</li>
            <li className="flex gap-1"><Check className="w-2 h-2 text-emerald-500 flex-shrink-0 mt-px" />Proof of Valid Range</li>
          </ul>
        </div>
        {/* Unknown */}
        <div className={`rounded-lg p-2 border ${
          isRevealed
            ? 'bg-violet-900/20 border-violet-500/20'
            : 'bg-gray-900/40 border-gray-700/30'
        }`}>
          <div className="flex items-center gap-1 mb-1.5">
            {isRevealed ? (
              <Unlock className="w-2.5 h-2.5 text-violet-400" />
            ) : (
              <EyeOff className="w-2.5 h-2.5 text-gray-500" />
            )}
            <span className={`text-[7px] font-bold uppercase ${
              isRevealed ? 'text-violet-400' : 'text-gray-500'
            }`}>
              {isRevealed ? 'Revealed!' : 'Client Doesn\'t Know'}
            </span>
          </div>
          <ul className="space-y-0.5 text-[7px]">
            <li className={`flex gap-1 ${isRevealed ? 'text-violet-300/60' : 'text-gray-600'}`}>
              {isRevealed ? <Check className="w-2 h-2 text-violet-500 flex-shrink-0 mt-px" /> : <Lock className="w-2 h-2 text-gray-700 flex-shrink-0 mt-px" />}
              Full Deck Order ({deckSize})
            </li>
            <li className={`flex gap-1 ${isRevealed ? 'text-violet-300/60' : 'text-gray-600'}`}>
              {isRevealed ? <Check className="w-2 h-2 text-violet-500 flex-shrink-0 mt-px" /> : <Lock className="w-2 h-2 text-gray-700 flex-shrink-0 mt-px" />}
              Future Cards
            </li>
            <li className={`flex gap-1 ${isRevealed ? 'text-violet-300/60' : 'text-gray-600'}`}>
              {isRevealed ? <Check className="w-2 h-2 text-violet-500 flex-shrink-0 mt-px" /> : <Lock className="w-2 h-2 text-gray-700 flex-shrink-0 mt-px" />}
              Server Seed
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Card Proof Badges ─────────────────────────────────────────

function CardProofBadges({ zkCardProofs, activeIndex, onSelect }: {
  zkCardProofs: ReturnType<typeof useGameStore.getState>['zkCardProofs'];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {zkCardProofs.map((proof, i) => (
        <motion.button
          key={`${proof.card}-${proof.position}-${i}`}
          onClick={() => onSelect(i)}
          className={`
            relative flex items-center gap-1 px-1.5 py-1 rounded-lg border text-[8px] font-mono font-bold
            transition-all duration-200
            ${i === activeIndex
              ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.3)]'
              : i < 2
                ? 'bg-amber-900/20 border-amber-700/30 text-amber-300/80 hover:bg-amber-900/30'
                : i < 4
                  ? 'bg-emerald-900/20 border-emerald-700/30 text-emerald-300/80 hover:bg-emerald-900/30'
                  : 'bg-gray-800/40 border-gray-700/30 text-gray-400 hover:bg-gray-700/40'
            }
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>{proof.card}</span>
          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
        </motion.button>
      ))}
    </div>
  );
}

// ─── Main ZK Visualization Component ───────────────────────────

export function ZKVisualization() {
  const {
    zkEnabled, zkCommitment, zkCardProofs, zkVerification,
    phase, provablyFairEnabled, seedCommitment, revealedSeed,
  } = useGameStore();

  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'tree' | 'chain' | 'flow'>('flow');

  // Determine current ZK flow step
  const currentFlowStep: ZKFlowStep = useMemo(() => {
    if (phase === 'betting') return 'commit';
    if (zkCommitment && zkCardProofs.length === 0) return 'build';
    if (zkCardProofs.length > 0 && phase !== 'result') return 'prove';
    if (zkVerification) return 'verify';
    if (phase === 'result' && revealedSeed) return 'reveal';
    if (phase === 'result') return 'verify';
    return 'commit';
  }, [phase, zkCommitment, zkCardProofs, zkVerification, revealedSeed]);

  const isRevealed = !!(phase === 'result' && revealedSeed);

  // Auto-select latest card proof
  useEffect(() => {
    if (zkCardProofs.length > 0) {
      setActiveProofIndex(zkCardProofs.length - 1);
    }
  }, [zkCardProofs.length]);

  if (!zkEnabled) {
    return (
      <div className="text-center py-8 px-4">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <ShieldCheck className="w-10 h-10 text-gray-700 mx-auto mb-3" />
        </motion.div>
        <p className="text-xs text-gray-500 font-medium">ZK Proofs are disabled</p>
        <p className="text-[9px] text-gray-600 mt-1">
          Enable ZK Proofs to see the cryptographic<br />verification visualization
        </p>
      </div>
    );
  }

  if (!zkCommitment) {
    return (
      <div className="text-center py-8 px-4">
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TreePine className="w-10 h-10 text-violet-800 mx-auto mb-3" />
        </motion.div>
        <p className="text-xs text-violet-400/60 font-medium">Waiting for Round</p>
        <p className="text-[9px] text-gray-600 mt-1">
          Place a bet to start the ZK commitment process
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 bg-gray-800/30 rounded-lg p-0.5">
        {([
          { id: 'flow' as const, label: 'Flow', icon: <Zap className="w-2.5 h-2.5" /> },
          { id: 'tree' as const, label: 'Tree', icon: <TreePine className="w-2.5 h-2.5" /> },
          { id: 'chain' as const, label: 'Chain', icon: <GitBranch className="w-2.5 h-2.5" /> },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex items-center gap-1 flex-1 px-2 py-1.5 rounded-md text-[8px] font-bold transition-all ${
              viewMode === tab.id
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ZK Flow Pipeline - always visible */}
      <div className="bg-gray-800/20 rounded-xl p-3 border border-gray-700/20">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Zap className="w-3 h-3 text-violet-400" />
          <span className="text-[8px] font-bold text-violet-300 uppercase tracking-wider">ZK Lifecycle</span>
          <span className={`text-[7px] font-bold uppercase ml-auto px-1.5 py-0.5 rounded-full ${
            currentFlowStep === 'reveal'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {currentFlowStep}
          </span>
        </div>
        <ZKFlowPipeline currentStep={currentFlowStep} isRevealed={isRevealed} />
      </div>

      {/* Conditional content based on view mode */}
      {viewMode === 'tree' && (
        <div className="bg-gray-800/20 rounded-xl p-3 border border-gray-700/20">
          <div className="flex items-center gap-1.5 mb-2">
            <TreePine className="w-3 h-3 text-emerald-400" />
            <span className="text-[8px] font-bold text-emerald-300 uppercase tracking-wider">Merkle Tree</span>
            {zkCardProofs.length > 0 && (
              <span className="text-[7px] text-gray-500 ml-auto">
                Proof for: {zkCardProofs[activeProofIndex]?.card}
              </span>
            )}
          </div>

          {/* Card selector */}
          {zkCardProofs.length > 0 && (
            <CardProofBadges
              zkCardProofs={zkCardProofs}
              activeIndex={activeProofIndex}
              onSelect={setActiveProofIndex}
            />
          )}

          {/* Tree SVG */}
          <MerkleTreeViz
            zkCommitment={zkCommitment}
            zkCardProofs={zkCardProofs}
            activeProofIndex={activeProofIndex}
          />

          {zkCardProofs.length === 0 && (
            <div className="text-center py-4">
              <p className="text-[9px] text-gray-500">Cards will appear with proof paths as they are dealt</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'chain' && zkCardProofs.length > 0 && (
        <div className="bg-gray-800/20 rounded-xl p-3 border border-gray-700/20">
          <div className="flex items-center gap-1.5 mb-2">
            <GitBranch className="w-3 h-3 text-amber-400" />
            <span className="text-[8px] font-bold text-amber-300 uppercase tracking-wider">Proof Resolution</span>
          </div>

          {/* Card selector */}
          <CardProofBadges
            zkCardProofs={zkCardProofs}
            activeIndex={activeProofIndex}
            onSelect={setActiveProofIndex}
          />

          <div className="mt-2">
            <ProofChain
              proof={zkCardProofs[activeProofIndex]}
              merkleRoot={zkCommitment.merkleRoot}
            />
          </div>
        </div>
      )}

      {viewMode === 'chain' && zkCardProofs.length === 0 && (
        <div className="bg-gray-800/20 rounded-xl p-3 border border-gray-700/20 text-center py-4">
          <GitBranch className="w-4 h-4 text-amber-800 mx-auto mb-2" />
          <p className="text-[9px] text-gray-500">Proof chains will appear as cards are dealt</p>
        </div>
      )}

      {viewMode === 'flow' && (
        <>
          {/* Knowledge Boundary */}
          <KnowledgeSeparator isRevealed={isRevealed} deckSize={zkCommitment.deckSize} />

          {/* Proof Stats */}
          <div className="bg-gray-800/20 rounded-xl p-3 border border-gray-700/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span className="text-[8px] font-bold text-cyan-300 uppercase tracking-wider">Proof Stats</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                <div className="text-[7px] text-gray-500 uppercase">Cards</div>
                <div className="text-sm font-bold text-white font-mono">{zkCardProofs.length}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                <div className="text-[7px] text-gray-500 uppercase">Tree Depth</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">
                  {Math.ceil(Math.log2(zkCommitment.deckSize))}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                <div className="text-[7px] text-gray-500 uppercase">Status</div>
                <div className={`text-sm font-bold font-mono ${
                  zkVerification?.verified ? 'text-emerald-400' :
                  zkVerification ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {zkVerification?.verified ? 'OK' : zkVerification ? 'ERR' : '...'}
                </div>
              </div>
            </div>
          </div>

          {/* Verification Result */}
          {zkVerification && (
            <div className={`rounded-xl p-2.5 border ${
              zkVerification.verified
                ? 'bg-emerald-900/15 border-emerald-500/20'
                : 'bg-red-900/15 border-red-500/20'
            }`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                {zkVerification.verified
                  ? <Check className="w-3 h-3 text-emerald-400" />
                  : <AlertTriangle className="w-3 h-3 text-red-400" />
                }
                <span className={`text-[9px] font-bold ${
                  zkVerification.verified ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {zkVerification.verified ? 'ZK Proof Verified' : 'Verification Failed'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: 'Merkle', valid: zkVerification.merkleValid },
                  { label: 'VRF', valid: zkVerification.vrfValid },
                  { label: 'Range', valid: zkVerification.rangeValid },
                  { label: 'Shuffle', valid: zkVerification.shuffleValid },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1 text-[8px]">
                    {item.valid === null ? (
                      <div className="w-2 h-2 rounded-full bg-gray-600" />
                    ) : item.valid ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                    )}
                    <span className={`${item.valid ? 'text-gray-400' : 'text-red-400'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Compact ZK Live Indicator ─────────────────────────────────
// Small inline component for the game area showing ZK status

export function ZKLiveIndicator() {
  const { zkEnabled, zkCardProofs, zkVerification, phase } = useGameStore();

  if (!zkEnabled) return null;

  const verifiedCount = zkCardProofs.length;

  return (
    <motion.div
      className="flex items-center gap-1.5 bg-violet-950/40 border border-violet-500/20 rounded-full px-2 py-0.5"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-violet-400"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className="text-[8px] font-bold text-violet-300 font-mono">
        ZK {verifiedCount > 0 ? `${verifiedCount} proven` : 'active'}
      </span>
      {zkVerification?.verified && (
        <Check className="w-2.5 h-2.5 text-emerald-400" />
      )}
    </motion.div>
  );
}
