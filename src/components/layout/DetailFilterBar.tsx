// FILE: src/components/layout/DetailFilterBar.tsx
// PURPOSE: Detail-page filter strip — the navy band that sits directly
//          below TopBar. Carries the static status chip on the left and
//          a row of glassy pill dropdowns (Initiative, geography,
//          extras, time range, View) on the right. Visual recipe is the
//          Figma "navy filter bar".
//
// All scoping state stays in the parent page; the bar only wires the
// pills to it.

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
import FilterPill from '@/components/ui/FilterPill';
import TimeRangePill from '@/components/ui/TimeRangePill';
import type { TimePreset, CustomRange } from '@/components/ui/TimeRangePill';
import ViewLevelPill from '@/components/ui/ViewLevelPill';
import HeaderStatusChip from '@/components/ui/HeaderStatusChip';

export type ViewLabel = 'State' | 'City' | 'RTO';
export type TimeRange = TimePreset;
export type { CustomRange };

const ALL_STATES_LABEL = 'All Delhi NCR';
const ALL_CITIES_PLACEHOLDER = (state?: string) =>
  state ? `All of ${state}` : 'Pick a state first';
const ALL_RTOS_PLACEHOLDER = (city?: string) =>
  city ? `All RTOs in ${city}` : 'Pick a city first';

interface DetailFilterBarProps {
  area: AreaFilterValue;
  initiativeName: string;
  extras: Record<string, string>;
  onAreaChange: (area: AreaFilterValue) => void;
  onInitiativeChange: (name: string) => void;
  onExtraChange: (key: string, value: string) => void;

  timeRange: TimeRange;
  onTimeRangeChange: (r: TimeRange) => void;
  customRange?: CustomRange;
  onCustomRangeChange?: (r: CustomRange) => void;

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
  onTimeRangeChange,
  customRange,
  onCustomRangeChange,
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
  const supportsState = config?.geographyLevels.includes('state') ?? true;
  const supportsCity = config?.geographyLevels.includes('city') ?? true;
  const supportsRto = config?.geographyLevels.includes('rto') ?? false;

  return (
    <div
      role="region"
      aria-label="Filters"
      className="flex shrink-0 flex-wrap items-center gap-x-[8px] gap-y-[10px] bg-[#2E4B8F] px-[30px] py-[10px]"
    >
      <HeaderStatusChip />

      <div className="ml-auto flex flex-wrap items-center gap-[8px]">
        <FilterPill
          label="Initiative"
          value={initiativeName}
          options={INITIATIVES.map((i) => i.name)}
          onChange={onInitiativeChange}
        />

        {supportsState ? (
          <FilterPill
            label="State"
            value={area.state ?? ''}
            placeholder={ALL_STATES_LABEL}
            options={STATES}
            onChange={(v) => onAreaChange(v ? { state: v } : {})}
          />
        ) : null}

        {supportsCity ? (
          <FilterPill
            label="City"
            value={area.city ?? ''}
            placeholder={ALL_CITIES_PLACEHOLDER(area.state)}
            options={cityOptions}
            disabled={!area.state}
            onChange={(v) =>
              onAreaChange({ state: area.state, city: v || undefined })
            }
          />
        ) : null}

        {extraFilters.map((f) => (
          <FilterPill
            key={f.key}
            label={f.label}
            value={extras[f.key] ?? ''}
            placeholder={`All ${f.label.toLowerCase()}`}
            options={f.options}
            onChange={(v) => onExtraChange(f.key, v)}
          />
        ))}

        {supportsRto ? (
          <FilterPill
            label="RTO"
            value={area.rto ?? ''}
            placeholder={ALL_RTOS_PLACEHOLDER(area.city)}
            options={rtoOptions}
            disabled={!area.city}
            onChange={(v) =>
              onAreaChange({
                state: area.state,
                city: area.city,
                rto: v || undefined,
              })
            }
          />
        ) : null}

        <TimeRangePill
          value={timeRange}
          onChange={onTimeRangeChange}
          customRange={customRange}
          onCustomRangeChange={onCustomRangeChange}
        />

        {availableViewLevels.length > 0 ? (
          <ViewLevelPill
            options={availableViewLevels}
            value={viewLabel}
            onChange={(v) => onViewLevelChange(v.toLowerCase() as ViewLevel)}
          />
        ) : null}

        <Link
          to={seeAllHref}
          className="inline-flex h-9 items-center rounded-[4px] bg-white/[0.92] px-3 font-['Roboto',sans-serif] text-[12px] font-semibold text-[#2E4B8F] shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          See all data →
        </Link>
      </div>
    </div>
  );
}
