// FILE: lib/utils.ts
// PURPOSE: Shared utility functions — className merge, colour thresholds, number formatting
// DESIGN REF: Used across all pages

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { COMPLETION_THRESHOLDS } from './constants';
import type { CompletionThreshold } from './types';

/**
 * Merge Tailwind classes with clsx + tailwind-merge for conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Returns the filled and remainder CSS colour variables for a given percentage.
 * Centralised threshold logic — used by every progress bar in the app.
 */
export function getBarColour(pct: number): { filled: string; remainder: string } {
  const clamped = Math.max(0, Math.min(100, pct));
  const threshold: CompletionThreshold =
    COMPLETION_THRESHOLDS.find((t) => clamped >= t.min && clamped <= t.max) ??
    COMPLETION_THRESHOLDS[COMPLETION_THRESHOLDS.length - 1];

  return {
    filled: threshold.filledColor,
    remainder: threshold.remainderColor,
  };
}

/**
 * Formats a number using the Indian numeral system (Lakh/Crore grouping).
 * Rounds to the nearest integer before formatting; decimals are dropped.
 * Examples: 191239 → "1,91,239"  |  15300.7 → "15,301"  |  500 → "500"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (value < 0) return `-${formatNumber(-value)}`;

  // Round to nearest integer — Indian formatting only shows whole numbers
  const rounded = Math.round(value);
  const str = rounded.toString();
  if (str.length <= 3) return str;

  const lastThree = str.slice(-3);
  const remaining = str.slice(0, -3);
  // Indian grouping: groups of 2 after the last 3 digits
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
