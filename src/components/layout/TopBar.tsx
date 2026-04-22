// FILE: src/components/layout/TopBar.tsx
// PURPOSE: Persistent top bar for senior-government users.
//   - Left: hamburger menu (opens the SidePanel drawer) + brand + page title.
//   - Right: prominent "Action-Plan Dashboard" tab + Sign out.
//
// Design rationale:
//   Users expect a Clean-Air-Dashboard-style layout: a single clean header
//   with a hamburger on the far left that opens the page list as a drawer,
//   and a one-click jump to the sibling Action-Plan Dashboard on the right.
//   The previous horizontal tab row and the redundant orange page-title pill
//   have been removed in favour of this pattern.

import { useState } from 'react';
import { Menu } from 'lucide-react';
import SidePanel from './SidePanel';
import DashboardSwitcher from './DashboardSwitcher';
import { cn } from '@/lib/utils';

export type ActivePage = 'summary' | 'detail' | 'all-data' | 'upload';

interface TopBarProps {
  /** Kept for API compatibility — the SidePanel derives active state from the URL. */
  activePage?: ActivePage;
  /** Kept for API compatibility — no longer rendered (orange pill removed). */
  pageTitle?: string;
  /** Kept for API compatibility — navigation lives in the SidePanel now. */
  showBackToSummary?: boolean;
  className?: string;
}

export default function TopBar({ className }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          'shrink-0 border-b border-[var(--color-border)] bg-white',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          {/* ── Left: hamburger + brand + title ── */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-md text-[var(--color-text-primary)] transition-colors',
                'hover:bg-[var(--color-surface-grey)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
              )}
              aria-label="Open navigation menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span
                className="hidden h-8 w-8 items-center justify-center rounded bg-[var(--color-ink)] text-[var(--color-accent)] sm:flex"
                aria-hidden
              >
                <span className="text-sm font-black">A</span>
              </span>
              <div className="leading-tight">
                <h1 className="text-base font-bold tracking-wide text-[var(--color-blue-header)] sm:text-lg">
                  IMPACT DASHBOARD
                </h1>
                <p className="hidden text-[11px] text-[var(--color-text-secondary)] sm:block">
                  A-PAG · Delhi-NCR air-quality action tracking
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: Action-Plan tab (Sign out lives in the drawer) ── */}
          <div className="flex items-center">
            <DashboardSwitcher />
          </div>
        </div>
      </header>

      <SidePanel open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
