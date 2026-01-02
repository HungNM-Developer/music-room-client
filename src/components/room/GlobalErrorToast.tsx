import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus } from 'lucide-react';
import { User } from '@/types/room';

interface GlobalErrorToastProps {
  error: string | null;
  user: User | null;
  clearError: () => void;
}

export const GlobalErrorToast = ({ error, user, clearError }: GlobalErrorToastProps) => {
  return (
    <AnimatePresence>
      {error && user && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-red-500/30 font-bold border border-white/20"
        >
          <div className="bg-white/20 p-2 rounded-xl border border-white/10">
             <AlertTriangle className="w-5 h-5" />
          </div>
          <span className="text-sm">{error}</span>
          <button onClick={() => clearError()} className="ml-4 hover:opacity-50 transition-opacity">
             <Plus className="w-5 h-5 rotate-45" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
