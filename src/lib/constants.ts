// FILE: lib/constants.ts
// PURPOSE: All static data, mock data arrays, and threshold configuration
// DESIGN REF: Wireframe pages 7–12 (all data values)

import type {
  Initiative,
  Metric,
  SummaryTableRow,
  DetailTableRow,
  UploadRow,
  DashboardOption,
  MapDataPoint,
  MapCenterBubble,
} from './types';

// ─── 8 Initiatives (grid order from wireframe pages 7–8) ───────────────

// Order (left→right, top→bottom) matches wireframe page 7:
//   Row 1:  Naya Safar Yojana | CEMS/APCD installation | Road Repair | MRS
//   Row 2:  C&D - SCC         | C&D - ICCC             | Green Contribution | Greening
export const INITIATIVES: Initiative[] = [
  {
    // ─── Spec §5 rows 1–7 ───────────────────────────────────────────────
    name: 'Naya Safar Yojana',
    slug: 'naya-safar-yojana',
    primaryMetric: 'No. of pre-BS VI buses / trucks converted',
    summaryCard: {
      description: 'No. of pre-BS VI buses / trucks converted',
      variant: 'two-donuts',
      bars: [
        { label: 'Trucks', target: 76496, achieved: 38248 },
        { label: 'Buses',  target: 10000, achieved: 6500  },
      ],
    },
    metrics: [
      { name: 'No. of pre-BS VI trucks converted',                      type: 'outcome',  target: 76496, achieved: 38248, unit: 'vehicles', format: 'X/Y', dataSource: 'API (MoRTH portal)' },
      { name: 'No. of pre-BS VI buses converted',                       type: 'outcome',  target: 10000, achieved: 6500,  unit: 'vehicles', format: 'X/Y', dataSource: 'API (MoRTH portal)' },
      { name: 'No. of events conducted',                                type: 'outcome',  target: 300,   achieved: 81,                       format: 'X/Y', dataSource: 'API (States)' },
      { name: 'No. of events planned',                                  type: 'progress', target: 250,   achieved: 175,                      format: 'X/Y', dataSource: 'API (TBD)' },
      { name: 'No. of outlets activated for fuel voucher acceptance',   type: 'progress', target: 1500,  achieved: 285,                      format: 'X/Y', dataSource: 'API (TBD)' },
      { name: 'EOIs and Scrapping requests from truckers/bus owners',   type: 'progress', target: null,  achieved: 4820,                     format: 'Xx',  dataSource: 'API (MoRTH)' },
      { name: 'PSBs / NBFCs onboarded',                                 type: 'progress', target: null,  achieved: 28,    geographyLevel: 'central', format: 'Xx', dataSource: 'API (Canara Bank/MoRTH)' },
    ],
  },
  {
    // ─── Spec §5 rows 8–13 ──────────────────────────────────────────────
    name: 'CEMS/APCD',
    slug: 'cems-apcd',
    primaryMetric: 'No. of industrial units where CEMS / APCD installation completed',
    summaryCard: {
      description: 'No. of industrial units where CEMS / APCD installation completed',
      variant: 'two-donuts',
      bars: [
        { label: 'CEMS',  target: 250, achieved: 105 },
        { label: 'APCD',  target: 250, achieved: 105 },
      ],
    },
    metrics: [
      { name: 'No. of industrial units where CEMS installation completed',  type: 'outcome',  target: 250, achieved: 105,                                       format: 'X/Y', dataSource: 'API (CEMS CPCB portal)' },
      { name: 'No. of industrial units where APCDs installation completed', type: 'outcome',  target: 250, achieved: 105,                                       format: 'X/Y', dataSource: 'Manual (SPCBs)' },
      // X/Y* per §4.2 — denominator is Total Sites (500), not a target of 0.
      { name: 'No. of industries in violation of norms',                    type: 'outcome',  target: 500, achieved: 80,  isInverse: true, denominatorLabel: 'Total Sites',       format: 'X/Y', dataSource: 'API (CEMS CPCB)' },
      { name: 'No. of high polluting industries identified for APCD',       type: 'progress', target: null, achieved: 320,                                      format: 'Xx',  dataSource: 'Manual (States)' },
      { name: 'Industries with installation in progress',                   type: 'progress', target: 145, achieved: 65,                                        format: 'X/Y', dataSource: 'Manual (CPCB/MoEFCC)' },
      { name: 'Vendors empaneled for CEMS/APCD supply and O&M',             type: 'progress', target: null, achieved: 18,                                       format: 'Xx',  dataSource: 'Manual (CPCB)' },
    ],
  },
  {
    // ─── Spec §5 rows 14–20 ─────────────────────────────────────────────
    name: 'Road Repair',
    slug: 'road-repair',
    primaryMetric: 'Road length for which repairs completed (km)',
    summaryCard: {
      // Donut chosen over the spec's "single bar" per customer override.
      description: 'Road length for which repairs completed (km)',
      variant: 'donut',
      donut: { target: 1200, achieved: 780 },
    },
    metrics: [
      { name: 'Road length for which repairs completed (km)',     type: 'outcome',   target: 1200, achieved: 780, unit: 'km',  format: 'X/Y', dataSource: 'API (311 Apps)' },
      { name: 'Road length for which tender published (km)',      type: 'progress',  target: 1500, achieved: 980, unit: 'km',  format: 'X/Y', dataSource: 'MoHUA (TBD)' },
      { name: 'Road length for which work order issued (km)',     type: 'progress',  target: 1500, achieved: 820, unit: 'km',  format: 'X/Y', dataSource: 'MoHUA (TBD)' },
      { name: 'Road length surveyed (km)',                        type: 'progress',  target: 1800, achieved: 1320, unit: 'km', format: 'X/Y', dataSource: 'API (311 Apps)' },
      { name: 'Roads identified for repair after survey',         type: 'progress',  target: null, achieved: 612,                            format: 'Xx',  dataSource: 'API (311 Apps)' },
      // Y/N — target = 1, achieved = 1 (Y) or 0 (N)
      { name: 'Road asset baseline completed',                    type: 'readiness', target: 1,    achieved: 1,                              format: 'Y/N', dataSource: 'Manual' },
      { name: 'Digital tool to track resolution progress exists', type: 'readiness', target: 1,    achieved: 0,                              format: 'Y/N', dataSource: 'Manual' },
    ],
  },
  {
    // ─── Spec §5 rows 21–34 ─────────────────────────────────────────────
    name: 'MRS',
    slug: 'mrs',
    primaryMetric: 'Route coverage achieved',
    summaryCard: {
      description: 'Route coverage achieved (km)',
      variant: 'three-donuts',
      trio: [
        { label: '>15m',     target: 800, achieved: 560 },
        { label: '10–15m',   target: 600, achieved: 300 },
        { label: '<10m',     target: 400, achieved: 100 },
      ],
    },
    metrics: [
      // Outcome — route coverage, by road width
      { name: 'Route coverage achieved (>15m)',     type: 'outcome',   target: 800, achieved: 560, unit: 'km', format: 'X/Y', dataSource: 'API (MoHUA/PWD/MCD/DDA)' },
      { name: 'Route coverage achieved (10–15m)',   type: 'outcome',   target: 600, achieved: 300, unit: 'km', format: 'X/Y', dataSource: 'API (MoHUA/PWD/MCD/DDA)' },
      { name: 'Route coverage achieved (<10m)',     type: 'outcome',   target: 400, achieved: 100, unit: 'km', format: 'X/Y', dataSource: 'API (MoHUA/PWD/MCD/DDA)' },

      // Progress — target road length to be covered (Xx)
      { name: 'Target road length to be covered (>15m)',   type: 'progress', target: null, achieved: 800, unit: 'km', format: 'Xx', dataSource: 'API (TBD)' },
      { name: 'Target road length to be covered (10–15m)', type: 'progress', target: null, achieved: 600, unit: 'km', format: 'Xx', dataSource: 'API (TBD)' },
      { name: 'Target road length to be covered (<10m)',   type: 'progress', target: null, achieved: 400, unit: 'km', format: 'Xx', dataSource: 'API (TBD)' },

      // Progress — MRS operational, by road width
      { name: 'No. of MRS operational (>15m)',     type: 'progress', target: 60, achieved: 38, format: 'X/Y', dataSource: 'API (TBD)' },
      { name: 'No. of MRS operational (10–15m)',   type: 'progress', target: 45, achieved: 18, format: 'X/Y', dataSource: 'API (TBD)' },
      { name: 'No. of MRS operational (<10m)',     type: 'progress', target: 30, achieved: 6,  format: 'X/Y', dataSource: 'API (TBD)' },

      // Readiness — MRS required (Xx)
      { name: 'No. of MRS required (>15m)',     type: 'readiness', target: null, achieved: 60, format: 'Xx', dataSource: 'API (TBD)' },
      { name: 'No. of MRS required (10–15m)',   type: 'readiness', target: null, achieved: 45, format: 'Xx', dataSource: 'API (TBD)' },
      { name: 'No. of MRS required (<10m)',     type: 'readiness', target: null, achieved: 30, format: 'Xx', dataSource: 'API (TBD)' },

      // Readiness — Y/N
      { name: 'Procurement of all additional MRS initiated',  type: 'readiness', target: 1, achieved: 0, format: 'Y/N', dataSource: 'Manual' },
      { name: 'Digital tool to track road covered exists',    type: 'readiness', target: 1, achieved: 1, format: 'Y/N', dataSource: 'Manual' },
    ],
  },
  {
    // ─── Spec §5 rows 35–42 ─────────────────────────────────────────────
    name: 'C&D - SCC',
    slug: 'cd-scc',
    primaryMetric: 'No. of SCCs operationalized',
    summaryCard: {
      description: 'No. of SCCs operationalized',
      variant: 'donut',
      donut: { target: 500, achieved: 200 },
    },
    metrics: [
      { name: 'No. of SCCs operationalized',                           type: 'outcome',   target: 500, achieved: 200,                                  format: 'X/Y', dataSource: 'Manual (ULB C&D Dashboard)' },
      { name: 'Total quantum of malba received at SCC',                type: 'outcome',   target: null, achieved: 50,  unit: 'MMT',                    format: 'Xx',  dataSource: 'Manual (C&D Dashboard)' },
      { name: 'Utilization of C&D waste processed material (tonnes)',  type: 'progress',  target: 800, achieved: 420, unit: 'tonnes',                  format: 'X/Y', dataSource: 'MoHUA Malba portal (TBD)' },
      { name: 'Recycling plant capacity available (tonnes)',           type: 'progress',  target: 1000, achieved: 650, unit: 'tonnes',                 format: 'X/Y', dataSource: 'MoHUA Malba portal (TBD)' },
      { name: 'No. of SCC identified (land parcels earmarked)',        type: 'progress',  target: null, achieved: 320,                                 format: 'Xx',  dataSource: 'Manual (ULB C&D Dashboard)' },
      { name: 'No. of SCC required',                                   type: 'readiness', target: null, achieved: 500,                                 format: 'Xx',  dataSource: 'Manual (ULB C&D Dashboard)' },
      { name: 'Adequate recycling plant capacity in place',            type: 'readiness', target: 1,    achieved: 0,                                   format: 'Y/N', dataSource: 'Manual' },
      { name: 'Digital tool to track intake via SCCs exists',          type: 'readiness', target: 1,    achieved: 1,                                   format: 'Y/N', dataSource: 'Manual' },
    ],
  },
  {
    // ─── Spec §5 rows 43–46 ─────────────────────────────────────────────
    name: 'C&D - ICCC',
    slug: 'cd-iccc',
    primaryMetric: 'No. of sites registered and connected with ICCC',
    summaryCard: {
      description: 'No. of sites registered and connected with ICCC',
      variant: 'donut',
      donut: { target: 100, achieved: 45 },
    },
    metrics: [
      { name: 'No. of sites registered and connected with ICCC',     type: 'outcome',  target: 100, achieved: 45,                                       format: 'X/Y', dataSource: 'API (ICCC DPCC)' },
      // X/Y* — denominator is Total Sites (200), per §4.2.
      { name: 'Sites in violation of PM2.5 norms',                   type: 'outcome',  target: 200, achieved: 95, isInverse: true, denominatorLabel: 'Total Sites',       format: 'X/Y', dataSource: 'API (ICCC DPCC)' },
      { name: 'No. of inspections of construction sites conducted',  type: 'progress', target: 300, achieved: 245, isInverse: true,                      format: 'X/Y', dataSource: 'ICCC DPCC (TBD)' },
      { name: 'Total no. of construction sites >500 sqm',            type: 'progress', target: null, achieved: 612,                                      format: 'Xx',  dataSource: 'ICCC DPCC (TBD)' },
    ],
  },
  {
    // ─── Spec §5 rows 47–48 ─────────────────────────────────────────────
    name: 'Green Contribution',
    slug: 'green-contribution',
    primaryMetric: 'No. of tolls where Green Contribution collection initiated',
    summaryCard: {
      description: 'No. of tolls where Green Contribution collection initiated',
      variant: 'donut',
      donut: { target: 50, achieved: 32 },
    },
    metrics: [
      { name: 'Tolls with Green Contribution collection initiated',         type: 'outcome',  target: 50, achieved: 32, format: 'X/Y', dataSource: 'API (MoRTH / IHMCL)' },
      { name: 'Identified tolls with Infra setup done (ANPR + FASTag)',     type: 'progress', target: 50, achieved: 38, format: 'X/Y', dataSource: 'API (MoRTH / IHMCL)' },
    ],
  },
  {
    // ─── Spec §5 rows 49–54 ─────────────────────────────────────────────
    name: 'Greening',
    slug: 'greening',
    primaryMetric: 'Area of land greened (hectares)',
    summaryCard: {
      description: 'Area of land greened (hectares)',
      variant: 'donut',
      donut: { target: 5000, achieved: 3120 },
    },
    metrics: [
      { name: 'Area of land greened (hectares)',                          type: 'outcome',   target: 5000, achieved: 3120, unit: 'ha', format: 'X/Y', dataSource: 'Manual' },
      { name: 'No. of trees planted',                                     type: 'progress',  target: 250000, achieved: 162000,        format: 'X/Y', dataSource: 'Manual' },
      { name: 'No. of shrubs planted',                                    type: 'progress',  target: 180000, achieved: 78000,         format: 'X/Y', dataSource: 'Manual' },
      { name: 'No. of bamboos planted',                                   type: 'progress',  target: 60000,  achieved: 12000,         format: 'X/Y', dataSource: 'Manual' },
      { name: 'Annual city-level greening action plan finalized',         type: 'progress',  target: 1, achieved: 1,                  format: 'Y/N', dataSource: 'Manual (Forest/Horticulture dept)' },
      { name: 'Phase 1 implementation of greening action plan initiated', type: 'progress',  target: 1, achieved: 0,                  format: 'Y/N', dataSource: 'Manual (Forest/Horticulture dept)' },
    ],
  },
];

