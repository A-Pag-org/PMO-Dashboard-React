// FILE: src/pages/DetailPage.tsx
// PURPOSE: Detailed View (spec §4) — split panel with map (LHS) and
//          Outcome / Progress / Readiness metric lists (RHS).
//
// Spec rules implemented here:
//   §4.1  — initiative pre-selected via ?p=, switching the metric on
//           the right re-renders the map.
//   §4.3  — map geography & boundary rules tied to area filter.
//   §4.4  — view-toggle availability by area level.
//   §4.5  — map display by metric format:
//             X/Y standard     → bubbles tinted Red/Yellow/Green by band
//             X/Y inverse      → bubbles tinted with reversed bands
//             Xx               → raw value bubbles, no color
//             Y/N              → big Y (green) / N (red) bubbles
//             Central-level    → map greyed; only the centre bubble +
//                                an explanatory banner are shown
//
// Filters live in the SidePanel drawer and are persisted in URL
// query params via useDetailFilters.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Bus,
  Calendar,
  Fuel,
  Landmark,
  Database,
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import MetricCard from '@/components/ui/MetricCard';
import DelhiNCRMap, { STATE_BUBBLE_POSITIONS } from '@/components/maps/DelhiNCRMap';
import { cn, getColorBand, getCompletionPercentage } from '@/lib/utils';
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

// State-share weights used to fan a metric's NCR-level total out across
// the four states for the map. Roughly proportional to population share
// inside the NCR window. Used for non-primary metrics where we don't
// have hand-curated per-state data.
const STATE_WEIGHTS: Record<string, number> = {
  Delhi: 0.40,
  'Uttar Pradesh': 0.25,
  Haryana: 0.22,
  Rajasthan: 0.13,
};

/**
 * Synthesizes per-state values for the selected metric. For X/Y metrics
 * we split target + achieved by STATE_WEIGHTS so each state gets a
 * meaningful completion %. For Xx we split the count. For Y/N we
 * randomly assign Y/N per state from a deterministic seed (the metric
 * name) so the demo isn't jittery between renders.
 */
function buildMapDataForMetric(metric: Metric): MapDataPoint[] {
  const states = Object.keys(STATE_WEIGHTS);

  if (metric.format === 'Y/N') {
    // Deterministic per-state Y/N from metric-name hash + state index.
    // For demo purposes only — real data will replace this.
    let h = 0;
    for (const ch of metric.name) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return states.map((name, i) => {
      const isYes = ((h ^ i) & 1) === 1;
      return {
        name,
        value: isYes ? 1 : 0,
        onTrack: isYes,
        format: 'Y/N',
        label: isYes ? 'Y' : 'N',
      };
    });
  }

  if (metric.format === 'Xx') {
    const total = metric.achieved ?? 0;
    return states.map((name) => {
      const v = Math.round(total * STATE_WEIGHTS[name]);
      return {
        name,
        value: v,
        onTrack: true,
        format: 'Xx',
        label: v.toLocaleString('en-IN'),
      };
    });
  }

  // X/Y — split target and achieved across states, derive band per state.
  const total = metric.target ?? 0;
  const totalAchieved = metric.achieved ?? 0;
  return states.map((name) => {
    const t = Math.max(1, Math.round(total * STATE_WEIGHTS[name]));
    const a = Math.round(totalAchieved * STATE_WEIGHTS[name]);
    const pct = getCompletionPercentage(t, a);
    const band = getColorBand(pct, metric.isInverse ?? false);
    return {
      name,
      value: pct,
      onTrack: band === 'GREEN',
      format: 'X/Y',
      band,
      label: `${a.toLocaleString('en-IN')} / ${t.toLocaleString('en-IN')} (${pct}%)`,
    };
  });
}

