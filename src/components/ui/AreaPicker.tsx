// FILE: src/components/ui/AreaPicker.tsx
// PURPOSE: Single combined State / City / RTO selector for the Detail
//          page filter bar. Replaces the three separate FilterPills so
//          the navy strip stays uncluttered.
//
//          Popover shows a portal-anchored indented hierarchical list:
//            All NCR
//              State
//                City
//                  RTO
//          Click any row to set that level; the chain above it is set
//          automatically. The pill chip shows the deepest selected
//          level only ("Gurugram RTO" / "Delhi" / "All NCR") for
//          maximum scannability.
//
//          Initiative-aware: if the initiative doesn't support City
//          (CEMS, Stubble Burning, ICCC) or RTO (everything except
//          Naya Safar), the corresponding rows are hidden.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
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
  className?: string;
}

const POPOVER_WIDTH = 280;
const POPOVER_GAP = 6;
const POPOVER_MAX_HEIGHT = 420;

function labelFor(area: AreaFilterValue): string {
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

  function selectAll() {
    onChange({});
    setOpen(false);
  }
  function selectState(state: string) {
    onChange({ state });
    setOpen(false);
  }
  function selectCity(state: string, city: string) {
    onChange({ state, city });
    setOpen(false);
  }
  function selectRto(state: string, city: string, rto: string) {
    onChange({ state, city, rto });
    setOpen(false);
  }

  const chipText = labelFor(area);
  const allSelected = !area.state && !area.city && !area.rto;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select area"
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
          <span className="truncate">{chipText}</span>
        </span>
        <span aria-hidden className="ml-[6px] mr-[2px] h-[38px] w-px shrink-0 bg-[#F1F1F5]" />
        <ChevronDown className="ml-[4px] h-4 w-4 shrink-0 text-white/95" aria-hidden />
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="listbox"
              aria-label="Choose an area"
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: POPOVER_WIDTH,
                maxHeight: POPOVER_MAX_HEIGHT,
                zIndex: 1000,
              }}
              className="flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-xl"
            >
              <div className="border-b border-[var(--color-border-table)] px-3 py-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Geography
                </h3>
                <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  Pick any level — clicking a city or RTO sets the chain above it too.
                </p>
              </div>

              <ul className="flex-1 overflow-y-auto py-1">
                <Row
                  level={0}
                  label="All NCR"
                  emphasis
                  selected={allSelected}
                  onClick={selectAll}
                />

                {STATES.map((state) => {
                  const cities = supportsCity
                    ? UPLOAD_CITY_OPTIONS_BY_STATE[state] ?? []
                    : [];
                  const stateSelected =
                    area.state === state && !area.city && !area.rto;
                  return (
                    <li key={state}>
                      <Row
                        level={1}
                        label={state}
                        bold
                        selected={stateSelected}
                        onClick={() => selectState(state)}
                      />
                      {cities.map((city) => {
                        const rtos = supportsRto
                          ? RTO_OPTIONS_BY_CITY[city] ?? []
                          : [];
                        const citySelected =
                          area.city === city && !area.rto;
                        return (
                          <ul key={city}>
                            <Row
                              level={2}
                              label={city}
                              selected={citySelected}
                              onClick={() => selectCity(state, city)}
                            />
                            {rtos.map((rto) => (
                              <Row
                                key={rto}
                                level={3}
                                label={rto}
                                muted
                                selected={area.rto === rto}
                                onClick={() => selectRto(state, city, rto)}
                              />
                            ))}
                          </ul>
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Row({
  level,
  label,
  selected,
  onClick,
  emphasis = false,
  bold = false,
  muted = false,
}: {
  level: 0 | 1 | 2 | 3;
  label: string;
  selected: boolean;
  onClick: () => void;
  emphasis?: boolean;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        role="option"
        aria-selected={selected}
        className={cn(
          'flex w-full items-center gap-2 py-1.5 pr-3 text-left text-xs hover:bg-[var(--color-blue-pale)] focus-visible:outline-none focus-visible:bg-[var(--color-blue-pale)]',
          selected && 'bg-[var(--color-blue-pale)]',
        )}
        style={{ paddingLeft: 12 + level * 14 }}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm',
            selected
              ? 'bg-[var(--color-blue-link)] text-white'
              : 'border border-transparent',
          )}
        >
          {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
        </span>
        <span
          className={cn(
            'truncate',
            emphasis
              ? 'font-bold text-[var(--color-text-primary)]'
              : bold
              ? 'font-bold text-[var(--color-text-primary)]'
              : muted
              ? 'text-[var(--color-text-secondary)]'
              : 'font-semibold text-[var(--color-text-primary)]',
          )}
        >
          {label}
        </span>
      </button>
    </li>
  );
}
