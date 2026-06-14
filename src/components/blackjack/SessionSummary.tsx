'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  BarChart3,
  Flame,
  Zap,
  DollarSign,
  Star,
  AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import { INITIAL_BALANCE } from '@/lib/blackjack'

interface SessionSummaryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ResultType = 'win' | 'loss' | 'push' | 'blackjack'

function getGrade(winRate: number): { grade: string; color: string } {
  if (winRate >= 70) return { grade: 'A+', color: 'text-yellow-400' }
  if (winRate >= 60) return { grade: 'A', color: 'text-green-400' }
  if (winRate >= 50) return { grade: 'B+', color: 'text-green-300' }
  if (winRate >= 40) return { grade: 'B', color: 'text-blue-400' }
  if (winRate >= 30) return { grade: 'C+', color: 'text-blue-300' }
  if (winRate >= 20) return { grade: 'C', color: 'text-gray-400' }
  if (winRate >= 10) return { grade: 'D', color: 'text-orange-400' }
  return { grade: 'F', color: 'text-red-400' }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export default function SessionSummary({ open, onOpenChange }: SessionSummaryProps) {
  const { stats, balance, history, balanceHistory } = useGameStore()

  const calculations = useMemo(() => {
    const totalHands = stats.wins + stats.losses + stats.pushes + stats.blackjacks
    const winRate = totalHands > 0 ? ((stats.wins + stats.blackjacks) / totalHands) * 100 : 0
    const sessionProfit = balance - INITIAL_BALANCE
    const profitPercentage = INITIAL_BALANCE > 0 ? (sessionProfit / INITIAL_BALANCE) * 100 : 0

    // Percentages
    const winPct = totalHands > 0 ? (stats.wins / totalHands) * 100 : 0
    const lossPct = totalHands > 0 ? (stats.losses / totalHands) * 100 : 0
    const pushPct = totalHands > 0 ? (stats.pushes / totalHands) * 100 : 0
    const bjPct = totalHands > 0 ? (stats.blackjacks / totalHands) * 100 : 0

    // Streaks
    let bestStreak = 0
    let worstStreak = 0
    let currentWinStreak = 0
    let currentLossStreak = 0

    for (const hand of history) {
      if (hand.result === 'win' || hand.result === 'blackjack') {
        currentWinStreak++
        currentLossStreak = 0
        bestStreak = Math.max(bestStreak, currentWinStreak)
      } else if (hand.result === 'lose' || hand.result === 'dealerBlackjack') {
        currentLossStreak++
        currentWinStreak = 0
        worstStreak = Math.max(worstStreak, currentLossStreak)
      } else {
        currentWinStreak = 0
        currentLossStreak = 0
      }
    }

    // Average bet size
    const averageBet =
      history.length > 0
        ? history.reduce((sum, h) => sum + (h.bet ?? 0), 0) / history.length
        : 0

    // Dealer bust rate
    const completedHands = history.filter(
      (h) => h.dealerScore !== undefined && h.dealerScore !== null
    )
    const dealerBusts = completedHands.filter((h) => (h.dealerScore as number) > 21).length
    const dealerBustRate =
      completedHands.length > 0 ? (dealerBusts / completedHands.length) * 100 : 0

    // Blackjack frequency (BJ per total hands)
    const blackjackFrequency =
      totalHands > 0 ? (stats.blackjacks / totalHands) * 100 : 0

    // Session duration
    let sessionDuration = 0
    if (history.length >= 2) {
      const first = history[0].timestamp
      const last = history[history.length - 1].timestamp
      const start = new Date(first).getTime()
      const end = new Date(last).getTime()
      sessionDuration = end - start
    } else if (history.length === 1) {
      sessionDuration = 0
    }

    // Recent results (last 10)
    const recentResults: ResultType[] = history
      .slice(-10)
      .map((h) => h.result as ResultType)

    // Grade
    const { grade, color: gradeColor } = getGrade(winRate)

    return {
      totalHands,
      winRate,
      sessionProfit,
      profitPercentage,
      winPct,
      lossPct,
      pushPct,
      bjPct,
      bestStreak,
      worstStreak,
      averageBet,
      dealerBustRate,
      blackjackFrequency,
      sessionDuration,
      recentResults,
      grade,
      gradeColor,
    }
  }, [stats, balance, history, balanceHistory])

  // Sparkline data
  const sparklineData = useMemo(() => {
    if (!balanceHistory || balanceHistory.length < 2) return null

    const points = balanceHistory.map((b: number) => b)
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1
    const width = 400
    const height = 80
    const padding = 4

    const pathPoints = points.map((val: number, i: number) => {
      const x = padding + (i / (points.length - 1)) * (width - padding * 2)
      const y = height - padding - ((val - min) / range) * (height - padding * 2)
      return { x, y }
    })

    const linePath = pathPoints
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ')

    const areaPath = `${linePath} L ${pathPoints[pathPoints.length - 1].x} ${height - padding} L ${pathPoints[0].x} ${height - padding} Z`

    const isPositive = points[points.length - 1] >= points[0]
    const lineColor = isPositive ? '#22c55e' : '#ef4444'
    const areaColor = isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'

    return { linePath, areaPath, lineColor, areaColor, width, height }
  }, [balanceHistory])

  const resultDotColor: Record<ResultType, string> = {
    win: 'bg-green-500',
    loss: 'bg-red-500',
    push: 'bg-gray-400',
    blackjack: 'bg-yellow-400',
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
    }),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700/50 text-white max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Session Summary
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence>
          {open && (
            <div className="px-6 pb-6 space-y-5">
              {/* Sparkline Balance Chart */}
              <motion.div
                custom={0}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-lg bg-gray-800/60 p-4 border border-gray-700/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Balance Over Time
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      calculations.sessionProfit >= 0
                        ? 'border-green-600 text-green-400'
                        : 'border-red-600 text-red-400'
                    }`}
                  >
                    {calculations.sessionProfit >= 0 ? '+' : ''}
                    {formatCurrency(calculations.sessionProfit)}
                  </Badge>
                </div>
                {sparklineData ? (
                  <svg
                    viewBox={`0 0 ${sparklineData.width} ${sparklineData.height}`}
                    className="w-full h-16"
                    preserveAspectRatio="none"
                  >
                    <path d={sparklineData.areaPath} fill={sparklineData.areaColor} />
                    <path
                      d={sparklineData.linePath}
                      fill="none"
                      stroke={sparklineData.lineColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <div className="h-16 flex items-center justify-center text-gray-500 text-sm">
                    Not enough data
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Start</span>
                  <span>Now</span>
                </div>
              </motion.div>

              {/* Grade + Session Profit */}
              <motion.div
                custom={1}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-4 rounded-lg bg-gray-800/60 p-4 border border-gray-700/40"
              >
                <div className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-gray-700/50 border border-gray-600/50">
                  <span className="text-3xl font-black text-shadow">
                    <span className={calculations.gradeColor}>{calculations.grade}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                    Grade
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {calculations.sessionProfit >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm font-medium text-gray-300">Session P/L</span>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      calculations.sessionProfit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {calculations.sessionProfit >= 0 ? '+' : ''}
                    {formatCurrency(calculations.sessionProfit)}
                  </div>
                  <span className="text-xs text-gray-500">
                    {calculations.profitPercentage >= 0 ? '+' : ''}
                    {calculations.profitPercentage.toFixed(1)}% from buy-in
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Balance</div>
                  <div className="text-lg font-semibold text-white">
                    {formatCurrency(balance)}
                  </div>
                </div>
              </motion.div>

              {/* Win/Loss/Push/BJ Breakdown */}
              <motion.div
                custom={2}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-lg bg-gray-800/60 p-4 border border-gray-700/40"
              >
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Results Breakdown
                </h3>

                {/* Visual bar */}
                <div className="h-6 w-full rounded-full overflow-hidden flex bg-gray-700/50 mb-3">
                  {calculations.winPct > 0 && (
                    <motion.div
                      className="bg-green-500 h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${calculations.winPct}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      title={`Wins: ${calculations.winPct.toFixed(1)}%`}
                    />
                  )}
                  {calculations.bjPct > 0 && (
                    <motion.div
                      className="bg-yellow-400 h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${calculations.bjPct}%` }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      title={`Blackjacks: ${calculations.bjPct.toFixed(1)}%`}
                    />
                  )}
                  {calculations.pushPct > 0 && (
                    <motion.div
                      className="bg-gray-400 h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${calculations.pushPct}%` }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                      title={`Pushes: ${calculations.pushPct.toFixed(1)}%`}
                    />
                  )}
                  {calculations.lossPct > 0 && (
                    <motion.div
                      className="bg-red-500 h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${calculations.lossPct}%` }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      title={`Losses: ${calculations.lossPct.toFixed(1)}%`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/20">
                    <div className="text-lg font-bold text-green-400">{stats.wins}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Wins</div>
                    <div className="text-[10px] text-green-400/70">{calculations.winPct.toFixed(1)}%</div>
                  </div>
                  <div className="text-center p-2 rounded bg-red-500/10 border border-red-500/20">
                    <div className="text-lg font-bold text-red-400">{stats.losses}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Losses</div>
                    <div className="text-[10px] text-red-400/70">{calculations.lossPct.toFixed(1)}%</div>
                  </div>
                  <div className="text-center p-2 rounded bg-gray-500/10 border border-gray-500/20">
                    <div className="text-lg font-bold text-gray-300">{stats.pushes}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Pushes</div>
                    <div className="text-[10px] text-gray-400/70">{calculations.pushPct.toFixed(1)}%</div>
                  </div>
                  <div className="text-center p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="text-lg font-bold text-yellow-400">{stats.blackjacks}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Blackjacks</div>
                    <div className="text-[10px] text-yellow-400/70">{calculations.bjPct.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="font-semibold text-white">
                    {calculations.winRate.toFixed(1)}%
                  </span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-400">Hands:</span>
                  <span className="font-semibold text-white">{calculations.totalHands}</span>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div
                custom={3}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-lg bg-gray-800/60 p-4 border border-gray-700/40"
              >
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Key Statistics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-700/30">
                    <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-400">Best Streak</div>
                      <div className="text-sm font-semibold text-green-400">
                        {calculations.bestStreak}W
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-700/30">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-400">Worst Streak</div>
                      <div className="text-sm font-semibold text-red-400">
                        {calculations.worstStreak}L
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-700/30">
                    <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-400">Avg Bet Size</div>
                      <div className="text-sm font-semibold text-white">
                        {formatCurrency(calculations.averageBet)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-700/30">
                    <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-400">Biggest Win</div>
                      <div className="text-sm font-semibold text-yellow-400">
                        {formatCurrency(stats.biggestWin)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-700/30">
                    <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-400">Dealer Bust Rate</div>
                      <div className="text-sm font-semibold text-purple-400">
                        {calculations.dealerBustRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-700/30">
                    <Star className="w-4 h-4 text-yellow-300 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-400">BJ Frequency</div>
                      <div className="text-sm font-semibold text-yellow-300">
                        {calculations.blackjackFrequency.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-700/30 col-span-2">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-400">Session Duration</div>
                      <div className="text-sm font-semibold text-blue-400">
                        {calculations.sessionDuration > 0
                          ? formatDuration(calculations.sessionDuration)
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Recent Results Trend */}
              <motion.div
                custom={4}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-lg bg-gray-800/60 p-4 border border-gray-700/40"
              >
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Recent Results
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {calculations.recentResults.length > 0 ? (
                    calculations.recentResults.map((result, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.05, type: 'spring', stiffness: 300 }}
                        className={`w-6 h-6 rounded-full ${resultDotColor[result]} shadow-lg`}
                        title={result.charAt(0).toUpperCase() + result.slice(1)}
                      />
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No results yet</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Win
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Loss
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Push
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Blackjack
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
