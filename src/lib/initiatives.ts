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
}

export const INITIATIVE_CONFIGS: Record<string, InitiativeConfig> = {
  // Naya Safar — fleet conversion + outreach. RTO is meaningful here only.
  'naya-safar-yojana': {
    slug: 'naya-safar-yojana',
    geographyLevels: ['state', 'city', 'rto'],
    extraFilters: [
      { key: 'vehicleType', label: 'Vehicle Type', options: ['Truck', 'Bus'] },
    ],
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
      },
      {
        key: 'roadType',
        label: 'Road Type',
        options: ['National Highway', 'State Highway', 'Major District', 'Other'],
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
    extraFilters: [
      { key: 'roadWidth', label: 'Road Width', options: ['>15m', '10–15m', '<10m'] },
    ],
    headlineMetricNames: [
      'Route coverage achieved (>15m)',
      'Route coverage achieved (10–15m)',
      'Route coverage achieved (<10m)',
    ],
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
};

export function getInitiativeConfig(slug: string): InitiativeConfig | undefined {
  return INITIATIVE_CONFIGS[slug];
}

export function supportsLevel(slug: string, level: GeographyLevel): boolean {
  const cfg = INITIATIVE_CONFIGS[slug];
  return cfg ? cfg.geographyLevels.includes(level) : false;
}
