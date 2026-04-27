// FILE: src/components/layout/DetailFilterStrip.tsx
// PURPOSE: Horizontal filter strip for the Detailed Report page.
//
// Spec rules baked in:
//   §6 — Location filter is State → City only. RTO / Toll / ULB are
//        map drill-downs, not top-level filters, so they don't appear
//        here.
//   §8 — Initiative-specific filter dimensions (max 2 extras after
//        Location). Driven by INITIATIVE_CONFIGS[slug].extraFilters,
//        so adding a new initiative requires zero code change here.

import { ChevronDown } from 'lucide-react';
import {
  INITIATIVES,
  STATES,
  UPLOAD_CITY_OPTIONS_BY_STATE,
} from '@/lib/constants';
import { INITIATIVE_CONFIGS } from '@/lib/initiatives';
import type { AreaFilterValue } from '@/lib/useDetailFilters';

interface DetailFilterStripProps {
  area: AreaFilterValue;
  initiativeName: string;
  extras: Record<string, string>;
  onAreaChange: (area: AreaFilterValue) => void;
  onInitiativeChange: (name: string) => void;
  onExtraChange: (key: string, value: string) => void;
}

export default function DetailFilterStrip({
  area,
  initiativeName,
  extras,
  onAreaChange,
  onInitiativeChange,
  onExtraChange,
}: DetailFilterStripProps) {
  const cityOptions = area.state
    ? UPLOAD_CITY_OPTIONS_BY_STATE[area.state] ?? []
    : [];

  const slug =
    INITIATIVES.find((i) => i.name === initiativeName)?.slug ?? '';
  const extraFilters = INITIATIVE_CONFIGS[slug]?.extraFilters ?? [];

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
        onChange={(v) =>
          onAreaChange(v ? { state: v } : {})
        }
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

      {extraFilters.length > 0 ? (
        <>
          <span
            className="hidden h-4 w-px bg-[var(--color-border)] sm:block"
            aria-hidden
          />
          {extraFilters.map((f) => (
            <FilterField
              key={f.key}
              label={f.label}
              value={extras[f.key] ?? ''}
              onChange={(v) => onExtraChange(f.key, v)}
              options={f.options.map((o) => ({ value: o, label: o }))}
              placeholder={`All ${f.label.toLowerCase()}`}
            />
          ))}
        </>
      ) : null}
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
