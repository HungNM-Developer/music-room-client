'use client';

import { ListPlus, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, vi } from '@/i18n/vi';
import { room } from '@/state/room-store';

/** L5 in "Của tôi": the artists the account listens to most, and the "Dành cho bạn" playlist. */
export function TasteCard({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const [artists, setArtists] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void room.send('taste:for-me', {}).then((r) => {
      if (alive) setArtists(r.ok ? r.data.topArtists : []);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function saveMix() {
    setBusy(true);
    const r = await room.send('taste:save-mix', {});
    setBusy(false);
    if (!r.ok) return toast(errorMessage(r.error.code, r.error.params), 'error');
    if (!r.data.count) return toast(vi.taste.nothing, 'info');
    toast(vi.taste.saved(r.data.count), 'success');
    onSaved();
  }

  return (
    <section aria-labelledby="taste-title" className="space-y-2 rounded-panel bg-panel p-4">
      <h3 id="taste-title" className="text-[15px] font-semibold">
        {vi.taste.title}
      </h3>
      <p className="text-[13px] text-sage">{vi.taste.note}</p>
      {!artists ? (
        <Loader2 className="h-5 w-5 animate-spin text-sage" aria-hidden />
      ) : artists.length === 0 ? (
        <p className="text-[14px] text-sage">{vi.taste.none}</p>
      ) : (
        <>
          <ul aria-label={vi.taste.artists} className="flex flex-wrap gap-1.5">
            {artists.map((a) => (
              <li key={a} className="rounded-full border border-line px-3 py-1 text-[13px]">
                {a}
              </li>
            ))}
          </ul>
          <Button size="sm" disabled={busy} aria-busy={busy} onClick={saveMix}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ListPlus className="h-4 w-4" aria-hidden />}
            {vi.taste.saveMix}
          </Button>
        </>
      )}
    </section>
  );
}
