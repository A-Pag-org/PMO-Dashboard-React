// FILE: components/ui/MetricCard.tsx
// PURPOSE: Outcome metric card — icon, label, fraction, progress bar, drill-down icon
// DESIGN REF: Wireframe page 9 (right column — Outcome metrics section)

import { Info } from 'lucide-react';
import CompletionBar from './CompletionBar';
import { cn, formatNumber, getCompletionPercentage } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  achieved: number | null;
  target: number | null;
  barColorOverride?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export default function MetricCard({
  icon: Icon,
  label,
  achieved,
  target,
  selected = false,
  onSelect,
  className,
}: MetricCardProps) {
  const pct = getCompletionPercentage(target, achieved);
  const isInteractive = Boolean(onSelect);
  const Container = isInteractive ? 'button' : 'div';

  return (
    <Container
      type={isInteractive ? 'button' : undefined}
      onClick={onSelect}
      aria-pressed={isInteractive ? selected : undefined}
      className={cn(
        'relative rounded-lg border bg-white p-3',
        selected
          ? 'border-[var(--color-border-blue)] ring-1 ring-[var(--color-border-blue)]'
          : 'border-[var(--color-border)]',
        isInteractive &&
          'cursor-pointer transition-colors hover:bg-[var(--color-blue-pale)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-success-light)]">
          <Icon className="h-4 w-4 text-[var(--color-success)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight text-[var(--color-success)]">
            {label}
          </p>
          <p className="mt-1 text-right text-lg font-bold text-[var(--color-text-primary)]">
            {target
              ? `${formatNumber(achieved)}/${formatNumber(target)}`
              : formatNumber(achieved)}
          </p>
        </div>
      </div>
      <div className="mt-2">
        <CompletionBar value={pct} size="sm" />
      </div>
      <div className="absolute bottom-2 right-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-blue-pale)] text-[var(--color-blue-link)]">
          <Info className="h-3 w-3" />
        </span>
      </div>
    </Container>
  );
}
