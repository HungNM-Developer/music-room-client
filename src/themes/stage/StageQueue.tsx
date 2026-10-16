'use client';

import { Loader2, Mail, MoreHorizontal, Pin, Plus } from 'lucide-react';
import { HeartButton, hasItemMenu, useQueueView } from '@/components/room/QueueList';
import { SaveButton } from '@/components/room/SaveButton';
import { IconButton } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import { vi } from '@/i18n/vi';
import { addedByLabel } from '@/lib/added-by';
import { formatDuration } from '@/lib/time';

/**
 * "Tiếp theo" for themed stages: a flat list in play order (pinned songs first), each
 * row with ♥, Lưu and ⋯ (pin, wish, remove, block). `numbered` when the order matters
 * visually (hi-fi); `variant` is the CSS hook (round covers, chalkboard…).
 */
export function StageQueue({
  openAdd,
  numbered = false,
  variant,
  title = vi.queue.title,
  lead,
  tail,
  className = '',
}: {
  openAdd: () => void;
  /** Under the heading, before the list (e.g. the next songs as planets). */
  lead?: React.ReactNode;
  /** After the list, inside the same box (e.g. a handwritten suggestion line). */
  tail?: React.ReactNode;
  numbered?: boolean;
  variant?: string;
  title?: string;
  className?: string;
}) {
  const { items, adding, me, openMenu, menus } = useQueueView();
  const empty = items.length === 0 && adding.length === 0;
  return (
    <section aria-labelledby="queue-title" className={`stage-queue ${className}`} data-variant={variant}>
      <h3 id="queue-title" aria-label={vi.queue.title} className="stage-h3">
        {title}
        {!empty && <span className="stage-count">{items.length + adding.length}</span>}
      </h3>
      {lead}
      {empty ? (
        <div className="stage-empty">
          <p>{vi.queue.empty}</p>
          {!me?.isDevice && (
            <button type="button" className="stage-btn" data-primary onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden />
              {vi.queue.addFirst}
            </button>
          )}
        </div>
      ) : (
        <ol className="stage-list">
          {items.map((item, i) => {
            const mine = Boolean(me && item.addedBy?.id === me.id);
            return (
              <li key={item.id} className="stage-q animate-rise">
                {numbered && <span className="stage-q-n">{i + 1}</span>}
                <Thumb url={item.track.thumbnailUrl} size={44} className="stage-q-th" />
                <div className="min-w-0 flex-1">
                  <p className="stage-q-title" title={item.track.title}>
                    {item.track.title}
                  </p>
                  <p className="stage-q-meta">
                    <span className="truncate">
                      {addedByLabel(item)}
                      {mine && ` (${vi.queue.you})`}
                    </span>
                    {item.pinned && <Pin className="h-3.5 w-3.5 shrink-0" aria-label={vi.queue.pinnedGroup} />}
                    {item.wishMessage && <Mail className="h-3.5 w-3.5 shrink-0" aria-label={vi.queue.hasWish} />}
                    {item.track.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(item.track.durationSec)}</span> : null}
                  </p>
                </div>
                <span className="stage-q-actions">
                  <SaveButton track={item.track} />
                  <HeartButton item={item} me={me} />
                  {hasItemMenu(item, me) && (
                    <IconButton label={vi.queue.actions(item.track.title)} onClick={() => openMenu(item)}>
                      <MoreHorizontal className="h-5 w-5" aria-hidden />
                    </IconButton>
                  )}
                </span>
              </li>
            );
          })}
          {adding.map((op) => (
            <li key={op.id} className="stage-q opacity-80" aria-busy="true">
              {numbered && <span className="stage-q-n">·</span>}
              <Thumb url={op.thumbnailUrl} size={44} className="stage-q-th" />
              <div className="min-w-0 flex-1">
                <p className="stage-q-title">{op.title ?? vi.queue.addingTitle}</p>
                <p className="stage-q-meta">{vi.add.adding}</p>
              </div>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber" aria-hidden />
            </li>
          ))}
        </ol>
      )}
      {tail}
      {menus}
    </section>
  );
}
