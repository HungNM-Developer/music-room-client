import { motion } from 'framer-motion';
import { Pause, User as UserIcon, Heart, VolumeX, Volume2, Play, SkipForward } from 'lucide-react';
import { PlayingVisualizer } from './PlayingVisualizer';
import { triggerHearts } from './HeartCanvas';
import { Room, User } from '@/types/room';

interface PlaybackControlsProps {
  room: Room;
  user: User;
  canPlay: boolean;
  displayTime: number;
  setDisplayTime: (val: number) => void;
  duration: number;
  volume: number;
  setVolume: (val: number) => void;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  syncPlayback: (roomId: string, isPlaying: boolean, currentTime: number) => void;
  onTrackEnd: (roomId: string) => void;
  heartTrack: (roomId: string, trackId: string) => void;
  voteSkip: (roomId: string) => void;
}

export const PlaybackControls = ({
  room,
  user,
  canPlay,
  displayTime,
  setDisplayTime,
  duration,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  syncPlayback,
  onTrackEnd,
  heartTrack,
  voteSkip
}: PlaybackControlsProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/20 backdrop-blur-2xl p-6 md:p-10 rounded-[3.5rem] relative overflow-hidden border border-white/5 shadow-2xl"
    >
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-primary/5 blur-[100px] rounded-full" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 relative z-10">
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap items-center gap-3">
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all duration-500
                  ${room.playbackState.isPlaying 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
                      : 'bg-white/5 text-slate-400 border-white/10'}`}>
                  {room.playbackState.isPlaying ? (
                      <>
                          <PlayingVisualizer />
                          ON AIR
                      </>
                  ) : (
                      <>
                          <Pause className="w-3 h-3" />
                          PAUSED
                      </>
                  )}
              </div>
              <span className="text-[11px] text-slate-600 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                  <UserIcon className="w-3 h-3" /> Requester: <span className="text-slate-300">{room.users.find(u => u.userId === room.currentTrack?.addedBy)?.name || 'Listener'}</span>
              </span>
              {room.currentTrack?.hearts && (
                  <button 
                      onClick={(e) => {
                          heartTrack(room.roomId, room.currentTrack!.trackId);
                          triggerHearts(e.clientX, e.clientY);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                          room.currentTrack.hearts.includes(user!.userId) 
                          ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                          : 'bg-white/5 border-white/10 text-slate-500 hover:text-red-400 hover:border-red-400/30'
                      }`}
                  >
                      <Heart className={`w-3 h-3 ${room.currentTrack.hearts.includes(user!.userId) ? 'fill-current' : ''}`} />
                      <span className="text-[10px] font-black">{room.currentTrack.hearts.length}</span>
                  </button>
              )}
              {room.currentTrack && (
                  <button 
                      onClick={() => voteSkip(room.roomId)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                          room.skipVotes?.includes(user!.userId) 
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                          : 'bg-white/5 border-white/10 text-slate-500 hover:text-amber-400 hover:border-amber-400/30'
                      }`}
                      title={`Skip Vote: ${room.skipVotes?.length || 0}/${Math.floor(room.users.length / 2) + 1}`}
                  >
                      <SkipForward className="w-3 h-3" />
                      <span className="text-[10px] font-black">{room.skipVotes?.length || 0}/{Math.floor(room.users.length / 2) + 1}</span>
                  </button>
              )}
          </div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-tight text-white max-w-2xl line-clamp-2">
              {room.currentTrack?.title || 'Awaiting Broadcast...'}
          </h2>
          
          {room.currentTrack && (
            <div className="space-y-4 pt-4">
               <div className="space-y-2">
                 <input 
                   type="range" 
                   min="0" 
                   max={duration || room.currentTrack.duration || 100} 
                   value={displayTime}
                   disabled={!canPlay}
                   onChange={(e) => {
                     const val = parseFloat(e.target.value);
                     setDisplayTime(val); 
                     syncPlayback(room.roomId, room.playbackState.isPlaying, val);
                   }}
                   className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary ${!canPlay ? 'opacity-50 cursor-not-allowed' : ''}`}
                 />
                 <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>{new Date(displayTime * 1000).toISOString().substr(14, 5)}</span>
                    <span>{new Date((duration || room.currentTrack.duration || 0) * 1000).toISOString().substr(14, 5)}</span>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setIsMuted(!isMuted)}
                   className="p-2 glass-effect rounded-xl hover:bg-white/10 transition-all"
                 >
                   {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
                 </button>
                 <input 
                   type="range" 
                   min="0" 
                   max="100" 
                   value={volume}
                   onChange={(e) => setVolume(parseInt(e.target.value))}
                   className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-slate-400"
                 />
              </div>
            </div>
          )}
        </div>

        {canPlay && (
          <div className="flex items-center gap-4 self-start md:self-center">
              <button 
                  onClick={() => syncPlayback(room.roomId, !room.playbackState.isPlaying, room.playbackState.currentTime)}
                  disabled={!room.currentTrack}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-3xl bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:scale-100"
              >
                  {room.playbackState.isPlaying ? <Pause className="w-6 h-6 md:w-7 md:h-7 fill-current" /> : <Play className="w-6 h-6 md:w-7 md:h-7 fill-current translate-x-0.5" />}
              </button>
              <button 
                  onClick={() => onTrackEnd(room.roomId)}
                  disabled={room.queue.length === 0}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-3xl glass-effect flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:scale-100"
                  title="Force Skip"
              >
                  <SkipForward className="w-6 h-6 md:w-7 md:h-7" />
              </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
