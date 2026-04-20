// FILE: components/ui/InitiativeCard.tsx
// PURPOSE: Summary-page initiative card with donut or dual-bar variant
// DESIGN REF: Wireframe page 7 of Impact_Dashboard_Structure_16_Apr.pdf

import { Hand } from 'lucide-react';
import { Link } from 'react-router-dom';
import DonutProgress from './DonutProgress';
import { cn, formatNumber, getBarColour, getCompletionPercentage } from '@/lib/utils';
import type { Initiative, SummaryCardBar } from '@/lib/types';

interface InitiativeCardProps {
  initiative: Initiative;
  /** Optional drill-down target; defaults to /dashboard/detail. */
  href?: string;
  className?: string;
}

/**
 * Inline mini progress bar used inside dual-bar summary cards.
 * Renders the percentage label on top of the filled portion, matching
 * the wireframe where the label sits inside the bar.
 */
function MiniBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const { filled, remainder } = getBarColour(clamped);
  return (
    <div
      className="relative h-4 w-full overflow-hidden rounded-sm"
      style={{ backgroundColor: remainder }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-sm"
        style={{ width: `${clamped}%`, backgroundColor: filled }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
        style={{ color: clamped >= 35 ? '#0B2540' : '#111827' }}
      >
        {clamped}%
      </span>
    </div>
  );
}

function DualBarRow({ bar }: { bar: SummaryCardBar }) {
  const pct = getCompletionPercentage(bar.target, bar.achieved);
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
      <span className="text-2xs font-semibold text-[var(--color-text-primary)]">
        {bar.label}
      </span>
      <MiniBar pct={pct} />
      <span className="text-2xs font-semibold text-[var(--color-text-primary)]">
        {formatNumber(bar.achieved)}/{formatNumber(bar.target)}
      </span>
    </div>
  );
}

export default function InitiativeCard({
  initiative,
  href = '/dashboard/detail',
  className,
}: InitiativeCardProps) {
  const cfg = initiative.summaryCard;

  return (
    <Link
      to={href}
      aria-label={`${initiative.name} – open detailed view`}
      className={cn(
        'group relative flex h-full flex-col rounded-md border-2 border-[var(--color-border-blue)] bg-white p-3 text-left transition-shadow',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        className,
      )}
    >
      <h3 className="text-sm font-bold leading-tight text-[var(--color-blue-link)]">
        {initiative.name}
      </h3>
      {cfg?.description ? (
        <p className="mt-1 text-2xs leading-tight text-[var(--color-text-primary)]">
          {cfg.description}
        </p>
      ) : (
        <p className="mt-1 text-2xs leading-tight text-[var(--color-text-primary)]">
          {initiative.primaryMetric}
        </p>
      )}

      <div className="mt-3 flex flex-1 items-center justify-center">
        {cfg?.variant === 'dual-bar' && cfg.bars ? (
          <div className="flex w-full flex-col gap-2">
            <DualBarRow bar={cfg.bars[0]} />
            <DualBarRow bar={cfg.bars[1]} />
          </div>
        ) : cfg?.variant === 'donut' && cfg.donut ? (
          <div className="flex flex-col items-center">
            <DonutProgress
              value={getCompletionPercentage(cfg.donut.target, cfg.donut.achieved)}
              size={92}
              thickness={12}
            />
            <p className="mt-0.5 text-2xs font-semibold text-[var(--color-text-primary)]">
              {formatNumber(cfg.donut.achieved)}/{formatNumber(cfg.donut.target)}
            </p>
          </div>
        ) : (
          <FallbackFromMetrics initiative={initiative} />
        )}
      </div>

      <div className="absolute bottom-2 right-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-blue-pale)] text-[var(--color-blue-link)] transition-colors group-hover:bg-[var(--color-blue-link)] group-hover:text-white">
          <Hand className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function FallbackFromMetrics({ initiative }: { initiative: Initiative }) {
  const primary = initiative.metrics[0];
  if (!primary) return null;
  const pct = getCompletionPercentage(primary.target, primary.achieved);
  return (
    <div className="flex flex-col items-center">
      <DonutProgress value={pct} size={92} thickness={12} />
      <p className="mt-0.5 text-2xs font-semibold text-[var(--color-text-primary)]">
        {formatNumber(primary.achieved)}/{formatNumber(primary.target)}
      </p>
    </div>
  );
}
