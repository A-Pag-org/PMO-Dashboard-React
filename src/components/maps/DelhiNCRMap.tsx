// FILE: components/maps/DelhiNCRMap.tsx
// PURPOSE: Geographically-accurate SVG choropleth of the Delhi-NCR region,
//          with the projection re-fitted to the user's area filter
//          (spec §4.3 — "Only that state shown" / "Only that city shown").
//
// Implementation notes:
//   - State boundaries come from `src/lib/geo/ncr-states.geo.json`.
//   - The projection is derived from the `area` prop:
//       no filter      → fit to NCR_WINDOW (full Delhi-NCR view)
//       state filter   → fit to that state's polygon
//       city filter    → fit to a small box around the city's centre
//       rto filter     → same as city (RTOs share the city's bbox)
//   - Bubble positions are derived from the SAME live projection, so
//     state / city / centre bubbles always sit on their real coords.
//   - RTOs (when area.city is set) are arranged in a ring around the
//     projected city centre.

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { geoMercator, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import CityBubble from './CityBubble';
import type { MapDataPoint, MapCenterBubble } from '@/lib/types';
import ncrStatesGeo from '@/lib/geo/ncr-states.geo.json';
import {
  CITY_COORDS,
  NCR_CENTER,
  STATE_COORDS,
  type LngLat,
} from '@/lib/geo/coordinates';
import { RTO_OPTIONS_BY_CITY } from '@/lib/constants';
import type { AreaFilterValue } from '@/lib/useDetailFilters';

interface DelhiNCRMapProps {
  data: MapDataPoint[];
  centerBubble: MapCenterBubble;
  /** Drives projection fit + visible polygons + RTO ring layout. */
  area?: AreaFilterValue;
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

const STATE_FILL: Record<string, string> = {
  Delhi: 'var(--color-map-delhi)',
  Haryana: 'var(--color-map-haryana)',
  'Uttar Pradesh': 'var(--color-map-up)',
  Rajasthan: 'var(--color-map-rajasthan)',
};

// Pill-render offsets in SVG pixels for crowded clusters around Delhi.
// Only used when zoomed out to the full NCR view; at state/city zoom
// the cluster is visually broken up so we skip the offsets.
const BUBBLE_OFFSET_NCR: Record<string, { dx?: number; dy?: number }> = {
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

export default function DelhiNCRMap({
  data,
  centerBubble,
  area,
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
    // At city/RTO zoom we don't have city polygons, so just render the
    // single host state's polygon as a faint backdrop.
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
    // RTOs — when filtered to a city, ring them around its centre.
    if (area?.city) {
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
  }, [projection, zoom, area]);

  // ── State labels (only at NCR zoom; redundant when zoomed in) ─────
  const stateLabels = useMemo(() => {
    if (zoom !== 'ncr') return [];
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
  }, [polygons, projection, zoom]);

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

      {/* ── State regions (real boundaries, refit per area) ── */}
      <g clipPath="url(#ncr-window-clip)">
        {polygons.map((f: Feature<Geometry, StateProps>) => {
          const d = pathGenerator(f);
          if (!d) return null;
          return (
            <path
              key={f.properties.name}
              d={d}
              fill={STATE_FILL[f.properties.name] ?? 'var(--color-surface-light)'}
              stroke="white"
              strokeWidth={1.2}
              opacity={zoom === 'city' ? 0.6 : 1}
              className="transition-opacity"
            />
          );
        })}
      </g>

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
