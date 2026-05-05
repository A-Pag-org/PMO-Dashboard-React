// FILE: components/maps/DelhiNCRMap.tsx
// PURPOSE: Geographically-accurate SVG choropleth of the Delhi-NCR region,
//          with the projection re-fitted to the user's area filter
//          (spec §4.3 — "Only that state shown" / "Only that city shown").
//
// Refinement 3 (Interim Dashboard Improvements) — every state and every
// city is now rendered as its own clearly-outlined, colour-coded region:
//   • State view: each state polygon is filled by its traffic-light band
//     (Red <30 / Yellow 30–60 / Green ≥60) instead of a fixed per-state
//     identity colour. State polygons come from the existing NCR GeoJSON.
//   • City view: each city is a Voronoi cell clipped to its host state's
//     polygon, filled by its band, with the city's name + value sitting
//     directly on the region (no more floating pill). City names that we
//     don't have a coordinate for fall back to the original bubble.
//
// Implementation notes:
//   - State boundaries come from `src/lib/geo/ncr-states.geo.json`.
//   - The projection is derived from the `area` prop:
//       no filter      → fit to NCR_WINDOW (full Delhi-NCR view)
//       state filter   → fit to that state's polygon
//       city filter    → fit to a small box around the city's centre
//       rto filter     → same as city (RTOs share the city's bbox)
//   - Bubble positions and Voronoi seeds use the SAME live projection, so
//     the choropleth and any overlaid bubbles stay co-registered.
//   - RTOs (when area.city is set) are still arranged in a ring around
//     the projected city centre — the mock for Refinement 3 does not
//     touch RTO behaviour.

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { geoMercator, geoPath } from 'd3-geo';
import { Delaunay } from 'd3-delaunay';
import type { GeoProjection } from 'd3-geo';
import type { FeatureCollection, Feature, Geometry, Polygon, MultiPolygon } from 'geojson';
import CityBubble from './CityBubble';
import type { MapDataPoint, MapCenterBubble, ViewLevel } from '@/lib/types';
import ncrStatesGeo from '@/lib/geo/ncr-states.geo.json';
import {
  CITY_COORDS,
  NCR_CENTER,
  STATE_COORDS,
  type LngLat,
} from '@/lib/geo/coordinates';
import { CITY_STATE_MAP, RTO_OPTIONS_BY_CITY } from '@/lib/constants';
import { formatNumber, getBandColors } from '@/lib/utils';
import type { AreaFilterValue } from '@/lib/useDetailFilters';

interface DelhiNCRMapProps {
  data: MapDataPoint[];
  centerBubble: MapCenterBubble;
  /** Drives projection fit + visible polygons + RTO ring layout. */
  area?: AreaFilterValue;
  /**
   * Drives how regions are rendered:
   *   'state' → states coloured by band, city bubbles overlaid.
   *   'city'  → cities rendered as Voronoi cells coloured by band.
   *   'rto'   → cities/states act as a backdrop, RTO ring sits on top.
   * Defaults to 'state' which preserves prior behaviour for callers that
   * haven't been updated.
   */
  viewLevel?: ViewLevel;
  /**
   * Spec §10: RTO bubbles render only when the active initiative
   * supports them (Naya Safar). When false, the RTO ring is suppressed
   * even if the area filter is at city level.
   */
  supportsRto?: boolean;
  onBubbleClick?: (name: string) => void;
  /** Optional message to show when `data` is empty. */
  emptyHint?: string;
}

interface StateProps {
  name: string;
}

const NCR_FEATURES = ncrStatesGeo as unknown as FeatureCollection<Geometry, StateProps>;

const VIEW_W = 380;
const VIEW_H = 360;
const PAD_X = 10;
const PAD_Y_TOP = 10;
const PAD_Y_BOTTOM = 50;

// Default extent — full NCR window. Used when no area filter is set.
const NCR_WINDOW: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [75.75, 27.20],
            [75.75, 29.80],
            [78.20, 29.80],
            [78.20, 27.20],
            [75.75, 27.20],
          ],
        ],
      },
    },
  ],
};

