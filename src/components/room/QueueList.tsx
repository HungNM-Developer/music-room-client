'use client';

import { Heart, Mail, MoreHorizontal, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { Dialog, SheetAction } from '@/components/ui/Dialog';
import { Thumb } from '@/components/ui/Thumb';
import type { MemberView, QueueItemView } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';

const WishSheet = dynamic(() => import('./WishSheet').then((m) => m.WishSheet));

interface Group {
  key: string;
  title: string;
  items: QueueItemView[];
}

/** Pinned items first, then one group per fair-queue round (the queue is already in play order). */
function groupByRound(queue: QueueItemView[]): Group[] {
  const groups: Group[] = [];
  for (const item of queue) {
    const key = item.pinned ? 'pinned' : `round-${Math.max(1, item.round)}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, title: item.pinned ? vi.queue.pinnedGroup : vi.queue.round(Math.max(1, item.round)), items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

export function QueueList({ onAdd }: { onAdd?: () => void }) {
  const queue = useRoom((s) => s.snapshot?.queue);
  const me = useMe();
  const [menuFor, setMenuFor] = useState<QueueItemView | null>(null);
  const [wishFor, setWishFor] = useState<QueueItemView | null>(null);
  const items = queue ?? [];

  return (
    <section aria-labelledby="queue-title">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 id="queue-title" className="type-display text-[20px] font-bold">
          {vi.queue.title}
        </h2>
        {items.length > 0 && <span className="text-[13px] text-sage tabular-nums">{items.length}</span>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-panel border border-dashed border-line px-5 py-8 text-center">
          <p className="text-sage">{vi.queue.empty}</p>
          {onAdd && !me?.isDevice && (
            <Button size="sm" variant="primary" className="mt-4" onClick={onAdd}>
              <Plus className="h-4 w-4" aria-hidden />
              {vi.queue.addFirst}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupByRound(items).map((g) => (
            <div key={g.key}>
              <h3 className="mb-1 px-1 text-[13px] font-medium text-sage">{g.title}</h3>
              <ol className="divide-y divide-line/70 rounded-panel bg-panel px-1">
                {g.items.map((item) => (
                  <QueueRow key={item.id} item={item} me={me} onMenu={setMenuFor} />
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {menuFor && (
        <ItemMenu
          item={menuFor}
          me={me}
          onClose={() => setMenuFor(null)}
          onWish={() => {
            setWishFor(menuFor);
            setMenuFor(null);
          }}
        />
      )}
      {wishFor && <WishSheet item={wishFor} onClose={() => setWishFor(null)} />}
    </section>
  );
}

const QueueRow = memo(function QueueRow({
  item,
  me,
  onMenu,
}: {
  item: QueueItemView;
  me: MemberView | null;
  onMenu: (item: QueueItemView) => void;
}) {
  const act = useAct();
  const mine = Boolean(me && item.addedBy?.id === me.id);
  const hearted = Boolean(me && item.heartedBy.includes(me.id));
  const isAdmin = me?.role === 'ADMIN';
  const hasMenu = Boolean(me && !me.isDevice && (isAdmin || me.canControl || mine));

  return (
    <li className="flex animate-rise items-center gap-3 py-2.5 pl-2.5 pr-1">
      <Thumb url={item.track.thumbnailUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium [unicode-bidi:plaintext]" title={item.track.title}>
          {item.track.title}
        </p>
        <p className="flex items-center gap-2 text-[13px] text-sage">
          <span className="truncate">
            {item.addedBy ? item.addedBy.displayName : vi.nowPlaying.fallback}
            {mine && ` (${vi.queue.you})`}
          </span>
          {item.track.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(item.track.durationSec)}</span> : null}
          {item.wishMessage && <Mail className="h-3.5 w-3.5 shrink-0 text-amber" aria-label={vi.queue.hasWish} />}
        </p>
      </div>
      {me && !me.isDevice ? (
        <button
          type="button"
          aria-label={hearted ? vi.queue.unheart : vi.queue.heart}
          aria-pressed={hearted}
          onClick={() => act('queue:heart', { queueItemId: item.id })}
          className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-row px-2 text-[13px] tabular-nums transition-colors hover:bg-panel-hi ${
            hearted ? 'text-onair' : 'text-sage'
          }`}
        >
          <Heart className="h-[18px] w-[18px]" fill={hearted ? 'currentColor' : 'none'} aria-hidden />
          {item.hearts > 0 && <span>{item.hearts}</span>}
        </button>
      ) : (
        item.hearts > 0 && <span className="px-2 text-[13px] text-sage">{vi.queue.hearts(item.hearts)}</span>
      )}
      {hasMenu && (
        <IconButton label={vi.queue.actions(item.track.title)} onClick={() => onMenu(item)}>
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </IconButton>
      )}
    </li>
  );
});

function ItemMenu({
  item,
  me,
  onClose,
  onWish,
}: {
  item: QueueItemView;
  me: MemberView | null;
  onClose: () => void;
  onWish: () => void;
}) {
  const act = useAct();
  const mine = Boolean(me && item.addedBy?.id === me.id);
  const isAdmin = me?.role === 'ADMIN';
  const canPin = isAdmin || me?.canControl;
  const run = (fn: () => Promise<unknown>) => {
    onClose();
    void fn();
  };

  return (
    <Dialog open onClose={onClose} title={item.track.title} description={item.addedBy?.displayName}>
      <div className="-mx-2 space-y-0.5">
        {canPin && (
          <SheetAction
            icon={item.pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
            onClick={() => run(() => act('queue:pin-next', { queueItemId: item.id }))}
          >
            {item.pinned ? vi.queue.unpin : vi.queue.pin}
          </SheetAction>
        )}
        {mine && (
          <SheetAction icon={<Mail className="h-5 w-5" />} onClick={onWish}>
            {item.wishMessage ? vi.queue.editWish : vi.queue.wish}
          </SheetAction>
        )}
        {(mine || isAdmin) && (
          <SheetAction danger icon={<Trash2 className="h-5 w-5" />} onClick={() => run(() => act('queue:remove', { queueItemId: item.id }))}>
            {vi.queue.remove}
          </SheetAction>
        )}
      </div>
    </Dialog>
  );
}
