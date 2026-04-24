// FILE: components/ui/GeographyCard.tsx
// PURPOSE: Summary-page card for the "Programme-wise" mode — one card per
//          state, showing the selected programme's completion for that
//          state. Mirrors InitiativeCard's visual vocabulary so the two
//          modes feel like siblings, not separate screens.

import { Hand } from 'lucide-react';
import { Link } from 'react-router-dom';
import DonutProgress from './DonutProgress';
import { cn, formatNumber } from '@/lib/utils';
import type { Initiative, SummaryTableRow } from '@/lib/types';

interface GeographyCardProps {
  initiative: Initiative;
  row: SummaryTableRow;
  onTrack?: boolean;
  className?: string;
}

export default function GeographyCard({
  initiative,
  row,
  onTrack,
  className,
}: GeographyCardProps) {
  const pct = Math.max(0, Math.min(100, row.completion));

  const params = new URLSearchParams({
    state: row.state,
    initiative: initiative.name,
  });
  const href = `/dashboard/detail?${params.toString()}`;

  return (
    <Link
      to={href}
      aria-label={`${row.state} — ${initiative.name}: ${pct}% complete. Open detailed view.`}
      className={cn(
        'group relative flex h-full flex-col rounded-md border-2 border-[var(--color-border-blue)] bg-white p-3 text-left transition-shadow',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold leading-tight text-[var(--color-blue-link)]">
          {row.state}
        </h3>
        {typeof onTrack === 'boolean' ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
              onTrack
                ? 'bg-[color:var(--color-success-light)] text-[var(--color-success)]'
                : 'bg-[color:var(--color-danger-light)] text-[var(--color-danger)]',
            )}
          >
            {onTrack ? 'On track' : 'Off track'}
          </span>
        ) : null}
      </div>

      <p className="mt-1 line-clamp-2 text-2xs leading-tight text-[var(--color-text-primary)]">
        {initiative.primaryMetric}
      </p>

      <div className="mt-2 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center">
          <DonutProgress value={pct} size={96} thickness={12} />
          <p className="mt-0.5 text-2xs font-semibold text-[var(--color-text-primary)]">
            {formatNumber(row.achieved)}/{formatNumber(row.target)}
          </p>
        </div>
      </div>

      <div className="absolute bottom-2 right-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-blue-pale)] text-[var(--color-blue-link)] transition-colors group-hover:bg-[var(--color-blue-link)] group-hover:text-white">
          <Hand className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
