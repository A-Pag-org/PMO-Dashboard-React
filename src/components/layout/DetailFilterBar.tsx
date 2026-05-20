// FILE: src/components/layout/DetailFilterBar.tsx
// PURPOSE: Detail-page filter strip — the navy band that sits directly
//          below TopBar. Single line:
//            Initiative · Area · <extras> · Full data tables
//
//          State / mid-level / deepest-level live behind a single
//          "Area" pill (AreaPicker) — clicking opens a card with three
//          stacked native-style dropdowns whose labels switch per
//          initiative (e.g. Naya Safar reads State · District · RTO,
//          Road Repair reads State · City).

import { Link } from 'react-router-dom';
import { INITIATIVES } from '@/lib/constants';
import { INITIATIVE_CONFIGS, groupInitiativesByMinistry } from '@/lib/initiatives';
import type { AreaFilterValue } from '@/lib/useDetailFilters';
import FilterPill from '@/components/ui/FilterPill';
import AreaPicker from '@/components/ui/AreaPicker';

export type ViewLabel = 'State' | 'City' | 'RTO';

interface DetailFilterBarProps {
  area: AreaFilterValue;
  initiativeName: string;
  extras: Record<string, string>;
  onAreaChange: (area: AreaFilterValue) => void;
  onInitiativeChange: (name: string) => void;
  onExtraChange: (key: string, value: string) => void;

  seeAllHref: string;
}

export default function DetailFilterBar({
  area,
  initiativeName,
  extras,
  onAreaChange,
  onInitiativeChange,
  onExtraChange,
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

  return (
    <div
      role="region"
      aria-label="Filters"
      className="flex shrink-0 flex-nowrap items-center gap-[8px] overflow-x-auto bg-[#2E4B8F] px-[24px] py-[10px]"
    >
      <FilterPill
        label="Initiative"
        value={initiativeName}
        groups={groupInitiativesByMinistry(INITIATIVES)}
        onChange={onInitiativeChange}
      />

      {supportsState ? (
        <AreaPicker
          area={area}
          onChange={onAreaChange}
          supportsCity={supportsCity}
          supportsRto={supportsRto}
          cityLabel={cityLabel}
          rtoLabel={rtoLabel}
        />
      ) : null}

      {extraFilters
        .filter(
          (f) => !f.requiresStateCity || (!!area.state && !!area.city),
        )
        .map((f) => {
          // Per-city options (when the user has picked a city and the
          // filter declares a map) take precedence over the flat list.
          // An empty effective list = nothing to offer, so hide it.
          const effective =
            f.optionsByCity && area.city
              ? f.optionsByCity[area.city] ?? []
              : f.options ?? [];
          if (effective.length === 0) return null;
          return (
            <FilterPill
              key={f.key}
              label={f.label}
              value={extras[f.key] ?? ''}
              placeholder={`All ${f.label.toLowerCase()}`}
              options={effective}
              onChange={(v) => onExtraChange(f.key, v)}
            />
          );
        })}

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
