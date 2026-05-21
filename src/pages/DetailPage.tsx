// FILE: src/pages/DetailPage.tsx
// PURPOSE: Per-initiative detail view, laid out as a 4-column NCR state
//          comparison with click-to-expand drill into cities and a modal
//          drill into RTO-level data. Mirrors the wireframes signed off
//          for the Naya Safar Yojana initiative; degrades gracefully for
//          initiatives whose data model stops at the state level.
//
// Layout (from spec wireframes):
//   ┌────────────────────────────────────────────────────────────┐
//   │  Yellow rail  │  Initiative dropdown                       │
//   │  ↑ All        │  ┌──────────────────────────────────────┐  │
//   │   programmes  │  │  DELHI NCR — aggregate metrics       │  │
//   │  NSY · Naya   │  └──────────────────────────────────────┘  │
//   │  Safar        │  ┌─────────┬─────────┬─────────┬─────────┐ │
//   │               │  │ Delhi   │   UP    │ Rajasth │ Haryana │ │
//   │               │  │ metrics │ metrics │ metrics │ metrics │ │
//   │               │  └─────────┴─────────┴─────────┴─────────┘ │
//   └────────────────────────────────────────────────────────────┘
//
//   Clicking a state header expands that column to a 3-fr wide panel
//   showing city sub-columns. Clicking a city name opens a modal with
//   the city's RTO breakdown.

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { INITIATIVES, RTO_OPTIONS_BY_CITY } from '@/lib/constants';
import { getMetricValueForArea } from '@/lib/aggregation';
import type { AreaScope } from '@/lib/aggregation';
import { getInitiativeConfig } from '@/lib/initiatives';
import type { Metric } from '@/lib/types';
import { useDetailFilters } from '@/lib/useDetailFilters';
import { cn, formatNumber } from '@/lib/utils';

// ─── Constants ──────────────────────────────────────────────────────────

const NCR_STATES = ['Delhi', 'Uttar Pradesh', 'Rajasthan', 'Haryana'] as const;
type NcrState = (typeof NCR_STATES)[number];

const STATE_CITIES: Record<NcrState, string[]> = {
  Delhi: ['Delhi'],
  'Uttar Pradesh': ['Noida', 'Greater Noida', 'Ghaziabad'],
  Rajasthan: ['Neemrana', 'Alwar'],
  Haryana: ['Gurugram', 'Rohtak', 'Panipat'],
};

// Yellow rail + aggregate panel color (mango yellow from the wireframe).
const RAIL_YELLOW = '#F2EA00';
// Background tint behind the columns.
const SURFACE = '#F6F1E8';
// Accent for thin metric progress bars.
const BAR_ACCENT = '#B85628';
const BAR_TRACK = '#E8DACD';

// ─── Metric grouping ────────────────────────────────────────────────────

interface MetricGroup {
  /**
   * 'cluster' — two outcome siblings rendered side-by-side, each with its
   *             own number + bar (e.g. Trucks | Buses under Pre-BS VI).
   * 'ratio'   — two progress siblings rendered as a single A/B ratio with
   *             one bar showing A/B % (e.g. Conducted / Planned under
   *             Events).
   * 'single'  — one metric, one number, one bar.
   */
  kind: 'cluster' | 'ratio' | 'single';
  /** Display label rendered above the value(s). */
  label: string;
  metrics: Metric[];
}

/**
 * Collapses an initiative's metric list into the row groups rendered in
 * each column. Metrics that share a `cluster` key whose leader carries a
 * `clusterLabel` are merged: outcome clusters render side-by-side (Trucks
 * | Buses); progress clusters render as a single A/B ratio (Conducted /
 * Planned under Events). All other metrics render as standalone rows.
 */
