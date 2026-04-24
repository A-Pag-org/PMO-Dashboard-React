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

import { useEffect, useMemo, useRef, useState } from 'react';
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
import DelhiNCRMap, { STATE_BUBBLE_POSITIONS } from '@/components/maps/DelhiNCRMap';
import { cn } from '@/lib/utils';
import {
  INITIATIVES,
  STATES,
  CITY_STATE_MAP,
  RTO_OPTIONS_BY_CITY,
  MOCK_DETAIL_MAP_DATA,
  MOCK_DETAIL_CENTER_BUBBLE,
  MOCK_SUMMARY_BY_INITIATIVE,
} from '@/lib/constants';
import type { MapDataPoint, ViewLevel, Metric } from '@/lib/types';
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

  // Auto-reset view level to the coarsest available level when the area
  // filter changes, so the map never shows a stale/incompatible view.
  const prevAreaRef = useRef(area);
  useEffect(() => {
    const prev = prevAreaRef.current;
    prevAreaRef.current = area;
    const areaChanged =
      prev.state !== area.state ||
      prev.city !== area.city ||
      prev.rto !== area.rto;
    if (!areaChanged) return;

    if (area.city) {
      setViewLevel('rto');
    } else if (area.state) {
      setViewLevel('city');
    } else {
      setViewLevel('state');
    }
  }, [area]);

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
  const effectiveViewLevel = effectiveViewLabel.toLowerCase() as ViewLevel;

  // Map data is view-level aware:
  //   State → draw one bubble per state (from the per-initiative state
  //           summary), narrowed to the active state if one is picked.
  //   City  → draw city-level bubbles, narrowed by area.
  //   RTO   → draw synthesized RTO bubbles around the active city. When
  //           no city is picked, show nothing + an inline hint.
  const { mapData, rtoPositions, emptyHint } = useMemo(() => {
    if (isCentralLevelMetric) {
      return {
        mapData: [] as MapDataPoint[],
        rtoPositions: undefined,
        emptyHint: 'This metric is tracked centrally.',
      };
    }

    if (effectiveViewLevel === 'state') {
      const stateBubbles = summaryData?.map ?? [];
      const data = area.state
        ? stateBubbles.filter((d) => d.name === area.state)
        : stateBubbles;
      return { mapData: data, rtoPositions: undefined, emptyHint: undefined };
    }

    if (effectiveViewLevel === 'rto') {
      if (!area.city) {
        return {
          mapData: [] as MapDataPoint[],
          rtoPositions: undefined,
          emptyHint: 'Select a city to view RTOs.',
        };
      }
      const rtos = RTO_OPTIONS_BY_CITY[area.city] ?? [];
      const cityRow = MOCK_DETAIL_MAP_DATA.find((d) => d.name === area.city);
      const base = cityRow?.value ?? 0;
      const anchor = STATE_BUBBLE_POSITIONS[area.city] ?? { x: 185, y: 165 };
      const perRtoValue = Math.max(1, Math.round(base / Math.max(1, rtos.length)));
      const data: MapDataPoint[] = rtos.map((name) => ({
        name,
        value: perRtoValue,
        onTrack: cityRow?.onTrack ?? true,
      }));
      // Lay the RTO bubbles in a tight ring around the city anchor so
      // they visibly re-centre when the user switches the toggle.
      const positions: Record<string, { x: number; y: number }> = {};
      const radius = rtos.length > 4 ? 46 : 36;
      rtos.forEach((name, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(1, rtos.length) - Math.PI / 2;
        positions[name] = {
          x: anchor.x + radius * Math.cos(angle),
          y: anchor.y + radius * Math.sin(angle),
        };
      });
      return {
        mapData: data,
        rtoPositions: positions,
        emptyHint: rtos.length === 0 ? `No RTOs recorded for ${area.city}.` : undefined,
      };
    }

    // City view
    let data = MOCK_DETAIL_MAP_DATA;
    if (area.state) {
      data = data.filter((d) => CITY_STATE_MAP[d.name] === area.state);
    }
    if (area.city) {
      data = data.filter((d) => d.name === area.city);
    }
    return { mapData: data, rtoPositions: undefined, emptyHint: undefined };
  }, [isCentralLevelMetric, effectiveViewLevel, area, summaryData]);

  const areaLabel = area.rto
    ? area.rto
    : area.city
    ? area.city
    : area.state
    ? area.state
    : 'All Delhi-NCR';

  function handleSelectMetric(slug: string, name: string) {
    setSelectedMetricByInitiative((prev) => ({ ...prev, [slug]: name }));
  }

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
        <section
          className="flex min-h-0 w-1/2 flex-col border-r border-[var(--color-divider-dashed)] bg-white"
          aria-label="Map view"
        >
          <div className="flex shrink-0 items-center justify-center border-b border-[var(--color-border-table)] px-4 py-2">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              {selectedMetric?.name ?? currentInit.primaryMetric}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2 px-4 py-2">
            <span className="rounded-md bg-[var(--color-accent)] px-2 py-0.5 text-2xs font-semibold text-[var(--color-ink)]">
              View toggle
            </span>
            {/* Segmented control — uses role="radiogroup" for a11y */}
            <div
              className="inline-flex rounded-full bg-[var(--color-surface-light)] p-0.5"
              role="radiogroup"
              aria-label="Map view level"
            >
              {availableViewLevels.map((v) => {
                const isActive = v === effectiveViewLabel;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
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
                data={mapData}
                centerBubble={summaryData?.center ?? MOCK_DETAIL_CENTER_BUBBLE}
                positionOverrides={rtoPositions}
                emptyHint={emptyHint}
                onBubbleClick={(name) => {
                  const isState = STATES.includes(name as (typeof STATES)[number]);
                  if (isState) {
                    setArea({ state: name });
                    return;
                  }
                  const mappedState = CITY_STATE_MAP[name];
                  if (mappedState) {
                    setArea({ state: mappedState, city: name });
                    return;
                  }
                  // Name doesn't map to a known state or city — most likely
                  // a synthesized RTO bubble. Drill down to RTO under the
                  // currently-selected city.
                  if (area.city) {
                    setArea({ state: area.state, city: area.city, rto: name });
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* Right: metrics list */}
        <section
          className="flex min-h-0 w-1/2 flex-col overflow-y-auto bg-white"
          aria-label="Metrics panel"
        >
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
                  onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
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
                  onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
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
                  onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
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
