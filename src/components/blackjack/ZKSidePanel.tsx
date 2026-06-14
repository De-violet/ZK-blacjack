'use client';

import { useGameStore } from '@/store/game-store';
import { ShieldCheck, TreePine, Key, Layers, Check, AlertTriangle, Zap, Shield, Lock, Unlock, Eye, Hash } from 'lucide-react';

export function ZKSidePanel() {
  const {
    zkEnabled, zkCommitment, zkCardProofs, zkVerification,
    provablyFairEnabled, seedCommitment, stats, phase,
    balance, history,
  } = useGameStore();

  const sessionProfit = balance - 1000;
  const winRate = stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : '0.0';

  const truncateHash = (hash: string) => {
    if (!hash || hash.length <= 12) return hash || '—';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const firstFiveCards = seedCommitment?.shuffledDeck?.slice(0, 5) || [];

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto py-3 px-3 text-white">

      {/* ── ZK Status Card ── */}
      <div className={`rounded-xl p-3 border ${
        zkEnabled
          ? 'bg-violet-950/50 border-violet-500/30'
          : 'bg-gray-800/30 border-gray-700/30'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${zkEnabled ? 'text-violet-400' : 'text-gray-600'}`} />
            <span className="text-xs font-bold">ZK Proof Engine</span>
          </div>
          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
            zkEnabled
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'bg-gray-700/30 text-gray-500 border border-gray-600/30'
          }`}>
            {zkEnabled ? 'Active' : 'Off'}
          </span>
        </div>

        {zkEnabled ? (
          <div className="space-y-2">
            {/* Merkle Root */}
            <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2">
              <TreePine className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[8px] text-gray-500 uppercase tracking-wider">Merkle Root</div>
                <code className="text-[9px] text-emerald-300/80 font-mono break-all">
                  {zkCommitment ? truncateHash(zkCommitment.merkleRoot) : 'Waiting...'}
                </code>
              </div>
            </div>

            {/* VRF Output */}
            <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2">
              <Key className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[8px] text-gray-500 uppercase tracking-wider">VRF Output</div>
                <code className="text-[9px] text-amber-300/80 font-mono break-all">
                  {zkCommitment ? truncateHash(zkCommitment.vrfProof.vrfOutput) : 'Waiting...'}
                </code>
              </div>
            </div>

            {/* Card Proofs Count */}
            <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2">
              <Layers className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[8px] text-gray-500 uppercase tracking-wider">Card Proofs</div>
                <span className="text-[9px] text-cyan-300/80 font-mono">
                  {zkCardProofs.length > 0 ? `${zkCardProofs.length} verified` : 'No cards dealt yet'}
                </span>
              </div>
            </div>

            {/* Verification Result */}
            {zkVerification && (
              <div className={`flex items-center gap-2 rounded-lg p-2 ${
                zkVerification.verified
                  ? 'bg-emerald-900/30 border border-emerald-500/20'
                  : 'bg-red-900/30 border border-red-500/20'
              }`}>
                {zkVerification.verified
                  ? <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  : <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                }
                <span className={`text-[9px] font-bold ${
                  zkVerification.verified ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {zkVerification.verified ? 'ZK Proof Verified' : 'Verification Failed'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <ShieldCheck className="w-6 h-6 text-gray-700 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500">Enable ZK Proofs to see<br />real-time verification data</p>
          </div>
        )}
      </div>

      {/* ── Provably Fair Card ── */}
      <div className={`rounded-xl p-3 border ${
        provablyFairEnabled
          ? 'bg-emerald-950/40 border-emerald-500/20'
          : 'bg-gray-800/30 border-gray-700/30'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {provablyFairEnabled
              ? <Lock className="w-3.5 h-3.5 text-emerald-400" />
              : <Unlock className="w-3.5 h-3.5 text-gray-600" />
            }
            <span className="text-xs font-bold">Provably Fair</span>
          </div>
          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
            provablyFairEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-gray-700/30 text-gray-500 border border-gray-600/30'
          }`}>
            {provablyFairEnabled ? 'Locked' : 'Off'}
          </span>
        </div>

        {seedCommitment ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2">
              <Hash className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[8px] text-gray-500 uppercase tracking-wider">Seed Hash</div>
                <code className="text-[9px] text-amber-300/70 font-mono break-all">
                  {truncateHash(seedCommitment.serverSeedHash)}
                </code>
              </div>
            </div>

            {firstFiveCards.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-2">
                <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Deal Order</div>
                <div className="flex gap-1 flex-wrap">
                  {firstFiveCards.map((card, i) => (
                    <span key={i} className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded ${
                      i < 2 ? 'bg-emerald-900/30 text-emerald-300/80' :
                      i < 4 ? 'bg-amber-900/30 text-amber-300/80' :
                      'bg-gray-700/30 text-gray-400'
                    }`}>
                      {card}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-gray-500 text-center py-2">Start a round to see commitment data</p>
        )}
      </div>

      {/* ── Session Stats ── */}
      <div className="rounded-xl p-3 bg-gray-800/30 border border-gray-700/30">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold">Session Stats</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500 uppercase">Games</div>
            <div className="text-sm font-bold text-white font-mono">{stats.totalGames}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500 uppercase">Win Rate</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">{winRate}%</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500 uppercase">Wins</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">{stats.wins}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500 uppercase">Losses</div>
            <div className="text-sm font-bold text-red-400 font-mono">{stats.losses}</div>
          </div>
          <div className="col-span-2 bg-gray-900/50 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500 uppercase">Profit / Loss</div>
            <div className={`text-sm font-bold font-mono ${sessionProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {sessionProfit >= 0 ? '+' : ''}${sessionProfit.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent History ── */}
      {history.length > 0 && (
        <div className="rounded-xl p-3 bg-gray-800/30 border border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold">Recent Rounds</span>
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.slice(-8).reverse().map((entry, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                    entry.result === 'win' || entry.result === 'blackjack'
                      ? 'bg-emerald-900/40 text-emerald-400'
                      : entry.result === 'push'
                        ? 'bg-gray-700/40 text-gray-400'
                        : 'bg-red-900/40 text-red-400'
                  }`}>
                    {entry.result === 'blackjack' ? 'BJ!' : entry.result ? entry.result.toUpperCase() : '—'}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">
                    ${entry.bet}
                  </span>
                </div>
                <span className={`text-[9px] font-mono font-bold ${
                  entry.payout > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {entry.payout > 0 ? `+$${entry.payout}` : `-$${entry.bet}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── How ZK Works ── */}
      <div className="rounded-xl p-3 bg-violet-950/20 border border-violet-500/10">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[10px] font-bold text-violet-300">How ZK Proofs Work</span>
        </div>
        <div className="space-y-1.5 text-[9px] text-gray-500 leading-relaxed">
          <div className="flex gap-1.5">
            <span className="text-violet-400 font-bold">1.</span>
            <span><b className="text-gray-400">Commit</b> — Server commits to a shuffled deck via Merkle root hash before dealing</span>
          </div>
          <div className="flex gap-1.5">
            <span className="text-violet-400 font-bold">2.</span>
            <span><b className="text-gray-400">Prove</b> — Each dealt card comes with a Merkle proof (position) + VRF proof (randomness)</span>
          </div>
          <div className="flex gap-1.5">
            <span className="text-violet-400 font-bold">3.</span>
            <span><b className="text-gray-400">Verify</b> — After the round, seed is revealed to fully verify shuffle fairness</span>
          </div>
        </div>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Powered By ── */}
      <div className="text-center py-2">
        <div className="text-[8px] text-gray-600">
          Powered by <span className="text-violet-400">Zero-Knowledge Proofs</span>
        </div>
        <div className="text-[7px] text-gray-700 mt-0.5">
          Merkle Tree • VRF • Range Proofs • Shuffle Proofs
        </div>
      </div>
    </div>
  );
}
