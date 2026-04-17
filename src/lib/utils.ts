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
 * Formats a number using the Indian numeral system.
 * Examples: 191239 → "1,91,239"  |  15300 → "15,300"  |  500 → "500"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (value < 0) return `-${formatNumber(-value)}`;

  const str = Math.floor(value).toString();
  if (str.length <= 3) return str;

  const lastThree = str.slice(-3);
  const remaining = str.slice(0, -3);
  const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${formatted},${lastThree}`;
}

/**
 * Calculates completion percentage from target and achieved values.
 * Returns 0 if target is null/zero.
 */
export function getCompletionPercentage(target: number | null, achieved: number | null): number {
  if (!target || !achieved) return 0;
  return Math.round((achieved / target) * 100);
}
