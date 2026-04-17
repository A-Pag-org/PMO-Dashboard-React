// FILE: components/ui/InitiativeCard.tsx
// PURPOSE: KPI card for summary page left panel — compact design to fit viewport
// DESIGN REF: Wireframe pages 7–8 (8 initiative cards in 2×4 grid)


import { Info } from 'lucide-react';
import CompletionBar from './CompletionBar';
import { cn, formatNumber, getCompletionPercentage } from '@/lib/utils';
import type { Initiative } from '@/lib/types';

interface InitiativeCardProps {
  initiative: Initiative;
  selected?: boolean;
  onClick?: () => void;
}

export default function InitiativeCard({
  initiative,
  selected = false,
  onClick,
}: InitiativeCardProps) {
  const primary = initiative.metrics[0];
  const pct = primary
    ? getCompletionPercentage(primary.target, primary.achieved)
    : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex h-full w-full flex-col justify-between rounded-md border px-3 py-2 text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        selected
          ? 'border-[var(--color-border-blue)] bg-white shadow-md'
          : 'border-[var(--color-border)] bg-[var(--color-surface-light)] hover:bg-white hover:shadow-sm',
      )}
    >
      <h3 className="text-xs font-semibold leading-tight text-[var(--color-blue-link)]">
        {initiative.name}
      </h3>

      <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
        {primary
          ? `${formatNumber(primary.achieved)}/${formatNumber(primary.target)} (${pct}%)`
          : '—'}
      </p>

      <div className="mt-1">
        <CompletionBar value={pct} size="sm" />
      </div>

      <p className="mt-1 text-2xs leading-tight text-[var(--color-text-secondary)]" style={{ fontSize: '10px', lineHeight: '14px' }}>
        {initiative.primaryMetric}
      </p>

      <div className="absolute bottom-2 right-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-blue-pale)] text-[var(--color-blue-link)] transition-colors group-hover:bg-[var(--color-blue-link)] group-hover:text-white">
          <Info className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}
