// FILE: src/components/ui/TimeRangePill.tsx
// PURPOSE: Glassy pill containing the time-range segmented control —
//          Last 3M · Last 6M · Till Date · Custom. The selected tab
//          renders as a white-gradient chip in #2E4B8F text; the others
//          sit on the translucent background. Picking "Custom" opens a
//          popover with two native date pickers (From / To) so the user
//          chooses year, month and day before applying.

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type TimePreset = 'Last 3M' | 'Last 6M' | 'Till Date' | 'Custom';

export interface CustomRange {
  /** ISO YYYY-MM-DD. */
  from: string;
  to: string;
}

interface TimeRangePillProps {
  value: TimePreset;
  onChange: (preset: TimePreset) => void;
  customRange?: CustomRange;
  onCustomRangeChange?: (range: CustomRange) => void;
  className?: string;
}

const PRESETS: TimePreset[] = ['Last 3M', 'Last 6M', 'Till Date', 'Custom'];

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
    return 'Custom';
  }
}

export default function TimeRangePill({
  value,
  onChange,
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

  function selectPreset(p: TimePreset) {
    if (p === 'Custom') {
      onChange('Custom');
      setPopoverOpen(true);
      return;
    }
    onChange(p);
    setPopoverOpen(false);
  }

  function applyCustom() {
    if (draftFrom && draftTo && onCustomRangeChange) {
      onCustomRangeChange({ from: draftFrom, to: draftTo });
    }
    onChange('Custom');
    setPopoverOpen(false);
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        role="radiogroup"
        aria-label="Time range"
        className="inline-flex h-[38px] items-center gap-[4px] rounded-full px-[5px] [background:rgba(193,193,193,0.32)] [box-shadow:inset_0_3px_20px_rgba(0,0,0,0.15)]"
      >
        {PRESETS.map((p) => {
          const isActive = p === value;
          const displayText =
            p === 'Custom' && isActive && customRange
              ? formatRangeShort(customRange)
              : p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => selectPreset(p)}
              className={cn(
                'inline-flex h-[28px] items-center justify-center whitespace-nowrap rounded-full px-3 font-["Roboto",sans-serif] text-[12px] leading-[18px] transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                isActive
                  ? 'font-semibold text-[#2E4B8F] [background:linear-gradient(180deg,#ECECEC_20.59%,#FFFFFF_85.35%)]'
                  : 'font-medium text-[#FFF6E8] hover:bg-white/10 [text-shadow:0_0_3px_rgba(0,0,0,0.15)]',
              )}
            >
              {displayText}
            </button>
          );
        })}
      </div>

      {popoverOpen ? (
        <div
          role="dialog"
          aria-label="Pick a custom date range"
          className="absolute right-0 top-[44px] z-50 w-[300px] rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-xl"
        >
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            Custom range
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
