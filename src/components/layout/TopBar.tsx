// FILE: src/components/layout/TopBar.tsx
// PURPOSE: Persistent top bar for senior-government users.
//   - Left: brand (emblem + 'IMPACT DASHBOARD' wordmark), with a 'Summary'
//     button on every non-summary page for a one-click jump home.
//   - Right: prominent 'Go to Action-plan Dashboard' tab + a top-level
//     'Sign out' button. The previous hamburger + side drawer have been
//     removed because all primary actions now live in the top bar
//     itself.
//
// Design rationale:
//   Senior government users expect a single visible header with no
//   hidden navigation. Sign-out is surfaced at the top so it cannot be
//   lost inside a drawer.

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import DashboardSwitcher from './DashboardSwitcher';
import { signOut } from '@/lib/auth';
import { cn } from '@/lib/utils';

export type ActivePage = 'summary' | 'detail' | 'all-data' | 'upload';

interface TopBarProps {
  /** Kept for API compatibility — no longer authoritative. */
  activePage?: ActivePage;
  /** Kept for API compatibility — no longer rendered. */
  pageTitle?: string;
  /** Kept for API compatibility — TopBar always renders the Summary
   *  button on every non-summary page. */
  showBackToSummary?: boolean;
  className?: string;
}

export default function TopBar({ className }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // NAV_001 — every page except the Summary itself shows a permanent
  // 'Summary' button. It is keyboard-reachable and always visible.
  const onSummary = location.pathname.startsWith('/dashboard/summary');

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header
      className={cn(
        'shrink-0 border-b border-[var(--color-border)] bg-white',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* ── Left: brand + Summary button ── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-[14px]">
            <span
              className="hidden h-[40px] w-[40px] items-center justify-center sm:flex"
              aria-hidden
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt="State Emblem of India"
                className="h-full w-full object-contain"
              />
            </span>
            <h1 className="font-['Poppins',sans-serif] text-[14px] font-semibold leading-[21px] tracking-wide text-[#2E4B8F]">
              IMPACT DASHBOARD
            </h1>
          </div>

          {!onSummary ? (
            <Link
              to="/dashboard/summary"
              className={cn(
                'ml-2 inline-flex h-9 items-center rounded-md border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-blue-link)]',
                'hover:bg-[var(--color-blue-pale)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
              )}
              aria-label="Go to Summary"
            >
              Summary
            </Link>
          ) : null}
        </div>

        {/* ── Right: Action-plan tab + Sign out ── */}
        <div className="flex items-center gap-2">
          <DashboardSwitcher />
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-blue-link)]',
              'hover:bg-[var(--color-blue-pale)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-link)] focus-visible:ring-offset-2',
            )}
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
