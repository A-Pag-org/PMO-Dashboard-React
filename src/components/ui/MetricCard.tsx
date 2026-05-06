// FILE: components/ui/MetricCard.tsx
// PURPOSE: Right-rail metric row on the Detailed View (spec §4 + §5).
// Layout:  [icon]  label                                X / Y
//                  [progress bar / Y-N badge / big count]
//
// Format-aware (spec §4.5 + §6.3):
//   X/Y standard / inverse → progress bar tinted by traffic-light band
//   Xx (absolute count)    → big bold count + period-delta marker
//                            (Refinement 4 — replaces the previous
//                            "Absolute count" empty bar)
//   Y/N (boolean)          → "YES" (green) or "NO" (red) pill

import { ArrowDown, ArrowUp, Hand, Minus } from 'lucide-react';
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
  /**
   * Refinement 4 — `achieved` value at the end of the previous
   * reporting period. When present (only meaningful for Xx metrics),
   * a month-on-month delta marker is rendered next to the big count.
   */
  previousAchieved?: number | null;
  format?: MetricFormat;
  isInverse?: boolean;
  /** Optional override for the denominator label, e.g. "Total Sites". */
  denominatorLabel?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  highlight?: boolean;
  /** Outcome rows render slightly larger / bolder per spec hierarchy. */
  prominent?: boolean;
}

export default function MetricCard({
  icon: Icon,
  label,
  achieved,
  target,
  previousAchieved,
  format = 'X/Y',
  isInverse = false,
  denominatorLabel,
  selected = false,
  onSelect,
  className,
  highlight = false,
  prominent = false,
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
        'relative flex w-full items-center gap-3 rounded-md border-l-4 border-y border-r px-3 text-left transition-colors',
        prominent ? 'py-2.5' : 'py-2',
        isSelected
          ? 'border-l-[var(--color-blue-link)] border-y-[var(--color-border-blue)] border-r-[var(--color-border-blue)] bg-[var(--color-blue-pale)]'
          : prominent
          ? 'border-l-[var(--color-accent)] border-y-[var(--color-border-table)] border-r-[var(--color-border-table)] bg-white'
          : 'border-l-[var(--color-border-table)] border-y-[var(--color-border-table)] border-r-[var(--color-border-table)] bg-white',
        isInteractive &&
          'cursor-pointer hover:bg-[var(--color-blue-pale)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        className,
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md',
          prominent ? 'h-10 w-10' : 'h-9 w-9',
          isSelected ? 'bg-white' : 'bg-[var(--color-blue-pale)]',
        )}
      >
        <Icon className={cn(prominent ? 'h-5 w-5' : 'h-5 w-5', 'text-[var(--color-blue-link)]')} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              'truncate font-semibold leading-tight text-[var(--color-blue-link)]',
              prominent ? 'text-sm' : 'text-xs',
            )}
          >
            {label}
            {isInverse ? (
              <span className="ml-1 rounded bg-[var(--color-tl-red-bg)] px-1 py-px text-[8px] font-bold uppercase text-[var(--color-tl-red-text)]">
                Inverse
              </span>
            ) : null}
          </p>
          {/* Refinement 4 — Xx metrics drop the small right-side
              value; the count is rendered larger inside the row body. */}
          {format !== 'Xx' ? (
            <RightValue
              format={format}
              achieved={achieved}
              target={target}
              isInverse={isInverse}
              denominatorLabel={denominatorLabel}
            />
          ) : null}
        </div>

        <Visual
          format={format}
          achieved={achieved}
          target={target}
          previousAchieved={previousAchieved}
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
  denominatorLabel,
}: {
  format: MetricFormat;
  achieved: number | null;
  target: number | null;
  isInverse: boolean;
  denominatorLabel?: string;
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
  const denomTitle = denominatorLabel ? `${denominatorLabel}: ${formatNumber(target)}` : undefined;
  return (
    <span
      className="shrink-0 rounded px-1.5 py-px text-xs font-bold tabular-nums"
      style={{ color: colors.text }}
      title={denomTitle}
    >
      {formatNumber(achieved)} / {formatNumber(target)}
    </span>
  );
}

function Visual({
  format,
  achieved,
  target,
  previousAchieved,
  isInverse,
}: {
  format: MetricFormat;
  achieved: number | null;
  target: number | null;
  previousAchieved?: number | null;
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
    // Refinement 4 — replace the empty "Absolute count" bar with a
    // bigger, bolder count and (when previous-period data is
    // available) a month-on-month delta marker.
    return (
      <AbsoluteCount achieved={achieved} previousAchieved={previousAchieved} />
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

/**
 * Refinement 4 — absolute-count display for Xx metrics. Renders the
 * count itself in a larger / bolder font, and (when a previous-period
 * value is provided) a small month-on-month delta marker below.
 *
 *   1,234       <- big count
 *   ▲ 50 vs last month   <- delta (only if previousAchieved is set)
 *
 * Direction colours follow GREEN-up / RED-down for general metrics; an
 * inverse interpretation is intentionally NOT applied here because the
 * metric's own `isInverse` flag governs its X/Y banding, not the
 * desirability of an Xx count change. The product team can layer that
 * on later via a per-metric "increase is bad" flag if required.
 */
function AbsoluteCount({
  achieved,
  previousAchieved,
}: {
  achieved: number | null;
  previousAchieved?: number | null;
}) {
  const hasPrevious =
    previousAchieved !== undefined &&
    previousAchieved !== null &&
    achieved !== null &&
    achieved !== undefined;
  const delta = hasPrevious ? (achieved as number) - (previousAchieved as number) : 0;
  const direction: 'up' | 'down' | 'flat' = !hasPrevious
    ? 'flat'
    : delta > 0
    ? 'up'
    : delta < 0
    ? 'down'
    : 'flat';
  const colors = getBandColors(
    direction === 'up' ? 'GREEN' : direction === 'down' ? 'RED' : 'YELLOW',
  );
  const Arrow = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  return (
    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <span
        className="text-2xl font-bold leading-none tabular-nums text-[var(--color-text-primary)]"
        aria-label="Absolute count"
      >
        {achieved == null ? '—' : formatNumber(achieved)}
      </span>
      {hasPrevious ? (
        <span
          className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
          }}
          title={`Previous period: ${formatNumber(previousAchieved as number)}`}
        >
          <Arrow className="h-3 w-3" aria-hidden style={{ color: colors.fg }} />
          {direction === 'flat' ? (
            <>No change vs last month</>
          ) : (
            <>
              {direction === 'up' ? '+' : '−'}
              {formatNumber(Math.abs(delta))} vs last month
            </>
          )}
        </span>
      ) : null}
    </div>
  );
}
