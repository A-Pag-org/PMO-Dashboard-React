// FILE: src/components/layout/DetailFilterStrip.tsx
// PURPOSE: Horizontal filter row pinned to the top of the Detailed Report
//          page (spec §4.1: "An initiative filter at the top allows
//          switching initiatives.").
//
// Replaces the side-drawer Detail-Filters panel as the primary filter
// surface. Kept compact (single row on wide screens, wraps on narrow)
// so it doesn't push the map below the fold.
//
// Cascade rules — match useDetailFilters:
//   - Picking a State clears any city/RTO that no longer belongs.
//   - Picking a City clears RTO if it no longer belongs.
//   - Picking an Initiative does NOT touch the area filter.

import { ChevronDown } from 'lucide-react';
import {
  INITIATIVES,
  RTO_OPTIONS_BY_CITY,
  STATES,
  UPLOAD_CITY_OPTIONS_BY_STATE,
} from '@/lib/constants';
import type { AreaFilterValue } from '@/lib/useDetailFilters';

interface DetailFilterStripProps {
  area: AreaFilterValue;
  initiativeName: string;
  onAreaChange: (area: AreaFilterValue) => void;
  onInitiativeChange: (name: string) => void;
}

export default function DetailFilterStrip({
  area,
  initiativeName,
  onAreaChange,
  onInitiativeChange,
}: DetailFilterStripProps) {
  const cityOptions = area.state
    ? UPLOAD_CITY_OPTIONS_BY_STATE[area.state] ?? []
    : [];
  const rtoOptions = area.city ? RTO_OPTIONS_BY_CITY[area.city] ?? [] : [];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--color-border)] bg-white px-5 py-2">
      <FilterField
        label="Initiative"
        value={initiativeName}
        onChange={onInitiativeChange}
        options={INITIATIVES.map((i) => ({ value: i.name, label: i.name }))}
        wide
      />

      <span className="hidden h-4 w-px bg-[var(--color-border)] sm:block" aria-hidden />

      <FilterField
        label="State"
        value={area.state ?? ''}
        onChange={(v) => onAreaChange(v ? { state: v } : {})}
        options={STATES.map((s) => ({ value: s, label: s }))}
        placeholder="All — Delhi NCR"
      />
      <FilterField
        label="City"
        value={area.city ?? ''}
        onChange={(v) =>
          onAreaChange({
            state: area.state,
            city: v || undefined,
          })
        }
        options={cityOptions.map((c) => ({ value: c, label: c }))}
        placeholder={area.state ? `All of ${area.state}` : 'Pick a state first'}
        disabled={!area.state}
      />
      <FilterField
        label="RTO"
        value={area.rto ?? ''}
        onChange={(v) =>
          onAreaChange({
            state: area.state,
            city: area.city,
            rto: v || undefined,
          })
        }
        options={rtoOptions.map((r) => ({ value: r, label: r }))}
        placeholder={area.city ? `All of ${area.city}` : 'Pick a city first'}
        disabled={!area.city}
      />
    </div>
  );
}

interface FilterFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  wide?: boolean;
}

function FilterField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  wide,
}: FilterFieldProps) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          className={
            'appearance-none rounded border border-[var(--color-border)] bg-white px-2.5 py-1 pr-7 text-xs font-medium text-[var(--color-text-primary)] ' +
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-link)] ' +
            'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-light)] disabled:text-[var(--color-text-muted)] ' +
            (wide ? 'min-w-[180px]' : 'min-w-[140px]')
          }
        >
          {placeholder !== undefined ? (
            <option value="">{placeholder}</option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]"
          aria-hidden
        />
      </div>
    </label>
  );
}
