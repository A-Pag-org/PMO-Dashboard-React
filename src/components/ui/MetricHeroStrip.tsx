// FILE: src/components/ui/MetricHeroStrip.tsx
// PURPOSE: Compact KPI strip above the ranking/trend panels on the Detail
//          page. Replaces the centre "bubble" that used to sit in the
//          middle of the map. Renders the selected metric's headline
//          value, the scope (Delhi-NCR or selected geography), and a
//          traffic-light band chip so senior officials can read the
//          current status at a glance.

import { formatNumber, getBandColors, getColorBand, getCompletionPercentage } from '@/lib/utils';
import type { Metric } from '@/lib/types';
import type { AreaFilterValue } from '@/lib/useDetailFilters';

interface MetricHeroStripProps {
  metric: Metric | undefined;
  area: AreaFilterValue;
  /** Pre-computed scope label (e.g. "Delhi-NCR", "Haryana", "Gurugram"). */
  scopeLabel: string;
  /** Pre-formatted display text for the headline value. */
  displayText?: string;
  /** Used to colour the band chip + bottom rule. */
  achievedForBand: number | null;
  targetForBand: number | null;
  /**
   * Human label for the active reporting period, e.g. "Overall",
   * "May '26", "May '26 + 2 more". When supplied, rendered as a chip
   * so officials always see which time slice is in effect.
   */
  periodLabel?: string;
}

function bandFor(
  metric: Metric | undefined,
  achieved: number | null,
  target: number | null,
): { label: string; color: string; bg: string; text: string } | null {
  if (!metric) return null;
  if (metric.format === 'Y/N') {
    const isYes = achieved === 1;
    const colors = getBandColors(isYes ? 'GREEN' : 'RED');
    return {
      label: isYes ? 'Yes' : 'No',
      color: colors.fg,
      bg: colors.bg,
      text: colors.text,
    };
  }
  if (metric.format === 'X/Y') {
    const pct = getCompletionPercentage(target, achieved);
    const band = getColorBand(pct, metric.isInverse);
    const colors = getBandColors(band);
    return {
      label: band === 'GREEN' ? 'On track' : band === 'YELLOW' ? 'At risk' : 'Behind',
      color: colors.fg,
      bg: colors.bg,
      text: colors.text,
    };
  }
  return null;
}

export default function MetricHeroStrip({
  metric,
  area,
  scopeLabel,
  displayText,
  achievedForBand,
  targetForBand,
  periodLabel,
}: MetricHeroStripProps) {
  if (!metric) return null;

  const band = bandFor(metric, achievedForBand, targetForBand);
  const scopeChain = [area.state, area.city, area.rto].filter(Boolean) as string[];

  // Tracking-frequency derivation per spec — Y/N is implicitly overall;
  // X/Y and Xx default to monthly unless explicitly flagged 'overall'.
  const frequency =
    metric.trackingFrequency ?? (metric.format === 'Y/N' ? 'overall' : 'monthly');
  const lowestLevel = metric.lowestLevelLabel;
  const metadata: string[] = [];
  metadata.push(frequency === 'overall' ? 'Overall' : 'Monthly');
  if (lowestLevel) metadata.push(lowestLevel);

  const headline =
    displayText ??
    (metric.format === 'X/Y'
      ? `${formatNumber(achievedForBand)} / ${formatNumber(targetForBand)}`
      : metric.format === 'Xx'
      ? formatNumber(achievedForBand)
      : achievedForBand === 1
      ? 'Yes'
      : 'No');

  return (
    <div className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 rounded-md border border-[var(--color-border-table)] bg-white px-4 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Current
        </span>
        <span className="text-xl font-bold leading-none tabular-nums text-[var(--color-text-primary)]">
          {headline}
        </span>
        {metric.format === 'X/Y' ? (
          <span className="text-xs font-bold tabular-nums text-[var(--color-text-secondary)]">
            ({getCompletionPercentage(targetForBand, achievedForBand)}%)
          </span>
        ) : null}
      </div>

      <div className="h-4 w-px bg-[var(--color-border-table)]" aria-hidden />

      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Scope
        </span>
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          {scopeLabel}
        </span>
        {scopeChain.length > 0 ? (
          <span className="text-[11px] text-[var(--color-text-muted)]">
            ({scopeChain.join(' › ')})
          </span>
        ) : null}
      </div>

      <span
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-table)] bg-[var(--color-surface-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
        title="Tracking frequency · Lowest geographic level"
      >
        {metadata.join(' · ')}
      </span>

      {periodLabel ? (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-blue)] bg-[var(--color-blue-pale)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-blue-link)]"
          title="Active reporting period"
        >
          {periodLabel}
        </span>
      ) : null}

      {band ? (
        <span
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: band.bg, color: band.text }}
        >
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: band.color }}
          />
          {band.label}
        </span>
      ) : null}
    </div>
  );
}
