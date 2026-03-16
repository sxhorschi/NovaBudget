import React from 'react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon size={32} className="text-gray-300" />
      </div>
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
