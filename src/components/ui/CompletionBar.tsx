// FILE: components/ui/CompletionBar.tsx
// PURPOSE: Horizontal progress bar with threshold-based colour logic
// DESIGN REF: Wireframe pages 7–10 (used in initiative cards, table rows, metric cards)


import { motion, useReducedMotion } from 'framer-motion';
import { getBarColour } from '@/lib/utils';

interface CompletionBarProps {
  value: number;
  target?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function CompletionBar({
  value,
  showLabel = false,
  size = 'md',
}: CompletionBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const { filled, remainder } = getBarColour(clamped);
  const shouldReduceMotion = useReducedMotion();

  const height = size === 'sm' ? 'h-2' : 'h-3';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-full ${height}`}
        style={{ backgroundColor: remainder }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clamped}% complete`}
      >
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${height}`}
          style={{ backgroundColor: filled }}
          initial={{ width: shouldReduceMotion ? `${clamped}%` : '0%' }}
          animate={{ width: `${clamped}%` }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.6, ease: 'easeOut' }
          }
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-sm font-semibold text-[var(--color-text-primary)]">
          {clamped}%
        </span>
      )}
    </div>
  );
}
