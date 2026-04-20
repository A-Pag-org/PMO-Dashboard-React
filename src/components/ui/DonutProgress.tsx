// FILE: components/ui/DonutProgress.tsx
// PURPOSE: Donut / ring progress indicator used on Summary page initiative cards
// DESIGN REF: Wireframe page 7 — e.g. Road Repair 73%, C&D-ICCC 90%, Greening 90%

import { motion, useReducedMotion } from 'framer-motion';
import { getBarColour } from '@/lib/utils';

interface DonutProgressProps {
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
  sublabel?: string;
}

export default function DonutProgress({
  value,
  size = 96,
  thickness = 12,
  label,
  sublabel,
}: DonutProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const { filled, remainder } = getBarColour(clamped);
  const shouldReduceMotion = useReducedMotion();

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size }}
      role="img"
      aria-label={`${label ?? 'Progress'}: ${clamped}% complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={remainder}
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={filled}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: shouldReduceMotion ? dashOffset : circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.8, ease: 'easeOut' }
          }
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold text-[var(--color-text-primary)]"
          style={{ fontSize: Math.max(12, size * 0.22) }}
        >
          {clamped}%
        </span>
      </div>

      {sublabel ? (
        <p className="mt-1 text-2xs font-medium text-[var(--color-text-secondary)]">
          {sublabel}
        </p>
      ) : null}
    </div>
  );
}
