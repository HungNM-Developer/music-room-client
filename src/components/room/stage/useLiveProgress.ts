'use client';

import { useEffect, useRef } from 'react';
import { estimatePosition, formatDuration } from '@/lib/time';
import { useNowPlaying, useRoom } from '@/state/hooks';

/** Scale used when YouTube gave no duration (no API key): the needle shows elapsed minutes. */
export const UNKNOWN_SCALE_SEC = 600;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Drives any progress drawing from CSS: sets `--p` (0…1, position / length) on the
 * element given `ref` once a second (on the second, with the clock) without React renders,
 * and writes the elapsed time into the element given `timeRef`. Once a second, not more:
 * themes that draw the time with painted properties (an SVG arc, a clip, `left`) repaint on
 * every change, and a needle moving a pixel or two a second needs nothing smoother. On a new song the needle sweeps in from 0 once (`data-mode`:
 * none → sweep → run). `info` is null when nothing is on air.
 */
export function useLiveProgress() {
  const target = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const np = useNowPlaying();
  const offset = useRoom((s) => s.offset);
  const itemId = np?.item.id;

  // Declared before the tick effect so p=0 is committed before the real position lands.
  useEffect(() => {
    const el = target.current;
    if (!itemId || !el || prefersReducedMotion()) return;
    el.dataset.mode = 'none';
    el.style.setProperty('--p', '0');
    void el.offsetWidth; // commit p=0 before turning the sweep transition on
    el.dataset.mode = 'sweep';
    const settle = setTimeout(() => (el.dataset.mode = 'run'), 950);
    return () => {
      clearTimeout(settle);
      el.dataset.mode = 'run';
    };
  }, [itemId]);

  useEffect(() => {
    const el = target.current;
    const timeEl = time.current;
    if (!np || !el) return;
    const dur = np.item.track.durationSec;
    const scale = dur || UNKNOWN_SCALE_SEC;
    let lastSec = -1;
    const tick = () => {
      const pos = estimatePosition({ ...np, durationSec: dur }, offset, Date.now());
      el.style.setProperty('--p', String(Math.min(1, pos / scale)));
      const sec = Math.floor(pos);
      if (sec !== lastSec && timeEl) {
        lastSec = sec;
        timeEl.textContent = formatDuration(pos);
      }
    };
    tick();
    if (np.status !== 'PLAYING') return;
    let timer: ReturnType<typeof setTimeout>;
    // Just after each whole second of the song, so the clock never skips one.
    const next = () => {
      const pos = estimatePosition({ ...np, durationSec: dur }, offset, Date.now());
      timer = setTimeout(() => {
        tick();
        next();
      }, 1000 - ((pos * 1000) % 1000) + 20);
    };
    next();
    return () => clearTimeout(timer);
  }, [np, offset]);

  const dur = np?.item.track.durationSec;
  return { ref: target, timeRef: time, info: np ? { durationSec: dur || UNKNOWN_SCALE_SEC, known: Boolean(dur) } : null };
}
