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
      <header className="flex shrink-0 flex-nowrap items-center justify-between gap-2 overflow-hidden whitespace-nowrap border-b border-[var(--color-border-table)] bg-[var(--color-surface-light)] px-3 py-1.5">
        <p className="flex min-w-0 items-baseline gap-1.5 truncate text-[10px] font-semibold text-[var(--color-text-muted)]">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-primary)]">
            Ranking
          </span>
          <span className="truncate">
            by {level} · {valid.length} {valid.length === 1 ? 'entry' : 'entries'}
          </span>
        </p>

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
                ? 'rounded-[3px] bg-[var(--color-navy)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm'
                : 'rounded-[3px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-light)]'
            }
          >
            {lvl}
          </button>
        );
      })}
    </div>
  );
}

/** Strip the trailing "(NN%)" so the row shows just "achieved / target". */
function numberOnly(label: string | undefined): string {
  if (!label) return '';
  const idx = label.indexOf(' (');
  return idx >= 0 ? label.slice(0, idx) : label;
}

function RankingRow({ row, rank }: { row: MapDataPoint; rank: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(row.value ?? 0)));
  const band = bandFor(row, pct);
  const colors = getBandColors(band);
  const numberLabel = numberOnly(row.label);
  // Yellow's fill is a pale gold — white text doesn't survive on it.
  // For green/red the filled portion is dark enough that white reads
  // crisply, and below ~35% the % label sits on the unfilled (light)
  // background, where the band's dark text colour works.
  const filledTextColor = band === 'YELLOW' ? colors.text : '#fff';
  const textColor = pct >= 35 ? filledTextColor : colors.text;

  return (
    <li
      className="grid grid-cols-[22px_minmax(56px,1fr)_minmax(80px,1fr)_minmax(74px,auto)] items-center gap-2 whitespace-nowrap border-b border-[var(--color-border-table)] px-3 py-1.5 last:border-b-0"
      title={`#${rank} ${row.name} — ${row.label ?? `${pct}%`}`}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-surface-light)] text-[10px] font-bold tabular-nums text-[var(--color-text-secondary)]">
        {rank}
      </span>

      <span className="truncate text-[11px] font-semibold text-[var(--color-text-primary)]">
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
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums"
          style={{ color: textColor }}
        >
          {pct}%
        </span>
      </div>

      <span className="truncate text-right text-[11px] font-bold tabular-nums text-[var(--color-text-primary)]">
        {numberLabel}
      </span>
    </li>
  );
}
