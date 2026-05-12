// FILE: src/pages/SummaryPage.tsx
// PURPOSE: Summary (landing) page — initiative tiles in a 3-column grid.
// DESIGN REF: Figma "Air-Pollution / Final for review" (Frame 45-12763).
//
// Layout:
//   - Top app bar (TopBar).
//   - Blue sub-header bar with the state selector pill.
//   - Main grid of initiative tiles (3 cols on lg, 2 on md, 1 on sm).
//   - Footer with the completion-threshold legend on the right.

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

function defaultStateForRole(): StateFilter {
  return isDelhiOnlyRole(getCurrentRole()) ? 'Delhi' : 'All - Delhi NCR';
}

export default function SummaryPage() {
  const [selectedState, setSelectedState] = useState<StateFilter>(() =>
    defaultStateForRole(),
  );

  const stateForCards: StateName | null =
    selectedState === 'All - Delhi NCR' ? null : (selectedState as StateName);

  const headerLabel = stateForCards
    ? `${stateForCards} — State Performance`
    : 'Overall Delhi-NCR Performance';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F7F7]">
      <TopBar activePage="summary" pageTitle="SUMMARY PAGE" />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[#2E4B8F] px-8 py-3">
        <h1 className="text-sm font-bold text-white">{headerLabel}</h1>
        <FilterDropdown
          label="State"
          value={selectedState}
          onChange={(v) => setSelectedState(v as StateFilter)}
          options={STATE_FILTER_OPTIONS}
        />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {INITIATIVES.map((init) => (
              <InitiativeCard
                key={init.slug}
                initiative={init}
                selectedState={stateForCards}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="flex shrink-0 items-center justify-end border-t border-[#E2E2EA] bg-white px-8 py-3">
        <CompletionThresholdsLegend />
      </footer>
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
          className="appearance-none rounded-full border border-white/30 bg-white/95 px-4 py-1.5 pr-8 text-xs font-semibold text-[#2E4B8F] shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label={`${label} filter`}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#2E4B8F]"
          aria-hidden
        />
      </div>
    </label>
  );
}
