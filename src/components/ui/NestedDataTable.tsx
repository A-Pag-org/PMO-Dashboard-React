// FILE: components/ui/NestedDataTable.tsx
// PURPOSE: Format-aware nested expand/collapse table for the All Data page.
// DESIGN REF: Spec §6 — All Data View.
//
// Row hierarchy (spec §6.2):
//   L1: Delhi NCR  (top-level aggregate)
//   L2: States      (sums of cities under each state)
//   L3: Cities      (sums of RTOs under each city)
//   L4: RTOs        (the lowest level — actual capture point)
//
// Column behaviour (spec §6.3):
//   X/Y standard / inverse → Target + Completion% columns visible
//   Xx (absolute count)    → both columns hidden (rendered as "—")
//   Y/N (boolean)          → Target hidden; Completion% slot shows Y/N pill
//
// Sort + filter (spec §6.4):
//   Geography (asc/desc) and Completion (asc/desc) supported via header
//   buttons. Filtering happens at the All Data page level.

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, formatNumber, getBandColors, getColorBand, getCompletionPercentage } from '@/lib/utils';
import type { MetricFormat } from '@/lib/types';

export interface NestedRow {
  /** Stable identifier across the rendered tree. */
  id: string;
  /** Display label, e.g. "Delhi NCR" / "Haryana" / "Gurugram" / "Gurugram RTO". */
  label: string;
  /** 0 = NCR, 1 = State, 2 = City, 3 = RTO. */
  level: 0 | 1 | 2 | 3;
  achieved: number | null;
  target: number | null;
  /** Children loaded lazily by the caller (state's cities, city's RTOs). */
  children?: NestedRow[];
}

interface NestedDataTableProps {
  rows: NestedRow[];
  format: MetricFormat;
  isInverse?: boolean;
  /** Initial expansion state — by default the NCR + state rows are expanded. */
  defaultExpandedIds?: string[];
}

type SortKey = 'geography' | 'completion';
type SortDir = 'asc' | 'desc';

function rowCompletion(row: NestedRow): number {
  return getCompletionPercentage(row.target, row.achieved);
}

export default function NestedDataTable({
  rows,
  format,
  isInverse = false,
  defaultExpandedIds,
}: NestedDataTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (defaultExpandedIds) return new Set(defaultExpandedIds);
    // By default expand NCR and all state rows.
    const out = new Set<string>();
    for (const r of rows) {
      out.add(r.id);
      for (const child of r.children ?? []) out.add(child.id);
    }
    return out;
  });
  const [sortKey, setSortKey] = useState<SortKey | null>('geography');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clickHeader(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  // Sort children at every level so a single sort cascades through.
  const sortedRows = useMemo(() => {
    function sort(list: NestedRow[]): NestedRow[] {
      const out = [...list];
      if (sortKey === 'geography') {
        out.sort((a, b) =>
          sortDir === 'asc'
            ? a.label.localeCompare(b.label)
            : b.label.localeCompare(a.label),
        );
      } else if (sortKey === 'completion') {
        out.sort((a, b) =>
          sortDir === 'asc'
            ? rowCompletion(a) - rowCompletion(b)
            : rowCompletion(b) - rowCompletion(a),
        );
      }
      return out.map((r) =>
        r.children ? { ...r, children: sort(r.children) } : r,
      );
    }
    return sort(rows);
  }, [rows, sortKey, sortDir]);

  // Flatten visible rows respecting expansion state.
  const flat = useMemo(() => {
    const out: NestedRow[] = [];
    function walk(list: NestedRow[]) {
      for (const r of list) {
        out.push(r);
        if (r.children?.length && expanded.has(r.id)) walk(r.children);
      }
    }
    walk(sortedRows);
    return out;
  }, [sortedRows, expanded]);

  const showTargetCol = format === 'X/Y';
  const completionLabel = format === 'Y/N' ? 'Status' : 'Completion';

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-table)]">
      <table className="w-full text-left">
        <thead>
          <tr className="sticky top-0 z-10 bg-[var(--color-navy)]">
            <th
              scope="col"
              className="px-3 py-2.5 text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
            >
              <SortHeader
                label="Geography"
                active={sortKey === 'geography'}
                dir={sortDir}
                onClick={() => clickHeader('geography')}
              />
            </th>
            {showTargetCol ? (
              <th
                scope="col"
                className="px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
              >
                Target
              </th>
            ) : null}
            <th
              scope="col"
              className="px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
            >
              {format === 'Xx' ? 'Count' : 'Achieved'}
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
              style={{ minWidth: 160 }}
            >
              <SortHeader
                label={completionLabel}
                active={sortKey === 'completion'}
                dir={sortDir}
                onClick={() => clickHeader('completion')}
                disabled={format === 'Xx'}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {flat.length === 0 ? (
            <tr>
              <td
                colSpan={showTargetCol ? 4 : 3}
                className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]"
              >
                No data available for this filter.
              </td>
            </tr>
          ) : (
            flat.map((row, i) => (
              <NestedRowView
                key={row.id}
                row={row}
                expanded={expanded.has(row.id)}
                onToggle={() => toggle(row.id)}
                format={format}
                isInverse={isInverse}
                showTargetCol={showTargetCol}
                striped={i % 2 === 1}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (disabled) return <span>{label}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ArrowUp className="h-3 w-3" aria-hidden />
        ) : (
          <ArrowDown className="h-3 w-3" aria-hidden />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-60" aria-hidden />
      )}
    </button>
  );
}

