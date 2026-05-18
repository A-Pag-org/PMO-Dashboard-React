// FILE: src/components/ui/TrendPanel.tsx
// PURPOSE: Inline trend panel for the Detail page (replaces the
//          map-overlay sparkline + popup). Shows the 6-month line chart
//          for All NCR plus up to 4 top regions, with a compact legend
//          below the chart.

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { getBandColors } from '@/lib/utils';
import { buildSeries, monthLabels, type TrendSeries } from '@/lib/trendSynth';
import type { ColorBand, MapDataPoint } from '@/lib/types';
import type { ViewLabel } from '@/components/layout/DetailFilterBar';

const MAX_REGION_LINES = 4;
const REGION_COLORS = [
  '#0ea5e9',
  '#f97316',
  '#8b5cf6',
  '#14b8a6',
];

interface TrendPanelProps {
  metricName: string;
  /** All-NCR current value (% for X/Y, raw count for Xx). */
  overallValue: number;
  /** Ranking rows for the active view level — used to pick top regions. */
  rows: MapDataPoint[];
  unit: 'pct' | 'count';
  isInverse?: boolean;
  level: ViewLabel;
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

export default function TrendPanel({
  metricName,
  overallValue,
  rows,
  unit,
  isInverse = false,
  level,
}: TrendPanelProps) {
  const validRows =
    unit === 'pct' ? rows.filter((r) => r.format === 'X/Y') : rows;
  const topRows = validRows.slice(0, MAX_REGION_LINES);

  const max =
    unit === 'pct'
      ? 100
      : Math.max(
          10,
          (topRows[0]?.value ?? overallValue) * 1.4,
          overallValue * 1.4,
        );

  const overallBand = bandFromPct(overallValue, isInverse);
  const overallColors = getBandColors(overallBand);

  const series: Array<{
    series: TrendSeries;
    color: string;
    isAggregate: boolean;
  }> = [
    {
      series: buildSeries(metricName, 'All NCR', overallValue, 6, 0, max),
      color: overallColors.fg,
      isAggregate: true,
    },
    ...topRows.map((r, i) => ({
      series: buildSeries(metricName, r.name, r.value, 6, 0, max),
      color: REGION_COLORS[i % REGION_COLORS.length],
      isAggregate: false,
    })),
  ];

  return (
    <section
      aria-label="Trend"
      className="flex min-h-0 flex-col rounded-md border border-[var(--color-border-table)] bg-white"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-table)] bg-[var(--color-surface-light)] px-3 py-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-primary)]">
            Trend
          </h3>
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
            last 6 months · All NCR
            {topRows.length > 0 ? ` + top ${topRows.length} ${level.toLowerCase()}${topRows.length === 1 ? '' : 's'}` : ''}
          </span>
        </div>
        <HeadlineDelta
          series={series[0].series}
          unit={unit}
          isInverse={isInverse}
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <LineChart series={series} unit={unit} max={max} />
        <Legend series={series} unit={unit} />
      </div>
    </section>
  );
}

function HeadlineDelta({
  series,
  unit,
  isInverse,
}: {
  series: TrendSeries;
  unit: 'pct' | 'count';
  isInverse: boolean;
}) {
  const last = series.points[series.points.length - 1].value;
  const first = series.points[0].value;
  const delta = last - first;
  const flat = Math.abs(delta) < (unit === 'pct' ? 1 : Math.max(1, last * 0.01));
  const better = isInverse ? delta < 0 : delta > 0;
  const Icon = flat ? Minus : better ? TrendingUp : TrendingDown;
  const color = flat
    ? 'var(--color-text-muted)'
    : better
    ? '#16a34a'
    : '#dc2626';
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const magnitude = unit === 'pct'
    ? `${Math.round(Math.abs(delta))}pp`
    : Math.round(Math.abs(delta)).toLocaleString('en-IN');

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
        {fmt(last, unit)}
      </span>
      <span
        className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums"
        style={{ color }}
        title={`Change vs ${series.points[0].label}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {flat ? '—' : `${sign}${magnitude}`}
      </span>
    </div>
  );
}

function LineChart({
  series,
  unit,
  max,
}: {
  series: Array<{ series: TrendSeries; color: string; isAggregate: boolean }>;
  unit: 'pct' | 'count';
  max: number;
}) {
  const W = 720;
  const H = 220;
  const padL = 44;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const labels = series[0]?.series.points.map((p) => p.label) ?? monthLabels(6);
  const n = labels.length;

  const yMax = unit === 'pct' ? 100 : max;
  const yTicks = unit === 'pct'
    ? [0, 25, 50, 75, 100]
    : [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * yMax));

  const xPos = (i: number) => padL + (n === 1 ? 0 : (i / (n - 1)) * innerW);
  const yPos = (v: number) => padT + (1 - v / yMax) * innerH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      role="img"
      className="block max-h-[240px]"
      preserveAspectRatio="xMidYMid meet"
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={yPos(t)}
            y2={yPos(t)}
            stroke="var(--color-border-table)"
            strokeWidth={1}
            strokeDasharray={t === 0 ? '0' : '2 3'}
          />
          <text
            x={padL - 6}
            y={yPos(t)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--color-text-muted)"
          >
            {unit === 'pct' ? `${t}%` : t.toLocaleString('en-IN')}
          </text>
        </g>
      ))}

      {labels.map((lab, i) => (
        <text
          key={lab + i}
          x={xPos(i)}
          y={H - padB + 14}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-text-muted)"
        >
          {lab}
        </text>
      ))}

      {series.map(({ series: s, color, isAggregate }) => {
        const d = s.points
          .map(
            (p, i) =>
              `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(p.value).toFixed(1)}`,
          )
          .join(' ');
        return (
          <g key={s.name}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={isAggregate ? 3 : 1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isAggregate ? 1 : 0.9}
            />
            {s.points.map((p, i) => (
              <circle
                key={i}
                cx={xPos(i)}
                cy={yPos(p.value)}
                r={isAggregate ? 3 : 2.25}
                fill={color}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Legend({
  series,
  unit,
}: {
  series: Array<{ series: TrendSeries; color: string; isAggregate: boolean }>;
  unit: 'pct' | 'count';
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--color-border-table)] pt-2">
      {series.map(({ series: s, color, isAggregate }) => {
        const last = s.points[s.points.length - 1].value;
        return (
          <li
            key={s.name}
            className="inline-flex items-center gap-1.5 text-[11px] tabular-nums"
            title={s.name}
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span
              className={
                isAggregate
                  ? 'font-bold text-[var(--color-text-primary)]'
                  : 'font-medium text-[var(--color-text-secondary)]'
              }
            >
              {s.name}
            </span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {fmt(last, unit)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