// ─── 9 Cities ───────────────────────────────────────────────────────────

export const CITIES = [
  'Delhi',
  'Noida',
  'Gurugram',
  'Greater Noida',
  'Ghaziabad',
  'Neemrana',
  'Rohtak',
  'Panipat',
  'Alwar',
] as const;

export type CityName = (typeof CITIES)[number];

// ─── 4 States ───────────────────────────────────────────────────────────

export const STATES = [
  'Delhi',
  'Uttar Pradesh',
  'Haryana',
  'Rajasthan',
] as const;

export type StateName = (typeof STATES)[number];

// ─── Current User & Tile Highlighting (spec §3.1) ──────────────────────
// Each user has a set of "relevant" initiatives that render at full
// color on the Summary page; all others are greyed out.
//
// TODO: replace with user lookup when Section 9 (Default View Mapping)
// is wired up — for now we hard-code MoHUA as the demo user.

export const CURRENT_USER_ID = 'MoHUA' as const;

export const HIGHLIGHTED_INITIATIVES_BY_USER: Record<string, string[]> = {
  // MoHUA — per spec §9.1
  MoHUA: [
    'naya-safar-yojana',
    'greening',
    'cems-apcd',
    'cd-scc',
    'mrs',
  ],
};

export function getHighlightedInitiativesForCurrentUser(): string[] {
  return HIGHLIGHTED_INITIATIVES_BY_USER[CURRENT_USER_ID] ?? [];
}

