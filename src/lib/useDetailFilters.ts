// FILE: src/lib/useDetailFilters.ts
// PURPOSE: URL-param-backed state for Detailed Report filters.
//          Holds the area selection (state/city/rto/toll/ulb), the
//          active initiative, and the initiative-specific "extras"
//          (e.g. Vehicle Type, Industry Type) defined by §8.
//
// Why URL params?
//   - Single source of truth, survives reload, deep-linkable.
//   - No context provider or prop drilling needed.

import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { INITIATIVES } from './constants';
import { INITIATIVE_CONFIGS } from './initiatives';

/** Area scope. RTO/Toll/ULB are only meaningful for certain initiatives
 *  (spec §7) — the AreaFilterValue carries them all so the URL can
 *  encode any combination, but pages should only show controls for
 *  levels their active initiative supports. */
export interface AreaFilterValue {
  /** undefined means "All - Delhi NCR" */
  state?: string;
  /** undefined when the whole state is selected */
  city?: string;
  /** Naya Safar only (spec §7). */
  rto?: string;
  /** Green Contribution only. */
  toll?: string;
  /** C&D-SCC only. */
  ulb?: string;
}

export interface DetailFilters {
  area: AreaFilterValue;
  initiativeName: string;
  /** Initiative-specific filter values (key → value), e.g. vehicleType=Truck. */
  extras: Record<string, string>;
}

export interface UseDetailFiltersReturn extends DetailFilters {
  setArea: (area: AreaFilterValue) => void;
  setInitiativeName: (name: string) => void;
  setExtra: (key: string, value: string) => void;
}

/** Reserved query-param keys not treated as initiative extras. */
const RESERVED_KEYS = new Set(['state', 'city', 'rto', 'toll', 'ulb', 'initiative']);

/**
 * Reads and writes the Detailed-Report filter state from the URL query
 * string. The query schema is:
 *   ?state=Delhi&city=Gurugram&rto=Gurugram+RTO&initiative=C%26D+-+ICCC
 */
export function useDetailFilters(): UseDetailFiltersReturn {
  const location = useLocation();
  const navigate = useNavigate();

  // Keep a ref to the latest search string so writeParams can always
  // build on the current params without creating a new callback on every
  // search change (which would cause infinite render loops in callers
  // that list writeParams as a dependency).
  const searchRef = useRef(location.search);
  searchRef.current = location.search;

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const area: AreaFilterValue = useMemo(
    () => ({
      state: params.get('state') ?? undefined,
      city: params.get('city') ?? undefined,
      rto: params.get('rto') ?? undefined,
      toll: params.get('toll') ?? undefined,
      ulb: params.get('ulb') ?? undefined,
    }),
    [params],
  );

  const initiativeName = useMemo(() => {
    const fromUrl = params.get('initiative');
    if (fromUrl && INITIATIVES.some((i) => i.name === fromUrl)) return fromUrl;
    return INITIATIVES[0].name;
  }, [params]);

  // Extras: every non-reserved param. The active initiative's
  // configured extra-filter keys are what's actually meaningful; we
  // keep the rest in the bag too so deep links don't lose data.
  const extras = useMemo(() => {
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      if (!RESERVED_KEYS.has(key)) out[key] = value;
    });
    return out;
  }, [params]);

  const writeParams = useCallback(
    (patch: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchRef.current);
      patch(next);
      const search = next.toString();
      navigate(
        { pathname: location.pathname, search: search ? `?${search}` : '' },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, location.pathname],
  );

  const setArea = useCallback(
    (nextArea: AreaFilterValue) => {
      writeParams((p) => {
        for (const key of ['state', 'city', 'rto', 'toll', 'ulb'] as const) {
          const v = nextArea[key];
          if (v) p.set(key, v);
          else p.delete(key);
        }
      });
    },
    [writeParams],
  );

  const setInitiativeName = useCallback(
    (name: string) => {
      writeParams((p) => {
        if (name && name !== INITIATIVES[0].name) p.set('initiative', name);
        else p.delete('initiative');

        // Wipe any extras that don't belong to the new initiative,
        // so URLs stay tidy when switching programmes.
        const validKeys = new Set(
          INITIATIVE_CONFIGS[
            INITIATIVES.find((i) => i.name === name)?.slug ?? ''
          ]?.extraFilters.map((f) => f.key) ?? [],
        );
        for (const key of Array.from(p.keys())) {
          if (RESERVED_KEYS.has(key)) continue;
          if (!validKeys.has(key)) p.delete(key);
        }
      });
    },
    [writeParams],
  );

  const setExtra = useCallback(
    (key: string, value: string) => {
      writeParams((p) => {
        if (value) p.set(key, value);
        else p.delete(key);
      });
    },
    [writeParams],
  );

  return { area, initiativeName, extras, setArea, setInitiativeName, setExtra };
}
