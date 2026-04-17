// FILE: src/pages/HomePage.tsx
// PURPOSE: Dashboard selection page — branded header + dashboard cards
// DESIGN REF: Wireframe page 6 of 13 (Dashboard selection)

import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DASHBOARD_OPTIONS } from '@/lib/constants';
import DashboardCard from '@/components/ui/DashboardCard';
import { signOut } from '@/lib/auth';

const hrefMap: Record<string, string> = {
  impact: '/dashboard/summary',
};

export default function HomePage() {
  const navigate = useNavigate();

  function handleSignOut(e: React.FormEvent) {
    e.preventDefault();
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-grey)]">
      {/* ── A-PAG brand strip ── */}
      <div className="flex items-center justify-between bg-[var(--color-ink)] px-8 py-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-accent)]">
            <Home className="h-4 w-4 text-[var(--color-ink)]" />
          </span>
        </div>
        <form onSubmit={handleSignOut}>
          <button
            type="submit"
            className="text-xs text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)]"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* ── Header ── */}
      <header className="bg-gradient-to-br from-[var(--color-ink)] to-[var(--color-navy)] px-8 pb-12 pt-8">
        <h1 className="text-2xl font-bold text-white">
          Dashboard selection
        </h1>
        <p className="mt-1 text-sm text-[var(--color-accent)]">
          Choose a dashboard to continue
        </p>
      </header>

      {/* ── Card grid ── */}
      <main className="-mt-4 flex flex-1 justify-center px-8 pb-16">
        <div className="w-full max-w-5xl space-y-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {DASHBOARD_OPTIONS.map((d) => (
              <DashboardCard
                key={d.slug}
                dashboard={d}
                href={hrefMap[d.slug] ?? '#'}
              />
            ))}
          </div>
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            AQI Dashboard integration is planned for a later phase.
          </p>
        </div>
      </main>
    </div>
  );
}