function groupMetrics(metrics: Metric[]): MetricGroup[] {
  const labelledClusterIds = new Set<string>();
  for (const m of metrics) {
    if (m.cluster && m.clusterLabel) labelledClusterIds.add(m.cluster);
  }

  const groups: MetricGroup[] = [];
  const renderedClusters = new Set<string>();

  for (const m of metrics) {
    if (m.cluster && labelledClusterIds.has(m.cluster)) {
      if (renderedClusters.has(m.cluster)) continue;
      renderedClusters.add(m.cluster);
      const siblings = metrics.filter((x) => x.cluster === m.cluster);
      const leader = siblings.find((s) => s.clusterLabel) ?? siblings[0];
      const kind: MetricGroup['kind'] =
        leader.clusterType === 'progress' ? 'ratio' : 'cluster';
      groups.push({
        kind,
        label: leader.clusterLabel ?? leader.name,
        metrics: siblings,
      });
    } else {
      groups.push({ kind: 'single', label: m.name, metrics: [m] });
    }
  }

  return groups;
}

// ─── Value rendering helpers ────────────────────────────────────────────

/**
 * Detail-page splits ignore `geographyLevel: 'central'` and always fan
 * the value down using population weights, so columns like "PSBs / NBFCs
 * onboarded" can show different state values for the demo. Real data
 * will override this entirely.
 */
/** Small deterministic int hash for jitter seeding. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function aggregateForArea(metric: Metric, area: AreaScope) {
  const splittable: Metric =
    metric.geographyLevel === 'central'
      ? { ...metric, geographyLevel: undefined }
      : metric;
  const agg = getMetricValueForArea(
    splittable,
    area,
    `${area.state ?? 'NCR'}|${area.city ?? ''}|${area.rto ?? ''}`,
  );

  // The aggregation helper splits parent totals evenly across child cities
  // / RTOs, so every Noida-vs-Greater-Noida value would be identical. For
  // the demo we apply a deterministic ±15% jitter at the deepest level so
  // sibling columns visually differentiate without changing the parent
  // total in a confusing way. Real data will replace this entirely.
  const childKey = area.rto ?? (area.city && area.state ? area.city : null);
  if (!childKey || agg.format === 'Y/N') return agg;

  const factor =
    0.85 + ((hashStr(childKey + '::' + metric.name) % 31) / 30) * 0.3;
  const achieved =
    agg.achieved != null ? Math.round(agg.achieved * factor) : null;
  const target =
    agg.target != null ? Math.max(1, Math.round(agg.target * factor)) : null;

  if (agg.format === 'X/Y') {
    const pct = Math.max(
      0,
      Math.min(100, Math.round(((achieved ?? 0) / Math.max(1, target ?? 1)) * 100)),
    );
    return {
      ...agg,
      achieved,
      target,
      pct,
      displayText: `${pct}%`,
      subtitle: `${(achieved ?? 0).toLocaleString('en-IN')} / ${(target ?? 0).toLocaleString('en-IN')}`,
    };
  }
  // Xx
  return {
    ...agg,
    achieved,
    displayText: (achieved ?? 0).toLocaleString('en-IN'),
  };
}

interface ValueDisplay {
  big: string;
  denominator: string | null;
  pct: number | null;
}

function metricValue(metric: Metric, area: AreaScope): ValueDisplay {
  const agg = aggregateForArea(metric, area);
  if (agg.format === 'Y/N') {
    return { big: agg.displayText, denominator: null, pct: null };
  }
  if (agg.format === 'Xx') {
    return {
      big: formatNumber(agg.achieved ?? 0),
      denominator: null,
      pct: null,
    };
  }
  return {
    big: formatNumber(agg.achieved ?? 0),
    denominator: `of ${formatNumber(agg.target ?? 0)}`,
    pct: agg.pct,
  };
}

// ─── Small leaf components ──────────────────────────────────────────────

interface MetricRowProps {
  group: MetricGroup;
  area: AreaScope;
  /** Compact mode used inside the aggregate top bar and city sub-columns. */
  dense?: boolean;
}

