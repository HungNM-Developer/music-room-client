'use client';

import { Pause, Play, SkipForward } from 'lucide-react';
import { useRoom } from '@/context/RoomContext';
import { REACTIONS } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { useNow } from '@/hooks/useNow';
import { vi } from '@/i18n/vi';
import { estimatePosition, formatDuration } from '@/lib/time';
import { PlayingVisualizer } from './PlayingVisualizer';

export function NowPlayingCard() {
  const { snapshot, offset, me } = useRoom();
  const act = useAct();
  const now = useNow(500);
  const np = snapshot?.nowPlaying ?? null;

  if (!np) {
    return (
      <section aria-label={vi.nowPlaying.title} className="glass-effect rounded-[2rem] p-6 text-center text-slate-400">
        {vi.nowPlaying.idle}
      </section>
    );
  }

  const t = np.item.track;
  const pos = estimatePosition({ ...np, durationSec: t.durationSec }, offset, now);
  const pct = t.durationSec ? Math.min(100, (pos / t.durationSec) * 100) : 0;
  const canControl = me?.role === 'ADMIN' || me?.canControl;
  const voted = Boolean(me && np.skip.voters.includes(me.id));
  const canVote = me && !me.isDevice;

  return (
    <section aria-label={vi.nowPlaying.title} className="glass-effect rounded-[2rem] p-5 md:p-6 space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-2xl overflow-hidden bg-white/5">
          {t.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            {np.status === 'PLAYING' ? <PlayingVisualizer /> : null}
            {np.status === 'PLAYING' ? vi.nowPlaying.title : vi.nowPlaying.paused}
          </div>
          <h2 className="text-lg md:text-xl font-black truncate [unicode-bidi:plaintext]" title={t.title}>
            {t.title}
          </h2>
          <p className="text-sm text-slate-400 truncate">
            {np.item.addedBy ? vi.nowPlaying.addedBy(np.item.addedBy.displayName) : vi.nowPlaying.fallback}
            {t.channel ? ` · ${t.channel}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-primary to-brand-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-400 tabular-nums">
          <span>{formatDuration(pos)}</span>
          <span>{t.durationSec ? formatDuration(t.durationSec) : vi.nowPlaying.unknownDuration}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {canVote && (
          <button
            type="button"
            disabled={voted}
            onClick={() => act('queue:vote-skip', { queueItemId: np.item.id })}
            className="btn-secondary !px-4 !py-2 text-sm disabled:opacity-60"
          >
            <SkipForward className="w-4 h-4" aria-hidden />
            {voted ? `${vi.nowPlaying.voted} · ` : ''}
            {vi.nowPlaying.voteSkip(np.skip.votes, np.skip.required)}
          </button>
        )}
        {canControl && (
          <>
            <button
              type="button"
              onClick={() =>
                act('playback:control', {
                  action: np.status === 'PLAYING' ? 'pause' : 'play',
                  queueItemId: np.item.id,
                })
              }
              className="btn-secondary !px-4 !py-2 text-sm"
            >
              {np.status === 'PLAYING' ? <Pause className="w-4 h-4" aria-hidden /> : <Play className="w-4 h-4" aria-hidden />}
              {np.status === 'PLAYING' ? vi.nowPlaying.pause : vi.nowPlaying.play}
            </button>
            <button
              type="button"
              onClick={() => act('playback:control', { action: 'skip', queueItemId: np.item.id })}
              className="btn-secondary !px-4 !py-2 text-sm"
            >
              {vi.nowPlaying.skipNow}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export function ReactionBar() {
  const act = useAct();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Reaction">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={`Thả ${emoji}`}
          onClick={() => act('room:reaction', { emoji }, { silent: true })}
          className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-90 transition text-xl"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
