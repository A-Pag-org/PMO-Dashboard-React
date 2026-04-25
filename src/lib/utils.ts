// FILE: lib/utils.ts
// PURPOSE: Shared utility functions — className merge, traffic-light color
//          logic, number formatting, completion %.
// DESIGN REF: Spec §8 — Color Coding Logic

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ColorBand } from './types';

/**
 * Merge Tailwind classes with clsx + tailwind-merge for conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Spec §8.1 — getColorBand(completionPct, isInverse).
 * Standard:  <30 RED · 30-60 YELLOW · ≥60 GREEN
 * Inverse:   ≥60 RED · 30-60 YELLOW · <30 GREEN
 */
export function getColorBand(
  completionPct: number,
  isInverse = false,
): Exclude<ColorBand, 'NA'> {
  const pct = Math.max(0, Math.min(100, completionPct));
  if (isInverse) {
    if (pct >= 60) return 'RED';
    if (pct >= 30) return 'YELLOW';
    return 'GREEN';
  }
  if (pct < 30) return 'RED';
  if (pct < 60) return 'YELLOW';
  return 'GREEN';
}

export interface BandColors {
  /** Light tint — used as background fill / progress remainder. */
  bg: string;
  /** Saturated color — used as progress fill / border / dot. */
  fg: string;
  /** Dark variant — used for text on top of the light bg. */
  text: string;
}

/**
 * Spec §8.2 — exact hex codes for each band.
 */
export function getBandColors(band: Exclude<ColorBand, 'NA'>): BandColors {
  switch (band) {
    case 'GREEN':
      return { bg: '#E2EFDA', fg: '#70AD47', text: '#375623' };
    case 'YELLOW':
      return { bg: '#FFF2CC', fg: '#FFD966', text: '#7D4E00' };
    case 'RED':
      return { bg: '#FCE4D6', fg: '#FF0000', text: '#9C0006' };
  }
}

/**
 * Returns the filled and remainder colors for a progress bar / donut.
 * Backwards-compatible signature kept for existing components.
 */
export function getBarColour(
  pct: number,
  isInverse = false,
): { filled: string; remainder: string } {
  const band = getColorBand(pct, isInverse);
  const colors = getBandColors(band);
  return { filled: colors.fg, remainder: colors.bg };
}

/**
 * Formats a number using the Indian numeral system (Lakh/Crore grouping).
 * Rounds to the nearest integer before formatting; decimals are dropped.
 * Examples: 191239 → "1,91,239"  |  15300.7 → "15,301"  |  500 → "500"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (value < 0) return `-${formatNumber(-value)}`;

  const rounded = Math.round(value);
  const str = rounded.toString();
  if (str.length <= 3) return str;

  const lastThree = str.slice(-3);
  const remaining = str.slice(0, -3);
  const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${formatted},${lastThree}`;
}

/**
 * Calculates completion percentage from target and achieved values.
 * Returns 0 if target is null/zero/undefined.
 * Returns 0 if achieved is null/undefined (treats missing data as no progress).
 * Clamps output to [0, 100].
 */
export function getCompletionPercentage(
  target: number | null | undefined,
  achieved: number | null | undefined,
): number {
  if (target == null || target === 0) return 0;
  if (achieved == null) return 0;
  return Math.max(0, Math.min(100, Math.round((achieved / target) * 100)));
}
