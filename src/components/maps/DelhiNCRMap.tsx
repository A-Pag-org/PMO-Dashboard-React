// FILE: components/maps/DelhiNCRMap.tsx
// PURPOSE: Geographically accurate SVG choropleth of the Delhi-NCR region.
// DESIGN REF: Wireframe pages 7, 9 (map panel on summary + detail pages)
//
// Implementation notes:
//   - State boundaries come from `src/lib/geo/ncr-states.geo.json`, which
//     is a simplified slice of an official-boundary India states GeoJSON
//     (EPSG:4326, datta07/INDIAN-SHAPEFILES) limited to Delhi, Haryana,
//     Uttar Pradesh, and Rajasthan.
//   - A single d3-geo Mercator projection is fit to those four state
//     polygons, so the map is clipped to the NCR window (full UP/Rajasthan
//     extents stay off-canvas to keep Delhi readable).
//   - The same projection is used to place every city bubble, so the
//     bubbles sit on real coordinates and line up with the state fills.
//   - Public API (props, STATE_BUBBLE_POSITIONS) is preserved so existing
//     callers (DetailPage, etc.) keep working. The position map is now
//     derived from the projection at render time.

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import CityBubble from './CityBubble';
import type { MapDataPoint, MapCenterBubble } from '@/lib/types';
import ncrStatesGeo from '@/lib/geo/ncr-states.geo.json';
import { CITY_COORDS, NCR_CENTER, STATE_COORDS } from '@/lib/geo/coordinates';

interface DelhiNCRMapProps {
  data: MapDataPoint[];
  centerBubble: MapCenterBubble;
  onBubbleClick?: (name: string) => void;
  /**
   * Optional per-name position overrides, merged on top of positions
   * computed from real lat/lng. Used for synthetic bubbles (e.g. RTOs
   * under a selected city) that don't have real coordinates.
   */
  positionOverrides?: Record<string, { x: number; y: number }>;
  /** Optional message to show when `data` is empty. */
  emptyHint?: string;
}

interface StateProps {
  name: string;
}

const NCR_FEATURES = ncrStatesGeo as unknown as FeatureCollection<Geometry, StateProps>;

// Canvas dimensions + inner padding for the projection. We extend the
// viewBox taller than the NCR aspect so the bottom-of-map empty-hint pill
// has somewhere to sit without overlapping bubbles.
const VIEW_W = 380;
const VIEW_H = 360;
const PAD_X = 10;
const PAD_Y_TOP = 10;
const PAD_Y_BOTTOM = 50;

// NCR window bbox (lng/lat). We intentionally fit the projection to this
// window rather than the full state geometries — UP and Rajasthan extend
// thousands of km beyond the NCR, so fitting to their full extents would
// compress Delhi to a single pixel. With this window, each state's NCR
// slice occupies its natural geographic position and the rest of each
// state simply extends off-canvas.
// Ring wound so d3-geo treats its interior as small (the NCR patch,
// not the rest of the globe). Ordering: SW -> NW -> NE -> SE -> SW.
// The window is picked so that every NCR city (from Panipat in the north
// down to Alwar in the south) lands well inside the visible canvas, with
// a little padding for city-name pills.
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

const STATE_FILL: Record<string, string> = {
  Delhi: 'var(--color-map-delhi)',
  Haryana: 'var(--color-map-haryana)',
  'Uttar Pradesh': 'var(--color-map-up)',
  Rajasthan: 'var(--color-map-rajasthan)',
};

/**
 * Pill-render offsets (SVG pixels) applied on top of each city's
 * projected position. Used only for the tight Delhi cluster where the
 * real coordinates sit within ~30 km of each other and the 88-px-wide
 * pill labels would otherwise collide with each other and with the
 * centre bubble. Everywhere else the projection's output is used as-is.
 */
