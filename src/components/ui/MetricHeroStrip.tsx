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
  const isCentral = metric.geographyLevel === 'central';
  const lowestLevel = metric.lowestLevelLabel;
  const freqLabel =
    metric.format === 'Y/N'
      ? 'Yes/No status'
      : frequency === 'overall'
      ? 'Cumulative only'
      : 'Updated monthly';
  const drillLabel = isCentral
    ? 'No regional split'
    : lowestLevel === 'State'
    ? 'By state'
    : lowestLevel
    ? `Drills to ${lowestLevel}`
    : undefined;
  const metadata = [freqLabel, drillLabel].filter(Boolean) as string[];

  const headline =
    displayText ??
    (metric.format === 'X/Y'
      ? `${formatNumber(achievedForBand)} / ${formatNumber(targetForBand)}`
      : metric.format === 'Xx'
      ? formatNumber(achievedForBand)
      : achievedForBand === 1
      ? 'Yes'
      : 'No');

  const pct =
    metric.format === 'X/Y'
      ? getCompletionPercentage(targetForBand, achievedForBand)
      : null;
  const friendlyPeriod = periodLabel ?? 'All months to date';

  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-md border border-[var(--color-border-table)] bg-white px-4 py-3">
      <div className="flex items-baseline gap-3">
        <span
          className="text-2xl font-bold leading-none tabular-nums text-[var(--color-text-primary)]"
          title="Latest reported value for the selected scope."
        >
          {headline}
        </span>
        {pct != null ? (
          <span className="text-sm font-bold tabular-nums text-[var(--color-text-secondary)]">
            {pct}%
          </span>
        ) : null}
        {band ? (
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: band.bg, color: band.text }}
            title={
              band.label === 'On track'
                ? 'At or above 60% of target.'
                : band.label === 'At risk'
                ? '30–60% of target — watch closely.'
                : band.label === 'Behind'
                ? 'Below 30% of target — falling behind.'
                : undefined
            }
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

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
        <span className="font-semibold text-[var(--color-text-primary)]">
          {scopeLabel}
        </span>
        {scopeChain.length > 0 ? (
          <span className="text-[var(--color-text-muted)]">
            ({scopeChain.join(' › ')})
          </span>
        ) : null}
        <span className="text-[var(--color-text-muted)]">·</span>
        <span title="Active reporting period.">{friendlyPeriod}</span>
        <span className="text-[var(--color-text-muted)]">·</span>
        <span
          className="text-[var(--color-text-muted)]"
          title="How often the metric is updated, and the lowest geography it splits by."
        >
          {metadata.join(' · ')}
        </span>
      </div>
    </div>
  );
}