// ─── Dashboard Selection Options (wireframe page 6) ────────────────────

export const DASHBOARD_OPTIONS: DashboardOption[] = [
  { name: 'Action-Plan Dashboard', slug: 'action-plan', label: 'ACTION-PLAN DASHBOARD', active: false, color: 'blue' },
  { name: 'Impact Dashboard', slug: 'impact', label: 'IMPACT DASHBOARD', active: true, color: 'blue' },
];

// ─── Mock Data: Per-Initiative Summary (map + table) ────────────────────
// TODO: replace with API call
// Keyed by initiative slug. Each entry has state-level table rows,
// map data points, and a center bubble for the aggregate.

export interface InitiativeSummaryData {
  table: SummaryTableRow[];
  map: MapDataPoint[];
  center: MapCenterBubble;
}

export const MOCK_SUMMARY_BY_INITIATIVE: Record<string, InitiativeSummaryData> = {
  'naya-safar-yojana': {
    table: [
      { state: 'Delhi',         target: 3200, achieved: 2240, completion: 70 },
      { state: 'Uttar Pradesh', target: 2000, achieved: 500,  completion: 25 },
      { state: 'Haryana',       target: 2500, achieved: 500,  completion: 20 },
      { state: 'Rajasthan',     target: 1500, achieved: 750,  completion: 50 },
    ],
    map: [
      { name: 'Delhi',          value: 2240, onTrack: true,  label: '1,760 Trucks / 480 Buses' },
      { name: 'Uttar Pradesh',  value: 500,  onTrack: false, label: '400 Trucks / 100 Buses' },
      { name: 'Haryana',        value: 500,  onTrack: false, label: '380 Trucks / 120 Buses' },
      { name: 'Rajasthan',      value: 750,  onTrack: true,  label: '600 Trucks / 150 Buses' },
    ],
    center: { value: 15300, label: 'Pre-BS VI Trucks/Buses Converted', subtitle: '76,496 / 1,91,239 trucks' },
  },
  'cd-iccc': {
    table: [
      { state: 'Delhi',         target: 35, achieved: 28, completion: 80 },
      { state: 'Uttar Pradesh', target: 25, achieved: 8,  completion: 32 },
      { state: 'Haryana',       target: 20, achieved: 5,  completion: 25 },
      { state: 'Rajasthan',     target: 20, achieved: 4,  completion: 20 },
    ],
    map: [
      { name: 'Delhi',          value: 28, onTrack: true,  label: '28 sites' },
      { name: 'Uttar Pradesh',  value: 8,  onTrack: false, label: '8 sites' },
      { name: 'Haryana',        value: 5,  onTrack: false, label: '5 sites' },
      { name: 'Rajasthan',      value: 4,  onTrack: false, label: '4 sites' },
    ],
    center: { value: 45, label: 'Sites Integrated in ICCC', subtitle: '45 / 100 sites' },
  },
  'cems-apcd': {
    table: [
      { state: 'Delhi',         target: 180, achieved: 126, completion: 70 },
      { state: 'Uttar Pradesh', target: 120, achieved: 36,  completion: 30 },
      { state: 'Haryana',       target: 100, achieved: 28,  completion: 28 },
      { state: 'Rajasthan',     target: 100, achieved: 20,  completion: 20 },
    ],
    map: [
      { name: 'Delhi',          value: 126, onTrack: true,  label: '126 industries' },
      { name: 'Uttar Pradesh',  value: 36,  onTrack: false, label: '36 industries' },
      { name: 'Haryana',        value: 28,  onTrack: false, label: '28 industries' },
      { name: 'Rajasthan',      value: 20,  onTrack: false, label: '20 industries' },
    ],
    center: { value: 210, label: 'Industries with CEMS/APCDs', subtitle: '210 / 500 industries' },
  },
  'road-repair': {
    table: [
      { state: 'Delhi',         target: 400, achieved: 320, completion: 80 },
      { state: 'Uttar Pradesh', target: 300, achieved: 180, completion: 60 },
      { state: 'Haryana',       target: 300, achieved: 180, completion: 60 },
      { state: 'Rajasthan',     target: 200, achieved: 100, completion: 50 },
    ],
    map: [
      { name: 'Delhi',          value: 320, onTrack: true, label: '320 km' },
      { name: 'Uttar Pradesh',  value: 180, onTrack: true, label: '180 km' },
      { name: 'Haryana',        value: 180, onTrack: true, label: '180 km' },
      { name: 'Rajasthan',      value: 100, onTrack: true, label: '100 km' },
    ],
    center: { value: 780, label: 'Km Road-Length Repaired', subtitle: '780 / 1,200 km' },
  },
  'green-contribution': {
    table: [
      { state: 'Delhi',         target: 15, achieved: 14, completion: 93 },
      { state: 'Uttar Pradesh', target: 12, achieved: 8,  completion: 67 },
      { state: 'Haryana',       target: 13, achieved: 6,  completion: 46 },
      { state: 'Rajasthan',     target: 10, achieved: 4,  completion: 40 },
    ],
    map: [
      { name: 'Delhi',          value: 14, onTrack: true,  label: '14 tolls' },
      { name: 'Uttar Pradesh',  value: 8,  onTrack: true,  label: '8 tolls' },
      { name: 'Haryana',        value: 6,  onTrack: true,  label: '6 tolls' },
      { name: 'Rajasthan',      value: 4,  onTrack: false, label: '4 tolls' },
    ],
    center: { value: 32, label: 'Tolls with Green Contribution Collection', subtitle: '32 / 50 tolls' },
  },
  'cd-scc': {
    table: [
      { state: 'Delhi',         target: 150, achieved: 90,  completion: 60 },
      { state: 'Uttar Pradesh', target: 150, achieved: 55,  completion: 37 },
      { state: 'Haryana',       target: 100, achieved: 30,  completion: 30 },
      { state: 'Rajasthan',     target: 100, achieved: 25,  completion: 25 },
    ],
    map: [
      { name: 'Delhi',          value: 90, onTrack: true,  label: '90 SCC' },
      { name: 'Uttar Pradesh',  value: 55, onTrack: false, label: '55 SCC' },
      { name: 'Haryana',        value: 30, onTrack: false, label: '30 SCC' },
      { name: 'Rajasthan',      value: 25, onTrack: false, label: '25 SCC' },
    ],
    center: { value: 200, label: 'SCC Setup Achieved', subtitle: '200 / 500 sites' },
  },
  'greening': {
    table: [
      { state: 'Delhi',         target: 30, achieved: 24, completion: 80 },
      { state: 'Uttar Pradesh', target: 25, achieved: 15, completion: 60 },
      { state: 'Haryana',       target: 25, achieved: 12, completion: 48 },
      { state: 'Rajasthan',     target: 20, achieved: 9,  completion: 45 },
    ],
    map: [
      { name: 'Delhi',          value: 24, onTrack: true, label: '24 zones' },
      { name: 'Uttar Pradesh',  value: 15, onTrack: true, label: '15 zones' },
      { name: 'Haryana',        value: 12, onTrack: true, label: '12 zones' },
      { name: 'Rajasthan',      value: 9,  onTrack: true, label: '9 zones' },
    ],
    center: { value: 60, label: 'Greening Action Plan Phase 1', subtitle: '60 / 100 zones' },
  },
  'mrs': {
    table: [
      { state: 'Delhi',         target: 60, achieved: 54,  completion: 90 },
      { state: 'Uttar Pradesh', target: 50, achieved: 35,  completion: 70 },
      { state: 'Haryana',       target: 50, achieved: 30,  completion: 60 },
      { state: 'Rajasthan',     target: 40, achieved: 21,  completion: 53 },
    ],
    map: [
      { name: 'Delhi',          value: 54, onTrack: true, label: '54 routes' },
      { name: 'Uttar Pradesh',  value: 35, onTrack: true, label: '35 routes' },
      { name: 'Haryana',        value: 30, onTrack: true, label: '30 routes' },
      { name: 'Rajasthan',      value: 21, onTrack: true, label: '21 routes' },
    ],
    center: { value: 140, label: 'Route Coverage Achieved', subtitle: '140 / 200 routes' },
  },
};

