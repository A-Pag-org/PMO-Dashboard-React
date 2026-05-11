// FILE: src/components/layout/DetailFilterRail.tsx
// PURPOSE: Vertical filter rail for the Detailed Report page (left column
//          of the three-column layout). Holds Initiative, State, City,
//          RTO, time range, view level (State/City/RTO) and any
//          initiative-specific extras as one stacked, quietly-styled list
//          — a Jony-Ive-style minimal control surface that gets out of
//          the map's way.

import { ChevronDown } from 'lucide-react';
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

interface DetailFilterRailProps {
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
}

export default function DetailFilterRail({
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

  // A non-default initiative is one not equal to the first entry; it
  // counts as a "user selection" for the highlight rule.
  const initiativeIsSelected = initiativeName !== INITIATIVES[0]?.name;

  return (
    <aside
      aria-label="Filters"
      className="flex h-full w-full flex-col gap-3 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-4"
    >
      <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        Filters
      </h2>

      <RailField
        label="Initiative"
        value={initiativeName}
        onChange={onInitiativeChange}
        options={INITIATIVES.map((i) => ({ value: i.name, label: i.name }))}
        isSelected={initiativeIsSelected}
      />

      <RailField
        label="State"
        value={area.state ?? ''}
        onChange={(v) => onAreaChange(v ? { state: v } : {})}
        options={STATES.map((s) => ({ value: s, label: s }))}
        placeholder="All — Delhi NCR"
        isSelected={!!area.state}
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
        isSelected={!!area.city}
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
        isSelected={!!area.rto}
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
              isSelected={!!extras[f.key]}
            />
          ))}
        </>
      ) : null}

      <div className="my-1 h-px bg-[var(--color-border)]" aria-hidden />

      <RailField
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
        <SegmentedControl
          label="View"
          options={availableViewLevels}
          value={viewLabel}
          onChange={(v) => onViewLevelChange(v.toLowerCase() as ViewLevel)}
        />
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
  /** When true, the field is shown in the "selected" state — accent ring
   *  and a small dot beside the label. Lets the user spot which filters
   *  they've narrowed without reading every value. */
  isSelected?: boolean;
}

function RailField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  isSelected,
}: RailFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
        {isSelected ? (
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
            'w-full appearance-none rounded-md border bg-white px-2.5 py-1.5 pr-7 text-xs font-medium text-[var(--color-text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-link)]',
            'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-grey)] disabled:text-[var(--color-text-muted)]',
            isSelected && !disabled
              ? 'border-[var(--color-blue-link)] bg-[var(--color-blue-pale)] font-semibold ring-1 ring-[var(--color-blue-link)]'
              : 'border-[var(--color-border)]',
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
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]"
          aria-hidden
        />
      </div>
    </label>
  );
}

function SegmentedControl({
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
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex w-full rounded-md border border-[var(--color-border)] bg-white p-0.5"
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
                'min-h-[26px] flex-1 rounded-[5px] px-2 py-1 text-[11px] font-semibold transition-colors',
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