function MetricRow({ group, area, dense }: MetricRowProps) {
  // Side-by-side outcome cluster (e.g. Trucks | Buses).
  if (group.kind === 'cluster' && group.metrics.length >= 2) {
    return (
      <div className={cn('flex flex-col gap-1', dense ? 'py-1.5' : 'py-2')}>
        <RowLabel text={group.label} />
        <div className="grid grid-cols-2 gap-3">
          {group.metrics.map((m) => {
            const v = metricValue(m, area);
            return (
              <ValueCell
                key={m.name}
                big={v.big}
                denominator={v.denominator}
                pct={v.pct}
                subLabel={m.clusterSubLabel ?? null}
                dense={dense}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Progress ratio cluster (Events → Conducted / Planned).
  if (group.kind === 'ratio' && group.metrics.length >= 2) {
    const leader =
      group.metrics.find((m) => m.clusterLabel) ?? group.metrics[0];
    const denominatorMetric =
      group.metrics.find((m) => m !== leader) ?? group.metrics[1];
    const aL = aggregateForArea(leader, area);
    const aD = aggregateForArea(denominatorMetric, area);
    const num = aL.achieved ?? 0;
    const den = aD.achieved ?? 0;
    const pct =
      den > 0
        ? Math.max(0, Math.min(100, Math.round((num / den) * 100)))
        : 0;
    const ratioSubLabel = `${leader.clusterSubLabel ?? leader.name} / ${denominatorMetric.clusterSubLabel ?? denominatorMetric.name}`;
    return (
      <div className={cn('flex flex-col gap-1', dense ? 'py-1.5' : 'py-2')}>
        <RowLabel text={group.label} />
        <ValueCell
          big={`${formatNumber(num)} / ${formatNumber(den)}`}
          denominator={null}
          pct={pct}
          subLabel={ratioSubLabel}
          dense={dense}
        />
      </div>
    );
  }

  const m = group.metrics[0];
  const v = metricValue(m, area);
  return (
    <div className={cn('flex flex-col gap-1', dense ? 'py-1.5' : 'py-2')}>
      <RowLabel text={group.label} />
      <ValueCell
        big={v.big}
        denominator={v.denominator}
        pct={v.pct}
        subLabel={null}
        dense={dense}
      />
    </div>
  );
}

function RowLabel({ text }: { text: string }) {
  return (
    <div
      className="truncate text-[10.5px] font-medium leading-tight text-[var(--color-text-secondary)]"
      title={text}
    >
      {text}
    </div>
  );
}

interface ValueCellProps {
  big: string;
  denominator: string | null;
  pct: number | null;
  subLabel: string | null;
  dense?: boolean;
}

function ValueCell({
  big,
  denominator,
  pct,
  subLabel,
  dense,
}: ValueCellProps) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          'truncate font-bold leading-none text-[var(--color-navy)]',
          dense ? 'text-[16px]' : 'text-[20px]',
        )}
        title={big}
      >
        {big}
      </div>
      {pct !== null ? (
        <div
          className="relative h-[12px] w-full overflow-hidden rounded-[2px]"
          style={{ backgroundColor: BAR_TRACK }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.max(0, Math.min(100, pct))}%`,
              backgroundColor: BAR_ACCENT,
            }}
          />
          <span
            className="absolute inset-0 flex items-center justify-end pr-1.5 text-[9px] font-bold leading-none text-white"
            style={{ textShadow: '0 0 1.5px rgba(0,0,0,0.45)' }}
          >
            {pct}%
          </span>
        </div>
      ) : null}
      {subLabel || denominator ? (
        <div className="flex items-baseline gap-1 truncate text-[9.5px] leading-tight text-[var(--color-text-secondary)]">
          {subLabel ? (
            <span className="truncate font-medium">{subLabel}</span>
          ) : null}
          {denominator ? <span className="truncate">· {denominator}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── Column components ─────────────────────────────────────────────────

interface StateColumnProps {
  state: NcrState;
  groups: MetricGroup[];
  expandable: boolean;
  onToggle: () => void;
  /** Some other state is expanded — this column dims out of focus. */
  dimmed: boolean;
}

function StateColumn({
  state,
  groups,
  expandable,
  onToggle,
  dimmed,
}: StateColumnProps) {
  const area: AreaScope = { state };

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-md border border-[var(--color-border)] bg-white transition-opacity',
        dimmed && 'opacity-30 hover:opacity-60',
      )}
    >
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        className={cn(
          'flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2.5 text-left',
          expandable
            ? 'cursor-pointer hover:bg-[var(--color-surface-grey)]'
            : 'cursor-default',
        )}
        aria-expanded={false}
        aria-label={
          expandable ? `Expand ${state}` : state
        }
      >
        <span className="text-[13px] font-semibold text-[var(--color-navy)]">
          {state}
        </span>
        {expandable ? (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
        ) : null}
      </button>

      <div className="flex-1 divide-y divide-[var(--color-border)] px-3">
        {groups.map((g, i) => (
          <MetricRow key={i} group={g} area={area} dense={dimmed} />
        ))}
      </div>
    </div>
  );
}

interface ExpandedStateProps {
  state: NcrState;
  cities: string[];
  groups: MetricGroup[];
  supportsRto: boolean;
  onClose: () => void;
  onCityClick: (city: string) => void;
}

function ExpandedState({
  state,
  cities,
  groups,
  supportsRto,
  onClose,
  onCityClick,
}: ExpandedStateProps) {
  return (
    <div
      className="flex h-full flex-col rounded-md border-2 border-[var(--color-navy)] bg-white shadow-md ring-2 ring-[#F2EA00]/40"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[#FFFCE6] px-3 py-2.5">
        <span className="text-[13px] font-semibold text-[var(--color-navy)]">
          {state}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
          City wise
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-surface-grey)]"
          aria-label={`Collapse ${state}`}
        >
          <ChevronLeft className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
        </button>
      </div>

      <div
        className="grid flex-1 divide-x divide-[var(--color-border)]"
        style={{ gridTemplateColumns: `repeat(${cities.length}, minmax(0, 1fr))` }}
      >
        {cities.map((city) => (
          <div key={city} className="flex flex-col">
            <button
              type="button"
              onClick={supportsRto ? () => onCityClick(city) : undefined}
              className={cn(
                'border-b border-[var(--color-border)] px-3 py-2 text-left text-[12px] font-semibold text-[var(--color-navy)]',
                supportsRto
                  ? 'cursor-pointer hover:bg-[var(--color-blue-pale)]'
                  : 'cursor-default',
              )}
              title={supportsRto ? `View RTO breakdown for ${city}` : undefined}
            >
              {city}
            </button>
            <div className="flex-1 divide-y divide-[var(--color-border)] px-3">
              {groups.map((g, i) => (
                <MetricRow
                  key={i}
                  group={g}
                  area={{ state, city }}
                  dense
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NCR aggregate top bar ──────────────────────────────────────────────

function NcrAggregateBar({ groups }: { groups: MetricGroup[] }) {
  return (
    <div
      className="rounded-md border border-[#D9CF22] px-4 py-4 shadow-sm"
      style={{ backgroundColor: RAIL_YELLOW }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-navy)]">
          DELHI NCR
        </span>
        <span className="h-px flex-1 bg-[var(--color-navy)] opacity-20" />
        <span className="text-[11px] font-medium text-[var(--color-navy)] opacity-70">
          Overall status across all four states
        </span>
      </div>
      <div
        className="grid gap-x-5 gap-y-2"
        style={{
          gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))`,
        }}
      >
        {groups.map((g, i) => (
          <MetricRow key={i} group={g} area={{}} dense />
        ))}
      </div>
    </div>
  );
}

// ─── RTO breakdown modal ────────────────────────────────────────────────

interface RtoModalProps {
  state: NcrState;
  city: string;
  groups: MetricGroup[];
  onClose: () => void;
}

function RtoModal({ state, city, groups, onClose }: RtoModalProps) {
  const rtos = RTO_OPTIONS_BY_CITY[city] ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={`${city} RTO breakdown`}
    >
      <div
        className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-bold text-[var(--color-navy)]">
              {city} — RTO breakdown
            </h2>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Click outside to close · View details for {city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--color-surface-grey)]"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {rtos.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px] text-[var(--color-text-secondary)]">
            No RTO-level breakdown available for {city}.
          </div>
        ) : (
          <div
            className="grid divide-x divide-[var(--color-border)]"
            style={{
              gridTemplateColumns: `repeat(${rtos.length}, minmax(0, 1fr))`,
            }}
          >
            {rtos.map((rto) => (
              <div key={rto} className="flex flex-col">
                <div className="border-b border-[var(--color-border)] px-3 py-2 text-[12px] font-semibold text-[var(--color-navy)]">
                  {rto}
                </div>
                <div className="flex-1 divide-y divide-[var(--color-border)] px-3">
                  {groups.map((g, i) => (
                    <MetricRow
                      key={i}
                      group={g}
                      area={{ state, city, rto }}
                      dense
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function DetailPage() {
  const { initiativeName, setInitiativeName } = useDetailFilters();

  const init =
    INITIATIVES.find((i) => i.name === initiativeName) ?? INITIATIVES[0];
  const config = getInitiativeConfig(init.slug);
  const supportsCity = config?.geographyLevels.includes('city') ?? false;
  const supportsRto = config?.geographyLevels.includes('rto') ?? false;

  const groups = useMemo(() => groupMetrics(init.metrics), [init]);

  const [expandedState, setExpandedState] = useState<NcrState | null>(null);
  const [modalCity, setModalCity] = useState<{ state: NcrState; city: string } | null>(null);

  // Reset transient UI when the initiative changes (e.g. via dropdown).
  useEffect(() => {
    setExpandedState(null);
    setModalCity(null);
  }, [init.slug]);

  const handleInitiativeChange = (slug: string) => {
    const next = INITIATIVES.find((i) => i.slug === slug);
    if (next) setInitiativeName(next.name);
  };

  // Column widths: when a state is expanded it gets 3fr, others stay 1fr.
  const gridTemplate = expandedState
    ? NCR_STATES.map((s) => (s === expandedState ? '3fr' : '1fr')).join(' ')
    : 'repeat(4, minmax(0, 1fr))';

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: SURFACE }}>
      <TopBar />

      <main className="relative flex flex-1 overflow-hidden">
        {/* ── Main content ── */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-4 p-5">
            {/* Initiative dropdown */}
            <div className="flex items-center gap-3">
              <label
                htmlFor="initiative-select"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
              >
                Initiative
              </label>
              <div className="relative">
                <select
                  id="initiative-select"
                  value={init.slug}
                  onChange={(e) => handleInitiativeChange(e.target.value)}
                  className="appearance-none rounded-md border border-[var(--color-border)] bg-white py-1.5 pl-3 pr-9 text-[13px] font-semibold text-[var(--color-navy)] shadow-sm focus:border-[var(--color-blue-link)] focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-link)]/30"
                >
                  {INITIATIVES.map((i) => (
                    <option key={i.slug} value={i.slug}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              </div>
            </div>

            {/* DELHI NCR aggregate */}
            <NcrAggregateBar groups={groups} />

            {/* State columns */}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {NCR_STATES.map((s) => {
                const isExpanded = expandedState === s;
                if (isExpanded && supportsCity) {
                  return (
                    <ExpandedState
                      key={s}
                      state={s}
                      cities={STATE_CITIES[s]}
                      groups={groups}
                      supportsRto={supportsRto}
                      onClose={() => setExpandedState(null)}
                      onCityClick={(city) => setModalCity({ state: s, city })}
                    />
                  );
                }
                return (
                  <StateColumn
                    key={s}
                    state={s}
                    groups={groups}
                    expandable={supportsCity}
                    dimmed={expandedState !== null}
                    onToggle={() => setExpandedState(s)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* RTO modal */}
        {modalCity ? (
          <RtoModal
            state={modalCity.state}
            city={modalCity.city}
            groups={groups}
            onClose={() => setModalCity(null)}
          />
        ) : null}
      </main>
    </div>
  );
}
