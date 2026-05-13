// FILE: src/lib/trendSynth.ts
// PURPOSE: Generate deterministic monthly history for a metric / region
//          when no real time-series store exists yet. The Detail-page
//          trend widget uses this so the "See trend" view is consistent
//          across renders for the same metric / region.

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export interface TrendPoint {
  /** Month label, e.g. "Dec '25". */
  label: string;
  value: number;
}

export interface TrendSeries {
  /** Region (or "All NCR") name. */
  name: string;
  points: TrendPoint[];
}

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

/**
 * Build monthly labels ending at the current month (`now`).
 * Example with months=6 and now=2026-05: ["Dec '25","Jan '26",…,"May '26"].
 */
export function monthLabels(months: number, now: Date = new Date()): string[] {
  const out: string[] = [];
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const yy = String(d.getFullYear()).slice(-2);
    out.push(`${MONTH_LABELS[d.getMonth()]} '${yy}`);
  }
  return out;
}

/**
 * Synthesise a smoothly drifting series ending at `target`.
 *
 * @param seed     Stable per-series identifier (metric + region name).
 * @param target   Final value (the current observed value).
 * @param months   Series length.
 * @param min/max  Clamping range (0..100 for percentages, 0..Infinity for counts).
 */
export function synthSeries(
  seed: string,
  target: number,
  months = 6,
  min = 0,
  max = 100,
): number[] {
  const safeTarget = Math.max(min, Math.min(max, target));
  const driftPct = 0.18 + hash01(seed + ':drift') * 0.32; // 18-50% drift
  const span = Math.max(4, Math.abs(safeTarget) * driftPct);
  const startValue = Math.max(min, Math.min(max, safeTarget - span));

  const labels = monthLabels(months);
  const out: number[] = [];
  for (let i = 0; i < months; i++) {
    const t = months === 1 ? 1 : i / (months - 1);
    const base = startValue + (safeTarget - startValue) * t;
    // ±4% deterministic monthly noise (less than drift so the trend is still readable).
    const noise = (hash01(seed + ':' + labels[i]) - 0.5) * 4;
    out.push(Math.max(min, Math.min(max, Math.round(base + noise))));
  }
  // Anchor last point to the observed value so the chart matches the map.
  out[out.length - 1] = Math.round(safeTarget);
  return out;
}

export function buildSeries(
  metricName: string,
  regionName: string,
  target: number,
  months = 6,
  min = 0,
  max = 100,
): TrendSeries {
  const values = synthSeries(`${metricName}|${regionName}`, target, months, min, max);
  const labels = monthLabels(months);
  return {
    name: regionName,
    points: labels.map((label, i) => ({ label, value: values[i] })),
  };
}
