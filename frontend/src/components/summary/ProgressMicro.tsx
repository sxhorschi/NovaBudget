import React from 'react';

interface ProgressMicroProps {
  value: number;
  max: number;
  color: 'green' | 'yellow' | 'red' | 'indigo';
}

const COLOR_MAP: Record<ProgressMicroProps['color'], string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-600',
};

const TRACK_MAP: Record<ProgressMicroProps['color'], string> = {
  green: 'bg-green-100',
  yellow: 'bg-yellow-100',
  red: 'bg-red-100',
  indigo: 'bg-indigo-50',
};

const ProgressMicro: React.FC<ProgressMicroProps> = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  return (
    <div className={`h-0.5 w-full rounded-full ${TRACK_MAP[color]}`}>
      <div
        className={`h-full rounded-full ${COLOR_MAP[color]} transition-all duration-300 ease-in-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export default ProgressMicro;
