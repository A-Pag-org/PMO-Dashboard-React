// FILE: components/ui/InitiativeCard.tsx
// PURPOSE: Summary-page initiative tile (spec §3 + Interim Refinement 1).
//
// Tile chart variant comes from the initiative's summaryCard.variant:
//   donut         — single progress bar (Road Repair, SCC, ICCC, Green Contribution, Greening)
//   two-donuts    — two stacked progress bars (Naya Safar, CEMS/APCD)
//   three-donuts  — three stacked progress bars (MRS by population band)
//   dual-bar      — DEPRECATED concentric rings (kept for back-compat only)
//
// Refinement 1 (Interim Dashboard Improvements) — the Summary page now
// uses horizontal progress bars instead of donuts for improved
// readability and consistency with the Detailed View. The variant names
// are preserved so the per-initiative config / mock data shape remain
// unchanged; only the rendering switched from rings to bars.
//
// All tiles render at full colour. (The earlier per-user "highlighted
// set" greying behaviour from spec §3.1 was dropped during the interim
// refinements review — every initiative is equally prominent now.)
//
// Clicking the tile navigates to the Detailed View, pre-filtered for
// that initiative via the `?p=<initiative-name>` query param read by
// useDetailFilters.

import { Hand } from 'lucide-react';
import { Link } from 'react-router-dom';
import DualDonutProgress from './DualDonutProgress';
import SummaryProgressRow from './SummaryProgressRow';
import { cn } from '@/lib/utils';
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
  className?: string;
}

/**
 * Derive the summary-card config for a specific geography.
 * For now we only adjust donut/two-donuts/three-donuts variants by
 * scaling each value by the state's share of the NCR total.
 * Dual-bar (legacy) keeps its previous behaviour.
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

  const ncrTotal = summary.table.reduce((sum, r) => sum + r.achieved, 0);
  const share = ncrTotal > 0 ? row.achieved / ncrTotal : 0;
  const scale = (bar: SummaryCardBar): SummaryCardBar => ({
    ...bar,
    achieved: Math.round(bar.achieved * share * summary.table.length),
  });

  if (base.variant === 'donut' && base.donut) {
    const pct = Math.max(0, Math.min(100, row.completion));
    return {
      ...base,
      donut: { ...base.donut, target: 100, achieved: pct },
    };
  }
  if (base.variant === 'two-donuts' && base.bars) {
    return { ...base, bars: [scale(base.bars[0]), scale(base.bars[1])] };
  }
  if (base.variant === 'three-donuts' && base.trio) {
    return {
      ...base,
      trio: [scale(base.trio[0]), scale(base.trio[1]), scale(base.trio[2])],
    };
  }
  if (base.variant === 'dual-bar' && base.bars) {
    return { ...base, bars: [scale(base.bars[0]), scale(base.bars[1])] };
  }
  return base;
}

export default function InitiativeCard({
  initiative,
  selectedState = null,
  className,
}: InitiativeCardProps) {
  const cfg = deriveCardConfig(initiative, selectedState);
  const geographyLabel = selectedState ?? 'All Delhi-NCR';

  // Carry the initiative name forward as a query param so DetailPage
  // can pre-select it via useDetailFilters (?initiative=…).
  const detailHref = `/dashboard/detail?initiative=${encodeURIComponent(initiative.name)}`;

  return (
    <Link
      to={detailHref}
      aria-label={`${initiative.name} – open detailed view for ${geographyLabel}`}
      className={cn(
        'group relative flex h-full flex-col rounded-md border-2 border-[var(--color-border-blue)] bg-white p-3 text-left transition-all',
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

      <p className="mt-1 text-2xs leading-tight text-[var(--color-text-primary)]">
        {cfg?.description ?? initiative.primaryMetric}
      </p>

      <div className="mt-3 flex flex-1 flex-col justify-center gap-2.5">
        <CardChart cfg={cfg} fallback={<FallbackFromMetrics initiative={initiative} />} />
      </div>

      <div className="absolute bottom-2 right-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-blue-pale)] text-[var(--color-blue-link)] transition-colors group-hover:bg-[var(--color-blue-link)] group-hover:text-white">
          <Hand className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function CardChart({
  cfg,
  fallback,
}: {
  cfg: SummaryCardConfig | undefined;
  fallback: React.ReactNode;
}) {
  if (!cfg) return <>{fallback}</>;

  if (cfg.variant === 'donut' && cfg.donut) {
    return (
      <SummaryProgressRow
        label={cfg.donut.label ?? 'PROGRESS'}
        achieved={cfg.donut.achieved}
        target={cfg.donut.target}
        size="md"
      />
    );
  }
  if (cfg.variant === 'two-donuts' && cfg.bars) {
    return (
      <>
        {cfg.bars.map((bar) => (
          <SummaryProgressRow
            key={bar.label}
            label={bar.label}
            achieved={bar.achieved}
            target={bar.target}
            size="sm"
          />
        ))}
      </>
    );
  }
  if (cfg.variant === 'three-donuts' && cfg.trio) {
    return (
      <>
        {cfg.trio.map((bar) => (
          <SummaryProgressRow
            key={bar.label}
            label={bar.label}
            achieved={bar.achieved}
            target={bar.target}
            size="sm"
          />
        ))}
      </>
    );
  }
  if (cfg.variant === 'dual-bar' && cfg.bars) {
    return <DualDonutProgress bars={cfg.bars} size={104} thickness={9} gap={3} />;
  }
  return <>{fallback}</>;
}

function FallbackFromMetrics({ initiative }: { initiative: Initiative }) {
  const primary = initiative.metrics[0];
  if (!primary) return null;
  return (
    <SummaryProgressRow
      label={primary.name ?? 'PROGRESS'}
      achieved={primary.achieved ?? 0}
      target={primary.target ?? 0}
      size="md"
    />
  );
}
