import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import Toast, { type ToastData, type ToastType } from './Toast';

// ---------------------------------------------------------------------------
// Global toast event — allows code outside the React tree (e.g. parent
// contexts) to trigger toasts via: dispatchToastEvent('error', 'message')
// ---------------------------------------------------------------------------

export function dispatchToastEvent(type: ToastType, message: string): void {
  window.dispatchEvent(
    new CustomEvent('budget-tool:toast', { detail: { type, message } }),
  );
}

// ---------------------------------------------------------------------------
// Context Types
// ---------------------------------------------------------------------------

interface ToastAPI {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastAPI | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() must be used within a <ToastProvider>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 3;

interface ToastProviderProps {
  children: React.ReactNode;
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const counterRef = useRef(0);
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timerMap.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerMap.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      counterRef.current += 1;
      const id = `toast-${counterRef.current}-${Date.now()}`;
      const newToast: ToastData = { id, message, type };

      setToasts((prev) => {
        // Keep only the most recent (MAX_VISIBLE - 1) so the new one fits
        const trimmed = prev.length >= MAX_VISIBLE ? prev.slice(-(MAX_VISIBLE - 1)) : prev;
        return [...trimmed, newToast];
      });

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => dismiss(id), 4000);
      timerMap.current.set(id, timer);
    },
    [dismiss],
  );

  const api = useRef<ToastAPI>({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  });

  // Keep the ref callbacks up to date without recreating the object
  api.current.success = (msg) => addToast(msg, 'success');
  api.current.error = (msg) => addToast(msg, 'error');
  api.current.info = (msg) => addToast(msg, 'info');
  api.current.warning = (msg) => addToast(msg, 'warning');

  // Stable reference so consumers don't re-render when toasts change
  const stableApi = useRef(api.current).current;

  // Listen for global toast events dispatched from outside the React tree
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, message } = (e as CustomEvent<{ type: ToastType; message: string }>).detail;
      addToast(message, type);
    };
    window.addEventListener('budget-tool:toast', handler);
    return () => window.removeEventListener('budget-tool:toast', handler);
  }, [addToast]);

  return (
    <ToastContext.Provider value={stableApi}>
      {children}

      {/* Toast container — bottom right, stacking upward */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