// Legacy single-set exports kept for backward compat with detail page
export const MOCK_SUMMARY_TABLE: SummaryTableRow[] = MOCK_SUMMARY_BY_INITIATIVE['naya-safar-yojana'].table;
export const MOCK_SUMMARY_MAP_DATA: MapDataPoint[] = MOCK_SUMMARY_BY_INITIATIVE['naya-safar-yojana'].map;
export const MOCK_SUMMARY_CENTER_BUBBLE: MapCenterBubble = MOCK_SUMMARY_BY_INITIATIVE['naya-safar-yojana'].center;

// ─── City-to-State Mapping (used for cascading filters) ─────────────────

export const CITY_STATE_MAP: Record<string, string> = {
  'Delhi':        'Delhi',
  'Noida':        'Uttar Pradesh',
  'Greater Noida':'Uttar Pradesh',
  'Ghaziabad':    'Uttar Pradesh',
  'Gurugram':     'Haryana',
  'Rohtak':       'Haryana',
  'Panipat':      'Haryana',
  'Neemrana':     'Rajasthan',
  'Alwar':        'Rajasthan',
};

// ─── RTO Options per City ───────────────────────────────────────────────

export const RTO_OPTIONS_BY_CITY: Record<string, string[]> = {
  'Delhi':        ['Delhi Central', 'Delhi South', 'Delhi East', 'Delhi West'],
  'Noida':        ['Noida RTO', 'Noida Sector-20 RTO'],
  'Greater Noida':['Greater Noida RTO'],
  'Ghaziabad':    ['Ghaziabad RTO'],
  'Gurugram':     ['Gurugram RTO', 'Gurugram Sector-14 RTO'],
  'Rohtak':       ['Rohtak RTO'],
  'Panipat':      ['Panipat RTO'],
  'Neemrana':     ['Neemrana RTO'],
  'Alwar':        ['Alwar RTO'],
};

