// FILE: src/components/ui/DashboardCard.tsx
// PURPOSE: Dashboard selector card used on /home — PMO, Impact, AQI
// DESIGN REF: Wireframe page 6 of 13 (Dashboard selection)

import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { DashboardOption } from '@/lib/types';

interface DashboardCardProps {
  dashboard: DashboardOption;
  href: string;
}

export default function DashboardCard({ dashboard, href }: DashboardCardProps) {
  const navigate = useNavigate();
  const isClickable = dashboard.active;

  function handleActivate() {
    if (isClickable) {
      navigate(href);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
      e.preventDefault();
      navigate(href);
    }
  }

  const cardInner = (
    <>
      <div
        className={cn(
          'mb-6 flex h-16 w-16 items-center justify-center rounded-full',
          dashboard.active
            ? 'bg-[var(--color-blue-pale)]'
            : 'bg-[var(--color-surface-light)]',
        )}
      >
        <div
          className={cn(
            'h-6 w-6 rounded-sm',
            dashboard.color === 'orange'
              ? 'bg-[var(--color-text-orange)]'
              : 'bg-[var(--color-blue-link)]',
          )}
        />
      </div>

      <h2
        className={cn(
          'text-lg font-bold tracking-wide',
          dashboard.color === 'orange'
            ? 'text-[var(--color-text-orange)]'
            : 'text-[var(--color-blue-link)]',
        )}
      >
        {dashboard.label}
      </h2>

      {dashboard.sublabel && (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {dashboard.sublabel}
        </p>
      )}

      {dashboard.active && (
        <span className="mt-4 inline-block rounded-full bg-[var(--color-blue-link)] px-4 py-1 text-xs font-medium text-white">
          Active
        </span>
      )}
    </>
  );

  if (isClickable) {
    return (
      <Link
        to={href}
        className={cn(
          'flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 p-8 text-center transition-all',
          'cursor-pointer border-[var(--color-border-blue)] bg-white shadow-lg hover:shadow-xl',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        )}
      >
        {cardInner}
      </Link>
    );
  }

  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      aria-disabled
      className={cn(
        'flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 p-8 text-center transition-all',
        'border-[var(--color-border)] bg-[var(--color-surface-grey)]',
      )}
    >
      {cardInner}
    </div>
  );
}
