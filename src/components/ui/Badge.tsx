// FILE: components/ui/Badge.tsx
// PURPOSE: Status badges — Illustrative, Tentative, and generic pill badges
// DESIGN REF: Wireframe page 5 ("Illustrative" pill), page 12 ("Tentative" pill)

import { cn } from '@/lib/utils';

type BadgeVariant = 'slate' | 'navy' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  slate: 'bg-gray-200 text-gray-600',
  navy: 'bg-[var(--color-navy)] text-[var(--color-text-white)]',
  success: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
};

export default function Badge({
  label,
  variant = 'slate',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
