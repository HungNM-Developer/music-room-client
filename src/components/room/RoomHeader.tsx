'use client';

import { History, LogOut, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useRoom } from '@/context/RoomContext';
import { vi } from '@/i18n/vi';

export function RoomHeader({ onOpenLog }: { onOpenLog: () => void }) {
  const { snapshot, leave } = useRoom();
  const toast = useToast();
  const router = useRouter();
  if (!snapshot) return null;

  async function share() {
    const url = `${window.location.origin}/r/${snapshot!.room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(vi.header.shared, 'success');
    } catch {
      toast(url);
    }
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/30 border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black truncate">{snapshot.room.name}</h1>
          <p className="text-xs text-slate-400">
            {vi.header.code}: <span className="font-mono font-bold tracking-widest text-indigo-300">{snapshot.room.code}</span>
          </p>
        </div>
        <button type="button" onClick={onOpenLog} aria-label={vi.header.log} className="btn-secondary !p-2.5">
          <History className="w-4 h-4" aria-hidden />
        </button>
        <button type="button" onClick={share} className="btn-secondary !px-3 !py-2 text-sm">
          <Share2 className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">{vi.header.share}</span>
        </button>
        <button
          type="button"
          onClick={async () => {
            await leave();
            router.push('/');
          }}
          aria-label={vi.header.leave}
          className="btn-secondary !p-2.5 text-red-200"
        >
          <LogOut className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </header>
  );
}
