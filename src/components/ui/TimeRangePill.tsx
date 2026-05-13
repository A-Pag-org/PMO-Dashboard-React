// FILE: src/components/ui/TimeRangePill.tsx
// PURPOSE: Glassy "Select date" pill for the navy filter bar. Click
//          opens an anchored popover with two native date inputs
//          (From / To) so the user can pick year, month and day for
//          both ends of a custom range. Once applied, the pill's value
//          chip compacts to "DD Mon → DD Mon".

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomRange {
  /** ISO YYYY-MM-DD. */
  from: string;
  to: string;
}

interface TimeRangePillProps {
  customRange?: CustomRange;
  onCustomRangeChange?: (range: CustomRange) => void;
  className?: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function monthsAgoISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function formatRangeShort(range: CustomRange): string {
  try {
    const f = new Date(range.from);
    const t = new Date(range.to);
    const fmt = (d: Date) =>
      `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`;
    return `${fmt(f)} → ${fmt(t)}`;
  } catch {
    return 'Select date';
  }
}

export default function TimeRangePill({
  customRange,
  onCustomRangeChange,
  className,
}: TimeRangePillProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(
    customRange?.from ?? monthsAgoISO(1),
  );
  const [draftTo, setDraftTo] = useState(customRange?.to ?? todayISO());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    function handleDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setPopoverOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopoverOpen(false);
    }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [popoverOpen]);

  useEffect(() => {
    if (customRange) {
      setDraftFrom(customRange.from);
      setDraftTo(customRange.to);
    }
  }, [customRange]);

  function applyCustom() {
    if (draftFrom && draftTo && onCustomRangeChange) {
      onCustomRangeChange({ from: draftFrom, to: draftTo });
    }
    setPopoverOpen(false);
  }

  const hasRange = !!customRange;
  const chipText = hasRange ? formatRangeShort(customRange) : 'Select date';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setPopoverOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={popoverOpen}
        aria-label="Select date range"
        className="relative inline-flex h-[38px] cursor-pointer items-center rounded-full pl-[9px] pr-[6px] [background:rgba(193,193,193,0.32)] [box-shadow:inset_0_3px_20px_rgba(0,0,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <span className="select-none whitespace-nowrap font-['Roboto',sans-serif] text-[12px] font-normal leading-[14px] tracking-[0.1px] text-white">
          Date:
        </span>
        <span
          aria-hidden
          className="mx-[5px] h-[38px] w-px shrink-0 bg-[#F1F1F5]"
        />
        <span
          className={cn(
            'inline-flex h-[28px] max-w-[200px] items-center rounded-full px-3 font-["Roboto",sans-serif] text-[12px] font-semibold leading-[18px] text-[#2E4B8F]',
            '[background:linear-gradient(180deg,#ECECEC_20.59%,#FFFFFF_85.35%)]',
          )}
        >
          <span className="truncate">{chipText}</span>
        </span>
        <span
          aria-hidden
          className="ml-[6px] mr-[2px] h-[38px] w-px shrink-0 bg-[#F1F1F5]"
        />
        <ChevronDown
          className="ml-[4px] h-4 w-4 shrink-0 text-white/95"
          aria-hidden
        />
      </button>

      {popoverOpen ? (
        <div
          role="dialog"
          aria-label="Pick a custom date range"
          className="absolute right-0 top-[44px] z-50 w-[300px] rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-xl"
        >
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            Select date
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              From
              <input
                type="date"
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="h-9 rounded-md border border-[var(--color-border)] px-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-blue-link)] focus:outline-none focus:ring-1 focus:ring-[var(--color-blue-link)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              To
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                max={todayISO()}
                onChange={(e) => setDraftTo(e.target.value)}
                className="h-9 rounded-md border border-[var(--color-border)] px-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-blue-link)] focus:outline-none focus:ring-1 focus:ring-[var(--color-blue-link)]"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-light)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!draftFrom || !draftTo || draftFrom > draftTo}
              className="rounded-md bg-[#2E4B8F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--color-navy-mid)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
