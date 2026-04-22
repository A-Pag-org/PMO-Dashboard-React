// FILE: components/layout/DashboardSwitcher.tsx
// PURPOSE: Prominent Action-Plan Dashboard tab in the top-right corner of the
//          Impact Dashboard, with a secondary AQI link for the future phase.
// DESIGN REF: Users land on the Impact Dashboard after sign-in and can hop
//          across to the Action-Plan Dashboard via this tab.

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSwitcherProps {
  className?: string;
}

export default function DashboardSwitcher({ className }: DashboardSwitcherProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <a
        href="#"
        className={cn(
          'inline-flex min-h-[32px] items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
          'bg-[var(--color-accent)] text-[var(--color-ink)]',
          'hover:brightness-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)]',
        )}
        aria-label="Open Action-Plan Dashboard"
      >
        <span>Action-Plan Dashboard</span>
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
      <span
        className="hidden text-[10px] text-white/45 sm:inline"
        title="AQI Dashboard integration is planned for a later phase"
      >
        AQI Dashboard (later)
      </span>
    </div>
  );
}