function NestedRowView({
  row,
  expanded,
  onToggle,
  format,
  isInverse,
  showTargetCol,
  striped,
}: {
  row: NestedRow;
  expanded: boolean;
  onToggle: () => void;
  format: MetricFormat;
  isInverse: boolean;
  showTargetCol: boolean;
  striped: boolean;
}) {
  const indent = row.level * 16;
  const hasChildren = (row.children?.length ?? 0) > 0;
  const pct = rowCompletion(row);

  let band = getColorBand(pct, isInverse);
  if (format === 'Xx') band = 'NA' as never;

  const rowBg = striped ? 'bg-[var(--color-surface-light)]' : 'bg-white';

  return (
    <tr
      className={rowBg}
      style={{ borderBottom: '1px dashed var(--color-divider-dashed)' }}
    >
      <td
        className="px-3 py-2 text-xs text-[var(--color-text-primary)]"
        style={{ paddingLeft: 12 + indent }}
      >
        <span className="inline-flex items-center gap-1.5">
          {hasChildren ? (
            <button
              type="button"
              onClick={onToggle}
              className="flex h-4 w-4 items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-blue-pale)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label={expanded ? `Collapse ${row.label}` : `Expand ${row.label}`}
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" aria-hidden />
              ) : (
                <ChevronRight className="h-3 w-3" aria-hidden />
              )}
            </button>
          ) : (
            <span className="inline-block h-4 w-4" aria-hidden />
          )}
          <span
            className={cn(
              row.level === 0 && 'font-bold',
              row.level === 1 && 'font-semibold',
              row.level >= 2 && 'font-medium',
            )}
          >
            {row.label}
          </span>
        </span>
      </td>
      {showTargetCol ? (
        <td className="px-3 py-2 text-right text-xs text-[var(--color-text-primary)]">
          <ValueChip value={row.target} format={format} kind="target" />
        </td>
      ) : null}
      <td className="px-3 py-2 text-right text-xs text-[var(--color-text-primary)]">
        <ValueChip value={row.achieved} format={format} kind="achieved" />
      </td>
      <td className="px-3 py-2">
        <CompletionCell
          format={format}
          band={band as ReturnType<typeof getColorBand>}
          pct={pct}
          achieved={row.achieved}
        />
      </td>
    </tr>
  );
}

function ValueChip({
  value,
  format,
  kind,
}: {
  value: number | null;
  format: MetricFormat;
  kind: 'target' | 'achieved';
}) {
  if (format === 'Y/N') return <span className="text-[var(--color-tl-na-text)]">—</span>;
  if (format === 'Xx' && kind === 'target') return <span className="text-[var(--color-tl-na-text)]">—</span>;
  if (value == null) return <span className="text-[var(--color-tl-na-text)]">—</span>;
  return (
    <span className="rounded bg-[var(--color-surface-warm)] px-2 py-0.5 tabular-nums">
      {formatNumber(value)}
    </span>
  );
}

function CompletionCell({
  format,
  band,
  pct,
  achieved,
}: {
  format: MetricFormat;
  band: ReturnType<typeof getColorBand>;
  pct: number;
  achieved: number | null;
}) {
  if (format === 'Xx') {
    return <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">No target</span>;
  }
  if (format === 'Y/N') {
    const isYes = achieved === 1;
    const colors = getBandColors(isYes ? 'GREEN' : 'RED');
    return (
      <span
        className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {isYes ? 'Y' : 'N'}
      </span>
    );
  }
  // X/Y
  const colors = getBandColors(band);
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: colors.bg }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: colors.fg }}
        />
      </div>
      <span
        className="shrink-0 text-xs font-semibold tabular-nums"
        style={{ color: colors.text }}
      >
        {pct}%
      </span>
    </div>
  );
}
