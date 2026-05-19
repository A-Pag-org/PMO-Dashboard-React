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
import type { ViewLabel } from '@/components/layout/DetailFilterBar';
import MetricTile from '@/components/ui/MetricTile';
import RankingPanel from '@/components/ui/RankingPanel';
import TrendPanel from '@/components/ui/TrendPanel';
import CompletionThresholdsLegend from '@/components/ui/CompletionThresholdsLegend';
import {
  formatNumber,
  getBandColors,
  getColorBand,
  getCompletionPercentage,
} from '@/lib/utils';
import { INITIATIVES, CITY_STATE_MAP, RTO_OPTIONS_BY_CITY } from '@/lib/constants';
import {
  getAreaWeight,
  getMetricByState,
  getMetricValueForArea,
} from '@/lib/aggregation';
import { getInitiativeConfig } from '@/lib/initiatives';
import type { MapDataPoint, ViewLevel, Metric } from '@/lib/types';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import { useDetailFilters } from '@/lib/useDetailFilters';
import { getCurrentRole, isDelhiOnlyRole } from '@/lib/auth';


/**
 * Completion score in [0, 100] used to pick the featured tile(s) and
 * order the n×n grid. X/Y metrics use raw completion %; Y/N metrics
 * map N → 0 and Y → 100. Xx metrics have no target to complete against
 * and return null so they're never featured (they fall to the end of
 * the grid).
 */
function completionScore(m: Metric): number | null {
  if (m.format === 'X/Y') return getCompletionPercentage(m.target, m.achieved);
  if (m.format === 'Y/N') return m.achieved === 1 ? 100 : 0;
  return null;
}

/**
 * Split the initiative's metrics into:
 *   · `featured` — the tile(s) shown large on the left.
 *       Even total → [lowest completion %, highest completion %].
 *       Odd total  → [lowest completion %].
 *       If fewer than 2 metrics are rankable, we feature only the
 *       worst (or nothing, if none are rankable).
 *   · `rest` — the remaining metrics for the right-hand n×n grid,
 *       sorted worst → best (unrankable Xx metrics last).
 */
function partitionMetricsByCompletion<T extends Metric>(
  metrics: T[],
): { featured: T[]; rest: T[] } {
  if (metrics.length === 0) return { featured: [], rest: [] };

  const scored = metrics.map((m, i) => ({ m, i, score: completionScore(m) }));
  const rankable = scored.filter(
    (x): x is { m: T; i: number; score: number } => x.score != null,
  );
  rankable.sort((a, b) => a.score - b.score || a.i - b.i);

  if (rankable.length === 0) return { featured: [], rest: [...metrics] };

  const isEven = metrics.length % 2 === 0;
  const lowest = rankable[0].m;
  const wantTwoFeatured = isEven && rankable.length >= 2;
  const highest = wantTwoFeatured
    ? rankable[rankable.length - 1].m
    : null;

  const featuredSet = new Set<T>([lowest, ...(highest ? [highest] : [])]);
  const rest = scored
    .filter((x) => !featuredSet.has(x.m))
    .sort(
      (a, b) =>
        (a.score ?? Number.POSITIVE_INFINITY) -
          (b.score ?? Number.POSITIVE_INFINITY) || a.i - b.i,
    )
    .map((x) => x.m);

  return { featured: highest ? [lowest, highest] : [lowest], rest };
}

/**
 * Headline-first split. The initiative's configured headline metrics
 * (INITIATIVE_CONFIGS[*].headlineMetricNames — the results the
 * initiative is judged on, e.g. Naya Safar's pre-BS VI trucks/buses
 * converted) are featured large on the left, in config order so the
 * single most important metric sits at the top. Everything else falls
 * to the right-hand n×n grid, worst → best so problem areas read first.
 *
 * If the initiative has no headline metrics configured (or none match
 * the current metric set) we fall back to the completion-based split.
 */
