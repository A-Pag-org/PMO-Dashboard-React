// FILE: src/pages/DetailPage.tsx
// PURPOSE: Detailed view — filters, map + metrics (top), dual data tables (bottom)
// DESIGN REF: Wireframe pages 9–10 of 13 (Detailed View 1/2 + 2/2)

import { useMemo, useState } from 'react';
import {
  Truck,
  Calendar,
  ClipboardList,
  Store,
  FileText,
  Landmark,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import BottomBar from '@/components/layout/BottomBar';
import FilterPill from '@/components/ui/FilterPill';
import ViewToggle from '@/components/ui/ViewToggle';
import DelhiNCRMap from '@/components/maps/DelhiNCRMap';
import MetricCard from '@/components/ui/MetricCard';
import ProgressMetricRow from '@/components/ui/ProgressMetricRow';
import AverageOval from '@/components/ui/AverageOval';
import DataTable from '@/components/ui/DataTable';
import { getCompletionPercentage } from '@/lib/utils';
import {
  INITIATIVES,
  STATES,
  CITIES,
  CITY_STATE_MAP,
  RTO_OPTIONS_BY_CITY,
  MOCK_DETAIL_MAP_DATA,
  MOCK_DETAIL_CENTER_BUBBLE,
  MOCK_DETAIL_TABLE_ALL,
  MOCK_SUMMARY_BY_INITIATIVE,
  UPLOAD_CITY_OPTIONS_BY_STATE,
} from '@/lib/constants';
import type { ViewLevel } from '@/lib/types';

const VIEW_LEVELS = ['State', 'City', 'RTO'] as const;

export default function DetailPage() {
  const initiatives = INITIATIVES;
  const [selectedInitiative, setSelectedInitiative] = useState(initiatives[0].name);
  const [stateFilter, setStateFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [rtoFilter, setRtoFilter] = useState('All');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('state');
  const [selectedMetricByInitiative, setSelectedMetricByInitiative] = useState<Record<string, string>>({});

  const currentInit = initiatives.find((i) => i.name === selectedInitiative) ?? initiatives[0];
  const summaryData = MOCK_SUMMARY_BY_INITIATIVE[currentInit.slug];
  const outcomeMetrics = currentInit.metrics.filter((m) => m.type === 'outcome');
  const progressMetrics = currentInit.metrics.filter((m) => m.type === 'progress');
  const readinessMetrics = currentInit.metrics.filter((m) => m.type === 'readiness');
  const defaultSelectedMetricName = outcomeMetrics[0]?.name ?? currentInit.metrics[0]?.name ?? '';
  const selectedMetricName = selectedMetricByInitiative[currentInit.slug] ?? defaultSelectedMetricName;
  const selectedMetric = currentInit.metrics.find((m) => m.name === selectedMetricName) ?? currentInit.metrics[0];
  const isCentralLevelMetric = selectedMetric?.geographyLevel === 'central';

  const initiativeNames = initiatives.map((i) => i.name);
  const viewLabel: (typeof VIEW_LEVELS)[number] =
    viewLevel === 'state' ? 'State' : viewLevel === 'city' ? 'City' : 'RTO';

  const availableViewLevels = useMemo<readonly (typeof VIEW_LEVELS)[number][]>(() => {
    if (cityFilter !== 'All') return ['RTO'];
    if (stateFilter !== 'All') return ['City', 'RTO'];
    return VIEW_LEVELS;
  }, [stateFilter, cityFilter]);
  const effectiveViewLabel =
    availableViewLevels.includes(viewLabel) ? viewLabel : availableViewLevels[0];
  const effectiveViewLevel = effectiveViewLabel.toLowerCase() as ViewLevel;

  const stateOptions = ['All', ...STATES];

  const cityOptions = useMemo(() => {
    if (stateFilter === 'All') return ['All', ...CITIES];
    const cities = UPLOAD_CITY_OPTIONS_BY_STATE[stateFilter] ?? [];
    return ['All', ...cities];
  }, [stateFilter]);

  const rtoOptions = useMemo(() => {
    if (cityFilter === 'All') {
      const allRtos = Object.values(RTO_OPTIONS_BY_CITY).flat();
      return ['All', ...allRtos];
    }
    const rtos = RTO_OPTIONS_BY_CITY[cityFilter] ?? [];
    return ['All', ...rtos];
  }, [cityFilter]);

  function handleStateChange(v: string) {
    setStateFilter(v);
    setCityFilter('All');
    setRtoFilter('All');
  }

  function handleCityChange(v: string) {
    setCityFilter(v);
    setRtoFilter('All');
  }

  function handleResetFilters() {
    setStateFilter('All');
    setCityFilter('All');
    setRtoFilter('All');
    setViewLevel('state');
  }

  const filteredMapData = useMemo(() => {
    let data = MOCK_DETAIL_MAP_DATA;
    if (stateFilter !== 'All') {
      data = data.filter((d) => CITY_STATE_MAP[d.name] === stateFilter);
    }
    if (cityFilter !== 'All') {
      data = data.filter((d) => d.name === cityFilter);
    }
    return data;
  }, [stateFilter, cityFilter]);

  const filteredCityRows = useMemo(() => {
    let rows = MOCK_DETAIL_TABLE_ALL;
    if (stateFilter !== 'All') {
      rows = rows.filter((r) => CITY_STATE_MAP[r.geography] === stateFilter);
    }
    if (cityFilter !== 'All') {
      rows = rows.filter((r) => r.geography === cityFilter);
    }
    return rows.map((r) => ({
      label: r.geography,
      target: r.target,
      achieved: r.achieved,
      completion: r.completion,
    }));
  }, [stateFilter, cityFilter]);

  const stateTableRows = useMemo(
    () =>
      (summaryData?.table ?? [])
        .filter((r) => stateFilter === 'All' || r.state === stateFilter)
        .map((r) => ({
          label: r.state,
          target: r.target,
          achieved: r.achieved,
          completion: r.completion,
        })),
    [summaryData, stateFilter],
  );

  const rtoTableRows = useMemo(() => {
    const cityBaseRows = MOCK_DETAIL_TABLE_ALL.filter((r) => {
      if (stateFilter !== 'All' && CITY_STATE_MAP[r.geography] !== stateFilter) return false;
      if (cityFilter !== 'All' && r.geography !== cityFilter) return false;
      return true;
    });

    const rows = cityBaseRows.flatMap((cityRow) => {
      const rtos = RTO_OPTIONS_BY_CITY[cityRow.geography] ?? [`${cityRow.geography} RTO`];
      const perTarget = Math.floor(cityRow.target / rtos.length);
      const perAchieved = Math.floor(cityRow.achieved / rtos.length);

      return rtos.map((rtoName, idx) => {
        const last = idx === rtos.length - 1;
        const target = last
          ? cityRow.target - perTarget * (rtos.length - 1)
          : perTarget;
        const achieved = last
          ? cityRow.achieved - perAchieved * (rtos.length - 1)
          : perAchieved;
        const completion = target > 0 ? Math.round((achieved / target) * 100) : 0;
        return {
          label: rtoName,
          target,
          achieved,
          completion,
        };
      });
    });

    if (rtoFilter === 'All') return rows;
    return rows.filter((r) => r.label === rtoFilter);
  }, [stateFilter, cityFilter, rtoFilter]);

  const displayedTableRows = useMemo(() => {
    if (isCentralLevelMetric) return [];
    if (effectiveViewLevel === 'state') return stateTableRows;
    if (effectiveViewLevel === 'city') return filteredCityRows;
    return rtoTableRows;
  }, [isCentralLevelMetric, effectiveViewLevel, stateTableRows, filteredCityRows, rtoTableRows]);

  const displayedMapData = isCentralLevelMetric
    ? []
    : effectiveViewLevel === 'state'
      ? summaryData?.map ?? []
      : filteredMapData;

  const delhiNcrAvg = summaryData
    ? Math.round(summaryData.table.reduce((s, r) => s + r.completion, 0) / summaryData.table.length)
    : 0;

  const stateAvg = useMemo(() => {
    if (stateFilter === 'All') return delhiNcrAvg;
    const stateRow = summaryData?.table.find((r) => r.state === stateFilter);
    return stateRow?.completion ?? 0;
  }, [stateFilter, summaryData, delhiNcrAvg]);

  const cityAvg = useMemo(() => {
    if (cityFilter === 'All') return stateAvg;
    const cityRow = MOCK_DETAIL_TABLE_ALL.find((r) => r.geography === cityFilter);
    return cityRow?.completion ?? 0;
  }, [cityFilter, stateAvg]);

  const filteredGeoCompletion =
    isCentralLevelMetric && selectedMetric
      ? getCompletionPercentage(selectedMetric.target, selectedMetric.achieved)
      : displayedTableRows.length === 0
        ? 0
        : Math.round(
            displayedTableRows.reduce((acc, row) => acc + row.completion, 0) /
              displayedTableRows.length,
          );

  const geographyLabel =
    effectiveViewLevel === 'state'
      ? 'State'
      : effectiveViewLevel === 'city'
        ? 'City'
        : 'RTO';
  const secondaryMetric =
    currentInit.metrics.find((m) => m.name !== selectedMetric?.name && m.geographyLevel !== 'central');
  const activeFilters = [
    stateFilter !== 'All' ? `State: ${stateFilter}` : null,
    cityFilter !== 'All' ? `City: ${cityFilter}` : null,
    rtoFilter !== 'All' ? `RTO: ${rtoFilter}` : null,
  ].filter(Boolean) as string[];

  function handleViewLevelChange(v: string) {
    setViewLevel(v.toLowerCase() as ViewLevel);
  }

  function handleMapBubbleClick(name: string) {
    const isState = STATES.includes(name as (typeof STATES)[number]);
    if (isState) {
      setStateFilter(name);
      setCityFilter('All');
      setRtoFilter('All');
      return;
    }

    setCityFilter(name);
    setRtoFilter('All');
    const mappedState = CITY_STATE_MAP[name];
    if (mappedState) {
      setStateFilter(mappedState);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar
        activePage="detail"
        pageTitle="DETAILED VIEW (1/2)"
        showBackToSummary
      />

      <div className="flex h-full flex-1 flex-col">
        {/* ── FILTER BAR ── */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 bg-[var(--color-navy-mid)] px-4 py-2">
          <FilterPill
            label="State"
            options={stateOptions as unknown as string[]}
            value={stateFilter}
            onChange={handleStateChange}
          />
          <FilterPill
            label="City"
            options={cityOptions as unknown as string[]}
            value={cityFilter}
            onChange={handleCityChange}
          />
          <FilterPill
            label="RTO"
            options={rtoOptions}
            value={rtoFilter}
            onChange={setRtoFilter}
          />
          <div className="mx-2 h-6 w-px bg-white/20" />
          <FilterPill
            label="Initiative"
            options={initiativeNames}
            value={selectedInitiative}
            onChange={setSelectedInitiative}
          />
          <button
            type="button"
            onClick={handleResetFilters}
            className="ml-auto inline-flex min-h-[40px] items-center rounded-md border border-white/40 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            Reset filters
          </button>
        </div>
        <div className="flex min-h-[34px] items-center gap-2 border-b border-[var(--color-divider-dashed)] bg-[var(--color-surface-light)] px-4 py-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Active filters:</span>
          {activeFilters.length > 0 ? (
            activeFilters.map((filter) => (
              <span
                key={filter}
                className="inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[var(--color-text-primary)]"
              >
                {filter}
              </span>
            ))
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">None (showing all)</span>
          )}
        </div>

        {/* ── TOP HALF — Map + Metrics ── */}
        <div className="flex min-h-0 flex-1 border-b border-[var(--color-divider-dashed)]">
          {/* Left column — Map */}
          <div className="flex w-1/2 flex-col border-r border-[var(--color-divider-dashed)]">
            <div className="shrink-0 bg-[var(--color-navy)] px-4 py-2">
              <h2 className="text-xs font-semibold text-[var(--color-text-white)]">
                {currentInit.primaryMetric}
              </h2>
            </div>
            <div className="shrink-0 px-4 py-2">
              <ViewToggle options={availableViewLevels} value={effectiveViewLabel} onChange={handleViewLevelChange} />
            </div>
            <div className="px-4 pb-1">
              <span className="inline-flex rounded-full bg-[var(--color-surface-light)] px-3 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                % completion of filtered geo: {filteredGeoCompletion}%
              </span>
              {isCentralLevelMetric ? (
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  Selected metric is central-level; map shows center bubble only.
                </p>
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center px-3">
              <div className="h-full w-full max-h-[560px] max-w-[720px]">
                <DelhiNCRMap
                  data={displayedMapData}
                  centerBubble={summaryData?.center ?? MOCK_DETAIL_CENTER_BUBBLE}
                  onBubbleClick={handleMapBubbleClick}
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap justify-center gap-2 px-4 py-1.5">
              <AverageOval label="Delhi-NCR avg" value={`${delhiNcrAvg}%`} />
              <AverageOval
                label="State avg"
                value={`${stateAvg}%`}
                visible={effectiveViewLevel === 'city' || effectiveViewLevel === 'rto'}
              />
              <AverageOval
                label="City avg"
                value={`${cityAvg}%`}
                visible={effectiveViewLevel === 'rto'}
              />
            </div>
          </div>

          {/* Right column — Metrics */}
          <div className="flex w-1/2 flex-col overflow-y-auto">
            <div className="shrink-0 bg-[var(--color-navy)] px-4 py-2">
              <h3 className="text-xs font-semibold text-[var(--color-text-white)]">
                Outcome metrics
              </h3>
            </div>
            <div className="space-y-2 p-3">
              {outcomeMetrics.length > 0 ? (
                outcomeMetrics.map((m, i) => (
                  <MetricCard
                    key={m.name}
                    icon={i === 0 ? Truck : Calendar}
                    label={m.name}
                    achieved={m.achieved}
                    target={m.target}
                    selected={selectedMetric?.name === m.name}
                    onSelect={() =>
                      setSelectedMetricByInitiative((prev) => ({
                        ...prev,
                        [currentInit.slug]: m.name,
                      }))
                    }
                  />
                ))
              ) : (
                <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                  No outcome metrics for this initiative
                </p>
              )}
            </div>

            {progressMetrics.length > 0 && (
              <>
                <div className="shrink-0 bg-[var(--color-navy)] px-4 py-2">
                  <h3 className="text-xs font-semibold text-[var(--color-text-white)]">
                    Progress metrics
                  </h3>
                </div>
                <div className="space-y-2 p-3">
                  {progressMetrics.map((m, i) => {
                    const icons = [ClipboardList, Store, FileText, Landmark];
                    return (
                      <ProgressMetricRow
                        key={m.name}
                        icon={icons[i % icons.length]}
                        label={m.name}
                        achieved={m.achieved}
                        target={m.target}
                        selected={selectedMetric?.name === m.name}
                        onSelect={() =>
                          setSelectedMetricByInitiative((prev) => ({
                            ...prev,
                            [currentInit.slug]: m.name,
                          }))
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}
            {readinessMetrics.length > 0 && (
              <>
                <div className="shrink-0 bg-[var(--color-navy)] px-4 py-2">
                  <h3 className="text-xs font-semibold text-[var(--color-text-white)]">
                    Readiness metrics
                  </h3>
                </div>
                <div className="space-y-2 p-3">
                  {readinessMetrics.map((m, i) => {
                    const icons = [ClipboardList, Store, FileText, Landmark];
                    return (
                      <ProgressMetricRow
                        key={m.name}
                        icon={icons[i % icons.length]}
                        label={m.name}
                        achieved={m.achieved}
                        target={m.target}
                        selected={selectedMetric?.name === m.name}
                        onSelect={() =>
                          setSelectedMetricByInitiative((prev) => ({
                            ...prev,
                            [currentInit.slug]: m.name,
                          }))
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── BOTTOM HALF — Dual Data Tables ── */}
        <div className="shrink-0 px-4 py-3">
          {isCentralLevelMetric ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border-table)] p-6">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {selectedMetric?.name ?? 'Selected metric'} is central-level and does not appear in the geography table.
                </p>
              </div>
              <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border-table)] p-6">
                <p className="text-xs text-[var(--color-text-muted)]">
                  All other metrics on right side &raquo;
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DataTable
                title={selectedMetric?.name ?? currentInit.primaryMetric}
                geographyLabel={geographyLabel}
                rows={displayedTableRows}
              />
              {secondaryMetric ? (
                <DataTable
                  title={secondaryMetric.name}
                  geographyLabel={geographyLabel}
                  rows={displayedTableRows}
                />
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border-table)] p-6">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    All other metrics on right side &raquo;
                  </p>
                </div>
              )}
            </div>
          )}
          <p className="mt-2 text-center text-[var(--color-text-muted)]" style={{ fontSize: '10px' }}>
            The Y-axis of the table will change according to the view selected above;
            only metrics applicable to the selected view will be shown.
          </p>
        </div>

        <BottomBar showDetailedView={false} showAllDataView showManualData />
      </div>
    </div>
  );
}
