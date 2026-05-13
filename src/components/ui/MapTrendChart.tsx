// FILE: src/components/ui/MapTrendChart.tsx
// PURPOSE: Compact sparkline panel that overlays the map directly under
//          the ranking-graph widget. Shows the overall NCR trend for the
//          currently selected metric over the last 6 months. The
//          maximise button opens TrendPopup with the full per-region
//          chart and legend table.

import { Maximize2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getBandColors } from '@/lib/utils';
import { buildSeries } from '@/lib/trendSynth';
import type { ColorBand } from '@/lib/types';

interface MapTrendChartProps {
  metricName: string;
  /** Current overall (all-NCR) value. For X/Y a 0-100 percentage; for Xx a raw count. */
  currentValue: number;
  /** 'pct' clamps 0-100 and renders %; 'count' renders Indian-locale numbers. */
  unit: 'pct' | 'count';
  isInverse?: boolean;
  onMaximise: () => void;
}

function bandFromPct(pct: number, isInverse = false): Exclude<ColorBand, 'NA'> {
  const adj = isInverse ? 100 - pct : pct;
  if (adj < 30) return 'RED';
  if (adj < 60) return 'YELLOW';
  return 'GREEN';
}

function fmt(value: number, unit: 'pct' | 'count'): string {
  if (unit === 'pct') return `${Math.round(value)}%`;
  return Math.round(value).toLocaleString('en-IN');
}

export default function MapTrendChart({
  metricName,
  currentValue,
  unit,
  isInverse = false,
  onMaximise,
}: MapTrendChartProps) {
  const max = unit === 'pct' ? 100 : Math.max(10, currentValue * 1.4);
  const series = buildSeries('All NCR', metricName, currentValue, 6, 0, max);
  const values = series.points.map((p) => p.value);
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const better = isInverse ? delta < 0 : delta > 0;
  const flat = Math.abs(delta) < (unit === 'pct' ? 1 : Math.max(1, currentValue * 0.01));

  const band: Exclude<ColorBand, 'NA'> =
    unit === 'pct' ? bandFromPct(last, isInverse) : 'GREEN';
  const colors = getBandColors(band);

  const W = 152;
  const H = 38;
  const padX = 2;
  const padY = 4;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const range = hi - lo || 1;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * innerW;
    const y = padY + (1 - (v - lo) / range) * innerH;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${(padY + innerH).toFixed(1)}` +
    ` L ${points[0][0].toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const DeltaIcon = flat ? Minus : better ? TrendingUp : TrendingDown;
  const deltaColor = flat
    ? 'var(--color-text-muted)'
    : better
    ? '#16a34a'
    : '#dc2626';

  return (
    <section
      aria-label="Trend graph"
      className="pointer-events-auto group relative w-[176px] rounded-md border border-[var(--color-border)]/40 bg-white/45 p-1.5 shadow-sm backdrop-blur-[2px] transition-opacity hover:bg-white/80"
    >
      <button
        type="button"
        onClick={onMaximise}
        aria-label="Maximise trend graph"
        className="absolute right-1 top-1 z-10 rounded bg-white/85 p-0.5 text-[var(--color-text-primary)] shadow-sm ring-1 ring-[var(--color-border)] hover:bg-white hover:text-[var(--color-blue-link)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)]"
      >
        <Maximize2 className="h-3.5 w-3.5" aria-hidden />
      </button>

      <div className="opacity-55 transition-opacity group-hover:opacity-100">
        <header className="pr-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
            All NCR · 6 mo
          </span>
        </header>

        <div className="mt-1 flex items-center justify-between gap-2 px-0.5">
          <span className="text-[12px] font-bold leading-none tabular-nums text-[var(--color-text-primary)]">
            {fmt(last, unit)}
          </span>
          <span
            className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none tabular-nums"
            style={{ color: deltaColor }}
            title={`Change vs ${series.points[0].label}`}
          >
            <DeltaIcon className="h-3 w-3" aria-hidden />
            {flat
              ? '—'
              : `${delta > 0 ? '+' : ''}${fmt(Math.abs(delta), unit).replace('%', '')}${
                  unit === 'pct' ? ' pp' : ''
                }`}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          className="mt-0.5 block"
          role="img"
          aria-label={`Trend from ${fmt(first, unit)} to ${fmt(last, unit)}`}
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

        <div className="mt-0.5 flex items-baseline justify-between text-[8px] font-medium tabular-nums text-[var(--color-text-muted)]">
          <span>{series.points[0].label}</span>
          <span>{series.points[series.points.length - 1].label}</span>
        </div>

        <p className="mt-0.5 text-center text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Trend graph
        </p>
      </div>
    </section>
  );
}
