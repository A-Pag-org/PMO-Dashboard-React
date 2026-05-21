// FILE: src/pages/SummaryPage.tsx
// PURPOSE: Summary (landing) page — initiative tiles in a 3-column grid,
//          presented under a Detail-Page-style yellow aggregate bar so the
//          two pages share the same chrome.
//
// Layout:
//   - Top app bar (TopBar).
//   - Cream surface (matches DetailPage's SURFACE constant).
//   - Inline "State" select styled like DetailPage's "Initiative" select.
//   - Yellow aggregate bar (DELHI NCR / selected state) summarising
//     cross-initiative completion at a glance.
//   - Main grid of initiative tiles (3 cols on lg, 2 on md, 1 on sm).
//   - Footer with the COMPLETION BANDS label + legend on the right
//     (mirrors DetailPage footer).

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import InitiativeCard from '@/components/ui/InitiativeCard';
import CompletionThresholdsLegend from '@/components/ui/CompletionThresholdsLegend';
import {
  INITIATIVES,
  MOCK_SUMMARY_BY_INITIATIVE,
  STATES,
} from '@/lib/constants';
import type { StateName } from '@/lib/constants';
import { getCurrentRole, isDelhiOnlyRole } from '@/lib/auth';
import { cn, getBandColors, getColorBand } from '@/lib/utils';

const STATE_FILTER_OPTIONS = ['All - Delhi NCR', ...STATES] as const;
type StateFilter = (typeof STATE_FILTER_OPTIONS)[number];

// Surface and aggregate-bar colours are intentionally copied from
// DetailPage so the two pages render against the same palette.
const SURFACE = '#F6F1E8';
const RAIL_YELLOW = '#F2EA00';

function defaultStateForRole(): StateFilter {
  return isDelhiOnlyRole(getCurrentRole()) ? 'Delhi' : 'All - Delhi NCR';
}

/**
 * Computes a per-initiative completion % for the selected scope. When a
 * single state is selected we look up that state's row; for "All - Delhi
 * NCR" we aggregate by summing target/achieved across all four states
 * (matches how the detail page's NCR aggregate behaves).
 */
function initiativeCompletion(
  slug: string,
  state: StateName | null,
): number | null {
  const data = MOCK_SUMMARY_BY_INITIATIVE[slug];
  if (!data) return null;
  if (state) {
    const row = data.table.find((r) => r.state === state);
    return row ? row.completion : null;
  }
  const totals = data.table.reduce(
    (acc, r) => ({
      target: acc.target + r.target,
      achieved: acc.achieved + r.achieved,
    }),
    { target: 0, achieved: 0 },
  );
  if (totals.target <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((totals.achieved / totals.target) * 100)),
  );
}

interface AggregateCell {
  label: string;
  /** Large number rendered above the bar. */
  big: string;
  /** Caption under the bar. */
  caption?: string;
  /** Completion % driving the bar fill & colour band. */
  pct: number;
  /** Whether the band inverts (high = bad). */
  isInverse?: boolean;
}

function buildAggregateCells(state: StateName | null): AggregateCell[] {
  const completions = INITIATIVES.map((i) =>
    initiativeCompletion(i.slug, state),
  ).filter((c): c is number => c !== null);

  const total = completions.length;
  const avg = total > 0
    ? Math.round(completions.reduce((s, c) => s + c, 0) / total)
    : 0;
  const onTrack = completions.filter((c) => c >= 60).length;
  const atRisk = completions.filter((c) => c < 30).length;
  const onTrackPct = total > 0 ? Math.round((onTrack / total) * 100) : 0;
  // At-risk is inverse-banded: more red as the risk count grows.
  const atRiskPct = total > 0 ? Math.round((atRisk / total) * 100) : 0;

  return [
    {
      label: 'Average completion',
      big: `${avg}%`,
      caption: `Across ${total} initiative${total === 1 ? '' : 's'}`,
      pct: avg,
    },
    {
      label: 'Initiatives on track',
      big: `${onTrack} / ${total}`,
      caption: '≥ 60% completion',
      pct: onTrackPct,
    },
    {
      label: 'Initiatives at risk',
      big: `${atRisk} / ${total}`,
      caption: '< 30% completion',
      pct: atRiskPct,
      isInverse: true,
    },
  ];
}

