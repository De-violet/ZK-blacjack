'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/game-store';
import { INITIAL_BALANCE } from '@/lib/blackjack';

interface BalanceTrendChartProps {
  height?: number;
  className?: string;
  showLabels?: boolean;
}

interface Point {
  x: number;
  y: number;
  value: number;
  index: number;
  isPeak: boolean;
  isValley: boolean;
}

function computeChart(
  balanceHistory: number[],
  height: number,
  showLabels: boolean
) {
  const paddingTop = 4;
  const paddingRight = 6;
  const paddingBottom = showLabels ? 14 : 4;
  const paddingLeft = 6;

  const data = balanceHistory.length > 0 ? balanceHistory : [INITIAL_BALANCE];
  const w = 300;
  const h = height;
  const plotW = w - paddingLeft - paddingRight;
  const plotH = h - paddingTop - paddingBottom;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const rangePadding = range * 0.1;
  const adjustedMin = min - rangePadding;
  const adjustedMax = max + rangePadding;
  const adjustedRange = adjustedMax - adjustedMin;

  const pts: Point[] = data.map((value, index) => {
    const x =
      paddingLeft +
      (data.length === 1 ? plotW / 2 : (index / (data.length - 1)) * plotW);
    const y = paddingTop + plotH - ((value - adjustedMin) / adjustedRange) * plotH;

    let isPeak = false;
    let isValley = false;
    if (data.length >= 3 && index > 0 && index < data.length - 1) {
      if (value > data[index - 1] && value > data[index + 1]) isPeak = true;
      if (value < data[index - 1] && value < data[index + 1]) isValley = true;
    }
    if (index === 0 && data.length > 1 && value !== data[1]) {
      if (value > data[1]) isPeak = true;
      if (value < data[1]) isValley = true;
    }
    if (index === data.length - 1 && data.length > 1 && value !== data[index - 1]) {
      if (value > data[index - 1]) isPeak = true;
      if (value < data[index - 1]) isValley = true;
    }

    return { x, y, value, index, isPeak, isValley };
  });

  // Smooth bezier path (Catmull-Rom → cubic bezier)
  let d = '';
  if (pts.length === 1) {
    d = `M ${pts[0].x},${pts[0].y}`;
  } else if (pts.length === 2) {
    d = `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  } else {
    d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
  }

  const areaPath =
    pts.length === 1
      ? `M ${pts[0].x},${pts[0].y} L ${pts[0].x},${paddingTop + plotH} L ${pts[0].x - 1},${paddingTop + plotH} Z`
      : `${d} L ${pts[pts.length - 1].x},${paddingTop + plotH} L ${pts[0].x},${paddingTop + plotH} Z`;

  return {
    points: pts,
    minValue: min,
    maxValue: max,
    pathD: d,
    areaD: areaPath,
    svgWidth: w,
    svgHeight: h,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
  };
}

export default function BalanceTrendChart({
  height = 40,
  className = '',
  showLabels = true,
}: BalanceTrendChartProps) {
  const balanceHistory = useGameStore((s) => s.balanceHistory);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isProfit =
    balanceHistory.length === 0
      ? true
      : balanceHistory[balanceHistory.length - 1] >= INITIAL_BALANCE;

  const chart = computeChart(balanceHistory, height, showLabels);
  const { points, minValue, maxValue, pathD, areaD, svgWidth, svgHeight, paddingTop, paddingBottom, paddingLeft, paddingRight } = chart;

  const lineColor = isProfit ? '#10b981' : '#ef4444';
  const gradientId = 'balanceGradient';
  const glowId = 'balanceGlow';

  const lastPoint = points.length > 0 ? points[points.length - 1] : null;
  const minPoint = points.length > 0 ? points.reduce((a, b) => (a.value < b.value ? a : b)) : null;
  const maxPoint = points.length > 0 ? points.reduce((a, b) => (a.value > b.value ? a : b)) : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length <= 1) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    setHoveredIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {isProfit ? (
              <>
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
              </>
            )}
          </linearGradient>

          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Gradient area fill */}
        <motion.path
          d={areaD}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Main line with glow */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 1.2, ease: 'easeInOut' },
            opacity: { duration: 0.3 },
          }}
        />

        {/* Key point dots: peaks and valleys */}
        {points.map((pt) =>
          (pt.isPeak || pt.isValley) && points.length > 2 ? (
            <motion.circle
              key={`key-${pt.index}`}
              cx={pt.x}
              cy={pt.y}
              r={2}
              fill={pt.isPeak ? '#10b981' : '#ef4444'}
              stroke="currentColor"
              strokeWidth={0.5}
              className="text-background"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{
                delay: 0.8 + pt.index * 0.05,
                duration: 0.3,
                type: 'spring',
                stiffness: 300,
              }}
            />
          ) : null
        )}

        {/* Pulsing dot at the end (current balance) */}
        {lastPoint && (
          <g>
            <motion.circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={6}
              fill={lineColor}
              opacity={0.2}
              animate={{
                r: [4, 8, 4],
                opacity: [0.3, 0.1, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={2.5}
              fill={lineColor}
              stroke="white"
              strokeWidth={1}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 1.2,
                type: 'spring',
                stiffness: 400,
                damping: 15,
              }}
            />
          </g>
        )}

        {/* Hover indicator */}
        <AnimatePresence>
          {hoveredIndex !== null && points[hoveredIndex] && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <line
                x1={points[hoveredIndex].x}
                y1={paddingTop}
                x2={points[hoveredIndex].x}
                y2={svgHeight - paddingBottom}
                stroke={lineColor}
                strokeWidth={0.5}
                strokeDasharray="2,2"
                opacity={0.5}
              />
              <circle
                cx={points[hoveredIndex].x}
                cy={points[hoveredIndex].y}
                r={3}
                fill={lineColor}
                stroke="white"
                strokeWidth={1}
              />
              <motion.rect
                x={points[hoveredIndex].x - 22}
                y={Math.max(paddingTop, points[hoveredIndex].y - 16)}
                width={44}
                height={12}
                rx={3}
                fill="hsl(var(--popover))"
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.12 }}
              />
              <text
                x={points[hoveredIndex].x}
                y={Math.max(paddingTop, points[hoveredIndex].y - 16) + 9}
                textAnchor="middle"
                fontSize={7}
                fontWeight={600}
                fill="hsl(var(--popover-foreground))"
                className="select-none pointer-events-none"
              >
                ${points[hoveredIndex].value.toLocaleString()}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Min / Max labels */}
        {showLabels && minPoint && maxPoint && points.length > 1 && (
          <g className="select-none pointer-events-none">
            <text
              x={paddingLeft}
              y={svgHeight - 1}
              fontSize={7}
              fill={lineColor}
              opacity={0.7}
              fontWeight={500}
            >
              ${minValue.toLocaleString()}
            </text>
            <text
              x={svgWidth - paddingRight}
              y={svgHeight - 1}
              textAnchor="end"
              fontSize={7}
              fill={lineColor}
              opacity={0.7}
              fontWeight={500}
            >
              ${maxValue.toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
