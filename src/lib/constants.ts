// FILE: lib/constants.ts
// PURPOSE: All static data, mock data arrays, and threshold configuration
// DESIGN REF: Wireframe pages 7–12 (all data values)

import type {
  Initiative,
  CompletionThreshold,
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
//   Row 2:  C&D - SCC         | C&D - ICCC             | Green BSVI  | Greening
export const INITIATIVES: Initiative[] = [
  {
    name: 'Naya Safar Yojana',
    slug: 'naya-safar-yojana',
    primaryMetric: 'No. of pre-BS VI buses / trucks converted',
    summaryCard: {
      description: 'No. of pre-BS VI buses / trucks converted',
      variant: 'dual-bar',
      bars: [
        { label: 'Trucks', target: 100, achieved: 50 },
        { label: 'Buses',  target: 100, achieved: 70 },
      ],
    },
    metrics: [
      { name: 'No. of pre-BSVI trucks converted', type: 'outcome', target: 76496, achieved: 38248, unit: 'vehicles' },
      { name: 'No. of pre-BSVI buses converted', type: 'outcome', target: 10000, achieved: 6500, unit: 'vehicles' },
      { name: 'No. of events conducted', type: 'outcome', target: 300, achieved: 81 },
      { name: 'No. of events planned', type: 'progress', target: null, achieved: null },
      { name: 'No. of outlets activated for fuel voucher acceptance', type: 'progress', target: 1500, achieved: 285 },
      { name: 'No. of PSBs / NBFCs onboarded', type: 'progress', target: 100, achieved: 78, geographyLevel: 'central' },
    ],
  },
  {
    name: 'CEMS/APCD installation',
    slug: 'cems-apcd',
    primaryMetric: 'No. of industrial units where CEMS / APCDs installation completed',
    summaryCard: {
      description: 'No. of industrial units where CEMS / APCDs installation completed',
      variant: 'dual-bar',
      bars: [
        { label: 'CEMS',  target: 100, achieved: 28 },
        { label: 'APCDs', target: 100, achieved: 44 },
      ],
    },
    metrics: [
      { name: '# industries with CEMS / APCDs installed', type: 'outcome', target: 500, achieved: 210 },
    ],
  },
  {
    name: 'Road Repair',
    slug: 'road-repair',
    primaryMetric: 'Road length for which repairs completed (km)',
    summaryCard: {
      description: 'Road length for which repairs completed (km)',
      variant: 'donut',
      donut: { target: 100, achieved: 73 },
    },
    metrics: [
      { name: 'Km road-length repaired', type: 'outcome', target: 1200, achieved: 780 },
    ],
  },
  {
    name: 'MRS',
    slug: 'mrs',
    primaryMetric: 'No. of MRS operational',
    summaryCard: {
      description: 'No. of MRS operational',
      variant: 'dual-bar',
      bars: [
        { label: '>15 mt',   target: 100, achieved: 50 },
        { label: '10-15 mt', target: 100, achieved: 70 },
      ],
    },
    metrics: [
      { name: 'Route coverage achieved', type: 'outcome', target: 200, achieved: 140 },
    ],
  },
  {
    name: 'C&D - SCC',
    slug: 'cd-scc',
    primaryMetric: 'No. of SCCs operationalized',
    summaryCard: {
      description: 'No. of SCCs operationalized',
      variant: 'donut',
      donut: { target: 100, achieved: 60 },
    },
    metrics: [
      { name: 'No. of SCC setup achieved', type: 'outcome', target: 500, achieved: 200 },
      { name: 'Total quantum of malba received at SCC', type: 'outcome', target: 400, achieved: 50, unit: 'MMT' },
      { name: 'No. of SCC identified (land parcels earmarked)', type: 'progress', target: null, achieved: 30 },
      { name: 'No. of SCC required', type: 'readiness', target: null, achieved: 500 },
    ],
  },
  {
    name: 'C&D - ICCC',
    slug: 'cd-iccc',
    primaryMetric: 'No. of sites registered and connected with ICCC',
    summaryCard: {
      description: 'No. of sites registered and connected with ICCC',
      variant: 'donut',
      donut: { target: 100, achieved: 90 },
    },
    metrics: [
      { name: '# sites integrated in ICCC', type: 'outcome', target: 100, achieved: 45 },
    ],
  },
  {
    name: 'Green BSVI',
    slug: 'green-bsvi',
    primaryMetric: 'No. of tolls where Green BSVI collection initiated',
    summaryCard: {
      description: 'No. of tolls where Green BSVI collection initiated',
      variant: 'donut',
      donut: { target: 100, achieved: 20 },
    },
    metrics: [
      { name: '# tolls with Green BSVI collection initiated', type: 'outcome', target: 50, achieved: 32 },
    ],
  },
  {
    name: 'Greening',
    slug: 'greening',
    primaryMetric: 'Area of land greened (hectares)',
    summaryCard: {
      description: 'Area of land greened (hectares)',
      variant: 'donut',
      donut: { target: 100, achieved: 90 },
    },
    metrics: [
      { name: 'Phase 1 implementation of greening action plan initiated', type: 'outcome', target: 100, achieved: 60 },
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

// ─── Completion Bar Thresholds ──────────────────────────────────────────

export const COMPLETION_THRESHOLDS: CompletionThreshold[] = [
  { min: 70, max: 100, filledColor: 'var(--color-bar-high)',    remainderColor: 'var(--color-bar-high-rem)' },
  { min: 40, max: 69,  filledColor: 'var(--color-bar-mid)',     remainderColor: 'var(--color-bar-mid-rem)' },
  { min: 20, max: 39,  filledColor: 'var(--color-bar-low)',     remainderColor: 'var(--color-bar-low-rem)' },
  { min: 0,  max: 19,  filledColor: 'var(--color-bar-low)',     remainderColor: 'var(--color-bar-low-rem)' },
];

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
  'green-bsvi': {
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
    center: { value: 32, label: 'Tolls with Green BSVI Collection', subtitle: '32 / 50 tolls' },
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

// ─── Mock Data: Upload Page Rows — per initiative, all 9 cities ─────────
// TODO: replace with API call
// Keyed by initiative slug. Each has rows for cities with realistic metrics.

function makeUploadRows(
  cities: string[],
  metrics: { name: string; type: 'outcome' | 'progress' | 'readiness'; unit: string; hasDates?: boolean }[],
  filledCities: string[],
): UploadRow[] {
  const rows: UploadRow[] = [];
  for (const city of cities) {
    const hasFill = filledCities.includes(city);
    for (const m of metrics) {
      rows.push({
        geography: city,
        metric: m.name,
        metricType: m.type,
        targetVal: hasFill ? Math.floor(Math.random() * 400 + 100) : null,
        currentVal: hasFill ? Math.floor(Math.random() * 200 + 10) : null,
        unit: m.unit,
        newVal: '',
        lastUpdated: hasFill ? '2026-04-10T14:30:00' : '',
        lastUpdatedBy: hasFill ? `admin@${city.toLowerCase().replace(/\s+/g, '')}.gov.in` : '',
        startDate: m.hasDates && hasFill ? '2026-01-01' : '',
        endDate: m.hasDates && hasFill ? '2026-12-31' : '',
        remarks: '',
      });
    }
  }
  return rows;
}

const ALL_CITIES_ORDERED = ['Delhi', 'Noida', 'Greater Noida', 'Ghaziabad', 'Gurugram', 'Rohtak', 'Panipat', 'Neemrana', 'Alwar'];

export const MOCK_UPLOAD_BY_INITIATIVE: Record<string, UploadRow[]> = {
  'naya-safar-yojana': makeUploadRows(ALL_CITIES_ORDERED, [
    { name: 'Pre-BS VI trucks / buses converted', type: 'outcome', unit: 'vehicles' },
    { name: 'No. of Events Conducted', type: 'outcome', unit: '-' },
    { name: 'No. of Events Planned', type: 'progress', unit: '-' },
    { name: 'No. of Outlets Activated', type: 'progress', unit: '-' },
  ], ['Delhi', 'Noida', 'Gurugram']),

  'cd-iccc': makeUploadRows(ALL_CITIES_ORDERED, [
    { name: '# sites integrated in ICCC', type: 'outcome', unit: 'sites' },
    { name: '# cameras installed', type: 'progress', unit: '-' },
    { name: '# sites identified for ICCC', type: 'readiness', unit: '-' },
  ], ['Delhi', 'Gurugram', 'Noida']),

  'cems-apcd': makeUploadRows(ALL_CITIES_ORDERED, [
    { name: '# industries with CEMS installed', type: 'outcome', unit: 'industries' },
    { name: '# industries with APCDs installed', type: 'outcome', unit: 'industries' },
    { name: '# industries identified for CEMS/APCD', type: 'progress', unit: '-' },
    { name: '# show-cause notices issued', type: 'progress', unit: '-' },
  ], ['Delhi', 'Noida', 'Greater Noida', 'Ghaziabad']),

  'road-repair': makeUploadRows(ALL_CITIES_ORDERED, [
    { name: 'Km road-length repaired', type: 'outcome', unit: 'km' },
    { name: 'No. of roads identified for repair', type: 'progress', unit: '-' },
    { name: 'No. of roads surveyed', type: 'readiness', unit: '-' },
  ], ['Delhi', 'Gurugram', 'Rohtak', 'Panipat']),

  'green-bsvi': makeUploadRows(ALL_CITIES_ORDERED, [
    { name: '# tolls with Green BSVI collection initiated', type: 'outcome', unit: 'tolls' },
    { name: 'Green BSVI amount collected', type: 'outcome', unit: 'INR Cr' },
    { name: '# tolls identified for Green BSVI', type: 'progress', unit: '-' },
  ], ['Delhi', 'Gurugram', 'Panipat', 'Alwar']),

  'cd-scc': makeUploadRows(ALL_CITIES_ORDERED, [
    { name: 'No. of SCC setup achieved', type: 'outcome', unit: '-' },
    { name: 'Total quantum of malba received at SCC', type: 'outcome', unit: 'MMT', hasDates: true },
    { name: 'No. of SCC identified (land parcels earmarked)', type: 'progress', unit: '-' },
    { name: 'No. of SCC required', type: 'readiness', unit: '-' },
  ], ['Delhi', 'Noida', 'Gurugram']),

  'greening': makeUploadRows(ALL_CITIES_ORDERED, [
    { name: 'Phase 1 greening action plan zones completed', type: 'outcome', unit: 'zones' },
    { name: 'No. of saplings planted', type: 'outcome', unit: '-' },
    { name: 'No. of zones identified', type: 'progress', unit: '-' },
  ], ['Delhi', 'Noida', 'Gurugram', 'Rohtak', 'Neemrana']),

  'mrs': makeUploadRows(ALL_CITIES_ORDERED, [
    { name: 'Route coverage achieved', type: 'outcome', unit: 'routes' },
    { name: 'MRS: Road coverage', type: 'outcome', unit: 'km', hasDates: true },
    { name: 'No. of vehicles deployed', type: 'progress', unit: '-' },
    { name: 'No. of routes planned', type: 'readiness', unit: '-' },
  ], ['Delhi', 'Noida', 'Gurugram', 'Greater Noida', 'Rohtak']),
};

// Legacy flat export
export const MOCK_UPLOAD_ROWS: UploadRow[] = MOCK_UPLOAD_BY_INITIATIVE['cd-scc'];

// ─── Initiative names for upload page dropdown ──────────────────────────

export const UPLOAD_INITIATIVE_SLUG_MAP: Record<string, string> = {
  'Naya Safar Yojana': 'naya-safar-yojana',
  'C&D - ICCC': 'cd-iccc',
  'CEMS/APCD installation': 'cems-apcd',
  'Road Repair': 'road-repair',
  'Green BSVI': 'green-bsvi',
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
