// FILE: components/ui/SummaryProgressRow.tsx
// PURPOSE: Summary-card progress row — short label + value on the left,
//          16px coloured progress bar with the % rendered to the right of
//          the filled segment, and the achieved/target shown at the far
//          right of the row.
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

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <span className="w-10 shrink-0 text-[10px] font-medium uppercase tracking-wide text-[#44444F]">
          {label}
        </span>
        <div
          className="relative h-4 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: remainder }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}% complete`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pct}%`, backgroundColor: filled }}
          />
          <span
            className="absolute top-1/2 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-[#111827]"
            style={{
              // Place the label just after the filled section, with a sensible
              // clamp so it stays inside the bar even at low/high percentages.
              left: `calc(${Math.min(Math.max(pct, 0), 90)}% + 4px)`,
            }}
          >
            {pct}%
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-[#44444F]">
          {formatNumber(achieved)} / {formatNumber(target)}
        </span>
      </div>
    </div>
  );
}
