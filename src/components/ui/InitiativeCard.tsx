// FILE: components/ui/InitiativeCard.tsx
// PURPOSE: Summary-page initiative tile.
//
// Layout (top → bottom):
//   - Title
//   - Chart block (min-h reserved + justify-center → 1-bar and 2-bar
//     tiles carry the same visual weight)
//   - Description (sits below the bars; min-h reserved so the footer
//     lines up across tiles whether the description is 1 or 2 lines)
//   - Footer pinned to bottom with mt-auto
//
// Spacing rhythm: p-6 outer · mt-5 title→chart · gap-2.5 between
// stacked bars · mt-3 chart→description (tight, so the description
// reads as a caption to the bars) · mt-auto + pt-4 to footer.

import { TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import DualDonutProgress from './DualDonutProgress';
import SummaryProgressRow from './SummaryProgressRow';
import { cn, getBandColors, getColorBand, getCompletionPercentage } from '@/lib/utils';
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

function cardHoverColors(initiative: Initiative): { bg: string; border: string } {
  const primary =
    initiative.metrics.find((m) => m.name === initiative.primaryMetric) ??
    initiative.metrics[0];
  if (!primary) return { bg: '#F3F4F6', border: '#9CA3AF' };
  if (primary.format === 'Y/N') {
    const c = getBandColors(primary.achieved === 1 ? 'GREEN' : 'RED');
    return { bg: c.bg, border: c.fg };
  }
  if (primary.format === 'X/Y') {
    const band = getColorBand(
      getCompletionPercentage(primary.target, primary.achieved),
      primary.isInverse,
    );
    const c = getBandColors(band);
    return { bg: c.bg, border: c.fg };
  }
  return { bg: '#F3F4F6', border: '#9CA3AF' };
}

export default function InitiativeCard({
  initiative,
  selectedState = null,
  className,
}: InitiativeCardProps) {
  const cfg = deriveCardConfig(initiative, selectedState);
  const geographyLabel = selectedState ?? 'All Delhi-NCR';
  const hover = cardHoverColors(initiative);

  const detailHref = `/dashboard/detail?initiative=${encodeURIComponent(initiative.name)}`;

  return (
    <Link
      to={detailHref}
      aria-label={`${initiative.name} – open detailed view for ${geographyLabel}`}
      style={
        {
          '--tile-hover-bg': hover.bg,
          '--tile-hover-border': hover.border,
        } as React.CSSProperties
      }
      className={cn(
        'group relative flex h-full min-h-[260px] flex-col rounded-xl border border-[#E2E2EA] bg-white p-6 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-all duration-150',
        'hover:border-[var(--tile-hover-border)] hover:bg-[var(--tile-hover-bg)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
        className,
      )}
    >
      <h3 className="text-base font-bold leading-tight text-[#1F2937]">
        {initiative.name}
      </h3>

      <div className="mt-5 flex min-h-[5rem] flex-col justify-center gap-2.5">
        <CardChart cfg={cfg} fallback={<FallbackFromMetrics initiative={initiative} />} />
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2rem] text-xs leading-snug text-[#6B7280]">
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
