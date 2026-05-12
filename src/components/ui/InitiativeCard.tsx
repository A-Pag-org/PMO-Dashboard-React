// FILE: components/ui/InitiativeCard.tsx
// PURPOSE: Summary-page initiative tile.
// DESIGN REF: Figma "Air-Pollution / Final for review" (Frame 45-12763).
//
// Spacing inside the card is intentionally explicit and uniform:
//   24px padding · 20px between title→bars · 12px between stacked bars
//   · 20px between bars→description · footer pinned to bottom with mt-auto.

import { TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import DualDonutProgress from './DualDonutProgress';
import SummaryProgressRow from './SummaryProgressRow';
import { cn } from '@/lib/utils';
import { MOCK_SUMMARY_BY_INITIATIVE } from '@/lib/constants';
import type { Initiative, SummaryCardBar, SummaryCardConfig } from '@/lib/types';

interface InitiativeCardProps {
  initiative: Initiative;
  selectedState?: string | null;
  className?: string;
}

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

  const detailHref = `/dashboard/detail?initiative=${encodeURIComponent(initiative.name)}`;

  return (
    <Link
      to={detailHref}
      aria-label={`${initiative.name} – open detailed view for ${geographyLabel}`}
      className={cn(
        'group relative flex h-full min-h-[240px] flex-col rounded-xl border border-[#E2E2EA] bg-white p-6 text-left transition-shadow',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
        className,
      )}
    >
      <h3 className="text-sm font-semibold leading-tight text-[#44444F]">
        {initiative.name}
      </h3>

      <div className="mt-5 flex flex-col gap-3">
        <CardChart cfg={cfg} fallback={<FallbackFromMetrics initiative={initiative} />} />
      </div>

      <p className="mt-5 line-clamp-2 text-xs leading-snug text-[#92929D]">
        {cfg?.description ?? initiative.primaryMetric}
      </p>

      <div className="mt-auto flex items-center justify-between pt-4">
        <span
          aria-hidden
          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DBEAFE] text-[#0062FF]"
        >
          <TrendingUp className="h-3 w-3" />
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#155DFC] group-hover:underline">
          See Projection
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
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
    />
  );
}
