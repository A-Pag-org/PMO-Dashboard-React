// FILE: components/ui/MetricCard.tsx
// PURPOSE: Horizontal outcome/progress/readiness metric row shown on the Detailed view
// DESIGN REF: Wireframe pages 8-9 (right column, Outcome / Progress / Readiness metrics)
//
// Layout (per PDF):
//   [icon]   label (in blue)                              X/Y
//            [ in-bar percentage progress bar ]           (hand icon)
//
// When `target` is null, we display "Xx" on the right and omit the bar fill.

import { Hand } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, formatNumber, getBarColour, getCompletionPercentage } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  achieved: number | null;
  target: number | null;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  /** When true, the row renders with the "selected" blue highlight (for the first outcome metric). */
  highlight?: boolean;
}

export default function MetricCard({
  icon: Icon,
  label,
  achieved,
  target,
  selected = false,
  onSelect,
  className,
  highlight = false,
}: MetricCardProps) {
  const pct = getCompletionPercentage(target, achieved);
  const { filled, remainder } = getBarColour(pct);
  const isInteractive = Boolean(onSelect);
  const isSelected = selected || highlight;
  const Container = isInteractive ? 'button' : 'div';

  const rightValue = target == null ? 'Xx' : `${formatNumber(achieved)}/${formatNumber(target)}`;

  return (
    <Container
      type={isInteractive ? 'button' : undefined}
      onClick={onSelect}
      aria-pressed={isInteractive ? isSelected : undefined}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
        isSelected
          ? 'border-[var(--color-border-blue)] bg-[var(--color-blue-pale)]'
          : 'border-[var(--color-border-table)] bg-white',
        isInteractive &&
          'cursor-pointer hover:bg-[var(--color-blue-pale)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          isSelected ? 'bg-white' : 'bg-[var(--color-blue-pale)]',
        )}
      >
        <Icon className="h-5 w-5 text-[var(--color-blue-link)]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-xs font-semibold leading-tight text-[var(--color-blue-link)]">
            {label}
          </p>
          <span className="shrink-0 text-xs font-bold text-[var(--color-text-primary)]">
            {rightValue}
          </span>
        </div>

        {target != null ? (
          <div
            className="relative mt-1.5 h-4 w-full overflow-hidden rounded-sm"
            style={{ backgroundColor: remainder }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{ width: `${pct}%`, backgroundColor: filled }}
            />
            <span
              className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
              style={{ color: pct >= 35 ? '#0B2540' : '#111827' }}
            >
              {pct}%
            </span>
          </div>
        ) : (
          <div className="mt-1.5 h-4 w-full rounded-sm bg-[var(--color-surface-light)]" />
        )}
      </div>

      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-blue-link)] shadow-sm ring-1 ring-[var(--color-border-table)]">
        <Hand className="h-3 w-3" />
      </span>
    </Container>
  );
}
