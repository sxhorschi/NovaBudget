import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onClose: () => void;
  /** Ref to the parent chip element — clicks inside it should NOT close the dropdown */
  chipRef?: React.RefObject<HTMLElement | null>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  options,
  selected,
  onChange,
  onClose,
  chipRef,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  // Close on outside click (ignore clicks inside the dropdown OR the parent chip)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && ref.current.contains(target)) return;
      if (chipRef?.current && chipRef.current.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, chipRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-focus search
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;

  const selectedSet = new Set(selected);

  const toggleOption = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => {
    const merged = new Set(selected);
    filtered.forEach((o) => merged.add(o.value));
    onChange(Array.from(merged));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-60 w-64 bg-white border border-gray-200 rounded-lg shadow-lg"
    >
      {/* Search */}
      {options.length > 5 && (
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen..."
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Select all / Clear */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
        <button
          onClick={selectAll}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Alle auswählen
        </button>
        <button
          onClick={clearAll}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          Auswahl aufheben
        </button>
      </div>

      {/* Options list */}
      <div className="max-h-56 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">
            Keine Ergebnisse
          </div>
        )}
        {filtered.map((option) => {
          const checked = selectedSet.has(option.value);
          return (
            <label
              key={option.value}
              className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors duration-100"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleOption(option.value)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-gray-700 select-none truncate">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default FilterDropdown;
