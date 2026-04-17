// FILE: components/ui/AverageOval.tsx
// PURPOSE: Oval badge showing average completion — Delhi-NCR avg / State avg / City avg
// DESIGN REF: Wireframe page 9 (below map — 3 oval badges)

import { cn } from '@/lib/utils';

interface AverageOvalProps {
  label: string;
  value: string;
  visible?: boolean;
  className?: string;
}

export default function AverageOval({
  label,
  value,
  visible = true,
  className,
}: AverageOvalProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-light)] px-4 py-1.5 shadow-sm',
        className,
      )}
    >
      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-xs font-bold text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}
