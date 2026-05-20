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
import { INITIATIVES, RTO_OPTIONS_BY_CITY } from '@/lib/constants';
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
      className="flex shrink-0 flex-nowrap items-center gap-[8px] overflow-x-auto px-[24px] py-[10px] shadow-[inset_0_-1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(31,58,117,0.18)] [background:linear-gradient(180deg,#3D5DA9_0%,#2E4B8F_55%,#1F3A75_100%)]"
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
          cityLabel={cityLabel}
        />
      ) : null}

      {/* RTO (or Industrial Area) lives as its own pill on the bar —
          gated behind state + city, matching the Agency pattern on
          road-repair / MRS. Hidden when the city has no listed RTOs. */}
      {supportsRto && area.state && area.city
        ? (() => {
            const rtoOptions = RTO_OPTIONS_BY_CITY[area.city] ?? [];
            if (rtoOptions.length === 0) return null;
            return (
              <FilterPill
                label={rtoLabel}
                value={area.rto ?? ''}
                placeholder={`All ${rtoLabel.toLowerCase()}s`}
                options={rtoOptions}
                onChange={(v) =>
                  onAreaChange({ ...area, rto: v || undefined })
                }
              />
            );
          })()
        : null}

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
        className="ml-auto inline-flex h-9 shrink-0 items-center rounded-[6px] bg-white px-3 font-['Roboto',sans-serif] text-[12px] font-semibold text-[#2E4B8F] shadow-[0_1px_3px_rgba(15,28,67,0.25)] transition-colors hover:bg-[#F7F9FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      >
        Full data tables →
      </Link>
    </div>
  );
}
