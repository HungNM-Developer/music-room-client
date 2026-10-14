'use client';

import { Home, ListPlus, Users } from 'lucide-react';
import { vi } from '@/i18n/vi';

export type TabKey = 'room' | 'add' | 'people';
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'room', label: vi.tabs.room, icon: <Home className="w-5 h-5" aria-hidden /> },
  { key: 'add', label: vi.tabs.add, icon: <ListPlus className="w-5 h-5" aria-hidden /> },
  { key: 'people', label: vi.tabs.people, icon: <Users className="w-5 h-5" aria-hidden /> },
];

/** Mobile bottom navigation (D7). Hidden on ≥1024px where all panels are visible. */
export function BottomTabs({ tab, onChange, queueCount }: { tab: TabKey; onChange: (t: TabKey) => void; queueCount: number }) {
  return (
    <nav aria-label="Điều hướng phòng" className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-surface-900/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div role="tablist" className="grid grid-cols-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => onChange(t.key)}
            className={`flex flex-col items-center gap-1 py-3 text-xs font-bold ${tab === t.key ? 'text-white' : 'text-slate-500'}`}
          >
            <span className="relative">
              {t.icon}
              {t.key === 'room' && queueCount > 0 && (
                <span className="absolute -top-1.5 -right-3 rounded-full bg-brand-primary px-1.5 text-[10px] tabular-nums" data-testid="queue-count">
                  {queueCount}
                </span>
              )}
            </span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