const BUBBLE_OFFSET: Record<string, { dx?: number; dy?: number }> = {
  Delhi:           { dx: -10, dy: -60 },
  Gurugram:        { dx: -52, dy: 42 },
  Ghaziabad:       { dx: 58, dy: -40 },
  Noida:           { dx: 62, dy: 10 },
  'Greater Noida': { dx: 74, dy: 56 },
  Meerut:          { dx: 28, dy: -72 },
  Neemrana:        { dx: -18, dy: 16 },
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
 * Projection + path generator. Memoised at module scope because they only
 * depend on the (static) NCR feature collection and viewBox constants.
 */
const projection = geoMercator()
  .fitExtent(
    [
      [PAD_X, PAD_Y_TOP],
      [VIEW_W - PAD_X, VIEW_H - PAD_Y_BOTTOM],
    ],
    NCR_WINDOW,
  )
  // Clip in screen space: d3 drops path geometry that falls outside the
  // SVG viewBox, which avoids anti-meridian artefacts when the source
  // state polygons extend far beyond the NCR window (UP / Rajasthan).
  .clipExtent([
    [0, 0],
    [VIEW_W, VIEW_H],
  ]);
const pathGenerator = geoPath(projection);

function project(coords: { lng: number; lat: number }): { x: number; y: number } {
  const p = projection([coords.lng, coords.lat]);
  return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 };
}

function applyOffset(
  name: string,
  pos: { x: number; y: number },
): { x: number; y: number } {
  const off = BUBBLE_OFFSET[name];
  if (!off) return pos;
  return { x: pos.x + (off.dx ?? 0), y: pos.y + (off.dy ?? 0) };
}

/**
 * Positions every known place (states + cities) in SVG coordinates by
 * projecting its real lat/lng and then applying any display offset from
 * `BUBBLE_OFFSET`. Used by DetailPage to anchor RTO bubbles around a
 * selected city, among other things.
 */
export const STATE_BUBBLE_POSITIONS: Record<string, { x: number; y: number }> = (() => {
  const out: Record<string, { x: number; y: number }> = {};
  for (const [name, ll] of Object.entries(STATE_COORDS)) {
    out[name] = applyOffset(name, project(ll));
  }
  for (const [name, ll] of Object.entries(CITY_COORDS)) {
    out[name] = applyOffset(name, project(ll));
  }
  return out;
})();

const CENTER = project(NCR_CENTER);

export default function DelhiNCRMap({
  data,
  centerBubble,
  onBubbleClick,
  positionOverrides,
  emptyHint,
}: DelhiNCRMapProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredBubble, setHoveredBubble] = useState<
    { x: number; y: number; name: string } | null
  >(null);

  const positions = useMemo(
    () => ({ ...STATE_BUBBLE_POSITIONS, ...(positionOverrides ?? {}) }),
    [positionOverrides],
  );

  const stateLabels = useMemo(() => {
    return NCR_FEATURES.features.map((f: Feature<Geometry, StateProps>) => {
      const name = f.properties.name;
      // Anchor the label at the state's designated NCR-facing coord
      // (STATE_COORDS) rather than the full polygon centroid, since most
      // of UP/Rajasthan extends off-canvas.
      const ll = STATE_COORDS[name];
      const anchor = ll ? project(ll) : { x: 0, y: 0 };
      const off = STATE_LABEL_OFFSET_ANCHOR[name] ?? {};
      return {
        name,
        x: anchor.x + (off.dx ?? 0),
        y: anchor.y + (off.dy ?? 0),
      };
    });
  }, []);

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

      {/* ── State regions (real, simplified boundaries, clipped to NCR) ── */}
      <g clipPath="url(#ncr-window-clip)">
        {NCR_FEATURES.features.map((f: Feature<Geometry, StateProps>) => {
          const d = pathGenerator(f);
          if (!d) return null;
          return (
            <path
              key={f.properties.name}
              d={d}
              fill={STATE_FILL[f.properties.name] ?? 'var(--color-surface-light)'}
              stroke="white"
              strokeWidth={1.2}
              className="transition-opacity"
            />
          );
        })}
      </g>

      {/* ── State labels at polygon centroids (with offsets) ── */}
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

      {/* ── Centre bubble (below city bubbles) ── */}
      <motion.g
        variants={bubbleVariants}
        custom={0}
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
      >
        <CityBubble
          data={{ name: 'Delhi-NCR', value: centerBubble.value, onTrack: true }}
          x={CENTER.x}
          y={CENTER.y}
          isCenter
          centerLabel={centerBubble.label}
          centerSubtitle={centerBubble.subtitle}
          centerDisplayText={centerBubble.displayText}
        />
      </motion.g>

      {/* ── Data bubbles ── */}
      {data.map((point, i) => {
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
