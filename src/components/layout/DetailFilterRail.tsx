// FILE: src/components/layout/DetailFilterRail.tsx
// PURPOSE: Vertical filter rail for the Detailed Report page (left column
//          of the three-column layout). Holds Initiative, State, City and
//          RTO as a stacked, quietly-styled list — a Jony-Ive-style
//          minimal control surface that gets out of the map's way.

import { ChevronDown } from 'lucide-react';
import {
  INITIATIVES,
  STATES,
  UPLOAD_CITY_OPTIONS_BY_STATE,
  RTO_OPTIONS_BY_CITY,
} from '@/lib/constants';
import { INITIATIVE_CONFIGS } from '@/lib/initiatives';
import type { AreaFilterValue } from '@/lib/useDetailFilters';

interface DetailFilterRailProps {
  area: AreaFilterValue;
  initiativeName: string;
  extras: Record<string, string>;
  onAreaChange: (area: AreaFilterValue) => void;
  onInitiativeChange: (name: string) => void;
  onExtraChange: (key: string, value: string) => void;
}

export default function DetailFilterRail({
  area,
  initiativeName,
  extras,
  onAreaChange,
  onInitiativeChange,
  onExtraChange,
}: DetailFilterRailProps) {
  const cityOptions = area.state
    ? UPLOAD_CITY_OPTIONS_BY_STATE[area.state] ?? []
    : [];
  const rtoOptions = area.city ? RTO_OPTIONS_BY_CITY[area.city] ?? [] : [];

  const slug =
    INITIATIVES.find((i) => i.name === initiativeName)?.slug ?? '';
  const config = INITIATIVE_CONFIGS[slug];
  const extraFilters = config?.extraFilters ?? [];
  const supportsRto = config?.geographyLevels.includes('rto') ?? false;

  return (
    <aside
      aria-label="Filters"
      className="flex h-full w-full flex-col gap-3 border-r border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-4"
    >
      <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        Filters
      </h2>

      <RailField
        label="Initiative"
        value={initiativeName}
        onChange={onInitiativeChange}
        options={INITIATIVES.map((i) => ({ value: i.name, label: i.name }))}
      />

      <RailField
        label="State"
        value={area.state ?? ''}
        onChange={(v) => onAreaChange(v ? { state: v } : {})}
        options={STATES.map((s) => ({ value: s, label: s }))}
        placeholder="All — Delhi NCR"
      />

      <RailField
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

      <RailField
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
        placeholder={
          !supportsRto
            ? 'Not applicable'
            : !area.city
            ? 'Pick a city first'
            : `All RTOs in ${area.city}`
        }
        disabled={!supportsRto || !area.city}
      />

      {extraFilters.length > 0 ? (
        <>
          <div className="my-1 h-px bg-[var(--color-border)]" aria-hidden />
          {extraFilters.map((f) => (
            <RailField
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
    </aside>
  );
}

interface RailFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

function RailField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: RailFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          className={
            'w-full appearance-none rounded-md border border-[var(--color-border)] bg-white px-2.5 py-1.5 pr-7 text-xs font-medium text-[var(--color-text-primary)] ' +
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-link)] ' +
            'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-grey)] disabled:text-[var(--color-text-muted)]'
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
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]"
          aria-hidden
        />
      </div>
    </label>
  );
}
