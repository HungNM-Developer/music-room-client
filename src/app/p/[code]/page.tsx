'use client';

import { Copy, ListPlus, Radio } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GoogleButton } from '@/components/account/GoogleButton';
import { Button } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import { useToast } from '@/components/ui/Toast';
import type { PlaylistView } from '@/contracts';
import { errorMessage, useT } from '@/i18n';
import { playlistName } from '@/i18n/activity';
import { formatDuration } from '@/lib/time';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/** /p/CODE — a shared playlist (L2): read it, copy it to one's account, or paste the link in a room. */
export default function SharedPlaylistPage() {
  const t = useT();
  const { code } = useParams<{ code: string }>();
  const user = useRoom((s) => s.user);
  const toast = useToast();
  const [pl, setPl] = useState<PlaylistView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    void room.send('playlist:get', { shareCode: code }).then((r) => {
      if (!alive) return;
      if (r.ok) setPl(r.data);
      else setError(errorMessage(r.error.code, r.error.params));
    });
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold text-amber">
        <Radio className="h-5 w-5" aria-hidden /> {t.appName}
      </Link>
      {error && (
        <p role="alert" className="rounded-panel bg-panel p-5 text-sage">
          {error}
        </p>
      )}
      {!pl && !error && <p className="text-sage">{t.library.loading}</p>}
      {pl && (
        <>
          <header className="space-y-2">
            <p className="text-[14px] text-sage">{t.playlists.by(pl.owner.name)}</p>
            <h1 className="type-display text-[clamp(32px,6vw,52px)] font-extrabold leading-[1.02]">{playlistName(pl, t)}</h1>
            {pl.description && <p className="text-sage">{pl.description}</p>}
            <p className="text-[14px] text-sage">{t.playlists.count(pl.tracks.length)}</p>
          </header>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <Button
                variant="primary"
                disabled={copied}
                onClick={async () => {
                  const r = await room.send('playlist:copy', { shareCode: code });
                  if (!r.ok) return toast(errorMessage(r.error.code, r.error.params), 'error');
                  setCopied(true);
                  toast(t.playlists.copied, 'success');
                }}
              >
                <ListPlus className="h-4 w-4" aria-hidden /> {t.playlists.copy}
              </Button>
            ) : (
              <GoogleButton />
            )}
            <Button
              onClick={async () => {
                await navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
                toast(t.playlists.linkCopied, 'success');
              }}
            >
              <Copy className="h-4 w-4" aria-hidden /> {t.playlists.copyLink}
            </Button>
          </div>
          <p className="text-[13px] text-sage">{t.playlists.pasteHint}</p>

          <ol aria-label={t.playlists.tracksLabel} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
            {pl.tracks.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5 pl-2.5 pr-2">
                <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-sage">{i + 1}</span>
                <Thumb url={t.thumbnailUrl} size={56} ratio="wide" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[14px] font-medium leading-snug [unicode-bidi:plaintext]">{t.title}</p>
                  <p className="mt-0.5 flex gap-2 text-[12px] text-sage">
                    {(t.artist ?? t.channel) && <span className="truncate">{t.artist ?? t.channel}</span>}
                    {t.durationSec ? <span className="shrink-0 tabular-nums">{formatDuration(t.durationSec)}</span> : null}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
