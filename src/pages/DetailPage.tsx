// FILE: src/pages/DetailPage.tsx
// PURPOSE: Detailed view — cascading Area filter + Initiative selector, split
//          panel with map (left) and outcome/progress/readiness metrics (right).
// DESIGN REF: Wireframe pages 8-9 of Impact_Dashboard_Structure_16_Apr.pdf
//
// Layout (top -> bottom):
//   1. Persistent TopBar + orange "DETAILED VIEW (1/2)" pill
//   2. Filter strip (navy): [Area filter] ...... [Initiative] ...... [See all data]
//   3. Main panel, split 50/50:
//        Left  — outcome-metric title, view-toggle pills (State/City/RTO),
//                Delhi-NCR map
//        Right — "Outcome metrics" (then "Progress metrics", then "Readiness
//                metrics") lists
//   4. Footnote matching the PDF + BottomBar with "Enter data"

import { useMemo, useState } from 'react';
import {
  Truck,
  Bus,
  Calendar,
  Fuel,
  Landmark,
  Database,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import BottomBar from '@/components/layout/BottomBar';
import AreaFilter from '@/components/ui/AreaFilter';
import type { AreaSelection } from '@/components/ui/AreaFilter';
import MetricCard from '@/components/ui/MetricCard';
import DelhiNCRMap from '@/components/maps/DelhiNCRMap';
import { cn } from '@/lib/utils';
import {
  INITIATIVES,
  STATES,
  CITY_STATE_MAP,
  RTO_OPTIONS_BY_CITY,
  MOCK_DETAIL_MAP_DATA,
  MOCK_DETAIL_CENTER_BUBBLE,
  MOCK_SUMMARY_BY_INITIATIVE,
  UPLOAD_CITY_OPTIONS_BY_STATE,
} from '@/lib/constants';
import type { ViewLevel, Metric } from '@/lib/types';

type ViewLabel = 'State' | 'City' | 'RTO';

/** Pick a contextual icon for each metric, falling back to a Database glyph. */
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
  const [selectedInitiativeName, setSelectedInitiativeName] = useState(
    INITIATIVES[0].name,
  );
  const [area, setArea] = useState<AreaSelection>({});
  const [viewLevel, setViewLevel] = useState<ViewLevel>('state');
  const [selectedMetricByInitiative, setSelectedMetricByInitiative] = useState<
    Record<string, string>
  >({});
  const [initiativeOpen, setInitiativeOpen] = useState(false);

  const currentInit =
    INITIATIVES.find((i) => i.name === selectedInitiativeName) ?? INITIATIVES[0];
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

  // View-toggle options adapt to the Area selection, per the PDF note:
  //   "selecting Uttar Pradesh (All) shows only 'City' and 'RTO' views"
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
  const effectiveViewLevel = effectiveViewLabel.toLowerCase() as ViewLevel;

  function onAreaChange(next: AreaSelection) {
    setArea(next);
    if (next.city) {
      setViewLevel('rto');
    } else if (next.state) {
      setViewLevel('city');
    } else {
      setViewLevel('state');
    }
  }

  // The wireframe map always shows city-level bubbles; the view toggle only
  // affects how the underlying data rolls up in the detail / all-data tables.
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar
        activePage="detail"
        pageTitle="DETAILED VIEW (1/2)"
        showBackToSummary
      />

      {/* ── Filter strip ── */}
      <div className="flex shrink-0 items-center gap-3 bg-[var(--color-navy)] px-4 py-2">
        <AreaFilter
          value={area}
          onChange={onAreaChange}
          states={STATES}
          citiesByState={UPLOAD_CITY_OPTIONS_BY_STATE}
          rtosByCity={RTO_OPTIONS_BY_CITY}
        />

        {/* Initiative selector — centred pill */}
        <div className="relative mx-auto">
          <button
            type="button"
            onClick={() => setInitiativeOpen((v) => !v)}
            aria-expanded={initiativeOpen}
            aria-haspopup="listbox"
            className={cn(
              'flex min-h-[36px] items-center gap-2 rounded-md bg-[var(--color-blue-link)] px-4 py-1.5',
              'text-sm font-semibold text-white shadow-sm',
              'hover:bg-[var(--color-blue-light)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy)]',
            )}
          >
            {selectedInitiativeName}
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                initiativeOpen && 'rotate-180',
              )}
            />
          </button>
          {initiativeOpen ? (
            <ul
              role="listbox"
              className="absolute left-1/2 top-full z-50 mt-1 min-w-[220px] -translate-x-1/2 overflow-hidden rounded-md border border-[var(--color-border-table)] bg-white shadow-lg"
            >
              {INITIATIVES.map((i) => (
                <li key={i.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInitiativeName(i.name);
                      setInitiativeOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors',
                      i.name === selectedInitiativeName
                        ? 'bg-[var(--color-blue-pale)] font-semibold text-[var(--color-blue-link)]'
                        : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-light)]',
                    )}
                  >
                    {i.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* See all data */}
        <Link
          to="/dashboard/all-data"
          className={cn(
            'flex min-h-[36px] items-center gap-2 rounded-md bg-white px-3 py-1 text-sm font-medium text-[var(--color-text-primary)] shadow-sm',
            'border border-[var(--color-border-table)]',
            'hover:bg-[var(--color-blue-pale)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy)]',
          )}
        >
          <Database className="h-4 w-4 text-[var(--color-blue-link)]" />
          See all data
        </Link>
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
                    onAreaChange({ state: name });
                    return;
                  }
                  const mappedState = CITY_STATE_MAP[name];
                  if (mappedState) {
                    onAreaChange({ state: mappedState, city: name });
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

      <BottomBar showDetailedView={false} showAllDataView={false} showManualData />
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
