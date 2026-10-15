'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { LibraryItemView, LibrarySort, TrackSummary } from '@/contracts';
import { LIBRARY_SORTS, LOOKUP_MAX_IDS } from '@/contracts/constants';
import { vi } from '@/i18n/vi';
import { readLocalFavorites } from '@/lib/local-favorites';
import { formatAgo, formatDuration } from '@/lib/time';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { TrackRow } from './TrackRow';

type Add = (trackInput: string, known?: TrackSummary) => Promise<boolean>;

function Status({ loading, failed, empty, onRetry }: { loading: boolean; failed: boolean; empty: string | null; onRetry: () => void }) {
  if (loading)
    return (
      <p role="status" className="flex items-center gap-2 px-1 text-sage">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {vi.library.loading}
      </p>
    );
  if (failed)
    return (
      <p role="alert" className="flex flex-wrap items-center gap-3 px-1 text-sage">
        {vi.library.loadFailed}
        <Button size="sm" onClick={onRetry}>
          {vi.library.retry}
        </Button>
      </p>
    );
  return empty ? <p className="px-1 text-sage">{empty}</p> : null;
}

/** A1: songs this room has played, to add again in one tap. */
export function PlayedList({ add, added }: { add: Add; added: Set<string> }) {
  const [sort, setSort] = useState<LibrarySort>('recent');
  const [items, setItems] = useState<LibraryItemView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // A finished song belongs in the list: refresh when the song on air changes.
  const onAir = useRoom((s) => s.snapshot?.nowPlaying?.item.id ?? null);

  useEffect(() => {
    let alive = true;
    void room.send('library:room', { sort }).then((r) => {
      if (!alive) return;
      setFailed(!r.ok);
      if (r.ok) setItems(r.data.items);
    });
    return () => {
      alive = false;
    };
  }, [sort, onAir, attempt]);

  return (
    <div className="space-y-3">
      <div role="group" aria-label={vi.library.sortLabel} className="flex flex-wrap gap-1.5 px-1">
        {LIBRARY_SORTS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={sort === k}
            onClick={() => setSort(k)}
            className={`min-h-9 rounded-full border px-3 text-[13px] font-medium transition-colors ${
              sort === k ? 'border-amber bg-amber/15 text-paper' : 'border-line text-sage hover:text-paper'
            }`}
          >
            {vi.library.sorts[k]}
          </button>
        ))}
      </div>
      <Status
        loading={items === null && !failed}
        failed={failed}
        empty={items?.length === 0 ? vi.library.emptyPlayed : null}
        onRetry={() => {
          setFailed(false);
          setAttempt((n) => n + 1);
        }}
      />
      {items && items.length > 0 && (
        <ul aria-label={vi.library.playedLabel} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {items.map((it) => (
            <TrackRow
              key={it.track.id}
              track={it.track}
              done={added.has(it.track.id)}
              addLabel={vi.library.addAgain}
              onAdd={() => void add(it.track.id, it.track)}
              meta={
                <p className="flex flex-wrap gap-x-2">
                  <span className="truncate">{it.lastAddedBy?.displayName ?? vi.library.fallback}</span>
                  <span className="shrink-0">{formatAgo(it.lastPlayedAt)}</span>
                  <span className="shrink-0">{vi.library.plays(it.plays)}</span>
                  {it.hearts > 0 && <span className="shrink-0">{vi.library.hearts(it.hearts)}</span>}
                </p>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A2: songs saved on this device (any room, newest first) plus this member's saves from
 * other devices. The device keeps only video ids, so names come from tracks:lookup.
 * Loaded once per visit: an unsaved row stays (with an empty Lưu) until the next visit,
 * so a mis-tap can be undone in place.
 */
export function SavedList({ add, added }: { add: Add; added: Set<string> }) {
  const [tracks, setTracks] = useState<TrackSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const mine = await room.send('favorite:list', {});
    if (!mine.ok) {
      setFailed(true);
      return;
    }
    const fromServer = new Map(mine.data.tracks.map((t) => [t.externalId, t]));
    const local = readLocalFavorites().map((f) => f.videoId);
    const unknown = local.filter((v) => !fromServer.has(v)).slice(0, LOOKUP_MAX_IDS * 2);
    const looked = new Map<string, TrackSummary>();
    for (let i = 0; i < unknown.length; i += LOOKUP_MAX_IDS) {
      const r = await room.send('tracks:lookup', { videoIds: unknown.slice(i, i + LOOKUP_MAX_IDS) });
      if (r.ok) r.data.tracks.forEach((t) => looked.set(t.externalId, t));
    }
    const ordered = local.map((v) => fromServer.get(v) ?? looked.get(v)).filter((t): t is TrackSummary => Boolean(t));
    const localSet = new Set(local);
    const elsewhere = mine.data.tracks.filter((t) => !localSet.has(t.externalId));
    setFailed(false);
    setTracks([...ordered, ...elsewhere]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load, state is set after awaits
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <p className="px-1 text-[13px] text-sage">{vi.library.savedNote}</p>
      <Status
        loading={tracks === null && !failed}
        failed={failed}
        empty={tracks?.length === 0 ? vi.library.emptySaved : null}
        onRetry={() => {
          setFailed(false);
          void load();
        }}
      />
      {tracks && tracks.length > 0 && (
        <ul aria-label={vi.library.savedLabel} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {tracks.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              done={added.has(t.id)}
              onAdd={() => void add(t.id, t)}
              meta={
                <p className="flex gap-2">
                  {t.channel && <span className="truncate">{t.channel}</span>}
                  {t.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(t.durationSec)}</span> : null}
                </p>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
