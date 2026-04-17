// FILE: src/pages/UploadPage.tsx
// PURPOSE: Interactive upload page — per-initiative data, cascading filters, download/upload
// DESIGN REF: Wireframe pages 11–12 (Manual Data Upload + Excel Template)

import { useMemo, useRef, useState } from 'react';
import { Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import FilterPill from '@/components/ui/FilterPill';
import EditableDataTable from '@/components/ui/EditableDataTable';
import ExcelTemplatePreview from '@/components/ui/ExcelTemplatePreview';
import {
  UPLOAD_STATE_OPTIONS,
  UPLOAD_CITY_OPTIONS_BY_STATE,
  UPLOAD_INITIATIVE_SLUG_MAP,
  MOCK_UPLOAD_BY_INITIATIVE,
} from '@/lib/constants';
import type { UploadRow } from '@/lib/types';

type UploadStatusType = 'idle' | 'success' | 'error' | 'warning';

interface UploadStatus {
  type: UploadStatusType;
  message: string;
}

const INITIATIVE_NAMES = Object.keys(UPLOAD_INITIATIVE_SLUG_MAP);
const CSV_HEADERS = [
  'Geography',
  'Metric',
  'Metric Type',
  'Target Val',
  'Current Val',
  'Unit',
  'New Val',
  'Last Updated',
  'Last Updated By',
  'Start Date',
  'End Date',
  'Remarks',
] as const;

const EMPTY_UPLOAD_STATUS: UploadStatus = {
  type: 'idle',
  message: '',
};

function toAccessKey(geography: string, metric: string): string {
  return `${geography}::${metric}`;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((cell) => cell.trim());
}

function parseCsv(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function UploadPage() {
  const [initiative, setInitiative] = useState(INITIATIVE_NAMES[0]);
  const [state, setState] = useState<string>('All');
  const [city, setCity] = useState<string>('All');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(EMPTY_UPLOAD_STATUS);
  const fileRef = useRef<HTMLInputElement>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slug = UPLOAD_INITIATIVE_SLUG_MAP[initiative] ?? 'naya-safar-yojana';

  const [rowsByInitiative, setRowsByInitiative] = useState<Record<string, UploadRow[]>>(() => {
    const copy: Record<string, UploadRow[]> = {};
    for (const [key, rows] of Object.entries(MOCK_UPLOAD_BY_INITIATIVE)) {
      copy[key] = rows.map((r) => ({ ...r }));
    }
    return copy;
  });

  const stateOptions = ['All', ...UPLOAD_STATE_OPTIONS];

  const cityOptions = useMemo(() => {
    if (state === 'All') {
      return ['All', ...Object.values(UPLOAD_CITY_OPTIONS_BY_STATE).flat()];
    }
    const cities = UPLOAD_CITY_OPTIONS_BY_STATE[state] ?? [];
    return ['All', ...cities];
  }, [state]);

  const filteredRows = useMemo(() => {
    const allRows = rowsByInitiative[slug] ?? [];
    let filtered = allRows;
    if (city !== 'All') {
      filtered = filtered.filter((r) => r.geography === city);
    } else if (state !== 'All') {
      const stateCities = UPLOAD_CITY_OPTIONS_BY_STATE[state] ?? [];
      filtered = filtered.filter((r) => stateCities.includes(r.geography));
    }
    return filtered;
  }, [rowsByInitiative, slug, state, city]);

  function handleStateChange(v: string) {
    setState(v);
    setCity('All');
  }

  function handleNewValChange(filteredIndex: number, value: string) {
    const targetRow = filteredRows[filteredIndex];
    if (!targetRow) return;
    setRowsByInitiative((prev) => ({
      ...prev,
      [slug]: prev[slug].map((r) =>
        r.geography === targetRow.geography && r.metric === targetRow.metric
          ? { ...r, newVal: value }
          : r,
      ),
    }));
  }

  function showUploadStatus(type: UploadStatusType, message: string): void {
    setUploadStatus({ type, message });
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    statusTimeoutRef.current = setTimeout(() => {
      setUploadStatus(EMPTY_UPLOAD_STATUS);
      statusTimeoutRef.current = null;
    }, 5000);
  }

  function handleDownload() {
    const csvRows = filteredRows.map((r) => [
      r.geography,
      r.metric,
      r.metricType,
      r.targetVal ?? '',
      r.currentVal ?? '',
      r.unit,
      r.newVal,
      r.lastUpdated,
      r.lastUpdatedBy,
      r.startDate,
      r.endDate,
      r.remarks,
    ]);
    const csv = [CSV_HEADERS, ...csvRows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-template-${slug}.csv`;
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
      showUploadStatus('error', 'Invalid file type. Please upload CSV or XLSX.');
      e.target.value = '';
      return;
    }

    if (fileName.endsWith('.xlsx')) {
      // TODO: replace with real XLSX parsing + validation
      showUploadStatus('warning', 'For this demo, please upload the downloaded CSV template.');
      e.target.value = '';
      return;
    }

    try {
      const raw = await file.text();
      const rows = parseCsv(raw);
      if (rows.length < 2) {
        showUploadStatus('error', 'Uploaded file is empty. Download a fresh template and try again.');
        e.target.value = '';
        return;
      }

      const header = rows[0];
      const expected = CSV_HEADERS.map(normalizeHeader);
      const actual = header.map(normalizeHeader);
      const headerMatches =
        expected.length === actual.length &&
        expected.every((h, idx) => h === actual[idx]);
      if (!headerMatches) {
        showUploadStatus('error', 'Template mismatch. Please use the latest downloaded template.');
        e.target.value = '';
        return;
      }

      const geographyIdx = header.findIndex((h) => normalizeHeader(h) === normalizeHeader('Geography'));
      const metricIdx = header.findIndex((h) => normalizeHeader(h) === normalizeHeader('Metric'));
      const newValIdx = header.findIndex((h) => normalizeHeader(h) === normalizeHeader('New Val'));
      if (geographyIdx === -1 || metricIdx === -1 || newValIdx === -1) {
        showUploadStatus('error', 'Template is missing required columns: Geography, Metric, New Val.');
        e.target.value = '';
        return;
      }

      const accessibleKeys = new Set(filteredRows.map((r) => toAccessKey(r.geography, r.metric)));
      let updatedRows = 0;
      let ignoredRows = 0;
      let unmatchedRows = 0;

      setRowsByInitiative((prev) => {
        const next = [...(prev[slug] ?? [])];
        const indexByKey = new Map(
          next.map((row, idx) => [toAccessKey(row.geography, row.metric), idx]),
        );

        for (const row of rows.slice(1)) {
          const geography = (row[geographyIdx] ?? '').trim();
          const metric = (row[metricIdx] ?? '').trim();
          const newVal = (row[newValIdx] ?? '').trim();
          if (!geography || !metric) {
            unmatchedRows += 1;
            continue;
          }

          const key = toAccessKey(geography, metric);
          if (!accessibleKeys.has(key)) {
            ignoredRows += 1;
            continue;
          }

          const rowIndex = indexByKey.get(key);
          if (rowIndex === undefined) {
            unmatchedRows += 1;
            continue;
          }

          next[rowIndex] = {
            ...next[rowIndex],
            newVal,
          };
          updatedRows += 1;
        }

        return {
          ...prev,
          [slug]: next,
        };
      });

      if (updatedRows > 0 && ignoredRows === 0 && unmatchedRows === 0) {
        showUploadStatus('success', `Upload successful. ${updatedRows} rows updated.`);
      } else if (updatedRows > 0) {
        showUploadStatus(
          'warning',
          `Upload partially applied: ${updatedRows} updated, ${ignoredRows} not in your access, ${unmatchedRows} unmatched.`,
        );
      } else {
        showUploadStatus(
          'warning',
          'No rows were updated. Please upload rows from your assigned template.',
        );
      }
    } catch {
      showUploadStatus('error', 'Could not read uploaded file. Please download a fresh template and retry.');
    }

    e.target.value = '';
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar
        activePage="upload"
        pageTitle="MANUAL DATA UPLOAD SCREEN"
        showBackToSummary
      />

      <div className="flex flex-1 flex-col">
        {/* ── FILTER BAR + ACTIONS ── */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[var(--color-navy-mid)] px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              label="Initiative"
              options={INITIATIVE_NAMES}
              value={initiative}
              onChange={setInitiative}
            />
            <div className="mx-1 h-6 w-px bg-white/20" />
            <FilterPill
              label="State"
              options={stateOptions as unknown as string[]}
              value={state}
              onChange={handleStateChange}
            />
            <FilterPill
              label="City"
              options={cityOptions}
              value={city}
              onChange={setCity}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex min-h-[40px] items-center gap-2 rounded-md bg-[var(--color-success)] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <Download className="h-4 w-4" />
              <span>Download template</span>
            </button>
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex min-h-[40px] items-center gap-2 rounded-md bg-[var(--color-success)] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload updated data</span>
            </button>
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

        {/* Upload status */}
        {uploadStatus.type !== 'idle' && (
          <div
            className={
              uploadStatus.type === 'success'
                ? 'flex items-center gap-2 bg-[var(--color-success-light)] px-4 py-2 text-xs font-medium text-[var(--color-success)]'
                : uploadStatus.type === 'warning'
                  ? 'flex items-center gap-2 bg-[var(--color-surface-warm)] px-4 py-2 text-xs font-medium text-[var(--color-warning)]'
                  : 'flex items-center gap-2 bg-[var(--color-danger-light)] px-4 py-2 text-xs font-medium text-[var(--color-danger)]'
            }
          >
            {uploadStatus.type === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4" /> {uploadStatus.message}
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" /> {uploadStatus.message}
              </>
            )}
          </div>
        )}

        {/* ── EDITABLE DATA TABLE ── */}
        <div className="flex-1 overflow-auto p-4">
          {filteredRows.length > 0 ? (
            <EditableDataTable rows={filteredRows} onNewValChange={handleNewValChange} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-[var(--color-border-table)]">
              <p className="text-sm text-[var(--color-text-muted)]">
                No data available for this filter combination
              </p>
            </div>
          )}

          <p className="mt-3 text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>
            Data will only be input for the lowest level, and then aggregated to the
            nearest upper level; the UI will only show the rows relevant to the user.
          </p>
        </div>

        {/* ── EXCEL TEMPLATE PREVIEW ── */}
        <div className="shrink-0 border-t border-[var(--color-divider-dashed)] p-4">
          <ExcelTemplatePreview />
        </div>
      </div>
    </div>
  );
}
