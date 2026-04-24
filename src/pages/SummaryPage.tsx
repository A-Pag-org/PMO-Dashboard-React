// FILE: src/pages/SummaryPage.tsx
// PURPOSE: Summary page with two filters — State + Programme.
//
// The two filters together pick one of four views:
//   1. All states, All programmes        → 8 initiative cards (NCR-wide).
//   2. <State>,   All programmes         → 8 initiative cards (state view).
//   3. All states, <Programme>           → geography-wise — one card per
//                                          state showing that programme.
//   4. <State>,   <Programme>            → a single focused card for that
//                                          programme in that state.
//
// Navigation to Detailed Report / Enter Data lives in the SidePanel drawer.

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import InitiativeCard from '@/components/ui/InitiativeCard';
import GeographyCard from '@/components/ui/GeographyCard';
import {
  INITIATIVES,
  MOCK_SUMMARY_BY_INITIATIVE,
  STATES,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { StateName } from '@/lib/constants';

// Explicit const tuple so TypeScript knows every element's literal type.
const STATE_FILTER_OPTIONS = ['All - Delhi NCR', ...STATES] as const;
type StateFilter = (typeof STATE_FILTER_OPTIONS)[number];

const ALL_PROGRAMMES = 'All programmes' as const;
const PROGRAMME_OPTIONS = [ALL_PROGRAMMES, ...INITIATIVES.map((i) => i.name)] as const;
type ProgrammeFilter = (typeof PROGRAMME_OPTIONS)[number];

export default function SummaryPage() {
  const [selectedState, setSelectedState] = useState<StateFilter>('All - Delhi NCR');
  const [selectedProgramme, setSelectedProgramme] =
    useState<ProgrammeFilter>(ALL_PROGRAMMES);

  // null means "All of Delhi-NCR" — typed as StateName | null so callers
  // that need a real state name get proper type safety.
  const stateForCards: StateName | null =
    selectedState === 'All - Delhi NCR'
      ? null
      : (selectedState as StateName);

  const programmeSelected = selectedProgramme !== ALL_PROGRAMMES;

  const selectedInitiative = useMemo(
    () =>
      programmeSelected
        ? INITIATIVES.find((i) => i.name === selectedProgramme) ?? null
        : null,
    [selectedProgramme, programmeSelected],
  );

  const headerLabel = useMemo(() => {
    if (!programmeSelected) {
      return stateForCards
        ? `${stateForCards} — State Performance`
        : 'Overall Delhi-NCR Performance';
    }
    if (stateForCards) {
      return `${selectedInitiative?.name ?? selectedProgramme} — ${stateForCards}`;
    }
    return `${selectedInitiative?.name ?? selectedProgramme} — Geography-wise Performance`;
  }, [programmeSelected, stateForCards, selectedInitiative, selectedProgramme]);

  // Geography rows for the selected programme (used only in programme mode).
  const geographyRows = useMemo(() => {
    if (!selectedInitiative) return [];
    const summary = MOCK_SUMMARY_BY_INITIATIVE[selectedInitiative.slug];
    if (!summary) return [];
    const onTrackByState: Record<string, boolean> = Object.fromEntries(
      summary.map.map((m) => [m.name, m.onTrack]),
    );
    let rows = summary.table.map((r) => ({
      row: r,
      onTrack: onTrackByState[r.state],
    }));
    if (stateForCards) rows = rows.filter((r) => r.row.state === stateForCards);
    return rows;
  }, [selectedInitiative, stateForCards]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="summary" pageTitle="SUMMARY PAGE" />

      {/* ── Section header with filter controls ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[var(--color-blue-header)] px-5 py-2">
        <h1 className="text-base font-bold text-[var(--color-text-white)]">
          {headerLabel}
        </h1>

        <div className="flex items-center gap-3">
          <FilterDropdown
            label="State"
            value={selectedState}
            onChange={(v) => setSelectedState(v as StateFilter)}
            options={STATE_FILTER_OPTIONS}
          />
          <FilterDropdown
            label="Programme"
            value={selectedProgramme}
            onChange={(v) => setSelectedProgramme(v as ProgrammeFilter)}
            options={PROGRAMME_OPTIONS}
          />
        </div>
      </div>

      {/* ── Card grid — branches on programme selection ── */}
      <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-light)] p-4">
        {programmeSelected && selectedInitiative ? (
          geographyRows.length > 0 ? (
            <div
              className={cn(
                'mx-auto grid h-full max-w-[1200px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4',
                geographyRows.length === 1 && 'lg:grid-cols-1',
              )}
              style={{ gridAutoRows: 'minmax(200px, 1fr)' }}
            >
              {geographyRows.map(({ row, onTrack }) => (
                <GeographyCard
                  key={row.state}
                  initiative={selectedInitiative}
                  row={row}
                  onTrack={onTrack}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No geography data"
              body={
                stateForCards
                  ? `No ${stateForCards} data is available for ${selectedInitiative.name} yet.`
                  : `No state-wise data is available for ${selectedInitiative.name} yet.`
              }
            />
          )
        ) : (
          <div
            className="mx-auto grid h-full max-w-[1200px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            style={{ gridAutoRows: 'minmax(180px, 1fr)' }}
          >
            {INITIATIVES.map((init) => (
              <InitiativeCard
                key={init.slug}
                initiative={init}
                selectedState={stateForCards}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Local UI bits ────────────────────────────────────────────────────

interface FilterDropdownProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}

function FilterDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
}: FilterDropdownProps<T>) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-white/90">
      <span className="hidden uppercase tracking-wide text-white/70 sm:inline">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="appearance-none rounded border border-white/30 bg-white px-3 py-1 pr-7 text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          aria-label={`${label} filter`}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]"
          aria-hidden
        />
      </div>
    </label>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex h-full max-w-[1200px] items-center justify-center">
      <div className="max-w-md rounded-md border border-dashed border-[var(--color-border-table)] bg-white px-6 py-8 text-center">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{body}</p>
      </div>
    </div>
  );
}
