// FILE: src/components/ui/MetricTile.tsx
// PURPOSE: Vertical metric card for the Detail page's metrics grid.
//          Replaces the horizontal MetricCard row that lived in the
//          narrow right rail. Each tile carries:
//            · type chip + metric name
//            · format-aware value display (X/Y bar · Xx big number · Y/N pill)
//            · 6-month sparkline (suppressed for Y/N and overall-only)
//            · band + tracking-frequency / lowest-level metadata
//          Clicking selects the metric for the drill drawer.

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import {
  cn,
  formatNumber,
  getBandColors,
  getBarColour,
  getColorBand,
  getCompletionPercentage,
} from '@/lib/utils';
import { synthSeries } from '@/lib/trendSynth';
import type { Metric } from '@/lib/types';

interface MetricTileProps {
  metric: Metric;
  selected?: boolean;
  onSelect?: () => void;
  /** Visual density. Outcome → 'lg', Progress → 'md', Readiness → 'sm'. */
  size?: 'lg' | 'md' | 'sm';
}

export default function MetricTile({
  metric,
  selected = false,
  onSelect,
  size = 'md',
}: MetricTileProps) {
  const isInteractive = Boolean(onSelect);
  const Container = isInteractive ? 'button' : 'div';
  const frequency =
    metric.trackingFrequency ?? (metric.format === 'Y/N' ? 'overall' : 'monthly');
  const isCentral = metric.geographyLevel === 'central';
  const showSparkline = metric.format !== 'Y/N' && frequency !== 'overall';

  return (
    <Container
      type={isInteractive ? 'button' : undefined}
      onClick={onSelect}
      aria-pressed={isInteractive ? selected : undefined}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-white text-left transition-colors',
        size === 'lg' ? 'p-3.5' : size === 'sm' ? 'p-2.5' : 'p-3',
        selected
          ? 'border-[var(--color-blue-link)] ring-1 ring-[var(--color-blue-link)] bg-[var(--color-blue-pale)]/40'
          : metric.type === 'outcome'
          ? 'border-[var(--color-border-table)] hover:border-[var(--color-accent)]'
          : 'border-[var(--color-border-table)] hover:border-[var(--color-blue-link)]',
        isInteractive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-1',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'flex-1 font-bold leading-snug text-[var(--color-text-primary)]',
            size === 'lg' ? 'text-[15px]' : size === 'sm' ? 'text-[13px]' : 'text-[14px]',
          )}
          title={metric.name}
        >
          {metric.name}
        </p>
        {metric.isInverse ? (
          <span
            className="shrink-0 rounded bg-[var(--color-tl-red-bg)] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[var(--color-tl-red-text)]"
            title="For this metric, lower values are better (e.g. fewer violations)."
          >
            Lower is better
          </span>
        ) : null}
      </header>

      <div className={size === 'sm' ? 'mt-1.5' : 'mt-2.5'}>
        <Value metric={metric} size={size} />
      </div>

      {showSparkline ? (
        <Sparkline metric={metric} size={size} />
      ) : null}

      <Footer metric={metric} frequency={frequency} isCentral={isCentral} />
    </Container>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function Value({ metric, size }: { metric: Metric; size: 'lg' | 'md' | 'sm' }) {
  if (metric.format === 'Y/N') {
    const isYes = metric.achieved === 1;
    const colors = getBandColors(isYes ? 'GREEN' : 'RED');
    return (
      <div
        className="flex h-7 w-full items-center justify-center rounded-sm text-[11px] font-bold uppercase tracking-wide"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {isYes ? 'Yes' : 'No'}
      </div>
    );
  }

  if (metric.format === 'Xx') {
    const delta =
      metric.previousAchieved != null && metric.achieved != null
        ? metric.achieved - metric.previousAchieved
        : null;
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            'font-bold leading-none tabular-nums text-[var(--color-text-primary)]',
            size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl',
          )}
        >
          {metric.achieved == null ? '—' : formatNumber(metric.achieved)}
        </span>
        {metric.unit ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {metric.unit}
          </span>
        ) : null}
        {delta != null ? <DeltaChip delta={delta} /> : null}
      </div>
    );
  }

  // X/Y — value line + progress bar.
  const pct = getCompletionPercentage(metric.target, metric.achieved);
  const { filled, remainder } = getBarColour(pct, metric.isInverse);
  const denomTitle = metric.denominatorLabel
    ? `${metric.denominatorLabel}: ${formatNumber(metric.target)}`
    : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'truncate font-bold leading-none tabular-nums text-[var(--color-text-primary)]',
            size === 'lg' ? 'text-base' : size === 'sm' ? 'text-xs' : 'text-sm',
          )}
          title={denomTitle}
        >
          {formatNumber(metric.achieved)} / {formatNumber(metric.target)}
        </span>
        <span
          className={cn(
            'shrink-0 font-bold tabular-nums',
            size === 'lg' ? 'text-sm' : 'text-xs',
          )}
          style={{ color: getBandColors(getColorBand(pct, metric.isInverse)).text }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-sm"
        style={{ backgroundColor: remainder }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: filled }}
        />
      </div>
    </div>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-text-muted)]">
        <Minus className="h-3 w-3" aria-hidden /> 0
      </span>
    );
  }
  const positive = delta > 0;
  const colors = getBandColors(positive ? 'GREEN' : 'RED');
  const Arrow = positive ? ArrowUp : ArrowDown;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums"
      style={{ backgroundColor: colors.bg, color: colors.text }}
      title="Change vs previous period"
    >
      <Arrow className="h-3 w-3" aria-hidden style={{ color: colors.fg }} />
      {positive ? '+' : '−'}
      {formatNumber(Math.abs(delta))}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function Sparkline({ metric, size }: { metric: Metric; size: 'lg' | 'md' | 'sm' }) {
  const isXY = metric.format === 'X/Y';
  const target = metric.target ?? 0;
  const achieved = metric.achieved ?? 0;

  const targetValue = isXY
    ? target > 0
      ? Math.max(0, Math.min(100, (achieved / target) * 100))
      : 0
    : achieved;
  const max = isXY ? 100 : Math.max(10, targetValue * 1.4);
  const series = synthSeries(`${metric.name}|All NCR`, targetValue, 6, 0, max);

  const W = 200;
  const H = size === 'lg' ? 36 : 28;
  const padX = 2;
  const padY = 3;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const range = hi - lo || 1;

  const points = series.map((v, i) => {
    const x = padX + (i / (series.length - 1)) * innerW;
    const y = padY + (1 - (v - lo) / range) * innerH;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${(padY + innerH).toFixed(1)} ` +
    `L ${points[0][0].toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const band = isXY
    ? getColorBand(targetValue, metric.isInverse)
    : 'GREEN';
  const colors = getBandColors(band);

  return (
    <div className="mt-2.5 flex items-center gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="flex-1"
        role="img"
        aria-label="6-month trend sparkline"
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill={colors.bg} opacity={0.7} />
        <path
          d={linePath}
          fill="none"
          stroke={colors.fg}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={2}
          fill={colors.fg}
        />
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        6 mo
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function Footer({
  metric,
  frequency,
  isCentral,
}: {
  metric: Metric;
  frequency: 'monthly' | 'overall';
  isCentral: boolean;
}) {
  const lowestLevel = isCentral ? 'No regional split' : metric.lowestLevelLabel;

  // Plain-English meta. "Updated monthly" / "Cumulative only" reads
  // straight; the drill-level part uses "Drills to X" so officials know
  // immediately how deep they can go. The band label is intentionally
  // *not* shown here — the progress bar, sparkline and Y/N badge
  // already carry the colour; the page-level legend explains it.
  const freqLabel =
    metric.format === 'Y/N'
      ? 'Yes/No status'
      : frequency === 'overall'
      ? 'Cumulative only'
      : 'Updated monthly';
  const drillLabel = isCentral
    ? 'No regional split'
    : lowestLevel === 'State'
    ? 'By state'
    : lowestLevel
    ? `Drills to ${lowestLevel}`
    : undefined;

  return (
    <p
      className="mt-2 text-[10px] font-semibold text-[var(--color-text-muted)]"
      title="How often this metric is updated, and the lowest geography it splits by."
    >
      {freqLabel}
      {drillLabel ? ` · ${drillLabel}` : ''}
    </p>
  );
}

