// FILE: src/pages/DetailPage.tsx
// PURPOSE: Detailed view — split panel with map (left) and
//          outcome/progress/readiness metrics (right).
//
// Filters (Area, Programme, See all data) live in the SidePanel drawer
// under the "Detailed Report" nav entry — they are backed by URL query
// params via useDetailFilters, so both the drawer and this page read from
// the same source of truth.
//
// Layout (top -> bottom):
//   1. Persistent TopBar (hamburger opens the drawer + filters)
//   2. Thin context line: "Showing: <area> · <programme>"
//   3. Main panel, split 50/50:
//        Left  — outcome-metric title, view-toggle pills, Delhi-NCR map
//        Right — Outcome / Progress / Readiness metrics lists
//   Navigation to other pages lives in the drawer.

import { useMemo, useState } from 'react';
import {
  Truck,
  Bus,
  Calendar,
  Fuel,
  Landmark,
  Database,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import MetricCard from '@/components/ui/MetricCard';
import DelhiNCRMap from '@/components/maps/DelhiNCRMap';
import { cn } from '@/lib/utils';
import {
  INITIATIVES,
  STATES,
  CITY_STATE_MAP,
  MOCK_DETAIL_MAP_DATA,
  MOCK_DETAIL_CENTER_BUBBLE,
  MOCK_SUMMARY_BY_INITIATIVE,
} from '@/lib/constants';
import type { ViewLevel, Metric } from '@/lib/types';
import { useDetailFilters } from '@/lib/useDetailFilters';

type ViewLabel = 'State' | 'City' | 'RTO';

function iconForMetric(m: Metric): LucideIcon {
  const n = m.name.toLowerCase();
  if (n.includes('truck')) return Truck;
  if (n.includes('bus')) return Bus;
  if (n.includes('event')) return Calendar;
  if (n.includes('outlet') || n.includes('fuel')) return Fuel;
  if (n.includes('psb') || n.includes('nbfc') || n.includes('onboard')) return Landmark;
  return Database;
}

export default function DetailPage() {
  const { area, initiativeName, setArea } = useDetailFilters();

  const [viewLevel, setViewLevel] = useState<ViewLevel>('state');
  const [selectedMetricByInitiative, setSelectedMetricByInitiative] = useState<
    Record<string, string>
  >({});

  const currentInit =
    INITIATIVES.find((i) => i.name === initiativeName) ?? INITIATIVES[0];
  const summaryData = MOCK_SUMMARY_BY_INITIATIVE[currentInit.slug];

  const outcomeMetrics = currentInit.metrics.filter((m) => m.type === 'outcome');
  const progressMetrics = currentInit.metrics.filter((m) => m.type === 'progress');
  const readinessMetrics = currentInit.metrics.filter((m) => m.type === 'readiness');
  const defaultSelectedMetricName =
    outcomeMetrics[0]?.name ?? currentInit.metrics[0]?.name ?? '';
  const selectedMetricName =
    selectedMetricByInitiative[currentInit.slug] ?? defaultSelectedMetricName;
  const selectedMetric =
    currentInit.metrics.find((m) => m.name === selectedMetricName) ??
    currentInit.metrics[0];
  const isCentralLevelMetric = selectedMetric?.geographyLevel === 'central';

  const availableViewLevels = useMemo<readonly ViewLabel[]>(() => {
    if (area.city) return ['RTO'];
    if (area.state) return ['City', 'RTO'];
    return ['State', 'City', 'RTO'];
  }, [area]);
  const currentViewLabel: ViewLabel =
    viewLevel === 'state' ? 'State' : viewLevel === 'city' ? 'City' : 'RTO';
  const effectiveViewLabel: ViewLabel = availableViewLevels.includes(currentViewLabel)
    ? currentViewLabel
    : availableViewLevels[0];

  const filteredMapData = useMemo(() => {
    if (isCentralLevelMetric) return [];
    let data = MOCK_DETAIL_MAP_DATA;
    if (area.state) {
      data = data.filter((d) => CITY_STATE_MAP[d.name] === area.state);
    }
    if (area.city) {
      data = data.filter((d) => d.name === area.city);
    }
    return data;
  }, [isCentralLevelMetric, area]);

  const areaLabel = area.rto
    ? area.rto
    : area.city
    ? area.city
    : area.state
    ? area.state
    : 'All Delhi-NCR';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="detail" />

      {/* ── Context line: tells users what they are looking at ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface-light)] px-5 py-2 text-xs">
        <span className="text-[var(--color-text-secondary)]">
          Showing:{' '}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {areaLabel}
          </span>{' '}
          ·{' '}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {currentInit.name}
          </span>
        </span>
        <span className="ml-auto text-[11px] text-[var(--color-text-muted)]">
          Change filters from the menu
        </span>
      </div>

      {/* ── Main split ── */}
      <main className="flex min-h-0 flex-1">
        {/* Left: map panel */}
        <section className="flex min-h-0 w-1/2 flex-col border-r border-[var(--color-divider-dashed)] bg-white">
          <div className="flex shrink-0 items-center justify-center border-b border-[var(--color-border-table)] px-4 py-2">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              {selectedMetric?.name ?? currentInit.primaryMetric}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2 px-4 py-2">
            <span className="rounded-md bg-[var(--color-accent)] px-2 py-0.5 text-2xs font-semibold text-[var(--color-ink)]">
              View toggle
            </span>
            <div className="inline-flex rounded-full bg-[var(--color-surface-light)] p-0.5">
              {availableViewLevels.map((v) => {
                const isActive = v === effectiveViewLabel;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setViewLevel(v.toLowerCase() as ViewLevel)}
                    className={cn(
                      'min-h-[28px] rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-[var(--color-text-muted)] text-white'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-3">
            <div className="h-full w-full max-w-[560px]">
              <DelhiNCRMap
                data={filteredMapData}
                centerBubble={summaryData?.center ?? MOCK_DETAIL_CENTER_BUBBLE}
                onBubbleClick={(name) => {
                  const isState = STATES.includes(name as (typeof STATES)[number]);
                  if (isState) {
                    setArea({ state: name });
                    return;
                  }
                  const mappedState = CITY_STATE_MAP[name];
                  if (mappedState) {
                    setArea({ state: mappedState, city: name });
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* Right: metrics list */}
        <section className="flex min-h-0 w-1/2 flex-col overflow-y-auto bg-white">
          <MetricGroup title="Outcome metrics">
            {outcomeMetrics.length > 0 ? (
              outcomeMetrics.map((m) => (
                <MetricCard
                  key={m.name}
                  icon={iconForMetric(m)}
                  label={m.name}
                  achieved={m.achieved}
                  target={m.target}
                  selected={selectedMetric?.name === m.name}
                  onSelect={() =>
                    setSelectedMetricByInitiative((prev) => ({
                      ...prev,
                      [currentInit.slug]: m.name,
                    }))
                  }
                />
              ))
            ) : (
              <EmptyRow label="No outcome metrics for this initiative" />
            )}
          </MetricGroup>

          {progressMetrics.length > 0 ? (
            <MetricGroup title="Progress metrics">
              {progressMetrics.map((m) => (
                <MetricCard
                  key={m.name}
                  icon={iconForMetric(m)}
                  label={m.name}
                  achieved={m.achieved}
                  target={m.target}
                  selected={selectedMetric?.name === m.name}
                  onSelect={() =>
                    setSelectedMetricByInitiative((prev) => ({
                      ...prev,
                      [currentInit.slug]: m.name,
                    }))
                  }
                />
              ))}
            </MetricGroup>
          ) : null}

          {readinessMetrics.length > 0 ? (
            <MetricGroup title="Readiness metrics">
              {readinessMetrics.map((m) => (
                <MetricCard
                  key={m.name}
                  icon={iconForMetric(m)}
                  label={m.name}
                  achieved={m.achieved}
                  target={m.target}
                  selected={selectedMetric?.name === m.name}
                  onSelect={() =>
                    setSelectedMetricByInitiative((prev) => ({
                      ...prev,
                      [currentInit.slug]: m.name,
                    }))
                  }
                />
              ))}
            </MetricGroup>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function MetricGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shrink-0">
      <div className="bg-[var(--color-navy)] px-4 py-1.5">
        <h3 className="text-center text-xs font-semibold text-white">{title}</h3>
      </div>
      <div className="flex flex-col gap-2 px-3 py-2">{children}</div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="py-3 text-center text-xs text-[var(--color-text-muted)]">
      {label}
    </p>
  );
}
