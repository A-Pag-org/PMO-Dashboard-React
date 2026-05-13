// FILE: src/components/ui/FilterPill.tsx
// PURPOSE: Glassy pill-shaped dropdown for the navy filter bar. Matches
//          the Figma recipe — translucent outer capsule + label + 1px
//          separator + white-gradient inner value chip + chevron. A
//          native <select> is layered invisibly on top so keyboard and
//          screen-reader users get the full OS-native dropdown
//          experience for free.

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPillProps {
  label: string;
  options: readonly string[] | string[];
  value: string;
  onChange: (value: string) => void;
  /**
   * Shown as the value chip text when `value` is empty, and rendered as
   * the leading `<option value="">` in the dropdown. Letting the caller
   * pass it keeps the empty-state copy meaningful ("All Delhi NCR")
   * rather than a literal blank.
   */
  placeholder?: string;
  /** Override the visible chip text without changing the dropdown options. */
  displayValue?: string;
  disabled?: boolean;
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
  className,
}: FilterPillProps) {
  const visibleText =
    displayValue ?? (value === '' && placeholder ? placeholder : value);

  return (
    <label
      className={cn(
        'relative inline-flex h-[38px] items-center rounded-full pl-[9px] pr-[6px]',
        '[background:rgba(193,193,193,0.32)] [box-shadow:inset_0_3px_20px_rgba(0,0,0,0.15)]',
        disabled ? 'opacity-60' : 'cursor-pointer',
        className,
      )}
      aria-label={label}
    >
      <span className="select-none whitespace-nowrap font-['Roboto',sans-serif] text-[12px] font-normal leading-[14px] tracking-[0.1px] text-white">
        {label}:
      </span>
      <span
        aria-hidden
        className="mx-[5px] h-[38px] w-px shrink-0 bg-[#F1F1F5]"
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
        className="ml-[6px] mr-[2px] h-[38px] w-px shrink-0 bg-[#F1F1F5]"
      />
      <ChevronDown
        className="ml-[4px] h-4 w-4 shrink-0 text-white/95"
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
