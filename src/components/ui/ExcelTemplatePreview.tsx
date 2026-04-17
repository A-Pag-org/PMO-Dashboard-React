// FILE: components/ui/ExcelTemplatePreview.tsx
// PURPOSE: Preview of the Excel upload template — locked/unlocked cell layout
// DESIGN REF: Wireframe page 12 of 13 (Excel Upload Template)

import Badge from './Badge';

const COLUMNS = [
  { name: 'Geography', locked: true },
  { name: 'Metric', locked: true },
  { name: 'Metric type', locked: true },
  { name: 'Target Val', locked: true },
  { name: 'Current Val', locked: true },
  { name: 'Unit', locked: true },
  { name: 'New Val', locked: false },
  { name: 'Last updated', locked: true },
  { name: 'Last updated by', locked: true },
  { name: 'Start date', locked: true },
  { name: 'End date', locked: true },
  { name: 'Remarks', locked: true },
];

const SAMPLE_ROWS = [
  ['Noida', 'No. of SCC setup achieved', 'Outcome', '500', '200', '-', '', '', '', '', '', ''],
  ['Noida', 'Total quantum of malba...', 'Outcome', '400', '50', 'MMT', '', '', '', '', '', ''],
  ['Greater Noida', 'No. of SCC setup achieved', 'Outcome', '', '', '-', '', '', '', '', '', ''],
];

export default function ExcelTemplatePreview() {
  return (
    <div className="rounded-lg border border-[var(--color-border-table)] bg-white">
      <div className="flex items-center justify-between bg-[var(--color-navy)] px-4 py-2.5 rounded-t-lg">
        <h3 className="text-sm font-semibold text-[var(--color-text-white)]">
          EXCEL UPLOAD TEMPLATE
        </h3>
        <Badge label="Tentative" variant="slate" />
      </div>

      <div className="p-4">
        <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
          Downloaded from the manual data upload screen. Only unshaded cells are
          unlocked (depends on the user).
        </p>

        <div className="overflow-x-auto rounded border border-[var(--color-border-table)]">
          <table className="w-full text-left" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.name}
                    scope="col"
                    className={
                      col.locked
                        ? 'whitespace-nowrap bg-[var(--color-cell-locked)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]'
                        : 'whitespace-nowrap bg-[var(--color-cell-editable)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)]'
                    }
                  >
                    {col.name}
                    {col.locked && (
                      <span className="ml-1 text-[var(--color-text-muted)]">🔒</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ROWS.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-t border-dashed border-[var(--color-divider-dashed)]"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={
                        COLUMNS[ci].locked
                          ? 'whitespace-nowrap bg-[var(--color-cell-locked)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]'
                          : 'whitespace-nowrap bg-[var(--color-cell-editable)] px-3 py-1.5 text-xs text-[var(--color-text-primary)]'
                      }
                    >
                      {cell || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>
          The greyed-out cells will be locked to the user once the excel template
          is downloaded containing the latest data; the portal will only update
          the data that the user has access for.
        </p>
      </div>
    </div>
  );
}
