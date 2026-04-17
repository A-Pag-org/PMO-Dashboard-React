// FILE: components/layout/DashboardSwitcher.tsx
// PURPOSE: Action-Plan / AQI-future dashboard switcher links in top strip
// DESIGN REF: Structure flow pages 7–11 (cross-dashboard links)

import { cn } from '@/lib/utils';

const dashboards = [
  { label: 'Action-Plan Dashboard', href: '#' },
  { label: 'AQI Dashboard', href: '#' },
];

interface DashboardSwitcherProps {
  className?: string;
}

export default function DashboardSwitcher({ className }: DashboardSwitcherProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="mr-1 text-xs text-white/50">Switch:</span>
      {dashboards.map((d) => (
        <a
          key={d.label}
          href={d.href}
          className={cn(
            'flex min-h-[32px] items-center rounded px-3 py-1 text-xs font-medium transition-colors',
            'bg-white/10 text-white/80',
            'hover:bg-white/20 hover:text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
          )}
        >
          {d.label}
          {d.label === 'AQI Dashboard' ? (
            <span className="ml-1 text-[10px] text-white/60">(later)</span>
          ) : null}
        </a>
      ))}
    </div>
  );
}
