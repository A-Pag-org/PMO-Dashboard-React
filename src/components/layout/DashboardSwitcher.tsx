// FILE: components/layout/DashboardSwitcher.tsx
// PURPOSE: Single prominent "Go to Action-plan Dashboard" tab in the
//          top-right of the Impact Dashboard header (spec NAV_002).
//          One-click hop to the sibling app. Auth is shared via the
//          existing `auth` cookie when the target is on the same domain.
//          (AQI Dashboard link has been removed per product direction.)

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSwitcherProps {
  className?: string;
  /**
   * Optional override for the Action-Plan Dashboard target URL. Falls back
   * to the `VITE_ACTION_PLAN_URL` env var, then to `#` when neither is
   * configured so the button stays visible in this repo.
   */
  actionPlanHref?: string;
}

// Vite injects VITE_* env vars at build time. Read defensively in case
// the env block is undefined in non-browser test contexts.
const DEFAULT_HREF: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_ACTION_PLAN_URL ?? '#';

export default function DashboardSwitcher({
  className,
  actionPlanHref = DEFAULT_HREF,
}: DashboardSwitcherProps) {
  return (
    <a
      href={actionPlanHref}
      className={cn(
        "inline-flex h-9 items-center gap-[6px] rounded-[4px] bg-[#2E4B8F] px-4 py-[9px] font-['Poppins',sans-serif] text-[12px] font-medium leading-[18px] text-white transition-colors",
        'hover:bg-[var(--color-navy-mid)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
        className,
      )}
      aria-label="Go to Action-plan Dashboard"
    >
      <span>Go to Action-plan Dashboard</span>
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}
