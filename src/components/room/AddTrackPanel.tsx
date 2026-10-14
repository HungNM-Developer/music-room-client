'use client';

import { Check, Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import { useToast } from '@/components/ui/Toast';
import type { TrackSummary } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { classifyInput } from '@/lib/add-input';
import { formatDuration } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';

export function AddTrackPanel() {
  const searchEnabled = useRoom((s) => s.snapshot?.searchEnabled ?? false);
  const me = useMe();
  const act = useAct();
  const toast = useToast();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<TrackSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const kind = classifyInput(input);

  async function add(trackInput: string) {
    setAdding(trackInput);
    const r = await act('queue:add', { input: trackInput });
    setAdding(null);
    if (r) {
      toast(vi.add.added(r.title), 'success');
      setAdded((s) => new Set(s).add(trackInput));
      if (trackInput === input.trim()) setInput('');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || kind === 'empty') return;
    setBusy(true);
    if (kind === 'link') {
      await add(input.trim());
    } else {
      const r = await act('search:query', { q: input });
      setResults(r ? r.results : null);
    }
    setBusy(false);
  }

  if (me?.isDevice) return null;

  return (
    <section aria-labelledby="add-title" className="space-y-4">
      <h2 id="add-title" className="type-display px-1 text-[20px] font-bold">
        {vi.add.title}
      </h2>
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
              }}
              maxLength={2048}
              placeholder={vi.add.placeholder}
              className="field !pl-11"
              autoComplete="off"
              enterKeyHint={kind === 'link' ? 'go' : 'search'}
            />
          </div>
          <Button type="submit" variant="primary" disabled={busy || kind === 'empty'} className="shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : kind === 'link' ? <Plus className="h-4 w-4" aria-hidden /> : null}
            {kind === 'link' ? vi.add.addLink : vi.add.search}
          </Button>
        </div>
        <p className="px-1 text-[13px] text-sage">{searchEnabled ? vi.add.tip : vi.add.searchOff}</p>
      </form>

      {results && results.length === 0 && <p className="px-1 text-sage">{vi.add.noResults}</p>}
      {results && results.length > 0 && (
        <ul aria-label={vi.add.results} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {results.map((t) => {
            const done = added.has(t.id);
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5 pl-2.5 pr-1.5">
                <Thumb url={t.thumbnailUrl} size={72} ratio="wide" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[14px] font-medium leading-snug [unicode-bidi:plaintext]" title={t.title}>
                    {t.title}
                  </p>
                  <p className="mt-0.5 flex gap-2 text-[12px] text-sage">
                    {t.channel && <span className="truncate">{t.channel}</span>}
                    {t.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(t.durationSec)}</span> : null}
                  </p>
                </div>
                <Button size="sm" disabled={adding !== null || done} onClick={() => add(t.id)} aria-label={`${vi.add.addResult} ${t.title}`}>
                  {adding === t.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : done ? (
                    <Check className="h-4 w-4 text-amber" aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden />
                  )}
                  <span className="hidden sm:inline">{vi.add.addResult}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
