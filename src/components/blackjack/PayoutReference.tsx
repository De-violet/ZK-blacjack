'use client';

import {
  DollarSign,
  Trophy,
  Handshake,
  XCircle,
  Flag,
  Shield,
  Layers,
  Split,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface PayoutRow {
  icon: React.ElementType;
  label: string;
  multiplier: string;
  description: string;
  color: 'green' | 'red' | 'amber' | 'orange' | 'cyan' | 'purple';
}

const payoutRows: PayoutRow[] = [
  {
    icon: Trophy,
    label: 'Win',
    multiplier: '2×',
    description: 'Your bet + 100% profit (1:1 payout)',
    color: 'green',
  },
  {
    icon: DollarSign,
    label: 'Blackjack',
    multiplier: '2.5×',
    description: 'Your bet + 150% profit (3:2 payout)',
    color: 'amber',
  },
  {
    icon: Handshake,
    label: 'Push',
    multiplier: '1×',
    description: 'Bet returned — tie game',
    color: 'cyan',
  },
  {
    icon: XCircle,
    label: 'Lose',
    multiplier: '0×',
    description: 'Entire bet lost',
    color: 'red',
  },
  {
    icon: Flag,
    label: 'Surrender',
    multiplier: '0.5×',
    description: 'Half bet returned, half lost',
    color: 'orange',
  },
  {
    icon: Shield,
    label: 'Insurance',
    multiplier: '3×',
    description: '2:1 payout if dealer has Blackjack',
    color: 'amber',
  },
  {
    icon: Layers,
    label: 'Double Down',
    multiplier: '4×',
    description: 'Win pays 2× the doubled bet',
    color: 'purple',
  },
  {
    icon: Split,
    label: 'Split',
    multiplier: 'Varies',
    description: 'Each hand pays independently',
    color: 'cyan',
  },
];

const colorMap = {
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    multiplier: 'text-emerald-400',
    arrow: 'text-emerald-400',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    multiplier: 'text-red-400',
    arrow: 'text-red-400',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    multiplier: 'text-amber-400',
    arrow: 'text-amber-400',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    multiplier: 'text-orange-400',
    arrow: 'text-orange-400',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    icon: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    multiplier: 'text-cyan-400',
    arrow: 'text-cyan-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    multiplier: 'text-purple-400',
    arrow: 'text-purple-400',
  },
};

function getArrowIcon(color: PayoutRow['color']) {
  const colors = colorMap[color];
  if (color === 'green' || color === 'amber' || color === 'purple') {
    return <ArrowUpRight className={`w-3.5 h-3.5 ${colors.arrow}`} />;
  }
  if (color === 'red' || color === 'orange') {
    return <ArrowDownRight className={`w-3.5 h-3.5 ${colors.arrow}`} />;
  }
  return <Minus className={`w-3.5 h-3.5 ${colors.arrow}`} />;
}

export function PayoutReference() {
  return (
    <div className="space-y-3">
      {/* Payout table */}
      <div className="space-y-2">
        {payoutRows.map((row, index) => {
          const Icon = row.icon;
          const colors = colorMap[row.color];
          return (
            <div
              key={row.label}
              className={`flex items-center gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border} transition-colors`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-md ${colors.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${colors.icon}`} />
              </div>

              {/* Label + Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{row.label}</span>
                  {getArrowIcon(row.color)}
                </div>
                <p className="text-gray-400 text-xs leading-tight mt-0.5">{row.description}</p>
              </div>

              {/* Multiplier badge */}
              <Badge className={`${colors.badge} font-mono font-bold text-xs px-2.5 py-0.5 shrink-0`}>
                {row.multiplier}
              </Badge>
            </div>
          );
        })}
      </div>

      <Separator className="bg-gray-700/40" />

      {/* House edge note */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-gray-800/40 border border-gray-700/30">
        <AlertTriangle className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-gray-300 text-xs font-medium">House Edge: ~0.5%</p>
          <p className="text-gray-500 text-[11px] leading-tight">
            With basic strategy. Without strategy, the house edge can be 2–5%.
          </p>
        </div>
      </div>

      {/* Game rules summary */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          6-Deck Shoe
        </Badge>
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          Dealer Hits Soft 17
        </Badge>
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          Blackjack Pays 3:2
        </Badge>
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          Surrender Available
        </Badge>
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          Double After Split
        </Badge>
      </div>
    </div>
  );
}
