// FILE: components/ui/SummaryDualBar.tsx
// PURPOSE: Two-bar wrapper for summary tiles that track two parallel
//          metrics. Renders two SummaryProgressRow bars with even spacing.

import SummaryProgressRow from './SummaryProgressRow';
import type { SummaryCardBar } from '@/lib/types';

interface SummaryDualBarProps {
  bars: [SummaryCardBar, SummaryCardBar];
}

export default function SummaryDualBar({ bars }: SummaryDualBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {bars.map((bar) => (
        <SummaryProgressRow
          key={bar.label}
          label={bar.label}
          achieved={bar.achieved}
          target={bar.target}
        />
      ))}
    </div>
  );
}
