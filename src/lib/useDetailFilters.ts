// FILE: src/lib/useDetailFilters.ts
// PURPOSE: Shared, URL-param-backed state for Detailed Report filters
//          (Area + Initiative). Consumed by both the DetailPage and the
//          SidePanel drawer so the controls can be rendered in either
//          place while staying in sync.
//
// Why URL params?
//   - Both the drawer and the page see the same source of truth without
//     any context provider or prop drilling.
//   - Selections survive page reload and are bookmarkable — a familiar
//     pattern in government dashboards (senior users like stable URLs).
//   - No flash-of-default-state when the drawer opens.
//
// Stability notes:
//   - `writeParams` depends only on `navigate` (stable ref from react-router)
//     and `location.pathname`. We deliberately exclude `location.search`
//     from the callback deps and instead read it fresh inside the callback
//     via a ref to avoid stale-closure issues while also preventing the
//     function from being recreated on every search-param change.

import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { INITIATIVES } from './constants';

export interface AreaFilterValue {
  /** undefined means "All - Delhi NCR" */
  state?: string;
  /** undefined when the whole state is selected */
  city?: string;
  /** undefined when the whole city is selected */
  rto?: string;
}

export interface DetailFilters {
  /** Area selection. */
  area: AreaFilterValue;
  /** Selected initiative (programme) name. Defaults to the first initiative. */
  initiativeName: string;
}

export interface UseDetailFiltersReturn extends DetailFilters {
  setArea: (area: AreaFilterValue) => void;
  setInitiativeName: (name: string) => void;
}

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
    }),
    [params],
  );

  const initiativeName = useMemo(() => {
    const fromUrl = params.get('initiative');
    if (fromUrl && INITIATIVES.some((i) => i.name === fromUrl)) return fromUrl;
    return INITIATIVES[0].name;
  }, [params]);

  // writeParams reads the *current* search string via a ref so it stays
  // stable across renders and doesn't trigger cascading re-renders.
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
        if (nextArea.state) p.set('state', nextArea.state);
        else p.delete('state');

        // Cascade: clearing state must also clear city and rto
        if (nextArea.city) p.set('city', nextArea.city);
        else p.delete('city');

        if (nextArea.rto) p.set('rto', nextArea.rto);
        else p.delete('rto');
      });
    },
    [writeParams],
  );

  const setInitiativeName = useCallback(
    (name: string) => {
      writeParams((p) => {
        if (name && name !== INITIATIVES[0].name) p.set('initiative', name);
        else p.delete('initiative');
      });
    },
    [writeParams],
  );

  return { area, initiativeName, setArea, setInitiativeName };
}
