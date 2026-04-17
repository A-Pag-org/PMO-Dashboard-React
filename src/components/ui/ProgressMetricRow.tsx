// FILE: components/ui/ProgressMetricRow.tsx
// PURPOSE: Progress metric list item — icon, label, value, progress bar, drill-down icon
// DESIGN REF: Wireframe page 9 (right column — Progress metrics section)

import { Info } from 'lucide-react';
import CompletionBar from './CompletionBar';
import { formatNumber, getCompletionPercentage } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ProgressMetricRowProps {
  icon: LucideIcon;
  label: string;
  achieved: number | null;
  target: number | null;
  selected?: boolean;
  onSelect?: () => void;
}

export default function ProgressMetricRow({
  icon: Icon,
  label,
  achieved,
  target,
  selected = false,
  onSelect,
}: ProgressMetricRowProps) {
  const pct = getCompletionPercentage(target, achieved);
  const isInteractive = Boolean(onSelect);

  const content = (
    <div className="flex items-center gap-3 rounded-md border border-[var(--color-divider-dashed)] bg-white px-3 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-blue-pale)]">
        <Icon className="h-3.5 w-3.5 text-[var(--color-blue-link)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[var(--color-text-secondary)]">
          {label}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1">
            <CompletionBar value={pct} size="sm" />
          </div>
          <span className="shrink-0 text-xs font-semibold text-[var(--color-text-primary)]">
            {formatNumber(achieved)}/{formatNumber(target)}
          </span>
        </div>
      </div>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-blue-pale)] text-[var(--color-blue-link)]">
        <Info className="h-3 w-3" />
      </span>
    </div>
  );

  if (!isInteractive) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="w-full rounded-md text-left transition-colors hover:bg-[var(--color-blue-pale)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
    >
      <div
        className={
          selected
            ? 'rounded-md ring-1 ring-[var(--color-border-blue)]'
            : undefined
        }
      >
        {content}
      </div>
    </button>
  );
}
