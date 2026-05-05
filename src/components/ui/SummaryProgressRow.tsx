// FILE: components/ui/SummaryProgressRow.tsx
// PURPOSE: Summary-card metric row — label + value on the top line,
//          full-width progress bar with the % placed at the end of the
//          bar (per Refinement 1 of the interim dashboard improvements).
// DESIGN REF: Spec §3.2 + Refinement 1 (replace donuts with progress bars).

import CompletionBar from './CompletionBar';
import { formatNumber, getCompletionPercentage } from '@/lib/utils';

interface SummaryProgressRowProps {
  label: string;
  achieved: number;
  target: number;
  /**
   * Visual size — `md` (default) is used for single-metric cards;
   * `sm` is used when 2–3 rows are stacked inside one tile.
   */
  size?: 'sm' | 'md';
}

export default function SummaryProgressRow({
  label,
  achieved,
  target,
  size = 'md',
}: SummaryProgressRowProps) {
  const pct = getCompletionPercentage(target, achieved);
  const labelClass =
    size === 'sm'
      ? 'text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]'
      : 'text-2xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]';
  const valueClass =
    size === 'sm'
      ? 'text-[10px] font-semibold tabular-nums text-[var(--color-text-primary)]'
      : 'text-2xs font-semibold tabular-nums text-[var(--color-text-primary)]';
  const pctClass =
    size === 'sm'
      ? 'text-[10px] font-bold tabular-nums text-[var(--color-text-primary)]'
      : 'text-xs font-bold tabular-nums text-[var(--color-text-primary)]';

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2">
        <span className={labelClass}>{label}</span>
        <span className={valueClass}>
          {formatNumber(achieved)} / {formatNumber(target)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1">
          <CompletionBar value={pct} size={size} />
        </div>
        <span className={pctClass}>{pct}%</span>
      </div>
    </div>
  );
}
