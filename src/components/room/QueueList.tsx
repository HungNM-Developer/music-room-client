import { motion, AnimatePresence } from 'framer-motion';
import { Music, Heart, ChevronUp, ChevronDown, Trash2, Layers } from 'lucide-react';
import { triggerHearts } from './HeartCanvas';
import { Room, Track, User } from '@/types/room';

interface QueueListProps {
  room: Room;
  user: User;
  pendingTracks: Track[];
  canControl: boolean;
  isAdmin: boolean;
  heartTrack: (roomId: string, trackId: string) => void;
  reorderTrack: (roomId: string, from: number, to: number) => void;
  removeTrack: (roomId: string, trackId: string) => void;
}

export const QueueList = ({
  room,
  user,
  pendingTracks,
  canControl,
  isAdmin,
  heartTrack,
  reorderTrack,
  removeTrack
}: QueueListProps) => {
  const combinedQueue = [...room.queue, ...pendingTracks];

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <AnimatePresence mode="popLayout">
        {combinedQueue.length > 0 ? (
          combinedQueue.map((track, idx) => (
            <motion.div 
              layout
              key={track.trackId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`group relative flex gap-4 p-4 rounded-[2rem] transition-all mb-4 border shadow-xl backdrop-blur-2xl
                ${track.status === 'pending' ? 'opacity-50 border-dashed border-white/10' : 
                  idx === 0 
                    ? 'bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 border-brand-primary/40 shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)] ring-1 ring-brand-primary/20' 
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
            >
              <div className="w-20 h-12 rounded-xl overflow-hidden bg-surface-800 flex-shrink-0 relative ring-1 ring-white/5 transition-all">
                {track.thumbnail ? (
                  <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <Music className="w-4 h-4 text-slate-600" />
                  </div>
                )}
                {track.status === 'pending' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-xs font-bold truncate text-slate-200 group-hover:text-white transition-colors">
                    {track.title}
                  </h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-medium">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                  
                  {!track.status && (
                    <div className="flex items-center gap-1.5 translate-x-1">
                      <button 
                        onClick={(e) => {
                          heartTrack(room.roomId, track.trackId);
                          triggerHearts(e.clientX, e.clientY);
                        }}
                        className={`p-1.5 px-2.5 flex items-center gap-1.5 rounded-lg border transition-all ${
                          track.hearts?.includes(user!.userId) 
                          ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                          : 'bg-surface-900 border-white/5 text-slate-500 hover:text-red-400 hover:border-red-400/30'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${track.hearts?.includes(user!.userId) ? 'fill-current' : ''}`} />
                        <span className="text-[10px] font-black">{track.hearts?.length || 0}</span>
                      </button>

                      {canControl && (
                        <>
                          <button 
                            onClick={() => reorderTrack(room.roomId, idx, idx - 1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-500 hover:text-brand-primary transition-all bg-surface-900 rounded-lg border border-white/5 disabled:opacity-20" 
                            title="Move Up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => reorderTrack(room.roomId, idx, idx + 1)}
                            disabled={idx === room.queue.length - 1}
                            className="p-1 text-slate-500 hover:text-brand-primary transition-all bg-surface-900 rounded-lg border border-white/5 disabled:opacity-20" 
                            title="Move Down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {(isAdmin || track.addedBy === user.userId) && (
                        <button 
                          onClick={() => removeTrack(room.roomId, track.trackId)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-all bg-surface-900 rounded-lg border border-white/5" 
                          title="Remove Track"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 py-32 space-y-4 opacity-30 grayscale">
            <Layers className="w-16 h-16" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Hàng đợi trống</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
