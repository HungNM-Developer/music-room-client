'use client';

import { useEffect, useState } from 'react';
import type { LyricsView } from '@/contracts';
import { estimatePosition } from '@/lib/time';
import { useNowPlaying, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/** Lyrics already fetched on this page, per track (the server caches them too). */
const known = new Map<string, LyricsView | null>();

/** A7: lyrics of `trackId` (undefined while loading, null when there are none). */
export function useLyrics(trackId: string | null): LyricsView | null | undefined {
  const [attempt, setAttempt] = useState(0);
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!trackId || known.has(trackId)) return;
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    void room.send('lyrics:get', { trackId }).then((r) => {
      if (!alive) return;
      if (r.ok) {
        known.set(trackId, r.data.lyrics);
        rerender((n) => n + 1);
      } else if (attempt < 3) {
        // LRCLIB busy or unreachable: not "no lyrics", so ask again a bit later.
        retry = setTimeout(() => setAttempt((n) => n + 1), 30_000);
      }
    });
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
    };
  }, [trackId, attempt]);
  if (!trackId) return null;
  return known.has(trackId) ? known.get(trackId) : undefined;
}

/** Seconds into the song on air, refreshed four times a second while it plays. */
export function useSongPosition(): number {
  const np = useNowPlaying();
  const offset = useRoom((s) => s.offset);
  const [now, setNow] = useState(() => Date.now());
  const playing = np?.status === 'PLAYING';
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [playing]);
  return np ? estimatePosition({ ...np, durationSec: np.item.track.durationSec }, offset, now) : 0;
}

/** Index of the line being sung at `pos` seconds (-1 before the first line). */
export function lineAt(lines: { t: number }[], pos: number): number {
  let i = -1;
  for (let k = 0; k < lines.length && lines[k].t <= pos + 0.15; k++) i = k;
  return i;
}
