// FILE: components/ui/CompletionThresholdsLegend.tsx
// PURPOSE: Inline legend showing the traffic-light thresholds used by all
//          progress bars / donuts on the dashboard.
// DESIGN REF: Refinement 1 (Interim Dashboard Improvements) — "Add legend
//             for completion thresholds" callout on the Summary page.

import { getBandColors } from '@/lib/utils';

const ITEMS: Array<{ band: 'RED' | 'YELLOW' | 'GREEN'; label: string }> = [
  { band: 'RED', label: 'Red < 30%' },
  { band: 'YELLOW', label: 'Yellow 30–60%' },
  { band: 'GREEN', label: 'Green ≥ 60%' },
];

interface CompletionThresholdsLegendProps {
  className?: string;
}

export default function CompletionThresholdsLegend({
  className,
}: CompletionThresholdsLegendProps) {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-[var(--color-border-table)] bg-white px-3 py-1.5 text-2xs text-[var(--color-text-secondary)] shadow-sm ${className ?? ''}`}
      role="note"
      aria-label="Completion threshold legend"
    >
      <span className="font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
        Completion thresholds
      </span>
      {ITEMS.map(({ band, label }) => {
        const { fg } = getBandColors(band);
        return (
          <span key={band} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: fg }}
            />
            <span className="font-medium text-[var(--color-text-primary)]">
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
