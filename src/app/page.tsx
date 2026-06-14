'use client';

import { useGameStore } from '@/store/game-store';
import { BettingArea } from '@/components/blackjack/BettingArea';
import { GameControls } from '@/components/blackjack/GameControls';
import { HandDisplay } from '@/components/blackjack/HandDisplay';
import { StatsPanel } from '@/components/blackjack/StatsPanel';
import { ProvablyFairPanel } from '@/components/blackjack/ProvablyFairPanel';
import { ZKProofPanel } from '@/components/blackjack/ZKProofPanel';
import { ZKSidePanel } from '@/components/blackjack/ZKSidePanel';
import { Button } from '@/components/ui/button';
import { Wallet, BarChart3, RotateCcw, Volume2, VolumeX, Shield, HelpCircle, X, ShieldCheck } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toggleSound, safePlay, playCardDeal, playCardFlip } from '@/lib/sounds';

export default function Home() {
  const {
    playerHand, dealerHand, phase, result, balance, currentBet,
    message, isAnimating, stats, newRound, resetGame, toggleStats,
    hit, stand, doubleDown, startGame,
    split: splitAction, isSplitMode, splitHands, activeSplitIndex,
    toggleProvablyFairPanel, provablyFairEnabled,
    takeInsurance, declineInsurance, insuranceBet,
    toggleZKPanel, zkEnabled, zkCommitment, zkVerification,
  } = useGameStore();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const isResultPhase = phase === 'result';
  const sessionProfit = balance - 1000;

  // Track dealer hand changes for flip/deal sounds
  const prevDealerLenRef = useRef(dealerHand.length);
  const prevDealerFaceUpRef = useRef(dealerHand.filter(c => c.faceUp).length);
  const prevPlayerLenRef = useRef(playerHand.length);

  // Dealer card sounds
  useEffect(() => {
    const currentFaceUp = dealerHand.filter(c => c.faceUp).length;
    const prevFaceUp = prevDealerFaceUpRef.current;
    const currentLen = dealerHand.length;
    const prevLen = prevDealerLenRef.current;

    if (currentLen > prevLen && phase === 'dealerTurn') {
      safePlay(playCardDeal);
    }

    if (currentFaceUp > prevFaceUp && currentLen === prevLen && phase === 'dealerTurn') {
      safePlay(playCardFlip);
    }

    prevDealerLenRef.current = currentLen;
    prevDealerFaceUpRef.current = currentFaceUp;
  }, [dealerHand, phase]);

  // Player card sounds
  useEffect(() => {
    const currentLen = playerHand.length;
    const prevLen = prevPlayerLenRef.current;

    if (currentLen > prevLen && phase === 'playing' && prevLen > 0) {
      safePlay(playCardDeal);
    }

    prevPlayerLenRef.current = currentLen;
  }, [playerHand, phase]);

  const handleToggleSound = useCallback(() => {
    const newState = toggleSound();
    setSoundEnabled(newState);
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    switch (e.key.toLowerCase()) {
      case 'h':
        if (phase === 'playing' && !isAnimating) {
          safePlay(playCardDeal);
          hit();
        }
        break;
      case 's':
        if (phase === 'playing' && !isAnimating) {
          stand();
        }
        break;
      case 'd':
        if (phase === 'playing' && !isAnimating) {
          doubleDown();
        }
        break;
      case 'n':
        if (phase === 'result') newRound();
        break;
      case ' ':
        if (phase === 'betting' && currentBet >= 10) {
          e.preventDefault();
          safePlay(playCardDeal);
          startGame();
        }
        break;
      case 'escape':
        if (showHelp) setShowHelp(false);
        break;
    }
  }, [phase, isAnimating, hit, stand, doubleDown, newRound, startGame, currentBet, showHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="w-full bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50 px-2 sm:px-4 py-2 sm:py-2.5 z-40 flex-shrink-0 relative overflow-visible">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <span className="text-white font-bold text-xs sm:text-base">21</span>
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-white leading-tight">Blackjack</h1>
              <p className="text-[7px] sm:text-[9px] text-gray-500 leading-tight">ZK Casino • Phase 4</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Balance pill */}
            <div className="flex items-center gap-1 bg-amber-900/40 rounded-lg px-2 sm:px-2.5 py-1 border border-amber-700/30">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span
                className="text-amber-300 font-mono font-bold text-[11px] sm:text-sm"
                key={`bal-${balance}`}
                style={{ animation: 'score-pop 0.3s ease-out' }}
              >
                ${balance.toLocaleString()}
              </span>
            </div>

            {/* Sound toggle */}
            <button
              onClick={handleToggleSound}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-700/60 border border-gray-600/30 text-amber-400 hover:bg-gray-600/80 transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Help */}
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-700/60 border border-gray-600/30 text-blue-400 hover:bg-gray-600/80 transition-colors"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Stats */}
            <button
              onClick={toggleStats}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-700/60 border border-gray-600/30 text-green-400 hover:bg-gray-600/80 transition-colors"
              title="Statistics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* ZK Dashboard - toggles side panel */}
            <button
              onClick={() => { toggleZKPanel(); setShowSidePanel(!showSidePanel); }}
              className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-colors relative ${
                zkEnabled
                  ? 'bg-violet-900/50 border-violet-600/40 text-violet-400 hover:bg-violet-800/60'
                  : 'bg-gray-700/60 border-gray-600/30 text-purple-400 hover:bg-gray-600/80'
              }`}
              title="ZK Dashboard"
            >
              <ShieldCheck className="w-4 h-4" />
              {zkEnabled && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-400 border border-gray-900" />
              )}
            </button>

            {/* Provably Fair */}
            <button
              onClick={toggleProvablyFairPanel}
              className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-colors relative ${
                provablyFairEnabled
                  ? 'bg-emerald-900/50 border-emerald-600/40 text-emerald-400 hover:bg-emerald-800/60'
                  : 'bg-gray-700/60 border-gray-600/30 text-teal-400 hover:bg-gray-600/80'
              }`}
              title="Provably Fair"
            >
              <Shield className="w-4 h-4" />
              {provablyFairEnabled && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-gray-900" />
              )}
            </button>

            {/* Reset */}
            <button
              onClick={resetGame}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-700/60 border border-gray-600/30 text-red-400 hover:bg-gray-600/80 transition-colors"
              title="Reset Game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── ZK Trust Banner ──────────────────────────────────────── */}
      {zkEnabled && (
        <div className="w-full bg-gradient-to-r from-violet-950/80 via-violet-900/40 to-violet-950/80 border-b border-violet-500/20 px-3 py-1.5 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[10px] sm:text-xs font-semibold text-violet-300">
            Zero-Knowledge Proof Active
          </span>
          <span className="text-[8px] sm:text-[10px] text-violet-400/70 hidden sm:inline">
            — Each card is cryptographically verified via Merkle Tree + VRF
          </span>
          <div className="flex items-center gap-1 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[8px] text-violet-400/80 font-mono">LIVE</span>
          </div>
        </div>
      )}

      {/* ─── Main Game Area ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-2 sm:px-4 relative overflow-hidden min-h-0">
        {/* Casino felt background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 90% 70% at 50% 50%, #1a5c2e 0%, #0f3d1c 30%, #0a2a12 55%, #050f08 80%, #020804 100%)',
            opacity: 0.25,
          }}
        />
        {/* Subtle vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 65% at 50% 50%, transparent 50%, rgba(0,0,0,0.3) 100%)',
          }}
        />

        <div className="relative w-full max-w-2xl flex flex-col items-center flex-1 min-h-0 justify-between py-1 sm:py-2">
          {/* Dealer Section */}
          <div className="w-full flex-shrink-0">
            <HandDisplay
              cards={dealerHand}
              label="Dealer"
              hideScore={phase === 'playing' || phase === 'split'}
              isDealer
              isResultPhase={isResultPhase}
              isDealerTurn={phase === 'dealerTurn'}
              showZKBadge={zkEnabled}
            />
          </div>

          {/* Divider with bet display */}
          <div className="w-full max-w-xs mx-auto flex flex-col items-center flex-shrink-0">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600/25 to-transparent" />
            {currentBet > 0 && phase !== 'betting' && (
              <div
                key={`bet-${currentBet}-${phase}`}
                className="flex items-center gap-1 bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-700/20"
                style={{ animation: 'chip-place 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                <div className="w-1 h-1 rounded-full bg-amber-400/60" />
                <span className="text-amber-300/70 font-mono text-[9px] sm:text-[10px] font-bold">BET ${currentBet}</span>
              </div>
            )}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600/25 to-transparent" />
          </div>

          {/* Message Area */}
          <div className="text-center flex-shrink-0 py-0.5">
            <p
              key={`msg-${message}`}
              className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                result === 'blackjack' ? 'text-amber-400' :
                result === 'win' ? 'text-emerald-400' :
                result === 'lose' || result === 'dealerBlackjack' ? 'text-red-400' :
                result === 'surrender' ? 'text-orange-400' :
                result === 'push' ? 'text-gray-400' :
                isSplitMode ? 'text-cyan-400' :
                'text-gray-400'
              }`}
              style={isResultPhase ? { animation: 'result-pop 0.4s ease-out' } : undefined}
            >
              {message}
            </p>
          </div>

          {/* Player Section */}
          <div className="w-full flex-shrink-0">
            {!isSplitMode ? (
              <HandDisplay
                cards={playerHand}
                label="Player"
                isResultPhase={isResultPhase}
                isWinningHand={isResultPhase && (result === 'win' || result === 'blackjack')}
                showZKBadge={zkEnabled}
              />
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                {splitHands.map((hand, i) => (
                  <HandDisplay
                    key={i}
                    cards={hand.cards}
                    label={`Hand ${i + 1}`}
                    isActive={i === activeSplitIndex}
                    isResultPhase={isResultPhase}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls Area */}
          <div className="w-full flex-shrink-0 pb-1">
            {phase === 'betting' && <BettingArea />}
            {(phase === 'playing' || phase === 'result') && <GameControls />}
            {phase === 'dealerTurn' && (
              <div className="flex flex-col items-center gap-1 py-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'thinking-dots 1.4s ease-in-out infinite' }} />
                    <span className="w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'thinking-dots 1.4s ease-in-out 0.2s infinite' }} />
                    <span className="w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'thinking-dots 1.4s ease-in-out 0.4s infinite' }} />
                  </div>
                  Dealer is playing...
                </div>
              </div>
            )}
            {phase === 'insurance' && (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Insurance? ${Math.floor(currentBet / 2)}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => { safePlay(playCardDeal); takeInsurance(); }}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 min-h-[36px] text-xs transition-all duration-200"
                  >
                    Take Insurance
                  </Button>
                  <Button
                    onClick={() => { declineInsurance(); }}
                    variant="outline"
                    className="border-gray-600/50 text-gray-300 hover:bg-gray-800 hover:text-white min-h-[36px] text-xs transition-all duration-200"
                  >
                    No Thanks
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="w-full bg-gray-900/90 border-t border-gray-800/40 px-3 py-1 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-[9px] sm:text-[10px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-violet-900/20 border border-violet-700/20 rounded px-1 py-0.5">
              <ShieldCheck className="w-2.5 h-2.5 text-violet-500" />
              <span className="text-[8px] sm:text-[9px] font-bold text-violet-400 uppercase tracking-wider">ZK Verified</span>
              {zkEnabled && (
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
              )}
            </div>
            {zkEnabled && zkCommitment && (
              <span className="text-[7px] sm:text-[8px] text-violet-500/60 font-mono hidden sm:inline">
                Merkle: {zkCommitment.merkleRoot.slice(0, 6)}...
              </span>
            )}
            <span className="text-gray-600 hidden sm:inline">♠ Blackjack 21</span>
          </div>
          <div className="flex items-center gap-2">
            {zkEnabled && zkVerification && (
              <span className={`text-[8px] font-bold ${zkVerification.verified ? 'text-emerald-500' : 'text-red-500'}`}>
                {zkVerification.verified ? '✓ ZK Proven' : '✗ ZK Failed'}
              </span>
            )}
            <div className="hidden sm:flex items-center gap-1 text-[8px] text-gray-600">
              <kbd className="px-0.5 py-0.5 bg-gray-800/60 border border-gray-700/40 rounded text-[7px] font-mono">H</kbd>
              <span>Hit</span>
              <kbd className="px-0.5 py-0.5 bg-gray-800/60 border border-gray-700/40 rounded text-[7px] font-mono">S</kbd>
              <span>Stand</span>
              <kbd className="px-0.5 py-0.5 bg-gray-800/60 border border-gray-700/40 rounded text-[7px] font-mono">D</kbd>
              <span>Double</span>
            </div>
            {stats.totalGames > 0 && (
              <span className={`font-mono text-[9px] font-bold ${sessionProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {sessionProfit >= 0 ? '+' : ''}{sessionProfit >= 0 ? `$${sessionProfit}` : `-$${Math.abs(sessionProfit)}`}
              </span>
            )}
            <span className="text-[9px] text-gray-600">{stats.totalGames}g</span>
          </div>
        </div>
      </footer>

      {/* ─── Help / Rules Overlay ────────────────────────────────── */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ animation: 'overlay-in 0.2s ease-out' }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
          <div
            className="relative w-full max-w-md bg-gray-900/98 border border-gray-700/40 rounded-2xl shadow-2xl overflow-hidden max-h-[85dvh] overflow-y-auto"
            style={{ animation: 'overlay-slide-up 0.3s ease-out' }}
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-800/60 bg-gray-900/50">
              <h2 className="text-sm font-bold text-white">How to Play</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)} className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="p-3 space-y-4">
              <section>
                <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">Basic Rules</h3>
                <ul className="space-y-1 text-[10px] text-gray-400 leading-relaxed">
                  <li className="flex gap-1.5"><span className="text-amber-500/60">•</span>Get as close to 21 as possible without going over</li>
                  <li className="flex gap-1.5"><span className="text-amber-500/60">•</span>Face cards (J, Q, K) are worth 10; Aces are 1 or 11</li>
                  <li className="flex gap-1.5"><span className="text-amber-500/60">•</span>Beat the dealer&apos;s hand to win</li>
                  <li className="flex gap-1.5"><span className="text-amber-500/60">•</span>Going over 21 is a &quot;bust&quot; — you lose automatically</li>
                </ul>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">Actions</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-gray-800/40 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-white mb-0.5">Hit</div>
                    <div className="text-[9px] text-gray-500">Take another card</div>
                  </div>
                  <div className="bg-gray-800/40 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-white mb-0.5">Stand</div>
                    <div className="text-[9px] text-gray-500">Keep your hand</div>
                  </div>
                  <div className="bg-gray-800/40 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-white mb-0.5">Double Down</div>
                    <div className="text-[9px] text-gray-500">Double bet, take one card</div>
                  </div>
                  <div className="bg-gray-800/40 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-white mb-0.5">Split</div>
                    <div className="text-[9px] text-gray-500">Split matching cards</div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">Payouts</h3>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] bg-gray-800/30 rounded px-2 py-1">
                    <span className="text-gray-400">Blackjack (Ace + 10)</span>
                    <span className="text-amber-300 font-mono font-bold">3:2</span>
                  </div>
                  <div className="flex justify-between text-[10px] bg-gray-800/30 rounded px-2 py-1">
                    <span className="text-gray-400">Regular Win</span>
                    <span className="text-emerald-300 font-mono font-bold">1:1</span>
                  </div>
                  <div className="flex justify-between text-[10px] bg-gray-800/30 rounded px-2 py-1">
                    <span className="text-gray-400">Push (Tie)</span>
                    <span className="text-gray-300 font-mono font-bold">0</span>
                  </div>
                  <div className="flex justify-between text-[10px] bg-gray-800/30 rounded px-2 py-1">
                    <span className="text-gray-400">Insurance</span>
                    <span className="text-cyan-300 font-mono font-bold">2:1</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">Keyboard Shortcuts</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <kbd className="px-1 py-0.5 bg-gray-800/60 border border-gray-700/40 rounded text-[9px] font-mono text-white">H</kbd>
                    <span className="text-gray-400">Hit</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <kbd className="px-1 py-0.5 bg-gray-800/60 border border-gray-700/40 rounded text-[9px] font-mono text-white">S</kbd>
                    <span className="text-gray-400">Stand</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <kbd className="px-1 py-0.5 bg-gray-800/60 border border-gray-700/40 rounded text-[9px] font-mono text-white">D</kbd>
                    <span className="text-gray-400">Double Down</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <kbd className="px-1 py-0.5 bg-gray-800/60 border border-gray-700/40 rounded text-[9px] font-mono text-white">N</kbd>
                    <span className="text-gray-400">New Round</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">Provably Fair</h3>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  This game uses a cryptographic commitment scheme to ensure fairness. Before each round, the server generates a seed and shares only its SHA-256 hash. After the round, the seed is revealed so you can verify the deck was not manipulated.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Stats Panel */}
      <StatsPanel />

      {/* Provably Fair Panel */}
      <ProvablyFairPanel />

      {/* ZK Proof Panel */}
      <ZKProofPanel />

      {/* ─── ZK Side Panel (Sliding) ─── */}
      {showSidePanel && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setShowSidePanel(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-[300px] sm:w-[320px] bg-gray-900/98 border-l border-gray-700/40 z-50 overflow-y-auto shadow-2xl"
            style={{ animation: 'overlay-slide-up 0.2s ease-out' }}
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-800/60 sticky top-0 bg-gray-900/98 z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold text-white">ZK Dashboard</span>
              </div>
              <button
                onClick={() => setShowSidePanel(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ZKSidePanel />
          </div>
        </>
      )}
    </div>
  );
}
