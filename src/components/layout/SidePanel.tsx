// FILE: src/components/layout/SidePanel.tsx
// PURPOSE: Left-side navigation drawer that opens from the hamburger in the
//          TopBar. Lists the three in-dashboard pages (Summary, Detailed
//          Report, Enter Data) plus a sign-out action at the bottom.
//
// UX notes (senior govt. user audience — must feel familiar, low-friction):
//   - Opens from the left, overlays content so the current page stays in view.
//   - Click-outside on the backdrop and Esc both dismiss the drawer.
//   - Current page is clearly highlighted (blue bar + tinted background),
//     matching the familiar state-dashboard pattern.
//   - Locked body scroll while open to avoid background-jitter on small screens.

import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Upload, LogOut, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '@/lib/auth';
import { cn } from '@/lib/utils';

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Extra routes that should also mark this item active. */
  matches?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Summary',
    href: '/dashboard/summary',
    icon: BarChart3,
  },
  {
    label: 'Detailed Report',
    href: '/dashboard/detail',
    icon: FileText,
    matches: ['/dashboard/all-data'],
  },
  {
    label: 'Enter Data',
    href: '/dashboard/upload',
    icon: Upload,
  },
];

export default function SidePanel({ open, onClose }: SidePanelProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  function handleSignOut() {
    signOut();
    onClose();
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-[var(--color-navy)] text-white shadow-2xl',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-accent)] text-[var(--color-ink)]">
              <span className="text-sm font-black">A</span>
            </span>
            <p className="text-sm font-semibold leading-tight">Impact Dashboard</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Dashboard pages">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.href ||
                (item.matches?.some((m) => location.pathname.startsWith(m)) ?? false);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'group flex items-center gap-3 border-l-4 px-5 py-3 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset',
                      isActive
                        ? 'border-[var(--color-accent)] bg-white/10 font-semibold text-white'
                        : 'border-transparent text-white/75 hover:bg-white/5 hover:text-white',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px]',
                        isActive ? 'text-[var(--color-accent)]' : 'text-white/70 group-hover:text-white',
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer sign-out */}
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
