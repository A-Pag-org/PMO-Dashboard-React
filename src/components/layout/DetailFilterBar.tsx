// FILE: src/components/layout/DetailFilterBar.tsx
// PURPOSE: Detail-page filter strip — the navy band that sits directly
//          below TopBar. Carries every page-scoping filter on a single
//          line:
//            Initiative · State · {District|City} · {RTO|Industrial Area}
//            · <extras> · Period · Full data tables
//
//          State / mid-level / deepest-level use standard dropdown
//          pills (FilterPill renders a native <select> under the hood
//          so the menu opens the same way as any browser dropdown).
//          The mid- and deepest-level labels switch per initiative —
//          Naya Safar uses "District" + "RTO", CEMS uses
//          "District" + "Industrial Area", others default to "City".

import { Link } from 'react-router-dom';
import {
  INITIATIVES,
  STATES,
  UPLOAD_CITY_OPTIONS_BY_STATE,
  RTO_OPTIONS_BY_CITY,
} from '@/lib/constants';
import { INITIATIVE_CONFIGS } from '@/lib/initiatives';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import FilterPill from '@/components/ui/FilterPill';
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

  const cityLabel = config?.cityLabel ?? 'City';
  const rtoLabel = config?.rtoLabel ?? 'RTO';

  const cityOptions = area.state
    ? UPLOAD_CITY_OPTIONS_BY_STATE[area.state] ?? []
    : [];
  const rtoOptions = area.city ? RTO_OPTIONS_BY_CITY[area.city] ?? [] : [];

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
        <FilterPill
          label="State"
          compact={!area.state}
          value={area.state ?? ''}
          placeholder="All NCR states"
          options={STATES}
          onChange={(v) => onAreaChange(v ? { state: v } : {})}
        />
      ) : null}

      {supportsCity ? (
        <FilterPill
          label={cityLabel}
          compact={!area.city}
          value={area.city ?? ''}
          placeholder={
            area.state
              ? `All ${cityLabel.toLowerCase()}s in ${area.state}`
              : 'Choose a state first'
          }
          options={cityOptions}
          disabled={!area.state}
          onChange={(v) =>
            onAreaChange({ state: area.state, city: v || undefined })
          }
        />
      ) : null}

      {supportsRto ? (
        <FilterPill
          label={rtoLabel}
          compact={!area.rto}
          value={area.rto ?? ''}
          placeholder={
            area.city
              ? `All ${rtoLabel.toLowerCase()}s in ${area.city}`
              : `Choose a ${cityLabel.toLowerCase()} first`
          }
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
