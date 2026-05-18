// FILE: src/components/ui/TimePeriodPill.tsx
// PURPOSE: Time-period filter pill for the Detail page filter bar.
//          Spec (General rules DV §7): "Overall" (default) + checkbox
//          list of monthly options Apr 2026 – Mar 2027. Picking any
//          month deselects "Overall"; picking "Overall" clears months.
//          The chip reads:
//              "Overall"                  no months
//              "May '26"                  one month
//              "May '26 + 2 more"         many months
//
// Same portal/anchoring strategy as TimeRangePill so the popover
// escapes ancestor overflow on the navy filter bar.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimePeriod {
  /** Overall = cumulative-to-date (the default). */
  overall: boolean;
  /** ISO YYYY-MM keys for the selected months, e.g. "2026-05". */
  months: string[];
}

interface TimePeriodPillProps {
  period?: TimePeriod;
  onChange?: (period: TimePeriod) => void;
  className?: string;
}

const POPOVER_WIDTH = 240;
const POPOVER_GAP = 6;

// Spec: reporting year runs Apr 2026 → Mar 2027.
const REPORTING_MONTHS: { key: string; label: string }[] = (() => {
  const out: { key: string; label: string }[] = [];
  const names = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  // start Apr 2026 (m=3), 12 months
  let year = 2026;
  let m = 3;
  for (let i = 0; i < 12; i++) {
    const yy = String(year).slice(-2);
    out.push({
      key: `${year}-${String(m + 1).padStart(2, '0')}`,
      label: `${names[m]} '${yy}`,
    });
    m += 1;
    if (m > 11) { m = 0; year += 1; }
  }
  return out;
})();

export const DEFAULT_TIME_PERIOD: TimePeriod = { overall: true, months: [] };

function labelFor(period: TimePeriod): string {
  if (period.overall || period.months.length === 0) return 'Overall';
  const ordered = REPORTING_MONTHS
    .filter((m) => period.months.includes(m.key))
    .map((m) => m.label);
  if (ordered.length === 1) return ordered[0];
  return `${ordered[0]} + ${ordered.length - 1} more`;
}

export default function TimePeriodPill({
  period = DEFAULT_TIME_PERIOD,
  onChange,
  className,
}: TimePeriodPillProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.max(8, rect.right - POPOVER_WIDTH);
      const top = rect.bottom + POPOVER_GAP;
      setPos({ top, left });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const chipText = useMemo(() => labelFor(period), [period]);

  function selectOverall() {
    onChange?.({ overall: true, months: [] });
  }

  function toggleMonth(key: string) {
    const has = period.months.includes(key);
    const next = has
      ? period.months.filter((k) => k !== key)
      : [...period.months, key];
    onChange?.({ overall: next.length === 0, months: next });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Select reporting period"
        className={cn(
          'relative inline-flex h-[38px] cursor-pointer items-center rounded-full pl-[9px] pr-[6px] [background:rgba(193,193,193,0.32)] [box-shadow:inset_0_3px_20px_rgba(0,0,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          className,
        )}
      >
        <span className="select-none whitespace-nowrap font-['Roboto',sans-serif] text-[12px] font-normal leading-[14px] tracking-[0.1px] text-white">
          Period:
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

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Reporting period"
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: POPOVER_WIDTH,
                zIndex: 1000,
              }}
              className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-xl"
            >
              <div className="border-b border-[var(--color-border-table)] px-3 py-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Reporting period
                </h3>
              </div>

              <ul className="max-h-[320px] overflow-y-auto py-1">
                <Row
                  label="Overall (cumulative)"
                  emphasis
                  checked={period.overall || period.months.length === 0}
                  onToggle={selectOverall}
                />
                <li
                  aria-hidden
                  className="my-1 h-px bg-[var(--color-border-table)]"
                />
                {REPORTING_MONTHS.map((m) => (
                  <Row
                    key={m.key}
                    label={m.label}
                    checked={period.months.includes(m.key)}
                    onToggle={() => toggleMonth(m.key)}
                  />
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Row({
  label,
  checked,
  emphasis = false,
  onToggle,
}: {
  label: string;
  checked: boolean;
  emphasis?: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-checked={checked}
        role="menuitemcheckbox"
        className={cn(
          'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--color-blue-pale)] focus-visible:outline-none focus-visible:bg-[var(--color-blue-pale)]',
          emphasis ? 'font-bold text-[var(--color-text-primary)]' : 'font-semibold text-[var(--color-text-secondary)]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
            checked
              ? 'border-[var(--color-blue-link)] bg-[var(--color-blue-link)] text-white'
              : 'border-[var(--color-border)] bg-white',
          )}
        >
          {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
}
