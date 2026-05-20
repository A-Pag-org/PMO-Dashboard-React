// FILE: components/ui/SummaryProgressRow.tsx
// PURPOSE: Summary-card progress row — fixed-width label · flexible bar
//          with % centered inside · fixed-width achieved/target at end.

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

  const hasTarget = target > 0;

  return (
    <div className="flex items-center gap-3">
      <span
        title={label}
        className="w-12 shrink-0 truncate text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]"
      >
        {label}
      </span>

      <div className="relative h-4 flex-1 overflow-hidden rounded-full">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: remainder }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}% complete`}
        />
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, backgroundColor: filled }}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums text-[#111827] bg-white/75">
            {pct}%
          </span>
        </span>
      </div>

      <span className="w-24 shrink-0 whitespace-nowrap text-right text-[10px] font-semibold tabular-nums text-[#1F2937]">
        {hasTarget
          ? `${formatNumber(achieved)} / ${formatNumber(target)}`
          : formatNumber(achieved)}
      </span>
    </div>
  );
}
