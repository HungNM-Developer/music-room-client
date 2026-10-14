'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Heart, MessageSquareHeart, Pin, PinOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRoom } from '@/context/RoomContext';
import type { QueueItemView } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import { WishModal } from './WishModal';

export function QueueList() {
  const { snapshot, me } = useRoom();
  const act = useAct();
  const [wishFor, setWishFor] = useState<QueueItemView | null>(null);
  const queue = snapshot?.queue ?? [];
  const isAdmin = me?.role === 'ADMIN';
  const canPin = isAdmin || me?.canControl;

  return (
    <section aria-labelledby="queue-title" className="glass-effect rounded-[2rem] p-4 md:p-6">
      <h2 id="queue-title" className="text-sm font-black uppercase tracking-widest text-slate-300 mb-3">
        {vi.queue.title} <span className="text-slate-500">({queue.length})</span>
      </h2>
      {queue.length === 0 ? (
        <p className="text-slate-400 text-sm py-6 text-center">{vi.queue.empty}</p>
      ) : (
        <ol className="space-y-2">
          <AnimatePresence initial={false}>
            {queue.map((item) => {
              const mine = item.addedBy?.id === me?.id;
              const hearted = Boolean(me && item.heartedBy.includes(me.id));
              return (
                <motion.li
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center gap-3 rounded-2xl p-3 border ${
                    item.pinned ? 'border-brand-primary/40 bg-brand-primary/10' : 'border-white/5 bg-white/[0.03]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {item.track.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.track.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate [unicode-bidi:plaintext]" title={item.track.title}>
                      {item.track.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {item.pinned && (
                        <span className="mr-1 rounded bg-brand-primary/30 px-1.5 py-0.5 text-[10px] font-bold text-indigo-100">
                          {vi.queue.pinnedBadge}
                        </span>
                      )}
                      {vi.queue.byline(
                        item.addedBy ? `${item.addedBy.displayName}${mine ? ` (${vi.queue.you})` : ''}` : vi.nowPlaying.fallback,
                        Math.max(1, item.round),
                      )}
                      {item.track.durationSec ? ` · ${formatDuration(item.track.durationSec)}` : ''}
                      {item.wishMessage ? ' · 💌' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {me && !me.isDevice && (
                      <button
                        type="button"
                        aria-label={hearted ? vi.queue.unheart : vi.queue.heart}
                        aria-pressed={hearted}
                        onClick={() => act('queue:heart', { queueItemId: item.id })}
                        className={`flex items-center gap-1 rounded-xl px-2 py-2 text-sm ${hearted ? 'text-rose-400' : 'text-slate-400 hover:text-rose-300'}`}
                      >
                        <Heart className="w-4 h-4" fill={hearted ? 'currentColor' : 'none'} aria-hidden />
                        {item.hearts > 0 && <span className="tabular-nums">{item.hearts}</span>}
                      </button>
                    )}
                    {canPin && (
                      <button
                        type="button"
                        aria-label={item.pinned ? vi.queue.unpin : vi.queue.pin}
                        title={item.pinned ? vi.queue.unpin : vi.queue.pin}
                        onClick={() => act('queue:pin-next', { queueItemId: item.id })}
                        className="rounded-xl p-2 text-slate-400 hover:text-white"
                      >
                        {item.pinned ? <PinOff className="w-4 h-4" aria-hidden /> : <Pin className="w-4 h-4" aria-hidden />}
                      </button>
                    )}
                    {mine && (
                      <button
                        type="button"
                        aria-label={vi.queue.wish}
                        title={vi.queue.wish}
                        onClick={() => setWishFor(item)}
                        className="rounded-xl p-2 text-slate-400 hover:text-white"
                      >
                        <MessageSquareHeart className="w-4 h-4" aria-hidden />
                      </button>
                    )}
                    {(mine || isAdmin) && (
                      <button
                        type="button"
                        aria-label={vi.queue.remove}
                        title={vi.queue.remove}
                        onClick={() => act('queue:remove', { queueItemId: item.id })}
                        className="rounded-xl p-2 text-slate-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
      {wishFor && <WishModal item={wishFor} onClose={() => setWishFor(null)} />}
    </section>
  );
}
