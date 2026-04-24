// FILE: components/ui/EditableDataTable.tsx
// PURPOSE: Manual data upload table with in-header sort/filter dropdowns.
// DESIGN REF: Wireframe page 11 of Impact_Dashboard_Structure_16_Apr.pdf
//
// Column order (per PDF):
//   State | City | Initiative | Metric | Metric type | Target Val |
//   Current Val | Unit | [New Val]* | Start date | End date | [Remarks]* |
//   Last updated | Last updated by
//
// *Editable / green-shaded columns.
//
// Sort/filter menus appear on State, City, Initiative, Metric column headers.
//
// Accessibility:
//   Placeholder rows that pad the table to minVisibleRows are hidden from
//   assistive technology via aria-hidden so screen readers skip them.

import { useMemo, useState } from 'react';
import { cn, formatNumber } from '@/lib/utils';
import type { UploadRow } from '@/lib/types';
import ColumnFilterMenu from './ColumnFilterMenu';

interface EditableDataTableProps {
  rows: UploadRow[];
  /** Called with the row identity (state, city, initiative, metric) and the new value. */
  onNewValChange: (row: UploadRow, value: string) => void;
  onRemarksChange: (row: UploadRow, value: string) => void;
  /** Minimum number of placeholder rows to keep the page looking like the wireframe. */
  minVisibleRows?: number;
}

type SortKey = 'state' | 'city' | 'initiative' | 'metric';
type SortDir = 'none' | 'asc' | 'desc';

interface ColumnFilterState {
  state: Set<string>;
  city: Set<string>;
  initiative: Set<string>;
  metric: Set<string>;
}

const EMPTY_FILTERS: ColumnFilterState = {
  state: new Set(),
  city: new Set(),
  initiative: new Set(),
  metric: new Set(),
};

