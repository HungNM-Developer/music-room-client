import { Music, Activity, Share2, Check, LogOut, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room } from '@/types/room';

interface RoomHeaderProps {
  room: Room;
  router: any;
  handleCopyLink: () => void;
  copied: boolean;
  handleExitRoom: () => void;
  handleAddMusic: (e: React.FormEvent) => void;
  urlInput: string;
  handleUrlChange: (val: string) => void;
  youtubeError: string | null;
  getYouTubeId: (url?: string) => string | null;
  probedMetadata: any;
  isProbing: boolean;
}

export const RoomHeader = ({ 
  room, 
  router, 
  handleCopyLink, 
  copied, 
  handleExitRoom,
  handleAddMusic,
  urlInput,
  handleUrlChange,
  youtubeError,
  getYouTubeId,
  probedMetadata,
  isProbing
}: RoomHeaderProps) => {
  return (
    <header className="relative z-50 flex-col gap-4 h-auto py-5 md:flex-row md:h-24 border-b border-white/5 px-4 md:px-10 flex items-center justify-between sticky top-0 rounded-b-[2.5rem] mx-2 md:mx-6 my-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] bg-white/[0.03] backdrop-blur-3xl">
      <div className="flex items-center gap-6">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => router.push('/')}
        >
          <div className="w-11 h-11 bg-gradient-to-br from-brand-primary to-brand-accent rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform">
            <Music className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter hidden md:block text-white">Room<span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent">Sync</span></h1>
        </div>
        
        <div className="h-4 w-[1px] bg-white/10" />
        
        <div className="flex items-center gap-3 px-4 py-2 bg-surface-900/50 rounded-full border border-white/5">
          <Activity className="w-3 h-3 text-green-500 animate-pulse" />
          <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Live: {room.roomId}</span>
        </div>
      </div>

      <form onSubmit={handleAddMusic} className="hidden md:flex flex-1 max-w-2xl mx-12">
        <div className="relative w-full">
          <input 
            type="text" 
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Paste YouTube Link to add music..."
            className={`w-full bg-white/5 border ${youtubeError ? 'border-red-500 ring-1 ring-red-500/50' : 'border-white/10'} rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:bg-white/10 transition-all placeholder:text-slate-600 text-white`}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          
          {youtubeError && (
            <div className="absolute top-full left-0 mt-2 text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">
              {youtubeError}
            </div>
          )}

          <button 
            type="submit"
            disabled={!urlInput.trim() || (getYouTubeId(urlInput) !== null && !probedMetadata)}
            className="absolute right-2 top-1.5 bottom-1.5 px-6 bg-brand-primary text-white rounded-xl font-bold text-[10px] tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/25 disabled:opacity-50 disabled:grayscale disabled:scale-100"
          >
            {isProbing && !probedMetadata ? 'Fetching...' : 'Add Music'}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <button 
          onClick={handleCopyLink} 
          className={`p-2.5 transition-all !rounded-xl relative ${copied ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'}`} 
          title="Share Access"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest absolute -bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded-md">Copied!</span>
              </motion.div>
            ) : (
              <motion.div
                key="share"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <Share2 className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        <button onClick={handleExitRoom} className="p-2.5 glass-effect rounded-xl text-red-500 border-red-400/10 hover:bg-red-500/10 transition-colors" title="Leave Room">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