// ─── Mock Data: Detail Page Map — City Level (wireframe page 9) ────────
// TODO: replace with API call

export const MOCK_DETAIL_MAP_DATA: MapDataPoint[] = [
  { name: 'Delhi',         value: 2200, onTrack: true },
  { name: 'Noida',         value: 800,  onTrack: false },
  { name: 'Greater Noida', value: 700,  onTrack: false },
  { name: 'Ghaziabad',     value: 650,  onTrack: false },
  { name: 'Gurugram',      value: 3500, onTrack: true },
  { name: 'Rohtak',        value: 2800, onTrack: true },
  { name: 'Panipat',       value: 2800, onTrack: true },
  { name: 'Neemrana',      value: 1200, onTrack: true },
  { name: 'Alwar',         value: 900,  onTrack: true },
];

export const MOCK_DETAIL_CENTER_BUBBLE: MapCenterBubble = {
  value: 15300,
  label: 'Pre-BS VI Trucks/Buses Converted',
  subtitle: '76,496 / 1,91,239 trucks',
};

// ─── Mock Data: Detail Page Tables — per city (wireframe page 10) ──────
// TODO: replace with API call

export const MOCK_DETAIL_TABLE_ALL: DetailTableRow[] = [
  { geography: 'Delhi',         target: 3200, achieved: 2240, completion: 70 },
  { geography: 'Noida',         target: 2000, achieved: 500,  completion: 25 },
  { geography: 'Greater Noida', target: 1800, achieved: 360,  completion: 20 },
  { geography: 'Ghaziabad',     target: 1500, achieved: 225,  completion: 15 },
  { geography: 'Gurugram',      target: 2500, achieved: 1750, completion: 70 },
  { geography: 'Rohtak',        target: 1200, achieved: 600,  completion: 50 },
  { geography: 'Panipat',       target: 1000, achieved: 450,  completion: 45 },
  { geography: 'Neemrana',      target: 800,  achieved: 320,  completion: 40 },
  { geography: 'Alwar',         target: 600,  achieved: 180,  completion: 30 },
];

