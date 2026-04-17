// FILE: components/ui/ViewToggle.tsx
// PURPOSE: Segmented control toggle — used for Map/Table and State/City/RTO views
// DESIGN REF: Wireframe page 7 (Map/Table toggle), page 9 (State/City/RTO toggle)


import { cn } from '@/lib/utils';

interface ViewToggleProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: ViewToggleProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex overflow-hidden rounded-md border border-[var(--color-border-table)]',
        className,
      )}
      role="radiogroup"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
          className={cn(
            'min-h-[44px] px-4 py-2 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
            option === value
              ? 'bg-[var(--color-navy)] text-[var(--color-text-white)]'
              : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-light)]',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
