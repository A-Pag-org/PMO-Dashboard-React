// FILE: src/components/layout/BottomBar.tsx
// PURPOSE: Optional sticky footer action bar for the dashboard pages.
//          Provides contextual actions (e.g. "Download report", "See all data")
//          that float above the page content on smaller screens where the
//          side panel is hidden.
//
// Referenced in README but absent from the original implementation.
// Kept intentionally minimal — add actions via the `actions` prop.

import { cn } from '@/lib/utils';

export interface BottomBarAction {
  label: string;
  onClick: () => void;
  /** Visual variant — primary gets the accent colour, secondary is outlined. */
  variant?: 'primary' | 'secondary';
  /** Optional accessible label for icon-only buttons. */
  ariaLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface BottomBarProps {
  actions: BottomBarAction[];
  /** Optional descriptive text shown on the left side of the bar. */
  contextLabel?: string;
  className?: string;
}

/**
 * Sticky footer bar rendered at the bottom of a page.
 * Only renders when `actions` is non-empty so callers don't need
 * conditional rendering at the page level.
 */
export default function BottomBar({
  actions,
  contextLabel,
  className,
}: BottomBarProps) {
  if (actions.length === 0) return null;

  return (
    <footer
      className={cn(
        'shrink-0 border-t border-[var(--color-border)] bg-white px-4 py-2 sm:px-6',
        'flex items-center justify-between gap-3',
        className,
      )}
      aria-label="Page actions"
    >
      {contextLabel ? (
        <p className="truncate text-xs text-[var(--color-text-secondary)]">
          {contextLabel}
        </p>
      ) : (
        /* Spacer so actions always sit on the right */
        <span aria-hidden />
      )}

      <div className="flex shrink-0 items-center gap-2">
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.ariaLabel ?? action.label}
            className={cn(
              'inline-flex min-h-[36px] items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              action.variant === 'primary'
                ? [
                    'bg-[var(--color-navy)] text-white',
                    'hover:bg-[var(--color-navy-mid)]',
                  ]
                : [
                    'border border-[var(--color-border-table)] bg-white text-[var(--color-text-primary)]',
                    'hover:bg-[var(--color-surface-light)]',
                  ],
            )}
          >
            {action.icon ? (
              <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
                {action.icon}
              </span>
            ) : null}
            {action.label}
          </button>
        ))}
      </div>
    </footer>
  );
}
