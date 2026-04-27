// FILE: components/maps/CityBubble.tsx
// PURPOSE: SVG region bubble — name + value, format-aware rendering.
// DESIGN REF: Spec §4.5 — map display by metric format.
//   X/Y standard / inverse  → bubble tinted by band (R/Y/G).
//   Xx (absolute count)     → raw number, no color coding.
//   Y/N (boolean)           → big "Y" (green) or "N" (red).

import { formatNumber, getBandColors } from '@/lib/utils';
import type { MapDataPoint } from '@/lib/types';

interface CityBubbleProps {
  data: MapDataPoint;
  x: number;
  y: number;
  isCenter?: boolean;
  centerLabel?: string;
  centerSubtitle?: string;
  /** Optional explicit display text for the big centre number. */
  centerDisplayText?: string;
}

export default function CityBubble({
  data,
  x,
  y,
  isCenter = false,
  centerLabel,
  centerSubtitle,
  centerDisplayText,
}: CityBubbleProps) {
  if (isCenter) {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle r={62} fill="white" filter="url(#bubble-shadow)" />
        <circle r={60} fill="white" stroke="var(--color-border)" strokeWidth={1} />
        <text
          y={-14}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill="var(--color-text-primary)"
          style={{ fontSize: 22 }}
        >
          {centerDisplayText ?? data.label ?? formatNumber(data.value)}
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

  // ── Y/N — big letter, no value ──────────────────────────────────────
  if (data.format === 'Y/N') {
    const isYes = data.value === 1;
    const colors = getBandColors(isYes ? 'GREEN' : 'RED');
    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer"
        role="img"
        aria-label={`${data.name} — ${isYes ? 'Yes' : 'No'}`}
      >
        <title>{`${data.name}: ${isYes ? 'Yes' : 'No'}`}</title>
        <rect
          x={-44} y={-14} width={88} height={28} rx={14}
          fill={colors.bg}
          stroke={colors.fg}
          strokeWidth={1.2}
          filter="url(#bubble-shadow)"
        />
        <circle cx={-30} cy={0} r={9} fill={colors.fg} />
        <text
          x={-30} y={4}
          textAnchor="middle"
          fill="white"
          style={{ fontSize: 11, fontWeight: 800 }}
        >
          {isYes ? 'Y' : 'N'}
        </text>
        <text
          x={-16} y={1}
          fill={colors.text}
          style={{ fontSize: 8, fontWeight: 600 }}
        >
          {data.name}
        </text>
      </g>
    );
  }

  // ── Xx — raw count, no color band ───────────────────────────────────
  if (data.format === 'Xx') {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer"
        role="img"
        aria-label={`${data.name} — ${formatNumber(data.value)}`}
      >
        <title>{`${data.name}: ${formatNumber(data.value)}`}</title>
        <rect
          x={-44} y={-14} width={88} height={28} rx={14}
          fill="white"
          stroke="var(--color-border)"
          strokeWidth={0.8}
          filter="url(#bubble-shadow)"
        />
        <text
          x={0} y={-2}
          textAnchor="middle"
          fill="var(--color-text-primary)"
          style={{ fontSize: 8, fontWeight: 600 }}
        >
          {data.name}
        </text>
        <text
          x={0} y={9}
          textAnchor="middle"
          fill="var(--color-text-secondary)"
          style={{ fontSize: 9, fontWeight: 700 }}
        >
          {data.label ?? formatNumber(data.value)}
        </text>
      </g>
    );
  }

  // ── X/Y (with band) — tint bubble per traffic-light band ────────────
  if (data.format === 'X/Y' && data.band && data.band !== 'NA') {
    const colors = getBandColors(data.band);
    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer"
        role="img"
        aria-label={`${data.name} — ${data.label ?? formatNumber(data.value)}`}
      >
        <title>{`${data.name}: ${data.label ?? formatNumber(data.value)}`}</title>
        <rect
          x={-44} y={-14} width={88} height={28} rx={14}
          fill={colors.bg}
          stroke={colors.fg}
          strokeWidth={1.2}
          filter="url(#bubble-shadow)"
        />
        <circle cx={-30} cy={0} r={7} fill={colors.fg} />
        <text
          x={-30} y={3.5}
          textAnchor="middle"
          fill="white"
          style={{ fontSize: 8, fontWeight: 800 }}
        >
          %
        </text>
        <text
          x={-16} y={-3}
          fill={colors.text}
          style={{ fontSize: 8, fontWeight: 600 }}
        >
          {data.name}
        </text>
        <text
          x={-16} y={8}
          fill={colors.text}
          style={{ fontSize: 7 }}
        >
          {data.label ?? formatNumber(data.value)}
        </text>
      </g>
    );
  }

  // ── Legacy fallback — onTrack boolean ──────────────────────────────
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
      <rect
        x={-44} y={-14} width={88} height={28} rx={14}
        fill="white"
        stroke="var(--color-border)"
        strokeWidth={0.8}
        filter="url(#bubble-shadow)"
      />
      <circle cx={-30} cy={0} r={7} fill={statusColor} />
      <text
        x={-30} y={4}
        textAnchor="middle"
        fill="white"
        style={{ fontSize: 9, fontWeight: 700 }}
      >
        {statusIcon}
      </text>
      <text
        x={-16} y={-3}
        fill="var(--color-text-primary)"
        style={{ fontSize: 8, fontWeight: 600 }}
      >
        {data.name}
      </text>
      <text
        x={-16} y={8}
        fill="var(--color-text-secondary)"
        style={{ fontSize: 7 }}
      >
        {data.label ?? formatNumber(data.value)}
      </text>
    </g>
  );
}
