'use client';

import { ListMusic, Loader2, MessageSquareHeart, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { panelId, tabId, TabList } from '@/components/ui/Tabs';
import type { TrackSummary } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { type AddWithWish, useAddTrack } from '@/hooks/useAddTrack';
import { useT } from '@/i18n';
import { classifyInput, playlistIn, sharedPlaylistIn } from '@/lib/add-input';
import { formatDuration } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { BlockedList } from './BlockedList';
import { DjAsk } from './DjAsk';
import { PlayedList, SavedList } from './LibraryLists';
import { MyPlaylists } from './MyPlaylists';
import { TasteCard } from './TasteCard';
import { type PickerSource, PlaylistPicker } from './PlaylistPicker';
import { SongListImport } from './SongListImport';
import { TrackRow } from './TrackRow';

type Source = 'search' | 'played' | 'saved' | 'dj' | 'blocked';

export function AddTrackPanel() {
  const t = useT();
  const me = useMe();
  const [source, setSource] = useState<Source>('search');
  const aiEnabled = useRoom((s) => s.snapshot?.aiEnabled ?? false);
  const blockedCount = useRoom((s) => s.snapshot?.room.blockedTrackIds.length ?? 0);
  const isAdmin = me?.role === 'ADMIN';
  // The tab is admin only: someone who stops being admin falls back to search.
  const shown = source === 'blocked' && !isAdmin ? 'search' : source;
  const { add, added, addWithWish, wishSheet } = useAddTrack();

  if (me?.isDevice) return null;

  return (
    <section aria-labelledby="add-title" className="space-y-4">
      <h2 id="add-title" className="type-display px-1 text-[20px] font-bold">
        {t.add.title}
      </h2>
      <TabList
        variant="pill"
        idPrefix="add"
        label={t.library.sources}
        tabs={[
          { key: 'search', label: t.library.tabSearch },
          { key: 'played', label: t.library.tabPlayed },
          { key: 'saved', label: t.library.tabSaved },
          ...(aiEnabled ? [{ key: 'dj' as const, label: t.djAsk.tab }] : []),
          ...(isAdmin ? [{ key: 'blocked' as const, label: t.block.tab, badge: blockedCount }] : []),
        ]}
        value={shown}
        onChange={setSource}
      />
      <div id={panelId('add', shown)} role="tabpanel" aria-labelledby={tabId('add', shown)}>
        {shown === 'search' && <SearchPanel add={add} added={added} addWithWish={addWithWish} />}
        {shown === 'played' && <PlayedList add={add} added={added} addWithWish={addWithWish} />}
        {shown === 'saved' && <MineTab add={add} added={added} addWithWish={addWithWish} />}
        {shown === 'dj' && <DjAsk add={add} added={added} addWithWish={addWithWish} />}
        {shown === 'blocked' && <BlockedList />}
      </div>
      {wishSheet}
    </section>
  );
}

function SearchPanel({
  add,
  added,
  addWithWish,
}: {
  add: (input: string, known?: TrackSummary) => Promise<boolean>;
  added: Set<string>;
  addWithWish: AddWithWish;
}) {
  const t = useT();
  const searchEnabled = useRoom((s) => s.snapshot?.searchEnabled ?? false);
  const act = useAct();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<TrackSummary[] | null>(null);
  // Where the results came from: the server's own library costs no YouTube quota.
  const [source, setSource] = useState<'library' | 'cache' | 'youtube' | null>(null);
  const [busy, setBusy] = useState(false);
  // A5: the playlist link being browsed, if any.
  const [picker, setPicker] = useState<PickerSource | null>(null);
  const kind = classifyInput(input);
  const alsoPlaylist = kind === 'link' && playlistIn(input) !== null;

  function openPlaylist() {
    setResults(null);
    setSource(null);
    const code = sharedPlaylistIn(input);
    setPicker(code ? { kind: 'shared', code } : { kind: 'youtube', url: input.trim() });
  }

  /** A link is added at once (optimistic); a refused add puts it back in the box. */
  async function addLink(link: string) {
    setInput('');
    if (!(await add(link))) setInput((cur) => cur || link);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || kind === 'empty') return;
    if (kind === 'link') {
      void addLink(input.trim()); // optimistic: no need to block the box
      return;
    }
    if (kind === 'playlist' || kind === 'shared') {
      openPlaylist();
      return;
    }
    await search(false);
  }

  /** `remote`: skip the server library and ask YouTube (uses the daily search quota). */
  async function search(remote: boolean) {
    setBusy(true);
    const r = await act('search:query', remote ? { q: input, remote } : { q: input });
    setResults(r ? r.results : null);
    setSource(r ? r.source : null);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2" role="search">
        <label htmlFor="add-input" className="sr-only">
          {t.add.label}
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-sage" aria-hidden />
            <input
              id="add-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setResults(null);
                setSource(null);
                setPicker(null);
              }}
              maxLength={2048}
              placeholder={t.add.placeholder}
              className="field !pl-11"
              autoComplete="off"
              enterKeyHint={kind === 'link' ? 'go' : 'search'}
            />
          </div>
          <Button type="submit" variant="primary" disabled={busy || kind === 'empty'} className="shrink-0">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : kind === 'link' ? (
              <Plus className="h-4 w-4" aria-hidden />
            ) : kind === 'playlist' || kind === 'shared' ? (
              <ListMusic className="h-4 w-4" aria-hidden />
            ) : null}
            {kind === 'link' ? t.add.addLink : kind === 'playlist' || kind === 'shared' ? t.playlist.open : t.add.search}
          </Button>
          {kind === 'link' && !busy && (
            <IconButton
              label={t.add.withWishShort}
              title={t.add.withWishShort}
              // The link stays in the box until the song is added (closing the sheet keeps it).
              onClick={() => {
                const link = input.trim();
                void addWithWish(link, undefined, () => setInput((cur) => (cur.trim() === link ? '' : cur)));
              }}
            >
              <MessageSquareHeart className="h-5 w-5" aria-hidden />
            </IconButton>
          )}
        </div>
        <p className="px-1 text-[13px] text-sage">{searchEnabled ? t.add.tip : t.add.searchOff}</p>
        {alsoPlaylist && !picker && (
          <Button size="sm" variant="ghost" onClick={openPlaylist}>
            <ListMusic className="h-4 w-4" aria-hidden />
            {t.playlist.openWhole}
          </Button>
        )}
      </form>

      {picker && <PlaylistPicker source={picker} onClose={() => setPicker(null)} />}

      {results && results.length === 0 && <p className="px-1 text-sage">{t.add.noResults}</p>}
      {results && results.length > 0 && source === 'library' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-sage">
          <span>{t.add.fromLibrary}</span>
          {searchEnabled && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => search(true)}>
              <Search className="h-4 w-4" aria-hidden />
              {t.add.searchYouTube}
            </Button>
          )}
        </div>
      )}
      {results && results.length > 0 && (
        <ul aria-label={t.add.results} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {results.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              done={added.has(t.id)}
              onAdd={() => void add(t.id, t)}
              onAddWithWish={() => void addWithWish(t.id, t)}
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

/** "Của tôi": the account's playlists (L2, signed in), a pasted song list (L4) and Yêu thích (A2). */
function MineTab({
  add,
  added,
  addWithWish,
}: {
  add: (input: string, known?: TrackSummary) => Promise<boolean>;
  added: Set<string>;
  addWithWish: AddWithWish;
}) {
  const t = useT();
  const user = useRoom((s) => s.user);
  const canSignIn = useRoom((s) => Boolean(s.health?.googleClientId));
  // Saving "Dành cho bạn" adds or updates a playlist: reload the list.
  const [listKey, setListKey] = useState(0);
  return (
    <div className="space-y-6">
      {user ? (
        <>
          <TasteCard onSaved={() => setListKey((k) => k + 1)} />
          <MyPlaylists key={listKey} add={add} added={added} addWithWish={addWithWish} />
        </>
      ) : (
        canSignIn && <p className="px-1 text-[13px] text-sage">{t.playlists.signInHint}</p>
      )}
      <SongListImport onSaved={() => setListKey((k) => k + 1)} />
      <section className="space-y-2">
        <h3 className="px-1 text-[15px] font-semibold">{t.library.favorites}</h3>
        <SavedList add={add} added={added} addWithWish={addWithWish} />
      </section>
    </div>
  );
}
