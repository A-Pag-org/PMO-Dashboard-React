// FILE: src/pages/SummaryPage.tsx
// PURPOSE: Summary page (spec §3) — landing screen, 8 initiative tiles.
//
// Single global filter: State. Changing it re-renders all 8 tiles.
// All 8 tiles render at full colour. (The earlier per-user "highlighted
// set" greying behaviour from spec §3.1 was dropped per stakeholder
// feedback during the interim refinements review — every initiative is
// now equally prominent on the landing page.)
// Clicking any tile navigates to the Detailed View pre-filtered for
// that initiative (carried via the `?p=…` query param).

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import InitiativeCard from '@/components/ui/InitiativeCard';
import CompletionThresholdsLegend from '@/components/ui/CompletionThresholdsLegend';
import { INITIATIVES, STATES } from '@/lib/constants';
import type { StateName } from '@/lib/constants';
import { getCurrentRole, isDelhiOnlyRole } from '@/lib/auth';

const STATE_FILTER_OPTIONS = ['All - Delhi NCR', ...STATES] as const;
type StateFilter = (typeof STATE_FILTER_OPTIONS)[number];

/**
 * SUMMARY_002 — every user always has a state selected. Delhi-only roles
 * (DPCC / CS – Delhi) default to "Delhi"; everyone else defaults to the
 * "All - Delhi NCR" sentinel. The dropdown never offers a blank value.
 */
function defaultStateForRole(): StateFilter {
  return isDelhiOnlyRole(getCurrentRole()) ? 'Delhi' : 'All - Delhi NCR';
}

export default function SummaryPage() {
  const [selectedState, setSelectedState] = useState<StateFilter>(() =>
    defaultStateForRole(),
  );

  // null means "All of Delhi-NCR".
  const stateForCards: StateName | null =
    selectedState === 'All - Delhi NCR' ? null : (selectedState as StateName);

  const headerLabel = stateForCards
    ? `${stateForCards} — State Performance`
    : 'Overall Delhi-NCR Performance';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="summary" pageTitle="SUMMARY PAGE" />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[var(--color-blue-header)] px-5 py-2">
        <h1 className="text-base font-bold text-[var(--color-text-white)]">
          {headerLabel}
        </h1>
        <FilterDropdown
          label="State"
          value={selectedState}
          onChange={(v) => setSelectedState(v as StateFilter)}
          options={STATE_FILTER_OPTIONS}
        />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-light)] p-4">
        <div className="mx-auto flex h-full max-w-[1200px] flex-col">
          <div
            className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            style={{ gridAutoRows: 'minmax(220px, 1fr)' }}
          >
            {INITIATIVES.map((init) => (
              <InitiativeCard
                key={init.slug}
                initiative={init}
                selectedState={stateForCards}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <CompletionThresholdsLegend />
          </div>
        </div>
      </main>
    </div>
  );
}

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
