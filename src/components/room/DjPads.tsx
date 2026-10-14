'use client';

import { DJ_SOUNDS } from '@/contracts/constants';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { useMe } from '@/state/hooks';

const EMOJI: Record<(typeof DJ_SOUNDS)[number], string> = {
  build: '🔥',
  drop: '💥',
  clap: '👏',
  horn: '📯',
  airhorn: '🎺',
  laugh: '😂',
  applause: '🙌',
};

/** Sound pads that play on the room speaker (R-34). */
export function DjPads() {
  const me = useMe();
  const act = useAct();
  if (!me || me.isDevice || (!me.canDj && me.role !== 'ADMIN')) return null;
  return (
    <section aria-labelledby="dj-title">
      <div className="mb-2 px-1">
        <h2 id="dj-title" className="type-display text-[20px] font-bold">
          {vi.dj.title}
        </h2>
        <p className="text-[13px] text-sage">{vi.dj.note}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {DJ_SOUNDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => act('dj:trigger', { soundType: s }, { silent: true })}
            className="flex aspect-square flex-col lg:aspect-[5/4] items-center justify-center gap-1 rounded-row border border-line bg-panel text-[12px] font-medium transition-[transform,background-color] hover:bg-panel-hi active:scale-95 active:bg-amber active:text-amber-ink"
          >
            <span className="text-[24px] leading-none" aria-hidden>
              {EMOJI[s]}
            </span>
            {vi.dj.sounds[s]}
          </button>
        ))}
      </div>
    </section>
  );
}
