import React, { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Style Maps
// ---------------------------------------------------------------------------

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-600 shrink-0" />,
  error: <AlertCircle size={18} className="text-red-600 shrink-0" />,
  info: <Info size={18} className="text-indigo-600 shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
};

const BORDER_COLOR: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  info: 'border-l-indigo-500',
  warning: 'border-l-amber-500',
};

const BG_COLOR: Record<ToastType, string> = {
  success: 'bg-green-50',
  error: 'bg-red-50',
  info: 'bg-indigo-50',
  warning: 'bg-amber-50',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Slide-in animation on mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Start off-screen right, then animate in
    el.style.transform = 'translateX(120%)';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });
  }, []);

  const handleDismiss = () => {
    const el = ref.current;
    if (!el) {
      onDismiss(toast.id);
      return;
    }
    el.style.transition = 'transform 200ms ease-in, opacity 200ms ease-in';
    el.style.transform = 'translateX(120%)';
    el.style.opacity = '0';
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={`
        flex items-center gap-3 w-80 rounded-lg shadow-lg border-l-4 px-4 py-3
        ${BORDER_COLOR[toast.type]} ${BG_COLOR[toast.type]}
        bg-white
      `}
    >
      {ICON_MAP[toast.type]}
      <span className="flex-1 text-sm font-medium text-gray-800 min-w-0 break-words">
        {toast.message}
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors"
        aria-label="Schließen"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
