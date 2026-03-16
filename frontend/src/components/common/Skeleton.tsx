import React from 'react';

// ---------------------------------------------------------------------------
// SkeletonLine
// ---------------------------------------------------------------------------

interface SkeletonLineProps {
  height?: 'sm' | 'md' | 'lg' | 'xl';
  width?: string;
  className?: string;
}

const HEIGHT_MAP: Record<string, string> = {
  sm: 'h-3',
  md: 'h-4',
  lg: 'h-6',
  xl: 'h-8',
};

export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  height = 'md',
  width,
  className = '',
}) => (
  <div
    className={`bg-gray-200 animate-pulse rounded ${HEIGHT_MAP[height]} ${className}`}
    style={width ? { width } : undefined}
  />
);

// ---------------------------------------------------------------------------
// SkeletonCard
// ---------------------------------------------------------------------------

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => (
  <div className={`rounded-xl border border-gray-200 bg-white p-5 space-y-3 ${className}`}>
    <SkeletonLine height="lg" width="60%" />
    <SkeletonLine height="sm" width="80%" />
    <SkeletonLine height="sm" width="45%" />
    <div className="pt-2">
      <SkeletonLine height="xl" />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// SkeletonTable
// ---------------------------------------------------------------------------

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  cols = 4,
  className = '',
}) => (
  <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden ${className}`}>
    {/* Header */}
    <div className="flex gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine
          key={`hdr-${i}`}
          height="sm"
          width={i === 0 ? '30%' : `${Math.floor(70 / (cols - 1))}%`}
        />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={`row-${rowIdx}`}
        className="flex gap-4 px-4 py-3 border-b border-gray-100 last:border-0"
      >
        {Array.from({ length: cols }).map((_, colIdx) => (
          <SkeletonLine
            key={`cell-${rowIdx}-${colIdx}`}
            height="md"
            width={colIdx === 0 ? '30%' : `${Math.floor(70 / (cols - 1))}%`}
          />
        ))}
      </div>
    ))}
  </div>
);
