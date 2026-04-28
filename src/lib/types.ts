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
  /** Free-text data source label (API / Manual / TBD etc.). */
  dataSource?: string;
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
   *   'three-donuts' — three side-by-side donuts (MRS: >15m, 10–15m, <10m).
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
