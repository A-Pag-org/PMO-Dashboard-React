// FILE: src/pages/DetailPage.tsx
// PURPOSE: Detailed View — metric-first layout designed for senior officials.
//          · TopBar + filter strip stay unchanged.
//          · LEFT (primary, ~60%): three metric groups laid out as rich
//            tiles — Outcome (2-col, prominent) · Progress (3-col) ·
//            Readiness (3-col, compact). Each tile shows the value, the
//            traffic-light band, a 6-month sparkline (when meaningful)
//            and "Monthly · {lowest-level}" metadata. Clicking a tile
//            selects it for the drill drawer.
//          · RIGHT (~360px): drill drawer for the selected metric —
//            hero strip + central / cumulative-only callouts + ranking
//            by State/City/RTO + 6-month trend chart.
//
//          Business logic preserved: same metric data, same aggregation
//          helpers, same filters. The map is gone; ranking + trend are
//          first-class but secondary to the metric grid.

import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DetailFilterBar from '@/components/layout/DetailFilterBar';
import type { TimePeriod, ViewLabel } from '@/components/layout/DetailFilterBar';
import { DEFAULT_TIME_PERIOD } from '@/components/ui/TimePeriodPill';
import MetricTile from '@/components/ui/MetricTile';
import MetricHeroStrip from '@/components/ui/MetricHeroStrip';
import RankingPanel from '@/components/ui/RankingPanel';
import TrendPanel from '@/components/ui/TrendPanel';
import { cn } from '@/lib/utils';
import { INITIATIVES, CITY_STATE_MAP } from '@/lib/constants';
import {
  getMetricByState,
  getMetricValueForArea,
} from '@/lib/aggregation';
import { getInitiativeConfig } from '@/lib/initiatives';
import type { MapDataPoint, ViewLevel, Metric } from '@/lib/types';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import { useDetailFilters } from '@/lib/useDetailFilters';
import { getCurrentRole, isDelhiOnlyRole } from '@/lib/auth';

function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map((s) => Number(s));
  if (!y || !m) return key;
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[m - 1]} '${String(y).slice(-2)}`;
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
  const [period, setPeriod] = useState<TimePeriod>(DEFAULT_TIME_PERIOD);
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

  const metricFrequency =
    selectedMetric?.trackingFrequency ??
    (selectedMetric?.format === 'Y/N' ? 'overall' : 'monthly');
  const monthsActive = !period.overall && period.months.length > 0;
  const showCumulativeCallout =
    !!selectedMetric && metricFrequency === 'overall' && monthsActive;

  const periodLabel = period.overall || period.months.length === 0
    ? 'Overall'
    : period.months.length === 1
    ? formatMonthKey(period.months[0])
    : `${formatMonthKey(period.months[0])} + ${period.months.length - 1} more`;

  const totalMetrics =
    outcomeMetrics.length + progressMetrics.length + readinessMetrics.length;

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
        period={period}
        onPeriodChange={setPeriod}
        seeAllHref={seeAllHref}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        {/* ── LEFT (primary): metric groups ─────────────────────────── */}
        <section
          className="flex min-h-0 flex-col overflow-y-auto bg-[var(--color-surface-light)]"
          aria-label="Initiative metrics"
        >
          <div className="flex flex-col gap-4 p-4">
            <header className="flex items-baseline justify-between">
              <h1 className="text-base font-bold text-[var(--color-text-primary)]">
                {currentInit.name}
              </h1>
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                {totalMetrics} metrics tracked
              </span>
            </header>

            <MetricSection
              title="Outcome metrics"
              hint="The headline results this initiative is judged on."
              count={outcomeMetrics.length}
              emphasis
            >
              {outcomeMetrics.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {outcomeMetrics.map((m) => (
                    <MetricTile
                      key={m.name}
                      metric={m}
                      size="lg"
                      selected={selectedMetric?.name === m.name}
                      onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyRow label="No outcome metrics for this initiative." />
              )}
            </MetricSection>

            {progressMetrics.length > 0 ? (
              <MetricSection
                title="Progress metrics"
                hint="Inputs and activities driving the outcomes."
                count={progressMetrics.length}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {progressMetrics.map((m) => (
                    <MetricTile
                      key={m.name}
                      metric={m}
                      size="md"
                      selected={selectedMetric?.name === m.name}
                      onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
                    />
                  ))}
                </div>
              </MetricSection>
            ) : null}

            {readinessMetrics.length > 0 ? (
              <MetricSection
                title="Readiness metrics"
                hint="Enablers and yes/no prerequisites."
                count={readinessMetrics.length}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {readinessMetrics.map((m) => (
                    <MetricTile
                      key={m.name}
                      metric={m}
                      size="sm"
                      selected={selectedMetric?.name === m.name}
                      onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
                    />
                  ))}
                </div>
              </MetricSection>
            ) : null}
          </div>
        </section>

        {/* ── RIGHT (drill drawer): selected-metric details ─────────── */}
        <aside
          className="flex min-h-0 flex-col overflow-hidden border-l border-[var(--color-border)] bg-white"
          aria-label="Selected metric details"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-navy)] px-4 py-2.5 text-white">
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/70">
                Drill view
              </span>
              <p className="truncate text-xs font-bold" title={selectedMetric?.name}>
                {selectedMetric?.name ?? '—'}
              </p>
            </div>
            {selectedMetric ? (
              <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {selectedMetric.type}
              </span>
            ) : null}
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-3 p-3">
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
                periodLabel={periodLabel}
              />

              {showCumulativeCallout ? (
                <CalloutBox
                  title="This metric is tracked at cumulative level only."
                  body={`Values shown are the overall total regardless of the months you have selected (${periodLabel}).`}
                />
              ) : null}

              {isCentralLevelMetric ? (
                <CalloutBox
                  title="This metric is tracked centrally."
                  body={`Only the all-NCR aggregate is available — there is no regional breakdown for ${selectedMetric?.name}.`}
                />
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
                <p className="rounded-md border border-dashed border-[var(--color-border-table)] bg-white px-4 py-5 text-center text-[11px] text-[var(--color-text-muted)]">
                  Ranking is shown only for target-driven (X/Y) metrics.
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
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function MetricSection({
  title,
  hint,
  count,
  emphasis = false,
  children,
}: {
  title: string;
  hint?: string;
  count: number;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <header
        className={cn(
          'flex items-baseline justify-between border-b pb-1',
          emphasis ? 'border-[var(--color-accent)]' : 'border-[var(--color-border-table)]',
        )}
      >
        <div className="flex items-baseline gap-2">
          <h2
            className={cn(
              'text-xs font-bold uppercase tracking-[0.08em]',
              emphasis ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]',
            )}
          >
            {title}
          </h2>
          <span className="rounded bg-[var(--color-surface-light)] px-1.5 py-px text-[10px] font-bold tabular-nums text-[var(--color-text-secondary)]">
            {count}
          </span>
        </div>
        {hint ? (
          <p className="text-[10px] text-[var(--color-text-muted)]">{hint}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function CalloutBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--color-border-blue)] bg-[var(--color-blue-pale)] px-3 py-2.5 shadow-sm">
      <Info className="h-4 w-4 shrink-0 text-[var(--color-blue-link)]" aria-hidden />
      <div className="text-xs text-[var(--color-text-primary)]">
        <p className="font-semibold">{title}</p>
        <p className="text-[var(--color-text-secondary)]">{body}</p>
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--color-border-table)] bg-white px-4 py-5 text-center text-xs text-[var(--color-text-muted)]">
      {label}
    </p>
  );
}
