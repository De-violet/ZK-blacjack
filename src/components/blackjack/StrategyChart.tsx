'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/game-store';
import { calculateScoreAllCards, calculateScore } from '@/lib/blackjack';

// ─── Strategy Actions ──────────────────────────────────────────
type Action = 'H' | 'S' | 'D' | 'Ds' | 'P' | 'Ph' | 'Rh' | 'Rs' | 'Rp';

// Dealer upcards: 2, 3, 4, 5, 6, 7, 8, 9, 10, A
const DEALER_UPCARDS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'] as const;

// ─── Color mapping for each action ─────────────────────────────
const actionColors: Record<string, { bg: string; text: string; label: string }> = {
  H:  { bg: 'bg-emerald-600/50',  text: 'text-emerald-200', label: 'Hit' },
  S:  { bg: 'bg-amber-600/50',    text: 'text-amber-200',   label: 'Stand' },
  D:  { bg: 'bg-purple-600/50',   text: 'text-purple-200',  label: 'Double' },
  Ds: { bg: 'bg-purple-500/40',   text: 'text-purple-200',  label: 'Double/Stand' },
  P:  { bg: 'bg-cyan-600/50',     text: 'text-cyan-200',    label: 'Split' },
  Ph: { bg: 'bg-cyan-500/40',     text: 'text-cyan-200',    label: 'Split/Hit' },
  Rh: { bg: 'bg-red-600/50',      text: 'text-red-200',     label: 'Surrender/Hit' },
  Rs: { bg: 'bg-red-500/40',      text: 'text-red-200',     label: 'Surrender/Stand' },
  Rp: { bg: 'bg-red-500/30',      text: 'text-red-200',     label: 'Surrender/Split' },
};

function getCellDisplay(action: Action): { display: string; fullLabel: string } {
  switch (action) {
    case 'H':  return { display: 'H', fullLabel: 'Hit' };
    case 'S':  return { display: 'S', fullLabel: 'Stand' };
    case 'D':  return { display: 'D', fullLabel: 'Double if allowed, else Hit' };
    case 'Ds': return { display: 'Ds', fullLabel: 'Double if allowed, else Stand' };
    case 'P':  return { display: 'P', fullLabel: 'Split' };
    case 'Ph': return { display: 'Ph', fullLabel: 'Split if DAS allowed, else Hit' };
    case 'Rh': return { display: 'Rh', fullLabel: 'Surrender if allowed, else Hit' };
    case 'Rs': return { display: 'Rs', fullLabel: 'Surrender if allowed, else Stand' };
    case 'Rp': return { display: 'Rp', fullLabel: 'Surrender if allowed, else Split' };
  }
}

// ─── Hard Totals Strategy (6-deck, H17) ────────────────────────
// Row index = player total (5-21), column index = dealer upcard (2-A)
const hardTotalsStrategy: Record<number, Action[]> = {
  5:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  6:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  7:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  8:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  9:  ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  10: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
  11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],
  12: ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  13: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  14: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  15: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'Rh', 'H'],
  16: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'Rh', 'Rh', 'Rh'],
  17: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'Rs'],
  18: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  19: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  21: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
};

// ─── Soft Totals Strategy (6-deck, H17) ────────────────────────
// Key = "A-X" where X is the non-ace card value
const softTotalsStrategy: Record<string, Action[]> = {
  'A-2': ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A-3': ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A-4': ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A-5': ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A-6': ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A-7': ['S', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'],
  'A-8': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  'A-9': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
};

