// FILE: lib/types.ts
// PURPOSE: All TypeScript interfaces and type definitions for the application
// DESIGN REF: Impact Dashboard Business Logic spec — Sections 1, 4, 5, 8

export type MetricType = 'outcome' | 'progress' | 'readiness';

export type ViewLevel = 'state' | 'city' | 'rto';

/**
 * Display format for a metric. Drives table columns, map rendering,
 * and color coding logic.
 *   X/Y  → Achieved over Target (with completion %).
 *   Xx   → Absolute count, no target / no %.
 *   Y/N  → Boolean — Y (Green) or N (Red).
 */
export type MetricFormat = 'X/Y' | 'Xx' | 'Y/N';

export type ColorBand = 'GREEN' | 'YELLOW' | 'RED' | 'NA';

export interface Metric {
  name: string;
  type: MetricType;
  /** Numeric target (X/Y) | 1 for Y/N | null for Xx. */
  target: number | null;
  /** Numeric achieved (X/Y, Xx) | 1 (Y) or 0 (N) for Y/N | null if no data. */
  achieved: number | null;
  /**
   * Refinement 4 — value of `achieved` at the end of the previous
   * reporting period. When present (currently only used by Xx
   * metrics), the Detail page renders a month-on-month delta marker
   * (▲ +N / ▼ -N / — no change) next to the big count. Leave undefined
   * when no historical data is available; the marker is suppressed.
   */
  previousAchieved?: number | null;
  unit?: string;
  /** Display & logic format — see {@link MetricFormat}. */
  format: MetricFormat;
  /**
   * Inverse / violation metric. High values = bad, so the color scale is
   * reversed (>=60% RED, 30-60% YELLOW, <30% GREEN).
   */
  isInverse?: boolean;
  /**
   * Where the metric is captured. 'central' metrics show only in the
   * center bubble — never as a regional overlay on the map.
   */
  geographyLevel?: 'state' | 'city' | 'rto' | 'central';
  /**
   * Per-spec Logic (DV) col J: 'monthly' metrics re-aggregate when the
   * user selects specific months in the time filter. 'overall' metrics
   * always show their cumulative value regardless of month selection
   * and the page renders a "tracked at cumulative level only" callout.
   * Defaults to 'monthly' for X/Y and Xx; Y/N is implicitly 'overall'.
   */
  trackingFrequency?: 'monthly' | 'overall';
  /**
   * Display label for the metric's lowest geographic level — used by
   * the hero strip badge ("Monthly · City"). Free text so we can match
   * the spec's vocabulary per initiative ("District", "Industrial Area",
   * "ULB", ...).
   */
  lowestLevelLabel?: string;
  /** Free-text data source label (API / Manual / TBD etc.). */
  dataSource?: string;
  /**
   * Cluster id — when set, every metric sharing this id is rendered
   * inside a single combined "cluster tile" on the Detail page,
   * instead of one tile per metric.
   */
  cluster?: string;
  /**
   * Display title for the combined cluster tile. Set on at least one
   * metric in the cluster; the first non-empty value wins.
   */
  clusterLabel?: string;
  /**
   * Type override for the combined cluster tile (defaults to the
   * first metric's `type`). Lets a cluster mix a stray outcome with
   * a progress metric and still land in the right page band.
   */
  clusterType?: MetricType;
  /** Sub-row label inside the cluster tile (e.g. "Trucks", "Buses"). */
  clusterSubLabel?: string;
  /**
   * Optional visibility gate for the Detail-page tile. When set, the
   * tile only appears once the user has narrowed the filters enough:
   *   · 'state'             — a specific state is selected
   *   · 'state+city'        — a specific state and city are selected
   *   · 'state+city+agency' — also a specific Agency extra filter
   * Unset → always visible.
   */
  visibleWhen?: 'state' | 'state+city' | 'state+city+agency';
  /**
   * Detail-page tile rendering variant for X/Y metrics. Defaults to
   * 'bar' (inline horizontal bar). 'donut' renders the percentage
   * inside a donut chart instead — used where two tiles sit side by
   * side and the donut reads cleaner (e.g. Green Contribution).
   */
  displayAs?: 'bar' | 'donut';
  /**
   * Override label for the X/Y "denominator" — used by violation/inverse
   * metrics where the denominator is "total sites" rather than a target
   * the team is trying to hit. Defaults to "Target".
   */
  denominatorLabel?: string;
}

