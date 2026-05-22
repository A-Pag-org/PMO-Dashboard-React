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
import CompletionThresholdsLegend from '@/components/ui/CompletionThresholdsLegend';
import { INITIATIVES, RTO_OPTIONS_BY_CITY } from '@/lib/constants';
import { getMetricValueForArea } from '@/lib/aggregation';
import type { AreaScope } from '@/lib/aggregation';
import { getInitiativeConfig } from '@/lib/initiatives';
import type { Metric } from '@/lib/types';
import { useDetailFilters } from '@/lib/useDetailFilters';
import { cn, formatNumber, getBandColors, getColorBand } from '@/lib/utils';

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
// Same navy used by the initiative-name pill on InitiativeCard. We
// reuse it for every geographic-hierarchy label (NCR / state / city /
// RTO / agency) so the chips read as one family across both pages.
const NAVY_PILL = '#2E4B8F';
// Bar colours come from the spec's traffic-light band (utils.getBandColors).

/**
 * Fit-to-text navy pill used to highlight a geographic-hierarchy
 * label. Mirrors the initiative-name pill on InitiativeCard.
 */
function GeoPill({
  label,
  size = 'md',
  className,
}: {
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center self-start truncate rounded-lg font-bold leading-tight text-white',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-[12px]',
        className,
      )}
      style={{ backgroundColor: NAVY_PILL }}
      title={label}
    >
      {label}
    </span>
  );
}

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
      // Render mode is opt-in per cluster — defaults to 'cluster'
      // (side-by-side). Only the Events cluster opts into the 'ratio'
      // render (Conducted / Planned over one bar). Two parallel counts
      // like Trucks/Buses or Trees/Shrubs each carry their own target
      // and must stay side-by-side; otherwise the bar would compute
      // num/den across unrelated denominators and report nonsense.
      const kind: MetricGroup['kind'] =
        leader.clusterRender === 'ratio' ? 'ratio' : 'cluster';
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
/**
 * Spec §8 visibility gate. Metrics carry an optional `visibleWhen` that
 * controls which scope they should appear at:
 *   · undefined         — visible everywhere (NCR / state / city / RTO).
 *   · 'state'           — visible only when one state is the focus —
 *                         i.e. in the state-aggregate top bar after a
 *                         state has been expanded. Hidden in the NCR
 *                         aggregate, the default 4-state tile row, the
 *                         dimmed peer columns, the city sub-columns, and
 *                         the RTO modal.
 *   · 'state+city'      — visible only inside a city sub-column or the
 *   · 'state+city+agency' RTO modal (city scope).
 *
 * Render contexts ask "is this metric visible at scope X?" via
 * visibleForScope, and the page builds three group lists accordingly.
 */
type RenderScope = 'ncr' | 'state' | 'city';

function visibleForScope(metric: Metric, scope: RenderScope): boolean {
  const gate = metric.visibleWhen;
  if (!gate) return true;
  if (gate === 'state') return scope === 'state';
  // 'state+city' / 'state+city+agency' — city scope only.
  return scope === 'city';
}

/** Small deterministic int hash for jitter seeding. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Page-local extension of AreaScope that carries an optional `agency`
 * leaf. The underlying aggregation helper doesn't model agency as a
 * weighting level, so we strip it before delegating and apply the same
 * deterministic jitter we already use for RTOs to keep sibling agency
 * columns visually distinct.
 */
type PageAreaScope = AreaScope & { agency?: string };

function aggregateForArea(metric: Metric, area: PageAreaScope) {
  const baseArea: AreaScope = {
    state: area.state,
    city: area.city,
    rto: area.rto,
    toll: area.toll,
    ulb: area.ulb,
  };
  const splittable: Metric =
    metric.geographyLevel === 'central'
      ? { ...metric, geographyLevel: undefined }
      : metric;
  const agg = getMetricValueForArea(
    splittable,
    baseArea,
    `${area.state ?? 'NCR'}|${area.city ?? ''}|${area.rto ?? ''}|${area.agency ?? ''}`,
  );

  // The aggregation helper splits parent totals evenly across child cities
  // / RTOs / agencies, so every Noida-vs-Greater-Noida value would be
  // identical. For the demo we apply a deterministic ±15% jitter at the
  // deepest level so sibling columns visually differentiate without
  // changing the parent total in a confusing way. Real data will replace
  // this entirely.
  const childKey =
    area.agency ??
    area.rto ??
    (area.city && area.state ? area.city : null);
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
  isInverse: boolean;
}