function partitionMetricsByHeadline<T extends Metric>(
  metrics: T[],
  headlineNames: readonly string[],
): { featured: T[]; rest: T[] } {
  if (metrics.length === 0) return { featured: [], rest: [] };

  const headlineSet = new Set(headlineNames);
  const featured = headlineNames
    .map((n) => metrics.find((m) => m.name === n))
    .filter((m): m is T => m != null);

  if (featured.length === 0) return partitionMetricsByCompletion(metrics);

  const rest = metrics
    .map((m, i) => ({ m, i, score: completionScore(m) }))
    .filter((x) => !headlineSet.has(x.m.name))
    .sort(
      (a, b) =>
        (a.score ?? Number.POSITIVE_INFINITY) -
          (b.score ?? Number.POSITIVE_INFINITY) || a.i - b.i,
    )
    .map((x) => x.m);

  return { featured, rest };
}

function buildMapDataForMetric(metric: Metric): MapDataPoint[] {
  return getMetricByState(metric).map(({ name, agg }) => {
    if (agg.format === 'X/Y') {
      // Deterministic per-state noise so the four NCR states have a
      // visible spread of completion %, not a near-flat distribution
      // from population-weight rounding alone. Same seed always
      // returns the same noised number.
      const noise = (hash01(`${name}|${metric.name}`) - 0.5) * 60;
      const pct = Math.max(0, Math.min(100, Math.round(agg.pct + noise)));
      const target = agg.target ?? 0;
      const achieved = Math.round((target * pct) / 100);
      const band = pct < 30 ? 'RED' : pct < 60 ? 'YELLOW' : 'GREEN';
      return {
        name,
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
      name,
      value: agg.achieved ?? 0,
      onTrack: agg.band === 'GREEN',
      format: agg.format,
      band: agg.band,
      label: agg.displayText,
    };
  });
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

/**
 * RTO-level rows for the ranking panel. Uses the same deterministic
 * per-region noise pattern as the city builder so the numbers are
 * stable across renders. Honours area filters: state/city narrow the
 * RTO list, no filter returns every RTO across the NCR.
 */
function buildMapDataForMetricByRto(
  metric: Metric,
  area: AreaFilterValue,
): MapDataPoint[] {
  const rows: { rto: string; city: string; state: string }[] = [];
  for (const [city, list] of Object.entries(RTO_OPTIONS_BY_CITY)) {
    const state = CITY_STATE_MAP[city];
    if (!state) continue;
    if (area.state && state !== area.state) continue;
    if (area.city && city !== area.city) continue;
    for (const rto of list) {
      if (area.rto && rto !== area.rto) continue;
      rows.push({ rto, city, state });
    }
  }

  return rows.map(({ rto, city, state }) => {
    const agg = getMetricValueForArea(metric, { state, city, rto }, rto);
    if (agg.format === 'X/Y') {
      const noise = (hash01(`${rto}|${metric.name}`) - 0.5) * 70;
      const pct = Math.max(0, Math.min(100, Math.round(agg.pct + noise)));
      const target = agg.target ?? 0;
      const achieved = Math.round((target * pct) / 100);
      const band = pct < 30 ? 'RED' : pct < 60 ? 'YELLOW' : 'GREEN';
      return {
        name: rto,
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
      name: rto,
      value: agg.achieved ?? 0,
      onTrack: agg.band === 'GREEN',
      format: agg.format,
      band: agg.band,
      label: agg.displayText,
    };
  });
}

/**
 * Per-metric values scoped to the current area filter. Looks up the
 * same deterministically-noised row that the ranking panel would show
 * for this scope, so every tile reflects the user's selection — and
 * the same area always returns the same numbers.
 *
 * No area, central metric, or no matching row → fall back to the
 * initiative-level achieved / target on the metric itself.
 */
function scopedMetricValues(
  metric: Metric,
  area: AreaFilterValue,
): {
  achieved: number | null;
  target: number | null;
  previousAchieved: number | null;
} {
  const fallback = {
    achieved: metric.achieved,
    target: metric.target,
    previousAchieved: metric.previousAchieved ?? null,
  };
  if (metric.geographyLevel === 'central') return fallback;
  if (!area.state && !area.city && !area.rto) return fallback;

  let row: MapDataPoint | undefined;
  if (area.rto) {
    row = buildMapDataForMetricByRto(metric, area).find((r) => r.name === area.rto);
  } else if (area.city) {
    row = buildMapDataForMetricByCity(metric).find((r) => r.name === area.city);
  } else if (area.state) {
    row = buildMapDataForMetric(metric).find((r) => r.name === area.state);
  }
  if (!row) return fallback;

  // For Xx-format metrics we keep previousAchieved area-weight-scaled
  // so the month-on-month delta on the tile stays directionally
  // correct (the noise pattern for Xx is itself weight-scaled).
  const w = getAreaWeight(area);
  const prev =
    metric.previousAchieved != null
      ? Math.round(metric.previousAchieved * w)
      : null;

  if (metric.format === 'X/Y') {
    const match = row.label?.match(/^([\d,]+) \/ ([\d,]+)/);
    if (match) {
      const achieved = parseInt(match[1].replace(/,/g, ''), 10);
      const target = parseInt(match[2].replace(/,/g, ''), 10);
      return { achieved, target, previousAchieved: prev };
    }
  }
  if (metric.format === 'Xx') {
    return { achieved: row.value, target: null, previousAchieved: prev };
  }
  if (metric.format === 'Y/N') {
    return { achieved: row.value === 1 ? 1 : 0, target: 1, previousAchieved: null };
  }
  return fallback;
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
  // Right-hand drill drawer (ranking + trend) is collapsed by default
  // and only opens when the user clicks the chevron handle. Selecting
  // a metric tile updates which metric the drawer will show, but does
  // not open the drawer itself — the user stays in control of the view.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = getCurrentRole();

  const currentInit =
    INITIATIVES.find((i) => i.name === initiativeName) ?? INITIATIVES[0];

  // Clone every metric with values scoped to the current area filter,
  // so the tiles, the section tallies, and the cumulative card all
  // reflect the selected state / city / RTO. Same area = same numbers.
  const scopedMetrics = useMemo(
    () =>
      currentInit.metrics.map((m) => ({
        ...m,
        ...scopedMetricValues(m, area),
      })),
    [currentInit, area],
  );

  const headlineMetricNames = useMemo(
    () => getInitiativeConfig(currentInit.slug)?.headlineMetricNames ?? [],
    [currentInit],
  );

  const { featured: featuredMetrics, rest: gridMetrics } = useMemo(
    () => partitionMetricsByHeadline(scopedMetrics, headlineMetricNames),
    [scopedMetrics, headlineMetricNames],
  );

  // Square-ish grid: 1→1, 2→2, 3-4→2, 5-9→3, 10-16→4 columns, etc.
  const gridCols = Math.max(1, Math.ceil(Math.sqrt(gridMetrics.length || 1)));

  const defaultSelectedMetricName =
    featuredMetrics[0]?.name ?? scopedMetrics[0]?.name ?? '';
  const selectedMetricName =
    selectedMetricByInitiative[currentInit.slug] ?? defaultSelectedMetricName;
  const selectedMetric =
    currentInit.metrics.find((m) => m.name === selectedMetricName) ??
    currentInit.metrics[0];

  const isCentralLevelMetric = selectedMetric?.geographyLevel === 'central';

  const initiativeConfig = getInitiativeConfig(currentInit.slug);
  const initSupportsCity = initiativeConfig?.geographyLevels.includes('city') ?? true;
  const initSupportsRto = initiativeConfig?.geographyLevels.includes('rto') ?? false;

  // Per-metric drill restriction. The ranking toggles only expose the
  // levels the *currently selected metric* actually drills to — so for
  // Naya Safar trucks/buses (lowest = RTO) the user sees State/City/RTO,
  // but for Naya Safar events (lowest = City) the RTO toggle is hidden.
  // Initiative-level support is intersected so a metric can't claim a
  // level the initiative doesn't have in its drill chain.
  const metricLowest = selectedMetric?.lowestLevelLabel;
  const metricSupportsCity = metricLowest === 'City' || metricLowest === 'RTO';
  const metricSupportsRto = metricLowest === 'RTO';
  const supportsCity = initSupportsCity && metricSupportsCity;
  const supportsRto = initSupportsRto && metricSupportsRto;

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
      const data = buildMapDataForMetricByRto(selectedMetric, area);
      const hint =
        data.length === 0
          ? area.city
            ? `No RTOs recorded for ${area.city}.`
            : 'No RTO-level rows match the current filters.'
          : undefined;
      return { rankingRows: data, emptyHint: hint };
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

  // Cumulative outcome roll-up — sums the initiative's *headline*
  // outcome X/Y metrics (per INITIATIVE_CONFIGS.headlineMetricNames),
  // filtered to non-inverse. So Naya Safar clubs only trucks + buses
  // (events isn't a headline outcome and isn't commensurate),
  // CEMS clubs CEMS + APCD installs (violations excluded as inverse),
  // MRS clubs all three road widths, and single-outcome initiatives
  // get no card at all. Uses scopedMetrics so the number tracks the
  // active area filter.
  const outcomeCumulative = useMemo(() => {
    const headlineNames = new Set(initiativeConfig?.headlineMetricNames ?? []);
    const relevant = scopedMetrics.filter(
      (m) =>
        m.type === 'outcome' &&
        m.format === 'X/Y' &&
        !m.isInverse &&
        headlineNames.has(m.name),
    );
    if (relevant.length < 2) return null;
    const achieved = relevant.reduce((s, m) => s + (m.achieved ?? 0), 0);
    const target = relevant.reduce((s, m) => s + (m.target ?? 0), 0);
    const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
    return { achieved, target, pct, count: relevant.length };
  }, [scopedMetrics, initiativeConfig]);

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
        {/* ── LEFT (primary): featured tile(s) + n×n grid ───────────── */}
        <section
          className="flex min-h-0 flex-col overflow-hidden bg-[var(--color-surface-light)]"
          aria-label="Initiative metrics"
        >
          <div
            className="grid min-h-0 flex-1 gap-3 p-3"
            style={{
              gridTemplateColumns:
                featuredMetrics.length > 0 && gridMetrics.length > 0
                  ? 'minmax(0, 5fr) minmax(0, 7fr)'
                  : 'minmax(0, 1fr)',
            }}
          >
            {featuredMetrics.length > 0 ? (
              <div className="flex min-h-0 flex-col gap-3" aria-label="Featured metrics">
                {featuredMetrics.map((m) => (
                  <MetricTile
                    key={m.name}
                    metric={m}
                    size="lg"
                    selected={selectedMetric?.name === m.name}
                    onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
                    className="min-h-0 flex-1"
                  />
                ))}
              </div>
            ) : null}

            {gridMetrics.length > 0 ? (
              <div
                className="grid min-h-0 gap-3"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                  gridAutoRows: 'minmax(0, 1fr)',
                }}
                aria-label="Other metrics"
              >
                {gridMetrics.map((m) => (
                  <MetricTile
                    key={m.name}
                    metric={m}
                    size="sm"
                    selected={selectedMetric?.name === m.name}
                    onSelect={() => handleSelectMetric(currentInit.slug, m.name)}
                    className="min-h-0"
                  />
                ))}
              </div>
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
              <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-navy)] px-4 py-2 text-white">
                <p
                  className="min-w-0 truncate text-[13px] font-bold"
                  title={selectedMetric?.name}
                >
                  {selectedMetric?.name ?? 'Pick a metric on the left'}
                </p>
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

      <footer className="flex shrink-0 items-center justify-end border-t border-[#E2E2EA] bg-white px-8 py-3">
        <CompletionThresholdsLegend />
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

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

