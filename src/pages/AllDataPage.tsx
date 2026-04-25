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
import { getCompletionPercentage } from '@/lib/utils';
import type { Metric } from '@/lib/types';
import { useDetailFilters } from '@/lib/useDetailFilters';

// Same per-state weights used on Detail page — keeps the demo consistent
// when a user navigates Detail → All Data.
const STATE_WEIGHTS: Record<string, number> = {
  Delhi: 0.40,
  'Uttar Pradesh': 0.25,
  Haryana: 0.22,
  Rajasthan: 0.13,
};

function rtoWeight(_rto: string, count: number): number {
  return 1 / Math.max(1, count);
}

/**
 * Builds a 4-level tree (NCR > State > City > RTO) of dummy values for
 * the given metric. Aggregates upward so child sums equal parent.
 */
function buildTree(metric: Metric, stateFilter: string): NestedRow[] {
  const totalTarget   = metric.target ?? 0;
  const totalAchieved = metric.achieved ?? 0;

  function calcChildXY(weight: number): { target: number; achieved: number } {
    if (metric.format === 'Y/N') return { target: 0, achieved: 0 };
    return {
      target: Math.max(metric.format === 'X/Y' ? 1 : 0, Math.round(totalTarget * weight)),
      achieved: Math.round(totalAchieved * weight),
    };
  }

  function rtoNode(state: string, city: string, rto: string, rtoCount: number, cityWeight: number): NestedRow {
    const w = cityWeight * rtoWeight(rto, rtoCount);
    const { target, achieved } = calcChildXY(w);
    if (metric.format === 'Y/N') {
      // Deterministic Y/N at RTO level using metric+rto name.
      let h = 0;
      const seed = metric.name + state + city + rto;
      for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
      const isYes = (h & 1) === 1;
      return {
        id: `rto::${state}::${city}::${rto}`,
        label: rto,
        level: 3,
        target: 1,
        achieved: isYes ? 1 : 0,
      };
    }
    if (metric.format === 'Xx') {
      return {
        id: `rto::${state}::${city}::${rto}`,
        label: rto,
        level: 3,
        target: null,
        achieved,
      };
    }
    return {
      id: `rto::${state}::${city}::${rto}`,
      label: rto,
      level: 3,
      target,
      achieved,
    };
  }

  function cityNode(state: string, city: string, stateWeight: number, cityCount: number): NestedRow {
    const cityWeight = stateWeight / Math.max(1, cityCount);
    const rtos = RTO_OPTIONS_BY_CITY[city] ?? [];
    const rtoChildren = rtos.map((r) => rtoNode(state, city, r, rtos.length, cityWeight));

    if (metric.format === 'Y/N') {
      // Aggregate "Y" iff ALL RTOs are Y (a strict reading; alternative
      // is majority — left as a TODO).
      const isYes = rtoChildren.length > 0 && rtoChildren.every((c) => c.achieved === 1);
      return {
        id: `city::${state}::${city}`,
        label: city,
        level: 2,
        target: 1,
        achieved: isYes ? 1 : 0,
        children: rtoChildren,
      };
    }
    const target = rtoChildren.reduce((s, c) => s + (c.target ?? 0), 0) || calcChildXY(cityWeight).target;
    const achieved = rtoChildren.reduce((s, c) => s + (c.achieved ?? 0), 0);
    return {
      id: `city::${state}::${city}`,
      label: city,
      level: 2,
      target: metric.format === 'Xx' ? null : Math.max(1, target),
      achieved,
      children: rtoChildren,
    };
  }

  function stateNode(state: string): NestedRow {
    const stateWeight = STATE_WEIGHTS[state] ?? 0.1;
    const cities = UPLOAD_CITY_OPTIONS_BY_STATE[state] ?? [];
    const cityChildren = cities.map((c) => cityNode(state, c, stateWeight, cities.length));

    if (metric.format === 'Y/N') {
      const isYes = cityChildren.length > 0 && cityChildren.every((c) => c.achieved === 1);
      return {
        id: `state::${state}`,
        label: state,
        level: 1,
        target: 1,
        achieved: isYes ? 1 : 0,
        children: cityChildren,
      };
    }
    const target = cityChildren.reduce((s, c) => s + (c.target ?? 0), 0);
    const achieved = cityChildren.reduce((s, c) => s + (c.achieved ?? 0), 0);
    return {
      id: `state::${state}`,
      label: state,
      level: 1,
      target: metric.format === 'Xx' ? null : Math.max(1, target),
      achieved,
      children: cityChildren,
    };
  }

  const stateNodes = STATES
    .filter((s) => stateFilter === 'All' || s === stateFilter)
    .map(stateNode);

  // L1 — Delhi NCR aggregate. Skip when a single state is filtered, to
  // avoid showing a near-duplicate top-level row.
  if (stateFilter !== 'All') return stateNodes;

  if (metric.format === 'Y/N') {
    const isYes = stateNodes.length > 0 && stateNodes.every((s) => s.achieved === 1);
    return [
      {
        id: 'ncr::delhi-ncr',
        label: 'Delhi NCR',
        level: 0,
        target: 1,
        achieved: isYes ? 1 : 0,
        children: stateNodes,
      },
    ];
  }
  const totalT = stateNodes.reduce((s, c) => s + (c.target ?? 0), 0);
  const totalA = stateNodes.reduce((s, c) => s + (c.achieved ?? 0), 0);
  return [
    {
      id: 'ncr::delhi-ncr',
      label: 'Delhi NCR',
      level: 0,
      target: metric.format === 'Xx' ? null : Math.max(1, totalT),
      achieved: totalA,
      children: stateNodes,
    },
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

  const tree = useMemo(
    () => (selectedMetric ? buildTree(selectedMetric, stateFilter) : []),
    [selectedMetric, stateFilter],
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
