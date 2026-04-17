// FILE: components/maps/DelhiNCRMap.tsx
// PURPOSE: SVG choropleth map of Delhi-NCR with state regions and city/state bubbles
// DESIGN REF: Wireframe pages 7, 9 (map panel on summary + detail pages)


import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import CityBubble from './CityBubble';
import type { MapDataPoint, MapCenterBubble } from '@/lib/types';

interface DelhiNCRMapProps {
  data: MapDataPoint[];
  centerBubble: MapCenterBubble;
  onBubbleClick?: (name: string) => void;
}

const REGION_PATHS = {
  haryana: {
    d: 'M30,40 L120,20 L160,60 L170,140 L140,200 L80,220 L20,180 L10,100 Z',
    fill: 'var(--color-map-haryana)',
    label: 'Haryana',
  },
  up: {
    d: 'M230,30 L340,50 L360,130 L350,220 L300,260 L230,240 L200,160 L210,80 Z',
    fill: 'var(--color-map-up)',
    label: 'Uttar Pradesh',
  },
  delhi: {
    d: 'M160,80 L210,80 L220,120 L210,170 L170,180 L150,150 L145,110 Z',
    fill: 'var(--color-map-delhi)',
    label: 'Delhi',
  },
  rajasthan: {
    d: 'M20,220 L80,220 L140,240 L160,300 L120,340 L40,330 L10,280 Z',
    fill: 'var(--color-map-rajasthan)',
    label: 'Rajasthan',
  },
} as const;

const STATE_BUBBLE_POSITIONS: Record<string, { x: number; y: number }> = {
  Haryana:          { x: 65,  y: 100 },
  'Uttar Pradesh':  { x: 310, y: 130 },
  Delhi:            { x: 175, y: 75 },
  Rajasthan:        { x: 75,  y: 290 },
  Panipat:          { x: 140, y: 30 },
  Rohtak:           { x: 40,  y: 140 },
  Gurugram:         { x: 100, y: 200 },
  Alwar:            { x: 45,  y: 270 },
  Meerut:           { x: 315, y: 55 },
  Noida:            { x: 265, y: 200 },
  'Greater Noida':  { x: 300, y: 245 },
  Ghaziabad:        { x: 275, y: 85 },
};

const CENTER = { x: 185, y: 165 };

const bubbleVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: 0.1 * i, duration: 0.3, ease: 'easeOut' as const },
  }),
};

export default function DelhiNCRMap({
  data,
  centerBubble,
  onBubbleClick,
}: DelhiNCRMapProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredBubble, setHoveredBubble] = useState<{ x: number; y: number; name: string } | null>(null);

  return (
    <svg
      viewBox="0 0 380 360"
      className="h-full w-full"
      role="img"
      aria-label="Delhi-NCR region map showing initiative progress by geography"
    >
      <defs>
        <filter id="bubble-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* ── State regions ── */}
      {Object.entries(REGION_PATHS).map(([key, region]) => (
        <g key={key}>
          <path
            d={region.d}
            fill={region.fill}
            stroke="white"
            strokeWidth={2}
            className="cursor-pointer transition-opacity hover:opacity-80"
          />
          <text
            x={key === 'haryana' ? 70 : key === 'up' ? 280 : key === 'delhi' ? 180 : 80}
            y={key === 'haryana' ? 60 : key === 'up' ? 70 : key === 'delhi' ? 100 : 305}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            style={{ fontSize: 9, fontWeight: 500 }}
            className="pointer-events-none"
          >
            {region.label}
          </text>
        </g>
      ))}

      {/* ── Center bubble (rendered first so city bubbles appear on top) ── */}
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
        />
      </motion.g>

      {/* ── Data bubbles (on top of center bubble) ── */}
      {data.map((point, i) => {
        const pos = STATE_BUBBLE_POSITIONS[point.name];
        if (!pos) return null;

        return (
          <motion.g
            key={point.name}
            custom={i + 1}
            variants={bubbleVariants}
            initial={shouldReduceMotion ? 'visible' : 'hidden'}
            animate="visible"
            onClick={() => onBubbleClick?.(point.name)}
            onMouseEnter={() => setHoveredBubble({ x: pos.x, y: pos.y - 22, name: point.name })}
            onMouseLeave={() => setHoveredBubble((prev) => (prev?.name === point.name ? null : prev))}
            className="cursor-pointer"
          >
            <CityBubble data={point} x={pos.x} y={pos.y} />
          </motion.g>
        );
      })}

      {hoveredBubble ? (
        <g pointerEvents="none" transform={`translate(${hoveredBubble.x}, ${hoveredBubble.y})`}>
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
