// FILE: components/ui/DataTable.tsx
// PURPOSE: Reusable data table with Geography/Target/Achieved/Completion columns
// DESIGN REF: Wireframe page 8 (summary table), page 10 (detail tables)

import CompletionBar from './CompletionBar';
import { formatNumber } from '@/lib/utils';

interface DataTableRow {
  label: string;
  target: number;
  achieved: number;
  completion: number;
}

interface DataTableProps {
  title?: string;
  geographyLabel?: string;
  rows: DataTableRow[];
}

export default function DataTable({
  title,
  geographyLabel = 'State',
  rows,
}: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-table)]">
      {title && (
        <div className="bg-[var(--color-navy)] px-4 py-2.5">
          <h3 className="text-sm font-semibold text-[var(--color-text-white)]">
            {title}
          </h3>
        </div>
      )}
      <table className="w-full text-left">
        <thead>
          <tr className="sticky top-0 z-10 bg-[var(--color-navy)]">
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
            >
              {geographyLabel}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
            >
              Target
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
            >
              Achieved
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold tracking-wide text-[var(--color-text-white)]"
              style={{ minWidth: 160 }}
            >
              Completion
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, i) => (
              <tr
                key={row.label}
                className={
                  row.completion < 40
                    ? 'bg-[var(--color-danger-light)]'
                    : i % 2 === 0
                      ? 'bg-white'
                      : 'bg-[var(--color-surface-light)]'
                }
                style={{
                  borderBottom: '1px dashed var(--color-divider-dashed)',
                }}
              >
                <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">
                  {row.label}
                </td>
                <td className="px-4 py-3 text-right text-sm text-[var(--color-text-primary)]">
                  <span className="rounded bg-[var(--color-surface-warm)] px-2 py-0.5">
                    {formatNumber(row.target)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-[var(--color-text-primary)]">
                  <span className="rounded bg-[var(--color-surface-warm)] px-2 py-0.5">
                    {formatNumber(row.achieved)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <CompletionBar value={row.completion} showLabel size="sm" />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]"
              >
                No data available for this filter. Reset filters to continue.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
