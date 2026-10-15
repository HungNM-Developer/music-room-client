'use client';

import { ListMusic, Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { panelId, tabId, TabList } from '@/components/ui/Tabs';
import type { TrackSummary } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { useAddTrack } from '@/hooks/useAddTrack';
import { vi } from '@/i18n/vi';
import { classifyInput, playlistIn } from '@/lib/add-input';
import { formatDuration } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { PlayedList, SavedList } from './LibraryLists';
import { PlaylistPicker } from './PlaylistPicker';
import { TrackRow } from './TrackRow';

type Source = 'search' | 'played' | 'saved';

export function AddTrackPanel() {
  const me = useMe();
  const [source, setSource] = useState<Source>('search');
  const { add, added } = useAddTrack();

  if (me?.isDevice) return null;

  return (
    <section aria-labelledby="add-title" className="space-y-4">
      <h2 id="add-title" className="type-display px-1 text-[20px] font-bold">
        {vi.add.title}
      </h2>
      <TabList
        variant="pill"
        idPrefix="add"
        label={vi.library.sources}
        tabs={[
          { key: 'search', label: vi.library.tabSearch },
          { key: 'played', label: vi.library.tabPlayed },
          { key: 'saved', label: vi.library.tabSaved },
        ]}
        value={source}
        onChange={setSource}
      />
      <div id={panelId('add', source)} role="tabpanel" aria-labelledby={tabId('add', source)}>
        {source === 'search' && <SearchPanel add={add} added={added} />}
        {source === 'played' && <PlayedList add={add} added={added} />}
        {source === 'saved' && <SavedList add={add} added={added} />}
      </div>
    </section>
  );
}

function SearchPanel({ add, added }: { add: (input: string, known?: TrackSummary) => Promise<boolean>; added: Set<string> }) {
  const searchEnabled = useRoom((s) => s.snapshot?.searchEnabled ?? false);
  const act = useAct();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<TrackSummary[] | null>(null);
  // Where the results came from: the server's own library costs no YouTube quota.
  const [source, setSource] = useState<'library' | 'cache' | 'youtube' | null>(null);
  const [busy, setBusy] = useState(false);
  // A5: the playlist link being browsed, if any.
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const kind = classifyInput(input);
  const alsoPlaylist = kind === 'link' && playlistIn(input) !== null;

  function openPlaylist() {
    setResults(null);
    setSource(null);
    setPlaylistUrl(input.trim());
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
    if (kind === 'playlist') {
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
          {vi.add.label}
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
                setPlaylistUrl(null);
              }}
              maxLength={2048}
              placeholder={vi.add.placeholder}
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
            ) : kind === 'playlist' ? (
              <ListMusic className="h-4 w-4" aria-hidden />
            ) : null}
            {kind === 'link' ? vi.add.addLink : kind === 'playlist' ? vi.playlist.open : vi.add.search}
          </Button>
        </div>
        <p className="px-1 text-[13px] text-sage">{searchEnabled ? vi.add.tip : vi.add.searchOff}</p>
        {alsoPlaylist && !playlistUrl && (
          <Button size="sm" variant="ghost" onClick={openPlaylist}>
            <ListMusic className="h-4 w-4" aria-hidden />
            {vi.playlist.openWhole}
          </Button>
        )}
      </form>

      {playlistUrl && <PlaylistPicker url={playlistUrl} onClose={() => setPlaylistUrl(null)} />}

      {results && results.length === 0 && <p className="px-1 text-sage">{vi.add.noResults}</p>}
      {results && results.length > 0 && source === 'library' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-sage">
          <span>{vi.add.fromLibrary}</span>
          {searchEnabled && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => search(true)}>
              <Search className="h-4 w-4" aria-hidden />
              {vi.add.searchYouTube}
            </Button>
          )}
        </div>
      )}
      {results && results.length > 0 && (
        <ul aria-label={vi.add.results} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {results.map((t) => (
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