export default function EditableDataTable({
  rows,
  onNewValChange,
  onRemarksChange,
  minVisibleRows = 0,
}: EditableDataTableProps) {
  const [filters, setFilters] = useState<ColumnFilterState>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('none');

  // Distinct option lists for column filter menus
  const options = useMemo(() => {
    const uniq = (key: SortKey) =>
      Array.from(new Set(rows.map((r) => r[key] as string))).sort((a, b) =>
        a.localeCompare(b),
      );
    return {
      state: uniq('state'),
      city: uniq('city'),
      initiative: uniq('initiative'),
      metric: uniq('metric'),
    };
  }, [rows]);

  function setColFilter(col: SortKey, next: Set<string>) {
    setFilters((prev) => ({ ...prev, [col]: next }));
  }
  function setColSort(col: SortKey, dir: SortDir) {
    setSortKey(dir === 'none' ? null : col);
    setSortDir(dir);
  }
  function sortDirFor(col: SortKey): SortDir {
    return sortKey === col ? sortDir : 'none';
  }

  const processed = useMemo(() => {
    let out = rows;
    for (const key of ['state', 'city', 'initiative', 'metric'] as SortKey[]) {
      const sel = filters[key];
      if (sel.size === 0) continue;
      out = out.filter((r) => sel.has(r[key] as string));
    }
    if (sortKey && sortDir !== 'none') {
      out = [...out].sort((a, b) => {
        const av = String(a[sortKey] ?? '');
        const bv = String(b[sortKey] ?? '');
        const cmp = av.localeCompare(bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, filters, sortKey, sortDir]);

  const metricNeedsDates = (metricName: string) =>
    metricName === 'Total quantum of malba received at SCC' ||
    metricName === 'MRS: Road coverage';

  const hasData = (row: UploadRow) =>
    row.currentVal !== null || row.targetVal !== null;

  function formatTimestamp(ts: string) {
    if (!ts) return '[timestamp]';
    try {
      return new Date(ts).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return ts;
    }
  }

  const placeholderRowCount = Math.max(0, minVisibleRows - processed.length);

  return (
    <div className="overflow-x-auto rounded-md border border-[var(--color-border-table)]">
      <table className="w-full text-left" style={{ minWidth: 1200 }}>
        <thead>
          <tr className="bg-[var(--color-navy)] text-[var(--color-text-white)]">
            <FilterableHeader
              label="State"
              options={options.state}
              selected={filters.state}
              onChange={(s) => setColFilter('state', s)}
              sortDir={sortDirFor('state')}
              onSortChange={(d) => setColSort('state', d)}
            />
            <FilterableHeader
              label="City"
              options={options.city}
              selected={filters.city}
              onChange={(s) => setColFilter('city', s)}
              sortDir={sortDirFor('city')}
              onSortChange={(d) => setColSort('city', d)}
            />
            <FilterableHeader
              label="Initiative"
              options={options.initiative}
              selected={filters.initiative}
              onChange={(s) => setColFilter('initiative', s)}
              sortDir={sortDirFor('initiative')}
              onSortChange={(d) => setColSort('initiative', d)}
            />
            <FilterableHeader
              label="Metric"
              wide
              options={options.metric}
              selected={filters.metric}
              onChange={(s) => setColFilter('metric', s)}
              sortDir={sortDirFor('metric')}
              onSortChange={(d) => setColSort('metric', d)}
            />
            <PlainHeader label="Metric type" />
            <PlainHeader label="Target Val" align="right" />
            <PlainHeader label="Current Val" align="right" />
            <PlainHeader label="Unit" />
            <PlainHeader label="New Val" highlight />
            <PlainHeader label="Start date" />
            <PlainHeader label="End date" />
            <PlainHeader label="Remarks" highlight />
            <PlainHeader label="Last updated" />
            <PlainHeader label="Last updated by" />
          </tr>
        </thead>
        <tbody>
          {processed.map((row, i) => {
            const rowHasData = hasData(row);
            const showDates = metricNeedsDates(row.metric);
            const rowKey = `${row.state}-${row.city}-${row.initiative}-${row.metric}-${i}`;

            return (
              <tr
                key={rowKey}
                className="border-b border-dashed border-[var(--color-divider-dashed)] bg-white"
              >
                <BodyCell>{row.state}</BodyCell>
                <BodyCell>{row.city}</BodyCell>
                <BodyCell>{row.initiative}</BodyCell>
                <BodyCell wide>{row.metric}</BodyCell>
                <BodyCell capitalize>{row.metricType}</BodyCell>
                <BodyCell align="right" locked={!rowHasData}>
                  {row.targetVal !== null ? formatNumber(row.targetVal) : '-'}
                </BodyCell>
                <BodyCell align="right" locked={!rowHasData}>
                  {row.currentVal !== null ? formatNumber(row.currentVal) : '-'}
                </BodyCell>
                <BodyCell muted>{row.unit}</BodyCell>

                {/* Editable: New Val */}
                <td className="px-2 py-1 align-middle"
                    style={{ backgroundColor: 'rgba(200, 230, 201, 0.45)' }}>
                  <input
                    type="text"
                    value={row.newVal}
                    onChange={(e) => onNewValChange(row, e.target.value)}
                    placeholder="[ ]"
                    aria-label={`New value for ${row.city} / ${row.metric}`}
                    className={cn(
                      'w-full min-w-[60px] rounded border border-transparent bg-white/80 px-2 py-1 text-xs',
                      'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                      'focus-visible:border-[var(--color-border-blue)] focus-visible:outline-none',
                      'focus-visible:ring-2 focus-visible:ring-blue-300',
                    )}
                  />
                </td>

                {/* Start date */}
                <td
                  className={cn(
                    'px-3 py-1.5 text-xs',
                    showDates
                      ? 'bg-white text-[var(--color-text-secondary)]'
                      : 'bg-[var(--color-cell-locked)]',
                  )}
                  aria-hidden={!showDates}
                >
                  {showDates ? row.startDate || '[date]' : null}
                </td>

                {/* End date */}
                <td
                  className={cn(
                    'px-3 py-1.5 text-xs',
                    showDates
                      ? 'bg-white text-[var(--color-text-secondary)]'
                      : 'bg-[var(--color-cell-locked)]',
                  )}
                  aria-hidden={!showDates}
                >
                  {showDates ? row.endDate || '[date]' : null}
                </td>

                {/* Editable: Remarks */}
                <td
                  className="px-2 py-1 align-middle"
                  style={{ backgroundColor: 'rgba(200, 230, 201, 0.45)' }}
                >
                  <input
                    type="text"
                    value={row.remarks}
                    onChange={(e) => onRemarksChange(row, e.target.value)}
                    placeholder=""
                    aria-label={`Remarks for ${row.city} / ${row.metric}`}
                    className={cn(
                      'w-full min-w-[80px] rounded border border-transparent bg-white/80 px-2 py-1 text-xs',
                      'text-[var(--color-text-primary)]',
                      'focus-visible:border-[var(--color-border-blue)] focus-visible:outline-none',
                      'focus-visible:ring-2 focus-visible:ring-blue-300',
                    )}
                  />
                </td>

                <BodyCell muted>{formatTimestamp(row.lastUpdated)}</BodyCell>
                <BodyCell muted>{row.lastUpdatedBy || '[user]'}</BodyCell>
              </tr>
            );
          })}

          {/*
           * Visual filler rows — hidden from assistive technology so screen
           * readers don't announce empty cells as meaningful data.
           */}
          {placeholderRowCount > 0
            ? Array.from({ length: placeholderRowCount }).map((_, i) => (
                <tr
                  key={`placeholder-${i}`}
                  aria-hidden="true"
                  className="border-b border-dashed border-[var(--color-divider-dashed)] bg-white"
                >
                  {Array.from({ length: 14 }).map((__, ci) => (
                    <td key={ci} className="px-3 py-2 text-xs">
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>
      {processed.length === 0 ? (
        <p className="bg-white px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
          No rows match the current filters.
        </p>
      ) : null}
    </div>
  );
}

// ───────────────────────────── helpers ─────────────────────────────

function FilterableHeader({
  label,
  options,
  selected,
  onChange,
  sortDir,
  onSortChange,
  wide,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  sortDir: SortDir;
  onSortChange: (d: SortDir) => void;
  wide?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-3 py-2 text-xs font-semibold tracking-wide',
        wide && 'min-w-[220px]',
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <ColumnFilterMenu
          options={options}
          selected={selected}
          onChange={onChange}
          sortDir={sortDir}
          onSortChange={onSortChange}
          ariaLabel={`Sort and filter ${label}`}
        />
      </span>
    </th>
  );
}

function PlainHeader({
  label,
  align,
  highlight,
}: {
  label: string;
  align?: 'left' | 'right';
  highlight?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-3 py-2 text-xs font-semibold tracking-wide',
        align === 'right' && 'text-right',
        highlight && 'bg-[var(--color-bar-mid)]/70',
      )}
      style={
        highlight ? { backgroundColor: 'rgba(139, 195, 74, 0.85)' } : undefined
      }
    >
      {label}
    </th>
  );
}

function BodyCell({
  children,
  align,
  capitalize,
  muted,
  wide,
  locked,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  capitalize?: boolean;
  muted?: boolean;
  wide?: boolean;
  locked?: boolean;
}) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-3 py-1.5 text-xs',
        align === 'right' && 'text-right',
        capitalize && 'capitalize',
        muted
          ? 'text-[var(--color-text-muted)]'
          : 'text-[var(--color-text-primary)]',
        wide && 'max-w-[260px] whitespace-normal',
        locked && 'bg-[var(--color-cell-locked)]',
      )}
    >
      {children}
    </td>
  );
}
