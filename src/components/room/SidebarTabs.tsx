import { LayoutList, Users, MessageSquare } from 'lucide-react';

interface SidebarTabsProps {
  activeTab: 'queue' | 'users' | 'chat';
  setActiveTab: (tab: 'queue' | 'users' | 'chat') => void;
  queueLength: number;
  listenersCount: number;
}

export const SidebarTabs = ({ activeTab, setActiveTab, queueLength, listenersCount }: SidebarTabsProps) => {
  return (
    <div className="p-4 flex gap-2.5 border-b border-white/5 bg-white/[0.01]">
      <button
        onClick={() => setActiveTab('queue')}
        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-[0.2em]
              ${activeTab === 'queue' ? 'bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-[0_10px_30px_-5px_rgba(99,102,241,0.5)]' : 'text-slate-500 hover:text-slate-300'}`}
      >
        <LayoutList className="w-4 h-4" /> Queue
        {queueLength > 0 && <span className="bg-white/20 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black backdrop-blur-md">{queueLength}</span>}
      </button>
      <button
        onClick={() => setActiveTab('users')}
        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-[0.2em]
              ${activeTab === 'users' ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_10px_30px_-5px_rgba(99,102,241,0.5)]' : 'text-slate-500 hover:text-slate-300'}`}
      >
        <Users className="w-4 h-4" /> Listeners
        <span className="bg-white/20 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black backdrop-blur-md">{listenersCount}</span>
      </button>
      <button
        onClick={() => setActiveTab('chat')}
        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-[0.2em]
              ${activeTab === 'chat' ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-[0_10px_30px_-5px_rgba(244,63,94,0.5)]' : 'text-slate-500 hover:text-slate-300'}`}
      >
        <MessageSquare className="w-4 h-4" /> Chat
      </button>
    </div>
  );
};
