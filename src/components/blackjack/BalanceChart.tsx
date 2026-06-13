'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/game-store';
import { INITIAL_BALANCE } from '@/lib/blackjack';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';

interface TooltipData {
  hand: number;
  balance: number;
  x: number;
  y: number;
}

export function BalanceChart() {
  const balanceHistory = useGameStore((s) => s.balanceHistory);

  if (balanceHistory.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-[160px] text-gray-500 text-xs gap-2">
        <svg width="40" height="24" viewBox="0 0 40 24" className="text-gray-600">
          <polyline
            points="4,20 12,14 20,18 28,8 36,12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
        </svg>
        <span>Play a few rounds to see your balance history</span>
      </div>
    );
  }

  return <BalanceChartInner balanceHistory={balanceHistory} />;
}

function BalanceChartInner({ balanceHistory }: { balanceHistory: number[] }) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Chart dimensions
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 25, right: 15, bottom: 30, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Limit visible data points for performance
  const maxVisiblePoints = 50;
  const visibleHistory = balanceHistory.length > maxVisiblePoints
    ? balanceHistory.slice(-maxVisiblePoints)
    : balanceHistory;
  const startHand = balanceHistory.length - visibleHistory.length;

  // Calculate min/max with some padding
  const dataMin = Math.min(...visibleHistory);
  const dataMax = Math.max(...visibleHistory);
  // Ensure starting balance is always within view
  const displayMin = Math.min(dataMin, INITIAL_BALANCE);
  const displayMax = Math.max(dataMax, INITIAL_BALANCE);
  const range = displayMax - displayMin || 1;
  // Add 10% padding
  const paddedMin = displayMin - range * 0.1;
  const paddedMax = displayMax + range * 0.1;
  const paddedRange = paddedMax - paddedMin;

  // Generate data points
  const points = visibleHistory.map((val, i) => ({
    hand: startHand + i,
    balance: val,
    x: padding.left + (i / (visibleHistory.length - 1)) * innerWidth,
    y: padding.top + innerHeight - ((val - paddedMin) / paddedRange) * innerHeight,
  }));

  // Helper: check if balance is above starting
  const isAboveStart = (balance: number) => balance >= INITIAL_BALANCE;

  // Generate smooth bezier path from points
  const linePath = generateSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${padding.top + innerHeight} L ${points[0].x},${padding.top + innerHeight} Z`;

  // Reference line Y position
  const refLineY = padding.top + innerHeight - ((INITIAL_BALANCE - paddedMin) / paddedRange) * innerHeight;

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const val = paddedMin + (i / (yTickCount - 1)) * paddedRange;
    const y = padding.top + innerHeight - ((val - paddedMin) / paddedRange) * innerHeight;
    return { value: Math.round(val), y };
  });

  // X-axis ticks
  const xTickCount = Math.min(visibleHistory.length, 6);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const dataIdx = Math.round((i / (xTickCount - 1)) * (visibleHistory.length - 1));
    return {
      hand: startHand + dataIdx,
      x: points[dataIdx].x,
    };
  });

  // Current balance and stats
  const currentBalance = visibleHistory[visibleHistory.length - 1];
  const sessionHigh = Math.max(...visibleHistory);
  const sessionLow = Math.min(...visibleHistory);

  // Biggest swing calculations
  let maxDrawdown = 0;
  let maxGain = 0;
  let peak = visibleHistory[0];
  for (let i = 1; i < visibleHistory.length; i++) {
    if (visibleHistory[i] > peak) peak = visibleHistory[i];
    const drawdown = peak - visibleHistory[i];
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  let trough = visibleHistory[0];
  for (let i = 1; i < visibleHistory.length; i++) {
    if (visibleHistory[i] < trough) trough = visibleHistory[i];
    const gain = visibleHistory[i] - trough;
    if (gain > maxGain) maxGain = gain;
  }

  // Trend indicator (based on last 5 data points)
  const trendLookback = Math.min(5, visibleHistory.length);
  const recentPoints = visibleHistory.slice(-trendLookback);
  const trendDirection = recentPoints.length >= 2
    ? recentPoints[recentPoints.length - 1] - recentPoints[0]
    : 0;
  const trendThreshold = 10; // $10 threshold for "flat"
  const trend: 'up' | 'down' | 'flat' = trendDirection > trendThreshold
    ? 'up'
    : trendDirection < -trendThreshold
    ? 'down'
    : 'flat';

  // Handle mouse events for tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = chartWidth / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Find closest point
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (closestDist < 30 * scaleX) {
      setTooltip({
        hand: points[closestIdx].hand,
        balance: points[closestIdx].balance,
        x: points[closestIdx].x,
        y: points[closestIdx].y,
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Determine gradient colors based on current balance
  const isPositiveOverall = currentBalance >= INITIAL_BALANCE;
  const lineGradientId = 'balanceLineGrad';
  const areaGradientId = 'balanceAreaGrad';

  // Min/Max marker positions
  const minIdx = visibleHistory.indexOf(sessionLow);
  const maxIdx = visibleHistory.indexOf(sessionHigh);
  const minPoint = minIdx >= 0 && minIdx < points.length ? points[minIdx] : null;
  const maxPoint = maxIdx >= 0 && maxIdx < points.length ? points[maxIdx] : null;

  // Last point
  const lastPoint = points[points.length - 1];

  return (
    <div className="w-full space-y-3">
      {/* Current Balance Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Current</span>
          <motion.span
            key={currentBalance}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-lg font-bold font-mono ${
              isPositiveOverall ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            ${currentBalance.toLocaleString()}
          </motion.span>
        </div>
        <div className="flex items-center gap-1.5">
          {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
          {trend === 'flat' && <Minus className="w-3.5 h-3.5 text-gray-400" />}
          <span
            className={`text-xs font-medium ${
              trend === 'up'
                ? 'text-emerald-400'
                : trend === 'down'
                ? 'text-red-400'
                : 'text-gray-400'
            }`}
          >
            {trend === 'up' ? 'Trending Up' : trend === 'down' ? 'Trending Down' : 'Stable'}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full"
          style={{ height: 'auto', minHeight: '140px' }}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Line gradient - green/red based on each point */}
            <linearGradient id={lineGradientId} x1="0" y1="0" x2="1" y2="0">
              {visibleHistory.map((val, i) => {
                const offset = (i / (visibleHistory.length - 1)) * 100;
                const color = isAboveStart(val) ? '#34d399' : '#f87171';
                return (
                  <stop
                    key={i}
                    offset={`${offset}%`}
                    stopColor={color}
                  />
                );
              })}
            </linearGradient>

            {/* Area gradient - vertical fade */}
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositiveOverall ? '#34d399' : '#f87171'} stopOpacity="0.15" />
              <stop offset="100%" stopColor={isPositiveOverall ? '#34d399' : '#f87171'} stopOpacity="0.02" />
            </linearGradient>

            {/* Glow filter for line */}
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clip path for animated reveal */}
            <clipPath id="revealClip">
              <motion.rect
                x={0}
                y={0}
                height={chartHeight}
                initial={{ width: 0 }}
                animate={{ width: chartWidth }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </clipPath>
          </defs>

          {/* Grid lines (horizontal) */}
          {yTicks.map((tick, i) => (
            <line
              key={`grid-${i}`}
              x1={padding.left}
              y1={tick.y}
              x2={padding.left + innerWidth}
              y2={tick.y}
              stroke="#374151"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map((tick, i) => (
            <text
              key={`ylabel-${i}`}
              x={padding.left - 8}
              y={tick.y + 3}
              textAnchor="end"
              fill="#9ca3af"
              fontSize="9"
              fontFamily="monospace"
            >
              ${tick.value.toLocaleString()}
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={`xlabel-${i}`}
              x={tick.x}
              y={padding.top + innerHeight + 18}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="9"
              fontFamily="monospace"
            >
              #{tick.hand}
            </text>
          ))}

          {/* Starting balance reference line */}
          <line
            x1={padding.left}
            y1={refLineY}
            x2={padding.left + innerWidth}
            y2={refLineY}
            stroke="#fbbf24"
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.3"
          />
          <text
            x={padding.left + innerWidth + 2}
            y={refLineY + 3}
            fill="#fbbf24"
            fontSize="8"
            opacity="0.5"
            fontFamily="monospace"
          >
            $1K
          </text>

          {/* Chart content with reveal animation */}
          <g clipPath="url(#revealClip)">
            {/* Area fill */}
            <motion.path
              d={areaPath}
              fill={`url(#${areaGradientId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />

            {/* Main line */}
            <motion.path
              d={linePath}
              fill="none"
              stroke={`url(#${lineGradientId})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineGlow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />

            {/* Data point dots */}
            {points.map((point, i) => {
              const aboveStart = isAboveStart(point.balance);
              const isLast = i === points.length - 1;
              const isHigh = point.balance === sessionHigh;
              const isLow = point.balance === sessionLow;

              // Only show dots for: first, last, high, low, or every Nth point
              const showDot =
                isLast ||
                i === 0 ||
                isHigh ||
                isLow ||
                (points.length <= 20) ||
                (i % Math.ceil(points.length / 15) === 0);

              if (!showDot) return null;

              return (
                <motion.circle
                  key={`dot-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 4 : isHigh || isLow ? 3.5 : 2.5}
                  fill={aboveStart ? '#34d399' : '#f87171'}
                  stroke="#111827"
                  strokeWidth={isLast ? 2 : 1.5}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.8 + (i / points.length) * 0.5,
                  }}
                />
              );
            })}

            {/* Pulsing glow on last point */}
            <motion.circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={8}
              fill={isPositiveOverall ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}
              animate={{
                r: [6, 10, 6],
                opacity: [0.4, 0.1, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Min marker */}
            {minPoint && (
              <g>
                <motion.circle
                  cx={minPoint.x}
                  cy={minPoint.y + 12}
                  r={3}
                  fill="#f87171"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 1.5 }}
                />
                <motion.text
                  x={minPoint.x}
                  y={minPoint.y + 22}
                  textAnchor="middle"
                  fill="#f87171"
                  fontSize="8"
                  fontFamily="monospace"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 1.5 }}
                >
                  Low
                </motion.text>
              </g>
            )}

            {/* Max marker */}
            {maxPoint && (
              <g>
                <motion.circle
                  cx={maxPoint.x}
                  cy={maxPoint.y - 12}
                  r={3}
                  fill="#34d399"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 1.5 }}
                />
                <motion.text
                  x={maxPoint.x}
                  y={maxPoint.y - 18}
                  textAnchor="middle"
                  fill="#34d399"
                  fontSize="8"
                  fontFamily="monospace"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 1.5 }}
                >
                  High
                </motion.text>
              </g>
            )}
          </g>

          {/* Tooltip vertical line */}
          {tooltip && (
            <g>
              <line
                x1={tooltip.x}
                y1={padding.top}
                x2={tooltip.x}
                y2={padding.top + innerHeight}
                stroke="#6b7280"
                strokeWidth="0.5"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <circle
                cx={tooltip.x}
                cy={tooltip.y}
                r={5}
                fill={isAboveStart(tooltip.balance) ? '#34d399' : '#f87171'}
                stroke="#111827"
                strokeWidth="2"
                opacity="0.9"
              />
            </g>
          )}

          {/* Axis labels */}
          <text
            x={padding.left + innerWidth / 2}
            y={chartHeight - 2}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="9"
          >
            Hand #
          </text>
          <text
            x={8}
            y={padding.top + innerHeight / 2}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="9"
            transform={`rotate(-90, 8, ${padding.top + innerHeight / 2})`}
          >
            Balance
          </text>
        </svg>

        {/* Floating tooltip */}
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none z-10"
            style={{
              left: `${(tooltip.x / chartWidth) * 100}%`,
              top: `${(tooltip.y / chartHeight) * 100}%`,
              transform: 'translate(-50%, -130%)',
            }}
          >
            <div className="bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
              <div className="text-[10px] text-gray-400">Hand #{tooltip.hand}</div>
              <div
                className={`text-xs font-bold font-mono ${
                  isAboveStart(tooltip.balance) ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                ${tooltip.balance.toLocaleString()}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-2">
        <StatItem
          label="Session High"
          value={`$${sessionHigh.toLocaleString()}`}
          icon={<ArrowUp className="w-3 h-3 text-emerald-400" />}
          valueColor="text-emerald-400"
        />
        <StatItem
          label="Session Low"
          value={`$${sessionLow.toLocaleString()}`}
          icon={<ArrowDown className="w-3 h-3 text-red-400" />}
          valueColor="text-red-400"
        />
        <StatItem
          label="Max Gain"
          value={`+$${maxGain.toLocaleString()}`}
          icon={<TrendingUp className="w-3 h-3 text-emerald-400" />}
          valueColor="text-emerald-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatItem
          label="Max Drawdown"
          value={`-$${maxDrawdown.toLocaleString()}`}
          icon={<TrendingDown className="w-3 h-3 text-red-400" />}
          valueColor="text-red-400"
        />
        <StatItem
          label="From Start"
          value={`${currentBalance - INITIAL_BALANCE >= 0 ? '+' : ''}$${(currentBalance - INITIAL_BALANCE).toLocaleString()}`}
          icon={
            currentBalance - INITIAL_BALANCE > 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : currentBalance - INITIAL_BALANCE < 0 ? (
              <TrendingDown className="w-3 h-3 text-red-400" />
            ) : (
              <Minus className="w-3 h-3 text-gray-400" />
            )
          }
          valueColor={
            currentBalance - INITIAL_BALANCE > 0
              ? 'text-emerald-400'
              : currentBalance - INITIAL_BALANCE < 0
              ? 'text-red-400'
              : 'text-gray-400'
          }
        />
      </div>
    </div>
  );
}

/** Generate a smooth cubic bezier path through data points */
function generateSmoothPath(
  points: { x: number; y: number }[]
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  // Use Catmull-Rom to Bezier conversion for smooth curves
  const tension = 0.3;
  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
}

/** Small stat display item */
function StatItem({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor: string;
}) {
  return (
    <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/20">
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xs font-bold font-mono ${valueColor}`}>{value}</p>
    </div>
  );
}
