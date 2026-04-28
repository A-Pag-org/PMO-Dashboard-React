// FILE: src/pages/UploadPage.tsx
// PURPOSE: Manual Data Upload screen — single flat editable table with in-header
//          filter menus; Download / Upload template actions in the top-right.
// DESIGN REF: Wireframe page 11 of Impact_Dashboard_Structure_16_Apr.pdf

import { useRef, useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  ChevronDown,
  Info,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import EditableDataTable from '@/components/ui/EditableDataTable';
import { MOCK_UPLOAD_ROWS_ALL } from '@/lib/constants';
import type { UploadRow } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * UPLOAD_002 / UPLOAD_003 validation result for a single CSV data row.
 *   accept  — value passes data-type, range, and locked-cell integrity.
 *   ignore  — out-of-jurisdiction OR validation failure; silently dropped.
 */
type RowVerdict =
  | { kind: 'accept'; newVal: string; remarks: string }
  | { kind: 'ignore' };

type UploadStatusType = 'idle' | 'success' | 'error' | 'warning';
interface UploadStatus {
  type: UploadStatusType;
  message: string;
}

const CSV_HEADERS = [
  'State',
  'City',
  'Initiative',
  'Metric',
  'Metric Type',
  'Target Val',
  'Current Val',
  'Unit',
  'New Val',
  'Start Date',
  'End Date',
  'Remarks',
  'Last Updated',
  'Last Updated By',
] as const;

const EMPTY_UPLOAD_STATUS: UploadStatus = { type: 'idle', message: '' };

function rowKey(r: { state: string; city: string; initiative: string; metric: string }) {
  return `${r.state}::${r.city}::${r.initiative}::${r.metric}`;
}

function normalizeHeader(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * RFC 4180–compliant CSV line parser.
 * Handles: quoted fields, escaped double-quotes (""), trailing commas.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        // Escaped quote inside a quoted field
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Split CSV text into rows.
 * Normalises all line endings (CRLF, CR, LF) before splitting so Windows
 * exports from Excel work correctly. Lines beginning with "#" are
 * treated as comments (used for the UPLOAD_003 locking notice that we
 * prepend to downloaded templates).
 */
function parseCsv(text: string): string[][] {
  return (
    text
      // Normalise Windows (CRLF) and old Mac (CR) line endings to LF
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((l) => l.trim().length > 0 && !l.trimStart().startsWith('#'))
      .map(parseCsvLine)
  );
}

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * UPLOAD_002 / UPLOAD_003 — single-row validator. A row is silently
 * ignored ({ kind: 'ignore' }) when:
 *   · It has fewer columns than the template (malformed).
 *   · Its (state, city, initiative, metric) key is outside the user's
 *     jurisdiction (no matching server-side row).
 *   · `New Val` fails a data-type or range check for the row's format.
 *   · Any locked column has been edited (locked-cell integrity).
 *   · `Start Date` / `End Date` were edited on a metric that doesn't
 *     allow date edits (only the four metrics flagged via hasDates).
 */
function validateCsvRow(
  csvRow: string[],
  prev: UploadRow[],
  keyToIndex: Map<string, number>,
  cols: {
    iState: number; iCity: number; iInit: number; iMetric: number;
    iNewVal: number; iRemarks: number; iTarget: number; iCurrent: number;
    iStart: number; iEndDate: number;
    editableCols: Set<number>;
    expectedColCount: number;
  },
): RowVerdict {
  if (csvRow.length < cols.expectedColCount) return { kind: 'ignore' };

  const key = `${csvRow[cols.iState] ?? ''}::${csvRow[cols.iCity] ?? ''}::${csvRow[cols.iInit] ?? ''}::${csvRow[cols.iMetric] ?? ''}`;
  const targetIdx = keyToIndex.get(key);
  if (targetIdx === undefined) return { kind: 'ignore' }; // out-of-jurisdiction

  const original = prev[targetIdx];
  const newVal  = (csvRow[cols.iNewVal]  ?? '').trim();
  const remarks = (csvRow[cols.iRemarks] ?? '').trim();

  // Locked-cell integrity: every column that is NOT in editableCols
  // must match the value the user originally downloaded.
  const expectedAt = (i: number): string => {
    if (i === cols.iState)   return original.state;
    if (i === cols.iCity)    return original.city;
    if (i === cols.iInit)    return original.initiative;
    if (i === cols.iMetric)  return original.metric;
    if (i === cols.iTarget)  return original.targetVal == null ? '' : String(original.targetVal);
    if (i === cols.iCurrent) return original.currentVal == null ? '' : String(original.currentVal);
    if (i === cols.iStart)   return original.startDate;
    if (i === cols.iEndDate) return original.endDate;
    return '';
  };
  for (let i = 0; i < cols.expectedColCount; i++) {
    if (cols.editableCols.has(i)) continue;
    const got = (csvRow[i] ?? '').trim();
    const want = expectedAt(i).trim();
    // Only check columns we know how to compare; let unknown locked
    // columns (e.g. Last Updated By) pass through silently.
    if (i === cols.iState || i === cols.iCity || i === cols.iInit || i === cols.iMetric ||
        i === cols.iTarget || i === cols.iCurrent) {
      if (got !== want) return { kind: 'ignore' };
    }
  }

  // Date-edit gate: only metrics with hasDates may change Start/End.
  if (!original.hasDates) {
    const startGot = (csvRow[cols.iStart]   ?? '').trim();
    const endGot   = (csvRow[cols.iEndDate] ?? '').trim();
    if (startGot !== (original.startDate ?? '').trim()) return { kind: 'ignore' };
    if (endGot   !== (original.endDate   ?? '').trim()) return { kind: 'ignore' };
  }

  // Data-type & range checks against the metric's format.
  if (newVal !== '') {
    if (original.format === 'X/Y') {
      const n = Number(newVal);
      if (!Number.isFinite(n) || n < 0) return { kind: 'ignore' };
      if (original.targetVal != null && n > original.targetVal) return { kind: 'ignore' };
    } else if (original.format === 'Xx') {
      const n = Number(newVal);
      if (!Number.isFinite(n) || n < 0) return { kind: 'ignore' };
    } else if (original.format === 'Y/N') {
      const u = newVal.toUpperCase();
      if (u !== 'Y' && u !== 'N') return { kind: 'ignore' };
    }
  }

  return { kind: 'accept', newVal, remarks };
}

export default function UploadPage() {
  const [rows, setRows] = useState<UploadRow[]>(() =>
    MOCK_UPLOAD_ROWS_ALL.map((r) => ({ ...r })),
  );
  const [status, setStatus] = useState<UploadStatus>(EMPTY_UPLOAD_STATUS);
  const fileRef = useRef<HTMLInputElement>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showStatus(type: UploadStatusType, message: string) {
    setStatus({ type, message });
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(
      () => setStatus(EMPTY_UPLOAD_STATUS),
      5000,
    );
  }

  function onNewValChange(row: UploadRow, value: string) {
    const key = rowKey(row);
    setRows((prev) =>
      prev.map((r) => (rowKey(r) === key ? { ...r, newVal: value } : r)),
    );
  }

  function onRemarksChange(row: UploadRow, value: string) {
    const key = rowKey(row);
    setRows((prev) =>
      prev.map((r) => (rowKey(r) === key ? { ...r, remarks: value } : r)),
    );
  }

  function handleDownload() {
    const body = rows.map((r) => [
      r.state,
      r.city,
      r.initiative,
      r.metric,
      r.metricType,
      r.targetVal ?? '',
      r.currentVal ?? '',
      r.unit,
      r.newVal,
      r.startDate,
      r.endDate,
      r.remarks,
      r.lastUpdated,
      r.lastUpdatedBy,
    ]);
    // UPLOAD_003 — annotate the template with the lock policy. The "#"
    // lines are stripped on parse but stay visible when the file is
    // opened in Excel/Sheets so users know which columns they may edit.
    const noticeLines = [
      '# Manual Data Upload Template — locked-cell policy',
      '# EDITABLE columns: New Val, Remarks (and Start Date / End Date',
      '#                    only on rows whose Metric is flagged for date',
      '#                    edits — e.g. SCC malba and MRS road coverage).',
      '# All OTHER columns are LOCKED — changes will cause the row to be',
      '# silently ignored on upload (UPLOAD_002 / UPLOAD_003).',
    ];
    const csv = [
      ...noticeLines,
      ...[CSV_HEADERS, ...body].map((row) => row.map(escapeCsvCell).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manual-data-upload-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleUploadClick() {
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
      showStatus('error', 'Invalid file type. Please upload a CSV file.');
      e.target.value = '';
      return;
    }
    if (fileName.endsWith('.xlsx')) {
      showStatus(
        'warning',
        'For this demo, please upload the downloaded CSV template (.csv).',
      );
      e.target.value = '';
      return;
    }

    // Guard: 5 MB max to avoid hanging on huge accidental uploads
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      showStatus('error', 'File is too large (max 5 MB). Please upload a smaller file.');
      e.target.value = '';
      return;
    }

    try {
      const raw = await file.text();
      const parsed = parseCsv(raw);

      if (parsed.length < 2) {
        showStatus('error', 'Uploaded file has no data rows. Download a fresh template and try again.');
        e.target.value = '';
        return;
      }

      const header = parsed[0].map(normalizeHeader);
      const expected = CSV_HEADERS.map(normalizeHeader);
      const columnsMatch =
        header.length === expected.length &&
        expected.every((h, idx) => h === header[idx]);

      if (!columnsMatch) {
        showStatus(
          'error',
          'Column headers don\'t match the template. Please use the latest downloaded template.',
        );
        e.target.value = '';
        return;
      }

      const idx = (name: string) => expected.indexOf(normalizeHeader(name));
      const iState    = idx('State');
      const iCity     = idx('City');
      const iInit     = idx('Initiative');
      const iMetric   = idx('Metric');
      const iNewVal   = idx('New Val');
      const iRemarks  = idx('Remarks');
      const iTarget   = idx('Target Val');
      const iCurrent  = idx('Current Val');
      const iStart    = idx('Start Date');
      const iEndDate  = idx('End Date');

      // The CSV columns the user is permitted to change. Any other
      // column whose value differs from the in-memory row is treated as
      // a locked-cell-integrity violation and the row is silently
      // ignored (UPLOAD_002 / UPLOAD_003).
      const EDITABLE_COLS = new Set([iNewVal, iRemarks, iStart, iEndDate]);

      let updated = 0;

      setRows((prev) => {
        const keyToIndex = new Map(prev.map((r, i) => [rowKey(r), i]));
        const next = [...prev];

        for (const csvRow of parsed.slice(1)) {
          const verdict = validateCsvRow(csvRow, prev, keyToIndex, {
            iState, iCity, iInit, iMetric,
            iNewVal, iRemarks, iTarget, iCurrent, iStart, iEndDate,
            editableCols: EDITABLE_COLS,
            expectedColCount: expected.length,
          });
          if (verdict.kind === 'ignore') continue;

          const key = rowKey({
            state:      csvRow[iState]  ?? '',
            city:       csvRow[iCity]   ?? '',
            initiative: csvRow[iInit]   ?? '',
            metric:     csvRow[iMetric] ?? '',
          });
          const targetIdx = keyToIndex.get(key)!;

          next[targetIdx] = {
            ...next[targetIdx],
            newVal:  verdict.newVal,
            remarks: verdict.remarks,
          };
          updated++;
        }
        return next;
      });

      if (updated > 0) {
        showStatus('success', `Upload successful — ${updated} row${updated !== 1 ? 's' : ''} updated.`);
      } else {
        showStatus(
          'warning',
          'No rows were updated. Make sure you are uploading a template downloaded from this screen.',
        );
      }
    } catch (err) {
      console.error('[UploadPage] CSV parse error:', err);
      showStatus('error', 'Could not read the file. Download a fresh template and try again.');
    }

    // Reset the input so the same file can be re-uploaded after fixing
    e.target.value = '';
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar activePage="upload" pageTitle="MANUAL DATA UPLOAD SCREEN" showBackToSummary />

      <main className="flex min-h-0 flex-1 flex-col bg-[var(--color-surface-light)]">
        {/* ── Header strip with Download / Upload actions ── */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-4 pt-3">
          {/* Left: wireframe orange callout pointing at the Download button */}
          <div className="relative hidden max-w-[320px] pt-2 md:block">
            <Callout>
              User can alternatively upload excel to update data
            </Callout>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              icon={Download}
              label="Download template"
              onClick={handleDownload}
            />
            <ActionButton
              icon={Upload}
              label="Upload updated data"
              onClick={handleUploadClick}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload data file"
            />
          </div>
        </div>

        {/* Upload status toast */}
        {status.type !== 'idle' ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'mx-4 mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium',
              status.type === 'success'
                ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                : status.type === 'warning'
                ? 'bg-[var(--color-surface-warm)] text-[var(--color-warning)]'
                : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
            )}
          >
            {status.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {status.message}
          </div>
        ) : null}

        {/* ── Spec callout ── */}
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-[var(--color-border-blue)] bg-[var(--color-blue-pale)] px-3 py-2 text-xs text-[var(--color-text-primary)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-blue-link)]" aria-hidden />
          <div>
            <p className="font-semibold">Manual entry — spec §7.</p>
            <p className="text-[var(--color-text-secondary)]">
              Only metrics whose data source is &quot;Manually entered in
              portal&quot; appear here. You can edit <strong>New Val</strong>
              {' '}and <strong>Remarks</strong> on every row;{' '}
              <strong>Start / End date</strong> are editable only for the
              two periodic metrics flagged in §7.3 (SCC malba and MRS road
              coverage). All other columns are locked. Rows that fail
              data-type / range / locked-cell checks, or that fall outside
              your jurisdiction, are silently ignored on upload.
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <EditableDataTable
            rows={rows}
            onNewValChange={onNewValChange}
            onRemarksChange={onRemarksChange}
            minVisibleRows={0}
          />
        </div>
      </main>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Download;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[36px] items-center gap-2 rounded-md border border-[var(--color-border-table)] bg-white px-4 py-1.5',
        'text-xs font-medium text-[var(--color-text-primary)] shadow-sm',
        'hover:bg-[var(--color-blue-pale)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--color-success-light)]" aria-hidden>
        <Icon className="h-3 w-3 text-[var(--color-success)]" />
      </span>
      {label}
      <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-hidden />
    </button>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-md bg-[var(--color-text-orange)] px-3 py-2 text-xs font-semibold leading-snug text-white shadow">
      {children}
    </div>
  );
}
