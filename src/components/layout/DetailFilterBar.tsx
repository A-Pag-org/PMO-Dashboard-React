// FILE: src/components/layout/DetailFilterBar.tsx
// PURPOSE: Detail-page filter strip — the navy band that sits directly
//          below TopBar. Carries Initiative, initiative-specific
//          extras, the Select-date pill, the View toggle, and the
//          "See all data" CTA, all on a single line. Geography
//          dropdowns (State / City / RTO) have moved out of the bar
//          and now live below the map's Trend widget — see DetailPage.

import { Link } from 'react-router-dom';
import { INITIATIVES } from '@/lib/constants';
import { INITIATIVE_CONFIGS } from '@/lib/initiatives';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import type { ViewLevel } from '@/lib/types';
import FilterPill from '@/components/ui/FilterPill';
import TimeRangePill from '@/components/ui/TimeRangePill';
import type { CustomRange } from '@/components/ui/TimeRangePill';
import ViewLevelPill from '@/components/ui/ViewLevelPill';

export type ViewLabel = 'State' | 'City' | 'RTO';
export type { CustomRange };

interface DetailFilterBarProps {
  area: AreaFilterValue;
  initiativeName: string;
  extras: Record<string, string>;
  onInitiativeChange: (name: string) => void;
  onExtraChange: (key: string, value: string) => void;

  customRange?: CustomRange;
  onCustomRangeChange?: (r: CustomRange) => void;

  availableViewLevels: readonly ViewLabel[];
  viewLabel: ViewLabel;
  onViewLevelChange: (v: ViewLevel) => void;

  seeAllHref: string;
}

export default function DetailFilterBar({
  initiativeName,
  extras,
  onInitiativeChange,
  onExtraChange,
  customRange,
  onCustomRangeChange,
  availableViewLevels,
  viewLabel,
  onViewLevelChange,
  seeAllHref,
}: DetailFilterBarProps) {
  const slug = INITIATIVES.find((i) => i.name === initiativeName)?.slug ?? '';
  const config = INITIATIVE_CONFIGS[slug];
  const extraFilters = config?.extraFilters ?? [];

  return (
    <div
      role="region"
      aria-label="Filters"
      className="flex shrink-0 flex-nowrap items-center gap-[8px] overflow-x-auto bg-[#2E4B8F] px-[24px] py-[10px]"
    >
      <FilterPill
        label="Initiative"
        value={initiativeName}
        options={INITIATIVES.map((i) => i.name)}
        onChange={onInitiativeChange}
      />

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

      <TimeRangePill
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
        className="ml-auto inline-flex h-9 shrink-0 items-center rounded-[4px] bg-white/[0.92] px-3 font-['Roboto',sans-serif] text-[12px] font-semibold text-[#2E4B8F] shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        See all data →
      </Link>
    </div>
  );
}
