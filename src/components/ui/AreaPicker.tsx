// FILE: src/components/ui/AreaPicker.tsx
// PURPOSE: Single "Area" pill on the navy filter bar. Clicking it opens
//          a card containing three stacked native-style dropdowns:
//            State · {District|City} · {RTO|Industrial Area}
//          The mid- and deepest-level labels come from the initiative
//          config (cityLabel / rtoLabel) so Naya Safar reads
//          "District / RTO" while Road Repair reads "City".
//
//          Each dropdown auto-applies on change (no Apply button); the
//          city dropdown enables once a state is picked and the RTO
//          dropdown enables once a city is picked. A "Reset" button
//          clears the whole area filter.
//
//          The pill chip shows the deepest selected level only —
//          "All NCR" / "Delhi" / "Gurugram" / "Gurugram RTO" — so the
//          bar stays scannable.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import {
  RTO_OPTIONS_BY_CITY,
  STATES,
  UPLOAD_CITY_OPTIONS_BY_STATE,
} from '@/lib/constants';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import { cn } from '@/lib/utils';

interface AreaPickerProps {
  area: AreaFilterValue;
  onChange: (area: AreaFilterValue) => void;
  supportsCity?: boolean;
  supportsRto?: boolean;
  cityLabel?: string;
  rtoLabel?: string;
  className?: string;
}

const POPOVER_WIDTH = 280;
const POPOVER_GAP = 6;

function chipLabel(area: AreaFilterValue): string {
  if (area.rto) return area.rto;
  if (area.city) return area.city;
  if (area.state) return area.state;
  return 'All NCR';
}

export default function AreaPicker({
  area,
  onChange,
  supportsCity = true,
  supportsRto = false,
  cityLabel = 'City',
  rtoLabel = 'RTO',
  className,
}: AreaPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.max(8, rect.left);
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

  // Cascading option lists — city options depend on selected state,
  // RTO options depend on selected city.
  const cityOptions = area.state
    ? UPLOAD_CITY_OPTIONS_BY_STATE[area.state] ?? []
    : [];
  const rtoOptions = area.city ? RTO_OPTIONS_BY_CITY[area.city] ?? [] : [];

  function pickState(state: string) {
    // Changing state clears the levels below it.
    onChange(state ? { state } : {});
  }
  function pickCity(city: string) {
    onChange({ state: area.state, city: city || undefined });
  }
  function pickRto(rto: string) {
    onChange({ state: area.state, city: area.city, rto: rto || undefined });
  }
  function clearAll() {
    onChange({});
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Choose area"
        className={cn(
          'relative inline-flex h-[38px] cursor-pointer items-center rounded-full pl-[9px] pr-[6px] [background:rgba(193,193,193,0.32)] [box-shadow:inset_0_3px_20px_rgba(0,0,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          className,
        )}
      >
        <span className="select-none whitespace-nowrap font-['Roboto',sans-serif] text-[12px] font-normal leading-[14px] tracking-[0.1px] text-white">
          Area:
        </span>
        <span aria-hidden className="mx-[5px] h-[38px] w-px shrink-0 bg-[#F1F1F5]" />
        <span
          className={cn(
            'inline-flex h-[28px] max-w-[220px] items-center rounded-full px-3 font-["Roboto",sans-serif] text-[12px] font-semibold leading-[18px] text-[#2E4B8F]',
            '[background:linear-gradient(180deg,#ECECEC_20.59%,#FFFFFF_85.35%)]',
          )}
        >
          <span className="truncate">{chipLabel(area)}</span>
        </span>
        <span aria-hidden className="ml-[6px] mr-[2px] h-[38px] w-px shrink-0 bg-[#F1F1F5]" />
        <ChevronDown className="ml-[4px] h-4 w-4 shrink-0 text-white/95" aria-hidden />
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Geography filter"
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
                  Geography
                </h3>
              </div>

              <div className="flex flex-col gap-3 p-3">
                <Field label="State">
                  <select
                    value={area.state ?? ''}
                    onChange={(e) => pickState(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">All NCR states</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>

                {supportsCity ? (
                  <Field label={cityLabel}>
                    <select
                      value={area.city ?? ''}
                      onChange={(e) => pickCity(e.target.value)}
                      disabled={!area.state}
                      className={selectClass}
                    >
                      <option value="">
                        {area.state
                          ? `All ${cityLabel.toLowerCase()}s in ${area.state}`
                          : 'Choose a state first'}
                      </option>
                      {cityOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {supportsRto ? (
                  <Field label={rtoLabel}>
                    <select
                      value={area.rto ?? ''}
                      onChange={(e) => pickRto(e.target.value)}
                      disabled={!area.city}
                      className={selectClass}
                    >
                      <option value="">
                        {area.city
                          ? `All ${rtoLabel.toLowerCase()}s in ${area.city}`
                          : `Choose a ${cityLabel.toLowerCase()} first`}
                      </option>
                      {rtoOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={!area.state && !area.city && !area.rto}
                    className="text-[11px] font-semibold text-[var(--color-blue-link)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)] disabled:no-underline"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

const selectClass =
  'mt-1 h-9 w-full rounded-md border border-[var(--color-border)] bg-white px-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-blue-link)] focus:outline-none focus:ring-1 focus:ring-[var(--color-blue-link)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-light)] disabled:text-[var(--color-text-muted)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
      {label}
      {children}
    </label>
  );
}