interface AggregateBarProps {
  title: string;
  subtitle: string;
  cells: AggregateCell[];
}

function AggregateBar({ title, subtitle, cells }: AggregateBarProps) {
  return (
    <div
      className="rounded-md border border-[#D9CF22] px-4 py-4 shadow-sm"
      style={{ backgroundColor: RAIL_YELLOW }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-navy)]">
          {title}
        </span>
        <span className="h-px flex-1 bg-[var(--color-navy)] opacity-20" />
        <span className="text-[11px] font-medium text-[var(--color-navy)] opacity-70">
          {subtitle}
        </span>
      </div>
      <div
        className="grid divide-x divide-[var(--color-navy)]/15"
        style={{
          gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((cell, i) => (
          <div key={cell.label} className={cn('px-3', i === 0 && 'pl-0')}>
            <AggregateCellView cell={cell} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AggregateCellView({ cell }: { cell: AggregateCell }) {
  const band = getColorBand(cell.pct, cell.isInverse ?? false);
  const colors = getBandColors(band);
  return (
    <div className="flex flex-col gap-1 py-1.5">
      <div
        className="truncate text-[10.5px] font-medium leading-tight text-[var(--color-text-secondary)]"
        title={cell.label}
      >
        {cell.label}
      </div>
      <div className="flex flex-col gap-1">
        <div
          className="truncate text-[16px] font-bold leading-none text-[var(--color-navy)]"
          title={cell.big}
        >
          {cell.big}
        </div>
        <div
          className="relative h-[12px] w-full overflow-hidden rounded-[2px]"
          style={{ backgroundColor: colors.bg }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.max(0, Math.min(100, cell.pct))}%`,
              backgroundColor: colors.fg,
            }}
          />
          <span
            className="absolute inset-0 flex items-center justify-end pr-1.5 text-[9px] font-bold leading-none text-white"
            style={{ mixBlendMode: 'difference' }}
          >
            {cell.pct}%
          </span>
        </div>
        {cell.caption ? (
          <div className="truncate text-[9.5px] leading-tight text-[var(--color-text-secondary)]">
            {cell.caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SummaryPage() {
  const [selectedState, setSelectedState] = useState<StateFilter>(() =>
    defaultStateForRole(),
  );

  const stateForCards: StateName | null =
    selectedState === 'All - Delhi NCR' ? null : (selectedState as StateName);

  const aggregate = stateForCards
    ? {
        title: stateForCards.toUpperCase(),
        subtitle: `Overall status across all initiatives in ${stateForCards}`,
      }
    : {
        title: 'DELHI NCR',
        subtitle: 'Overall status across all four states',
      };

  const cells = useMemo(
    () => buildAggregateCells(stateForCards),
    [stateForCards],
  );

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ backgroundColor: SURFACE }}
    >
      <TopBar activePage="summary" pageTitle="SUMMARY PAGE" />

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-4 p-5 pb-3">
            <h1 className="sr-only">{aggregate.title}</h1>

            <div className="flex items-center gap-3">
              <label
                htmlFor="state-select"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
              >
                State
              </label>
              <div className="relative">
                <select
                  id="state-select"
                  value={selectedState}
                  onChange={(e) =>
                    setSelectedState(e.target.value as StateFilter)
                  }
                  className="appearance-none rounded-md border border-[var(--color-border)] bg-white py-1.5 pl-3 pr-9 text-[13px] font-semibold text-[var(--color-navy)] shadow-sm focus:border-[var(--color-blue-link)] focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-link)]/30"
                >
                  {STATE_FILTER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              </div>
            </div>

            <AggregateBar
              title={aggregate.title}
              subtitle={aggregate.subtitle}
              cells={cells}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {INITIATIVES.map((init) => (
                <InitiativeCard
                  key={init.slug}
                  initiative={init}
                  selectedState={stateForCards}
                />
              ))}
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--color-border)] bg-white px-5 py-2.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Completion bands
            </span>
            <CompletionThresholdsLegend />
          </div>
        </footer>
      </main>
    </div>
  );
}
