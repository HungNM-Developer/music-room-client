'use client';

import { Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import type { PlaylistSummaryView, TrackSummary } from '@/contracts';
import { LIMITS } from '@/contracts/constants';
import { errorMessage, vi } from '@/i18n/vi';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/**
 * L2: "Lưu vào…" (like YouTube's save menu) — Yêu thích first, then the account's
 * playlists with a tick when the song is in them, then "Playlist mới".
 */
export function SaveToDialog({ track, onClose }: { track: TrackSummary; onClose: () => void }) {
  const toast = useToast();
  const favorite = useRoom((s) => s.favoriteIds.includes(track.id) || s.localFavorites.includes(track.externalId));
  const [lists, setLists] = useState<PlaylistSummaryView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    let alive = true;
    void room.send('playlist:mine', { trackId: track.id }).then((r) => {
      if (alive) setLists(r.ok ? r.data.playlists : []);
    });
    return () => {
      alive = false;
    };
  }, [track.id]);

  const fail = (r: { error: { code: Parameters<typeof errorMessage>[0]; params?: Parameters<typeof errorMessage>[1] } }) =>
    toast(errorMessage(r.error.code, r.error.params), 'error');

  async function toggleList(p: PlaylistSummaryView) {
    const saved = !p.hasTrack;
    setBusy(p.id);
    setLists((ls) => ls?.map((x) => (x.id === p.id ? { ...x, hasTrack: saved, trackCount: x.trackCount + (saved ? 1 : -1) } : x)) ?? null);
    const r = await room.send('playlist:set-track', { id: p.id, trackId: track.id, saved });
    setBusy(null);
    if (r.ok) toast(saved ? vi.playlists.savedTo(p.name) : vi.playlists.removedFrom(p.name), 'success');
    else {
      setLists((ls) => ls?.map((x) => (x.id === p.id ? p : x)) ?? null);
      fail(r);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy('new');
    const r = await room.send('playlist:create', { name: n, trackIds: [track.id] });
    setBusy(null);
    if (!r.ok) return fail(r);
    toast(vi.playlists.created(n), 'success');
    setName('');
    setLists((ls) => [
      { id: r.data.id, name: n, trackCount: 1, coverUrl: track.thumbnailUrl, shared: false, updatedAt: new Date().toISOString(), hasTrack: true },
      ...(ls ?? []),
    ]);
  }

  return (
    <Dialog open onClose={onClose} title={vi.playlists.saveTo}>
      <ul className="-mx-1 max-h-[45vh] space-y-0.5 overflow-y-auto">
        <li>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-row px-1 hover:bg-panel-hi">
            <input
              type="checkbox"
              className="h-5 w-5 accent-amber"
              checked={favorite}
              onChange={async () => {
                const r = await room.setFavorite(track, !favorite);
                if (!r.ok) fail(r);
              }}
            />
            <span className="font-medium">{vi.library.favorites}</span>
          </label>
        </li>
        {!lists && (
          <li className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-sage" aria-hidden />
          </li>
        )}
        {lists?.map((p) => (
          <li key={p.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-row px-1 hover:bg-panel-hi">
              <input type="checkbox" className="h-5 w-5 accent-amber" checked={Boolean(p.hasTrack)} disabled={busy === p.id} onChange={() => void toggleList(p)} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="shrink-0 text-[13px] sm:text-[12px] text-sage">{vi.playlists.count(p.trackCount)}</span>
            </label>
          </li>
        ))}
      </ul>
      <form onSubmit={create} className="mt-4 flex gap-2 border-t border-line/70 pt-4">
        <label htmlFor="new-playlist" className="sr-only">
          {vi.playlists.newName}
        </label>
        <input
          id="new-playlist"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={LIMITS.playlistName}
          placeholder={vi.playlists.newPlaylist}
          className="field min-w-0 flex-1"
          autoComplete="off"
        />
        <Button type="submit" disabled={!name.trim() || busy === 'new'} aria-busy={busy === 'new'}>
          <Plus className="h-4 w-4" aria-hidden /> {vi.playlists.create}
        </Button>
      </form>
    </Dialog>
  );
}