// Legacy alias
export const MOCK_DETAIL_TABLE = MOCK_DETAIL_TABLE_ALL;

// ─── Mock Data: Upload Page Rows (spec §7) ─────────────────────────────
//
// Per spec §7.1, only metrics whose data source is "Manually entered in
// portal" appear on the Manual Upload screen. We derive those rows
// directly from each initiative's metric list, so adding a new manual
// metric anywhere automatically lights it up on the upload page.
//
// Date fields are editable for ONLY two metrics per spec §7.3:
//   - "Total quantum of malba received at SCC"
//   - MRS Route coverage outcome metrics (>15m / 10–15m / <10m)
// (The MRS route-coverage metrics aren't strictly Manual per §5, but
//  §7.3 explicitly grants them date-edit access, so we surface them on
//  the upload screen with hasDates=true and value-fields locked.)

const ALL_CITIES_ORDERED = ['Delhi', 'Noida', 'Greater Noida', 'Ghaziabad', 'Gurugram', 'Rohtak', 'Panipat', 'Neemrana', 'Alwar'];

const DATE_METRIC_NAMES = new Set<string>([
  'Total quantum of malba received at SCC',
  'Route coverage achieved (>15m)',
  'Route coverage achieved (10–15m)',
  'Route coverage achieved (<10m)',
]);

