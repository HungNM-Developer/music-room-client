'use client';

import { ListPlus, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import { useToast } from '@/components/ui/Toast';
import type { TrackSummary } from '@/contracts';
import { ADD_MANY_MAX } from '@/contracts/constants';
import { errorMessage, vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import { useBlockedIds, useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

export type PickerSource = { kind: 'youtube'; url: string } | { kind: 'shared'; code: string };

/**
 * A5 / L2: the songs of a YouTube playlist or a shared Music Room playlist, to pick and
 * add in one go. Choices stop at the member's free queue slots; the server skips (and
 * says why) what the room refuses. Signed in, the list can be kept as one's own playlist.
 */
export function PlaylistPicker({ source, onClose }: { source: PickerSource; onClose: () => void }) {
  const user = useRoom((s) => s.user);
  const [title, setTitle] = useState<string | null>(null);
  const [kept, setKept] = useState(false);
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
  const blocked = useBlockedIds();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load =
      source.kind === 'youtube'
        ? room.send('playlist:open', { url: source.url }).then((r) => (r.ok ? { ok: true as const, tracks: r.data.tracks, title: null } : r))
        : room
            .send('playlist:get', { shareCode: source.code })
            .then((r) => (r.ok ? { ok: true as const, tracks: r.data.tracks, title: `${vi.playlists.by(r.data.owner.name)}: ${r.data.name}` } : r));
    void load.then((r) => {
      if (!alive) return;
      if (r.ok) {
        setTracks(r.tracks);
        setTitle(r.title);
      } else setError(errorMessage(r.error.code, r.error.params));
    });
    return () => {
      alive = false;
    };
  }, [source]);

  /** L2: keep this list as one's own playlist (YouTube) or copy the shared one. */
  async function keep() {
    if (!tracks) return;
    const r =
      source.kind === 'youtube'
        ? await room.send('playlist:create', { name: vi.playlists.youtubeName, trackIds: tracks.map((t) => t.id).slice(0, 200) })
        : await room.send('playlist:copy', { shareCode: source.code });
    if (!r.ok) {
      toast(errorMessage(r.error.code, r.error.params), 'error');
      return;
    }
    setKept(true);
    toast(source.kind === 'youtube' ? vi.playlists.created(vi.playlists.youtubeName) : vi.playlists.copied, 'success');
  }

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
        <p className="min-w-0 flex-1 text-[14px] font-medium">
          {title && <span className="block truncate">{title}</span>}
          {tracks ? vi.playlist.count(tracks.length) : error ? null : vi.playlist.opening}
        </p>
        {user && tracks && (
          <Button size="sm" variant="ghost" disabled={kept} onClick={keep}>
            <ListPlus className="h-4 w-4" aria-hidden />
            {source.kind === 'youtube' ? vi.playlists.saveYoutube : vi.playlists.copy}
          </Button>
        )}
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
              const isBlocked = blocked.has(t.id);
              const taken = inQueue.has(t.id) || isBlocked;
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
                        {isBlocked ? (
                          <span className="text-alert">{vi.block.label}</span>
                        ) : taken ? (
                          <span>{vi.library.inQueue}</span>
                        ) : (
                          t.channel && <span className="truncate">{t.channel}</span>
                        )}
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
