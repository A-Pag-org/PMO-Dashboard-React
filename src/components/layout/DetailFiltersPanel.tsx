// FILE: src/components/layout/DetailFiltersPanel.tsx
// PURPOSE: Vertical filter panel rendered inside the SidePanel drawer when
//          the user is on the Detailed Report page. Hosts the Area filter
//          (State → City → RTO cascade), the Programme selector, and the
//          "See all data" link.
//
// Design notes:
//   - Uses native <select> controls so the filters read as a familiar
//     government-dashboard form and always fit inside the narrow drawer
//     (no hover flyouts or clipped menus).
//   - The cascade is enforced on-change: picking a State clears City/RTO
//     if they no longer belong; picking a City clears RTO similarly.

import { ChevronRight, Database, MapPin, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  INITIATIVES,
  RTO_OPTIONS_BY_CITY,
  STATES,
  UPLOAD_CITY_OPTIONS_BY_STATE,
} from '@/lib/constants';
import type { AreaFilterValue } from '@/lib/useDetailFilters';

interface DetailFiltersPanelProps {
  area: AreaFilterValue;
  initiativeName: string;
  onAreaChange: (area: AreaFilterValue) => void;
  onInitiativeChange: (name: string) => void;
  onNavigate?: () => void;
}

export default function DetailFiltersPanel({
  area,
  initiativeName,
  onAreaChange,
  onInitiativeChange,
  onNavigate,
}: DetailFiltersPanelProps) {
  const cityOptions = area.state
    ? UPLOAD_CITY_OPTIONS_BY_STATE[area.state] ?? []
    : [];
  const rtoOptions = area.city ? RTO_OPTIONS_BY_CITY[area.city] ?? [] : [];

  return (
    <div className="space-y-3 border-t border-white/10 bg-white/[0.04] px-5 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
        <Layers className="h-3.5 w-3.5" aria-hidden />
        <span>Filters</span>
      </div>

      {/* Area filter — State */}
      <FieldLabel icon={<MapPin className="h-3.5 w-3.5" aria-hidden />} label="State">
        <Select
          value={area.state ?? ''}
          onChange={(value) =>
            onAreaChange(value ? { state: value } : {})
          }
          placeholder="All — Delhi NCR"
          options={STATES.map((s) => ({ value: s, label: s }))}
        />
      </FieldLabel>

      {/* Area filter — City */}
      <FieldLabel label="City" subdued>
        <Select
          value={area.city ?? ''}
          disabled={!area.state}
          onChange={(value) =>
            onAreaChange({
              state: area.state,
              city: value || undefined,
            })
          }
          placeholder={area.state ? `All of ${area.state}` : 'Pick a state first'}
          options={cityOptions.map((c) => ({ value: c, label: c }))}
        />
      </FieldLabel>

      {/* Area filter — RTO */}
      <FieldLabel label="RTO" subdued>
        <Select
          value={area.rto ?? ''}
          disabled={!area.city}
          onChange={(value) =>
            onAreaChange({
              state: area.state,
              city: area.city,
              rto: value || undefined,
            })
          }
          placeholder={area.city ? `All of ${area.city}` : 'Pick a city first'}
          options={rtoOptions.map((r) => ({ value: r, label: r }))}
        />
      </FieldLabel>

      {/* Programme / Initiative */}
      <FieldLabel
        icon={<Layers className="h-3.5 w-3.5" aria-hidden />}
        label="Programme"
      >
        <Select
          value={initiativeName}
          onChange={(value) => onInitiativeChange(value)}
          options={INITIATIVES.map((i) => ({ value: i.name, label: i.name }))}
        />
      </FieldLabel>

      {/* See all data */}
      <Link
        to="/dashboard/all-data"
        onClick={onNavigate}
        className={cn(
          'group mt-1 flex items-center justify-between gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors',
          'hover:bg-white/20',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset',
        )}
      >
        <span className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
          See all data
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-white/70 group-hover:text-white" aria-hidden />
      </Link>
    </div>
  );
}

function FieldLabel({
  icon,
  label,
  subdued,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  subdued?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className={cn(
          'mb-1 flex items-center gap-1.5 text-[11px] font-medium',
          subdued ? 'text-white/55' : 'text-white/80',
        )}
      >
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

function Select({ value, onChange, options, placeholder, disabled }: SelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none rounded-md border border-white/15 bg-[var(--color-navy-mid)] px-3 py-2 pr-8 text-xs text-white',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronRight
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-white/60"
        aria-hidden
      />
    </div>
  );
}