/** True iff the metric is meant to surface on the Manual Upload screen. */
function isUploadableMetric(m: { dataSource?: string; name: string }): boolean {
  if (DATE_METRIC_NAMES.has(m.name)) return true;
  return (m.dataSource ?? '').toLowerCase().includes('manual');
}

/**
 * Build per-city rows for a single (initiative, metric) pair.
 * `filledCities` simulates which jurisdictions have already submitted
 * data — matters for the demo's "current val populated" look.
 */
function buildUploadRows(
  initiativeName: string,
  metric: Metric,
  cities: string[],
  filledCities: string[],
): UploadRow[] {
  const hasDates = DATE_METRIC_NAMES.has(metric.name);
  return cities.map((city) => {
    const hasFill = filledCities.includes(city);
    const state = CITY_STATE_MAP[city] ?? city;
    let target: number | null = null;
    let current: number | null = null;
    if (metric.format === 'X/Y' && hasFill) {
      target  = Math.floor(Math.random() * 400 + 100);
      current = Math.floor(Math.random() * (target + 1));
    } else if (metric.format === 'Xx' && hasFill) {
      current = Math.floor(Math.random() * 250 + 20);
    } else if (metric.format === 'Y/N' && hasFill) {
      target  = 1;
      current = Math.random() > 0.4 ? 1 : 0;
    }
    return {
      state,
      city,
      initiative: initiativeName,
      geography: city,
      metric: metric.name,
      metricType: metric.type,
      format: metric.format,
      isInverse: metric.isInverse,
      hasDates,
      targetVal: target,
      currentVal: current,
      unit: metric.unit ?? '-',
      newVal: '',
      lastUpdated:   hasFill ? '2026-04-10T14:30:00' : '',
      lastUpdatedBy: hasFill ? `admin@${city.toLowerCase().replace(/\s+/g, '')}.gov.in` : '',
      startDate: hasDates && hasFill ? '2026-01-01' : '',
      endDate:   hasDates && hasFill ? '2026-12-31' : '',
      remarks: '',
    };
  });
}

