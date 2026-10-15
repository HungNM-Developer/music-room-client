'use client';

import { ClipboardList, ListPlus, Loader2, Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Thumb } from '@/components/ui/Thumb';
import { useToast } from '@/components/ui/Toast';
import type { SongListItemView, SongListStop } from '@/contracts';
import { ADD_MANY_MAX, LIMITS, MAX_PLAYLIST_TRACKS } from '@/contracts/constants';
import { splitSongList } from '@/contracts/songlist';
import { errorMessage, vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/** Room for a long list without letting the textarea grow without bound. */
const TEXT_MAX = 12_000;

/**
 * L4: "Dán danh sách bài" — a song list pasted from anywhere (one song per line), matched
 * to YouTube by the server, reviewed here, then queued or (signed in) kept as a playlist.
 */
export function SongListImport({ onSaved }: { onSaved: () => void }) {
  const user = useRoom((s) => s.user);
  const me = useMe();
  const [open, setOpen] = useState(false);
  if (!me || me.isDevice) return null;
  return (
    <section className="space-y-2 rounded-panel bg-panel p-3">
      <p className="px-1 text-[13px] text-sage">{vi.songList.hint}</p>
      <Button size="sm" onClick={() => setOpen(true)}>
        <ClipboardList className="h-4 w-4" aria-hidden />
        {vi.songList.open}
      </Button>
      {open && <SongListDialog signedIn={Boolean(user)} onSaved={onSaved} onClose={() => setOpen(false)} />}
    </section>
  );
}

function SongListDialog({ signedIn, onSaved, onClose }: { signedIn: boolean; onSaved: () => void; onClose: () => void }) {
  const toast = useToast();
  const textId = useId();
  const nameId = useId();
  const [text, setText] = useState('');
  const [items, setItems] = useState<SongListItemView[] | null>(null);
  const [stopped, setStopped] = useState<SongListStop | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'find' | 'queue' | 'save' | null>(null);
  const [name, setName] = useState<string>(vi.songList.defaultName);
  const [savedId, setSavedId] = useState<string | null>(null);

  const max = useRoom((s) => s.snapshot?.room.settings.maxQueuedPerMember ?? 0);
  const mine = useRoom((s) => (s.snapshot?.queue ?? []).filter((q) => q.addedBy?.id === s.memberId).length);
  const slots = Math.max(0, Math.min(max - mine, ADD_MANY_MAX));
  const queued = useRoom((s) => {
    const ids = new Set((s.snapshot?.queue ?? []).map((q) => q.track.id));
    const np = s.snapshot?.nowPlaying?.item.track.id;
    if (np) ids.add(np);
    return [...ids].join('|');
  });
  const inQueue = new Set(queued.split('|'));

  const parsed = useMemo(() => splitSongList(text), [text]);
  const later = items?.filter((it) => it.status === 'later') ?? [];
  const found = items?.filter((it) => it.track) ?? [];
  // Two lines can land on the same song: act on each song once, in list order.
  const pickedIds = [...new Set(found.map((it) => it.track!.id))].filter((id) => picked.has(id));
  const toQueue = pickedIds.filter((id) => !inQueue.has(id));

  async function find(lines: string[]) {
    if (!lines.length || busy) return;
    setBusy('find');
    const r = await room.send('songlist:match', { lines });
    setBusy(null);
    if (!r.ok) {
      toast(errorMessage(r.error.code, r.error.params), 'error');
      return;
    }
    const byLine = new Map(r.data.items.map((it) => [it.line, it]));
    const next = items ? items.map((it) => byLine.get(it.line) ?? it) : r.data.items;
    setItems(next);
    setStopped(r.data.stopped);
    setPicked((p) => {
      const s = new Set(p);
      for (const it of r.data.items) if (it.track) s.add(it.track.id);
      return s;
    });
  }

  function edit() {
    setItems(null);
    setStopped(null);
    setPicked(new Set());
    setSavedId(null);
  }

  const toggle = (id: string) =>
    setPicked((p) => {
      const s = new Set(p);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  async function queue() {
    const ids = toQueue.slice(0, slots);
    if (!ids.length || busy) return;
    setBusy('queue');
    const r = await room.send('queue:add-many', { trackIds: ids });
    setBusy(null);
    if (!r.ok) return toast(errorMessage(r.error.code, r.error.params), 'error');
    const { added, skipped } = r.data;
    const why = skipped.length ? `. ${vi.playlist.skipped(skipped.length)}: ${errorMessage(skipped[0].reason)}` : '';
    toast(`${vi.playlist.added(added)}${why}`, added ? 'success' : 'error');
  }

  async function save() {
    const ids = pickedIds.slice(0, MAX_PLAYLIST_TRACKS);
    const n = name.trim() || vi.songList.defaultName;
    if (!ids.length || busy) return;
    setBusy('save');
    const r = await room.send('playlist:create', { name: n, trackIds: ids });
    setBusy(null);
    if (!r.ok) return toast(errorMessage(r.error.code, r.error.params), 'error');
    setSavedId(r.data.id);
    toast(vi.playlists.created(n), 'success');
    onSaved();
  }

  const stopText = stopped && later.length ? stopMessage(stopped, later.length) : null;
  const canRetry = later.length > 0 && stopped?.reason !== 'QUOTA_EXCEEDED' && stopped?.reason !== 'SEARCH_UNAVAILABLE';

  return (
    <Dialog open onClose={onClose} title={vi.songList.title}>
      {!items ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void find(parsed.lines);
          }}
        >
          <p className="text-[13px] text-sage">{vi.songList.note}</p>
          <label htmlFor={textId} className="sr-only">
            {vi.songList.label}
          </label>
          <textarea
            id={textId}
            value={text}
            maxLength={TEXT_MAX}
            rows={8}
            placeholder={vi.songList.placeholder}
            onChange={(e) => setText(e.target.value)}
            className="field resize-y py-3 text-[16px] leading-snug"
            data-autofocus
          />
          <p className="flex justify-between gap-2 text-[13px] text-sage">
            <span>{parsed.dropped ? vi.songList.dropped(parsed.dropped) : null}</span>
            <span className="tabular-nums">{vi.songList.lines(parsed.lines.length)}</span>
          </p>
          <Button type="submit" variant="primary" className="w-full" disabled={!parsed.lines.length || busy !== null} aria-busy={busy === 'find'}>
            {busy === 'find' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
            {busy === 'find' ? vi.songList.finding : vi.songList.find}
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-sage">{vi.songList.found(found.length, items.length)}</p>
          {stopText && (
            <p role="status" className="rounded-row bg-dial-deep px-3 py-2 text-[13px]">
              {stopText}
            </p>
          )}
          <ul aria-label={vi.songList.listLabel} className="max-h-[45vh] divide-y divide-line/70 overflow-y-auto">
            {items.map((it) => (
              <ResultRow
                key={it.line}
                item={it}
                on={Boolean(it.track && picked.has(it.track.id))}
                queued={Boolean(it.track && inQueue.has(it.track.id))}
                onToggle={toggle}
              />
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" disabled={busy !== null} onClick={edit}>
              {vi.songList.edit}
            </Button>
            {canRetry && (
              <Button size="sm" disabled={busy !== null} aria-busy={busy === 'find'} onClick={() => void find(later.map((it) => it.line))}>
                {busy === 'find' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
                {vi.songList.more(later.length)}
              </Button>
            )}
          </div>
          <Button variant="primary" className="w-full" disabled={!toQueue.length || !slots || busy !== null} aria-busy={busy === 'queue'} onClick={queue}>
            {busy === 'queue' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {vi.songList.queue(Math.min(toQueue.length, slots), slots)}
          </Button>
          {signedIn && (
            <div className="space-y-2 border-t border-line/70 pt-3">
              <label htmlFor={nameId} className="px-1 text-[13px] font-medium text-sage">
                {vi.songList.name}
              </label>
              <div className="flex gap-2">
                <input id={nameId} value={name} maxLength={LIMITS.playlistName} onChange={(e) => setName(e.target.value)} className="field min-w-0 flex-1" />
                <Button disabled={!pickedIds.length || busy !== null || savedId !== null} aria-busy={busy === 'save'} onClick={save}>
                  {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ListPlus className="h-4 w-4" aria-hidden />}
                  {vi.songList.save(Math.min(pickedIds.length, MAX_PLAYLIST_TRACKS))}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function ResultRow({ item, on, queued, onToggle }: { item: SongListItemView; on: boolean; queued: boolean; onToggle: (id: string) => void }) {
  const t = item.track;
  if (!t)
    return (
      <li className="px-1 py-2 opacity-60">
        <span className="line-clamp-2 break-all text-[14px] leading-snug [unicode-bidi:plaintext]">{item.line}</span>
        <span className="text-[12px] text-sage">
          {item.status === 'unsupported' ? vi.songList.unsupported : item.status === 'later' ? vi.songList.later : vi.songList.notFound}
        </span>
      </li>
    );
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 px-1 py-2">
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-amber" checked={on} onChange={() => onToggle(t.id)} aria-label={vi.songList.choose(t.title)} />
        <Thumb url={t.thumbnailUrl} size={56} ratio="wide" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[14px] leading-snug [unicode-bidi:plaintext]">{t.title}</span>
          <span className="mt-0.5 flex gap-2 text-[12px] text-sage">
            <span className="truncate">{queued ? vi.library.inQueue : vi.songList.line(item.line)}</span>
            {t.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(t.durationSec)}</span> : null}
          </span>
        </span>
      </label>
    </li>
  );
}

function stopMessage(s: SongListStop, n: number): string {
  switch (s.reason) {
    case 'RATE_LIMITED':
      return vi.songList.stopped.RATE_LIMITED(n, s.seconds ? Math.ceil(s.seconds / 60) : null);
    case 'QUOTA_EXCEEDED':
      return vi.songList.stopped.QUOTA_EXCEEDED(n);
    case 'SEARCH_UNAVAILABLE':
      return vi.songList.stopped.SEARCH_UNAVAILABLE(n);
    case 'TIME':
      return vi.songList.stopped.TIME(n);
  }
}
