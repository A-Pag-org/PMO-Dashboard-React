// FILE: src/components/ui/MetricTile.tsx
// PURPOSE: Vertical metric card for the Detail page's metrics grid.
//          Each tile carries:
//            · metric name (large, bold)
//            · format-aware value display (X/Y bar · Xx big number · Y/N pill)
//          Colour-coding lives on the bar / pill itself; the page-level
//          legend explains what each band means.

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import {
  cn,
  formatNumber,
  getBandColors,
  getBarColour,
  getColorBand,
  getCompletionPercentage,
} from '@/lib/utils';
import type { Metric } from '@/lib/types';
import DonutProgress from '@/components/ui/DonutProgress';

interface MetricTileProps {
  metric: Metric;
  selected?: boolean;
  onSelect?: () => void;
  /** Visual density. Outcome → 'lg', Progress → 'md', Readiness → 'sm'. */
  size?: 'lg' | 'md' | 'sm';
  /** Extra classes merged onto the tile container (e.g. `flex-1` to stretch). */
  className?: string;
}

export default function MetricTile({
  metric,
  selected = false,
  onSelect,
  size = 'md',
  className,
}: MetricTileProps) {
  const isInteractive = Boolean(onSelect);
  const Container = isInteractive ? 'button' : 'div';

  // Status-keyed hover tint. The status itself is already encoded in
  // the bar fill / donut / Y-N pill, so the resting tile stays plain
  // white. On hover the whole card picks up the band's pale wash and
  // its strong outline, gently nudging the eye toward what's
  // currently under the cursor — and what state it's in.
  // Xx metrics have no target to score against, so they get a calm
  // neutral hover instead.
  const band =
    metric.format === 'Xx'
      ? null
      : metric.format === 'Y/N'
      ? metric.achieved === 1
        ? ('GREEN' as const)
        : ('RED' as const)
      : getColorBand(
          getCompletionPercentage(metric.target, metric.achieved),
          metric.isInverse,
        );
  const hoverBg = band ? getBandColors(band).bg : 'var(--color-surface-light)';
  const hoverBorder = band
    ? getBandColors(band).fg
    : 'var(--color-text-secondary)';

  return (
    <Container
      type={isInteractive ? 'button' : undefined}
      onClick={onSelect}
      aria-pressed={isInteractive ? selected : undefined}
      style={
        {
          '--tile-hover-bg': hoverBg,
          '--tile-hover-border': hoverBorder,
        } as React.CSSProperties
      }
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-[var(--color-border-table)] bg-white text-left shadow-sm transition-all duration-150',
        size === 'lg' ? 'p-3.5' : size === 'sm' ? 'p-2.5' : 'p-3',
        isInteractive &&
          !selected &&
          'hover:border-[var(--tile-hover-border)] hover:bg-[var(--tile-hover-bg)] hover:shadow-md',
        isInteractive &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-1',
        className,
      )}
    >
      <header className="flex shrink-0 flex-col items-center gap-1">
        <p
          className={cn(
            'w-full text-center font-bold leading-snug text-[var(--color-text-primary)]',
            size === 'lg' ? 'text-[18px]' : size === 'sm' ? 'text-[13px]' : 'text-[15px]',
          )}
          title={metric.name}
        >
          {metric.name}
        </p>
        {metric.isInverse ? (
          <span
            className="rounded bg-[var(--color-tl-red-bg)] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[var(--color-tl-red-text)]"
            title="For this metric, lower values are better (e.g. fewer violations)."
          >
            Lower is better
          </span>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-center py-2">
        <Value metric={metric} size={size} />
      </div>
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
        className={cn(
          'flex w-full items-center justify-center rounded-sm font-bold uppercase tracking-wide',
          size === 'lg' ? 'h-12 text-base' : size === 'sm' ? 'h-7 text-[11px]' : 'h-9 text-sm',
        )}
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
      <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
        <span
          className={cn(
            'font-bold leading-none tabular-nums text-[var(--color-text-primary)]',
            size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-lg' : 'text-2xl',
          )}
        >
          {metric.achieved == null ? '—' : formatNumber(metric.achieved)}
        </span>
        {metric.unit ? (
          <span
            className={cn(
              'font-semibold uppercase tracking-wide text-[var(--color-text-muted)]',
              size === 'lg' ? 'text-xs' : 'text-[10px]',
            )}
          >
            {metric.unit}
          </span>
        ) : null}
        {delta != null ? <DeltaChip delta={delta} /> : null}
      </div>
    );
  }


  // X/Y donut variant — centred donut chart with the % in the middle
  // and achieved / target below. Used for tiles where the donut reads
  // cleaner than an inline bar (e.g. Green Contribution).
  if (metric.displayAs === 'donut') {
    const pct = getCompletionPercentage(metric.target, metric.achieved);
    const donutSize = size === 'lg' ? 140 : size === 'sm' ? 70 : 104;
    const donutThickness = size === 'lg' ? 16 : size === 'sm' ? 9 : 12;
    return (
      <div className="flex flex-col items-center justify-center gap-2.5">
        <DonutProgress value={pct} size={donutSize} thickness={donutThickness} />
        <span
          className={cn(
            'whitespace-nowrap font-bold tabular-nums text-[var(--color-text-primary)]',
            size === 'lg' ? 'text-base' : size === 'sm' ? 'text-[11px]' : 'text-sm',
          )}
          title={metric.denominatorLabel ?? undefined}
        >
          {formatNumber(metric.achieved)} / {formatNumber(metric.target)}
          {metric.unit ? (
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {metric.unit}
            </span>
          ) : null}
        </span>
      </div>
    );
  }

  // X/Y — single line: progress bar (with the % centred inside it)
  // followed by the achieved / target figure at the end. The bar
  // flexes to fill whatever width is left after the number, which is
  // kept on one line so it never wraps under the bar.
  const pct = getCompletionPercentage(metric.target, metric.achieved);
  const { filled, remainder } = getBarColour(pct, metric.isInverse);
  const band = getColorBand(pct, metric.isInverse);
  const bandColors = getBandColors(band);
  // White reads on the green/red fill; yellow's pale gold needs the
  // dark band text. When the fill hasn't reached the centred label the
  // % sits on the light track, so fall back to the dark band colour.
  const pctTextColor =
    pct >= 50
      ? band === 'YELLOW'
        ? bandColors.text
        : '#fff'
      : bandColors.text;
  const denomTitle = metric.denominatorLabel
    ? `${metric.denominatorLabel}: ${formatNumber(metric.target)}`
    : undefined;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          'relative min-w-0 flex-1 overflow-hidden rounded-sm',
          size === 'lg' ? 'h-5' : size === 'sm' ? 'h-4' : 'h-[18px]',
        )}
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
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-bold tabular-nums',
            size === 'lg' ? 'text-[13px]' : 'text-[10px]',
          )}
          style={{ color: pctTextColor }}
        >
          {pct}%
        </span>
      </div>
      <span
        className={cn(
          'shrink-0 whitespace-nowrap font-bold leading-none tabular-nums text-[var(--color-text-primary)]',
          size === 'lg' ? 'text-base' : size === 'sm' ? 'text-[11px]' : 'text-sm',
        )}
        title={denomTitle}
      >
        {formatNumber(metric.achieved)} / {formatNumber(metric.target)}
      </span>
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


