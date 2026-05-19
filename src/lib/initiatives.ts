// FILE: src/lib/initiatives.ts
// PURPOSE: Per-initiative configuration — the single source of truth for
//          spec §7 (geography model) and §8 (initiative-specific filters).
//
// One config entry per initiative. Adding a new initiative is purely a
// data change; no page or component needs to special-case logic.

export type GeographyLevel = 'state' | 'city' | 'rto' | 'toll' | 'ulb';

export interface ExtraFilter {
  /** URL query-param key, e.g. "vehicleType". */
  key: string;
  /** UI label, e.g. "Vehicle Type". */
  label: string;
  /** Enum options. */
  options: string[];
  /**
   * When true the filter is only offered once the user has narrowed
   * to a specific state *and* city (it's meaningless / too broad
   * before that). Defaults to always-visible.
   */
  requiresStateCity?: boolean;
}

export interface InitiativeConfig {
  slug: string;
  /** Geography levels the map may drill down to (spec §7). */
  geographyLevels: GeographyLevel[];
  /**
   * Initiative-specific filter dimensions in addition to Location.
   * Spec §8: max 3 filters total — Location counts as 1, so up to 2 extras.
   */
  extraFilters: ExtraFilter[];
  /**
   * Metric names (matching INITIATIVES[i].metrics[*].name) that should be
   * surfaced as the headline KPI donuts on the Summary tile and as the
   * default selection on the Detail page (spec §5: max 3, ideal 2).
   */
  headlineMetricNames: string[];
  /**
   * Display label for the mid-level geography dropdown in the navy
   * filter bar. Most initiatives say "City"; Naya Safar / CEMS use
   * "District" per the business-rules spec.
   */
  cityLabel?: string;
  /**
   * Display label for the deepest geography dropdown. Naya Safar uses
   * "RTO", CEMS uses "Industrial Area".
   */
  rtoLabel?: string;
}

export const INITIATIVE_CONFIGS: Record<string, InitiativeConfig> = {
  // Naya Safar — fleet conversion + outreach. RTO is meaningful here only.
  'naya-safar-yojana': {
    slug: 'naya-safar-yojana',
    geographyLevels: ['state', 'city', 'rto'],
    // No Vehicle Type filter — the metrics grid already shows trucks
    // and buses as separate tiles, so a top-bar bifurcation would be
    // redundant chrome.
    extraFilters: [],
    cityLabel: 'District',
    rtoLabel: 'RTO',
    headlineMetricNames: [
      'No. of pre-BS VI trucks converted',
      'No. of pre-BS VI buses converted',
    ],
  },

  // CEMS/APCD — industries are state-regulated; no city-level rollup yet.
  'cems-apcd': {
    slug: 'cems-apcd',
    geographyLevels: ['state'],
    extraFilters: [
      {
        key: 'industryType',
        label: 'Industry Type',
        options: ['Cement', 'Steel', 'Pulp & Paper', 'Power', 'Refinery'],
      },
      {
        key: 'pollutionCategory',
        label: 'Pollution Category',
        options: ['Red', 'Orange', 'Green', 'White'],
      },
    ],
    // Spec nomenclature kept ready for when city/industrial-area data
    // lands. Today the bar only renders State because geographyLevels
    // is ['state'].
    cityLabel: 'District',
    rtoLabel: 'Industrial Area',
    headlineMetricNames: [
      'No. of industrial units where CEMS installation completed',
      'No. of industrial units where APCDs installation completed',
      'No. of industries in violation of norms',
    ],
  },

  'road-repair': {
    slug: 'road-repair',
    geographyLevels: ['state', 'city'],
    extraFilters: [
      {
        key: 'agency',
        label: 'Agency',
        options: ['MCD', 'NDMC', 'PWD-Delhi', 'NHAI'],
        // Agencies are city-specific, so only offer this once the
        // user has drilled to a particular state + city.
        requiresStateCity: true,
      },
    ],
    headlineMetricNames: [
      'Road length for which repairs completed (km)',
      'Road length surveyed (km)',
    ],
  },

  mrs: {
    slug: 'mrs',
    geographyLevels: ['state', 'city'],
    // No Road Width filter — source agencies don't yet report MRS data
    // split by road width (>15m / 10–15m / <10m), so the metrics here
    // are surfaced as single all-width figures.
    extraFilters: [],
    headlineMetricNames: ['Route coverage achieved'],
  },

  'cd-scc': {
    slug: 'cd-scc',
    geographyLevels: ['state', 'city', 'ulb'],
    extraFilters: [
      {
        key: 'ulb',
        label: 'ULB',
        options: ['MCD', 'NDMC', 'GMDA', 'NMC', 'GBN', 'GZN'],
      },
    ],
    headlineMetricNames: [
      'No. of SCCs operationalized',
      'Recycling plant capacity available (tonnes)',
    ],
  },

  'cd-iccc': {
    slug: 'cd-iccc',
    geographyLevels: ['state', 'city'],
    extraFilters: [],
    headlineMetricNames: [
      'No. of sites registered and connected with ICCC',
      'Sites in violation of PM2.5 norms',
    ],
  },

  'green-contribution': {
    slug: 'green-contribution',
    geographyLevels: ['state', 'toll'],
    extraFilters: [
      {
        key: 'highway',
        label: 'Highway / Toll',
        options: [
          'Delhi-Meerut Expy',
          'Eastern Peripheral Expy',
          'NH-44',
          'NH-9',
          'NH-48',
        ],
      },
    ],
    headlineMetricNames: [
      'Tolls with Green Contribution collection initiated',
      'Identified tolls with Infra setup done (ANPR + FASTag)',
    ],
  },

  greening: {
    slug: 'greening',
    geographyLevels: ['state', 'city'],
    extraFilters: [
      {
        key: 'agency',
        label: 'Agency',
        options: ['Forest Dept', 'Horticulture Dept', 'MCD', 'DDA'],
      },
    ],
    headlineMetricNames: [
      'Area of land greened (hectares)',
      'No. of trees planted',
    ],
  },

  'stubble-burning': {
    slug: 'stubble-burning',
    geographyLevels: ['state'],
    extraFilters: [],
    headlineMetricNames: [
      'Reduction in farm fires vs baseline',
      'Paddy area covered by mechanized harvesting',
    ],
  },
};