// Pill-render offsets in SVG pixels for crowded clusters around Delhi.
// Only used when zoomed out to the full NCR view AND the active view
// level still draws bubbles (state view); city view replaces bubbles
// with in-cell labels so these offsets are skipped.
const BUBBLE_OFFSET_NCR: Record<string, { dx?: number; dy?: number }> = {
  Delhi:           { dx: -10, dy: -60 },
  Gurugram:        { dx: -52, dy: 42 },
  Ghaziabad:       { dx: 58, dy: -40 },
  Noida:           { dx: 62, dy: 10 },
  'Greater Noida': { dx: 74, dy: 56 },
  Meerut:          { dx: 28, dy: -72 },
  Neemrana:        { dx: -18, dy: 16 },
};

// City-view label offsets used (only at NCR zoom) for cities whose
// projected coordinate sits behind the centre bubble or overlaps a
// neighbour's label. Keep these offsets minimal so the in-cell labels
// still visibly belong to the correct cell.
const CENTER_OVERLAP_OFFSETS: Record<string, { dx?: number; dy?: number }> = {
  Delhi:           { dx: 0,   dy: -54 },
  Gurugram:        { dx: -56, dy: 38 },
  Ghaziabad:       { dx: 60,  dy: -22 },
  Noida:           { dx: 62,  dy: 8 },
  'Greater Noida': { dx: 70,  dy: 50 },
};

const STATE_LABEL_OFFSET_ANCHOR: Record<string, { dx?: number; dy?: number }> = {
  Delhi: { dy: -4 },
  Haryana: { dy: 0 },
  'Uttar Pradesh': { dy: 0 },
  Rajasthan: { dy: 0 },
};

const bubbleVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: 0.1 * i, duration: 0.3, ease: 'easeOut' as const },
  }),
};

/**
 * Builds a small bbox FeatureCollection around a single lat/lng. Used
 * when fitting the projection to a city's neighbourhood — full state
 * polygons get dropped at this zoom because we don't have city-level
 * boundary data; the bbox keeps the projection sensible.
 */
function bboxAround(ll: LngLat, deg = 0.18): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [ll.lng - deg, ll.lat - deg],
              [ll.lng - deg, ll.lat + deg],
              [ll.lng + deg, ll.lat + deg],
              [ll.lng + deg, ll.lat - deg],
              [ll.lng - deg, ll.lat - deg],
            ],
          ],
        },
      },
    ],
  };
}

/**
 * Picks the geometry the projection should fit to, based on the area
 * filter. Returns the FeatureCollection plus a flag signalling whether
 * we're at a "tight" zoom (state-or-deeper) so the renderer can scale
 * label sizes / drop NCR-only offsets.
 */
function fitGeometryFor(area: AreaFilterValue | undefined): {
  fc: FeatureCollection;
  zoom: 'ncr' | 'state' | 'city';
} {
  if (area?.city) {
    const ll = CITY_COORDS[area.city];
    if (ll) return { fc: bboxAround(ll, 0.12), zoom: 'city' };
  }
  if (area?.state) {
    const stateFeature = NCR_FEATURES.features.find(
      (f) => f.properties.name === area.state,
    );
    if (stateFeature) {
      return {
        fc: { type: 'FeatureCollection', features: [stateFeature] },
        zoom: 'state',
      };
    }
  }
  return { fc: NCR_WINDOW, zoom: 'ncr' };
}

function project(
  projection: GeoProjection,
  coords: LngLat,
): { x: number; y: number } {
  const p = projection([coords.lng, coords.lat]);
  return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 };
}

// ── Polygon helpers (in projected SVG-space) ─────────────────────────

type Pt = [number, number];
type Ring = Pt[];

function ringToPath(rings: Ring[]): string {
  return rings
    .map(
      (r) =>
        'M' +
        r.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L') +
        'Z',
    )
    .join(' ');
}

function ringCentroid(ring: Ring): Pt | null {
  if (!ring || ring.length < 3) return null;
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % ring.length];
    const f = x0 * y1 - x1 * y0;
    area += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  if (Math.abs(area) < 1e-6) {
    const xs = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const ys = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return [xs, ys];
  }
  area *= 0.5;
  return [cx / (6 * area), cy / (6 * area)];
}

/**
 * Pulls every outer ring out of a (Multi)Polygon GeoJSON geometry,
 * already projected into SVG coordinates by `projector`. Holes are
 * intentionally dropped — the NCR states geo doesn't define any.
 */
