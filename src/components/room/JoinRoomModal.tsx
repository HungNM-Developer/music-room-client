import { motion } from 'framer-motion';
import { Music, ChevronRight } from 'lucide-react';

interface JoinRoomModalProps {
  id: string;
  nameInput: string;
  setNameInput: (val: string) => void;
  error: string | null;
  clearError: () => void;
  joinRoom: (roomId: string, name: string) => void;
}

export const JoinRoomModal = ({ id, nameInput, setNameInput, error, clearError, joinRoom }: JoinRoomModalProps) => {
  return (
    <motion.div 
      key="join-ui"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="relative z-50 min-h-screen flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm glass-effect p-10 text-center space-y-8 rounded-[3rem] shadow-2xl">
        <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto animate-float">
          <Music className="w-10 h-10 text-brand-primary" />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tighter text-white">Enter Room</h2>
          <p className="text-slate-500 text-sm">Join the session in room <span className="text-indigo-400 font-mono font-bold tracking-widest">{id}</span></p>
          {error && <p className="text-red-400 text-xs bg-red-400/5 p-3 rounded-xl border border-red-500/10">{error}</p>}
          
          <div className="space-y-4">
            <input 
              type="text" 
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (error) clearError();
              }}
              placeholder="What's your name?"
              className="w-full input-field text-center text-lg h-14"
              onKeyDown={(e) => e.key === 'Enter' && joinRoom(id, nameInput)}
            />
            <button 
              onClick={() => joinRoom(id, nameInput)}
              className="w-full btn-primary h-14 !rounded-2xl group"
            >
              Join Now <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