export function getInitiativeConfig(slug: string): InitiativeConfig | undefined {
  return INITIATIVE_CONFIGS[slug];
}

export function supportsLevel(slug: string, level: GeographyLevel): boolean {
  const cfg = INITIATIVE_CONFIGS[slug];
  return cfg ? cfg.geographyLevels.includes(level) : false;
}

/**
 * Ministry that owns each initiative. Drives the optgroup headers on the
 * Initiative dropdown (Detail filter strip, All-data page). Mapping is
 * inferred from the `dataSource` strings already attached to each
 * initiative's metrics in constants.ts.
 */
export type Ministry = 'MoHUA' | 'MoEFCC' | 'MoRTH';

export const INITIATIVE_TO_MINISTRY: Record<string, Ministry> = {
  'road-repair':        'MoHUA',
  'mrs':                'MoHUA',
  'cd-scc':             'MoHUA',
  'greening':           'MoHUA',
  'cems-apcd':          'MoEFCC',
  'stubble-burning':    'MoEFCC',
  'cd-iccc':            'MoEFCC',
  'naya-safar-yojana':  'MoRTH',
  'green-contribution': 'MoRTH',
};

/** Order ministries are rendered in (matches the answered preview). */
export const MINISTRIES: readonly Ministry[] = ['MoHUA', 'MoEFCC', 'MoRTH'];

/**
 * Group initiative names under their ministries for use in a grouped
 * <select>. Initiatives missing a ministry mapping land in "Other".
 */
export function groupInitiativesByMinistry(
  initiatives: { name: string; slug: string }[],
): { label: string; options: string[] }[] {
  const byMinistry = new Map<string, string[]>();
  for (const i of initiatives) {
    const m = INITIATIVE_TO_MINISTRY[i.slug] ?? 'Other';
    const list = byMinistry.get(m) ?? [];
    list.push(i.name);
    byMinistry.set(m, list);
  }
  const ordered: { label: string; options: string[] }[] = [];
  for (const m of MINISTRIES) {
    const list = byMinistry.get(m);
    if (list && list.length > 0) ordered.push({ label: m, options: list });
  }
  const other = byMinistry.get('Other');
  if (other && other.length > 0) ordered.push({ label: 'Other', options: other });
  return ordered;
}
