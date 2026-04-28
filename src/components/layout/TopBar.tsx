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
import { Link, useLocation } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import SidePanel from './SidePanel';
import DashboardSwitcher from './DashboardSwitcher';
import { cn } from '@/lib/utils';

export type ActivePage = 'summary' | 'detail' | 'all-data' | 'upload';

interface TopBarProps {
  /** Kept for API compatibility — the SidePanel derives active state from the URL. */
  activePage?: ActivePage;
  /** Kept for API compatibility — no longer rendered (orange pill removed). */
  pageTitle?: string;
  /**
   * NAV_001 — kept for API compatibility but no longer authoritative;
   * TopBar renders the Back-to-Summary button on every non-summary page.
   */
  showBackToSummary?: boolean;
  className?: string;
}

export default function TopBar({ className }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // NAV_001 — every page except the Summary itself shows a permanent
  // "Back to Summary" button. It is keyboard-reachable, always visible,
  // and the label matches the spec verbatim.
  const onSummary = location.pathname.startsWith('/dashboard/summary');

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
              <h1 className="text-base font-bold tracking-wide text-[var(--color-blue-header)] sm:text-lg">
                IMPACT DASHBOARD
              </h1>
            </div>

            {!onSummary ? (
              <Link
                to="/dashboard/summary"
                className={cn(
                  'ml-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-blue-link)]',
                  'hover:bg-[var(--color-blue-pale)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
                )}
                aria-label="Back to Summary"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                <span>Back to Summary</span>
              </Link>
            ) : null}
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
