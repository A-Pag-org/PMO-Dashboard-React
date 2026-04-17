// FILE: src/components/layout/BottomBar.tsx
// PURPOSE: Bottom action bar — compact to save vertical space
// DESIGN REF: Wireframe pages 7–8 (summary bottom), page 10 (detail bottom)

import { Link } from 'react-router-dom';
import { ChevronDown, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomBarProps {
  showDetailedView?: boolean;
  showAllDataView?: boolean;
  showManualData?: boolean;
  className?: string;
}

export default function BottomBar({
  showDetailedView = true,
  showAllDataView = false,
  showManualData = true,
  className,
}: BottomBarProps) {
  return (
    <footer
      className={cn(
        'flex shrink-0 items-center justify-between border-t border-[var(--color-border)] bg-white px-6 py-2',
        className,
      )}
    >
      {showDetailedView || showAllDataView ? (
        <div className="flex items-center gap-2">
          {showDetailedView && (
            <Link
              to="/dashboard/detail"
              className={cn(
                'flex min-h-[36px] items-center gap-2 rounded-md bg-[var(--color-navy)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-white)] transition-colors',
                'hover:bg-[var(--color-navy-mid)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
              )}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Detailed report</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          )}
          {showAllDataView && (
            <Link
              to="/dashboard/all-data"
              className={cn(
                'flex min-h-[36px] items-center gap-2 rounded-md bg-[var(--color-navy)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-white)] transition-colors',
                'hover:bg-[var(--color-navy-mid)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
              )}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Full data table</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div />
      )}

      {showManualData && (
        <Link
          to="/dashboard/upload"
          className={cn(
            'flex min-h-[36px] items-center gap-2 rounded-md bg-[var(--color-navy)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-white)] transition-colors',
            'hover:bg-[var(--color-navy-mid)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
          )}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Enter data</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Link>
      )}
    </footer>
  );
}
