import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const ToastContext = createContext(null);

let id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((variant, message, ttl = 4500) => {
    const tid = ++id;
    setToasts(prev => [...prev, { id: tid, variant, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== tid));
    }, ttl);
  }, []);

  const toast = {
    success: (m, ttl) => push('success', m, ttl),
    error:   (m, ttl) => push('error', m, ttl ?? 6000),
    info:    (m, ttl) => push('info', m, ttl)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-pop bg-white',
              t.variant === 'success' && 'border-emerald-200',
              t.variant === 'error' && 'border-red-200',
              t.variant === 'info' && 'border-blue-200'
            )}
          >
            {t.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />}
            {t.variant === 'error'   && <AlertCircle  className="w-5 h-5 text-red-500 mt-0.5" />}
            {t.variant === 'info'    && <Info         className="w-5 h-5 text-blue-500 mt-0.5" />}
            <div className="text-sm text-slate-700 flex-1">{t.message}</div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Dismiss"
            ><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
