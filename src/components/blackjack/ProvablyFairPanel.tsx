'use client';

import { useGameStore } from '@/store/game-store';
import { X, Shield, Check, AlertTriangle, Copy, RefreshCw, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import { generateClientSeed, type VerificationResult } from '@/lib/provably-fair';

export function ProvablyFairPanel() {
  const {
    showProvablyFairPanel, toggleProvablyFairPanel,
    seedCommitment, revealedSeed, isSeedVerified, provablyFairEnabled,
    toggleProvablyFair, verifyProvablyFair, phase, initialDeckOrder, roundHistory,
  } = useGameStore();

  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [clientSeedInput, setClientSeedInput] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeckOrder, setShowDeckOrder] = useState(false);
  const [expandedRound, setExpandedRound] = useState<string | null>(null);

  const isResultPhase = phase === 'result';
  const canVerify = isResultPhase && seedCommitment && !revealedSeed;

  // Auto-verified indicator: check if current round has been verified
  const isVerified = isSeedVerified === true;
  const isUnverified = isSeedVerified === false;

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    try {
      const verified = await verifyProvablyFair();
      // Get the updated state for verification result display
      const currentRevealed = useGameStore.getState().revealedSeed;
      const currentDeckOrder = useGameStore.getState().initialDeckOrder;
      if (currentRevealed && currentDeckOrder) {
        // Import verifyRound dynamically to avoid top-level import issues
        const { verifyRound } = await import('@/lib/provably-fair');
        const result = await verifyRound(currentRevealed, currentDeckOrder);
        setVerificationResult(result);
      }
    } catch {
      setVerificationResult(null);
    } finally {
      setIsVerifying(false);
    }
  }, [verifyProvablyFair]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback - ignore
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (!seedCommitment) return;
    const data = {
      roundId: seedCommitment.roundId,
      serverSeedHash: seedCommitment.serverSeedHash,
      clientSeed: seedCommitment.clientSeed,
      nonce: seedCommitment.nonce,
      shuffledDeck: seedCommitment.shuffledDeck,
      revealedServerSeed: revealedSeed?.serverSeed || '(not yet revealed)',
      verified: isSeedVerified,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedField('all');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  }, [seedCommitment, revealedSeed, isSeedVerified]);

  const handleRegenerateClientSeed = useCallback(() => {
    const newSeed = generateClientSeed();
    setClientSeedInput(newSeed);
  }, []);

  if (!showProvablyFairPanel) return null;

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  // Get first 5 cards of the deck (these are dealt to player + dealer)
  const firstFiveCards = seedCommitment?.shuffledDeck?.slice(0, 5) || [];

  // Timestamp formatting for round history
  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleProvablyFairPanel} />

      {/* Panel - slides in */}
      <div className="relative w-full max-w-sm bg-gray-900/95 backdrop-blur-md border-l border-gray-700/40 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/60">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Provably Fair</h2>
            {/* Auto verification indicator */}
            {seedCommitment && (
              isVerified ? (
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-700/30 rounded-full px-1.5 py-0.5">
                  <Check className="w-2.5 h-2.5" /> Verified
                </span>
              ) : isUnverified ? (
                <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-900/30 border border-red-700/30 rounded-full px-1.5 py-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> Unverified
                </span>
              ) : null
            )}
          </div>
          <div className="flex items-center gap-1">
            {seedCommitment && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[9px] text-gray-500 hover:text-white"
                onClick={handleCopyAll}
              >
                <Copy className="w-3 h-3 mr-1" />
                {copiedField === 'all' ? 'Copied!' : 'Copy All'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={toggleProvablyFairPanel} className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between bg-gray-800/40 rounded-xl p-3">
            <div className="flex items-center gap-2">
              {provablyFairEnabled ? (
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="text-sm text-gray-300">Provably Fair</span>
            </div>
            <button
              onClick={toggleProvablyFair}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                provablyFairEnabled ? 'bg-emerald-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  provablyFairEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* How it works */}
          <div className="bg-gray-800/30 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              🔒 Server seed is generated server-side and never exposed until you verify.
              The SHA-256 hash commitment proves the seed was chosen before your bet.
              After the round, you can verify both the hash and the deck shuffle.
            </p>
          </div>

          {/* First 5 cards dealt (prominent) — only shown AFTER round reveal */}
          {seedCommitment && firstFiveCards.length > 0 && (
            <div className="bg-gray-800/40 rounded-xl p-3 space-y-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">First 5 Cards Dealt</span>
              <div className="flex gap-1.5 flex-wrap">
                {firstFiveCards.map((card, i) => (
                  <span
                    key={`${card}-${i}`}
                    className={`inline-flex items-center justify-center font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      i < 2 ? 'bg-amber-900/20 border-amber-700/20 text-amber-300/80' :
                      i < 4 ? 'bg-emerald-900/20 border-emerald-700/20 text-emerald-300/80' :
                      'bg-gray-800/40 border-gray-700/20 text-gray-400'
                    }`}
                  >
                    {card}
                    {i === 0 && <span className="ml-0.5 text-[7px] opacity-50">P1</span>}
                    {i === 1 && <span className="ml-0.5 text-[7px] opacity-50">D1</span>}
                    {i === 2 && <span className="ml-0.5 text-[7px] opacity-50">P2</span>}
                    {i === 3 && <span className="ml-0.5 text-[7px] opacity-50">D2</span>}
                    {i === 4 && <span className="ml-0.5 text-[7px] opacity-50">H</span>}
                  </span>
                ))}
              </div>
              <p className="text-[8px] text-gray-600">P=Player, D=Dealer, H=Hit card</p>
            </div>
          )}

          {/* Current Round Info */}
          {seedCommitment && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Round</h3>

              {/* Server Seed Hash (Commitment) */}
              <div className="bg-gray-800/40 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Server Seed Hash</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-gray-500 hover:text-white"
                    onClick={() => handleCopy(seedCommitment.serverSeedHash, 'serverHash')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <div className="font-mono text-[11px] text-amber-300/80 break-all">
                  {copiedField === 'serverHash' ? 'Copied!' : truncateHash(seedCommitment.serverSeedHash)}
                </div>
                {!isResultPhase && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[9px] text-amber-400/60">Locked until round ends</span>
                  </div>
                )}
              </div>

              {/* Client Seed */}
              <div className="bg-gray-800/40 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Client Seed</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-gray-500 hover:text-emerald-400"
                    onClick={handleRegenerateClientSeed}
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
                <input
                  type="text"
                  value={clientSeedInput || seedCommitment.clientSeed}
                  onChange={(e) => setClientSeedInput(e.target.value)}
                  className="w-full bg-gray-900/60 border border-gray-700/40 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-emerald-300/80 focus:outline-none focus:border-emerald-500/40"
                  placeholder="Auto-generated"
                />
                <p className="text-[9px] text-gray-600">Change takes effect on next round</p>
              </div>

              {/* Round ID */}
              <div className="bg-gray-800/40 rounded-xl p-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Round ID</span>
                <div className="font-mono text-[11px] text-gray-400 mt-1 break-all">
                  {seedCommitment.roundId}
                </div>
              </div>

              {/* View Deck Order — hidden during play (ZK), revealed after round */}
              <div className="bg-gray-800/40 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => setShowDeckOrder(!showDeckOrder)}
                >
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Deck Order {seedCommitment.shuffledDeck && seedCommitment.shuffledDeck.length > 0
                      ? `(${seedCommitment.shuffledDeck.length} cards)`
                      : '(hidden during play)'}
                  </span>
                  {showDeckOrder ? (
                    <ChevronUp className="w-3 h-3 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  )}
                </button>
                {showDeckOrder && seedCommitment.shuffledDeck && seedCommitment.shuffledDeck.length > 0 && (
                  <div className="px-3 pb-3">
                    <div className="max-h-32 overflow-y-auto bg-gray-900/60 rounded-lg p-2">
                      <div className="font-mono text-[9px] text-gray-500 leading-relaxed break-all">
                        {seedCommitment.shuffledDeck.join(', ')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1.5 h-5 text-[9px] text-gray-500 hover:text-white"
                      onClick={() => handleCopy(seedCommitment.shuffledDeck.join(','), 'deckOrder')}
                    >
                      <Copy className="w-2.5 h-2.5 mr-1" />
                      {copiedField === 'deckOrder' ? 'Copied!' : 'Copy deck order'}
                    </Button>
                  </div>
                )}
                {showDeckOrder && (!seedCommitment.shuffledDeck || seedCommitment.shuffledDeck.length === 0) && (
                  <div className="px-3 pb-3">
                    <div className="bg-gray-900/40 rounded-lg p-2 text-center">
                      <Lock className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
                      <p className="text-[9px] text-gray-500">Deck order is hidden during play (Zero Knowledge). Verify the round to reveal.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Revealed Seed (after round) */}
          {revealedSeed && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revealed Seed</h3>

              <div className="bg-gray-800/40 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Server Seed</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-gray-500 hover:text-white"
                    onClick={() => handleCopy(revealedSeed.serverSeed, 'serverSeed')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <div className="font-mono text-[11px] text-cyan-300/80 break-all">
                  {copiedField === 'serverSeed' ? 'Copied!' : truncateHash(revealedSeed.serverSeed)}
                </div>
              </div>
            </div>
          )}

          {/* Verification */}
          {(canVerify || revealedSeed) && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Verification</h3>

              {canVerify && (
                <Button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Verify Round
                    </div>
                  )}
                </Button>
              )}

              {/* Verification Result */}
              {isSeedVerified !== null && (
                <div className={`rounded-xl p-3 ${
                  isSeedVerified
                    ? 'bg-emerald-900/20 border border-emerald-500/30'
                    : 'bg-red-900/20 border border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {isSeedVerified ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      isSeedVerified ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {isSeedVerified ? 'Verified Fair' : 'Verification Failed'}
                    </span>
                  </div>
                  {verificationResult && (
                    <div className="mt-2 space-y-1 text-[10px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        {verificationResult.hashMatches ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        )}
                        <span>Hash commitment matches</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {verificationResult.shuffleMatches ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        )}
                        <span>Deck shuffle matches</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Round History */}
          {roundHistory.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Round History</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {roundHistory.slice().reverse().map((entry) => (
                  <div key={entry.roundId}>
                    <button
                      className={`w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg text-left ${
                        entry.verified ? 'bg-emerald-900/10' : entry.verified === false ? 'bg-red-900/10' : 'bg-gray-800/30'
                      }`}
                      onClick={() => setExpandedRound(expandedRound === entry.roundId ? null : entry.roundId)}
                    >
                      <span className="font-mono text-gray-500 text-[10px]">{truncateHash(entry.roundId)}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-gray-600">{formatTimeAgo(entry.timestamp)}</span>
                        {entry.verified ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : entry.verified === false ? (
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-gray-600" />
                        )}
                        <span className={`text-[10px] ${
                          entry.verified ? 'text-emerald-400' : entry.verified === false ? 'text-red-400' : 'text-gray-500'
                        }`}>
                          {entry.verified ? 'Fair' : entry.verified === false ? 'Fail' : 'Pending'}
                        </span>
                      </div>
                    </button>
                    {expandedRound === entry.roundId && (
                      <div className="bg-gray-800/20 rounded-b-lg px-2.5 py-2 space-y-1 text-[9px] font-mono text-gray-600">
                        <div>Hash: {truncateHash(entry.serverSeedHash)}</div>
                        {entry.serverSeed && <div>Seed: {truncateHash(entry.serverSeed)}</div>}
                        <div>Client: {entry.clientSeed}</div>
                        <div>Nonce: {entry.nonce}</div>
                        <div>Cards: {entry.shuffledDeck.length}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No commitment info */}
          {!seedCommitment && (
            <div className="text-center py-6">
              <Shield className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Start a round to see provably fair data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
