import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

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
  /** Duration in ms used by ToastProvider for auto-dismiss (used for progress bar) */
  duration?: number;
}

// ---------------------------------------------------------------------------
// Style Maps
// ---------------------------------------------------------------------------

const CONTAINER_CLASS: Record<ToastType, string> = {
  success: 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200',
  error:   'bg-gradient-to-r from-red-50 to-rose-50 border-red-200',
  info:    'bg-gradient-to-r from-blue-50 to-yellow-50 border-blue-200',
  warning: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
};

const ICON_BG: Record<ToastType, string> = {
  success: 'bg-emerald-100 text-emerald-600',
  error:   'bg-red-100 text-red-600',
  info:    'bg-blue-100 text-blue-600',
  warning: 'bg-amber-100 text-amber-600',
};

const PROGRESS_COLOR: Record<ToastType, string> = {
  success: 'bg-emerald-400',
  error:   'bg-red-400',
  info:    'bg-blue-400',
  warning: 'bg-amber-400',
};

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error:   <XCircle size={16} />,
  info:    <Info size={16} />,
  warning: <AlertTriangle size={16} />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4000;

const Toast: React.FC<ToastProps> = ({ toast, onDismiss, duration = AUTO_DISMISS_MS }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(100);

  // Slide-in animation on mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translateX(120%)';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 250ms ease-out';
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });
  }, []);

  // Progress bar countdown
  useEffect(() => {
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        raf = requestAnimationFrame(tick);
      }
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

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
        relative flex items-center gap-3 w-80 rounded-2xl shadow-2xl border overflow-hidden px-4 py-3
        ${CONTAINER_CLASS[toast.type]}
      `}
    >
      {/* Icon circle */}
      <div className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full ${ICON_BG[toast.type]}`}>
        {ICON_MAP[toast.type]}
      </div>

      <span className="flex-1 text-sm font-medium text-gray-800 min-w-0 break-words">
        {toast.message}
      </span>

      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
        aria-label="Close"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5">
        <div
          className={`h-full transition-none ${PROGRESS_COLOR[toast.type]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Toast;
