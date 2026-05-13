// FILE: src/components/ui/ViewLevelPill.tsx
// PURPOSE: Glassy segmented pill for switching the map's drill-down
//          level (State / City / RTO). Shares the visual recipe used by
//          TimeRangePill so the right side of the navy filter bar stays
//          visually consistent.

import { cn } from '@/lib/utils';

interface ViewLevelPillProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  className?: string;
}

export default function ViewLevelPill<T extends string>({
  options,
  value,
  onChange,
  label = 'View',
  className,
}: ViewLevelPillProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex h-[38px] items-center gap-[4px] rounded-full px-[5px] [background:rgba(193,193,193,0.32)] [box-shadow:inset_0_3px_20px_rgba(0,0,0,0.15)]',
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = opt === value;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt)}
            className={cn(
              'inline-flex h-[28px] items-center justify-center whitespace-nowrap rounded-full px-3 font-["Roboto",sans-serif] text-[12px] leading-[18px] transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              isActive
                ? 'font-semibold text-[#2E4B8F] [background:linear-gradient(180deg,#ECECEC_20.59%,#FFFFFF_85.35%)]'
                : 'font-medium text-[#FFF6E8] hover:bg-white/10 [text-shadow:0_0_3px_rgba(0,0,0,0.15)]',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
