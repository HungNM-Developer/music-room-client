import { Ban, Check, MessageSquareHeart, MoreHorizontal, Plus } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import type { TrackSummary } from '@/contracts';
import { useT } from '@/i18n';
import { useRoom } from '@/state/hooks';
import { SaveButton } from './SaveButton';

/** A song in search results, "Đã phát" or "Yêu thích": artwork, title, details, Lưu, Thêm and Thêm kèm lời chúc. */
export function TrackRow({
  track,
  meta,
  done,
  addLabel,
  onAdd,
  onAddWithWish,
  onMore,
}: {
  track: TrackSummary;
  /** Second line (channel and length, who played it last, …). */
  meta: React.ReactNode;
  /** Already sent to the queue from this panel. */
  done: boolean;
  addLabel?: string;
  onAdd: () => void;
  /** Adds it with a wish (the sheet opens first); omitted where wishes do not apply. */
  onAddWithWish?: () => void;
  /** Admin's ⋯ (block the song); omitted for everyone else. */
  onMore?: () => void;
}) {
  const t = useT();
  addLabel ??= t.add.addResult;
  // A6: a song already waiting or on air cannot be added again.
  const inQueue = useRoom(
    (s) =>
      s.snapshot?.nowPlaying?.item.track.id === track.id ||
      Boolean(s.snapshot?.queue.some((q) => q.track.id === track.id)),
  );
  // Blocked by the admin: nobody can add it (the server refuses it too).
  const blocked = useRoom((s) => Boolean(s.snapshot?.room.blockedTrackIds.includes(track.id)));
  // The row sizes itself to its own width (the add panel is a 400 px column on desktop):
  // narrow, the title gets the full line and the buttons move under it.
  return (
    <li className="@container py-2.5 pl-2.5 pr-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Thumb url={track.thumbnailUrl} size={72} ratio="wide" />
        <div className="min-w-0 flex-1 basis-[calc(100%-6rem)] @lg:basis-0">
          <p className="line-clamp-2 text-[14px] font-medium leading-snug [unicode-bidi:plaintext]" title={track.title}>
            {track.title}
          </p>
          <div className="mt-0.5 text-[13px] sm:text-[12px] text-sage">{meta}</div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <SaveButton track={track} />
          {blocked ? (
            <Button size="sm" disabled aria-label={t.block.blockedTrack(track.title)} title={t.block.label}>
              <Ban className="h-4 w-4 text-alert" aria-hidden />
              {t.block.label}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={done || inQueue}
              onClick={onAdd}
              aria-label={inQueue ? `${t.library.inQueue}: ${track.title}` : t.library.addTrack(track.title)}
              title={inQueue ? t.library.inQueue : undefined}
            >
              {done || inQueue ? <Check className="h-4 w-4 text-amber" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              {inQueue ? t.library.inQueue : addLabel}
            </Button>
          )}
          {onAddWithWish && !blocked && !done && !inQueue && (
            <IconButton label={t.add.withWish(track.title)} title={t.add.withWishShort} onClick={onAddWithWish}>
              <MessageSquareHeart className="h-5 w-5" aria-hidden />
            </IconButton>
          )}
          {onMore && !blocked && (
            <IconButton label={t.block.more(track.title)} onClick={onMore}>
              <MoreHorizontal className="h-5 w-5" aria-hidden />
            </IconButton>
          )}
        </div>
      </div>
    </li>
  );
}