export interface SummaryCardBar {
  label: string;
  target: number;
  achieved: number;
}

export interface SummaryCardConfig {
  /** Short description shown directly under the card title. */
  description: string;
  /**
   * Variants per spec §3.2:
   *   'donut'        — single ring (Road Repair, SCC, ICCC, Green Contribution, Greening).
   *   'two-donuts'   — two side-by-side donuts (Naya Safar: Trucks + Buses, CEMS/APCD: CEMS + APCDs).
   *   'three-donuts' — three side-by-side donuts (legacy layout for tri-split initiatives).
   *   'dual-bar'     — DEPRECATED concentric dual ring (kept for back-compat only).
   */
  variant: 'donut' | 'two-donuts' | 'three-donuts' | 'dual-bar';
  /** Required when variant === 'donut'. */
  donut?: { label?: string; target: number; achieved: number };
  /** Required when variant === 'two-donuts' or 'dual-bar'. */
  bars?: [SummaryCardBar, SummaryCardBar];
  /** Required when variant === 'three-donuts'. */
  trio?: [SummaryCardBar, SummaryCardBar, SummaryCardBar];
}

export interface Initiative {
  name: string;
  slug: string;
  primaryMetric: string;
  metrics: Metric[];
  /** Presentation config for the Summary page initiative card (spec §3.2). */
  summaryCard?: SummaryCardConfig;
}

export interface Geography {
  state: string;
  city?: string;
  rto?: string;
}

export interface CompletionData {
  label: string;
  target: number;
  achieved: number;
  completion: number;
}

export interface MapDataPoint {
  name: string;
  /** Numeric value to display under the name (raw count, completion %, etc.). */
  value: number;
  /**
   * Legacy binary status flag. When `format`/`band` are absent the bubble
   * falls back to this boolean (green check / red cross).
   */
  onTrack: boolean;
  /** Optional override for the value text (e.g. "12 / 50"). */
  label?: string;
  /**
   * Spec §4.5 — drives bubble rendering:
   *   X/Y → tinted by `band` (R/Y/G)
   *   Xx  → raw number, no color band
   *   Y/N → big Y (green) or N (red)
   */
  format?: MetricFormat;
  /** Computed traffic-light band for X/Y metrics. */
  band?: ColorBand;
}

export interface MapCenterBubble {
  /** Numeric backing value (used as fallback when displayText is absent). */
  value: number;
  /** Top-line label below the big number. */
  label: string;
  /** Smaller subtitle line below the label. */
  subtitle: string;
  /**
   * Optional override for the big display text. Lets the caller render
   * "65%" / "Y" / "1,250" / etc. without us guessing the format from
   * the numeric value.
   */
  displayText?: string;
}

export interface SummaryTableRow {
  state: string;
  target: number;
  achieved: number;
  completion: number;
}

export interface DetailTableRow {
  geography: string;
  target: number;
  achieved: number;
  completion: number;
}

export interface UploadRow {
  /** State the row belongs to (derived from `CITY_STATE_MAP`). */
  state: string;
  /** City / ULB — the "lowest level" at which data is captured. */
  city: string;
  /** Initiative name, e.g. "C&D - SCC". */
  initiative: string;
  /** @deprecated use `city`; kept for backwards compatibility. */
  geography: string;
  metric: string;
  metricType: MetricType;
  /** Display format — drives table column visibility (spec §7). */
  format: MetricFormat;
  /** Inverse / violation metric — color logic reverses on display. */
  isInverse?: boolean;
  /** Whether Start/End date are editable (spec §7.3 — only 2 metrics). */
  hasDates: boolean;
  targetVal: number | null;
  currentVal: number | null;
  unit: string;
  newVal: string;
  lastUpdated: string;
  lastUpdatedBy: string;
  startDate: string;
  endDate: string;
  remarks: string;
}

export interface CompletionThreshold {
  min: number;
  max: number;
  filledColor: string;
  remainderColor: string;
}

export interface DashboardOption {
  name: string;
  slug: string;
  label: string;
  sublabel?: string;
  active: boolean;
  color: 'blue' | 'orange';
}
