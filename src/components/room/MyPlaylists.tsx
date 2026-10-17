'use client';

import { ArrowLeft, ChevronRight, Copy, ListMusic, Loader2, MoreHorizontal, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { Dialog, SheetAction } from '@/components/ui/Dialog';
import { Thumb } from '@/components/ui/Thumb';
import { useToast } from '@/components/ui/Toast';
import type { PlaylistSummaryView, PlaylistView, TrackSummary } from '@/contracts';
import { ADD_MANY_MAX, LIMITS } from '@/contracts/constants';
import type { useAddTrack } from '@/hooks/useAddTrack';
import { errorMessage, useT } from '@/i18n';
import { playlistName } from '@/i18n/activity';
import { formatDuration } from '@/lib/time';
import { useBlockedIds, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { YouTubeImport } from './YouTubeImport';

type Add = ReturnType<typeof useAddTrack>['add'];

/** L2: the account's playlists inside "Của tôi"; a tap opens one. */
export function MyPlaylists({ add, added }: { add: Add; added: Set<string> }) {
  const t = useT();
  const [lists, setLists] = useState<PlaylistSummaryView[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    const r = await room.send('playlist:mine', {});
    setLists(r.ok ? r.data.playlists : []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load, state is set after the reply
    void load();
  }, [load, openId, version]);

  if (openId)
    return <PlaylistDetail id={openId} add={add} added={added} onBack={() => setOpenId(null)} />;

  return (
    <section aria-labelledby="pl-title" className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 id="pl-title" className="text-[15px] font-semibold">
          {t.playlists.title}
        </h3>
        <YouTubeImport onImported={() => setVersion((v) => v + 1)} />
      </div>
      {!lists && <Loader2 className="mx-auto h-5 w-5 animate-spin text-sage" aria-hidden />}
      {lists?.length === 0 && <p className="px-1 text-[14px] text-sage">{t.playlists.empty}</p>}
      {lists && lists.length > 0 && (
        <ul aria-label={t.playlists.listLabel} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {lists.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpenId(p.id)} className="flex w-full items-center gap-3 py-2.5 pl-2.5 pr-2 text-left hover:text-amber">
                {p.coverUrl ? (
                  <Thumb url={p.coverUrl} size={48} />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-row bg-dial-deep text-sage">
                    <ListMusic className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{playlistName(p, t)}</span>
                  <span className="flex gap-2 text-[13px] sm:text-[12px] text-sage">
                    <span>{t.playlists.count(p.trackCount)}</span>
                    {p.shared && <span>{t.playlists.shared}</span>}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-sage" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One playlist: rename, share, delete, reorder, and add its songs to the queue. */
function PlaylistDetail({ id, add, added, onBack }: { id: string; add: Add; added: Set<string>; onBack: () => void }) {
  const t = useT();
  const toast = useToast();
  const [pl, setPl] = useState<PlaylistView | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<TrackSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const blocked = useBlockedIds();
  const max = useRoom((s) => s.snapshot?.room.settings.maxQueuedPerMember ?? 0);
  const mine = useRoom((s) => (s.snapshot?.queue ?? []).filter((q) => q.addedBy?.id === s.memberId).length);
  const waiting = useRoom((s) => {
    const ids = (s.snapshot?.queue ?? []).map((q) => q.track.id);
    const np = s.snapshot?.nowPlaying?.item.track.id;
    return (np ? [...ids, np] : ids).join('|');
  });

  const load = useCallback(async () => {
    const r = await room.send('playlist:get', { id });
    if (r.ok) setPl(r.data);
    else {
      toast(errorMessage(r.error.code, r.error.params), 'error');
      onBack();
    }
  }, [id, onBack, toast]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load, state is set after the reply
    void load();
  }, [load]);

  const call = async (r: Promise<{ ok: boolean; error?: { code: Parameters<typeof errorMessage>[0]; params?: Parameters<typeof errorMessage>[1] } }>) => {
    const res = await r;
    if (!res.ok && res.error) toast(errorMessage(res.error.code, res.error.params), 'error');
    await load();
    return res.ok;
  };

  if (!pl) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-sage" aria-hidden />;

  const inQueue = new Set(waiting.split('|'));
  const slots = Math.max(0, Math.min(max - mine, ADD_MANY_MAX));
  // Blocked songs would only be refused and use up the free slots.
  const toQueue = pl.tracks.filter((item) => !inQueue.has(item.id) && !blocked.has(item.id)).slice(0, slots);
  const link = pl.shareCode ? `${window.location.origin}/p/${pl.shareCode}` : null;

  async function queueAll() {
    if (!toQueue.length) return;
    setBusy(true);
    const r = await room.send('queue:add-many', { trackIds: toQueue.map((item) => item.id) });
    setBusy(false);
    if (!r.ok) return toast(errorMessage(r.error.code, r.error.params), 'error');
    const why = r.data.skipped.length ? `. ${t.playlist.skipped(r.data.skipped.length)}: ${errorMessage(r.data.skipped[0].reason)}` : '';
    toast(`${t.playlist.added(r.data.added)}${why}`, r.data.added ? 'success' : 'error');
  }

  const move = (item: TrackSummary, delta: number) => {
    const at = pl.tracks.findIndex((x) => x.id === item.id);
    setMenuFor(null);
    void call(room.send('playlist:move', { id, trackId: item.id, to: at + delta }));
  };

  return (
    <section aria-labelledby="pl-detail" className="space-y-3">
      <Button size="sm" variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t.playlists.back}
      </Button>

      {renaming !== null ? (
        <form
          className="flex gap-2 px-1"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!renaming.trim()) return;
            if (await call(room.send('playlist:update', { id, name: renaming.trim() }))) setRenaming(null);
          }}
        >
          <label htmlFor="pl-name" className="sr-only">
            {t.playlists.newName}
          </label>
          <input id="pl-name" value={renaming} onChange={(e) => setRenaming(e.target.value)} maxLength={LIMITS.playlistName} className="field min-w-0 flex-1" data-autofocus />
          <Button type="submit" variant="primary">
            {t.playlists.save}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 px-1">
          <h3 id="pl-detail" className="type-display min-w-0 flex-1 truncate text-[20px] font-bold">
            {playlistName(pl, t)}
          </h3>
          <IconButton label={t.playlists.rename} onClick={() => setRenaming(playlistName(pl, t))}>
            <Pencil className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton label={t.playlists.delete} tone="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>
      )}

      <div className="flex flex-wrap gap-2 px-1">
        <Button variant="primary" size="sm" disabled={busy || !toQueue.length} aria-busy={busy} onClick={queueAll}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t.playlists.queueAll(toQueue.length)}
        </Button>
        <Button size="sm" onClick={() => void call(room.send('playlist:share', { id, enabled: !pl.shareCode }))}>
          <Share2 className="h-4 w-4" aria-hidden /> {pl.shareCode ? t.playlists.shareOff : t.playlists.shareOn}
        </Button>
      </div>
      {link && (
        <div className="space-y-1.5 rounded-row border border-line/70 p-3">
          <p className="text-[13px] text-sage">{t.playlists.shareNote}</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-[13px]">{link}</code>
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard?.writeText(link).catch(() => undefined);
                toast(t.playlists.linkCopied, 'success');
              }}
            >
              <Copy className="h-4 w-4" aria-hidden /> {t.playlists.copyLink}
            </Button>
          </div>
        </div>
      )}

      {pl.tracks.length === 0 ? (
        <p className="px-1 text-[14px] text-sage">{t.playlists.emptyList}</p>
      ) : (
        <ol aria-label={t.playlists.tracksLabel} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {pl.tracks.map((item) => {
            const isBlocked = blocked.has(item.id);
            const taken = inQueue.has(item.id) || added.has(item.id) || isBlocked;
            return (
              <li key={item.id} className="flex items-center gap-3 py-2.5 pl-2.5 pr-1">
                <Thumb url={item.thumbnailUrl} size={56} ratio="wide" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[14px] font-medium leading-snug [unicode-bidi:plaintext]">{item.title}</p>
                  <p className="mt-0.5 flex gap-2 text-[13px] sm:text-[12px] text-sage">
                    {isBlocked ? (
                      <span className="text-alert">{t.block.label}</span>
                    ) : taken ? (
                      <span>{t.library.inQueue}</span>
                    ) : (
                      (item.artist ?? item.channel) && <span className="truncate">{item.artist ?? item.channel}</span>
                    )}
                    {item.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(item.durationSec)}</span> : null}
                  </p>
                </div>
                <Button size="sm" disabled={taken} onClick={() => void add(item.id, item)} aria-label={t.library.addTrack(item.title)}>
                  <Plus className="h-4 w-4" aria-hidden />
                </Button>
                <IconButton label={t.queue.actions(item.title)} onClick={() => setMenuFor(item)}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </IconButton>
              </li>
            );
          })}
        </ol>
      )}

      {menuFor && (
        <Dialog open onClose={() => setMenuFor(null)} title={menuFor.title}>
          <div className="-mx-2 space-y-0.5">
            <SheetAction onClick={() => move(menuFor, -1)}>{t.playlists.moveUp(menuFor.title)}</SheetAction>
            <SheetAction onClick={() => move(menuFor, 1)}>{t.playlists.moveDown(menuFor.title)}</SheetAction>
            <SheetAction
              danger
              onClick={() => {
                const item = menuFor;
                setMenuFor(null);
                void call(room.send('playlist:set-track', { id, trackId: item.id, saved: false }));
              }}
            >
              {t.playlists.remove(menuFor.title)}
            </SheetAction>
          </div>
        </Dialog>
      )}

      {confirmDelete && (
        <Dialog open onClose={() => setConfirmDelete(false)} title={t.playlists.deleteConfirm(playlistName(pl, t))}>
          <p className="text-sage">{t.playlists.deleteNote}</p>
          <div className="mt-5 flex gap-2">
            <Button className="flex-1" onClick={() => setConfirmDelete(false)}>
              {t.people.cancel}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                const r = await room.send('playlist:delete', { id });
                if (!r.ok) return toast(errorMessage(r.error.code, r.error.params), 'error');
                toast(t.playlists.deleted, 'success');
                onBack();
              }}
            >
              {t.playlists.delete}
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
