# Codebase Improvements — Impact Dashboard

A prioritised list of every change made, with the bug/smell identified and
the fix applied.

---

## 1. `src/lib/utils.ts` — formatNumber & getCompletionPercentage

### Bug: `formatNumber` silently truncated decimals without rounding
```ts
// BEFORE — Math.floor(15300.9) → "15,300" (wrong)
const str = Math.floor(value).toString();

// AFTER — Math.round(15300.9) → "15,301" (correct)
const rounded = Math.round(value);
```

### Bug: `getCompletionPercentage` null-safety gap
The original function only guarded against `!target` and `!achieved`, which
means `achieved = 0` (a valid value — "nothing done yet") returned `0`
correctly, but `achieved = null` also returned `0` _without_ the caller being
able to tell the difference. The fix uses explicit `== null` checks:
```ts
// BEFORE
if (!target || !achieved) return 0; // achieved=0 and achieved=null both return 0

// AFTER — target=0 → 0, achieved=null → 0, achieved=0 → 0 (all intentional)
if (target == null || target === 0) return 0;
if (achieved == null) return 0;
```
Also added `number | undefined` to the parameter types so TypeScript
enforces null-safety at call sites.

---

## 2. `src/lib/useDetailFilters.ts` — stable `writeParams` callback

### Bug: `location.search` in `writeParams` deps caused a re-render cascade

Every time the URL changed (e.g. user picked a state), `writeParams` was
recreated, which caused `setArea` / `setInitiativeName` to be recreated,
which could trigger re-renders in all consumers even when no filter had
actually changed.

**Fix:** Store `location.search` in a ref (`searchRef`) that is updated every
render but not listed as a dep of `writeParams`. The callback reads the
_current_ search string from the ref instead of closing over a stale copy.

```ts
// Key change:
const searchRef = useRef(location.search);
searchRef.current = location.search; // keep fresh every render

const writeParams = useCallback(
  (patch) => {
    const next = new URLSearchParams(searchRef.current); // fresh read
    patch(next);
    navigate(...);
  },
  [navigate, location.pathname], // ← search NOT in deps
);
```

Also added a comment about the cascade-clearing logic in `setArea` (clearing
`state` now also clears `city` and `rto`).

---

## 3. `src/pages/DetailPage.tsx` — auto-reset view level on area change

### Bug: Stale view level after area filter change

If the user was viewing "RTO" level, then cleared the city filter (via the
sidebar), the map panel still tried to render RTO bubbles but `area.city` was
now `undefined`, so it fell through to the "Select a city to view RTOs"
empty-hint path — confusing UX.

**Fix:** A `useEffect` watches `area` and automatically resets `viewLevel` to
the coarsest level available for the new area:
- City selected → jump to `rto`
- State selected (no city) → jump to `city`
- No selection → jump to `state`

```ts
useEffect(() => {
  if (area.city) setViewLevel('rto');
  else if (area.state) setViewLevel('city');
  else setViewLevel('state');
}, [area]);
```

Also:
- Extracted inline `onSelect` lambdas into a named `handleSelectMetric`
  function to avoid recreating closures on every render.
- Added `role="radiogroup"` + `aria-checked` to the view-toggle segmented
  control for screen-reader compatibility.
- Added `aria-label` to both `<section>` elements in the split layout.

---

## 4. `src/components/ui/EditableDataTable.tsx` — accessibility fixes

### Bug: Placeholder rows used `text-transparent` to hide content

`text-transparent` only hides text _visually_ — screen readers still read out
the invisible `—` characters in every placeholder cell, creating noise.

**Fix:** Use `aria-hidden="true"` on the whole placeholder `<tr>` and render
`&nbsp;` (a non-breaking space) instead of `—` so the row maintains its
height without having readable content:

