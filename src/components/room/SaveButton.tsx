'use client';

import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { TrackSummary } from '@/contracts';
import { errorMessage, useT } from '@/i18n';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { SaveToDialog } from './SaveToDialog';

/**
 * "Lưu" (A2): save the song to this member's favourites. Not "Thả tim", which is a
 * vote that moves a song up the queue. Hidden on the shared speaker page. Signed in
 * (L2), it opens "Lưu vào…" to pick favourites and playlists.
 */
export function SaveButton({ track }: { track: TrackSummary }) {
  const t = useT();
  const me = useMe();
  const toast = useToast();
  const saved = useRoom((s) => s.favoriteIds.includes(track.id) || s.localFavorites.includes(track.externalId));
  const user = useRoom((s) => s.user);
  const [open, setOpen] = useState(false);
  if (!me || me.isDevice) return null;
  return (
    <>
      <IconButton
        label={user ? t.playlists.saveTo : t.library.save}
        data-guide="save"
        aria-pressed={user ? undefined : saved}
        aria-haspopup={user ? 'dialog' : undefined}
        className={saved ? '!text-amber' : ''}
        onClick={async () => {
          if (user) return setOpen(true);
          const r = await room.setFavorite(track, !saved);
          if (!r.ok) toast(errorMessage(r.error.code, r.error.params), 'error');
        }}
      >
        <Bookmark className="h-[18px] w-[18px]" fill={saved ? 'currentColor' : 'none'} aria-hidden />
      </IconButton>
      {open && <SaveToDialog track={track} onClose={() => setOpen(false)} />}
    </>
  );
}
