// FILE: components/ui/SummaryDualBar.tsx
// PURPOSE: Two-bar layout used inside summary tiles where an initiative
//          tracks two parallel metrics (e.g. Trucks + Buses). Lays out the
//          label, big achieved number, target denominator, prominent
//          percentage badge and a colored progress bar — sized so the
//          numbers and % catch the eye and the white space stays even.

import { formatNumber, getBarColour, getCompletionPercentage } from '@/lib/utils';
import type { SummaryCardBar } from '@/lib/types';

interface SummaryDualBarProps {
  bars: [SummaryCardBar, SummaryCardBar];
}

export default function SummaryDualBar({ bars }: SummaryDualBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {bars.map((bar) => (
        <DualBarRow key={bar.label} bar={bar} />
      ))}
    </div>
  );
}

function DualBarRow({ bar }: { bar: SummaryCardBar }) {
  const pct = getCompletionPercentage(bar.target, bar.achieved);
  const { filled, remainder } = getBarColour(pct);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
            {bar.label}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-lg font-bold leading-none tabular-nums text-[#111827]">
            {formatNumber(bar.achieved)}
            <span className="ml-1 text-[11px] font-medium text-[#6B7280]">
              / {formatNumber(bar.target)}
            </span>
          </p>
        </div>
        <span
          className="shrink-0 rounded-md px-2 py-1 text-sm font-bold leading-none tabular-nums"
          style={{ backgroundColor: remainder, color: filled }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: remainder }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${bar.label}: ${pct}% complete`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: filled }}
        />
      </div>
    </div>
  );
}
