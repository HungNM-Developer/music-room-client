'use client';

import { MicVocal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import type { LyricsView } from '@/contracts';
import { lineAt, useLyrics, useSongPosition } from '@/hooks/useLyrics';
import { useT } from '@/i18n';

/** A7, members: "Lời bài hát" under the song title, opening the full lyrics. */
export function LyricsButton({ trackId }: { trackId: string }) {
  const t = useT();
  const lyrics = useLyrics(trackId);
  const [open, setOpen] = useState(false);
  if (!lyrics) return null;
  return (
    <>
      <button
        type="button"
        data-guide="lyrics"
        onClick={() => setOpen(true)}
        className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-[13px] font-medium text-amber hover:text-amber-hi"
      >
        <MicVocal className="h-4 w-4" aria-hidden />
        {t.lyrics.button}
      </button>
      {open && <LyricsDialog lyrics={lyrics} onClose={() => setOpen(false)} />}
    </>
  );
}

function LyricsDialog({ lyrics, onClose }: { lyrics: LyricsView; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog open onClose={onClose} title={t.lyrics.title}>
      {lyrics.synced ? <SyncedLines lines={lyrics.synced} /> : <p className="whitespace-pre-wrap leading-relaxed text-sage">{lyrics.plain}</p>}
      <p className="mt-4 text-[12px] text-sage/80">{t.lyrics.source}</p>
    </Dialog>
  );
}

/** Every line, the one being sung highlighted and kept in view. */
function SyncedLines({ lines }: { lines: { t: number; text: string }[] }) {
  const pos = useSongPosition();
  const at = lineAt(lines, pos);
  const box = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = box.current?.children[at] as HTMLElement | undefined;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [at]);
  return (
    <ol ref={box} className="max-h-[55vh] space-y-2 overflow-y-auto pr-1 text-[17px] leading-snug">
      {lines.map((l, i) => (
        <li
          key={`${l.t}-${i}`}
          aria-current={i === at ? 'true' : undefined}
          className={i === at ? 'font-semibold text-paper' : i < at ? 'text-sage/60' : 'text-sage'}
        >
          {l.text || '♪'}
        </li>
      ))}
    </ol>
  );
}

/**
 * A7: karaoke lines under the title — the line before, the one being sung, the next (on the
 * speaker: the one being sung and the next only). Only for synced lyrics; always shown.
 * `host`: the speaker screen; `stage`: a themed room page.
 */
export function InlineLyrics({ trackId, size, className = '' }: { trackId: string; size: 'host' | 'stage'; className?: string }) {
  const t = useT();
  const lyrics = useLyrics(trackId);
  const pos = useSongPosition();
  const host = size === 'host';
  const lines = lyrics?.synced;
  if (!lines) return null;
  const at = lineAt(lines, pos);
  // Before the first line: the first lines, none highlighted yet.
  const picks = host ? (at < 0 ? [0, 1] : [at, at + 1]) : at < 0 ? [0, 1, 2] : [at - 1, at, at + 1];
  const windowLines = picks.map((i) => ({ i, line: lines[i] }));
  return (
    <section aria-label={t.lyrics.title} className={`lyrics-inline ${host ? 'max-w-3xl' : ''} ${className}`}>
      <div aria-live="off" className="space-y-1.5">
        {windowLines.map(({ i, line }) => (
          <p
            key={i}
            data-current={i === at || undefined}
            className={`truncate leading-tight transition-colors motion-reduce:transition-none ${
              host
                ? i === at
                  ? 'text-[clamp(22px,2.6vw,34px)] font-bold text-paper'
                  : 'text-[clamp(16px,1.8vw,22px)] text-sage/70'
                : i === at
                  ? 'lyric-now text-[19px] font-semibold text-paper'
                  : 'lyric-other text-[16px] text-sage/70'
            }`}
          >
            {line ? line.text || '♪' : '\u00a0'}
          </p>
        ))}
        <p className="lyrics-source pt-1 text-[11px] text-sage/60">{t.lyrics.source}</p>
      </div>
    </section>
  );
}

/** The speaker screen's lyrics (A7). */
export const HostLyrics = ({ trackId, className }: { trackId: string; className?: string }) => (
  <InlineLyrics trackId={trackId} size="host" className={className} />
);
