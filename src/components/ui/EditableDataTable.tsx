// FILE: components/ui/EditableDataTable.tsx
// PURPOSE: Manual data upload table — only "New Val" column is editable
// DESIGN REF: Wireframe page 11 of 13 (Manual Data Upload Screen)


import { cn, formatNumber } from '@/lib/utils';
import type { UploadRow } from '@/lib/types';

interface EditableDataTableProps {
  rows: UploadRow[];
  onNewValChange: (index: number, value: string) => void;
}

export default function EditableDataTable({
  rows,
  onNewValChange,
}: EditableDataTableProps) {
  const metricNeedsDates = (metricName: string) =>
    metricName === 'Total quantum of malba received at SCC' ||
    metricName === 'MRS: Road coverage';

  const columns = [
    'Geography',
    'Metric',
    'Metric type',
    'Target Val',
    'Current Val',
    'Unit',
    'New Val',
    'Last updated',
    'Last updated by',
    'Start date',
    'End date',
    'Remarks',
  ];

  const hasData = (row: UploadRow) =>
    row.currentVal !== null || row.targetVal !== null;

  function formatTimestamp(ts: string) {
    if (!ts) return '-';
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

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border-table)]">
      <table className="w-full text-left" style={{ minWidth: 1100 }}>
        <thead>
          <tr className="bg-[var(--color-navy)]">
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const rowHasData = hasData(row);
            const showDates = metricNeedsDates(row.metric);

            return (
              <tr
                key={`${row.geography}-${row.metric}-${i}`}
                className={cn(
                  'border-b border-dashed border-[var(--color-divider-dashed)]',
                  rowHasData ? 'bg-white' : 'bg-[var(--color-surface-grey)]',
                )}
              >
                {/* Geography */}
                <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-[var(--color-text-primary)]">
                  {row.geography}
                </td>
                {/* Metric */}
                <td className="max-w-[200px] px-3 py-2 text-xs text-[var(--color-text-primary)]">
                  {row.metric}
                </td>
                {/* Metric type */}
                <td className="whitespace-nowrap px-3 py-2 text-xs capitalize text-[var(--color-text-secondary)]">
                  {row.metricType}
                </td>
                {/* Target Val */}
                <td className={cn(
                  'whitespace-nowrap px-3 py-2 text-xs text-right',
                  rowHasData ? 'bg-[var(--color-surface-warm)]' : 'bg-[var(--color-cell-locked)]',
                )}>
                  {row.targetVal !== null ? formatNumber(row.targetVal) : '-'}
                </td>
                {/* Current Val */}
                <td className={cn(
                  'whitespace-nowrap px-3 py-2 text-xs text-right',
                  rowHasData ? 'bg-[var(--color-surface-warm)]' : 'bg-[var(--color-cell-locked)]',
                )}>
                  {row.currentVal !== null ? formatNumber(row.currentVal) : '-'}
                </td>
                {/* Unit */}
                <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  {row.unit}
                </td>
                {/* New Val — EDITABLE */}
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.newVal}
                    onChange={(e) => onNewValChange(i, e.target.value)}
                    placeholder="Enter"
                    aria-label={`New value for ${row.geography} — ${row.metric}`}
                    className={cn(
                      'w-full min-w-[70px] rounded border px-2 py-1.5 text-xs',
                      'border-[var(--color-border-blue)] bg-[var(--color-cell-editable)]',
                      'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                    )}
                  />
                </td>
                {/* Last updated */}
                <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>
                  {formatTimestamp(row.lastUpdated)}
                </td>
                {/* Last updated by */}
                <td className="max-w-[120px] truncate px-3 py-2 text-xs text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>
                  {row.lastUpdatedBy || '-'}
                </td>
                {/* Start date */}
                <td
                  className={cn(
                    'whitespace-nowrap px-3 py-2 text-xs text-[var(--color-text-muted)]',
                    showDates ? 'bg-[var(--color-cell-editable)]' : 'bg-[var(--color-cell-locked)]',
                  )}
                  style={{ fontSize: 10 }}
                >
                  {showDates ? (row.startDate || '-') : ' '}
                </td>
                {/* End date */}
                <td
                  className={cn(
                    'whitespace-nowrap px-3 py-2 text-xs text-[var(--color-text-muted)]',
                    showDates ? 'bg-[var(--color-cell-editable)]' : 'bg-[var(--color-cell-locked)]',
                  )}
                  style={{ fontSize: 10 }}
                >
                  {showDates ? (row.endDate || '-') : ' '}
                </td>
                {/* Remarks */}
                <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  {row.remarks || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
