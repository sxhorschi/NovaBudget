import React, { useState, useCallback, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import FilterDropdown from './FilterDropdown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterOption {
  value: string;
  label: string;
}

interface FilterChipProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  options,
  selected,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const hasSelection = selected.length > 0;
  const chipRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setOpen(false), []);

  /** Clear this filter entirely (stop propagation so the chip button doesn't re-open the dropdown) */
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange([]);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div className="relative" ref={chipRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-colors duration-150 cursor-pointer select-none
          ${
            hasSelection
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
              : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
          }
        `}
      >
        {label}

        {/* Count badge */}
        {hasSelection && (
          <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold leading-none">
            {selected.length}
          </span>
        )}

        {/* X icon to clear selection, or chevron to open dropdown */}
        {hasSelection ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange([]);
                setOpen(false);
              }
            }}
            className="inline-flex items-center justify-center rounded-full hover:bg-indigo-200 p-0.5 transition-colors duration-100"
            aria-label={`${label} Filter zurücksetzen`}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {open && (
        <FilterDropdown
          options={options}
          selected={selected}
          onChange={onChange}
          onClose={handleClose}
          chipRef={chipRef}
        />
      )}
    </div>
  );
};

export default FilterChip;
