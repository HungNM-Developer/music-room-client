'use client';

import { AudioLines } from 'lucide-react';
import { DJ_SOUNDS } from '@/contracts/constants';
import { useAct } from '@/hooks/useAct';
import { useT } from '@/i18n';

/**
 * DJ keys inside the chat window (opened with the disc button). Each key plays its
 * sound on the room speaker (R-34) and flashes amber while pressed.
 */
export function DjPads() {
  const t = useT();
  const act = useAct();
  return (
    <section aria-label={t.dj.title} className="animate-rise rounded-box bg-panel p-2">
      <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[12px] text-sage">
        <AudioLines className="h-3.5 w-3.5 text-amber" aria-hidden />
        {t.dj.note}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {DJ_SOUNDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => act('dj:trigger', { soundType: s }, { silent: true })}
            className="type-display min-h-10 rounded-[10px] border border-line bg-dial-deep px-1 text-[13px] font-bold transition-[transform,background-color,color] hover:border-sage/50 active:scale-95 active:border-amber active:bg-amber active:text-amber-ink"
          >
            {t.dj.sounds[s]}
          </button>
        ))}
      </div>
    </section>
  );
}
