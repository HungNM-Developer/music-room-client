'use client';

import { Loader2, Play, Radio, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { TrackSummary } from '@/contracts';
import { useAddTrack } from '@/hooks/useAddTrack';
import { useT } from '@/i18n';
import { findSongs } from '@/lib/find-songs';
import { roomSuggestions } from '@/lib/room-suggestions';
import { useMe } from '@/state/hooks';
import { PlayerCover } from './PlayerCover';

/**
 * Over the speaker's (or a listen-along) video while the room has no song: nothing is loaded
 * in the player, so YouTube's own ▶ would only show an error. Colours and type come from the
 * theme's tokens, so it fits every theme. Members get the first suggestion to play in one
 * tap and a way to search; the /host screen (`forHost`) shows the title only (its own
 * "scan the QR code" line sits right under the video).
 */
export function IdleCover({ forHost = false }: { forHost?: boolean }) {
  const t = useT();
  const me = useMe();
  const canAdd = !forHost && Boolean(me && !me.isDevice);
  const { add } = useAddTrack();
  const [pick, setPick] = useState<TrackSummary | null>(null);
  const [busy, setBusy] = useState(false);

  // The room's first suggestion (YouTube's trending songs when nothing has played lately).
  useEffect(() => {
    if (!canAdd) return;
    let alive = true;
    void roomSuggestions(null).then((items) => {
      const first = items.find((i) => i.kind === 'track');
      if (alive && first?.kind === 'track') setPick(first.track);
    });
    return () => {
      alive = false;
    };
  }, [canAdd]);

  async function playNow(track: TrackSummary) {
    setBusy(true);
    // The room is idle: an added song starts at once.
    await add(track.id, track);
    setBusy(false);
  }

  // /host: the page already says "scan the QR code" right under the video, so the title only.
  return (
    <PlayerCover icon={<Radio />} title={t.nowPlaying.idleTitle} note={forHost || canAdd ? undefined : t.nowPlaying.idle} className="z-10">
      {canAdd ? (
        <>
          {pick && (
            <Button size="sm" variant="primary" disabled={busy} aria-busy={busy} onClick={() => void playNow(pick)} className="pc-primary w-full max-w-full">
              {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <Play className="h-4 w-4 shrink-0" aria-hidden />}
              <span className="truncate">{t.nowPlaying.playNow(pick.title)}</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={findSongs} className="pc-ghost">
            <Search className="h-4 w-4" aria-hidden />
            {t.nowPlaying.findSong}
          </Button>
        </>
      ) : null}
    </PlayerCover>
  );
}
