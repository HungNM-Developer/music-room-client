import { motion } from 'framer-motion';
import { Crown, Headphones, Gamepad2, Heart } from 'lucide-react';
import { Room, User } from '@/types/room';

interface ListenerListProps {
  room: Room;
  user: User;
  isAdmin: boolean;
  setPlayerPermission: (roomId: string, userId: string) => void;
  setControlPermission: (roomId: string, userId: string, canControl: boolean) => void;
}

export const ListenerList = ({
  room,
  user,
  isAdmin,
  setPlayerPermission,
  setControlPermission
}: ListenerListProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      {room.users.map((u) => (
        <motion.div 
          key={u.userId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-4 p-4 rounded-[2rem] hover:bg-white/[0.04] transition-all mb-2 group shadow-sm bg-surface-900/20"
        >
          <div className="relative">
            <div 
              className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-white font-black text-base shadow-lg"
              style={{ backgroundColor: u.color }}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-4 border-surface-900" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="flex items-center gap-2 truncate text-white">
                  {u.name}
                  {u.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                  {u.canPlay && <Headphones className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                  {u.canControl && <Gamepad2 className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 px-0.5">
                  {u.canPlay ? 
                    <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-1 rounded-sm tracking-tighter uppercase">PLAYER</span> : 
                    <span className="text-[7px] font-black text-slate-600 bg-white/5 px-1 rounded-sm tracking-tighter uppercase">LISTENER</span>
                  }
                  {u.canControl && <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1 rounded-sm tracking-tighter uppercase">CONTROLLER</span>}
                  
                  {/* User's Total Hearts Received */}
                  {(room.queue.some(t => t.addedBy === u.userId && (t.hearts?.length || 0) > 0) || (room.currentTrack?.addedBy === u.userId && (room.currentTrack.hearts?.length || 0) > 0)) && (
                    <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md ml-1 scale-90">
                      <Heart className="w-2.5 h-2.5 fill-current" />
                      <span className="text-[8px] font-black">
                        {(() => {
                          let total = 0;
                          room.queue.forEach(t => { if(t.addedBy === u.userId) total += (t.hearts?.length || 0); });
                          if(room.currentTrack?.addedBy === u.userId) total += (room.currentTrack.hearts?.length || 0);
                          return total;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {u.userId === user.userId && <span className="text-[9px] font-black text-brand-primary tracking-widest uppercase">YOU</span>}
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all bg-surface-900/80 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
                    <button 
                      onClick={() => setPlayerPermission(room.roomId, u.userId)}
                      className={`p-1.5 rounded-lg transition-all ${u.canPlay ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-surface-700 text-slate-400 hover:text-white'}`}
                      title={u.canPlay ? "Current Player" : "Take/Grant Player Rights"}
                    >
                      <Headphones className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setControlPermission(room.roomId, u.userId, !u.canControl)}
                      className={`p-1.5 rounded-lg transition-all ${u.canControl ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-surface-700 text-slate-400 hover:text-white'}`}
                      title={u.canControl ? "Remove Control Rights" : "Grant Control Rights"}
                    >
                      <Gamepad2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{u.role}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
