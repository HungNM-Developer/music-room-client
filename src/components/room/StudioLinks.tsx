import { ExternalLink, Disc, ChevronRight, Share2 } from 'lucide-react';
import { Room } from '@/types/room';

interface StudioLinksProps {
  room: Room;
  handleCopyLink: () => void;
}

export const StudioLinks = ({ room, handleCopyLink }: StudioLinksProps) => {
  return (
    <div className="glass-effect p-8 rounded-[3rem] space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h4 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-slate-300">
          <ExternalLink className="w-4 h-4" /> Studio Links
        </h4>
      </div>
      <div className="flex flex-col gap-4">
        <a 
          href={room.currentTrack?.youtubeUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 rounded-2xl bg-surface-800 hover:bg-brand-primary/10 transition-all group font-bold text-xs uppercase tracking-widest"
        >
          <span className="flex items-center gap-3">
            <Disc className="w-5 h-5 text-red-500 group-hover:animate-spin" /> Open on YouTube
          </span>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </a>
        <button 
          onClick={handleCopyLink}
          className="flex items-center justify-between p-4 rounded-2xl bg-surface-800 hover:bg-indigo-500/10 transition-all font-bold text-xs uppercase tracking-widest"
        >
          <span className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-indigo-400" /> Invite Friends
          </span>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>
      </div>
    </div>
  );
};
