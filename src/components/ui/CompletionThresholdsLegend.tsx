// FILE: components/ui/CompletionThresholdsLegend.tsx
// PURPOSE: Inline legend showing the traffic-light thresholds used by all
//          progress bars on the dashboard.
// DESIGN REF: Figma "Air-Pollution / Final for review" — bottom-right
//             footer chip (Frame 69).

import { getBandColors } from '@/lib/utils';

const ITEMS: Array<{ band: 'RED' | 'YELLOW' | 'GREEN'; label: string }> = [
  { band: 'RED', label: '<30%' },
  { band: 'YELLOW', label: '30–60%' },
  { band: 'GREEN', label: '≥60%' },
];

interface CompletionThresholdsLegendProps {
  className?: string;
}

export default function CompletionThresholdsLegend({
  className,
}: CompletionThresholdsLegendProps) {
  return (
    <div
      className={`inline-flex items-center gap-4 text-[11px] font-medium text-[#44444F] ${className ?? ''}`}
      role="note"
      aria-label="Completion threshold legend"
    >
      {ITEMS.map(({ band, label }) => {
        const { fg } = getBandColors(band);
        return (
          <span key={band} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: fg }}
            />
            {label}
          </span>
        );
      })}
    </div>
  );
}
