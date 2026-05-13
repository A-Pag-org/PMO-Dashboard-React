// FILE: src/components/ui/RankingPopup.tsx
// PURPOSE: Modal opened from MapRankingChart's maximise button. Shows
//          the full ranking as a bigger vertical-bar chart on the left
//          and a sortable table on the right.

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { ChartBody } from './MapRankingChart';
import { getBandColors } from '@/lib/utils';
import type { MapDataPoint, ColorBand } from '@/lib/types';
import type { ViewLabel } from '@/components/layout/DetailFilterBar';

interface RankingPopupProps {
  open: boolean;
  rows: MapDataPoint[];
  level: ViewLabel;
  metricName?: string;
  onClose: () => void;
}

export default function RankingPopup({
  open,
  rows,
  level,
  metricName,
  onClose,
}: RankingPopupProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const valid = rows.filter((r) => r.format === 'X/Y');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ranking graph by ${level}`}
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
              Ranking graph
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              by {level}
              {metricName ? ` · ${metricName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ranking popup"
            className="rounded-md p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-light)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-5 overflow-hidden p-5">
          {/* Big chart */}
          <div className="flex min-h-0 flex-col overflow-x-auto rounded-md border border-[var(--color-border)] bg-white p-4">
            {valid.length === 0 ? (
              <p className="m-auto text-sm text-[var(--color-text-muted)]">
                No ranking available for this metric.
              </p>
            ) : (
              <div style={{ minWidth: Math.max(380, valid.length * 56) }}>
                <ChartBody rows={valid} plotHeight={340} barMinHeight={8} />
              </div>
            )}
          </div>

          {/* Ranking table */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-[var(--color-border)] bg-white">
            <RankingTable rows={valid} level={level} />
          </div>
        </div>
      </div>
    </div>
  );
}

function bandFor(row: MapDataPoint, pct: number): Exclude<ColorBand, 'NA'> {
  if (row.band && row.band !== 'NA') return row.band;
  if (pct < 30) return 'RED';
  if (pct < 60) return 'YELLOW';
  return 'GREEN';
}

function RankingTable({
  rows,
  level,
}: {
  rows: MapDataPoint[];
  level: ViewLabel;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-[40px_minmax(0,1fr)_72px] items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        <span>Rank</span>
        <span>{level}</span>
        <span className="text-right">%</span>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((r, i) => {
          const pct = Math.max(0, Math.min(100, Math.round(r.value ?? 0)));
          const band = bandFor(r, pct);
          const colors = getBandColors(band);
          return (
            <li
              key={r.name}
              className="grid grid-cols-[40px_minmax(0,1fr)_72px] items-center gap-2 border-b border-[var(--color-border-table)] px-3 py-2 text-xs last:border-b-0"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-light)] text-[11px] font-bold tabular-nums text-[var(--color-text-secondary)]">
                {i + 1}
              </span>
              <span
                className="truncate font-medium text-[var(--color-text-primary)]"
                title={r.name}
              >
                {r.name}
              </span>
              <span className="flex items-center justify-end gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors.fg }}
                />
                <span className="text-right text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
                  {pct}%
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
