// FILE: lib/types.ts
// PURPOSE: All TypeScript interfaces and type definitions for the application
// DESIGN REF: Wireframe pages 7–12 (all data structures)

export type MetricType = 'outcome' | 'progress' | 'readiness';

export type ViewLevel = 'state' | 'city' | 'rto';

export interface Metric {
  name: string;
  type: MetricType;
  target: number | null;
  achieved: number | null;
  unit?: string;
  geographyLevel?: 'state' | 'city' | 'rto' | 'central';
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
   * 'donut' shows a single ring with the % in the centre and X/Y below.
   * 'dual-bar' shows two horizontal bars with sub-metric labels on the left
   * and X/Y values on the right (wireframe page 7).
   */
  variant: 'donut' | 'dual-bar';
  /** Required when variant === 'donut'. */
  donut?: { label?: string; target: number; achieved: number };
  /** Required when variant === 'dual-bar'. */
  bars?: [SummaryCardBar, SummaryCardBar];
}

export interface Initiative {
  name: string;
  slug: string;
  primaryMetric: string;
  metrics: Metric[];
  /** Presentation config for the Summary page initiative card (wireframe page 7). */
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
  value: number;
  onTrack: boolean;
  label?: string;
}

export interface MapCenterBubble {
  value: number;
  label: string;
  subtitle: string;
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
