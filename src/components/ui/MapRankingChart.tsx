// FILE: src/components/ui/MapRankingChart.tsx
// PURPOSE: Compact vertical-bar ranking chart that overlays the top-left
//          corner of the Detail-page map. Each bar's height = the row's
//          completion %, coloured by the same band as the map markers
//          (RED <30 · YELLOW 30-60 · GREEN >60). The geography name is
//          written vertically inside the bar so it stays legible even
//          on narrow widths.
//
// Minimised view (in-map): top 5 ranks, small enough to leave the map
// breathing room. A maximise button opens the full chart + ranking
// table in a popup (see RankingPopup).

import { Maximize2 } from 'lucide-react';
import { getBandColors } from '@/lib/utils';
import type { MapDataPoint, ColorBand } from '@/lib/types';
import type { ViewLabel } from '@/components/layout/DetailFilterBar';

export const MAX_BARS_MINIMISED = 5;

interface MapRankingChartProps {
  /** Already sorted descending by completion %. */
  rows: MapDataPoint[];
  level: ViewLabel;
  onMaximise: () => void;
}

function rankableRows(rows: MapDataPoint[]): MapDataPoint[] {
  return rows.filter((r) => r.format === 'X/Y');
}

function bandFor(row: MapDataPoint, pct: number): Exclude<ColorBand, 'NA'> {
  if (row.band && row.band !== 'NA') return row.band;
  if (pct < 30) return 'RED';
  if (pct < 60) return 'YELLOW';
  return 'GREEN';
}

export default function MapRankingChart({
  rows,
  level,
  onMaximise,
}: MapRankingChartProps) {
  const valid = rankableRows(rows);
  if (valid.length === 0) return null;
  const top = valid.slice(0, MAX_BARS_MINIMISED);

  return (
    <section
      aria-label={`Ranking graph by ${level}`}
      className="pointer-events-auto group relative w-[176px] rounded-md border border-[var(--color-border)]/40 bg-white/45 p-1.5 shadow-sm backdrop-blur-[2px] transition-opacity hover:bg-white/80"
    >
      <button
        type="button"
        onClick={onMaximise}
        aria-label="Maximise ranking graph"
        className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-2 py-1 text-[10px] font-semibold text-[var(--color-blue-link)] shadow-sm hover:bg-[var(--color-blue-pale)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-1"
      >
        <Maximize2 className="h-3 w-3" aria-hidden />
        <span>Expand</span>
      </button>

      <div className="opacity-55 transition-opacity group-hover:opacity-100">
        <header className="pr-16">
          <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
            Top {top.length} · {level}
          </span>
        </header>

        <ChartBody rows={top} plotHeight={96} barMinHeight={6} compact />

        <p className="mt-0.5 text-center text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Ranking graph
        </p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------
 * ChartBody — reusable for both the minimised overlay and the popup.
 * -------------------------------------------------------------------- */

interface ChartBodyProps {
  rows: MapDataPoint[];
  plotHeight: number;
  barMinHeight?: number;
  /** Compact mode: thinner y-axis, smaller bars (for the in-map widget). */
  compact?: boolean;
}

export function ChartBody({
  rows,
  plotHeight,
  barMinHeight = 6,
  compact = false,
}: ChartBodyProps) {
  const yAxisWidth = compact ? 20 : 28;
  const barMinWidth = compact ? 20 : 22;
  const gap = compact ? 2 : 4;
  return (
    <div className="mt-1 flex items-stretch" style={{ gap }}>
      {/* Y-axis: "Percentage" label + ticks (0, 50, 100) */}
      <div
        className="relative flex shrink-0 flex-col items-end pr-1"
        style={{ width: yAxisWidth }}
      >
        {!compact ? (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]"
            style={{ transformOrigin: 'center' }}
          >
            Percentage
          </span>
        ) : null}
        <div
          className="ml-auto flex flex-col justify-between text-[8px] font-medium tabular-nums text-[var(--color-text-muted)]"
          style={{ height: plotHeight }}
        >
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
      </div>

      {/* Plot area: bars + X-axis label */}
      <div className="flex flex-1 flex-col">
        <div
          className="flex items-end border-b border-[var(--color-border)]"
          style={{ height: plotHeight, gap }}
        >
          {rows.map((r, i) => (
            <Bar
              key={r.name}
              row={r}
              rank={i + 1}
              plotHeight={plotHeight}
              minHeight={barMinHeight}
              minWidth={barMinWidth}
            />
          ))}
        </div>
        <div className="mt-0.5 flex items-baseline justify-between text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
          <span aria-hidden>&nbsp;</span>
          <span>Rank →</span>
        </div>
      </div>
    </div>
  );
}

function Bar({
  row,
  rank,
  plotHeight,
  minHeight,
  minWidth,
}: {
  row: MapDataPoint;
  rank: number;
  plotHeight: number;
  minHeight: number;
  minWidth: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(row.value ?? 0)));
  const band = bandFor(row, pct);
  const colors = getBandColors(band);
  // Reserve ~14px above the bar for the % label so it doesn't overflow
  // the plot box for 100% bars.
  const usable = plotHeight - 14;
  const h = Math.max(minHeight, Math.round((pct / 100) * usable));
  const showLightText = band !== 'YELLOW' && h > 24;

  return (
    <div
      className="flex h-full flex-1 flex-col items-center justify-end"
      style={{ minWidth }}
      title={`#${rank} ${row.name} — ${pct}%`}
    >
      <span className="text-[9px] font-bold leading-none tabular-nums text-[var(--color-text-primary)]">
        {pct}%
      </span>
      <div
        className="relative mt-1 w-full overflow-hidden rounded-t-[3px]"
        style={{ height: h, backgroundColor: colors.fg }}
      >
        {row.name ? (
          <span
            className="absolute inset-0 flex items-center justify-center px-0.5 text-center font-semibold leading-tight"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 9,
              color: showLightText ? '#fff' : colors.text,
              maxHeight: '100%',
              overflow: 'hidden',
            }}
          >
            {row.name}
          </span>
        ) : null}
      </div>
    </div>
  );
}
