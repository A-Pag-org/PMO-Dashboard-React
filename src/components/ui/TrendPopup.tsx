// FILE: src/components/ui/TrendPopup.tsx
// PURPOSE: Modal opened from MapTrendChart's maximise button. Renders
//          a multi-line trend chart for the all-NCR aggregate plus the
//          top regions, with a legend table on the right.

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { buildSeries, monthLabels, type TrendSeries } from '@/lib/trendSynth';
import { getBandColors } from '@/lib/utils';
import type { MapDataPoint, ColorBand } from '@/lib/types';
import type { ViewLabel } from '@/components/layout/DetailFilterBar';

interface TrendPopupProps {
  open: boolean;
  metricName: string;
  /** Sorted ranking rows for the current map view. */
  rows: MapDataPoint[];
  /** Overall (all-NCR) current value. */
  overallValue: number;
  unit: 'pct' | 'count';
  isInverse?: boolean;
  level: ViewLabel;
  onClose: () => void;
}

const MAX_REGION_LINES = 6;
const REGION_COLORS = [
  '#0ea5e9', '#f97316', '#8b5cf6', '#14b8a6', '#ef4444', '#eab308',
];

function bandFromPct(pct: number, isInverse = false): Exclude<ColorBand, 'NA'> {
  const adj = isInverse ? 100 - pct : pct;
  if (adj < 30) return 'RED';
  if (adj < 60) return 'YELLOW';
  return 'GREEN';
}

export default function TrendPopup({
  open,
  metricName,
  rows,
  overallValue,
  unit,
  isInverse = false,
  level,
  onClose,
}: TrendPopupProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

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

  // Series: All NCR first (thick line, band colour) + top regions (categorical colours).
  const allSeries: Array<{
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trend graph"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Trend graph
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              All NCR + top {topRows.length} {level.toLowerCase()}
              {topRows.length === 1 ? '' : 's'}
              {metricName ? ` · ${metricName}` : ''} · last 6 months
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trend popup"
            className="rounded-md p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-light)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-5 overflow-hidden p-5">
          <div className="flex min-h-0 flex-col rounded-md border border-[var(--color-border)] bg-white p-4">
            <LineChart series={allSeries} unit={unit} max={max} />
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-[var(--color-border)] bg-white">
            <LegendTable series={allSeries} unit={unit} level={level} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
 * LineChart
 * -------------------------------------------------------------------- */

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
  const H = 360;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const labels = series[0]?.series.points.map((p) => p.label) ?? monthLabels(6);
  const n = labels.length;

  const yMax = unit === 'pct' ? 100 : max;
  const yTicks = unit === 'pct' ? [0, 25, 50, 75, 100] : [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * yMax));

  const xPos = (i: number) => padL + (n === 1 ? 0 : (i / (n - 1)) * innerW);
  const yPos = (v: number) => padT + (1 - v / yMax) * innerH;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img">
        {/* Y-axis gridlines + ticks */}
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

        {/* X-axis labels */}
        {labels.map((lab, i) => (
          <text
            key={lab + i}
            x={xPos(i)}
            y={H - padB + 16}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-text-muted)"
          >
            {lab}
          </text>
        ))}

        {/* Axis titles */}
        <text
          x={12}
          y={padT + innerH / 2}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-text-muted)"
          fontWeight={700}
          transform={`rotate(-90 12 ${padT + innerH / 2})`}
        >
          {unit === 'pct' ? 'PERCENTAGE' : 'COUNT'}
        </text>
        <text
          x={padL + innerW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-text-muted)"
          fontWeight={700}
        >
          MONTH →
        </text>

        {/* Series lines */}
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
                strokeDasharray={isAggregate ? '0' : '0'}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isAggregate ? 1 : 0.92}
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
    </div>
  );
}

/* ----------------------------------------------------------------------
 * LegendTable
 * -------------------------------------------------------------------- */

function LegendTable({
  series,
  unit,
  level,
}: {
  series: Array<{ series: TrendSeries; color: string; isAggregate: boolean }>;
  unit: 'pct' | 'count';
  level: ViewLabel;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-[14px_minmax(0,1fr)_64px_56px] items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        <span aria-hidden />
        <span>{level}</span>
        <span className="text-right">Latest</span>
        <span className="text-right">Δ 6 mo</span>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto">
        {series.map(({ series: s, color, isAggregate }) => {
          const last = s.points[s.points.length - 1].value;
          const first = s.points[0].value;
          const delta = last - first;
          const fmt = (v: number) =>
            unit === 'pct'
              ? `${Math.round(v)}%`
              : Math.round(v).toLocaleString('en-IN');
          return (
            <li
              key={s.name}
              className="grid grid-cols-[14px_minmax(0,1fr)_64px_56px] items-center gap-2 border-b border-[var(--color-border-table)] px-3 py-2 text-xs last:border-b-0"
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span
                className={
                  isAggregate
                    ? 'truncate text-[var(--color-text-primary)] font-bold'
                    : 'truncate font-medium text-[var(--color-text-primary)]'
                }
                title={s.name}
              >
                {s.name}
              </span>
              <span className="text-right text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
                {fmt(last)}
              </span>
              <span
                className="text-right text-[11px] font-bold tabular-nums"
                style={{
                  color:
                    delta > 0
                      ? '#16a34a'
                      : delta < 0
                      ? '#dc2626'
                      : 'var(--color-text-muted)',
                }}
              >
                {delta === 0
                  ? '—'
                  : `${delta > 0 ? '+' : ''}${fmt(Math.abs(delta)).replace('%', '')}${
                      unit === 'pct' ? 'pp' : ''
                    }`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
