'use client';

import { Loader2, Music2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { SuggestionView } from '@/contracts';
import { type AddWithWish, useAddTrack } from '@/hooks/useAddTrack';
import { useT, tr } from '@/i18n';
import { formatDuration } from '@/lib/time';
import { useBlockedIds, useMe, useRoom } from '@/state/hooks';
import { roomSuggestions } from '@/lib/room-suggestions';
import { room } from '@/state/room-store';
import { TrackRow } from './TrackRow';

const COLLAPSED = 4;

/**
 * A3: what to play next, like YouTube's "Up next" column. Songs the server knows are
 * added in one tap (no quota); Last.fm picks it has no video for run a normal search.
 * Refreshes whenever the song on air changes.
 */
export function Suggestions() {
  const t = useT();
  const me = useMe();
  const onAir = useRoom((s) => s.snapshot?.nowPlaying?.item.id ?? null);
  const user = useRoom((s) => s.user);
  const [items, setItems] = useState<SuggestionView[] | null>(null);
  const [open, setOpen] = useState(false);
  // L5: signed in, the list can follow the person's own taste instead of the room's.
  const [mode, setMode] = useState<'room' | 'me'>('room');
  const forMe = mode === 'me' && Boolean(user);
  const { add, added, addWithWish, wishSheet } = useAddTrack();

  useEffect(() => {
    let alive = true;
    const load = forMe
      ? room.send('taste:for-me', {}).then((r) => (r.ok ? r.data.items : []))
      : roomSuggestions(onAir);
    void load.then((list) => {
      if (alive) setItems(list);
    });
    return () => {
      alive = false;
    };
  }, [onAir, forMe]);

  if (!me || me.isDevice || !items) return null;
  const shown = open ? items : items.slice(0, COLLAPSED);
  const hidden = items.length - shown.length;

  return (
    <section aria-labelledby="suggest-title" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 id="suggest-title" className="type-display text-[20px] font-bold">
          {t.suggest.title}
        </h2>
        {user && (
          <div role="group" aria-label={t.suggest.modeLabel} className="flex gap-1 rounded-full bg-dial-deep p-1">
            {(['room', 'me'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${mode === m ? 'bg-panel-hi text-paper' : 'text-sage hover:text-paper'}`}
              >
                {m === 'room' ? t.suggest.forRoom : t.suggest.forMe}
              </button>
            ))}
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-[14px] text-sage">{forMe ? t.suggest.emptyMe : t.suggest.empty}</p>
      ) : (
        <SuggestionList items={shown} label={t.suggest.listLabel} add={add} added={added} addWithWish={addWithWish} />
      )}
      {items.length > COLLAPSED && (
        <Button size="sm" variant="ghost" className="w-full" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? t.suggest.less : t.suggest.more(hidden)}
        </Button>
      )}
      {wishSheet}
    </section>
  );
}

/** Why a song is suggested, with the artist for the personal reasons (L5). */
function reasonText(reason: SuggestionView['reason'], because?: string): string {
  const t = tr();
  if (reason === 'taste' && because) return t.suggest.because(because);
  if (reason === 'taste-similar' && because) return t.suggest.likeTaste(because);
  return t.suggest.reasons[reason];
}

/** Suggestion rows (A3, AI2): known songs add in one tap, the rest run a search. */
export function SuggestionList({
  items,
  label,
  add,
  added,
  addWithWish,
}: {
  items: SuggestionView[];
  label: string;
  add: ReturnType<typeof useAddTrack>['add'];
  added: Set<string>;
  addWithWish?: AddWithWish;
}) {
  return (
    <ul aria-label={label} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
      {items.map((s) =>
        s.kind === 'track' ? (
          <TrackRow
            key={s.track.id}
            track={s.track}
            done={added.has(s.track.id)}
            onAdd={() => void add(s.track.id, s.track)}
            onAddWithWish={addWithWish && (() => void addWithWish(s.track.id, s.track))}
            meta={
              <p className="flex gap-2">
                <span className="min-w-0 truncate text-amber/90">{reasonText(s.reason, s.because)}</span>
                {/* "Vì bạn hay nghe X" already names the artist. */}
                {!s.because && (s.track.artist ?? s.track.channel) && <span className="truncate">{s.track.artist ?? s.track.channel}</span>}
                {s.track.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(s.track.durationSec)}</span> : null}
              </p>
            }
          />
        ) : (
          <SearchRow key={`${s.artist}|${s.song}`} artist={s.artist} song={s.song} reason={s.reason} add={add} />
        ),
      )}
    </ul>
  );
}

/** A suggested song with no video on the server yet: search, then add the first result. */
function SearchRow({
  artist,
  song,
  reason,
  add,
}: {
  artist: string;
  song: string;
  reason: 'similar' | 'dj';
  add: ReturnType<typeof useAddTrack>['add'];
}) {
  const t = useT();
  const toast = useToast();
  const blocked = useBlockedIds();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function findAndAdd() {
    setBusy(true);
    const r = await room.send('search:query', { q: `${artist} ${song}`.slice(0, 100) });
    // The first result the room can take: not blocked by the admin, not already waiting / on air.
    const snap = room.getState().snapshot;
    const taken = new Set([snap?.nowPlaying?.item.track.id, ...(snap?.queue ?? []).map((q) => q.track.id)]);
    const first = r.ok ? r.data.results.find((t) => !blocked.has(t.id) && !taken.has(t.id)) : undefined;
    if (!first) {
      setBusy(false);
      toast(t.suggest.notFound, 'error');
      return;
    }
    const ok = await add(first.id, first);
    setBusy(false);
    setDone(ok);
  }

  return (
    <li className="flex items-center gap-3 py-2.5 pl-2.5 pr-1">
      <span className="flex h-[40.5px] w-[72px] shrink-0 items-center justify-center rounded-row bg-dial-deep text-sage">
        <Music2 className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14px] font-medium leading-snug">{song}</p>
        <p className="mt-0.5 flex gap-2 text-[13px] sm:text-[12px] text-sage">
          <span className="truncate">{artist}</span>
          <span className="shrink-0">{reason === 'dj' ? t.suggest.reasons.dj : t.suggest.fromLastfm}</span>
        </p>
      </div>
      <Button size="sm" disabled={busy || done} aria-busy={busy} onClick={findAndAdd} aria-label={t.suggest.findAndAddLabel(song, artist)}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
        <span className="hidden sm:inline">{t.suggest.findAndAdd}</span>
      </Button>
    </li>
  );
}
