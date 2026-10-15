import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import type { TrackSummary } from '@/contracts';
import { vi } from '@/i18n/vi';
import { SaveButton } from './SaveButton';

/** A song in search results, "Đã phát" or "Yêu thích": artwork, title, details, Lưu and Thêm. */
export function TrackRow({
  track,
  meta,
  done,
  addLabel = vi.add.addResult,
  onAdd,
}: {
  track: TrackSummary;
  /** Second line (channel and length, who played it last, …). */
  meta: React.ReactNode;
  /** Already sent to the queue from this panel. */
  done: boolean;
  addLabel?: string;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5 pl-2.5 pr-1">
      <Thumb url={track.thumbnailUrl} size={72} ratio="wide" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14px] font-medium leading-snug [unicode-bidi:plaintext]" title={track.title}>
          {track.title}
        </p>
        <div className="mt-0.5 text-[12px] text-sage">{meta}</div>
      </div>
      <SaveButton track={track} />
      <Button size="sm" disabled={done} onClick={onAdd} aria-label={vi.library.addTrack(track.title)}>
        {done ? <Check className="h-4 w-4 text-amber" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        <span className="hidden sm:inline">{addLabel}</span>
      </Button>
    </li>
  );
}