export default function DetailPage() {
  const { area, initiativeName, setArea } = useDetailFilters();

  const [viewLevel, setViewLevel] = useState<ViewLevel>('state');
  const [selectedMetricByInitiative, setSelectedMetricByInitiative] = useState<
    Record<string, string>
  >({});

  // Auto-reset view level when area filter changes.
  const prevAreaRef = useRef(area);
  useEffect(() => {
    const prev = prevAreaRef.current;
    prevAreaRef.current = area;
    const areaChanged =
      prev.state !== area.state ||
      prev.city !== area.city ||
      prev.rto !== area.rto;
    if (!areaChanged) return;

    if (area.city) setViewLevel('rto');
    else if (area.state) setViewLevel('city');
    else setViewLevel('state');
  }, [area]);

  const currentInit =
    INITIATIVES.find((i) => i.name === initiativeName) ?? INITIATIVES[0];
  const summaryData = MOCK_SUMMARY_BY_INITIATIVE[currentInit.slug];

  const outcomeMetrics  = currentInit.metrics.filter((m) => m.type === 'outcome');
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

  // Map data — view-level + format aware.
  const { mapData, rtoPositions, emptyHint } = useMemo(() => {
    if (isCentralLevelMetric || !selectedMetric) {
      return {
        mapData: [] as MapDataPoint[],
        rtoPositions: undefined,
        emptyHint: undefined,
      };
    }

    if (effectiveViewLevel === 'state') {
      // Use the per-metric synthesized state data so X/Y bubbles show
      // the right band and Xx/Y/N show the right format.
      const stateData = buildMapDataForMetric(selectedMetric);
      const filtered = area.state
        ? stateData.filter((d) => d.name === area.state)
        : stateData;
      return { mapData: filtered, rtoPositions: undefined, emptyHint: undefined };
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
        format: selectedMetric.format,
      }));
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

    // City view — use legacy MOCK_DETAIL_MAP_DATA but tag with the
    // selected metric's format so bubbles render consistently.
    let data: MapDataPoint[] = MOCK_DETAIL_MAP_DATA.map((d) => ({
      ...d,
      format: selectedMetric.format,
    }));
    if (area.state) {
      data = data.filter((d) => CITY_STATE_MAP[d.name] === area.state);
    }
    if (area.city) {
      data = data.filter((d) => d.name === area.city);
    }
    return { mapData: data, rtoPositions: undefined, emptyHint: undefined };
  }, [isCentralLevelMetric, effectiveViewLevel, area, selectedMetric]);

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

  // "See all data" button — carries the initiative forward (spec §4.1).
  const seeAllHref = `/dashboard/all-data?initiative=${encodeURIComponent(currentInit.name)}`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="detail" />

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
        <div className="ml-auto flex items-center gap-3">
          <Link
            to={seeAllHref}
            className="rounded-md bg-[var(--color-blue-link)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--color-blue-header)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            See all data →
          </Link>
        </div>
      </div>

      <main className="flex min-h-0 flex-1">
        <section
          className="relative flex min-h-0 w-1/2 flex-col border-r border-[var(--color-divider-dashed)] bg-white"
          aria-label="Map view"
        >
          <div className="flex shrink-0 items-center justify-center border-b border-[var(--color-border-table)] px-4 py-2">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              {selectedMetric?.name ?? currentInit.primaryMetric}
              {selectedMetric?.isInverse ? (
                <span className="ml-2 rounded bg-[var(--color-tl-red-bg)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-tl-red-text)]">
                  Inverse
                </span>
              ) : null}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2 px-4 py-2">
            <span className="rounded-md bg-[var(--color-accent)] px-2 py-0.5 text-2xs font-semibold text-[var(--color-ink)]">
              View toggle
            </span>
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

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-3">
            <div
              className={cn(
                'h-full w-full max-w-[560px]',
                isCentralLevelMetric && 'opacity-50 grayscale',
              )}
            >
              <DelhiNCRMap
                data={mapData}
                centerBubble={summaryData?.center ?? MOCK_DETAIL_CENTER_BUBBLE}
                positionOverrides={rtoPositions}
                emptyHint={emptyHint}
                onBubbleClick={(name) => {
                  if (isCentralLevelMetric) return;
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
                  if (area.city) {
                    setArea({ state: area.state, city: area.city, rto: name });
                  }
                }}
              />
            </div>

            {/* Central-metric banner overlay */}
            {isCentralLevelMetric ? (
              <div className="pointer-events-none absolute inset-x-4 top-2 flex items-start justify-center">
                <div className="pointer-events-auto flex max-w-[460px] items-start gap-2 rounded-md border border-[var(--color-border-blue)] bg-[var(--color-blue-pale)] px-3 py-2 shadow-sm">
                  <Info className="h-4 w-4 shrink-0 text-[var(--color-blue-link)]" aria-hidden />
                  <div className="text-xs text-[var(--color-text-primary)]">
                    <p className="font-semibold">This metric is tracked centrally.</p>
                    <p className="text-[var(--color-text-secondary)]">
                      Only the all-NCR aggregate is available — there is no
                      regional breakdown for {selectedMetric?.name}.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

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
                  format={m.format}
                  isInverse={m.isInverse}
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
                  format={m.format}
                  isInverse={m.isInverse}
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
                  format={m.format}
                  isInverse={m.isInverse}
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
