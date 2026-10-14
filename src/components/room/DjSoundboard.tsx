'use client';

import { Disc } from 'lucide-react';
import { useRoom } from '@/context/RoomContext';
import { DJ_SOUNDS, type DjSound } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';

const LABELS: Record<DjSound, string> = {
  build: 'BUILD 🔥',
  drop: 'DROP 💥',
  clap: 'CLAP 👏',
  horn: 'HORN 📣',
  airhorn: 'AIRHORN 🎺',
  laugh: 'LAUGH 😂',
  applause: 'APPLAUSE 🙌',
};

export function DjSoundboard() {
  const { me } = useRoom();
  const act = useAct();
  if (!me || me.isDevice || (!me.canDj && me.role !== 'ADMIN')) return null;
  return (
    <section aria-labelledby="dj-title" className="glass-effect rounded-[2rem] p-4 md:p-6">
      <h2 id="dj-title" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-300 mb-3">
        <Disc className="w-4 h-4 animate-spin-slow" aria-hidden /> {vi.dj.title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DJ_SOUNDS.map((s) => (
          <button key={s} type="button" onClick={() => act('dj:trigger', { soundType: s }, { silent: true })} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-xs font-black hover:bg-white/10 active:scale-95">
            {LABELS[s]}
          </button>
        ))}
      </div>
    </section>
  );
}
