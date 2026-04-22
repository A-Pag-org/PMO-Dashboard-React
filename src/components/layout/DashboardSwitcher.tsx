// FILE: components/layout/DashboardSwitcher.tsx
// PURPOSE: Single prominent "Action-Plan Dashboard" tab in the top-right of
//          the Impact Dashboard header. One-click hop to the sibling app.
//          (AQI Dashboard link has been removed per product direction.)

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSwitcherProps {
  className?: string;
  /**
   * Optional override for the Action-Plan Dashboard target URL. Falls back
   * to `#` when not configured so the button stays visible in this repo.
   */
  actionPlanHref?: string;
}

export default function DashboardSwitcher({
  className,
  actionPlanHref = '#',
}: DashboardSwitcherProps) {
  return (
    <a
      href={actionPlanHref}
      className={cn(
        'inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--color-blue-header)] bg-[var(--color-blue-header)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors sm:text-sm',
        'hover:bg-[var(--color-navy-mid)] hover:border-[var(--color-navy-mid)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
        className,
      )}
      aria-label="Open Action-Plan Dashboard"
    >
      <span>Action-Plan Dashboard</span>
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}
