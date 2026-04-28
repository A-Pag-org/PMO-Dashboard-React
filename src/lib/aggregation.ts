// FILE: src/lib/aggregation.ts
// PURPOSE: Single source of truth for "what's the value of metric X in
//          area Y?". Used by Summary tiles, Detail page (map bubbles +
//          centre bubble), and All Data (nested tree).
//
// Why centralise? Before this file, three pages each had their own
// copy of STATE_WEIGHTS / areaWeight / per-area splitting math, which
// is exactly the kind of duplication the V3.1 spec wants gone.

import {
  RTO_OPTIONS_BY_CITY,
  UPLOAD_CITY_OPTIONS_BY_STATE,
} from './constants';
import { getColorBand } from './utils';
import type { ColorBand, MetricFormat, Metric } from './types';

/**
 * Population-share weights for the four NCR states. Used to fan an
 * NCR-level total down to the state level when we don't have hand-
 * curated per-state numbers (which is the case for every metric beyond
 * the eight summary primaries).
 */
export const STATE_WEIGHTS: Record<string, number> = {
  Delhi: 0.40,
  'Uttar Pradesh': 0.25,
  Haryana: 0.22,
  Rajasthan: 0.13,
};

/** A geographic scope, mirroring useDetailFilters' AreaFilterValue. */
export interface AreaScope {
  state?: string;
  city?: string;
  rto?: string;
  toll?: string;
  ulb?: string;
}

/**
 * Cascading share of the NCR total represented by `area`.
 *   no filter        → 1
 *   state            → STATE_WEIGHTS[state]
 *   state + city     → above / cities-in-state
 *   state + city + rto → above / rtos-in-city
 *
 * Toll / ULB are treated like RTO — assumed evenly distributed across
 * the city's options of that level.
 */
export function getAreaWeight(area: AreaScope): number {
  if (!area.state) return 1;
  let w = STATE_WEIGHTS[area.state] ?? 0;
  if (area.city) {
    const cities = UPLOAD_CITY_OPTIONS_BY_STATE[area.state] ?? [];
    w = w / Math.max(1, cities.length);
  }
  if (area.rto && area.city) {
    const rtos = RTO_OPTIONS_BY_CITY[area.city] ?? [];
    w = w / Math.max(1, rtos.length);
  }
  // Toll and ULB use a flat split-by-three for the demo. Real data
  // will override this entirely.
  if (area.toll) w = w / 3;
  if (area.ulb) w = w / 3;
  return w;
}

/**
 * The aggregated representation of a metric scoped to an area. Drives
 * map bubbles, centre bubble, table cells, etc.
 */
export interface AggregatedMetric {
  format: MetricFormat;
  isInverse: boolean;
  /** Numeric target for X/Y; null for Xx; 1 for Y/N. */
  target: number | null;
  /** Numeric achieved for X/Y / Xx; 1 (Y) or 0 (N) for Y/N. */
  achieved: number | null;
  /** Completion % for X/Y; 0 otherwise. */
  pct: number;
  /** Traffic-light band for X/Y; 'NA' for Xx; 'GREEN'/'RED' for Y/N. */
  band: ColorBand;
  /** Pre-formatted display text suited to the format. */
  displayText: string;
  /** Two-line subtitle (achieved/target, count + unit, etc.). */
  subtitle: string;
  /** Display label for the X/Y denominator — defaults to "Target". */
  denominatorLabel: string;
}

function deterministicYN(seed: string): boolean {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (h & 1) === 1;
}

/**
 * Aggregate a metric for a given area. The returned object carries
 * everything UI components need: format, traffic-light band, display
 * text. Callers don't need to know about state weights or splits.
 */
export function getMetricValueForArea(
  metric: Metric,
  area: AreaScope,
  /** Optional unique key (e.g. region name) used to seed the Y/N hash. */
  yNSeed = '',
): AggregatedMetric {
  const isCentral = metric.geographyLevel === 'central';
  const w = isCentral ? 1 : getAreaWeight(area);
  const isInverse = metric.isInverse ?? false;
  const denominatorLabel = metric.denominatorLabel ?? 'Target';

  if (metric.format === 'Y/N') {
    const seed = (yNSeed || area.state || 'NCR') + '::' + metric.name;
    const isYes = deterministicYN(seed);
    return {
      format: 'Y/N',
      isInverse,
      target: 1,
      achieved: isYes ? 1 : 0,
      pct: isYes ? 100 : 0,
      band: isYes ? 'GREEN' : 'RED',
      displayText: isYes ? 'Y' : 'N',
      subtitle: isYes ? 'Yes' : 'No',
      denominatorLabel,
    };
  }

  if (metric.format === 'Xx') {
    const total = metric.achieved ?? 0;
    const v = Math.round(total * w);
    return {
      format: 'Xx',
      isInverse,
      target: null,
      achieved: v,
      pct: 0,
      band: 'NA',
      displayText: v.toLocaleString('en-IN'),
      subtitle: metric.unit ?? 'count',
      denominatorLabel,
    };
  }

  // X/Y
  const target = Math.max(1, Math.round((metric.target ?? 0) * w));
  const achieved = Math.round((metric.achieved ?? 0) * w);
  const pct = Math.max(0, Math.min(100, Math.round((achieved / Math.max(1, target)) * 100)));
  const band = getColorBand(pct, isInverse);
  return {
    format: 'X/Y',
    isInverse,
    target,
    achieved,
    pct,
    band,
    displayText: `${pct}%`,
    subtitle: `${achieved.toLocaleString('en-IN')} / ${target.toLocaleString('en-IN')}`,
    denominatorLabel,
  };
}

/**
 * Returns the four NCR states (or the single filtered state) with the
 * metric aggregated per state. Convenience wrapper around
 * getMetricValueForArea — used by the Detail map's "State" view-level.
 */
export function getMetricByState(
  metric: Metric,
  filterState?: string,
): { name: string; agg: AggregatedMetric }[] {
  const states = Object.keys(STATE_WEIGHTS);
  const list = states.map((name) => ({
    name,
    agg: getMetricValueForArea(metric, { state: name }, name),
  }));
  return filterState ? list.filter((r) => r.name === filterState) : list;
}
