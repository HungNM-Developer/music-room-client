'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

type Tone = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

/** Small polite toasts (role="status"); errors stay 6 s, others 3.5 s. */
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
        className="fixed inset-x-0 bottom-24 lg:bottom-8 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              data-testid="toast"
              className={`max-w-md w-full rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl border ${
                t.tone === 'error'
                  ? 'bg-red-500/15 border-red-500/30 text-red-100'
                  : t.tone === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-50'
                    : 'bg-white/10 border-white/15 text-white'
              }`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
