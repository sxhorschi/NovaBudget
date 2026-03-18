import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full text-left group py-2 border-b border-gray-100"
      >
        {isOpen ? (
          <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        )}
        <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider group-hover:text-gray-700 transition-colors">
          {title}
        </span>
      </button>
      {isOpen && <div className="pt-3 pb-1">{children}</div>}
    </div>
  );
}