function metricValue(metric: Metric, area: PageAreaScope): ValueDisplay {
  const agg = aggregateForArea(metric, area);
  const isInverse = metric.isInverse ?? false;
  if (agg.format === 'Y/N') {
    return { big: agg.displayText, denominator: null, pct: null, isInverse };
  }
  if (agg.format === 'Xx') {
    return {
      big: formatNumber(agg.achieved ?? 0),
      denominator: null,
      pct: null,
      isInverse,
    };
  }
  return {
    big: formatNumber(agg.achieved ?? 0),
    denominator: `of ${formatNumber(agg.target ?? 0)}`,
    pct: agg.pct,
    isInverse,
  };
}

// ─── Small leaf components ──────────────────────────────────────────────

interface MetricRowProps {
  group: MetricGroup;
  area: PageAreaScope;
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
                isInverse={v.isInverse}
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
          isInverse={leader.isInverse ?? false}
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
        isInverse={v.isInverse}
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
  isInverse: boolean;
  subLabel: string | null;
  dense?: boolean;
}

function ValueCell({
  big,
  denominator,
  pct,
  isInverse,
  subLabel,
  dense,
}: ValueCellProps) {
  // Bar colour follows the spec's traffic-light band:
  //   standard:  <30 RED · 30-60 YELLOW · ≥60 GREEN
  //   inverse:   ≥60 RED · 30-60 YELLOW · <30 GREEN
  const band = pct !== null ? getColorBand(pct, isInverse) : null;
  const bandColors = band ? getBandColors(band) : null;

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
      {pct !== null && bandColors ? (
        <div
          className="relative h-[12px] w-full overflow-hidden rounded-[2px]"
          style={{ backgroundColor: bandColors.bg }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.max(0, Math.min(100, pct))}%`,
              backgroundColor: bandColors.fg,
            }}
          />
          <span
            // mix-blend-difference keeps the % readable on both the
            // saturated fill and the light remainder — white text inverts
            // to a dark, contrasty colour over any band tint.
            className="absolute inset-0 flex items-center justify-end pr-1.5 text-[9px] font-bold leading-none text-white"
            style={{ mixBlendMode: 'difference' }}
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
  /** Whether clicking the header does anything (drilldown or expand). */
  clickable: boolean;
  /** Small hint shown under the state name, e.g. "Click to enter city
   *  level" or "Click to enter agency level". */
  helpText?: string;
  onClick: () => void;
  /** Some other state is expanded — this column dims out of focus. */
  dimmed: boolean;
}

function StateColumn({
  state,
  groups,
  clickable,
  helpText,
  onClick,
  dimmed,
}: StateColumnProps) {
  const area: PageAreaScope = { state };

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-md border border-[var(--color-border)] bg-white transition-opacity',
        dimmed && 'opacity-30 hover:opacity-60',
      )}
    >
      <button
        type="button"
        onClick={clickable ? onClick : undefined}
        className={cn(
          'sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-md border-b border-[var(--color-border)] bg-white px-3 py-2 text-left',
          clickable
            ? 'cursor-pointer hover:bg-[var(--color-surface-grey)]'
            : 'cursor-default',
        )}
        aria-label={
          clickable ? `${helpText ?? `Open ${state}`}` : state
        }
      >
        <div className="flex min-w-0 flex-col items-start gap-1">
          <GeoPill label={state} />
          {clickable && helpText ? (
            <span className="truncate text-[9.5px] font-medium uppercase tracking-wide text-[var(--color-blue-link)]">
              {helpText}
            </span>
          ) : null}
        </div>
        {clickable ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)]" />
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
  /** Leaf level that lives below a city for this initiative ('rto' for
   *  NSY, 'agency' for Road Repair / MRS / C&D-SCC), or null if there's
   *  no drill below city. */
  leafKind: LeafKind | null;
  /** Predicate: does this city have any leaf-level items configured? */
  cityHasLeafItems: (city: string) => boolean;
  onClose: () => void;
  onCityClick: (city: string) => void;
}

function ExpandedState({
  state,
  cities,
  groups,
  leafKind,
  cityHasLeafItems,
  onClose,
  onCityClick,
}: ExpandedStateProps) {
  const leafLabel = leafKind === 'rto' ? 'RTO' : 'agency';
  return (
    <div
      className="flex h-full flex-col rounded-md border-2 border-[var(--color-navy)] bg-white shadow-md ring-2 ring-[#F2EA00]/40"
    >
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 rounded-t-[4px] border-b border-[var(--color-border)] bg-[#FFFCE6] px-3 py-2.5">
        <GeoPill label={state} />
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
        {cities.map((city) => {
          const drillable = leafKind !== null && cityHasLeafItems(city);
          return (
            <div key={city} className="flex flex-col">
              <button
                type="button"
                onClick={drillable ? () => onCityClick(city) : undefined}
                className={cn(
                  // Sticks below the expanded-state outer header (z-20
                  // / ~44px tall) so the city pill stays visible while
                  // a column's metric rows scroll past underneath.
                  'sticky top-11 z-10 flex flex-col items-start gap-1 border-b border-[var(--color-border)] bg-white px-3 py-1.5 text-left',
                  drillable
                    ? 'cursor-pointer hover:bg-[var(--color-blue-pale)]'
                    : 'cursor-default',
                )}
                title={
                  drillable ? `View ${leafLabel} breakdown for ${city}` : undefined
                }
              >
                <GeoPill label={city} size="sm" />
                {drillable ? (
                  <span className="truncate text-[9.5px] font-medium uppercase tracking-wide text-[var(--color-blue-link)]">
                    Click to enter {leafLabel} level
                  </span>
                ) : null}
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
          );
        })}
      </div>
    </div>
  );
}

// ─── Top aggregate bar (NCR or selected state) ──────────────────────────
//
// Cells-only — the title ("DELHI NCR" / "DELHI") and subtitle have been
// promoted up into the sticky chrome strip on the page so this bar can
// stay short. See DetailPage below for the strip layout.

interface AggregateBarProps {
  area: PageAreaScope;
  groups: MetricGroup[];
}

function AggregateBar({ area, groups }: AggregateBarProps) {
  return (
    <div
      className="rounded-md border border-[#D9CF22] px-4 py-2.5 shadow-sm"
      style={{ backgroundColor: RAIL_YELLOW }}
    >
      <div
        // Thin vertical dividers between metric groups so the eye can
        // count the columns at a glance, especially when one of the
        // labels is long enough to wrap into the adjacent cell's space.
        className="grid divide-x divide-[var(--color-navy)]/15"
        style={{
          gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))`,
        }}
      >
        {groups.map((g, i) => (
          <div key={i} className={cn('px-3', i === 0 && 'pl-0')}>
            <MetricRow group={g} area={area} dense />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Leaf-level breakdown modal (RTO or Agency) ─────────────────────────

type LeafKind = 'rto' | 'agency';

interface DrillModalProps {
  state: NcrState;
  city: string;
  items: string[];
  /** Which leaf is being drilled — drives the title and area-building. */
  leaf: LeafKind;
  groups: MetricGroup[];
  onClose: () => void;
}

function DrillModal({
  state,
  city,
  items,
  leaf,
  groups,
  onClose,
}: DrillModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const leafLabel = leaf === 'rto' ? 'RTO' : 'Agency';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={`${city} ${leafLabel} breakdown`}
    >
      <div
        className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-bold text-[var(--color-navy)]">
              {city} — {leafLabel} breakdown
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

        {items.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px] text-[var(--color-text-secondary)]">
            No {leafLabel}-level breakdown available for {city}.
          </div>
        ) : (
          <div
            className="grid divide-x divide-[var(--color-border)]"
            style={{
              gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
            }}
          >
            {items.map((item) => {
              const area: PageAreaScope =
                leaf === 'rto'
                  ? { state, city, rto: item }
                  : { state, city, agency: item };
              return (
                <div key={item} className="flex flex-col">
                  <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white px-3 py-2">
                    <GeoPill label={item} size="sm" />
                  </div>
                  <div className="flex-1 divide-y divide-[var(--color-border)] px-3">
                    {groups.map((g, i) => (
                      <MetricRow key={i} group={g} area={area} dense />
                    ))}
                  </div>
                </div>
              );
            })}
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

  // Some initiatives carry a per-city Agency list (Road Repair, MRS,
  // C&D-SCC) as an extraFilter. Surface it as a leaf level so users can
  // drill state → city → agency. RTOs and Agencies are mutually
  // exclusive in the data model; we pick whichever this initiative
  // provides.
  const agencyOptionsByCity = useMemo<Record<string, string[]> | null>(() => {
    const f = config?.extraFilters.find((x) => x.key === 'agency');
    return f?.optionsByCity ?? null;
  }, [config]);
  const supportsAgency = agencyOptionsByCity !== null;
  const leafKind: LeafKind | null = supportsRto
    ? 'rto'
    : supportsAgency
      ? 'agency'
      : null;

  function leafItemsForCity(city: string): string[] {
    if (leafKind === 'rto') return RTO_OPTIONS_BY_CITY[city] ?? [];
    if (leafKind === 'agency') return agencyOptionsByCity?.[city] ?? [];
    return [];
  }
  function cityHasLeafItems(city: string): boolean {
    return leafItemsForCity(city).length > 0;
  }

  // Three group lists per the spec's visibility gate (see
  // visibleForScope):
  //   · ncrGroups   — only metrics with no `visibleWhen` restriction.
  //                   Used for the NCR aggregate strip and the four
  //                   default state tiles + dimmed peer columns. Neither
  //                   state-only nor city-only readiness flags surface
  //                   here.
  //   · stateGroups — NCR-level + state-only metrics. Used for the top
  //                   yellow bar after the user expands one state — the
  //                   only place a `visibleWhen: 'state'` metric (e.g.
  //                   MRS "Procurement of all additional MRS initiated")
  //                   is meaningful.
  //   · cityGroups  — NCR-level + city-only metrics. Used inside the
  //                   expanded state's city sub-columns and the RTO
  //                   modal, where the city scope is set.
  const ncrGroups = useMemo(
    () =>
      groupMetrics(init.metrics.filter((m) => visibleForScope(m, 'ncr'))),
    [init],
  );
  const stateGroups = useMemo(
    () =>
      groupMetrics(init.metrics.filter((m) => visibleForScope(m, 'state'))),
    [init],
  );
  const cityGroups = useMemo(
    () =>
      groupMetrics(init.metrics.filter((m) => visibleForScope(m, 'city'))),
    [init],
  );

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

  // Column widths: when a state is expanded, peer states drop to a
  // narrow fixed width so the selected column gets the rest of the row
  // and can fit all labels on a single line. Default view = 4 equal cols.
  const gridTemplate = expandedState
    ? NCR_STATES.map((s) => (s === expandedState ? '1fr' : '112px')).join(' ')
    : 'repeat(4, minmax(0, 1fr))';

  // The top yellow bar mirrors the selected state's aggregate when one
  // is expanded, otherwise it shows the NCR-wide totals.
  const aggregate = expandedState
    ? {
        title: expandedState.toUpperCase(),
        subtitle: `Overall status across all cities in ${expandedState}`,
        area: { state: expandedState } as PageAreaScope,
      }
    : {
        title: 'DELHI NCR',
        subtitle: 'Overall status across all four states',
        area: {} as PageAreaScope,
      };

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: SURFACE }}>
      <TopBar />

      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* ── Sticky chrome (Initiative selector + scope pill + yellow
            aggregate bar). The state columns scroll independently
            below. Mirrors the sticky chrome on SummaryPage. ── */}
        <div
          className="shrink-0 border-b border-[var(--color-border)] px-5 pt-4 pb-3"
          style={{ backgroundColor: SURFACE }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              <label
                htmlFor="initiative-select"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
              >
                Initiative
              </label>
              {/* The trigger renders the selected initiative name in the
                  same navy-pill design used for every geographic
                  hierarchy chip (DELHI NCR, Delhi, Noida, ...). Native
                  <option> chrome is browser-controlled and can't be
                  pill-styled, so the open list reverts to native
                  rendering. */}
              <div className="relative">
                <select
                  id="initiative-select"
                  value={init.slug}
                  onChange={(e) => handleInitiativeChange(e.target.value)}
                  className="appearance-none rounded-lg border border-transparent py-1 pl-3 pr-9 text-[12px] font-bold leading-tight text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-[#F6F1E8]"
                  style={{ backgroundColor: NAVY_PILL }}
                >
                  {INITIATIVES.map((i) => (
                    // Force a white background + navy text on every
                    // <option> so the open list reverts to the
                    // pre-pill appearance. Native <option> chrome
                    // inherits its bg from the parent <select> in
                    // most browsers (Chrome/Edge especially), which
                    // would otherwise paint the whole list navy.
                    <option
                      key={i.slug}
                      value={i.slug}
                      style={{ backgroundColor: '#FFFFFF', color: '#1A2B4A' }}
                    >
                      {i.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white" />
              </div>
            </div>

            {/* Aggregate scope pill + subtitle promoted out of the yellow
                bar so the bar stays short and the current scope
                ("DELHI NCR" / selected state) is anchored visibly next
                to the Initiative selector. */}
            <div className="flex min-w-0 items-center gap-3">
              <GeoPill label={aggregate.title} />
              <span className="truncate text-[11px] font-medium text-[var(--color-text-secondary)]">
                {aggregate.subtitle}
              </span>
            </div>
          </div>

          {/* Yellow aggregate bar — NCR scope by default, state scope
              when one is expanded. State-only metrics appear only in
              the state-scope variant. */}
          <AggregateBar
            area={aggregate.area}
            groups={expandedState ? stateGroups : ncrGroups}
          />
        </div>

        {/* ── Scrollable content: state columns ── */}
        <div className="flex-1 overflow-auto">
          <div className="px-5 pt-3 pb-3">
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
                      groups={cityGroups}
                      leafKind={leafKind}
                      cityHasLeafItems={cityHasLeafItems}
                      onClose={() => setExpandedState(null)}
                      onCityClick={(city) => setModalCity({ state: s, city })}
                    />
                  );
                }
                // Delhi is both a state and its own city. Whenever an
                // initiative has a leaf level below city (RTO for NSY,
                // Agency for Road Repair / MRS / C&D-SCC) we skip the
                // pointless 1-city expand step and drill straight into
                // the leaf-level modal with city = 'Delhi'. Other
                // states take the standard city-list expansion path.
                const cities = STATE_CITIES[s];
                const isDelhiLeafShortcut =
                  s === 'Delhi' &&
                  leafKind !== null &&
                  cities.length === 1 &&
                  cityHasLeafItems(cities[0]);
                const clickable = supportsCity || isDelhiLeafShortcut;
                const helpText = !clickable
                  ? undefined
                  : isDelhiLeafShortcut
                    ? leafKind === 'rto'
                      ? 'Click to enter RTO level'
                      : 'Click to enter agency level'
                    : 'Click to enter city level';
                const onClick = isDelhiLeafShortcut
                  ? () => setModalCity({ state: s, city: cities[0] })
                  : () => setExpandedState(s);
                return (
                  <StateColumn
                    key={s}
                    state={s}
                    groups={ncrGroups}
                    clickable={clickable}
                    helpText={helpText}
                    dimmed={expandedState !== null}
                    onClick={onClick}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky completion-threshold legend (spec §8 colour bands). */}
        <footer className="shrink-0 border-t border-[var(--color-border)] bg-white px-5 py-2.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Completion bands
            </span>
            <CompletionThresholdsLegend />
          </div>
        </footer>

        {/* Leaf-level drill modal (RTO for NSY · Agency for RR / MRS /
            C&D-SCC). Falls back to nothing if the initiative has no
            leaf level configured. */}
        {modalCity && leafKind ? (
          <DrillModal
            state={modalCity.state}
            city={modalCity.city}
            items={leafItemsForCity(modalCity.city)}
            leaf={leafKind}
            groups={cityGroups}
            onClose={() => setModalCity(null)}
          />
        ) : null}
      </main>
    </div>
  );
}
