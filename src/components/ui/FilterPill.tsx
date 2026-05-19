// FILE: src/components/ui/FilterPill.tsx
// PURPOSE: Glassy pill-shaped dropdown matching the Figma navy-bar
//          recipe — translucent outer capsule + label + 1 px separator
//          + white-gradient inner value chip + chevron. A native
//          <select> is layered invisibly on top so keyboard and screen-
//          reader users get the full OS-native dropdown experience.
//
// Variants:
//   · "onNavy"  (default) — drops onto the dark filter bar; label is
//                            white, chevron white.
//   · "onLight"            — for white-area placements. Subtle border
//                            + white background instead of the glassy
//                            grey; label and chevron switch to muted
//                            navy.
//
// Compact mode (`compact={true}`) collapses the pill to just the
// label and the chevron — no colon, no separator, no value chip.
// A small accent dot appears next to the label when a value is
// actually selected so the user can tell at a glance whether the
// filter is in use.

import type React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterPillGroup {
  /** Header rendered as a native <optgroup> in the dropdown. */
  label: string;
  options: readonly string[] | string[];
}

interface FilterPillProps {
  label: string;
  /** Flat options. Ignored when `groups` is provided. */
  options?: readonly string[] | string[];
  /** Grouped options, rendered as <optgroup> sections. Overrides `options`. */
  groups?: readonly FilterPillGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  displayValue?: string;
  disabled?: boolean;
  variant?: 'onNavy' | 'onLight';
  /** Label-only mode: render just the label + chevron. */
  compact?: boolean;
  className?: string;
}

export default function FilterPill({
  label,
  options,
  groups,
  value,
  onChange,
  placeholder,
  displayValue,
  disabled,
  variant = 'onNavy',
  compact = false,
  className,
}: FilterPillProps) {
  const visibleText =
    displayValue ?? (value === '' && placeholder ? placeholder : value);

  const isLight = variant === 'onLight';
  const hasValue = value !== '';

  if (compact) {
    return (
      <label
        className={cn(
          'relative flex h-[38px] w-fit items-center gap-[6px] rounded-full px-[14px]',
          isLight
            ? 'border border-[var(--color-border)] bg-white shadow-sm'
            : '[background:rgba(193,193,193,0.32)] [box-shadow:inset_0_3px_20px_rgba(0,0,0,0.15)]',
          disabled ? 'opacity-60' : 'cursor-pointer',
          className,
        )}
        aria-label={label}
        title={hasValue ? `${label}: ${visibleText}` : label}
      >
        <span
          className={cn(
            "select-none whitespace-nowrap font-['Roboto',sans-serif] text-[12px] font-semibold leading-[18px]",
            isLight ? 'text-[var(--color-text-secondary)]' : 'text-white',
          )}
        >
          {label}
        </span>
        {hasValue ? (
          <span
            aria-hidden
            className={cn(
              'inline-block h-[6px] w-[6px] shrink-0 rounded-full',
              isLight ? 'bg-[var(--color-blue-link)]' : 'bg-[#DDE624]',
            )}
            title={visibleText}
          />
        ) : null}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0',
            isLight ? 'text-[var(--color-text-secondary)]' : 'text-white/95',
          )}
          aria-hidden
        />

        <select
          aria-label={label}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        >
          {placeholder !== undefined ? (
            <option value="">{placeholder}</option>
          ) : null}
          {renderSelectChildren(options, groups)}
        </select>
      </label>
    );
  }

  return (
    <label
      className={cn(
        'relative flex h-[38px] w-fit items-center rounded-full pl-[9px] pr-[6px]',
        isLight
          ? 'border border-[var(--color-border)] bg-white shadow-sm'
          : '[background:rgba(193,193,193,0.32)] [box-shadow:inset_0_3px_20px_rgba(0,0,0,0.15)]',
        disabled ? 'opacity-60' : 'cursor-pointer',
        className,
      )}
      aria-label={label}
    >
      <span
        className={cn(
          "select-none whitespace-nowrap font-['Roboto',sans-serif] text-[12px] font-normal leading-[14px] tracking-[0.1px]",
          isLight ? 'text-[var(--color-text-secondary)]' : 'text-white',
        )}
      >
        {label}:
      </span>
      <span
        aria-hidden
        className={cn(
          'mx-[5px] h-[38px] w-px shrink-0',
          isLight ? 'bg-[var(--color-border)]' : 'bg-[#F1F1F5]',
        )}
      />
      <span
        className={cn(
          'flex h-[28px] min-w-0 flex-1 items-center rounded-full px-3 font-["Roboto",sans-serif] text-[12px] font-semibold leading-[18px] text-[#2E4B8F]',
          '[background:linear-gradient(180deg,#ECECEC_20.59%,#FFFFFF_85.35%)]',
        )}
      >
        <span className="truncate">{visibleText}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          'ml-[6px] mr-[2px] h-[38px] w-px shrink-0',
          isLight ? 'bg-[var(--color-border)]' : 'bg-[#F1F1F5]',
        )}
      />
      <ChevronDown
        className={cn(
          'ml-[4px] h-4 w-4 shrink-0',
          isLight ? 'text-[var(--color-text-secondary)]' : 'text-white/95',
        )}
        aria-hidden
      />

      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      >
        {placeholder !== undefined ? (
          <option value="">{placeholder}</option>
        ) : null}
        {renderSelectChildren(options, groups)}
      </select>
    </label>
  );
}

function renderSelectChildren(
  options: readonly string[] | string[] | undefined,
  groups: readonly FilterPillGroup[] | undefined,
): React.ReactNode {
  if (groups && groups.length > 0) {
    return groups.map((g) => (
      <optgroup key={g.label} label={g.label}>
        {(g.options as string[])
          .filter((o) => o !== '')
          .map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
      </optgroup>
    ));
  }
  return ((options ?? []) as string[])
    .filter((o) => o !== '')
    .map((opt) => (
      <option key={opt} value={opt}>
        {opt}
      </option>
    ));
}
