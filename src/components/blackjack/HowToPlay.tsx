'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Target, Hash, Gamepad2, DollarSign, Bot, Keyboard, Shield, Flag, Eye, Zap, BookOpen } from 'lucide-react';

interface HowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections = [
  {
    icon: Target,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-400/10',
    title: 'Objective',
    content: (
      <p className="text-gray-300 text-sm leading-relaxed">
        Get as close to <span className="text-amber-400 font-bold">21</span> as possible without going over. Beat the dealer&apos;s hand to win!
      </p>
    ),
  },
  {
    icon: Hash,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/10',
    title: 'Card Values',
    content: (
      <ul className="space-y-2 text-sm text-gray-300">
        <li className="flex items-start gap-2">
          <span className="text-gray-500 mt-0.5">•</span>
          <span><span className="text-white font-medium">Number cards</span> (2–10) = face value</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-gray-500 mt-0.5">•</span>
          <span><span className="text-white font-medium">Face cards</span> (J, Q, K) = <span className="text-amber-400 font-bold">10</span></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-gray-500 mt-0.5">•</span>
          <span><span className="text-white font-medium">Ace</span> = <span className="text-emerald-400 font-bold">1</span> or <span className="text-emerald-400 font-bold">11</span> (whichever benefits you)</span>
        </li>
      </ul>
    ),
  },
  {
    icon: Gamepad2,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-400/10',
    title: 'Actions',
    content: (
      <ul className="space-y-3 text-sm text-gray-300">
        <li className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-14 h-7 rounded-md bg-emerald-600/20 text-emerald-400 text-xs font-bold shrink-0 border border-emerald-600/30">Hit</span>
          <span>Take another card. You can hit as many times as you like, but go over 21 and you <span className="text-red-400 font-medium">bust</span>.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-14 h-7 rounded-md bg-amber-600/20 text-amber-400 text-xs font-bold shrink-0 border border-amber-600/30">Stand</span>
          <span>Keep your current hand and let the dealer play.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-14 h-7 rounded-md bg-purple-600/20 text-purple-400 text-xs font-bold shrink-0 border border-purple-600/30">Dbl</span>
          <span>Double your bet, receive <span className="text-white font-medium">exactly one more card</span>, then stand automatically. Only available on your first two cards.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-14 h-7 rounded-md bg-cyan-600/20 text-cyan-400 text-xs font-bold shrink-0 border border-cyan-600/30">Split</span>
          <span>When dealt a pair, split into <span className="text-white font-medium">two separate hands</span> with equal bets. Each hand plays independently.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-14 h-7 rounded-md bg-orange-600/20 text-orange-400 text-xs font-bold shrink-0 border border-orange-600/30">Surr</span>
          <span>Give up your hand and recover <span className="text-white font-medium">half your bet</span>. Only available on your first two cards.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-14 h-7 rounded-md bg-amber-600/20 text-amber-400 text-xs font-bold shrink-0 border border-amber-600/30">Ins</span>
          <span>When the dealer shows an Ace, you can buy <span className="text-white font-medium">insurance</span> for half your bet. Pays <span className="text-amber-400 font-bold">2:1</span> if dealer has Blackjack.</span>
        </li>
      </ul>
    ),
  },
  {
    icon: DollarSign,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/10',
    title: 'Payouts',
    content: (
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between">
          <span className="text-gray-300">Win</span>
          <span className="text-emerald-400 font-mono font-bold">2× your bet</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-gray-300">Blackjack <span className="text-gray-500 text-xs">(21 with first 2 cards)</span></span>
          <span className="text-amber-400 font-mono font-bold">2.5× <span className="text-xs text-amber-400/60">(1.5× profit)</span></span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-gray-300">Push <span className="text-gray-500 text-xs">(tie)</span></span>
          <span className="text-gray-400 font-mono font-bold">Bet returned</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-gray-300">Lose</span>
          <span className="text-red-400 font-mono font-bold">Bet lost</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-gray-300">Surrender</span>
          <span className="text-orange-400 font-mono font-bold">Half bet returned</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-gray-300">Insurance <span className="text-gray-500 text-xs">(dealer BJ)</span></span>
          <span className="text-amber-400 font-mono font-bold">2:1 payout</span>
        </li>
        <li className="flex items-center justify-between pt-1 border-t border-gray-700/30">
          <span className="text-gray-400 text-xs">Full payout reference</span>
          <span className="text-amber-400 text-xs font-medium">Press B → Payouts tab</span>
        </li>
      </ul>
    ),
  },
  {
    icon: Bot,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-400/10',
    title: 'Dealer Rules',
    content: (
      <p className="text-gray-300 text-sm leading-relaxed">
        The dealer must <span className="text-white font-medium">hit until reaching 17 or higher</span>. The dealer also <span className="text-amber-400 font-medium">hits on soft 17</span> (a hand containing an Ace counted as 11 that totals 17).
      </p>
    ),
  },
  {
    icon: Eye,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-400/10',
    title: 'Card Counting',
    content: (
      <div className="space-y-3 text-sm text-gray-300">
        <p className="leading-relaxed">
          Card counting helps you track whether the remaining deck is <span className="text-emerald-400 font-medium">rich in high cards</span> (favorable) or <span className="text-red-400 font-medium">rich in low cards</span> (unfavorable).
        </p>
        <div className="space-y-2">
          <p className="text-white font-medium text-xs uppercase tracking-wider">Hi-Lo System</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2 text-center">
              <span className="text-emerald-400 font-mono font-bold text-xs">2–6</span>
              <p className="text-emerald-400 text-[10px] mt-0.5">+1</p>
            </div>
            <div className="bg-gray-500/10 border border-gray-500/20 rounded-md p-2 text-center">
              <span className="text-gray-300 font-mono font-bold text-xs">7–9</span>
              <p className="text-gray-400 text-[10px] mt-0.5">0</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2 text-center">
              <span className="text-red-400 font-mono font-bold text-xs">10–A</span>
              <p className="text-red-400 text-[10px] mt-0.5">−1</p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-white font-medium text-xs uppercase tracking-wider">Running Count vs True Count</p>
          <p className="text-xs leading-relaxed">
            <span className="text-white font-medium">Running Count</span> = sum of all card values seen
          </p>
          <p className="text-xs leading-relaxed">
            <span className="text-white font-medium">True Count</span> = Running Count ÷ Decks Remaining
          </p>
        </div>
        <div className="space-y-1.5">
          <p className="text-white font-medium text-xs uppercase tracking-wider">What the Count Means</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">+</span>
              <span>Positive count = more high cards remain = <span className="text-emerald-400 font-medium">player advantage</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">−</span>
              <span>Negative count = more low cards remain = <span className="text-red-400 font-medium">dealer advantage</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">0</span>
              <span>Neutral count = neither side has an edge</span>
            </li>
          </ul>
        </div>
        <div className="bg-gray-800/40 rounded-md p-2.5 border border-gray-700/30">
          <p className="text-gray-400 text-xs">
            <span className="text-cyan-400 font-medium">Card Counter Display</span> — Toggle with <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-gray-700 border border-gray-600 text-gray-200 text-[10px] font-mono font-bold mx-0.5">C</kbd> to show/hide the counting panel which tracks running count, true count, and deck penetration automatically.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: Zap,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/10',
    title: 'Autoplay & Strategies',
    content: (
      <div className="space-y-3 text-sm text-gray-300">
        <div className="space-y-1.5">
          <p className="text-white font-medium text-xs uppercase tracking-wider">Autoplay Mode</p>
          <p className="text-xs leading-relaxed">
            The game can play itself using <span className="text-amber-400 font-medium">basic strategy</span> — the mathematically optimal play for every hand. Toggle with <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-gray-700 border border-gray-600 text-gray-200 text-[10px] font-mono font-bold mx-0.5">A</kbd>.
          </p>
        </div>
        <div className="space-y-1.5">
          <p className="text-white font-medium text-xs uppercase tracking-wider">Speed Settings</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">🐢</span>
              <span><span className="text-white font-medium">Slow</span> — 2s between actions</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">🐇</span>
              <span><span className="text-white font-medium">Medium</span> — 1s between actions</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">⚡</span>
              <span><span className="text-white font-medium">Fast</span> — 0.3s between actions</span>
            </li>
          </ul>
        </div>
        <div className="space-y-1.5">
          <p className="text-white font-medium text-xs uppercase tracking-wider">Bet Strategies</p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span><span className="text-white font-medium">Flat</span> — Same bet every round</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span><span className="text-white font-medium">Martingale</span> — Double after loss, reset after win</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span><span className="text-white font-medium">Paroli</span> — Double after win (max 3), reset after loss</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span><span className="text-white font-medium">1-3-2-6</span> — Follow the 1→3→2→6 sequence on wins</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span><span className="text-white font-medium">Percentage</span> — Bet a fixed % of current balance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span><span className="text-white font-medium">Count-Based</span> — Increase bet when true count is favorable</span>
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    icon: Keyboard,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/10',
    title: 'Keyboard Shortcuts',
    content: (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">H</kbd>
          <span className="text-gray-300">Hit</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">S</kbd>
          <span className="text-gray-300">Stand</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">D</kbd>
          <span className="text-gray-300">Double Down</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">P</kbd>
          <span className="text-gray-300">Split</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">R</kbd>
          <span className="text-gray-300">Surrender</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">N</kbd>
          <span className="text-gray-300">New Round</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[56px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">Space</kbd>
          <span className="text-gray-300">Deal</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">C</kbd>
          <span className="text-gray-300">Card Counter</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-xs font-mono font-bold">A</kbd>
          <span className="text-gray-300">Autoplay</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">B</kbd>
          <span className="text-amber-300">Reference Book</span>
        </div>
      </div>
    ),
  },
];

export function HowToPlay({ open, onOpenChange }: HowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700/50 text-white sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
            How to Play
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Learn the rules of Blackjack and start winning!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={section.title}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={`w-8 h-8 rounded-lg ${section.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${section.iconColor}`} />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{section.title}</h3>
                </div>
                <div className="pl-[42px]">
                  {section.content}
                </div>
                {index < sections.length - 1 && (
                  <Separator className="mt-5 bg-gray-700/40" />
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
