// FILE: src/components/layout/DetailFilterBar.tsx
// PURPOSE: Horizontal filter strip for the Detailed Report page. Replaces
//          the old vertical left rail + breadcrumb bar — every scoping
//          control (Initiative, State, City, RTO, initiative-specific
//          extras, Time period, View) lives inline in the page's 2nd
//          bar, with the "See all data" CTA pushed to the right.
//
// Selected state is loud on purpose: blue chip, blue label, blue dot.
// One glance tells the user which filters they've narrowed.

import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  INITIATIVES,
  STATES,
  UPLOAD_CITY_OPTIONS_BY_STATE,
  RTO_OPTIONS_BY_CITY,
} from '@/lib/constants';
import { INITIATIVE_CONFIGS } from '@/lib/initiatives';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import type { ViewLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

export type ViewLabel = 'State' | 'City' | 'RTO';
export type TimeRange = '1M' | '3M' | '6M' | '12M' | 'All';

interface DetailFilterBarProps {
  area: AreaFilterValue;
  initiativeName: string;
  extras: Record<string, string>;
  onAreaChange: (area: AreaFilterValue) => void;
  onInitiativeChange: (name: string) => void;
  onExtraChange: (key: string, value: string) => void;

  timeRange: TimeRange;
  timeRanges: readonly TimeRange[];
  onTimeRangeChange: (r: TimeRange) => void;

  availableViewLevels: readonly ViewLabel[];
  viewLabel: ViewLabel;
  onViewLevelChange: (v: ViewLevel) => void;

  seeAllHref: string;
}

export default function DetailFilterBar({
  area,
  initiativeName,
  extras,
  onAreaChange,
  onInitiativeChange,
  onExtraChange,
  timeRange,
  timeRanges,
  onTimeRangeChange,
  availableViewLevels,
  viewLabel,
  onViewLevelChange,
  seeAllHref,
}: DetailFilterBarProps) {
  const cityOptions = area.state
    ? UPLOAD_CITY_OPTIONS_BY_STATE[area.state] ?? []
    : [];
  const rtoOptions = area.city ? RTO_OPTIONS_BY_CITY[area.city] ?? [] : [];

  const slug = INITIATIVES.find((i) => i.name === initiativeName)?.slug ?? '';
  const config = INITIATIVE_CONFIGS[slug];
  const extraFilters = config?.extraFilters ?? [];
  // Geography support — when no config is found, default to state + city
  // (matches the spec for most initiatives) so the bar never collapses
  // to just "Initiative".
  const supportsState = config?.geographyLevels.includes('state') ?? true;
  const supportsCity = config?.geographyLevels.includes('city') ?? true;
  const supportsRto = config?.geographyLevels.includes('rto') ?? false;
  const hasGeographyFilters = supportsState || supportsCity || supportsRto;

  const initiativeIsSelected = initiativeName !== INITIATIVES[0]?.name;

  return (
    <div
      role="region"
      aria-label="Filters"
      className="flex shrink-0 flex-wrap items-end gap-x-3 gap-y-2 border-b border-[var(--color-border)] bg-white px-5 py-2.5"
    >
      <BarField
        label="Initiative"
        value={initiativeName}
        onChange={onInitiativeChange}
        options={INITIATIVES.map((i) => ({ value: i.name, label: i.name }))}
        isSelected={initiativeIsSelected}
        width="11rem"
      />

      {hasGeographyFilters ? <Divider /> : null}

      {supportsState ? (
        <BarField
          label="State"
          value={area.state ?? ''}
          onChange={(v) => onAreaChange(v ? { state: v } : {})}
          options={STATES.map((s) => ({ value: s, label: s }))}
          placeholder="All — Delhi NCR"
          isSelected={!!area.state}
        />
      ) : null}

      {supportsCity ? (
        <BarField
          label="City"
          value={area.city ?? ''}
          onChange={(v) =>
            onAreaChange({ state: area.state, city: v || undefined })
          }
          options={cityOptions.map((c) => ({ value: c, label: c }))}
          placeholder={area.state ? `All of ${area.state}` : 'Pick a state first'}
          disabled={!area.state}
          isSelected={!!area.city}
        />
      ) : null}

      {supportsRto ? (
        <BarField
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
            !area.city ? 'Pick a city first' : `All RTOs in ${area.city}`
          }
          disabled={!area.city}
          isSelected={!!area.rto}
        />
      ) : null}

      {extraFilters.length > 0 ? (
        <>
          <Divider />
          {extraFilters.map((f) => (
            <BarField
              key={f.key}
              label={f.label}
              value={extras[f.key] ?? ''}
              onChange={(v) => onExtraChange(f.key, v)}
              options={f.options.map((o) => ({ value: o, label: o }))}
              placeholder={`All ${f.label.toLowerCase()}`}
              isSelected={!!extras[f.key]}
            />
          ))}
        </>
      ) : null}

      <Divider />

      <BarField
        label="Time period"
        value={timeRange}
        onChange={(v) => onTimeRangeChange(v as TimeRange)}
        options={timeRanges.map((r) => ({
          value: r,
          label: r === 'All' ? 'All time' : `Last ${r}`,
        }))}
        isSelected={timeRange !== '6M'}
      />

      {availableViewLevels.length > 0 ? (
        <SegmentedView
          label="View"
          options={availableViewLevels}
          value={viewLabel}
          onChange={(v) => onViewLevelChange(v.toLowerCase() as ViewLevel)}
        />
      ) : null}

      <div className="ml-auto self-end pb-0.5">
        <Link
          to={seeAllHref}
          className="inline-flex items-center rounded-md bg-[var(--color-blue-link)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--color-blue-header)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2"
        >
          See all data →
        </Link>
      </div>
    </div>
  );
}

interface BarFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  isSelected?: boolean;
  /** Optional fixed width — Initiative needs more space than the others. */
  width?: string;
}

function BarField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  isSelected,
  width,
}: BarFieldProps) {
  const active = !!isSelected && !disabled;
  return (
    <label className="flex min-w-[7rem] flex-col gap-1" style={width ? { width } : undefined}>
      <span
        className={cn(
          'flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em]',
          active
            ? 'text-[var(--color-blue-link)]'
            : 'text-[var(--color-text-muted)]',
        )}
      >
        {label}
        {active ? (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-blue-link)]"
            aria-label="filter active"
          />
        ) : null}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          className={cn(
            'h-8 w-full appearance-none rounded-md border px-2.5 pr-7 text-xs',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-link)]',
            'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-grey)] disabled:text-[var(--color-text-muted)]',
            active
              ? 'border-[var(--color-blue-link)] bg-[var(--color-blue-pale)] font-semibold text-[var(--color-blue-link)] ring-1 ring-[var(--color-blue-link)]'
              : 'border-[var(--color-border)] bg-white font-medium text-[var(--color-text-primary)]',
          )}
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
          className={cn(
            'pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2',
            active
              ? 'text-[var(--color-blue-link)]'
              : 'text-[var(--color-text-secondary)]',
          )}
          aria-hidden
        />
      </div>
    </label>
  );
}

function SegmentedView({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ViewLabel[];
  value: ViewLabel;
  onChange: (v: ViewLabel) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex h-8 rounded-md border border-[var(--color-border)] bg-white p-0.5"
      >
        {options.map((opt) => {
          const isActive = opt === value;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(opt)}
              className={cn(
                'min-w-[40px] rounded-[5px] px-2.5 text-[11px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)]',
                isActive
                  ? 'bg-[var(--color-blue-link)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="self-stretch border-l border-[var(--color-border)] my-1"
    />
  );
}
