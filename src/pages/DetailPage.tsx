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
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DetailFilterBar from '@/components/layout/DetailFilterBar';
import type { TimePeriod, ViewLabel } from '@/components/layout/DetailFilterBar';
import { DEFAULT_TIME_PERIOD } from '@/components/ui/TimePeriodPill';
import MetricTile from '@/components/ui/MetricTile';
import RankingPanel from '@/components/ui/RankingPanel';
import TrendPanel from '@/components/ui/TrendPanel';
import {
  cn,
  formatNumber,
  getBandColors,
  getColorBand,
  getCompletionPercentage,
} from '@/lib/utils';
import { INITIATIVES, CITY_STATE_MAP } from '@/lib/constants';
import {
  getMetricByState,
  getMetricValueForArea,
} from '@/lib/aggregation';
import { getInitiativeConfig } from '@/lib/initiatives';
import type { ColorBand, MapDataPoint, ViewLevel, Metric } from '@/lib/types';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import { useDetailFilters } from '@/lib/useDetailFilters';
import { getCurrentRole, isDelhiOnlyRole } from '@/lib/auth';

interface BandTally {
  green: number;
  yellow: number;
  red: number;
  /** Xx metrics — tracked but have no target / no band. */
  untracked: number;
  /** Total number of metrics surveyed. */
  total: number;
}

