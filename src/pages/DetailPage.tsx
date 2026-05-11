// FILE: src/pages/DetailPage.tsx
// PURPOSE: Detailed View (spec §4) — three-column layout.
//          · Left rail   : filters (Initiative, State, City, RTO, extras,
//                          time range, State/City/RTO view toggle)
//          · Centre      : metric header + See-trend toggle + map canvas
//          · Right rail  : single header with Ranking / Metrics tabs
//
// Design intent (Jony-Ive-style clarity): one filter surface, one map,
// one inspector. All scoping controls live in the left rail; the centre
// column holds nothing but the metric title, the See-trend toggle, and
// the map itself.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Bus,
  Calendar,
  Fuel,
  Landmark,
  Database,
  Info,
  TrendingUp,
  Trophy,
  LayoutGrid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DetailFilterRail from '@/components/layout/DetailFilterRail';
import type { TimeRange, ViewLabel } from '@/components/layout/DetailFilterRail';
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
import { getCurrentRole, isDelhiOnlyRole } from '@/lib/auth';

type RightTab = 'ranking' | 'metrics';

const TIME_RANGES: readonly TimeRange[] = ['1M', '3M', '6M', '12M', 'All'] as const;

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

function buildCenterBubble(
  metric: Metric | undefined,
  area: AreaFilterValue,
): MapCenterBubble {
  if (!metric) return { value: 0, label: '—', subtitle: '' };
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

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function buildMapDataForMetricByCity(metric: Metric): MapDataPoint[] {
  return Object.entries(CITY_STATE_MAP).map(([city, state]) => {
    const agg = getMetricValueForArea(metric, { state, city }, city);
    if (agg.format === 'X/Y') {
      const noise = (hash01(`${city}|${metric.name}`) - 0.5) * 70;
      const pct = Math.max(0, Math.min(100, Math.round(agg.pct + noise)));
      const target = agg.target ?? 0;
      const achieved = Math.round((target * pct) / 100);
      const band = pct < 30 ? 'RED' : pct < 60 ? 'YELLOW' : 'GREEN';
      return {
        name: city,
        value: pct,
        onTrack: band === 'GREEN',
        format: 'X/Y' as const,
        band: metric.isInverse
          ? band === 'GREEN'
            ? 'RED'
            : band === 'RED'
            ? 'GREEN'
            : 'YELLOW'
          : band,
        label: `${achieved.toLocaleString('en-IN')} / ${target.toLocaleString('en-IN')} (${pct}%)`,
      };
    }
    return {
      name: city,
      value: agg.achieved ?? 0,
      onTrack: agg.band === 'GREEN',
      format: agg.format,
      band: agg.band,
      label: agg.displayText,
    };
  });
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
  const [rightTab, setRightTab] = useState<RightTab>('metrics');
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [showTrend, setShowTrend] = useState(false);
  const role = getCurrentRole();

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

  const centerBubble = useMemo(
    () => buildCenterBubble(selectedMetric, area),
    [selectedMetric, area],
  );

  const initiativeConfig = getInitiativeConfig(currentInit.slug);
  const supportsRto = initiativeConfig?.geographyLevels.includes('rto') ?? false;

  const delhiOnlyRole = isDelhiOnlyRole(role);
  const isAtIndividualRto = !!area.rto;

  const availableViewLevels = useMemo<readonly ViewLabel[]>(() => {
    if (isAtIndividualRto) return [] as readonly ViewLabel[];
    if (delhiOnlyRole) {
      const isDelhiArea = area.state === 'Delhi' || area.city === 'Delhi' || (!area.state && !area.city);
      return supportsRto && isDelhiArea ? (['RTO'] as const) : ([] as readonly ViewLabel[]);
    }
    const rtoTail = supportsRto ? ['RTO' as const] : [];
    if (area.city) return supportsRto ? ['RTO'] : ['City'];
    if (area.state) return ['City', ...rtoTail];
    return ['State', 'City', ...rtoTail];
  }, [area, supportsRto, delhiOnlyRole, isAtIndividualRto]);

  useEffect(() => {
    if (availableViewLevels.length === 0) return;
    const top = availableViewLevels[0].toLowerCase() as ViewLevel;
    setViewLevel(top);
  }, [availableViewLevels]);

  const currentViewLabel: ViewLabel =
    viewLevel === 'state' ? 'State' : viewLevel === 'city' ? 'City' : 'RTO';
  const effectiveViewLabel: ViewLabel = availableViewLevels.includes(currentViewLabel)
    ? currentViewLabel
    : availableViewLevels[0] ?? 'State';
  const effectiveViewLevel = effectiveViewLabel.toLowerCase() as ViewLevel;

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

    let data: MapDataPoint[] = buildMapDataForMetricByCity(selectedMetric);
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

  const seeAllHref = `/dashboard/all-data?initiative=${encodeURIComponent(currentInit.name)}`;

  // Ranking — derive a per-state/per-city sorted list for the active
  // metric so the right rail's "Ranking" tab has real data without a
  // separate API call.
  const ranking = useMemo(() => {
    if (!selectedMetric || isCentralLevelMetric) return [];
    const rows =
      effectiveViewLevel === 'city'
        ? buildMapDataForMetricByCity(selectedMetric)
        : buildMapDataForMetric(selectedMetric);
    return [...rows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [selectedMetric, isCentralLevelMetric, effectiveViewLevel]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="detail" />

      {/* 2nd bar — breadcrumb + utility actions (filter bar removed; */}
      {/* filters now live in the left rail). */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface-light)] px-5 py-2 text-xs">
        <nav aria-label="Context" className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {currentInit.name}
          </span>
          <span className="text-[var(--color-text-muted)]" aria-hidden>·</span>
          <span className="text-[var(--color-text-secondary)]">
            {areaLabel(area)}
          </span>
        </nav>
        <div className="ml-auto">
          <Link
            to={seeAllHref}
            className="rounded-md bg-[var(--color-blue-link)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--color-blue-header)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            See all data →
          </Link>
        </div>
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)_420px]">
        {/* ── LEFT: filter rail ─────────────────────────────────────── */}
        <DetailFilterRail
          area={area}
          initiativeName={initiativeName}
          extras={extras}
          onAreaChange={setArea}
          onInitiativeChange={setInitiativeName}
          onExtraChange={setExtra}
          timeRange={timeRange}
          timeRanges={TIME_RANGES}
          onTimeRangeChange={setTimeRange}
          availableViewLevels={!isCentralLevelMetric ? availableViewLevels : []}
          viewLabel={effectiveViewLabel}
          onViewLevelChange={setViewLevel}
        />

        {/* ── CENTRE: map (≈70% of viewport) ────────────────────────── */}
        <section
          className="relative flex min-h-0 flex-col bg-white"
          aria-label="Map view"
        >
          {/* Metric header — title on the left, See-trend toggle on the right. */}
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-table)] px-4 py-2">
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

            <button
              type="button"
              role="switch"
              aria-checked={showTrend}
              onClick={() => setShowTrend((v) => !v)}
              className={cn(
                'ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
                showTrend
                  ? 'border-[var(--color-blue-link)] bg-[var(--color-blue-pale)] text-[var(--color-blue-link)]'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              See trend
              <span
                className={cn(
                  'ml-1 inline-block h-3.5 w-6 rounded-full border transition-colors',
                  showTrend
                    ? 'border-[var(--color-blue-link)] bg-[var(--color-blue-link)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-grey)]',
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    'block h-2.5 w-2.5 translate-y-px rounded-full bg-white transition-transform',
                    showTrend ? 'translate-x-3' : 'translate-x-px',
                  )}
                />
              </span>
            </button>
          </div>

          {/* Map canvas */}
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
                viewLevel={effectiveViewLevel}
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
                  if (area.city && supportsRto) {
                    setArea({ state: area.state, city: area.city, rto: name });
                  }
                }}
              />
            </div>

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

        {/* ── RIGHT: single-header Ranking / Metrics inspector ──────── */}
        <aside
          className="flex min-h-0 flex-col overflow-hidden border-l border-[var(--color-border)] bg-white"
          aria-label="Inspector"
        >
          <div
            className="flex shrink-0 items-stretch border-b border-[var(--color-border)]"
            role="tablist"
            aria-label="Inspector view"
          >
            <RightTabButton
              icon={Trophy}
              label="Ranking"
              active={rightTab === 'ranking'}
              onClick={() => setRightTab('ranking')}
            />
            <RightTabButton
              icon={LayoutGrid}
              label="Metrics"
              active={rightTab === 'metrics'}
              onClick={() => setRightTab('metrics')}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {rightTab === 'ranking' ? (
              <RankingPanel rows={ranking} level={effectiveViewLabel} />
            ) : (
              <MetricsPanel
                outcomeMetrics={outcomeMetrics}
                progressMetrics={progressMetrics}
                readinessMetrics={readinessMetrics}
                selectedMetricName={selectedMetric?.name}
                onSelect={(name) => handleSelectMetric(currentInit.slug, name)}
              />
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function RightTabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-blue-link)]',
        active
          ? 'border-b-2 border-[var(--color-accent)] bg-white text-[var(--color-text-primary)]'
          : 'border-b-2 border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function RankingPanel({
  rows,
  level,
}: {
  rows: MapDataPoint[];
  level: ViewLabel;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">
        No ranking available for this metric.
      </p>
    );
  }
  return (
    <ol className="flex flex-col">
      <li className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        <span>{level}</span>
        <span>Value</span>
      </li>
      {rows.map((r, i) => (
        <li
          key={r.name}
          className="flex items-center justify-between gap-2 border-t border-[var(--color-border-table)] px-3 py-2 text-xs"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-light)] text-[10px] font-bold tabular-nums text-[var(--color-text-secondary)]">
              {i + 1}
            </span>
            <span className="truncate font-medium text-[var(--color-text-primary)]">
              {r.name}
            </span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-[var(--color-text-primary)]">
            {r.label ?? r.value}
          </span>
        </li>
      ))}
    </ol>
  );
}