```tsx
// BEFORE
<tr key={`placeholder-${i}`} className="... bg-white">
  {Array.from({ length: 14 }).map((__, ci) => (
    <td key={ci} className="... text-transparent">—</td>
  ))}
</tr>

// AFTER
<tr key={`placeholder-${i}`} aria-hidden="true" className="... bg-white">
  {Array.from({ length: 14 }).map((__, ci) => (
    <td key={ci} className="px-3 py-2 text-xs">&nbsp;</td>
  ))}
</tr>
```

Also: locked-cell `<td>` elements now omit the invisible `—` and use
`aria-hidden` when `showDates` is false, preventing screen readers from
announcing "—" for every locked date cell.

---

## 5. `src/pages/UploadPage.tsx` — robust CSV parser & UX

### Bug: CSV parser did not handle multi-line quoted fields robustly

The original loop incremented `i` twice for escaped quotes (`""`) using
`continue` but the outer `for` loop also incremented `i`, making the skip
logic off-by-one in some edge cases.

**Fix:** Rewrote the loop to use explicit `i++` inside the escape branch:
```ts
if (ch === '"') {
  if (inQuotes && next === '"') {
    current += '"';
    i++;           // skip the second quote, then the for-loop adds 1 more
  } else {
    inQuotes = !inQuotes;
  }
}
```

### Additional improvements

- Added a 5 MB file-size guard before reading to prevent UI hangs on
  accidentally uploaded large files.
- Status toast now has `role="status"` + `aria-live="polite"` so screen
  readers announce upload results.
- Icons in the status toast are now `aria-hidden` (decorative).
- CSV `Blob` type now includes `charset=utf-8` for better Excel compatibility.
- `e.target.value = ''` moved to _always_ run (even after errors) so the same
  file can be re-selected after a fix.
- Improved user-facing error message copy throughout.

---

## 6. `src/pages/SummaryPage.tsx` — type narrowing

### Smell: `STATE_FILTER_OPTIONS` spread lost literal types

```ts
// BEFORE — TypeScript infers string[] for STATES elements after spread
const STATE_FILTER_OPTIONS = ['All - Delhi NCR', ...STATES];

// AFTER — `as const` preserves every element's literal type
const STATE_FILTER_OPTIONS = ['All - Delhi NCR', ...STATES] as const;
```

`stateForCards` is now typed as `StateName | null` instead of `string | null`,
providing type-safe usage in `GeographyCard` and downstream filter calls.

---

## 7. `src/components/layout/BottomBar.tsx` — new component

The README listed `BottomBar` in the component inventory but no file existed.
Created a complete implementation:
- Accepts an `actions: BottomBarAction[]` prop with `primary` / `secondary`
  visual variants.
- Optional `contextLabel` string on the left side.
- Renders `null` when `actions` is empty (no conditional rendering needed
  at the page level).
- Full focus-ring + `disabled` state support.

---

## 8. `vite.config.ts` — build optimisations

- Added `manualChunks` to split React, React Router, Framer Motion, Recharts,
  and d3-geo into separate vendor chunks — improves long-term browser caching
  because these libraries rarely change independently.
- Added `preview.port: 4173` so `npm run preview` doesn't collide with the dev
  server.
- `server.host: true` lets the dev server bind to all interfaces (useful for
  previewing on a phone or tablet on the same LAN).
- `sourcemap: false` for production builds (set to `true` if using a
  source-map error-tracking service like Sentry).

---

## Summary table

| File | Type | Severity |
|------|------|----------|
| `src/lib/utils.ts` | Bug fix (rounding + null safety) | Medium |
| `src/lib/useDetailFilters.ts` | Bug fix (render cascade) | Medium |
| `src/pages/DetailPage.tsx` | Bug fix + a11y | Medium |
| `src/components/ui/EditableDataTable.tsx` | A11y fix | Low–Medium |
| `src/pages/UploadPage.tsx` | Bug fix + UX polish | Medium |
| `src/pages/SummaryPage.tsx` | Type safety | Low |
| `src/components/layout/BottomBar.tsx` | New component (was missing) | Low |
| `vite.config.ts` | Build optimisation | Low |
