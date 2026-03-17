import React from 'react';

// ---------------------------------------------------------------------------
// SkeletonLoader — Placeholder shimmer for loading states
// Usage: <SkeletonLoader rows={5} /> in place of CostbookTable content
// ---------------------------------------------------------------------------

interface SkeletonLoaderProps {
  /** Number of skeleton rows to display (default: 5) */
  rows?: number;
}

/** Single skeleton row mimicking a CostItemRow layout */
function SkeletonRow({ index }: { index: number }) {
  return (
    <tr
      className="border-b"
      style={{
        borderBottomColor: 'var(--border-default)',
        animationDelay: `${index * 60}ms`,
      }}
    >
      <td className="pl-14 pr-4 py-3">
        <div className="skeleton h-4 rounded" style={{ width: `${55 + (index % 3) * 15}%` }} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="skeleton h-4 w-20 rounded ml-auto" />
      </td>
      <td className="px-4 py-3">
        <div className="skeleton h-5 w-14 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="skeleton h-4 w-16 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="skeleton h-5 w-24 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="skeleton h-4 w-16 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="w-[58px]" />
      </td>
    </tr>
  );
}

/** Skeleton for a department header row */
function SkeletonDeptRow() {
  return (
    <tr
      className="border-b"
      style={{
        backgroundColor: 'rgba(248, 250, 252, 0.8)',
        borderBottomColor: 'var(--border-default)',
        borderLeft: '4px solid #e2e8f0',
      }}
    >
      <td colSpan={5} className="pl-4 pr-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-4 w-4 rounded" />
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      </td>
      <td colSpan={4} className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-3">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-2 w-[160px] rounded-full" />
          <div className="skeleton h-4 w-10 rounded" />
        </div>
      </td>
    </tr>
  );
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ rows = 5 }) => {
  return (
    <>
      <SkeletonDeptRow />
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} index={i} />
      ))}
    </>
  );
};

export default SkeletonLoader;
