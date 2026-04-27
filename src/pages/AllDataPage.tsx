// FILE: src/pages/AllDataPage.tsx
// PURPOSE: All Data View (spec §6) — full tabular data, all geographies,
//          for the initiative carried over from the Detailed View.
//
// Spec rules:
//   §6.1  initiative carried via ?initiative=<name> from Detail's
//         "See all data" link.
//   §6.2  rows are nested:  NCR > State > City > RTO  with indentation
//         and expand/collapse on every parent.
//   §6.3  columns vary by metric format (X/Y vs Xx vs Y/N).
//   §6.4  geography + completion sortable; geography filter via dropdown.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import FilterPill from '@/components/ui/FilterPill';
import NestedDataTable, { type NestedRow } from '@/components/ui/NestedDataTable';
import {
  INITIATIVES,
  STATES,
  UPLOAD_CITY_OPTIONS_BY_STATE,
  RTO_OPTIONS_BY_CITY,
} from '@/lib/constants';
import { getInitiativeConfig } from '@/lib/initiatives';
import { getMetricValueForArea, type AreaScope } from '@/lib/aggregation';
import { getCompletionPercentage } from '@/lib/utils';
import type { Metric } from '@/lib/types';
import { useDetailFilters } from '@/lib/useDetailFilters';

/**
 * Build a row from the shared aggregator at a given area scope. Keeps
 * the page free of any per-state weight math.
 */
function rowFor(
  metric: Metric,
  scope: AreaScope,
  level: 0 | 1 | 2 | 3,
  id: string,
  label: string,
  children?: NestedRow[],
): NestedRow {
  const agg = getMetricValueForArea(metric, scope, label);
  if (metric.format === 'Y/N') {
    // For tree rendering, aggregate Y/N by strict-AND of children.
    if (children && children.length > 0) {
      const allYes = children.every((c) => c.achieved === 1);
      return { id, label, level, target: 1, achieved: allYes ? 1 : 0, children };
    }
    return { id, label, level, target: 1, achieved: agg.achieved };
  }
  if (metric.format === 'Xx') {
    return {
      id,
      label,
      level,
      target: null,
      achieved: children
        ? children.reduce((s, c) => s + (c.achieved ?? 0), 0)
        : agg.achieved,
      children,
    };
  }
  // X/Y — sum children for parent rows so totals reconcile.
  if (children && children.length > 0) {
    return {
      id,
      label,
      level,
      target: Math.max(1, children.reduce((s, c) => s + (c.target ?? 0), 0)),
      achieved: children.reduce((s, c) => s + (c.achieved ?? 0), 0),
      children,
    };
  }
  return { id, label, level, target: agg.target, achieved: agg.achieved };
}

/**
 * Builds the NCR > State > City > RTO tree using the shared aggregator.
 * Every numeric value comes from getMetricValueForArea — no local
 * weight or split math.
 */
function buildTree(metric: Metric, stateFilter: string, includeRtoLevel: boolean): NestedRow[] {
  const stateNodes = STATES
    .filter((s) => stateFilter === 'All' || s === stateFilter)
    .map((state) => {
      const cities = UPLOAD_CITY_OPTIONS_BY_STATE[state] ?? [];
      const cityChildren = cities.map((city) => {
        const rtos = includeRtoLevel ? RTO_OPTIONS_BY_CITY[city] ?? [] : [];
        const rtoChildren = rtos.map((rto) =>
          rowFor(
            metric,
            { state, city, rto },
            3,
            `rto::${state}::${city}::${rto}`,
            rto,
          ),
        );
        return rowFor(
          metric,
          { state, city },
          2,
          `city::${state}::${city}`,
          city,
          rtoChildren.length ? rtoChildren : undefined,
        );
      });
      return rowFor(
        metric,
        { state },
        1,
        `state::${state}`,
        state,
        cityChildren,
      );
    });

  if (stateFilter !== 'All') return stateNodes;

  return [
    rowFor(metric, {}, 0, 'ncr::delhi-ncr', 'Delhi NCR', stateNodes),
  ];
}

