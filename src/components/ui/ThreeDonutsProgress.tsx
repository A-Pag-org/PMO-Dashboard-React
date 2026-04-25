// FILE: components/ui/ThreeDonutsProgress.tsx
// PURPOSE: Three side-by-side small donut progress indicators.
// DESIGN REF: Spec §3.2 — MRS (>15m / 10–15m / <10m).

import DonutProgress from './DonutProgress';
import { formatNumber, getCompletionPercentage } from '@/lib/utils';
import type { SummaryCardBar } from '@/lib/types';

interface ThreeDonutsProgressProps {
  trio: [SummaryCardBar, SummaryCardBar, SummaryCardBar];
  donutSize?: number;
  thickness?: number;
}

export default function ThreeDonutsProgress({
  trio,
  donutSize = 60,
  thickness = 7,
}: ThreeDonutsProgressProps) {
  return (
    <div className="flex w-full items-start justify-center gap-2">
      {trio.map((bar) => {
        const pct = getCompletionPercentage(bar.target, bar.achieved);
        return (
          <div key={bar.label} className="flex flex-col items-center">
            <DonutProgress value={pct} size={donutSize} thickness={thickness} />
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              {bar.label}
            </p>
            <p className="text-[9px] font-semibold tabular-nums text-[var(--color-text-primary)]">
              {formatNumber(bar.achieved)}/{formatNumber(bar.target)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
