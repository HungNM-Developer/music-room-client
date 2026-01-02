import { LayoutList, Users } from 'lucide-react';

interface SidebarTabsProps {
  activeTab: 'queue' | 'users';
  setActiveTab: (tab: 'queue' | 'users') => void;
  queueLength: number;
  listenersCount: number;
}

export const SidebarTabs = ({ activeTab, setActiveTab, queueLength, listenersCount }: SidebarTabsProps) => {
  return (
    <div className="p-3 flex gap-2 border-b border-white/5 bg-white/2">
      <button 
          onClick={() => setActiveTab('queue')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest
              ${activeTab === 'queue' ? 'bg-surface-700 text-white shadow-xl shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
      >
          <LayoutList className="w-4 h-4" /> Queue
          {queueLength > 0 && <span className="bg-brand-primary text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">{queueLength}</span>}
      </button>
      <button 
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest
              ${activeTab === 'users' ? 'bg-surface-700 text-white shadow-xl shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
      >
          <Users className="w-4 h-4" /> Listeners
          <span className="bg-indigo-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">{listenersCount}</span>
      </button>
    </div>
  );
};
