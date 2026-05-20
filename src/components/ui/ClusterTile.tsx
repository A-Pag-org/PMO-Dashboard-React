// FILE: src/components/ui/ClusterTile.tsx
// PURPOSE: Combined "cluster" tile that shows two related metrics in
//          a single card on the Detail page (e.g. Naya Safar's
//          Trucks + Buses under one "Pre-BS VI converted" tile, or
//          Events Planned + Conducted under one "Events" tile).
//
//          Shares the card chrome with MetricTile (white card, soft
//          shadow, status-coloured 4px left accent) so the two read
//          as a consistent system. Each cluster row is rendered as a
//          compact "label · bar · achieved/target" line, matching
//          the inline-bar pattern used on the regular X/Y tile.

import {
  cn,
  formatNumber,
  getBandColors,
  getBarColour,
  getColorBand,
  getCompletionPercentage,
} from '@/lib/utils';
import type { Metric } from '@/lib/types';

type ClusterBand = 'GREEN' | 'YELLOW' | 'RED' | 'NA';

interface ClusterTileProps {
  label: string;
  metrics: Metric[];
  selected?: boolean;
  onSelect?: () => void;
  size?: 'lg' | 'md' | 'sm';
  className?: string;
}

/** Band priority — surface the worst metric so problem clusters read first. */
const BAND_RANK: Record<ClusterBand, number> = {
  RED: 0,
  YELLOW: 1,
  GREEN: 2,
  NA: 3,
};

function bandFor(m: Metric): ClusterBand {
  if (m.format === 'Y/N') return m.achieved === 1 ? 'GREEN' : 'RED';
  if (m.format === 'Xx') return 'NA';
  return getColorBand(
    getCompletionPercentage(m.target, m.achieved),
    m.isInverse,
  );
}

function worstBand(metrics: Metric[]): ClusterBand {
  let worst: ClusterBand = 'NA';
  for (const m of metrics) {
    const b = bandFor(m);
    if (BAND_RANK[b] < BAND_RANK[worst]) worst = b;
  }
  return worst;
}

function hoverColorsFor(metrics: Metric[]): { bg: string; border: string } {
  const worst = worstBand(metrics);
  if (worst === 'NA')
    return {
      bg: 'var(--color-surface-light)',
      border: 'var(--color-text-secondary)',
    };
  const c = getBandColors(worst);
  return { bg: c.bg, border: c.fg };
}

export default function ClusterTile({
  label,
  metrics,
  selected = false,
  onSelect,
  size = 'md',
  className,
}: ClusterTileProps) {
  const isInteractive = Boolean(onSelect);
  const Container = isInteractive ? 'button' : 'div';
  const hover = hoverColorsFor(metrics);

  return (
    <Container
      type={isInteractive ? 'button' : undefined}
      onClick={onSelect}
      aria-pressed={isInteractive ? selected : undefined}
      style={
        {
          '--tile-hover-bg': hover.bg,
          '--tile-hover-border': hover.border,
        } as React.CSSProperties
      }
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-[var(--color-border-table)] bg-white text-left shadow-sm transition-all duration-150',
        size === 'lg' ? 'p-3.5' : size === 'sm' ? 'p-2.5' : 'p-3',
        selected
          ? 'bg-[var(--color-blue-pale)]/50 shadow-md ring-2 ring-[var(--color-blue-link)]'
          : isInteractive &&
              'hover:border-[var(--tile-hover-border)] hover:bg-[var(--tile-hover-bg)] hover:shadow-md',
        isInteractive &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-1',
        className,
      )}
    >
      <p
        className={cn(
          'w-full shrink-0 text-center font-bold leading-snug text-[var(--color-text-primary)]',
          size === 'lg' ? 'text-[18px]' : size === 'sm' ? 'text-[13px]' : 'text-[15px]',
        )}
        title={label}
      >
        {label}
      </p>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          size === 'lg' ? 'gap-3 py-2' : 'gap-2 py-1.5',
        )}
      >
        {metrics.map((m) => (
          <Row key={m.name} metric={m} size={size} />
        ))}
      </div>
    </Container>
  );
}

