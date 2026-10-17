'use client';

import { Check, CircleAlert } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

type Tone = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

/** Small polite toasts above the tab bar; errors stay 6 s, others 3.5 s. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const show = useCallback((text: string, tone: Tone = 'info') => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-28"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex w-full max-w-md animate-rise items-start gap-2.5 rounded-box border bg-panel px-4 py-3 text-[14px] shadow-[0_12px_32px_-12px_rgb(0_0_0/0.6)] ${
              t.tone === 'error' ? 'border-onair' : 'border-line'
            }`}
          >
            {t.tone === 'success' && <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />}
            {t.tone === 'error' && <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-alert" aria-hidden />}
            <span className="min-w-0 [overflow-wrap:anywhere]">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