export default function AllDataPage() {
  // Honour ?initiative=<name> passed in from Detail page (spec §4.1).
  const { initiativeName } = useDetailFilters();
  const [initiative, setInitiative] = useState(
    INITIATIVES.find((i) => i.name === initiativeName)?.name ?? INITIATIVES[0].name,
  );
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [selectedMetricByInitiative, setSelectedMetricByInitiative] =
    useState<Record<string, string>>({});

  const selectedInitiative = INITIATIVES.find((i) => i.name === initiative) ?? INITIATIVES[0];
  const metricOptions = selectedInitiative.metrics.map((m) => m.name);
  const selectedMetricName =
    selectedMetricByInitiative[selectedInitiative.slug] ?? metricOptions[0];
  const selectedMetric =
    selectedInitiative.metrics.find((m) => m.name === selectedMetricName) ??
    selectedInitiative.metrics[0];

  // Spec §7: RTO is in the geography model for Naya Safar only. Other
  // initiatives stop the tree at the city level.
  const includeRtoLevel =
    getInitiativeConfig(selectedInitiative.slug)?.geographyLevels.includes('rto') ?? false;

  const tree = useMemo(
    () =>
      selectedMetric ? buildTree(selectedMetric, stateFilter, includeRtoLevel) : [],
    [selectedMetric, stateFilter, includeRtoLevel],
  );

  const stateOptions = ['All', ...STATES];
  const isCentral = selectedMetric?.geographyLevel === 'central';
  const ncrPct = selectedMetric
    ? getCompletionPercentage(selectedMetric.target, selectedMetric.achieved)
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar
        activePage="all-data"
        pageTitle="ALL DATA VIEW"
        showBackToSummary
      />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-table)] bg-[var(--color-navy-mid)] px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              label="Initiative"
              options={INITIATIVES.map((i) => i.name)}
              value={initiative}
              onChange={setInitiative}
            />
            <FilterPill
              label="State"
              options={stateOptions}
              value={stateFilter}
              onChange={setStateFilter}
            />
            <FilterPill
              label="Metric"
              options={metricOptions}
              value={selectedMetricName}
              onChange={(metricName) =>
                setSelectedMetricByInitiative((prev) => ({
                  ...prev,
                  [selectedInitiative.slug]: metricName,
                }))
              }
            />
          </div>

          <Link
            to="/dashboard/detail"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[var(--color-navy)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-blue-header)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to map
          </Link>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border-table)] bg-[var(--color-surface-light)] px-3 py-2">
            <div className="text-xs text-[var(--color-text-secondary)]">
              <p>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {selectedInitiative.name}
                </span>{' '}
                · {selectedMetric?.name ?? '—'}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                Format:{' '}
                <span className="font-mono">{selectedMetric?.format ?? 'X/Y'}</span>
                {selectedMetric?.isInverse ? ' · Inverse' : ''}
                {' · '}
                Source: {selectedMetric?.dataSource ?? '—'}
              </p>
            </div>
            {selectedMetric?.format === 'X/Y' ? (
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                NCR aggregate: {ncrPct}%
              </span>
            ) : null}
          </div>

          {isCentral ? (
            <div className="rounded-lg border border-dashed border-[var(--color-border-blue)] bg-[var(--color-blue-pale)] p-6">
              <p className="text-xs text-[var(--color-text-primary)]">
                <strong>{selectedMetric?.name}</strong> is a central-level
                metric — it is tracked at the NCR aggregate only. There is
                no per-state, per-city, or per-RTO breakdown for this
                metric.
              </p>
            </div>
          ) : (
            <NestedDataTable
              rows={tree}
              format={selectedMetric?.format ?? 'X/Y'}
              isInverse={selectedMetric?.isInverse ?? false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
