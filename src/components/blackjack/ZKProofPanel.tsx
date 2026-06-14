'use client';

import { useGameStore } from '@/store/game-store';
import { X, ShieldCheck, TreePine, Key, Layers, ChevronDown, ChevronUp, Check, AlertTriangle, Copy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import { ZKVisualization } from './ZKVisualization';

export function ZKProofPanel() {
  const {
    showZKPanel, toggleZKPanel,
    zkCommitment, zkCardProofs, zkVerification,
    zkEnabled, toggleZK,
    seedCommitment, verifyZKRound, fetchCardProofs,
    phase, provablyFairEnabled,
  } = useGameStore();

  const [isVerifying, setIsVerifying] = useState(false);
  const [showMerkleDetail, setShowMerkleDetail] = useState(false);
  const [showVRFDetail, setShowVRFDetail] = useState(false);
  const [showCardProofs, setShowCardProofs] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isResultPhase = phase === 'result';

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    try {
      await verifyZKRound();
    } finally {
      setIsVerifying(false);
    }
  }, [verifyZKRound]);

  const handleFetchProofs = useCallback(async () => {
    if (!seedCommitment) return;
    await fetchCardProofs([0, 1, 2, 3, 4]);
  }, [seedCommitment, fetchCardProofs]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  }, []);

  if (!showZKPanel) return null;

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleZKPanel} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-md border-l border-gray-700/40 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-800/60 sticky top-0 bg-gray-900/95 z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">ZK Proofs</h2>
            <span className="text-[8px] font-bold text-violet-400 bg-violet-900/30 border border-violet-500/30 rounded-full px-1.5 py-0.5 uppercase tracking-wider">Phase 4</span>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleZKPanel} className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-3 space-y-4">
          {/* ZK Toggle */}
          <div className="flex items-center justify-between bg-gray-800/40 rounded-xl p-3">
            <div className="flex items-center gap-2">
              {zkEnabled ? (
                <Zap className="w-3.5 h-3.5 text-violet-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="text-sm text-gray-300">ZK Proofs</span>
            </div>
            <button
              onClick={toggleZK}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                zkEnabled ? 'bg-violet-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  zkEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* ── ZK Visualization (NEW) ── */}
          <ZKVisualization />

          {!zkCommitment ? (
            <div className="text-center py-6">
              <ShieldCheck className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Start a round to see ZK proof data</p>
              {!provablyFairEnabled && (
                <p className="text-[9px] text-amber-500 mt-1">Enable Provably Fair first</p>
              )}
            </div>
          ) : (
            <>
              {/* Merkle Root */}
              <div className="bg-gray-800/40 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => setShowMerkleDetail(!showMerkleDetail)}
                >
                  <div className="flex items-center gap-2">
                    <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Merkle Root</span>
                  </div>
                  {showMerkleDetail ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                </button>
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <code className="font-mono text-[10px] text-emerald-300/80 break-all flex-1">
                      {truncateHash(zkCommitment.merkleRoot)}
                    </code>
                    <button
                      onClick={() => handleCopy(zkCommitment.merkleRoot, 'merkle')}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[8px] text-gray-600">
                    {zkCommitment.deckSize} cards committed - {zkCommitment.deckSize} Merkle leaves
                  </p>

                  {showMerkleDetail && (
                    <div className="mt-2 bg-gray-900/60 rounded-lg p-2 space-y-1.5">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-gray-500">Tree depth</span>
                        <span className="text-gray-400 font-mono">{Math.ceil(Math.log2(zkCommitment.deckSize))} levels</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-gray-500">Leaf count</span>
                        <span className="text-gray-400 font-mono">{zkCommitment.deckSize}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-gray-500">Padded size</span>
                        <span className="text-gray-400 font-mono">{Math.pow(2, Math.ceil(Math.log2(zkCommitment.deckSize)))}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-gray-500">Deck hash</span>
                        <code className="text-gray-400 font-mono text-[8px]">{truncateHash(zkCommitment.deckHash)}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* VRF Proof */}
              <div className="bg-gray-800/40 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => setShowVRFDetail(!showVRFDetail)}
                >
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">VRF Proof</span>
                  </div>
                  {showVRFDetail ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                </button>
                <div className="px-3 pb-3 space-y-1.5">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-gray-500">VRF Output</span>
                    <code className="text-amber-300/80 font-mono text-[8px]">{truncateHash(zkCommitment.vrfProof.vrfOutput)}</code>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-gray-500">Public Key</span>
                    <code className="text-amber-300/60 font-mono text-[8px]">{truncateHash(zkCommitment.vrfProof.publicKey)}</code>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-gray-500">Message</span>
                    <code className="text-gray-400 font-mono text-[8px]">{zkCommitment.vrfProof.message.slice(0, 20)}...</code>
                  </div>

                  {showVRFDetail && (
                    <div className="mt-1 bg-gray-900/60 rounded-lg p-2 space-y-1.5">
                      <div className="text-[9px]">
                        <span className="text-gray-500">Proof:</span>
                        <code className="block text-amber-300/60 font-mono text-[8px] mt-0.5 break-all">{zkCommitment.vrfProof.proof}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Proofs */}
              <div className="bg-gray-800/40 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => {
                    setShowCardProofs(!showCardProofs);
                    if (zkCardProofs.length === 0) handleFetchProofs();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Card Proofs ({zkCardProofs.length})</span>
                  </div>
                  {showCardProofs ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                </button>
                {showCardProofs && (
                  <div className="px-3 pb-3">
                    {zkCardProofs.length === 0 ? (
                      <div className="text-center py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleFetchProofs}
                          className="h-6 text-[9px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20"
                        >
                          Fetch Card Proofs
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {zkCardProofs.map((proof, i) => (
                          <div key={i} className="bg-gray-900/60 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center justify-center font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  i < 2 ? 'bg-amber-900/20 border-amber-700/20 text-amber-300/80' :
                                  i < 4 ? 'bg-emerald-900/20 border-emerald-700/20 text-emerald-300/80' :
                                  'bg-gray-800/40 border-gray-700/20 text-gray-400'
                                }`}>
                                  {proof.card}
                                </span>
                                <span className="text-[8px] text-gray-500">pos {proof.position}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] text-emerald-400">Merkle</span>
                                <span className="text-[8px] text-violet-400">Range</span>
                              </div>
                            </div>
                            <div className="mt-1 text-[7px] text-gray-600 font-mono">
                              Path: {proof.merkleProof.siblings.length} siblings
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ZK Verification */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Verification</h3>
                  {zkVerification && (
                    <span className={`text-[9px] font-bold ${zkVerification.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                      {zkVerification.verified ? 'Verified' : 'Failed'}
                    </span>
                  )}
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={isVerifying || !zkCommitment}
                  className="w-full bg-violet-700 hover:bg-violet-600 text-white text-xs font-medium rounded-xl py-2 transition-colors"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify ZK Proof
                    </div>
                  )}
                </Button>

                {zkVerification && (
                  <div className={`rounded-xl p-3 ${
                    zkVerification.verified
                      ? 'bg-emerald-900/20 border border-emerald-500/30'
                      : 'bg-red-900/20 border border-red-500/30'
                  }`}>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {zkVerification.merkleValid ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
                        <span className="text-gray-400">Merkle proofs valid</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {zkVerification.vrfValid ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
                        <span className="text-gray-400">VRF proof valid</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {zkVerification.rangeValid ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
                        <span className="text-gray-400">Range proofs valid</span>
                      </div>
                      {zkVerification.shuffleValid !== null && (
                        <div className="flex items-center gap-1.5">
                          {zkVerification.shuffleValid ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
                          <span className="text-gray-400">Shuffle proof valid</span>
                        </div>
                      )}
                      <div className="mt-1.5 pt-1.5 border-t border-gray-700/30">
                        <span className="text-gray-500">{zkVerification.message}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
