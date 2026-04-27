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
import DetailFilterStrip from '@/components/layout/DetailFilterStrip';
import MetricCard from '@/components/ui/MetricCard';
import DelhiNCRMap from '@/components/maps/DelhiNCRMap';
import { cn } from '@/lib/utils';
import {
  INITIATIVES,
  STATES,
  CITY_STATE_MAP,
  RTO_OPTIONS_BY_CITY,
  MOCK_DETAIL_MAP_DATA,
} from '@/lib/constants';
import {
  getMetricByState,
  getMetricValueForArea,
} from '@/lib/aggregation';
import { getInitiativeConfig } from '@/lib/initiatives';
import type { MapDataPoint, ViewLevel, Metric, MapCenterBubble } from '@/lib/types';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
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

function areaLabel(area: AreaFilterValue): string {
  if (area.rto)   return area.rto;
  if (area.city)  return area.city;
  if (area.state) return area.state;
  return 'Delhi-NCR';
}

/** Centre-bubble payload — delegates to the shared aggregation helper. */
function buildCenterBubble(
  metric: Metric | undefined,
  area: AreaFilterValue,
): MapCenterBubble {
  if (!metric) {
    return { value: 0, label: '—', subtitle: '' };
  }
  const isCentral = metric.geographyLevel === 'central';
  const label = isCentral ? 'Delhi-NCR (central)' : areaLabel(area);
  const agg = getMetricValueForArea(metric, isCentral ? {} : area, label);
  return {
    value: agg.format === 'X/Y' ? agg.pct : agg.achieved ?? 0,
    displayText: agg.displayText,
    label,
    subtitle: agg.subtitle,
  };
}

/**
 * Per-state map data for the selected metric. Returns one bubble per
 * state with format/band already filled in by the shared helper.
 */
function buildMapDataForMetric(metric: Metric): MapDataPoint[] {
  return getMetricByState(metric).map(({ name, agg }) => ({
    name,
    value: agg.format === 'X/Y' ? agg.pct : agg.achieved ?? 0,
    onTrack: agg.band === 'GREEN',
    format: agg.format,
    band: agg.band,
    label: agg.format === 'X/Y'
      ? `${(agg.achieved ?? 0).toLocaleString('en-IN')} / ${(agg.target ?? 0).toLocaleString('en-IN')} (${agg.pct}%)`
      : agg.displayText,
  }));
}

