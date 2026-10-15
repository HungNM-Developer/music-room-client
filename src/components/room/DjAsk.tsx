'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { SuggestionView } from '@/contracts';
import { LIMITS } from '@/contracts/constants';
import type { useAddTrack } from '@/hooks/useAddTrack';
import { errorMessage, vi } from '@/i18n/vi';
import { room } from '@/state/room-store';
import { SuggestionList } from './Suggestions';

/** AI2: "Hỏi DJ" — describe the music, get songs to add. */
export function DjAsk({ add, added }: { add: ReturnType<typeof useAddTrack>['add']; added: Set<string> }) {
  const [prompt, setPrompt] = useState('');
  const [items, setItems] = useState<SuggestionView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setPrompt(q);
    setBusy(true);
    setError(null);
    const r = await room.send('dj:ask', { prompt: q });
    setBusy(false);
    if (r.ok) setItems(r.data.items);
    else setError(errorMessage(r.error.code, r.error.params));
  }

  return (
    <div className="space-y-3">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(prompt);
        }}
      >
        <label htmlFor="dj-prompt" className="block px-1 text-[13px] font-medium text-sage">
          {vi.djAsk.label}
        </label>
        <div className="flex gap-2">
          <input
            id="dj-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={LIMITS.djPrompt}
            placeholder={vi.djAsk.placeholder}
            className="field min-w-0 flex-1"
            autoComplete="off"
          />
          <Button type="submit" variant="primary" className="shrink-0" disabled={busy || !prompt.trim()} aria-busy={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {vi.djAsk.ask}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 px-1">
          {vi.djAsk.examples.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={busy}
              onClick={() => void ask(ex)}
              className="min-h-9 rounded-full border border-line px-3 text-[13px] text-sage transition-colors hover:text-paper"
            >
              {ex}
            </button>
          ))}
        </div>
        <p className="px-1 text-[12px] text-sage/80">{vi.djAsk.note}</p>
      </form>
      {busy && (
        <p role="status" className="flex items-center gap-2 px-1 text-sage">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {vi.djAsk.asking}
        </p>
      )}
      {error && (
        <p role="alert" className="px-1 text-[14px] text-sage">
          {error}
        </p>
      )}
      {items && !busy && (items.length ? <SuggestionList items={items} label={vi.djAsk.listLabel} add={add} added={added} /> : <p className="px-1 text-sage">{vi.djAsk.empty}</p>)}
    </div>
  );
}