function MetricsPanel({
  outcomeMetrics,
  progressMetrics,
  readinessMetrics,
  selectedMetricName,
  onSelect,
}: {
  outcomeMetrics: Metric[];
  progressMetrics: Metric[];
  readinessMetrics: Metric[];
  selectedMetricName?: string;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex flex-col">
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
              previousAchieved={m.previousAchieved}
              format={m.format}
              isInverse={m.isInverse}
              denominatorLabel={m.denominatorLabel}
              prominent
              selected={selectedMetricName === m.name}
              onSelect={() => onSelect(m.name)}
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
              previousAchieved={m.previousAchieved}
              format={m.format}
              isInverse={m.isInverse}
              denominatorLabel={m.denominatorLabel}
              selected={selectedMetricName === m.name}
              onSelect={() => onSelect(m.name)}
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
              previousAchieved={m.previousAchieved}
              format={m.format}
              isInverse={m.isInverse}
              denominatorLabel={m.denominatorLabel}
              selected={selectedMetricName === m.name}
              onSelect={() => onSelect(m.name)}
            />
          ))}
        </MetricGroup>
      ) : null}
    </div>
  );
}

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
        className="flex w-full items-center justify-between bg-[var(--color-navy)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-navy-mid)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset"
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
        <div id={headingId} className="flex flex-col gap-2 px-2 py-2">
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
