// FILE: components/ui/MetricCard.tsx
// PURPOSE: Right-rail metric row on the Detailed View (spec §4 + §5).
// Layout:  [icon]  label                                X / Y
//                  [progress bar / Y-N badge / Xx box]
//
// Format-aware (spec §4.5 + §6.3):
//   X/Y standard / inverse → progress bar tinted by traffic-light band
//   Xx (absolute count)    → no bar / no %, "Xx" badge
//   Y/N (boolean)          → "YES" (green) or "NO" (red) pill

import { Hand } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  cn,
  formatNumber,
  getBandColors,
  getBarColour,
  getColorBand,
  getCompletionPercentage,
} from '@/lib/utils';
import type { MetricFormat } from '@/lib/types';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  achieved: number | null;
  target: number | null;
  format?: MetricFormat;
  isInverse?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  highlight?: boolean;
}

export default function MetricCard({
  icon: Icon,
  label,
  achieved,
  target,
  format = 'X/Y',
  isInverse = false,
  selected = false,
  onSelect,
  className,
  highlight = false,
}: MetricCardProps) {
  const isInteractive = Boolean(onSelect);
  const isSelected = selected || highlight;
  const Container = isInteractive ? 'button' : 'div';

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
            {isInverse ? (
              <span className="ml-1 rounded bg-[var(--color-tl-red-bg)] px-1 py-px text-[8px] font-bold uppercase text-[var(--color-tl-red-text)]">
                Inverse
              </span>
            ) : null}
          </p>
          <RightValue
            format={format}
            achieved={achieved}
            target={target}
            isInverse={isInverse}
          />
        </div>

        <Visual
          format={format}
          achieved={achieved}
          target={target}
          isInverse={isInverse}
        />
      </div>

      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-blue-link)] shadow-sm ring-1 ring-[var(--color-border-table)]">
        <Hand className="h-3 w-3" />
      </span>
    </Container>
  );
}

function RightValue({
  format,
  achieved,
  target,
  isInverse,
}: {
  format: MetricFormat;
  achieved: number | null;
  target: number | null;
  isInverse: boolean;
}) {
  if (format === 'Y/N') {
    const isYes = achieved === 1;
    const colors = getBandColors(isYes ? 'GREEN' : 'RED');
    return (
      <span
        className="shrink-0 rounded px-1.5 py-px text-[10px] font-bold uppercase"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {isYes ? 'Y' : 'N'}
      </span>
    );
  }
  if (format === 'Xx') {
    return (
      <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
        {achieved == null ? '—' : formatNumber(achieved)}
      </span>
    );
  }
  // X/Y
  const pct = getCompletionPercentage(target, achieved);
  const band = getColorBand(pct, isInverse);
  const colors = getBandColors(band);
  return (
    <span
      className="shrink-0 rounded px-1.5 py-px text-xs font-bold tabular-nums"
      style={{ color: colors.text }}
    >
      {formatNumber(achieved)} / {formatNumber(target)}
    </span>
  );
}

function Visual({
  format,
  achieved,
  target,
  isInverse,
}: {
  format: MetricFormat;
  achieved: number | null;
  target: number | null;
  isInverse: boolean;
}) {
  if (format === 'Y/N') {
    const isYes = achieved === 1;
    const colors = getBandColors(isYes ? 'GREEN' : 'RED');
    return (
      <div
        className="mt-1.5 flex h-4 w-full items-center justify-center rounded-sm text-[10px] font-bold uppercase"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {isYes ? 'YES' : 'NO'}
      </div>
    );
  }
  if (format === 'Xx') {
    return (
      <div className="mt-1.5 flex h-4 w-full items-center justify-center rounded-sm bg-[var(--color-surface-light)] text-[10px] font-medium text-[var(--color-text-muted)]">
        Absolute count
      </div>
    );
  }
  // X/Y — progress bar with traffic-light band
  const pct = getCompletionPercentage(target, achieved);
  const { filled, remainder } = getBarColour(pct, isInverse);
  return (
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
  );
}