// ─── Pairs Strategy (6-deck, H17) ──────────────────────────────
const pairsStrategy: Record<string, Action[]> = {
  'A-A': ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  '2-2': ['Ph', 'Ph', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '3-3': ['Ph', 'Ph', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '4-4': ['H', 'H', 'H', 'Ph', 'Ph', 'H', 'H', 'H', 'H', 'H'],
  '5-5': ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
  '6-6': ['Ph', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
  '7-7': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '8-8': ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'Rp'],
  '9-9': ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
  '10-10': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
};

// ─── Hard totals row labels ────────────────────────────────────
const hardTotalRows = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

// ─── Soft totals row labels ────────────────────────────────────
const softTotalRows = ['A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9'];

// ─── Pairs row labels ──────────────────────────────────────────
const pairRows = ['A-A', '2-2', '3-3', '4-4', '5-5', '6-6', '7-7', '8-8', '9-9', '10-10'];

// ─── Get soft total display label ──────────────────────────────
function getSoftLabel(key: string): string {
  const val = parseInt(key.split('-')[1]);
  return `A-${val} (${val + 11})`;
}

// ─── Cell Component ────────────────────────────────────────────
function StrategyCell({
  action,
  isHighlighted,
}: {
  action: Action;
  isHighlighted: boolean;
}) {
  const colors = actionColors[action];
  const { display } = getCellDisplay(action);

  return (
    <td
      className={`px-1 py-1.5 text-center ${colors.bg} ${colors.text} font-mono font-bold text-[11px] sm:text-xs transition-all duration-200 ${
        isHighlighted
          ? 'ring-2 ring-white/60 scale-110 z-10 relative shadow-lg'
          : ''
      }`}
      title={getCellDisplay(action).fullLabel}
    >
      {display}
    </td>
  );
}

// ─── Determine current hand highlight info ─────────────────────
function useCurrentHandHighlight() {
  const { playerHand, dealerHand, phase } = useGameStore();

  if (phase !== 'playing' && phase !== 'split') {
    return { currentRow: null, currentCol: null, handType: null as string | null };
  }

  // Get dealer upcard
  const dealerUpcard = dealerHand.length > 0 ? dealerHand[0].rank : null;
  const colIndex = dealerUpcard ? DEALER_UPCARDS.indexOf(dealerUpcard as typeof DEALER_UPCARDS[number]) : -1;

  // Get player hand info
  const score = calculateScoreAllCards(playerHand);
  const hasAce = playerHand.some(c => c.rank === 'A');

  // Check for pair
  let isPair = false;
  let pairKey = '';
  if (playerHand.length === 2) {
    const r1 = playerHand[0].rank;
    const r2 = playerHand[1].rank;
    if (r1 === r2) {
      isPair = true;
      pairKey = `${r1}-${r2}`;
    } else {
      const faceRanks = ['10', 'J', 'Q', 'K'];
      if (faceRanks.includes(r1) && faceRanks.includes(r2)) {
        isPair = true;
        pairKey = '10-10';
      }
    }
  }

  // Determine hand type and row key
  if (isPair && pairKey in pairsStrategy) {
    return { currentRow: pairKey, currentCol: colIndex, handType: 'pairs' };
  }

  // Check soft hand (has ace that counts as 11)
  if (hasAce && score <= 21) {
    // Check if it's actually a soft hand (ace counted as 11)
    let aceCount = 0;
    let rawTotal = 0;
    for (const c of playerHand) {
      rawTotal += (c.rank === 'A' ? 11 : ['K', 'Q', 'J'].includes(c.rank) ? 10 : parseInt(c.rank));
      if (c.rank === 'A') aceCount++;
    }
    let adjusted = rawTotal;
    let acesLeft = aceCount;
    while (adjusted > 21 && acesLeft > 0) {
      adjusted -= 10;
      acesLeft--;
    }
    // Soft hand if still have an ace as 11
    if (acesLeft > 0 && playerHand.length === 2) {
      const nonAceVal = score - 11;
      if (nonAceVal >= 2 && nonAceVal <= 9) {
        const softKey = `A-${nonAceVal}`;
        if (softKey in softTotalsStrategy) {
          return { currentRow: softKey, currentCol: colIndex, handType: 'soft' };
        }
      }
    }
  }

  // Hard total
  if (score >= 5 && score <= 21) {
    return { currentRow: String(score), currentCol: colIndex, handType: 'hard' };
  }

  return { currentRow: null, currentCol: colIndex, handType: null };
}

// ─── Hard Totals Table ─────────────────────────────────────────
function HardTotalsTable({ currentRow, currentCol }: { currentRow: string | null; currentCol: number }) {
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full border-collapse min-w-[440px]">
        <thead>
          <tr className="sticky top-0 z-10">
            <th className="px-2 py-2 text-left text-[11px] font-bold text-gray-400 bg-gray-900/95 backdrop-blur-sm sticky left-0 z-20 min-w-[40px]">
              Hand
            </th>
            {DEALER_UPCARDS.map((upcard, i) => (
              <th
                key={upcard}
                className={`px-1 py-2 text-center text-[11px] font-bold bg-gray-900/95 backdrop-blur-sm min-w-[36px] ${
                  currentCol === i ? 'text-white' : 'text-gray-400'
                }`}
              >
                <span className={currentCol === i ? 'text-amber-400' : ''}>{upcard}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hardTotalRows.map((total) => {
            const rowKey = String(total);
            const actions = hardTotalsStrategy[total];
            const isRowHighlighted = currentRow === rowKey;

            return (
              <tr
                key={total}
                className={`border-t border-gray-800/30 ${isRowHighlighted ? 'bg-white/5' : ''}`}
              >
                <td className={`px-2 py-1.5 font-mono font-bold text-[11px] sm:text-xs sticky left-0 z-10 ${
                  isRowHighlighted ? 'text-amber-400 bg-gray-900/95' : 'text-gray-300 bg-gray-900/90'
                }`}>
                  {total}
                </td>
                {actions.map((action, colIdx) => (
                  <StrategyCell
                    key={colIdx}
                    action={action}
                    isHighlighted={isRowHighlighted && currentCol === colIdx}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Soft Totals Table ─────────────────────────────────────────
function SoftTotalsTable({ currentRow, currentCol }: { currentRow: string | null; currentCol: number }) {
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full border-collapse min-w-[440px]">
        <thead>
          <tr className="sticky top-0 z-10">
            <th className="px-2 py-2 text-left text-[11px] font-bold text-gray-400 bg-gray-900/95 backdrop-blur-sm sticky left-0 z-20 min-w-[70px]">
              Hand
            </th>
            {DEALER_UPCARDS.map((upcard, i) => (
              <th
                key={upcard}
                className={`px-1 py-2 text-center text-[11px] font-bold bg-gray-900/95 backdrop-blur-sm min-w-[36px] ${
                  currentCol === i ? 'text-white' : 'text-gray-400'
                }`}
              >
                <span className={currentCol === i ? 'text-amber-400' : ''}>{upcard}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {softTotalRows.map((key) => {
            const actions = softTotalsStrategy[key];
            const isRowHighlighted = currentRow === key;

            return (
              <tr
                key={key}
                className={`border-t border-gray-800/30 ${isRowHighlighted ? 'bg-white/5' : ''}`}
              >
                <td className={`px-2 py-1.5 font-mono font-bold text-[11px] sm:text-xs sticky left-0 z-10 ${
                  isRowHighlighted ? 'text-amber-400 bg-gray-900/95' : 'text-gray-300 bg-gray-900/90'
                }`}>
                  {getSoftLabel(key)}
                </td>
                {actions.map((action, colIdx) => (
                  <StrategyCell
                    key={colIdx}
                    action={action}
                    isHighlighted={isRowHighlighted && currentCol === colIdx}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pairs Table ───────────────────────────────────────────────
function PairsTable({ currentRow, currentCol }: { currentRow: string | null; currentCol: number }) {
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full border-collapse min-w-[440px]">
        <thead>
          <tr className="sticky top-0 z-10">
            <th className="px-2 py-2 text-left text-[11px] font-bold text-gray-400 bg-gray-900/95 backdrop-blur-sm sticky left-0 z-20 min-w-[50px]">
              Pair
            </th>
            {DEALER_UPCARDS.map((upcard, i) => (
              <th
                key={upcard}
                className={`px-1 py-2 text-center text-[11px] font-bold bg-gray-900/95 backdrop-blur-sm min-w-[36px] ${
                  currentCol === i ? 'text-white' : 'text-gray-400'
                }`}
              >
                <span className={currentCol === i ? 'text-amber-400' : ''}>{upcard}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pairRows.map((key) => {
            const actions = pairsStrategy[key];
            const isRowHighlighted = currentRow === key;

            return (
              <tr
                key={key}
                className={`border-t border-gray-800/30 ${isRowHighlighted ? 'bg-white/5' : ''}`}
              >
                <td className={`px-2 py-1.5 font-mono font-bold text-[11px] sm:text-xs sticky left-0 z-10 ${
                  isRowHighlighted ? 'text-amber-400 bg-gray-900/95' : 'text-gray-300 bg-gray-900/90'
                }`}>
                  {key}
                </td>
                {actions.map((action, colIdx) => (
                  <StrategyCell
                    key={colIdx}
                    action={action}
                    isHighlighted={isRowHighlighted && currentCol === colIdx}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────────
function Legend() {
  const legendItems: { action: string; color: string; label: string }[] = [
    { action: 'H', color: 'bg-emerald-600/50 text-emerald-200', label: 'Hit' },
    { action: 'S', color: 'bg-amber-600/50 text-amber-200', label: 'Stand' },
    { action: 'D', color: 'bg-purple-600/50 text-purple-200', label: 'Double (else Hit)' },
    { action: 'Ds', color: 'bg-purple-500/40 text-purple-200', label: 'Double (else Stand)' },
    { action: 'P', color: 'bg-cyan-600/50 text-cyan-200', label: 'Split' },
    { action: 'Ph', color: 'bg-cyan-500/40 text-cyan-200', label: 'Split (else Hit)' },
    { action: 'Rh', color: 'bg-red-600/50 text-red-200', label: 'Surrender (else Hit)' },
    { action: 'Rs', color: 'bg-red-500/40 text-red-200', label: 'Surrender (else Stand)' },
    { action: 'Rp', color: 'bg-red-500/30 text-red-200', label: 'Surrender (else Split)' },
  ];

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center pt-2">
      {legendItems.map((item) => (
        <div key={item.action} className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold font-mono ${item.color}`}>
            {item.action}
          </span>
          <span className="text-gray-400 text-[10px]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function StrategyChart() {
  const { currentRow, currentCol, handType } = useCurrentHandHighlight();

  return (
    <div className="space-y-3">
      {/* Info badges */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          6-Deck Shoe
        </Badge>
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          Dealer Hits Soft 17
        </Badge>
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          DAS Allowed
        </Badge>
        <Badge variant="outline" className="border-gray-600/40 text-gray-400 text-[10px]">
          Late Surrender
        </Badge>
      </div>

      {handType && currentRow && currentCol >= 0 && (
        <div className="text-center">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
            ⬆ Current hand highlighted
          </Badge>
        </div>
      )}

      {/* Tabs for the three strategy types */}
      <Tabs defaultValue={handType === 'soft' ? 'soft' : handType === 'pairs' ? 'pairs' : 'hard'} className="w-full">
        <TabsList className="w-full bg-gray-800/60">
          <TabsTrigger value="hard" className="flex-1 text-xs data-[state=active]:bg-gray-700 data-[state=active]:text-white">
            Hard Totals
          </TabsTrigger>
          <TabsTrigger value="soft" className="flex-1 text-xs data-[state=active]:bg-gray-700 data-[state=active]:text-white">
            Soft Totals
          </TabsTrigger>
          <TabsTrigger value="pairs" className="flex-1 text-xs data-[state=active]:bg-gray-700 data-[state=active]:text-white">
            Pairs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hard">
          <HardTotalsTable
            currentRow={handType === 'hard' ? currentRow : null}
            currentCol={currentCol}
          />
        </TabsContent>

        <TabsContent value="soft">
          <SoftTotalsTable
            currentRow={handType === 'soft' ? currentRow : null}
            currentCol={currentCol}
          />
        </TabsContent>

        <TabsContent value="pairs">
          <PairsTable
            currentRow={handType === 'pairs' ? currentRow : null}
            currentCol={currentCol}
          />
        </TabsContent>
      </Tabs>

      {/* Legend */}
      <Legend />

      {/* Footnote */}
      <p className="text-[10px] text-gray-500 text-center leading-tight">
        Strategy for 6 decks, dealer hits soft 17, double after split, late surrender.
        <br />
        &quot;DAS&quot; = Double After Split. &quot;Ph&quot; = Split if DAS, else Hit.
      </p>
    </div>
  );
}
