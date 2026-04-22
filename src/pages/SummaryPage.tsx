// FILE: src/pages/SummaryPage.tsx
// PURPOSE: Summary page — 8 initiative cards in a 2×4 grid, with state selector
// DESIGN REF: Wireframe page 7 of Impact_Dashboard_Structure_16_Apr.pdf
//
// Layout (top → bottom):
//   1. Persistent TopBar (hamburger opens the SidePanel nav drawer)
//   2. "Overall Delhi-NCR Performance" blue header with State dropdown on right
//   3. Grid of 8 initiative cards (2 rows × 4 columns)
//
// Navigation to Detailed Report / Enter Data lives in the SidePanel drawer,
// so no persistent BottomBar is needed here.

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import InitiativeCard from '@/components/ui/InitiativeCard';
import { INITIATIVES, STATES } from '@/lib/constants';

const STATE_FILTER_OPTIONS = ['All - Delhi NCR', ...STATES] as const;
type StateFilter = (typeof STATE_FILTER_OPTIONS)[number];

export default function SummaryPage() {
  const [selectedState, setSelectedState] = useState<StateFilter>('All - Delhi NCR');
  // `null` means NCR-wide; otherwise a specific state name.
  const stateForCards: string | null =
    selectedState === 'All - Delhi NCR' ? null : selectedState;
  const headerLabel =
    selectedState === 'All - Delhi NCR'
      ? 'Overall Delhi-NCR Performance'
      : `${selectedState} — State Performance`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="summary" pageTitle="SUMMARY PAGE" />

      {/* ── Section header with State dropdown ── */}
      <div className="flex shrink-0 items-center justify-between bg-[var(--color-blue-header)] px-5 py-2">
        <h1 className="text-base font-bold text-[var(--color-text-white)]">
          {headerLabel}
        </h1>
        <label className="flex items-center gap-2 text-xs font-medium text-white/90">
          <span className="sr-only">State filter</span>
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value as StateFilter)}
              className="appearance-none rounded border border-white/30 bg-white px-3 py-1 pr-7 text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              aria-label="State filter"
            >
              {STATE_FILTER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]"
              aria-hidden
            />
          </div>
        </label>
      </div>

      {/* ── 2 × 4 grid of initiative cards ── */}
      <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-light)] p-4">
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
      </main>
    </div>
  );
}
