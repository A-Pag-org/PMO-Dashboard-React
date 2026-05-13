// FILE: components/ui/SummaryProgressRow.tsx
// PURPOSE: Summary-card progress row — fixed-width label · flexible bar
//          with inline % · fixed-width achieved/target. The three columns
//          live in a flex row with `gap-3` so they cannot overlap.
// DESIGN REF: Figma "Air-Pollution / Final for review" (Frame 45-12763).

import { formatNumber, getBarColour, getCompletionPercentage } from '@/lib/utils';

interface SummaryProgressRowProps {
  label: string;
  achieved: number;
  target: number;
}

export default function SummaryProgressRow({
  label,
  achieved,
  target,
}: SummaryProgressRowProps) {
  const pct = getCompletionPercentage(target, achieved);
  const { filled, remainder } = getBarColour(pct);

  // Clamp the inline %-label horizontal position so it always stays
  // visually inside the bar (label is ~28px wide; clamp at 75% keeps it
  // safely inside even on narrow card widths).
  const labelLeft = Math.min(Math.max(pct, 0), 75);

  const hasTarget = target > 0;

  return (
    <div className="flex items-center gap-3">
      <span
        title={label}
        className="w-12 shrink-0 truncate text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]"
      >
        {label}
      </span>

      <div className="relative h-3 flex-1">
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
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-semibold leading-none text-[#111827]"
          style={{ left: `calc(${labelLeft}% + 6px)` }}
        >
          {pct}%
        </span>
      </div>

      <span className="w-16 shrink-0 text-right text-[10px] font-semibold tabular-nums text-[#1F2937]">
        {hasTarget
          ? `${formatNumber(achieved)} / ${formatNumber(target)}`
          : formatNumber(achieved)}
      </span>
    </div>
  );
}
