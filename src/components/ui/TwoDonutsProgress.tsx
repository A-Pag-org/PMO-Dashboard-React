// FILE: components/ui/TwoDonutsProgress.tsx
// PURPOSE: Side-by-side pair of small donut progress indicators.
// DESIGN REF: Spec §3.2 — Naya Safar (Trucks + Buses), CEMS/APCD (CEMS + APCD).

import DonutProgress from './DonutProgress';
import { formatNumber, getCompletionPercentage } from '@/lib/utils';
import type { SummaryCardBar } from '@/lib/types';

interface TwoDonutsProgressProps {
  bars: [SummaryCardBar, SummaryCardBar];
  donutSize?: number;
  thickness?: number;
}

export default function TwoDonutsProgress({
  bars,
  donutSize = 76,
  thickness = 9,
}: TwoDonutsProgressProps) {
  return (
    <div className="flex w-full items-start justify-center gap-4">
      {bars.map((bar) => {
        const pct = getCompletionPercentage(bar.target, bar.achieved);
        return (
          <div key={bar.label} className="flex flex-col items-center">
            <DonutProgress value={pct} size={donutSize} thickness={thickness} />
            <p className="mt-1 text-2xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              {bar.label}
            </p>
            <p className="text-2xs font-semibold tabular-nums text-[var(--color-text-primary)]">
              {formatNumber(bar.achieved)} / {formatNumber(bar.target)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