const FILLED_CITIES_BY_SLUG: Record<string, string[]> = {
  'naya-safar-yojana':  ['Delhi', 'Noida', 'Gurugram'],
  'cems-apcd':          ['Delhi', 'Noida', 'Greater Noida', 'Ghaziabad'],
  'road-repair':        ['Delhi', 'Gurugram', 'Rohtak', 'Panipat'],
  'mrs':                ['Delhi', 'Noida', 'Gurugram', 'Greater Noida', 'Rohtak'],
  'cd-scc':             ['Delhi', 'Noida', 'Greater Noida', 'Ghaziabad'],
  'cd-iccc':            ['Delhi', 'Gurugram', 'Noida'],
  'green-contribution': ['Delhi', 'Gurugram', 'Panipat', 'Alwar'],
  'greening':           ['Delhi', 'Noida', 'Gurugram', 'Rohtak', 'Neemrana'],
};

export const MOCK_UPLOAD_BY_INITIATIVE: Record<string, UploadRow[]> =
  Object.fromEntries(
    INITIATIVES.map((init) => {
      const filled = FILLED_CITIES_BY_SLUG[init.slug] ?? [];
      const rows = init.metrics
        .filter(isUploadableMetric)
        .flatMap((metric) =>
          buildUploadRows(init.name, metric, ALL_CITIES_ORDERED, filled),
        );
      return [init.slug, rows];
    }),
  );

// Flat list across every initiative — used as the primary data source by
// the Manual Data Upload page (wireframe page 11), where rows are filtered
// in-place via column-header dropdowns rather than a separate filter bar.
export const MOCK_UPLOAD_ROWS_ALL: UploadRow[] = Object.values(MOCK_UPLOAD_BY_INITIATIVE).flat();

// Legacy flat export
export const MOCK_UPLOAD_ROWS: UploadRow[] = MOCK_UPLOAD_BY_INITIATIVE['cd-scc'];

// ─── Initiative names for upload page dropdown ──────────────────────────

export const UPLOAD_INITIATIVE_SLUG_MAP: Record<string, string> = {
  'Naya Safar Yojana': 'naya-safar-yojana',
  'C&D - ICCC': 'cd-iccc',
  'CEMS/APCD': 'cems-apcd',
  'Road Repair': 'road-repair',
  'Green Contribution': 'green-contribution',
  'C&D - SCC': 'cd-scc',
  'Greening': 'greening',
  'MRS': 'mrs',
};

export const UPLOAD_STATE_OPTIONS = ['Delhi', 'Uttar Pradesh', 'Haryana', 'Rajasthan'] as const;

export const UPLOAD_CITY_OPTIONS_BY_STATE: Record<string, string[]> = {
  'Delhi': ['Delhi'],
  'Uttar Pradesh': ['Noida', 'Greater Noida', 'Ghaziabad'],
  'Haryana': ['Gurugram', 'Rohtak', 'Panipat'],
  'Rajasthan': ['Neemrana', 'Alwar'],
};