export default function DetailPage() {
  const {
    area,
    initiativeName,
    extras,
    setArea,
    setInitiativeName,
    setExtra,
  } = useDetailFilters();

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

  // Spec §4.3: centre bubble shows the aggregate for the FILTERED
  // geography (not always NCR), and reflects the SELECTED metric (not
  // just the initiative's primary).
  const centerBubble = useMemo(
    () => buildCenterBubble(selectedMetric, area),
    [selectedMetric, area],
  );

  // Spec §7 + §10: RTO only for Naya Safar, Toll only for Green
  // Contribution, ULB only for C&D-SCC. Other initiatives stop the
  // map drill-down at city level.
  const initiativeConfig = getInitiativeConfig(currentInit.slug);
  const supportsRto = initiativeConfig?.geographyLevels.includes('rto') ?? false;

  const availableViewLevels = useMemo<readonly ViewLabel[]>(() => {
    const rtoTail = supportsRto ? ['RTO' as const] : [];
    if (area.city) return supportsRto ? ['RTO'] : ['City'];
    if (area.state) return ['City', ...rtoTail];
    return ['State', 'City', ...rtoTail];
  }, [area, supportsRto]);

  const currentViewLabel: ViewLabel =
    viewLevel === 'state' ? 'State' : viewLevel === 'city' ? 'City' : 'RTO';
  const effectiveViewLabel: ViewLabel = availableViewLevels.includes(currentViewLabel)
    ? currentViewLabel
    : availableViewLevels[0];
  const effectiveViewLevel = effectiveViewLabel.toLowerCase() as ViewLevel;

  // Map data — view-level + format aware. Position is handled by
  // DelhiNCRMap based on the live projection (refits to area filter).
  const { mapData, emptyHint } = useMemo(() => {
    if (isCentralLevelMetric || !selectedMetric) {
      return { mapData: [] as MapDataPoint[], emptyHint: undefined };
    }

    if (effectiveViewLevel === 'state') {
      const stateData = buildMapDataForMetric(selectedMetric);
      const filtered = area.state
        ? stateData.filter((d) => d.name === area.state)
        : stateData;
      return { mapData: filtered, emptyHint: undefined };
    }

    if (effectiveViewLevel === 'rto') {
      if (!area.city) {
        return {
          mapData: [] as MapDataPoint[],
          emptyHint: 'Select a city to view RTOs.',
        };
      }
      const rtos = RTO_OPTIONS_BY_CITY[area.city] ?? [];
      const cityRow = MOCK_DETAIL_MAP_DATA.find((d) => d.name === area.city);
      const base = cityRow?.value ?? 0;
      const perRtoValue = Math.max(1, Math.round(base / Math.max(1, rtos.length)));
      const data: MapDataPoint[] = rtos.map((name) => ({
        name,
        value: perRtoValue,
        onTrack: cityRow?.onTrack ?? true,
        format: selectedMetric.format,
      }));
      return {
        mapData: data,
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
    return { mapData: data, emptyHint: undefined };
  }, [isCentralLevelMetric, effectiveViewLevel, area, selectedMetric]);

  function handleSelectMetric(slug: string, name: string) {
    setSelectedMetricByInitiative((prev) => ({ ...prev, [slug]: name }));
  }

  // Breadcrumb trail — every segment except the deepest one is a
  // button that resets the area filter to that level. Lets users
  // drill back up after they've drilled into a state / city / RTO,
  // which the SidePanel-only flow doesn't expose anywhere on the page.
  const breadcrumb: { label: string; onClick?: () => void }[] = [
    {
      label: 'All Delhi-NCR',
      onClick:
        area.state || area.city || area.rto ? () => setArea({}) : undefined,
    },
  ];
  // RTO segment is only meaningful when the active initiative supports
  // it (spec §10). Same gating will apply when toll/ulb segments are
  // added in future.
  const showRtoSegment = !!area.rto && supportsRto;
  if (area.state) {
    breadcrumb.push({
      label: area.state,
      onClick:
        area.city || showRtoSegment
          ? () => setArea({ state: area.state })
          : undefined,
    });
  }
  if (area.city) {
    breadcrumb.push({
      label: area.city,
      onClick: showRtoSegment
        ? () => setArea({ state: area.state, city: area.city })
        : undefined,
    });
  }
  if (showRtoSegment) {
    breadcrumb.push({ label: area.rto! });
  }

  // "See all data" button — carries the initiative forward (spec §4.1).
  const seeAllHref = `/dashboard/all-data?initiative=${encodeURIComponent(currentInit.name)}`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="detail" />

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface-light)] px-5 py-2 text-xs">
        <nav
          aria-label="Geography breadcrumb"
          className="flex flex-wrap items-center gap-1"
        >
          <span className="text-[var(--color-text-secondary)]">Showing:</span>
          {breadcrumb.map((seg, i) => (
            <span key={`${i}-${seg.label}`} className="flex items-center gap-1">
              {i > 0 ? (
                <span className="text-[var(--color-text-muted)]" aria-hidden>
                  ›
                </span>
              ) : null}
              {seg.onClick ? (
                <button
                  type="button"
                  onClick={seg.onClick}
                  className="rounded px-1 py-0.5 font-semibold text-[var(--color-blue-link)] hover:bg-[var(--color-blue-pale)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {seg.label}
                </button>
              ) : (
                <span
                  className="px-1 font-semibold text-[var(--color-text-primary)]"
                  aria-current="page"
                >
                  {seg.label}
                </span>
              )}
            </span>
          ))}
          <span className="ml-2 text-[var(--color-text-muted)]" aria-hidden>
            ·
          </span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            {currentInit.name}
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            to={seeAllHref}
            className="rounded-md bg-[var(--color-blue-link)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--color-blue-header)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            See all data →
          </Link>
        </div>
      </div>

      <DetailFilterStrip
        area={area}
        initiativeName={initiativeName}
        extras={extras}
        onAreaChange={setArea}
        onInitiativeChange={setInitiativeName}
        onExtraChange={setExtra}
      />

      <main className="flex min-h-0 flex-1">
        <section
          className="relative flex min-h-0 w-1/2 flex-col border-r border-[var(--color-divider-dashed)] bg-white"
          aria-label="Map view"
        >
          <div className="flex shrink-0 items-center justify-center gap-2 border-b border-[var(--color-border-table)] px-4 py-2">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  selectedMetric?.type === 'outcome'
                    ? 'var(--color-accent)'
                    : selectedMetric?.type === 'progress'
                    ? 'var(--color-blue-link)'
                    : 'var(--color-text-muted)',
              }}
              aria-hidden
            />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {selectedMetric?.type ?? 'metric'}
            </span>
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
                'h-full w-full',
                isCentralLevelMetric && 'opacity-50 grayscale',
              )}
            >
              <DelhiNCRMap
                data={mapData}
                centerBubble={centerBubble}
                area={area}
                supportsRto={supportsRto}
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
                  // Sub-city click — only valid when the initiative
                  // supports the RTO level (spec §10: RTO only for
                  // Naya Safar). Other initiatives stop at city.
                  if (area.city && supportsRto) {
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
          <MetricGroup
            title="Outcome metrics"
            count={outcomeMetrics.length}
            emphasis
            defaultOpen
          >
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
                  prominent
                  selected={selectedMetric?.name === m.name}
                  onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
                />
              ))
            ) : (
              <EmptyRow label="No outcome metrics for this initiative" />
            )}
          </MetricGroup>

          {progressMetrics.length > 0 ? (
            <MetricGroup
              title="Progress metrics"
              count={progressMetrics.length}
              defaultOpen
            >
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
            <MetricGroup
              title="Readiness metrics"
              count={readinessMetrics.length}
              defaultOpen={false}
            >
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

/**
 * Collapsible metric-group section. Spec §4.1 implies Outcome is the
 * headline (default-selected first row); Progress is supporting; Readiness
 * is the lowest-density (mostly Y/N setup flags) — collapsed by default.
 */
function MetricGroup({
  title,
  count,
  defaultOpen = true,
  emphasis = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  /** Outcome group gets a thin accent rule above for visual prominence. */
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = `metric-group-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div
      className={cn(
        'shrink-0',
        emphasis && 'border-t-2 border-[var(--color-accent)]',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={headingId}
        className="flex w-full items-center justify-between bg-[var(--color-navy)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-navy-mid)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset"
      >
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 transition-transform',
              open && 'rotate-90',
            )}
            aria-hidden
          >
            ›
          </span>
          {title}
          <span className="rounded bg-white/15 px-1.5 py-px text-[10px] font-bold tabular-nums">
            {count}
          </span>
        </span>
      </button>
      {open ? (
        <div id={headingId} className="flex flex-col gap-2 px-3 py-2">
          {children}
        </div>
      ) : null}
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
