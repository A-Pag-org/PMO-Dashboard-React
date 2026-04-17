// FILE: components/maps/CityBubble.tsx
// PURPOSE: SVG city/state bubble with name, status icon, and value
// DESIGN REF: Wireframe pages 7, 9 (map bubbles on Delhi-NCR map)


import { formatNumber } from '@/lib/utils';
import type { MapDataPoint } from '@/lib/types';

interface CityBubbleProps {
  data: MapDataPoint;
  x: number;
  y: number;
  isCenter?: boolean;
  centerLabel?: string;
  centerSubtitle?: string;
}

export default function CityBubble({
  data,
  x,
  y,
  isCenter = false,
  centerLabel,
  centerSubtitle,
}: CityBubbleProps) {
  if (isCenter) {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Drop shadow */}
        <circle r={62} fill="white" filter="url(#bubble-shadow)" />
        <circle r={60} fill="white" stroke="var(--color-border)" strokeWidth={1} />
        <text
          y={-14}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill="var(--color-text-primary)"
          style={{ fontSize: 22 }}
        >
          {formatNumber(data.value)}
        </text>
        {centerLabel && (
          <text
            y={6}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            style={{ fontSize: 8 }}
          >
            {centerLabel}
          </text>
        )}
        {centerSubtitle && (
          <text
            y={20}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            style={{ fontSize: 7 }}
          >
            {centerSubtitle}
          </text>
        )}
      </g>
    );
  }

  const statusColor = data.onTrack
    ? 'var(--color-map-on-track)'
    : 'var(--color-map-off-track)';
  const statusIcon = data.onTrack ? '✓' : '✗';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      role="img"
      aria-label={`${data.name} — ${formatNumber(data.value)} — ${data.onTrack ? 'on track' : 'off track'}`}
    >
      <title>{`${data.name}: ${formatNumber(data.value)} — See on map`}</title>
      {/* Background pill */}
      <rect
        x={-44}
        y={-14}
        width={88}
        height={28}
        rx={14}
        fill="white"
        stroke="var(--color-border)"
        strokeWidth={0.8}
        filter="url(#bubble-shadow)"
      />
      {/* Status icon */}
      <circle cx={-30} cy={0} r={7} fill={statusColor} />
      <text
        x={-30}
        y={4}
        textAnchor="middle"
        fill="white"
        style={{ fontSize: 9, fontWeight: 700 }}
      >
        {statusIcon}
      </text>
      {/* City name + value */}
      <text
        x={-16}
        y={-3}
        fill="var(--color-text-primary)"
        style={{ fontSize: 8, fontWeight: 600 }}
      >
        {data.name}
      </text>
      <text
        x={-16}
        y={8}
        fill="var(--color-text-secondary)"
        style={{ fontSize: 7 }}
      >
        {formatNumber(data.value)}
      </text>
    </g>
  );
}
