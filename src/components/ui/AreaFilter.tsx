// FILE: components/ui/AreaFilter.tsx
// PURPOSE: Cascading "Area filter" dropdown (State -> City -> RTO) used on Detailed view
// DESIGN REF: Wireframe page 9 of Impact_Dashboard_Structure_16_Apr.pdf
//
// Behaviour (matches wireframe page 9):
//   - Top-level options: "(All - Delhi NCR)" + each State
//   - Hovering a State expands to show "(All - <State>)" + its cities
//   - Hovering a City expands to show "(All - <City>)" + its RTOs
//   - Clicking any row commits that selection and closes the dropdown
//
// The selection is represented as a single `AreaSelection` object that
// downstream consumers can translate into state/city/rto filters.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AreaSelection {
  /** undefined means "All - Delhi NCR" */
  state?: string;
  /** undefined when the whole state is selected */
  city?: string;
  /** undefined when the whole city is selected */
  rto?: string;
}

interface AreaFilterProps {
  value: AreaSelection;
  onChange: (value: AreaSelection) => void;
  states: readonly string[];
  citiesByState: Record<string, string[]>;
  rtosByCity: Record<string, string[]>;
  className?: string;
}

const NCR_LABEL = '(All - Delhi NCR)';

export default function AreaFilter({
  value,
  onChange,
  states,
  citiesByState,
  rtosByCity,
  className,
}: AreaFilterProps) {
  const [open, setOpen] = useState(false);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setHoveredState(null);
        setHoveredCity(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function commit(next: AreaSelection) {
    onChange(next);
    setOpen(false);
    setHoveredState(null);
    setHoveredCity(null);
  }

  const displayText = value.rto
    ? value.rto
    : value.city
    ? value.city
    : value.state
    ? value.state
    : 'Area filter';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex min-h-[36px] items-center gap-2 rounded-md bg-white px-3 py-1 text-sm font-medium text-[var(--color-text-primary)] shadow-sm',
          'border border-[var(--color-border-table)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        )}
      >
        <span className="max-w-[180px] truncate">{displayText}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 flex rounded-md border border-[var(--color-border-table)] bg-white shadow-lg"
        >
          {/* ── Level 1: NCR + States ── */}
          <ul className="min-w-[170px] py-1">
            <MenuItem
              label={NCR_LABEL}
              selected={!value.state}
              onHover={() => {
                setHoveredState(null);
                setHoveredCity(null);
              }}
              onClick={() => commit({})}
            />
            {states.map((s) => {
              const hasChildren = (citiesByState[s] ?? []).length > 0;
              return (
                <MenuItem
                  key={s}
                  label={s}
                  caret={hasChildren}
                  selected={value.state === s}
                  highlighted={hoveredState === s}
                  onHover={() => {
                    setHoveredState(s);
                    setHoveredCity(null);
                  }}
                  onClick={() => commit({ state: s })}
                />
              );
            })}
          </ul>

          {/* ── Level 2: Cities of hovered State ── */}
          {hoveredState ? (
            <ul className="min-w-[170px] border-l border-[var(--color-border-table)] py-1">
              <MenuItem
                label={`(All - ${hoveredState})`}
                selected={value.state === hoveredState && !value.city}
                onHover={() => setHoveredCity(null)}
                onClick={() => commit({ state: hoveredState })}
              />
              {(citiesByState[hoveredState] ?? []).map((c) => {
                const hasChildren = (rtosByCity[c] ?? []).length > 0;
                return (
                  <MenuItem
                    key={c}
                    label={c}
                    caret={hasChildren}
                    selected={value.city === c}
                    highlighted={hoveredCity === c}
                    onHover={() => setHoveredCity(c)}
                    onClick={() => commit({ state: hoveredState, city: c })}
                  />
                );
              })}
            </ul>
          ) : null}

          {/* ── Level 3: RTOs of hovered City ── */}
          {hoveredState && hoveredCity ? (
            <ul className="min-w-[170px] border-l border-[var(--color-border-table)] py-1">
              <MenuItem
                label={`(All - ${hoveredCity})`}
                selected={value.city === hoveredCity && !value.rto}
                onClick={() =>
                  commit({ state: hoveredState, city: hoveredCity })
                }
              />
              {(rtosByCity[hoveredCity] ?? []).map((r) => (
                <MenuItem
                  key={r}
                  label={r}
                  selected={value.rto === r}
                  onClick={() =>
                    commit({
                      state: hoveredState,
                      city: hoveredCity,
                      rto: r,
                    })
                  }
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface MenuItemProps {
  label: string;
  selected?: boolean;
  highlighted?: boolean;
  caret?: boolean;
  onHover?: () => void;
  onClick?: () => void;
}

function MenuItem({
  label,
  selected,
  highlighted,
  caret,
  onHover,
  onClick,
}: MenuItemProps) {
  return (
    <li>
      <button
        type="button"
        onMouseEnter={onHover}
        onFocus={onHover}
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs',
          'transition-colors',
          highlighted || selected
            ? 'bg-[var(--color-blue-pale)] text-[var(--color-blue-link)]'
            : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-light)]',
        )}
      >
        <span className="truncate">{label}</span>
        {caret ? <span aria-hidden className="text-[10px]">▶</span> : null}
      </button>
    </li>
  );
}