function projectGeometryRings(
  geom: Polygon | MultiPolygon,
  projector: (ll: LngLat) => Pt,
): Ring[] {
  const rings: Ring[] = [];
  const polys: number[][][][] =
    geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer || outer.length < 3) continue;
    rings.push(outer.map(([lng, lat]) => projector({ lng, lat })));
  }
  return rings;
}

/** Stable id helper — strips spaces/non-word chars for use in clipPath ids. */
function slugForId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

export default function DelhiNCRMap({
  data,
  centerBubble,
  area,
  viewLevel = 'state',
  supportsRto = true,
  onBubbleClick,
  emptyHint,
}: DelhiNCRMapProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredBubble, setHoveredBubble] = useState<
    { x: number; y: number; name: string } | null
  >(null);

  // ── Projection (refits when the area filter changes) ──────────────
  const { projection, pathGenerator, zoom, polygons } = useMemo(() => {
    const { fc, zoom } = fitGeometryFor(area);
    const proj = geoMercator()
      .fitExtent(
        [
          [PAD_X, PAD_Y_TOP],
          [VIEW_W - PAD_X, VIEW_H - PAD_Y_BOTTOM],
        ],
        fc,
      )
      .clipExtent([[0, 0], [VIEW_W, VIEW_H]]);
    const path = geoPath(proj);
    const polys =
      zoom === 'city'
        ? area?.state
          ? NCR_FEATURES.features.filter((f) => f.properties.name === area.state)
          : NCR_FEATURES.features
        : zoom === 'state'
        ? NCR_FEATURES.features.filter((f) => f.properties.name === area?.state)
        : NCR_FEATURES.features;
    return { projection: proj, pathGenerator: path, zoom, polygons: polys };
  }, [area]);

  // ── Lookup: name → MapDataPoint (for region-fill colour) ──────────
  const dataByName = useMemo(() => {
    const map: Record<string, MapDataPoint> = {};
    for (const d of data) map[d.name] = d;
    return map;
  }, [data]);

  // ── State polygons projected to SVG coords (for clipping cells) ───
  const stateRingsByName = useMemo(() => {
    const out: Record<string, Ring[]> = {};
    const projector = (ll: LngLat) => {
      const p = projection([ll.lng, ll.lat]);
      return (p ? [p[0], p[1]] : [0, 0]) as Pt;
    };
    for (const f of NCR_FEATURES.features) {
      const geom = f.geometry as Polygon | MultiPolygon;
      out[f.properties.name] = projectGeometryRings(geom, projector);
    }
    return out;
  }, [projection]);

  // ── City Voronoi cells (only built in city view) ──────────────────
  const cityCells = useMemo(() => {
    if (viewLevel !== 'city') return [];
    // Group cities by host state so each state's cities tile only
    // their host state's polygon. This keeps the choropleth
    // geographically sensible even though we don't have real
    // city-boundary data.
    const byState: Record<string, { name: string; pt: Pt }[]> = {};
    for (const [city, ll] of Object.entries(CITY_COORDS)) {
      const host = CITY_STATE_MAP[city];
      if (!host) continue;
      const p = projection([ll.lng, ll.lat]);
      if (!p) continue;
      (byState[host] ??= []).push({ name: city, pt: [p[0], p[1]] });
    }

    const cells: Array<{
      name: string;
      stateName: string;
      cellRing: Ring;
      pt: Pt;
    }> = [];

    for (const [stateName, cities] of Object.entries(byState)) {
      const stateRings = stateRingsByName[stateName] ?? [];
      if (stateRings.length === 0 || cities.length === 0) continue;
      const xs = stateRings.flat().map((p) => p[0]);
      const ys = stateRings.flat().map((p) => p[1]);
      const xmin = Math.min(...xs) - 5;
      const ymin = Math.min(...ys) - 5;
      const xmax = Math.max(...xs) + 5;
      const ymax = Math.max(...ys) + 5;
      const points = cities.map((c) => c.pt) as [number, number][];
      const delaunay = Delaunay.from(points);
      const voronoi = delaunay.voronoi([xmin, ymin, xmax, ymax]);
      cities.forEach((c, i) => {
        const cellPoly = voronoi.cellPolygon(i);
        if (!cellPoly) return;
        const cell: Ring = cellPoly.map(([x, y]) => [x, y] as Pt);
        cells.push({ name: c.name, stateName, cellRing: cell, pt: c.pt });
      });
    }
    return cells;
  }, [viewLevel, projection, stateRingsByName]);

  // ── Centre coordinate (varies by zoom level) ──────────────────────
  const center = useMemo(() => {
    if (zoom === 'city' && area?.city && CITY_COORDS[area.city]) {
      return project(projection, CITY_COORDS[area.city]);
    }
    if (zoom === 'state' && area?.state && STATE_COORDS[area.state]) {
      return project(projection, STATE_COORDS[area.state]);
    }
    return project(projection, NCR_CENTER);
  }, [projection, zoom, area]);

  // ── Bubble positions for everything we know how to place ──────────
  const positions = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    const useNcrOffsets = zoom === 'ncr';
    for (const [name, ll] of Object.entries(STATE_COORDS)) {
      const p = project(projection, ll);
      const off = useNcrOffsets ? STATE_LABEL_OFFSET_ANCHOR[name] ?? {} : {};
      out[name] = { x: p.x + (off.dx ?? 0), y: p.y + (off.dy ?? 0) };
    }
    for (const [name, ll] of Object.entries(CITY_COORDS)) {
      const p = project(projection, ll);
      const off = useNcrOffsets ? BUBBLE_OFFSET_NCR[name] ?? {} : {};
      out[name] = { x: p.x + (off.dx ?? 0), y: p.y + (off.dy ?? 0) };
    }
    if (area?.city && supportsRto) {
      const rtos = RTO_OPTIONS_BY_CITY[area.city] ?? [];
      const cityCoords = CITY_COORDS[area.city];
      if (cityCoords && rtos.length > 0) {
        const anchor = project(projection, cityCoords);
        const radius = rtos.length > 4 ? 60 : 50;
        rtos.forEach((rto, idx) => {
          const angle = (2 * Math.PI * idx) / Math.max(1, rtos.length) - Math.PI / 2;
          out[rto] = {
            x: anchor.x + radius * Math.cos(angle),
            y: anchor.y + radius * Math.sin(angle),
          };
        });
      }
    }
    return out;
  }, [projection, zoom, area, supportsRto]);

  // ── State labels (only at NCR zoom AND not on city view, where the
  //    Voronoi labels would overlap them) ────────────────────────────
  const stateLabels = useMemo(() => {
    if (zoom !== 'ncr' || viewLevel === 'city') return [];
    return polygons.map((f: Feature<Geometry, StateProps>) => {
      const name = f.properties.name;
      const ll = STATE_COORDS[name];
      const anchor = ll ? project(projection, ll) : { x: 0, y: 0 };
      const off = STATE_LABEL_OFFSET_ANCHOR[name] ?? {};
      return {
        name,
        x: anchor.x + (off.dx ?? 0),
        y: anchor.y + (off.dy ?? 0),
      };
    });
  }, [polygons, projection, zoom, viewLevel]);

  // ── Per-region fill helper (state polygons + Voronoi cells) ───────
  // Uses the saturated band foreground (with reduced opacity in the
  // `fill`) so the choropleth reads at a glance — the very pale "bg"
  // tint blended into cream looks too close to the empty backdrop.
  function fillForRegion(name: string): { fill: string; stroke: string } {
    const point = dataByName[name];
    if (point && point.format === 'X/Y' && point.band && point.band !== 'NA') {
      const c = getBandColors(point.band);
      return { fill: c.fg, stroke: c.text };
    }
    if (point && point.format === 'Y/N') {
      const c = getBandColors(point.value === 1 ? 'GREEN' : 'RED');
      return { fill: c.fg, stroke: c.text };
    }
    return {
      fill: 'var(--color-surface-light)',
      stroke: 'var(--color-border)',
    };
  }

  // City-cell label spec: name on top, value/% below. Built once.
  function cityLabel(name: string): { line1: string; line2: string } {
    const d = dataByName[name];
    if (!d) return { line1: name, line2: '' };
    if (d.format === 'X/Y') {
      const pctMatch = /\((\d+)%\)/.exec(d.label ?? '');
      const pct = pctMatch ? `${pctMatch[1]}%` : '';
      return {
        line1: name,
        line2: pct ? `${formatNumber(d.value)} (${pct})` : formatNumber(d.value),
      };
    }
    return {
      line1: name,
      line2: d.label ?? formatNumber(d.value),
    };
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Delhi-NCR region map showing initiative progress by geography"
    >
      <defs>
        <filter id="bubble-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
        </filter>
        <clipPath id="ncr-window-clip">
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} />
        </clipPath>
      </defs>

      {/* ── State regions ──
          • State view: each state polygon is filled by its band.
          • City view: state polygons act only as a faint backdrop —
            the per-city Voronoi cells render on top. */}
      <g clipPath="url(#ncr-window-clip)">
        {polygons.map((f: Feature<Geometry, StateProps>) => {
          const d = pathGenerator(f);
          if (!d) return null;
          const name = f.properties.name;
          const colour =
            viewLevel === 'state'
              ? fillForRegion(name)
              : { fill: 'var(--color-surface-light)', stroke: 'var(--color-border)' };
          const isInteractive =
            viewLevel === 'state' && Boolean(onBubbleClick) && Boolean(dataByName[name]);
          const isStateBand =
            viewLevel === 'state' && Boolean(dataByName[name]);
          return (
            <path
              key={name}
              d={d}
              fill={colour.fill}
              fillOpacity={isStateBand ? 0.7 : 1}
              stroke={colour.stroke}
              strokeWidth={1.4}
              strokeOpacity={isStateBand ? 0.9 : 1}
              strokeLinejoin="round"
              opacity={zoom === 'city' && viewLevel !== 'city' ? 0.7 : 1}
              className={isInteractive ? 'cursor-pointer transition-opacity' : 'transition-opacity'}
              onClick={isInteractive ? () => onBubbleClick?.(name) : undefined}
            >
              <title>{name}</title>
            </path>
          );
        })}
      </g>

      {/* ── State clip paths (used by Voronoi cells in city view) ── */}
      {viewLevel === 'city' && (
        <defs>
          {Object.entries(stateRingsByName).map(([name, rings]) => (
            <clipPath key={`clip-${name}`} id={`state-clip-${slugForId(name)}`}>
              <path d={ringToPath(rings)} />
            </clipPath>
          ))}
        </defs>
      )}

      {/* ── City Voronoi cells (city view only) ──
          Each cell is rendered twice: once as a colour-filled path
          clipped to its host state's polygon, and once as a stroked
          outline so the boundary stays visible at the state edge. */}
      {viewLevel === 'city' && (
        <g clipPath="url(#ncr-window-clip)">
          {cityCells.map((cell) => {
            if (!dataByName[cell.name]) return null;
            const colour = fillForRegion(cell.name);
            const isInteractive = Boolean(onBubbleClick);
            const clipId = `state-clip-${slugForId(cell.stateName)}`;
            const cen = ringCentroid(cell.cellRing) ?? cell.pt;
            return (
              <g key={cell.name} clipPath={`url(#${clipId})`}>
                <path
                  d={ringToPath([cell.cellRing])}
                  fill={colour.fill}
                  fillOpacity={0.7}
                  stroke={colour.stroke}
                  strokeWidth={1.2}
                  strokeOpacity={0.9}
                  strokeLinejoin="round"
                  className={isInteractive ? 'cursor-pointer' : undefined}
                  onClick={isInteractive ? () => onBubbleClick?.(cell.name) : undefined}
                  onMouseEnter={() =>
                    setHoveredBubble({
                      x: cen[0],
                      y: cen[1] - 22,
                      name: cell.name,
                    })
                  }
                  onMouseLeave={() =>
                    setHoveredBubble((prev) => (prev?.name === cell.name ? null : prev))
                  }
                >
                  <title>{cell.name}</title>
                </path>
              </g>
            );
          })}

          {/* ── Host-state outlines drawn on top of the cells ──
              Stroke-only so the state border remains visible above the
              merged Voronoi fill. */}
          {Object.entries(stateRingsByName).map(([name, rings]) => {
            // Only draw outlines for states whose cities are in `data`.
            const hasCityInState = cityCells.some(
              (c) => c.stateName === name && dataByName[c.name],
            );
            if (!hasCityInState) return null;
            return (
              <path
                key={`state-outline-${name}`}
                d={ringToPath(rings)}
                fill="none"
                stroke="white"
                strokeWidth={1.6}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            );
          })}

          {/* ── In-cell labels (name + value/%). Anchored on the
              city's projected coordinate (always inside its own
              Voronoi cell). NCR-zoom offsets are reused only for the
              cities that overlap the centre bubble (Delhi cluster) so
              the choropleth labels don't disappear behind the centre
              white circle. */}
          {cityCells.map((cell) => {
            if (!dataByName[cell.name]) return null;
            const off =
              zoom === 'ncr' && CENTER_OVERLAP_OFFSETS[cell.name]
                ? CENTER_OVERLAP_OFFSETS[cell.name]
                : {};
            const lx = cell.pt[0] + (off.dx ?? 0);
            const ly = cell.pt[1] + (off.dy ?? 0);
            const labels = cityLabel(cell.name);
            return (
              <g
                key={`label-${cell.name}`}
                transform={`translate(${lx}, ${ly})`}
                pointerEvents="none"
              >
                <text
                  textAnchor="middle"
                  y={-3}
                  fill="var(--color-text-primary)"
                  stroke="white"
                  strokeWidth={2.5}
                  paintOrder="stroke"
                  style={{ fontSize: 9, fontWeight: 700 }}
                >
                  {labels.line1}
                </text>
                {labels.line2 ? (
                  <text
                    textAnchor="middle"
                    y={9}
                    fill="var(--color-text-primary)"
                    stroke="white"
                    strokeWidth={2.5}
                    paintOrder="stroke"
                    style={{ fontSize: 8, fontWeight: 600 }}
                  >
                    {labels.line2}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      )}

      {/* ── State labels at polygon centroids (NCR zoom only) ── */}
      {stateLabels.map((label) => (
        <text
          key={label.name}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          fill="var(--color-text-secondary)"
          style={{ fontSize: 9, fontWeight: 600 }}
          className="pointer-events-none"
        >
          {label.name}
        </text>
      ))}

      {/* ── Centre bubble ── */}
      <motion.g
        variants={bubbleVariants}
        custom={0}
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
      >
        <CityBubble
          data={{ name: 'Delhi-NCR', value: centerBubble.value, onTrack: true }}
          x={center.x}
          y={center.y}
          isCenter
          centerLabel={centerBubble.label}
          centerSubtitle={centerBubble.subtitle}
          centerDisplayText={centerBubble.displayText}
        />
      </motion.g>

      {/* ── Data bubbles ──
          City-level data is rendered as filled Voronoi cells above, so
          we suppress the floating bubbles for any city that already has
          a cell. State-level entries continue to use the bubble. */}
      {data.map((point, i) => {
        if (viewLevel === 'city' && cityCells.some((c) => c.name === point.name)) {
          return null;
        }
        const pos = positions[point.name];
        if (!pos) return null;
        return (
          <motion.g
            key={point.name}
            custom={i + 1}
            variants={bubbleVariants}
            initial={shouldReduceMotion ? 'visible' : 'hidden'}
            animate="visible"
            onClick={() => onBubbleClick?.(point.name)}
            onMouseEnter={() =>
              setHoveredBubble({ x: pos.x, y: pos.y - 22, name: point.name })
            }
            onMouseLeave={() =>
              setHoveredBubble((prev) => (prev?.name === point.name ? null : prev))
            }
            className="cursor-pointer"
          >
            <CityBubble data={point} x={pos.x} y={pos.y} />
          </motion.g>
        );
      })}

      {data.length === 0 && emptyHint ? (
        <g pointerEvents="none" transform={`translate(${VIEW_W / 2}, ${VIEW_H - 15})`}>
          <rect
            x={-90}
            y={-11}
            width={180}
            height={20}
            rx={10}
            fill="var(--color-surface-light)"
            stroke="var(--color-border)"
            strokeWidth={0.8}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            style={{ fontSize: 8, fontWeight: 500 }}
          >
            {emptyHint}
          </text>
        </g>
      ) : null}

      {hoveredBubble ? (
        <g
          pointerEvents="none"
          transform={`translate(${hoveredBubble.x}, ${hoveredBubble.y})`}
        >
          <rect
            x={-30}
            y={-11}
            width={60}
            height={18}
            rx={9}
            fill="var(--color-navy)"
            opacity={0.95}
          />
          <text
            x={0}
            y={1}
            textAnchor="middle"
            fill="var(--color-text-white)"
            style={{ fontSize: 8, fontWeight: 600 }}
          >
            See on map
          </text>
        </g>
      ) : null}
    </svg>
  );
}
