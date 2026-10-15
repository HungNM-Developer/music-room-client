'use client';

import { Loader2, Music2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { SuggestionView } from '@/contracts';
import { useAddTrack } from '@/hooks/useAddTrack';
import { vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { TrackRow } from './TrackRow';

const COLLAPSED = 4;

/**
 * A3: what to play next, like YouTube's "Up next" column. Songs the server knows are
 * added in one tap (no quota); Last.fm picks it has no video for run a normal search.
 * Refreshes whenever the song on air changes.
 */
export function Suggestions() {
  const me = useMe();
  const onAir = useRoom((s) => s.snapshot?.nowPlaying?.item.id ?? null);
  const [items, setItems] = useState<SuggestionView[] | null>(null);
  const [open, setOpen] = useState(false);
  const { add, added } = useAddTrack();

  useEffect(() => {
    let alive = true;
    void room.send('suggest:next', {}).then((r) => {
      if (alive) setItems(r.ok ? r.data.items : []);
    });
    return () => {
      alive = false;
    };
  }, [onAir]);

  if (!me || me.isDevice || !items) return null;
  const shown = open ? items : items.slice(0, COLLAPSED);
  const hidden = items.length - shown.length;

  return (
    <section aria-labelledby="suggest-title" className="space-y-2">
      <h2 id="suggest-title" className="type-display px-1 text-[20px] font-bold">
        {vi.suggest.title}
      </h2>
      {items.length === 0 ? (
        <p className="px-1 text-[14px] text-sage">{vi.suggest.empty}</p>
      ) : (
        <ul aria-label={vi.suggest.listLabel} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {shown.map((s) =>
            s.kind === 'track' ? (
              <TrackRow
                key={s.track.id}
                track={s.track}
                done={added.has(s.track.id)}
                onAdd={() => void add(s.track.id, s.track)}
                meta={
                  <p className="flex gap-2">
                    <span className="shrink-0 text-amber/90">{vi.suggest.reasons[s.reason]}</span>
                    {(s.track.artist ?? s.track.channel) && <span className="truncate">{s.track.artist ?? s.track.channel}</span>}
                    {s.track.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(s.track.durationSec)}</span> : null}
                  </p>
                }
              />
            ) : (
              <SearchRow key={`${s.artist}|${s.song}`} artist={s.artist} song={s.song} add={add} />
            ),
          )}
        </ul>
      )}
      {items.length > COLLAPSED && (
        <Button size="sm" variant="ghost" className="w-full" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? vi.suggest.less : vi.suggest.more(hidden)}
        </Button>
      )}
    </section>
  );
}

/** A Last.fm pick with no video on the server yet: search, then add the first result. */
function SearchRow({
  artist,
  song,
  add,
}: {
  artist: string;
  song: string;
  add: ReturnType<typeof useAddTrack>['add'];
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function findAndAdd() {
    setBusy(true);
    const r = await room.send('search:query', { q: `${artist} ${song}`.slice(0, 100) });
    const first = r.ok ? r.data.results[0] : undefined;
    if (!first) {
      setBusy(false);
      toast(vi.suggest.notFound, 'error');
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
        <p className="mt-0.5 flex gap-2 text-[12px] text-sage">
          <span className="truncate">{artist}</span>
          <span className="shrink-0">{vi.suggest.fromLastfm}</span>
        </p>
      </div>
      <Button size="sm" disabled={busy || done} aria-busy={busy} onClick={findAndAdd} aria-label={vi.suggest.findAndAddLabel(song, artist)}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
        <span className="hidden sm:inline">{vi.suggest.findAndAdd}</span>
      </Button>
    </li>
  );
}
