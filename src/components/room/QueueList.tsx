'use client';

import { Ban, Heart, Loader2, Mail, MoreHorizontal, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { addedByLabel } from '@/lib/added-by';
import { BlockDialog } from './BlockDialog';
import { SaveButton } from './SaveButton';
import { Dialog, SheetAction } from '@/components/ui/Dialog';
import { Thumb } from '@/components/ui/Thumb';
import type { MemberView, QueueItemView } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { useT, tr } from '@/i18n';
import { formatDuration } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { type AddOp, applyQueue } from '@/state/optimistic';

const WishSheet = dynamic(() => import('./WishSheet').then((m) => m.WishSheet));

interface Group {
  key: string;
  /** null: no heading (the queue has nothing pinned). */
  title: string | null;
  items: QueueItemView[];
}

/** Pinned items first, then the rest (the queue is already in play order: hearts, then who added first). */
function groupQueue(queue: QueueItemView[]): Group[] {
  const t = tr();
  const pinned = queue.filter((q) => q.pinned);
  const rest = queue.filter((q) => !q.pinned);
  const groups: Group[] = [];
  if (pinned.length) groups.push({ key: 'pinned', title: t.queue.pinnedGroup, items: pinned });
  if (rest.length) groups.push({ key: 'rest', title: pinned.length ? t.queue.restGroup : null, items: rest });
  return groups;
}

/**
 * The queue for any layout: items in play order (with my pending changes), songs still
 * being added, and the ⋯ menu with its sheets (pin, wish, remove, block).
 */
export function useQueueView() {
  const queue = useRoom((s) => s.snapshot?.queue);
  const pending = useRoom((s) => s.pending);
  const me = useMe();
  const [menuFor, setMenuFor] = useState<QueueItemView | null>(null);
  const [wishFor, setWishFor] = useState<QueueItemView | null>(null);
  const [blockFor, setBlockFor] = useState<QueueItemView | null>(null);
  const { items, adding } = useMemo(() => applyQueue(queue ?? [], pending, me?.id ?? null), [queue, pending, me?.id]);
  const menus = (
    <>
      {menuFor && (
        <ItemMenu
          item={menuFor}
          me={me}
          onClose={() => setMenuFor(null)}
          onWish={() => {
            setWishFor(menuFor);
            setMenuFor(null);
          }}
          onBlock={() => {
            setBlockFor(menuFor);
            setMenuFor(null);
          }}
        />
      )}
      {wishFor && <WishSheet item={wishFor} onClose={() => setWishFor(null)} />}
      {blockFor && <BlockDialog track={blockFor.track} onClose={() => setBlockFor(null)} />}
    </>
  );
  return { items, adding, me, openMenu: setMenuFor as (item: QueueItemView) => void, menus };
}

/** Someone may open the ⋯ of this song (pin, wish, remove, block). */
export function hasItemMenu(item: QueueItemView, me: MemberView | null): boolean {
  const mine = Boolean(me && item.addedBy?.id === me.id);
  return Boolean(me && !me.isDevice && (me.role === 'ADMIN' || me.canControl || mine));
}

/** ♥ for a waiting song (count beside it); a read-only count for the speaker device. */
export function HeartButton({ item, me, className = '' }: { item: QueueItemView; me: MemberView | null; className?: string }) {
  const t = useT();
  const act = useAct();
  const hearted = Boolean(me && item.heartedBy.includes(me.id));
  if (!me || me.isDevice) return item.hearts > 0 ? <span className={`px-2 text-[13px] text-sage ${className}`}>{t.queue.hearts(item.hearts)}</span> : null;
  return (
    <button
      type="button"
      aria-label={hearted ? t.queue.unheart : t.queue.heart}
      aria-pressed={hearted}
      onClick={() => act('queue:heart', { queueItemId: item.id }, { optimistic: { kind: 'heart', itemId: item.id, hearted: !hearted } })}
      className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-row px-2 text-[13px] tabular-nums transition-colors hover:bg-panel-hi ${
        hearted ? 'text-onair' : 'text-sage'
      } ${className}`}
    >
      <Heart className="h-[18px] w-[18px]" fill={hearted ? 'currentColor' : 'none'} aria-hidden />
      {item.hearts > 0 && <span>{item.hearts}</span>}
    </button>
  );
}

export function QueueList({ onAdd }: { onAdd?: () => void }) {
  const t = useT();
  const { items, adding, me, openMenu, menus } = useQueueView();

  return (
    <section aria-labelledby="queue-title">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 id="queue-title" className="type-display text-[20px] font-bold">
          {t.queue.title}
        </h2>
        {items.length + adding.length > 0 && <span className="text-[13px] text-sage tabular-nums">{items.length + adding.length}</span>}
      </div>

      {items.length === 0 && adding.length === 0 ? (
        <div className="rounded-panel border border-dashed border-line px-5 py-8 text-center">
          <p className="text-sage">{t.queue.empty}</p>
          {onAdd && !me?.isDevice && (
            <Button size="sm" variant="primary" className="mt-4" onClick={onAdd}>
              <Plus className="h-4 w-4" aria-hidden />
              {t.queue.addFirst}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupQueue(items).map((g) => (
            <div key={g.key}>
              {g.title && <h3 className="mb-1 px-1 text-[13px] font-medium text-sage">{g.title}</h3>}
              <ol className="divide-y divide-line/70 rounded-panel bg-panel px-1">
                {g.items.map((item) => (
                  <QueueRow key={item.id} item={item} me={me} onMenu={openMenu} />
                ))}
              </ol>
            </div>
          ))}
          {adding.length > 0 && (
            <div>
              <h3 className="mb-1 px-1 text-[13px] font-medium text-sage">{t.queue.addingGroup}</h3>
              <ol className="divide-y divide-line/70 rounded-panel bg-panel px-1">
                {adding.map((a) => (
                  <AddingRow key={a.id} op={a} />
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {menus}
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
  const t = useT();
  const mine = Boolean(me && item.addedBy?.id === me.id);
  const hasMenu = hasItemMenu(item, me);

  return (
    <li className="flex animate-rise items-center gap-3 py-2.5 pl-2.5 pr-1">
      <Thumb url={item.track.thumbnailUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium [unicode-bidi:plaintext]" title={item.track.title}>
          {item.track.title}
        </p>
        <p className="flex items-center gap-2 text-[13px] text-sage">
          <span className="truncate">
            {addedByLabel(item)}
            {mine && ` (${t.queue.you})`}
          </span>
          {item.track.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(item.track.durationSec)}</span> : null}
          {item.wishMessage && <Mail className="h-3.5 w-3.5 shrink-0 text-amber" aria-label={t.queue.hasWish} />}
        </p>
      </div>
      <SaveButton track={item.track} />
      <HeartButton item={item} me={me} />
      {hasMenu && (
        <IconButton label={t.queue.actions(item.track.title)} onClick={() => onMenu(item)}>
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </IconButton>
      )}
    </li>
  );
});

/** A song the server is still fetching (title and duration come from YouTube). */
function AddingRow({ op }: { op: AddOp }) {
  const t = useT();
  return (
    <li className="flex animate-rise items-center gap-3 py-2.5 pl-2.5 pr-3 opacity-80" aria-busy="true">
      <Thumb url={op.thumbnailUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{op.title ?? t.queue.addingTitle}</p>
        <p className="text-[13px] text-sage">{t.add.adding}</p>
      </div>
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber" aria-hidden />
    </li>
  );
}

function ItemMenu({
  item,
  me,
  onClose,
  onWish,
  onBlock,
}: {
  item: QueueItemView;
  me: MemberView | null;
  onClose: () => void;
  onWish: () => void;
  onBlock: () => void;
}) {
  const t = useT();
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
            onClick={() => run(() => act('queue:pin-next', { queueItemId: item.id }, { optimistic: { kind: 'pin', itemId: item.id, pinned: !item.pinned } }))}
          >
            {item.pinned ? t.queue.unpin : t.queue.pin}
          </SheetAction>
        )}
        {mine && (
          <SheetAction icon={<Mail className="h-5 w-5" />} onClick={onWish}>
            {item.wishMessage ? t.queue.editWish : t.queue.wish}
          </SheetAction>
        )}
        {(mine || isAdmin) && (
          <SheetAction
            danger
            icon={<Trash2 className="h-5 w-5" />}
            onClick={() => run(() => act('queue:remove', { queueItemId: item.id }, { optimistic: { kind: 'remove', itemId: item.id } }))}
          >
            {t.queue.remove}
          </SheetAction>
        )}
        {isAdmin && (
          <SheetAction danger icon={<Ban className="h-5 w-5" />} onClick={onBlock}>
            {t.block.menu}
          </SheetAction>
        )}
      </div>
    </Dialog>
  );
}
