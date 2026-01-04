import { motion } from 'framer-motion';
import { YoutubePlayer } from '@/components/YoutubePlayer';
import { Layers, Headphones, Activity } from 'lucide-react';
import { Room } from '@/types/room';

interface CinemaStageProps {
  canPlay: boolean;
  currentVideoId?: string;
  room: Room;
  volume: number;
  isMuted: boolean;
  playerRef: any;
  setDuration: (val: number) => void;
  onTrackEnd: (roomId: string) => void;
}

export const CinemaStage = ({
  canPlay,
  currentVideoId,
  room,
  volume,
  isMuted,
  playerRef,
  setDuration,
  onTrackEnd
}: CinemaStageProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="relative rounded-[3.5rem] overflow-hidden bg-black/40 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-md"
    >
      {canPlay ? (
          currentVideoId ? (
            <YoutubePlayer
              videoId={currentVideoId}
              isPlaying={room.playbackState.isPlaying}
              currentTime={room.playbackState.currentTime}
              volume={volume}
              isMuted={isMuted}
              trackTitle={room.currentTrack?.title}
              trackThumbnail={room.currentTrack?.thumbnail}
              onReady={(player) => {
                playerRef.current = player;
                setDuration(player.getDuration());
              }}
              onEnd={() => onTrackEnd(room.roomId)}
            />
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center py-12 md:py-32 text-slate-600">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 md:mb-8">
                  <Layers className="w-8 h-8 md:w-10 md:h-10 opacity-20" />
              </div>
              <h3 className="text-lg md:text-xl font-black mb-2 uppercase tracking-widest text-slate-500">The Stage is Dark</h3>
              <p className="text-xs md:text-sm opacity-50">Add a track to start the session</p>
            </div>
          )
      ) : (
          <div className="aspect-video relative overflow-hidden group rounded-[3.5rem]">
              {room.currentTrack?.thumbnail ? (
                  <>
                      {/* Full Frame Thumbnail */}
                      <motion.div
                          key={room.currentTrack.trackId}
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 1 }}
                          className="absolute inset-0"
                      >
                          <img 
                              src={room.currentTrack.thumbnail} 
                              alt="" 
                              className="w-full h-full object-cover brightness-[0.7] saturate-[1.2]"
                          />
                          {/* Overlay Gradients */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                      </motion.div>
                      
                      <div className="absolute inset-0 z-10 p-8 md:p-12 flex flex-col justify-end">
                          <motion.div 
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="space-y-4"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-primary/40 border border-white/20">
                                      <Headphones className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                      Listener Mode
                                  </div>
                              </div>
                              
                              <div className="max-w-xl">
                                  <h3 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-2xl line-clamp-2">
                                      {room.currentTrack.title}
                                  </h3>
                                  <p className="mt-4 text-xs md:text-sm text-slate-300 font-medium flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                      Broadcasting from: <span className="text-white font-bold">{room.users.find(u => u.canPlay)?.name || 'Someone'}</span>
                                  </p>
                              </div>
                          </motion.div>
                      </div>

                      {/* Content Contribution Hint (Top Right) */}
                      <div className="absolute top-8 right-8 z-10 hidden md:block">
                          <div className="px-5 py-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                              Add to queue to play next ⚡
                          </div>
                      </div>
                  </>
              ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center py-12 md:py-32 text-slate-600 bg-surface-900/50">
                      <div className="relative mb-6 md:mb-8">
                          <div className="absolute inset-0 bg-brand-primary/10 blur-3xl rounded-full" />
                          <div className="w-16 h-16 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5 relative z-10">
                            <Activity className="w-8 h-8 md:w-10 md:h-10 text-brand-primary animate-pulse" />
                          </div>
                      </div>
                      <h3 className="text-lg md:text-xl font-black mb-2 uppercase tracking-widest text-white">Listener Mode</h3>
                      <p className="text-xs md:text-sm text-slate-500 max-w-sm text-center px-4 md:px-8 leading-relaxed">
                          Waiting for original broadcast...
                      </p>
                  </div>
              )}
          </div>
      )}
    </motion.div>
  );
};
