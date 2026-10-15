'use client';

import { Eye, EyeOff, MicVocal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import type { LyricsView } from '@/contracts';
import { lineAt, useLyrics, useSongPosition } from '@/hooks/useLyrics';
import { vi } from '@/i18n/vi';

/** A7, members: "Lời bài hát" under the song title, opening the full lyrics. */
export function LyricsButton({ trackId }: { trackId: string }) {
  const lyrics = useLyrics(trackId);
  const [open, setOpen] = useState(false);
  if (!lyrics) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-[13px] font-medium text-amber hover:text-amber-hi"
      >
        <MicVocal className="h-4 w-4" aria-hidden />
        {vi.lyrics.button}
      </button>
      {open && <LyricsDialog lyrics={lyrics} onClose={() => setOpen(false)} />}
    </>
  );
}

function LyricsDialog({ lyrics, onClose }: { lyrics: LyricsView; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title={vi.lyrics.title}>
      {lyrics.synced ? <SyncedLines lines={lyrics.synced} /> : <p className="whitespace-pre-wrap leading-relaxed text-sage">{lyrics.plain}</p>}
      <p className="mt-4 text-[12px] text-sage/80">{vi.lyrics.source}</p>
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

const HOST_KEY = 'mr:host-lyrics';

/**
 * A7, speaker screen: karaoke lines under the title (the line before, the one being
 * sung, the next two). Only for synced lyrics; the toggle is remembered on the device.
 */
export function HostLyrics({ trackId }: { trackId: string }) {
  const lyrics = useLyrics(trackId);
  const pos = useSongPosition();
  const [shown, setShown] = useState(true);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read the device preference after hydration
  useEffect(() => setShown(readPref()), []);
  const lines = lyrics?.synced;
  if (!lines) return null;
  const toggle = () => {
    setShown((v) => {
      writePref(!v);
      return !v;
    });
  };
  const at = lineAt(lines, pos);
  // Before the first line: the first three, none highlighted yet.
  const windowLines = (at < 0 ? [0, 1, 2] : [at - 1, at, at + 1, at + 2]).map((i) => ({ i, line: lines[i] }));
  return (
    <section aria-label={vi.lyrics.title} className="max-w-3xl">
      <button type="button" onClick={toggle} className="mb-2 inline-flex items-center gap-1.5 text-[13px] text-sage hover:text-paper">
        {shown ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        {shown ? vi.lyrics.hide : vi.lyrics.show}
      </button>
      {shown && (
        <div aria-live="off" className="space-y-1.5">
          {windowLines.map(({ i, line }) => (
            <p
              key={i}
              className={`truncate leading-tight transition-colors motion-reduce:transition-none ${
                i === at ? 'text-[clamp(22px,2.6vw,34px)] font-bold text-paper' : 'text-[clamp(16px,1.8vw,22px)] text-sage/70'
              }`}
            >
              {line ? line.text || '♪' : ' '}
            </p>
          ))}
          <p className="pt-1 text-[11px] text-sage/60">{vi.lyrics.source}</p>
        </div>
      )}
    </section>
  );
}

function readPref(): boolean {
  try {
    return window.localStorage.getItem(HOST_KEY) !== 'off';
  } catch {
    return true;
  }
}
function writePref(on: boolean): void {
  try {
    window.localStorage.setItem(HOST_KEY, on ? 'on' : 'off');
  } catch {
    // storage blocked: the toggle still works for this page
  }
}