/* ───────────────────────────────────────────────────────────────────── */

function Row({ metric, size }: { metric: Metric; size: 'lg' | 'md' | 'sm' }) {
  // X/Y is the common case for clustered metrics. Xx falls back to a
  // plain "label · number" row; Y/N to a label + Yes/No tag.
  if (metric.format === 'X/Y') {
    return <XyRow metric={metric} size={size} />;
  }
  if (metric.format === 'Y/N') {
    return <YnRow metric={metric} size={size} />;
  }
  return <XxRow metric={metric} size={size} />;
}

function SubLabel({
  text,
  size,
}: {
  text: string;
  size: 'lg' | 'md' | 'sm';
}) {
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]',
        size === 'lg' ? 'text-[11px]' : 'text-[9px]',
      )}
    >
      {text}
    </span>
  );
}

function XyRow({ metric, size }: { metric: Metric; size: 'lg' | 'md' | 'sm' }) {
  const pct = getCompletionPercentage(metric.target, metric.achieved);
  const { filled, remainder } = getBarColour(pct, metric.isInverse);
  const band = getColorBand(pct, metric.isInverse);
  const bandColors = getBandColors(band);
  const pctTextColor =
    pct >= 50
      ? band === 'YELLOW'
        ? bandColors.text
        : '#fff'
      : bandColors.text;
  const subLabel = metric.clusterSubLabel ?? metric.name;

  return (
    <div className="flex min-h-0 flex-1 items-center gap-3">
      <div className={cn(size === 'lg' ? 'w-16' : 'w-14')}>
        <SubLabel text={subLabel} size={size} />
      </div>
      <div
        className={cn(
          'relative min-w-0 flex-1 overflow-hidden rounded-sm',
          size === 'lg' ? 'h-7' : size === 'sm' ? 'h-5' : 'h-6',
        )}
        style={{ backgroundColor: remainder }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${subLabel} completion`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: filled }}
        />
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-bold tabular-nums',
            size === 'lg' ? 'text-[14px]' : size === 'sm' ? 'text-[11px]' : 'text-[12px]',
          )}
          style={{ color: pctTextColor }}
        >
          {pct}%
        </span>
      </div>
      <span
        className={cn(
          'shrink-0 whitespace-nowrap font-bold leading-none tabular-nums text-[var(--color-text-primary)]',
          size === 'lg' ? 'text-base' : size === 'sm' ? 'text-[11px]' : 'text-[13px]',
        )}
      >
        {formatNumber(metric.achieved)} / {formatNumber(metric.target)}
      </span>
    </div>
  );
}

function XxRow({ metric, size }: { metric: Metric; size: 'lg' | 'md' | 'sm' }) {
  const subLabel = metric.clusterSubLabel ?? metric.name;
  return (
    <div className="flex min-h-0 flex-1 items-center justify-between gap-2">
      <SubLabel text={subLabel} size={size} />
      <span
        className={cn(
          'shrink-0 whitespace-nowrap font-bold tabular-nums text-[var(--color-text-primary)]',
          size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-[12px]' : 'text-base',
        )}
      >
        {metric.achieved == null ? '—' : formatNumber(metric.achieved)}
        {metric.unit ? (
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {metric.unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function YnRow({ metric, size }: { metric: Metric; size: 'lg' | 'md' | 'sm' }) {
  const subLabel = metric.clusterSubLabel ?? metric.name;
  const isYes = metric.achieved === 1;
  const colors = getBandColors(isYes ? 'GREEN' : 'RED');
  return (
    <div className="flex min-h-0 flex-1 items-center justify-between gap-2">
      <SubLabel text={subLabel} size={size} />
      <span
        className={cn(
          'shrink-0 rounded-sm px-2 py-0.5 font-bold uppercase tracking-wide',
          size === 'lg' ? 'text-xs' : 'text-[10px]',
        )}
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {isYes ? 'Yes' : 'No'}
      </span>
    </div>
  );
}
