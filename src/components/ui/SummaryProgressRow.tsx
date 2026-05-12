// FILE: components/ui/SummaryProgressRow.tsx
// PURPOSE: Summary-card progress row — fixed-width label · flexible bar
//          with inline % · fixed-width compact achieved/target.
// DESIGN REF: Figma "Air-Pollution / Final for review" (Frame 45-12763).

import { formatCompact, getBarColour, getCompletionPercentage } from '@/lib/utils';

interface SummaryProgressRowProps {
  label: string;
  achieved: number;
  target: number;
  /**
   * "md" gives a taller bar and slightly larger value text — used when a
   * card has only one progress bar so the bar carries enough visual
   * weight to fill the tile. "sm" is the compact stacked variant used
   * inside 2- and 3-bar cards.
   */
  size?: 'sm' | 'md';
}

export default function SummaryProgressRow({
  label,
  achieved,
  target,
  size = 'sm',
}: SummaryProgressRowProps) {
  const pct = getCompletionPercentage(target, achieved);
  const { filled, remainder } = getBarColour(pct);

  // Clamp the inline %-label position so it stays inside the bar even
  // when the fill is near 100% (avoids the label spilling off the right
  // edge of the bar / colliding with the value column to the right).
  const labelLeft = Math.min(Math.max(pct, 0), 75);

  const hasTarget = target > 0;
  const valueText = hasTarget
    ? `(${formatCompact(achieved)} / ${formatCompact(target)})`
    : formatCompact(achieved);

  const barHeight = size === 'md' ? 'h-5' : 'h-4';
  const labelText =
    size === 'md'
      ? 'text-[11px] font-semibold uppercase tracking-wide text-[#44444F]'
      : 'text-[10px] font-semibold uppercase tracking-wide text-[#44444F]';
  const inlinePct =
    size === 'md'
      ? 'text-[11px] font-semibold leading-none text-[#111827]'
      : 'text-[10px] font-semibold leading-none text-[#111827]';
  const valueClass =
    size === 'md'
      ? 'w-24 shrink-0 text-right text-[11px] font-medium tabular-nums text-[#92929D]'
      : 'w-20 shrink-0 text-right text-[10px] font-medium tabular-nums text-[#92929D]';

  return (
    <div className="flex items-center gap-3">
      <span title={label} className={`w-14 shrink-0 truncate ${labelText}`}>
        {label}
      </span>

      <div className={`relative ${barHeight} flex-1`}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: remainder }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}% complete`}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: filled }}
        />
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap ${inlinePct}`}
          style={{ left: `calc(${labelLeft}% + 6px)` }}
        >
          {pct}%
        </span>
      </div>

      <span className={valueClass}>{valueText}</span>
    </div>
  );
}