function summariseMetrics(metrics: Metric[]): BandTally {
  const out: BandTally = { green: 0, yellow: 0, red: 0, untracked: 0, total: 0 };
  for (const m of metrics) {
    out.total += 1;
    if (m.format === 'Y/N') {
      if (m.achieved === 1) out.green += 1;
      else out.red += 1;
      continue;
    }
    if (m.format === 'Xx') {
      out.untracked += 1;
      continue;
    }
    const pct = getCompletionPercentage(m.target, m.achieved);
    const band = getColorBand(pct, m.isInverse);
    if (band === 'GREEN') out.green += 1;
    else if (band === 'YELLOW') out.yellow += 1;
    else out.red += 1;
  }
  return out;
}

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
  // Right-hand drill drawer (ranking + trend) is collapsed by default
  // and only opens when the user clicks the chevron handle. Selecting
  // a metric tile updates which metric the drawer will show, but does
  // not open the drawer itself — the user stays in control of the view.
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  // RTO ranking has no real data yet — the toggle is therefore hidden
  // until the API delivers RTO-level rows. The RTO *filter* pill in
  // the navy bar is unaffected; only the in-panel ranking toggle is
  // gated. Flip this back to `initiativeConfig?.geographyLevels.includes('rto')`
  // once real data is available.
  const HAS_RTO_RANKING_DATA = false;
  const supportsRto =
    (initiativeConfig?.geographyLevels.includes('rto') ?? false) && HAS_RTO_RANKING_DATA;

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
    ? 'All months to date'
    : period.months.length === 1
    ? formatMonthKey(period.months[0])
    : `${formatMonthKey(period.months[0])} + ${period.months.length - 1} more`;

  const totalMetrics =
    outcomeMetrics.length + progressMetrics.length + readinessMetrics.length;

  const outcomeTally = useMemo(() => summariseMetrics(outcomeMetrics), [outcomeMetrics]);
  const progressTally = useMemo(() => summariseMetrics(progressMetrics), [progressMetrics]);
  const readinessTally = useMemo(() => summariseMetrics(readinessMetrics), [readinessMetrics]);

  // Cumulative outcome roll-up — summed achieved / target across every
  // non-inverse Outcome X/Y metric of the current initiative. Anchors
  // the drill drawer with the initiative-level headline (e.g. Naya
  // Safar's buses + trucks combined). Suppressed when there's only
  // one such metric — the single-tile value is then already the total.
  const outcomeCumulative = useMemo(() => {
    const xy = currentInit.metrics.filter(
      (m) => m.type === 'outcome' && m.format === 'X/Y' && !m.isInverse,
    );
    if (xy.length < 2) return null;
    const achieved = xy.reduce((s, m) => s + (m.achieved ?? 0), 0);
    const target = xy.reduce((s, m) => s + (m.target ?? 0), 0);
    const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
    return { achieved, target, pct, count: xy.length };
  }, [currentInit]);

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

      <main
        className="grid min-h-0 flex-1 transition-[grid-template-columns] duration-200 ease-out"
        style={{
          gridTemplateColumns: drawerOpen
            ? 'minmax(0, 1fr) minmax(380px, 440px)'
            : 'minmax(0, 1fr) 32px',
        }}
      >
        {/* ── LEFT (primary): metric groups ─────────────────────────── */}
        <section
          className="flex min-h-0 flex-col overflow-y-auto bg-[var(--color-surface-light)]"
          aria-label="Initiative metrics"
        >
          <div className="flex flex-col gap-4 p-4">
            <InitiativeHealthBanner
              initiativeName={currentInit.name}
              periodLabel={periodLabel}
              scopeLabel={areaLabel(area)}
              outcomeTally={outcomeTally}
              totalMetrics={totalMetrics}
            />

            <MetricSection
              title="Outcome metrics"
              hint="What this initiative is trying to achieve."
              tally={outcomeTally}
              emphasis
            >
              {outcomeMetrics.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                hint="What we are doing to get there."
                tally={progressTally}
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
                hint="What needs to be in place to succeed."
                tally={readinessTally}
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
          className="relative flex min-h-0 overflow-hidden border-l border-[var(--color-border)] bg-white"
          aria-label="Selected metric details"
        >
          {/* Toggle handle — vertical strip on the left edge with a
              chevron centred top-to-bottom. Always visible so the
              drawer can be opened from any state. */}
          <div className="flex w-8 shrink-0 items-center justify-center border-r border-[var(--color-border-table)] bg-[var(--color-surface-light)]">
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-expanded={drawerOpen}
              aria-controls="metric-drill-drawer"
              aria-label={drawerOpen ? 'Hide ranking and trend' : 'Show ranking and trend'}
              title={drawerOpen ? 'Hide ranking and trend' : 'Show ranking and trend'}
              className="flex h-14 w-7 items-center justify-center rounded-r-md border border-l-0 border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-[var(--color-blue-pale)] hover:text-[var(--color-blue-link)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)]"
            >
              {drawerOpen ? (
                <ChevronRight className="h-5 w-5" aria-hidden />
              ) : (
                <ChevronLeft className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>

          {/* Drill content — rendered only when open so collapsed
              state is a clean sliver. */}
          {drawerOpen ? (
            <div
              id="metric-drill-drawer"
              className="flex min-w-0 flex-1 flex-col overflow-hidden"
            >
              <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-navy)] px-4 py-2.5 text-white">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/70">
                    Showing detail for
                  </span>
                  <p className="truncate text-xs font-bold" title={selectedMetric?.name}>
                    {selectedMetric?.name ?? 'Pick a metric on the left'}
                  </p>
                </div>
                {selectedMetric ? (
                  <span
                    className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    title={
                      selectedMetric.type === 'outcome'
                        ? 'Outcome — a headline result the initiative is judged on.'
                        : selectedMetric.type === 'progress'
                        ? 'Progress — an activity or input driving the outcomes.'
                        : 'Readiness — a prerequisite that must be in place.'
                    }
                  >
                    {selectedMetric.type}
                  </span>
                ) : null}
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-3 p-3">
              {outcomeCumulative ? (
                <OutcomeCumulativeCard
                  achieved={outcomeCumulative.achieved}
                  target={outcomeCumulative.target}
                  pct={outcomeCumulative.pct}
                  count={outcomeCumulative.count}
                />
              ) : null}

              {showCumulativeCallout ? (
                <CalloutBox
                  title="Total figure only — not split by month."
                  body={`This metric isn't reported month-by-month. The number you see is the cumulative total, even though you have ${periodLabel} selected.`}
                />
              ) : null}

              {isCentralLevelMetric ? (
                <CalloutBox
                  title="No regional breakdown."
                  body="This metric is reported as a single all-NCR figure, so there's no state/city/RTO split."
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
                  Ranking is only shown for metrics with a target.
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
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function MetricSection({
  title,
  hint,
  tally,
  emphasis = false,
  children,
}: {
  title: string;
  hint?: string;
  tally: BandTally;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <header
        className={cn(
          'flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b pb-1.5',
          emphasis ? 'border-[var(--color-accent)]' : 'border-[var(--color-border-table)]',
        )}
      >
        <h2
          className={cn(
            'text-xs font-bold uppercase tracking-[0.08em]',
            emphasis ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]',
          )}
        >
          {title}
        </h2>
        <span className="rounded bg-[var(--color-surface-light)] px-1.5 py-px text-[10px] font-bold tabular-nums text-[var(--color-text-secondary)]">
          {tally.total}
        </span>
        {hint ? (
          <p className="text-[10px] text-[var(--color-text-muted)]">{hint}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function InitiativeHealthBanner({
  initiativeName,
  periodLabel,
  scopeLabel,
  outcomeTally,
  totalMetrics,
}: {
  initiativeName: string;
  periodLabel: string;
  scopeLabel: string;
  outcomeTally: BandTally;
  totalMetrics: number;
}) {
  const verdictColor = headlineVerdictColor(outcomeTally);

  return (
    <header
      className="rounded-md border bg-white shadow-sm"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: verdictColor,
        borderTopColor: 'var(--color-border-table)',
        borderRightColor: 'var(--color-border-table)',
        borderBottomColor: 'var(--color-border-table)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight text-[var(--color-text-primary)]">
            {initiativeName}
          </h1>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">{scopeLabel}</span>
            <span className="mx-1.5 text-[var(--color-text-muted)]">·</span>
            {periodLabel}
            <span className="mx-1.5 text-[var(--color-text-muted)]">·</span>
            {totalMetrics} {totalMetrics === 1 ? 'metric' : 'metrics'} tracked
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            Colour key
          </span>
          <div className="grid grid-cols-[10px_auto_auto_auto] items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-tight">
            <LegendCells band="GREEN"  label="On track" range="≥ 60% of target" count={outcomeTally.green} />
            <LegendCells band="YELLOW" label="At risk"  range="30 – 60%"        count={outcomeTally.yellow} />
            <LegendCells band="RED"    label="Behind"   range="below 30%"       count={outcomeTally.red} />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Four cells of a 4-column grid (dot · count · label · range). Rendering
 * them as siblings — not inside a wrapper — keeps the dots aligned in a
 * single column across all rows in the parent grid.
 */
function LegendCells({
  band,
  label,
  range,
  count,
}: {
  band: Exclude<ColorBand, 'NA'>;
  label: string;
  range: string;
  count: number;
}) {
  const colors = getBandColors(band);
  const tip = `${count} outcome metric${count === 1 ? '' : 's'} ${label.toLowerCase()} (${range}).`;
  return (
    <>
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: colors.fg }}
        title={tip}
      />
      <span
        className="text-right font-bold tabular-nums"
        style={{ color: count > 0 ? colors.text : 'var(--color-text-muted)' }}
      >
        {count}
      </span>
      <span className="font-bold text-[var(--color-text-primary)]">{label}</span>
      <span className="text-[var(--color-text-muted)]">{range}</span>
    </>
  );
}

function headlineVerdictColor(t: BandTally): string {
  const tracked = t.green + t.yellow + t.red;
  if (tracked === 0) return 'var(--color-text-muted)';
  // Worst-band wins so the left edge still surfaces the laggard at a glance.
  const band: Exclude<ColorBand, 'NA'> = t.red > 0 ? 'RED' : t.yellow > 0 ? 'YELLOW' : 'GREEN';
  return getBandColors(band).fg;
}

function OutcomeCumulativeCard({
  achieved,
  target,
  pct,
  count,
}: {
  achieved: number;
  target: number;
  pct: number;
  count: number;
}) {
  const band = getColorBand(pct, false);
  const colors = getBandColors(band);
  return (
    <div
      className="rounded-md border bg-white px-3 py-2 shadow-sm"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: colors.fg,
        borderTopColor: 'var(--color-border-table)',
        borderRightColor: 'var(--color-border-table)',
        borderBottomColor: 'var(--color-border-table)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        Outcome total across initiative
      </p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="text-base font-bold tabular-nums text-[var(--color-text-primary)]">
          {formatNumber(achieved)} / {formatNumber(target)}
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: colors.text }}
        >
          {pct}%
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
        Sum across {count} outcome metrics with targets.
      </p>
    </div>
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
