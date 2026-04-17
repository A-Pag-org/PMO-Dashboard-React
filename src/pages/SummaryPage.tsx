// FILE: src/pages/SummaryPage.tsx
// PURPOSE: Summary page — fits entirely within viewport, no scrolling
// DESIGN REF: Wireframe pages 7–8 of 13 (Summary Page 1/2 + 2/2)

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import BottomBar from '@/components/layout/BottomBar';
import InitiativeCard from '@/components/ui/InitiativeCard';
import ViewToggle from '@/components/ui/ViewToggle';
import DelhiNCRMap from '@/components/maps/DelhiNCRMap';
import DataTable from '@/components/ui/DataTable';
import { INITIATIVES, MOCK_SUMMARY_BY_INITIATIVE } from '@/lib/constants';
import { getCompletionPercentage } from '@/lib/utils';

const VIEW_OPTIONS = ['Map', 'Table'] as const;
type ViewMode = (typeof VIEW_OPTIONS)[number];

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export default function SummaryPage() {
  const initiatives = INITIATIVES;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('Map');
  const shouldReduceMotion = useReducedMotion();

  const selected = initiatives[selectedIndex];

  // TODO: replace with API call
  const summaryData =
    MOCK_SUMMARY_BY_INITIATIVE[selected.slug] ??
    MOCK_SUMMARY_BY_INITIATIVE['naya-safar-yojana'];

  const tableRows = summaryData.table.map((r) => ({
    label: r.state,
    target: r.target,
    achieved: r.achieved,
    completion: r.completion,
  }));

  const initiativeCompletions = initiatives
    .map((initiative) => {
      const primary = initiative.metrics[0];
      const completion = primary
        ? getCompletionPercentage(primary.target, primary.achieved)
        : 0;
      return {
        name: initiative.name,
        completion,
      };
    })
    .sort((a, b) => b.completion - a.completion);

  const topPerformer = initiativeCompletions[0];
  const needsAttention = initiativeCompletions[initiativeCompletions.length - 1];
  const overallCompletion =
    initiativeCompletions.length > 0
      ? Math.round(
          initiativeCompletions.reduce((sum, item) => sum + item.completion, 0) /
            initiativeCompletions.length,
        )
      : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="summary" pageTitle="SUMMARY PAGE" />

      <div className="shrink-0 bg-[var(--color-blue-header)] px-6 py-2">
        <h1 className="text-base font-bold text-[var(--color-text-white)]">
          Overall Delhi-NCR Performance
        </h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <section className="grid grid-cols-1 gap-2 border-b border-[var(--color-divider-dashed)] bg-[var(--color-surface-light)] px-2 py-2 md:grid-cols-3">
          <div className="rounded-md border border-[var(--color-border-table)] bg-white px-3 py-2">
            <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              What matters now
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--color-text-primary)]">
              Top performer: {topPerformer?.name ?? '-'}
            </p>
            <p className="text-sm font-bold text-[var(--color-success)]">
              {topPerformer?.completion ?? 0}% complete
            </p>
          </div>
          <div className="rounded-md border border-[var(--color-border-table)] bg-white px-3 py-2">
            <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Needs attention
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--color-text-primary)]">
              {needsAttention?.name ?? '-'}
            </p>
            <p className="text-sm font-bold text-[var(--color-danger)]">
              {needsAttention?.completion ?? 0}% complete
            </p>
          </div>
          <div className="rounded-md border border-[var(--color-border-table)] bg-white px-3 py-2">
            <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Overall completion
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--color-text-primary)]">
              Across all initiatives
            </p>
            <p className="text-sm font-bold text-[var(--color-navy)]">
              {overallCompletion}%
            </p>
          </div>
        </section>

        <main className="flex min-h-0 flex-1">
          {/* ── LEFT PANEL — Initiative Cards (≈38%) ── */}
          <div className="flex w-[38%] shrink-0 flex-col border-r border-[var(--color-divider-dashed)] p-2">
            <div className="grid h-full grid-cols-2 grid-rows-4 gap-2">
              {initiatives.map((init, i) => (
                <InitiativeCard
                  key={init.slug}
                  initiative={init}
                  selected={i === selectedIndex}
                  onClick={() => setSelectedIndex(i)}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL — Map / Table (≈62%) ── */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Initiative title banner + view toggle */}
            <div className="flex shrink-0 items-center justify-between bg-[var(--color-navy)] px-4 py-2">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-[var(--color-text-white)]">
                  {selected.name}
                </h2>
                <p className="mt-0.5 truncate text-xs text-[var(--color-blue-light)]">
                  {selected.primaryMetric}
                </p>
              </div>
              <ViewToggle
                options={VIEW_OPTIONS}
                value={viewMode}
                onChange={setViewMode}
              />
            </div>

            {/* Content area */}
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selected.slug}-${viewMode}`}
                  variants={shouldReduceMotion ? undefined : fadeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full w-full"
                >
                  {viewMode === 'Map' ? (
                    <div className="mx-auto h-full max-w-[480px]">
                      <DelhiNCRMap
                        data={summaryData.map}
                        centerBubble={summaryData.center}
                      />
                    </div>
                  ) : (
                    <DataTable
                      title={selected.primaryMetric}
                      geographyLabel="State"
                      rows={tableRows}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      <BottomBar showDetailedView showManualData />
    </div>
  );
}
