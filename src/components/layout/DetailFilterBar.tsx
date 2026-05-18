// FILE: src/components/layout/DetailFilterBar.tsx
// PURPOSE: Detail-page filter strip — the navy band that sits directly
//          below TopBar. Carries every page-scoping filter on a single
//          uncluttered line:
//            Initiative · Area (state / city / RTO in one picker)
//            · <extras> · Period · Full data tables
//
//          State / City / RTO are collapsed into a single AreaPicker
//          dropdown so the bar stays scannable; the picker's
//          hierarchical popover handles the drill-chain logic.

import { Link } from 'react-router-dom';
import { INITIATIVES } from '@/lib/constants';
import { INITIATIVE_CONFIGS } from '@/lib/initiatives';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import FilterPill from '@/components/ui/FilterPill';
import AreaPicker from '@/components/ui/AreaPicker';
import TimePeriodPill from '@/components/ui/TimePeriodPill';
import type { TimePeriod } from '@/components/ui/TimePeriodPill';

export type ViewLabel = 'State' | 'City' | 'RTO';
export type { TimePeriod };

interface DetailFilterBarProps {
  area: AreaFilterValue;
  initiativeName: string;
  extras: Record<string, string>;
  onAreaChange: (area: AreaFilterValue) => void;
  onInitiativeChange: (name: string) => void;
  onExtraChange: (key: string, value: string) => void;

  period?: TimePeriod;
  onPeriodChange?: (p: TimePeriod) => void;

  seeAllHref: string;
}

export default function DetailFilterBar({
  area,
  initiativeName,
  extras,
  onAreaChange,
  onInitiativeChange,
  onExtraChange,
  period,
  onPeriodChange,
  seeAllHref,
}: DetailFilterBarProps) {
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
      className="flex shrink-0 flex-nowrap items-center gap-[8px] overflow-x-auto bg-[#2E4B8F] px-[24px] py-[10px]"
    >
      <FilterPill
        label="Initiative"
        value={initiativeName}
        options={INITIATIVES.map((i) => i.name)}
        onChange={onInitiativeChange}
      />

      {supportsState ? (
        <AreaPicker
          area={area}
          onChange={onAreaChange}
          supportsCity={supportsCity}
          supportsRto={supportsRto}
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

      <TimePeriodPill period={period} onChange={onPeriodChange} />

      <Link
        to={seeAllHref}
        title="Open the full data tables for this initiative."
        className="ml-auto inline-flex h-9 shrink-0 items-center rounded-[4px] bg-white/[0.92] px-3 font-['Roboto',sans-serif] text-[12px] font-semibold text-[#2E4B8F] shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        Full data tables →
      </Link>
    </div>
  );
}
