import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Suchen... (Cmd+K)',
}) => {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value -> local (e.g. after reset)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const emitChange = useCallback(
    (v: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(v);
      }, 300);
    },
    [onChange],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocal(v);
    emitChange(v);
  };

  const handleClear = () => {
    setLocal('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white
          focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200
          placeholder:text-gray-400 transition-colors duration-150"
      />
      {local && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
