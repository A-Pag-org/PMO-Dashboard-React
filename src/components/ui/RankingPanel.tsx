// FILE: src/components/ui/RankingPanel.tsx
// PURPOSE: Inline ranking panel for the Detail page (replaces the
//          map-overlay ranking widget + popup). Shows every geography
//          ranked by completion % as a horizontal bar list, with an
//          inline State/City/RTO switcher in the header.

import { getBandColors } from '@/lib/utils';
import type { ColorBand, MapDataPoint } from '@/lib/types';
import type { ViewLabel } from '@/components/layout/DetailFilterBar';

interface RankingPanelProps {
  rows: MapDataPoint[];
  level: ViewLabel;
  availableLevels: readonly ViewLabel[];
  onLevelChange: (level: ViewLabel) => void;
  emptyHint?: string;
}

function bandFor(row: MapDataPoint, pct: number): Exclude<ColorBand, 'NA'> {
  if (row.band && row.band !== 'NA') return row.band;
  if (pct < 30) return 'RED';
  if (pct < 60) return 'YELLOW';
  return 'GREEN';
}

export default function RankingPanel({
  rows,
  level,
  availableLevels,
  onLevelChange,
  emptyHint,
}: RankingPanelProps) {
  const valid = rows.filter((r) => r.format === 'X/Y');

  return (
    <section
      aria-label="Ranking"
      className="flex min-h-0 flex-col rounded-md border border-[var(--color-border-table)] bg-white"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-table)] bg-[var(--color-surface-light)] px-3 py-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-primary)]">
            Ranking
          </h3>
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
            by {level} · {valid.length} {valid.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {availableLevels.length > 1 ? (
          <LevelSwitcher
            level={level}
            availableLevels={availableLevels}
            onChange={onLevelChange}
          />
        ) : null}
      </header>

      {valid.length === 0 ? (
        <p className="m-auto px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
          {emptyHint ?? 'No ranking available for this metric.'}
        </p>
      ) : (
        <ol className="min-h-0 flex-1 overflow-y-auto">
          {valid.map((row, i) => (
            <RankingRow key={row.name} row={row} rank={i + 1} />
          ))}
        </ol>
      )}
    </section>
  );
}

function LevelSwitcher({
  level,
  availableLevels,
  onChange,
}: {
  level: ViewLabel;
  availableLevels: readonly ViewLabel[];
  onChange: (level: ViewLabel) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Ranking level"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[var(--color-border-table)] bg-white p-0.5"
    >
      {availableLevels.map((lvl) => {
        const selected = lvl === level;
        return (
          <button
            key={lvl}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(lvl)}
            className={
              selected
                ? 'rounded-[3px] bg-[var(--color-navy)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm'
                : 'rounded-[3px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-light)]'
            }
          >
            {lvl}
          </button>
        );
      })}
    </div>
  );
}

function RankingRow({ row, rank }: { row: MapDataPoint; rank: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(row.value ?? 0)));
  const band = bandFor(row, pct);
  const colors = getBandColors(band);

  return (
    <li
      className="grid grid-cols-[36px_minmax(0,1fr)_minmax(100px,140px)_56px] items-center gap-3 border-b border-[var(--color-border-table)] px-3 py-2 last:border-b-0"
      title={`#${rank} ${row.name} — ${row.label ?? `${pct}%`}`}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-light)] text-[11px] font-bold tabular-nums text-[var(--color-text-secondary)]">
        {rank}
      </span>

      <span className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
        {row.name}
      </span>

      <div
        className="relative h-4 w-full overflow-hidden rounded-sm"
        style={{ backgroundColor: colors.bg }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${row.name} completion`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: colors.fg }}
        />
      </div>

      <span
        className="text-right text-xs font-bold tabular-nums"
        style={{ color: colors.text }}
      >
        {pct}%
      </span>
    </li>
  );
}
