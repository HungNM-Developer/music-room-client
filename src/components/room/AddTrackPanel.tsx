'use client';

import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useRoom } from '@/context/RoomContext';
import type { TrackSummary } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { classifyInput } from '@/lib/add-input';
import { formatDuration } from '@/lib/time';

export function AddTrackPanel() {
  const { snapshot, me } = useRoom();
  const act = useAct();
  const toast = useToast();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<TrackSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const kind = classifyInput(input);
  const searchEnabled = snapshot?.searchEnabled ?? false;

  async function add(trackInput: string) {
    setAdding(trackInput);
    const r = await act('queue:add', { input: trackInput });
    setAdding(null);
    if (r) {
      toast(vi.add.added(r.title), 'success');
      if (trackInput === input.trim()) setInput('');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || kind === 'empty') return;
    if (kind === 'link') {
      setBusy(true);
      await add(input.trim());
      setBusy(false);
      return;
    }
    setBusy(true);
    const r = await act('search:query', { q: input });
    setBusy(false);
    setResults(r ? r.results : null);
  }

  if (me?.isDevice) return null;

  return (
    <section aria-label={vi.tabs.add} className="glass-effect rounded-[2rem] p-4 md:p-6 space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="add-input" className="sr-only">{vi.add.placeholder}</label>
        <input
          id="add-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setResults(null);
          }}
          maxLength={2048}
          placeholder={vi.add.placeholder}
          className="flex-1 min-w-0 input-field"
          autoComplete="off"
          enterKeyHint={kind === 'link' ? 'go' : 'search'}
        />
        <button type="submit" disabled={busy || kind === 'empty'} className="btn-primary !px-4 shrink-0 disabled:opacity-50">
          {kind === 'link' ? <Plus className="w-4 h-4" aria-hidden /> : <Search className="w-4 h-4" aria-hidden />}
          <span>{kind === 'link' ? vi.add.addLink : vi.add.search}</span>
        </button>
      </form>
      <p className="text-xs text-slate-500">{searchEnabled ? vi.add.tip : vi.add.searchOff}</p>

      {results && results.length === 0 && <p className="text-sm text-slate-400">{vi.add.noResults}</p>}
      {results && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl p-2 bg-white/[0.03] border border-white/5">
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
                {t.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate [unicode-bidi:plaintext]" title={t.title}>{t.title}</p>
                <p className="text-xs text-slate-400 truncate">
                  {[t.channel, t.durationSec ? formatDuration(t.durationSec) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                disabled={adding !== null}
                onClick={() => add(t.id)}
                className="btn-secondary !px-3 !py-2 text-sm disabled:opacity-50"
              >
                {vi.add.addResult}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
