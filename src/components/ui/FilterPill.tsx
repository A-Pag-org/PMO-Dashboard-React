// FILE: src/components/ui/FilterPill.tsx
// PURPOSE: Glassy pill-shaped dropdown matching the Figma navy-bar
//          recipe — translucent outer capsule + label + 1 px separator
//          + white-gradient inner value chip + chevron. A native
//          <select> is layered invisibly on top so keyboard and screen-
//          reader users get the full OS-native dropdown experience.
//
// Variant:
//   · "onNavy"  (default) — drops onto the dark filter bar; label is
//                            white, chevron white.
//   · "onLight"            — for white-area placements (e.g. stacked
//                            under the trend graph on the map). The
//                            outer capsule keeps its glassy feel via
//                            a subtle white tint + border instead of
//                            the translucent grey, and the label /
//                            chevron switch to muted navy.

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPillProps {
  label: string;
  options: readonly string[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  displayValue?: string;
  disabled?: boolean;
  variant?: 'onNavy' | 'onLight';
  className?: string;
}

export default function FilterPill({
  label,
  options,
  value,
  onChange,
  placeholder,
  displayValue,
  disabled,
  variant = 'onNavy',
  className,
}: FilterPillProps) {
  const visibleText =
    displayValue ?? (value === '' && placeholder ? placeholder : value);

  const isLight = variant === 'onLight';

  return (
    <label
      className={cn(
        'relative inline-flex h-[38px] items-center rounded-full pl-[9px] pr-[6px]',
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
          'inline-flex h-[28px] max-w-[180px] items-center rounded-full px-3 font-["Roboto",sans-serif] text-[12px] font-semibold leading-[18px] text-[#2E4B8F]',
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
        {(options as string[])
          .filter((o) => o !== '')
          .map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
      </select>
    </label>
  );
}
