// FILE: src/pages/DetailPage.tsx
// PURPOSE: Detailed View — minimalist two-column layout designed for
//          senior officials.
//          · 2nd bar     : horizontal filter strip (Initiative, State,
//                          City, RTO, extras, time range, See all data).
//          · Centre      : compact KPI strip + ranking panel (with an
//                          inline State/City/RTO switcher) + 6-month
//                          trend panel for the selected metric.
//          · Right rail  : Metrics inspector (Outcome · Progress ·
//                          Readiness groups) — unchanged.

import { useEffect, useMemo, useState } from 'react';
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
import DetailFilterBar from '@/components/layout/DetailFilterBar';
import type { CustomRange, ViewLabel } from '@/components/layout/DetailFilterBar';
import MetricCard from '@/components/ui/MetricCard';
import MetricHeroStrip from '@/components/ui/MetricHeroStrip';
import RankingPanel from '@/components/ui/RankingPanel';
import TrendPanel from '@/components/ui/TrendPanel';
import { cn } from '@/lib/utils';
import {
  INITIATIVES,
  CITY_STATE_MAP,
} from '@/lib/constants';
import {
  getMetricByState,
  getMetricValueForArea,
} from '@/lib/aggregation';
import { getInitiativeConfig } from '@/lib/initiatives';
import type { MapDataPoint, ViewLevel, Metric } from '@/lib/types';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import { useDetailFilters } from '@/lib/useDetailFilters';
import { getCurrentRole, isDelhiOnlyRole } from '@/lib/auth';

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
  const [customRange, setCustomRange] = useState<CustomRange | undefined>(undefined);
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

  const initiativeConfig = getInitiativeConfig(currentInit.slug);
  const supportsCity = initiativeConfig?.geographyLevels.includes('city') ?? true;
  const supportsRto = initiativeConfig?.geographyLevels.includes('rto') ?? false;

  const delhiOnlyRole = isDelhiOnlyRole(role);
  const isAtIndividualRto = !!area.rto;

  const availableViewLevels = useMemo<readonly ViewLabel[]>(() => {
    if (isAtIndividualRto) return [] as readonly ViewLabel[];
    if (delhiOnlyRole) {
      const isDelhiArea = area.state === 'Delhi' || area.city === 'Delhi' || (!area.state && !area.city);
      return supportsRto && isDelhiArea ? (['RTO'] as const) : ([] as readonly ViewLabel[]);
    }
    const cityTail = supportsCity ? ['City' as const] : [];
    const rtoTail = supportsRto ? ['RTO' as const] : [];
    if (area.city) return supportsRto ? ['RTO'] : ['City'];
    if (area.state) return [...cityTail, ...rtoTail];
    return ['State', ...cityTail, ...rtoTail];
  }, [area, supportsCity, supportsRto, delhiOnlyRole, isAtIndividualRto]);

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

  const { rankingRows, emptyHint } = useMemo(() => {
    if (isCentralLevelMetric || !selectedMetric) {
      return { rankingRows: [] as MapDataPoint[], emptyHint: undefined };
    }

    if (effectiveViewLevel === 'state') {
      const stateData = buildMapDataForMetric(selectedMetric);
      const filtered = area.state
        ? stateData.filter((d) => d.name === area.state)
        : stateData;
      return { rankingRows: filtered, emptyHint: undefined };
    }

    if (effectiveViewLevel === 'rto') {
      if (!area.city) {
        return {
          rankingRows: [] as MapDataPoint[],
          emptyHint: 'Select a city to compare RTOs.',
        };
      }
      return {
        rankingRows: [] as MapDataPoint[],
        emptyHint: `RTO-level breakdown for ${area.city} is not yet available.`,
      };
    }

    let data: MapDataPoint[] = buildMapDataForMetricByCity(selectedMetric);
    if (area.state) {
      data = data.filter((d) => CITY_STATE_MAP[d.name] === area.state);
    }
    if (area.city) {
      data = data.filter((d) => d.name === area.city);
    }
    return { rankingRows: data, emptyHint: undefined };
  }, [isCentralLevelMetric, effectiveViewLevel, area, selectedMetric]);

  const ranking = useMemo(
    () => [...rankingRows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    [rankingRows],
  );

  function handleSelectMetric(slug: string, name: string) {
    setSelectedMetricByInitiative((prev) => ({ ...prev, [slug]: name }));
  }

  const seeAllHref = `/dashboard/all-data?initiative=${encodeURIComponent(currentInit.name)}`;

  // Headline aggregate for the hero strip — uses the same aggregation helper
  // that previously fed the centre bubble on the map.
  const heroAgg = useMemo(() => {
    if (!selectedMetric) return undefined;
    const isCentral = selectedMetric.geographyLevel === 'central';
    const scopedArea = isCentral ? {} : area;
    const scope = isCentral ? 'Delhi-NCR (central)' : areaLabel(area);
    return {
      agg: getMetricValueForArea(selectedMetric, scopedArea, scope),
      scope,
    };
  }, [selectedMetric, area]);

  // Trend widget needs a single "current overall" number + a unit hint.
  // X/Y → 0-100 percentage of the all-NCR aggregate. Xx → raw count.
  // Y/N is suppressed at the call site (no meaningful trend to draw).
  const trendUnit: 'pct' | 'count' =
    selectedMetric?.format === 'Xx' ? 'count' : 'pct';
  const trendCurrentValue = useMemo(() => {
    if (!selectedMetric) return 0;
    if (selectedMetric.format === 'X/Y') {
      const t = selectedMetric.target ?? 0;
      const a = selectedMetric.achieved ?? 0;
      return t > 0 ? Math.max(0, Math.min(100, (a / t) * 100)) : 0;
    }
    return selectedMetric.achieved ?? 0;
  }, [selectedMetric]);

  function handleLevelChange(lvl: ViewLabel) {
    setViewLevel(lvl.toLowerCase() as ViewLevel);
  }

  const showRanking =
    !isCentralLevelMetric &&
    selectedMetric?.format === 'X/Y' &&
    availableViewLevels.length > 0;

  const showTrend =
    !isCentralLevelMetric &&
    !!selectedMetric &&
    selectedMetric.format !== 'Y/N';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-light)]">
      <TopBar activePage="detail" />

      <DetailFilterBar
        area={area}
        initiativeName={initiativeName}
        extras={extras}
        onAreaChange={setArea}
        onInitiativeChange={setInitiativeName}
        onExtraChange={setExtra}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        seeAllHref={seeAllHref}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px]">
        {/* ── CENTRE: insights stack (KPI · ranking · trend) ──────────── */}
        <section
          className="flex min-h-0 flex-col overflow-y-auto bg-[var(--color-surface-light)]"
          aria-label="Metric insights"
        >
          <div className="flex flex-col gap-3 p-4">
            {/* Metric title strip */}
            <div className="flex items-center gap-2">
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
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                {selectedMetric?.type ?? 'metric'}
              </span>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                {selectedMetric?.name ?? currentInit.primaryMetric}
              </h2>
              {selectedMetric?.isInverse ? (
                <span className="rounded bg-[var(--color-tl-red-bg)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-tl-red-text)]">
                  Inverse
                </span>
              ) : null}
            </div>

            <MetricHeroStrip
              metric={selectedMetric}
              area={area}
              scopeLabel={heroAgg?.scope ?? 'Delhi-NCR'}
              displayText={
                selectedMetric?.format === 'X/Y'
                  ? undefined
                  : heroAgg?.agg.displayText
              }
              achievedForBand={heroAgg?.agg.achieved ?? null}
              targetForBand={heroAgg?.agg.target ?? null}
            />

            {isCentralLevelMetric ? (
              <div className="flex items-start gap-2 rounded-md border border-[var(--color-border-blue)] bg-[var(--color-blue-pale)] px-3 py-2.5 shadow-sm">
                <Info className="h-4 w-4 shrink-0 text-[var(--color-blue-link)]" aria-hidden />
                <div className="text-xs text-[var(--color-text-primary)]">
                  <p className="font-semibold">This metric is tracked centrally.</p>
                  <p className="text-[var(--color-text-secondary)]">
                    Only the all-NCR aggregate is available — there is no
                    regional breakdown for {selectedMetric?.name}.
                  </p>
                </div>
              </div>
            ) : null}

            {showRanking ? (
              <RankingPanel
                rows={ranking}
                level={effectiveViewLabel}
                availableLevels={availableViewLevels}
                onLevelChange={handleLevelChange}
                emptyHint={emptyHint}
              />
            ) : !isCentralLevelMetric && selectedMetric?.format !== 'X/Y' ? (
              <p className="rounded-md border border-dashed border-[var(--color-border-table)] bg-white px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
                Ranking is shown only for target-driven metrics (X / Y).
              </p>
            ) : null}

            {showTrend ? (
              <TrendPanel
                metricName={selectedMetric.name}
                overallValue={trendCurrentValue}
                rows={ranking}
                unit={trendUnit}
                isInverse={selectedMetric.isInverse}
                level={effectiveViewLabel}
              />
            ) : null}
          </div>
        </section>

        {/* ── RIGHT: metrics inspector ─────────────────────────────── */}
        <aside
          className="flex min-h-0 flex-col overflow-hidden border-l border-[var(--color-border)] bg-white"
          aria-label="Metrics inspector"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-primary)]">
              Metrics
            </h2>
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
              {outcomeMetrics.length + progressMetrics.length + readinessMetrics.length} total
            </span>
          </header>

          <div className="flex-1 overflow-y-auto">
            <MetricsPanel
              outcomeMetrics={outcomeMetrics}
              progressMetrics={progressMetrics}
              readinessMetrics={readinessMetrics}
              selectedMetricName={selectedMetric?.name}
              onSelect={(name) => handleSelectMetric(currentInit.slug, name)}
            />
          </div>
        </aside>
      </main>
    </div>
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
          defaultOpen={false}
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
