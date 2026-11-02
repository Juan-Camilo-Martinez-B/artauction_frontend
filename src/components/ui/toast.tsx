'use client';

import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { NoticeTone } from './notice';

interface Toast {
  id: number;
  tone: NoticeTone;
  message: string;
}

type Notify = (message: string, tone?: NoticeTone) => void;

const ToastContext = createContext<Notify | null>(null);

const TOAST_MS = 4500;

const toneClasses: Record<NoticeTone, string> = {
  info: 'border-line bg-ink text-paper',
  success: 'border-moss bg-moss text-white',
  error: 'border-oxide bg-oxide text-white',
};

/** Avisos breves y efimeros para confirmar acciones (guardado, retiro, etc.). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<Notify>(
    (message, tone = 'info') => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => { dismiss(id); }, TOAST_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex animate-toast-in items-start justify-between gap-3 rounded-field border px-4 py-3 text-sm shadow-lift ${toneClasses[toast.tone]}`}
          >
            <span>{toast.message}</span>
            <button type="button" aria-label="Cerrar aviso" onClick={() => { dismiss(toast.id); }} className="opacity-80 hover:opacity-100">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return notify;
}
