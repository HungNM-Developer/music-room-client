import { motion } from 'framer-motion';
import { Disc } from 'lucide-react';

interface SyncingOverlayProps {
  error: string | null;
}

export const SyncingOverlay = ({ error }: SyncingOverlayProps) => {
  return (
    <motion.div 
      key="loading-ui"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative z-50 min-h-screen flex items-center justify-center"
    >
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full" />
          <Disc className="w-16 h-16 text-brand-primary mx-auto animate-spin relative" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Syncing Stream...</p>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
        </div>
      </div>
    </motion.div>
  );
};
