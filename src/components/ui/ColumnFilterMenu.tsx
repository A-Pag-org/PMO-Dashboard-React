// FILE: components/ui/ColumnFilterMenu.tsx
// PURPOSE: In-header sort / multi-select filter dropdown used by the Manual
//          Data Upload screen (wireframe page 11 of 13).
// DESIGN REF: Wireframe page 11 shows a tiny caret inside every column header
//             of State, City, Initiative and Metric that opens a filter menu.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnFilterMenuProps {
  /** Full list of values present in this column. */
  options: string[];
  /** The currently selected values; an empty set means "show all". */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  sortDir: 'none' | 'asc' | 'desc';
  onSortChange: (dir: 'none' | 'asc' | 'desc') => void;
  /** Optional accessible label for screen readers. */
  ariaLabel?: string;
  active?: boolean;
}

export default function ColumnFilterMenu({
  options,
  selected,
  onChange,
  sortDir,
  onSortChange,
  ariaLabel,
  active,
}: ColumnFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  const isFiltered = selected.size > 0 || sortDir !== 'none' || Boolean(active);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel ?? 'Sort and filter column'}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded',
          'text-white/80 hover:bg-white/10 hover:text-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
          isFiltered && 'bg-[var(--color-accent)] text-[var(--color-ink)] hover:bg-[var(--color-accent-hover)] hover:text-[var(--color-ink)]',
        )}
      >
        <ChevronDown className="h-3 w-3" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-56 rounded-md border border-[var(--color-border-table)] bg-white p-2 text-[var(--color-text-primary)] shadow-lg"
        >
          {/* Sort section */}
          <div className="mb-2 border-b border-[var(--color-border-table)] pb-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Sort
            </p>
            <div className="flex gap-1">
              <SortButton
                label="A → Z"
                active={sortDir === 'asc'}
                onClick={() =>
                  onSortChange(sortDir === 'asc' ? 'none' : 'asc')
                }
              />
              <SortButton
                label="Z → A"
                active={sortDir === 'desc'}
                onClick={() =>
                  onSortChange(sortDir === 'desc' ? 'none' : 'desc')
                }
              />
            </div>
          </div>

          {/* Filter section */}
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Filter
          </p>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <button
              type="button"
              onClick={() => onChange(new Set(options))}
              className="text-[var(--color-blue-link)] hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="text-[var(--color-text-secondary)] hover:underline"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <li key={opt}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-[var(--color-surface-light)]">
                  <input
                    type="checkbox"
                    checked={selected.has(opt)}
                    onChange={() => toggle(opt)}
                    className="h-3 w-3"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SortButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded border px-2 py-1 text-[10px] font-medium transition-colors',
        active
          ? 'border-[var(--color-border-blue)] bg-[var(--color-blue-pale)] text-[var(--color-blue-link)]'
          : 'border-[var(--color-border-table)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-light)]',
      )}
    >
      {label}
    </button>
  );
}
