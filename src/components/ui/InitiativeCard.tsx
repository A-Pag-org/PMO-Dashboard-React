// FILE: components/ui/InitiativeCard.tsx
// PURPOSE: Summary-page initiative card — always a circular (donut) chart for
//          visual coherence. Single-ring when the card has one headline
//          metric (e.g. Road Repair, C&D-SCC); dual concentric rings when it
//          has two sub-metrics (e.g. Naya Safar — Trucks + Buses).
//
// The card reacts to the Summary-page state filter: both the donut values
// and the subtitle text recompute when the user changes geography.

import { Hand } from 'lucide-react';
import { Link } from 'react-router-dom';
import DonutProgress from './DonutProgress';
import DualDonutProgress from './DualDonutProgress';
import { cn, formatNumber, getCompletionPercentage } from '@/lib/utils';
import { MOCK_SUMMARY_BY_INITIATIVE } from '@/lib/constants';
import type { Initiative, SummaryCardBar, SummaryCardConfig } from '@/lib/types';

interface InitiativeCardProps {
  initiative: Initiative;
  /**
   * Geography the card should present. `null` → All of Delhi-NCR
   * (the default NCR-wide aggregate). Any other value is treated as a
   * state name and looked up against the per-state mock summary table.
   */
  selectedState?: string | null;
  /** Optional drill-down target; defaults to /dashboard/detail. */
  href?: string;
  className?: string;
}

/**
 * Derive the summary-card config for a specific geography.
 *
 * Donut cards: take the state's achieved/target directly from the
 * per-state summary table.
 *
 * Dual-bar cards: scale each sub-metric proportionally by the ratio of
 * the state's total achieved vs. the NCR total. This keeps the two
 * sub-metric breakdowns visible while honouring the state filter.
 *
 * When `selectedState` is null or the state is not in the table, we fall
 * back to the NCR-wide config baked into the initiative.
 */
function deriveCardConfig(
  initiative: Initiative,
  selectedState: string | null | undefined,
): SummaryCardConfig | undefined {
  const base = initiative.summaryCard;
  if (!base || !selectedState) return base;

  const summary = MOCK_SUMMARY_BY_INITIATIVE[initiative.slug];
  if (!summary) return base;

  const row = summary.table.find((r) => r.state === selectedState);
  if (!row) return base;

  if (base.variant === 'donut' && base.donut) {
    // Express the state completion % on the same 0-100 target scale the
    // NCR card uses, so visual parity is preserved across states.
    const pct = Math.max(0, Math.min(100, row.completion));
    return {
      ...base,
      donut: {
        ...base.donut,
        target: 100,
        achieved: pct,
      },
    };
  }

  if (base.variant === 'dual-bar' && base.bars) {
    const ncrTotal = summary.table.reduce((sum, r) => sum + r.achieved, 0);
    const share = ncrTotal > 0 ? row.achieved / ncrTotal : 0;
    const scale = (bar: SummaryCardBar): SummaryCardBar => ({
      ...bar,
      achieved: Math.round(bar.achieved * share * summary.table.length),
    });
    return {
      ...base,
      bars: [scale(base.bars[0]), scale(base.bars[1])],
    };
  }

  return base;
}

export default function InitiativeCard({
  initiative,
  selectedState = null,
  href = '/dashboard/detail',
  className,
}: InitiativeCardProps) {
  const cfg = deriveCardConfig(initiative, selectedState);
  const geographyLabel = selectedState ?? 'All Delhi-NCR';

  return (
    <Link
      to={href}
      aria-label={`${initiative.name} – open detailed view for ${geographyLabel}`}
      className={cn(
        'group relative flex h-full flex-col rounded-md border-2 border-[var(--color-border-blue)] bg-white p-3 text-left transition-shadow',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold leading-tight text-[var(--color-blue-link)]">
          {initiative.name}
        </h3>
        <span className="shrink-0 rounded-full bg-[var(--color-blue-pale)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-blue-link)]">
          {geographyLabel}
        </span>
      </div>

      {cfg?.description ? (
        <p className="mt-1 text-2xs leading-tight text-[var(--color-text-primary)]">
          {cfg.description}
        </p>
      ) : (
        <p className="mt-1 text-2xs leading-tight text-[var(--color-text-primary)]">
          {initiative.primaryMetric}
        </p>
      )}

      <div className="mt-2 flex flex-1 items-center justify-center">
        {cfg?.variant === 'dual-bar' && cfg.bars ? (
          <DualDonutProgress bars={cfg.bars} size={104} thickness={9} gap={3} />
        ) : cfg?.variant === 'donut' && cfg.donut ? (
          <div className="flex flex-col items-center">
            <DonutProgress
              value={getCompletionPercentage(cfg.donut.target, cfg.donut.achieved)}
              size={96}
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
      <DonutProgress value={pct} size={96} thickness={12} />
      <p className="mt-0.5 text-2xs font-semibold text-[var(--color-text-primary)]">
        {formatNumber(primary.achieved)}/{formatNumber(primary.target)}
      </p>
    </div>
  );
}
