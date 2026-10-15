'use client';

import { Bookmark } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { TrackSummary } from '@/contracts';
import { errorMessage, vi } from '@/i18n/vi';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/**
 * "Lưu" (A2): save the song to this member's favourites. Not "Thả tim", which is a
 * vote that moves a song up the queue. Hidden on the shared speaker page.
 */
export function SaveButton({ track }: { track: TrackSummary }) {
  const me = useMe();
  const toast = useToast();
  const saved = useRoom((s) => s.favoriteIds.includes(track.id) || s.localFavorites.includes(track.externalId));
  if (!me || me.isDevice) return null;
  return (
    <IconButton
      label={vi.library.save}
      aria-pressed={saved}
      className={saved ? '!text-amber' : ''}
      onClick={async () => {
        const r = await room.setFavorite(track, !saved);
        if (!r.ok) toast(errorMessage(r.error.code, r.error.params), 'error');
      }}
    >
      <Bookmark className="h-[18px] w-[18px]" fill={saved ? 'currentColor' : 'none'} aria-hidden />
    </IconButton>
  );
}
