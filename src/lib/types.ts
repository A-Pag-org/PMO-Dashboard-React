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

export interface Initiative {
  name: string;
  slug: string;
  primaryMetric: string;
  metrics: Metric[];
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
