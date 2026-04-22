// FILE: components/ui/DualDonutProgress.tsx
// PURPOSE: Two concentric ring progress indicators, used on Summary page
//          initiative cards that track two sub-metrics (e.g. Naya Safar
//          Yojana — Trucks + Buses; CEMS/APCD; MRS).
//
// Design notes:
//   - Outer ring = first sub-metric, inner ring = second sub-metric.
//   - The centre label shows the **average** of the two completion
//     percentages so the card still communicates a single at-a-glance
//     headline number, consistent with the single-ring variant.
//   - Each ring uses the same colour-threshold logic as the single donut
//     so a 70% ring reads "good" whether it's by itself or alongside
//     another ring.
//   - A small legend below the chart spells out which ring is which
//     sub-metric, along with its achieved/target values.

import { motion, useReducedMotion } from 'framer-motion';
import { formatNumber, getBarColour } from '@/lib/utils';
import type { SummaryCardBar } from '@/lib/types';

interface DualDonutProgressProps {
  bars: [SummaryCardBar, SummaryCardBar];
  size?: number;
  thickness?: number;
  gap?: number;
}

function pctOf(target: number, achieved: number): number {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((achieved / target) * 100)));
}

function Ring({
  size,
  radius,
  thickness,
  pct,
  animate,
}: {
  size: number;
  radius: number;
  thickness: number;
  pct: number;
  animate: boolean;
}) {
  const { filled, remainder } = getBarColour(pct);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);
  return (
    <>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={remainder}
        strokeWidth={thickness}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={filled}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: animate ? circumference : dashOffset }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={animate ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
      />
    </>
  );
}

export default function DualDonutProgress({
  bars,
  size = 104,
  thickness = 9,
  gap = 3,
}: DualDonutProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  const animate = !shouldReduceMotion;

  const [outer, inner] = bars;
  const outerPct = pctOf(outer.target, outer.achieved);
  const innerPct = pctOf(inner.target, inner.achieved);
  const avgPct = Math.round((outerPct + innerPct) / 2);

  const outerRadius = (size - thickness) / 2;
  const innerRadius = outerRadius - thickness - gap;

  // Pre-compute legend colour so the legend chip matches the ring.
  const outerColour = getBarColour(outerPct).filled;
  const innerColour = getBarColour(innerPct).filled;

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={`${outer.label}: ${outerPct}%. ${inner.label}: ${innerPct}%.`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <Ring
            size={size}
            radius={outerRadius}
            thickness={thickness}
            pct={outerPct}
            animate={animate}
          />
          <Ring
            size={size}
            radius={innerRadius}
            thickness={thickness}
            pct={innerPct}
            animate={animate}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className="font-bold text-[var(--color-text-primary)]"
            style={{ fontSize: Math.max(12, size * 0.2) }}
          >
            {avgPct}%
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Avg
          </span>
        </div>
      </div>

      <ul className="mt-1.5 flex w-full flex-col gap-0.5 text-[10px] leading-tight">
        {[
          { bar: outer, pct: outerPct, colour: outerColour },
          { bar: inner, pct: innerPct, colour: innerColour },
        ].map(({ bar, pct, colour }) => (
          <li
            key={bar.label}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: colour }}
              aria-hidden
            />
            <span className="truncate font-semibold text-[var(--color-text-primary)]">
              {bar.label}
            </span>
            <span className="tabular-nums text-[var(--color-text-secondary)]">
              {pct}% · {formatNumber(bar.achieved)}/{formatNumber(bar.target)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
