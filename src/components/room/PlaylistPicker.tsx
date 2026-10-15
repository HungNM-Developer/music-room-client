'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import { useToast } from '@/components/ui/Toast';
import type { TrackSummary } from '@/contracts';
import { ADD_MANY_MAX } from '@/contracts/constants';
import { errorMessage, vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/**
 * A5: the songs of a YouTube playlist, to pick and add in one go. Choices stop at the
 * member's free queue slots; the server skips (and says why) what the room refuses.
 */
export function PlaylistPicker({ url, onClose }: { url: string; onClose: () => void }) {
  const me = useMe();
  const toast = useToast();
  const max = useRoom((s) => s.snapshot?.room.settings.maxQueuedPerMember ?? 0);
  const mine = useRoom((s) => (s.snapshot?.queue ?? []).filter((q) => q.addedBy?.id === s.memberId).length);
  const queued = useRoom((s) => {
    const ids = new Set((s.snapshot?.queue ?? []).map((q) => q.track.id));
    const np = s.snapshot?.nowPlaying?.item.track.id;
    if (np) ids.add(np);
    return [...ids].join('|');
  });
  const [tracks, setTracks] = useState<TrackSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void room.send('playlist:open', { url }).then((r) => {
      if (!alive) return;
      if (r.ok) setTracks(r.data.tracks);
      else setError(errorMessage(r.error.code, r.error.params));
    });
    return () => {
      alive = false;
    };
  }, [url]);

  const slots = Math.max(0, Math.min(max - mine, ADD_MANY_MAX));
  const inQueue = new Set(queued.split('|'));
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < slots ? [...p, id] : p));

  async function addPicked() {
    if (!picked.length || busy) return;
    setBusy(true);
    const r = await room.send('queue:add-many', { trackIds: picked });
    setBusy(false);
    if (!r.ok) {
      toast(errorMessage(r.error.code, r.error.params), 'error');
      return;
    }
    const { added, skipped } = r.data;
    const why = skipped.length ? `. ${vi.playlist.skipped(skipped.length)}: ${errorMessage(skipped[0].reason)}` : '';
    toast(`${vi.playlist.added(added)}${why}`, added ? 'success' : 'error');
    setPicked([]);
  }

  if (!me || me.isDevice) return null;

  return (
    <div className="space-y-3 rounded-panel bg-panel p-3">
      <div className="flex items-center gap-2 pl-1">
        <p className="flex-1 text-[14px] font-medium">
          {tracks ? vi.playlist.count(tracks.length) : error ? null : vi.playlist.opening}
        </p>
        <IconButton label={vi.playlist.close} onClick={onClose}>
          <X className="h-5 w-5" aria-hidden />
        </IconButton>
      </div>
      {!tracks && !error && <Loader2 className="mx-auto h-5 w-5 animate-spin text-sage" aria-hidden />}
      {error && (
        <p role="alert" className="px-1 text-[14px] text-sage">
          {error}
        </p>
      )}
      {tracks && (
        <>
          <p className="px-1 text-[13px] text-sage">{vi.playlist.slots(slots)}</p>
          <ul aria-label={vi.playlist.listLabel} className="max-h-[50vh] divide-y divide-line/70 overflow-y-auto">
            {tracks.map((t) => {
              const taken = inQueue.has(t.id);
              const on = picked.includes(t.id);
              return (
                <li key={t.id}>
                  <label className={`flex items-center gap-3 px-1 py-2 ${taken ? 'opacity-50' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-amber"
                      checked={on || taken}
                      disabled={taken || (!on && picked.length >= slots)}
                      onChange={() => toggle(t.id)}
                      aria-label={vi.playlist.choose(t.title)}
                    />
                    <Thumb url={t.thumbnailUrl} size={56} ratio="wide" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[14px] leading-snug [unicode-bidi:plaintext]">{t.title}</span>
                      <span className="mt-0.5 flex gap-2 text-[12px] text-sage">
                        {taken ? <span>{vi.library.inQueue}</span> : t.channel && <span className="truncate">{t.channel}</span>}
                        {t.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(t.durationSec)}</span> : null}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <Button variant="primary" className="w-full" disabled={!picked.length || busy} aria-busy={busy} onClick={addPicked}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {vi.playlist.addSelected(picked.length)}
          </Button>
        </>
      )}
    </div>
  );
}
