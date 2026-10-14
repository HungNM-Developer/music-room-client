'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_MOOD, extractMood, type Mood, moodVars } from '@/lib/mood';
import { ytThumb } from '@/lib/thumbs';
import { useRoom } from '@/state/hooks';

/** Artwork URL → mood; artwork never changes, so this lives for the page's lifetime. */
const cache = new Map<string, Mood>();

/**
 * Tints the whole page (body, panels, dialogs, toasts) with the colours of the song on
 * air by overriding the surface tokens on <html>; globals.css animates the change.
 * Unmounting (leaving the room) restores the designed palette.
 */
export function useRoomMood(): void {
  const src = ytThumb(useRoom((s) => s.snapshot?.nowPlaying?.item.track.thumbnailUrl));
  // Last mood we computed; keeps the room in the previous song's colour while the next
  // artwork is still loading, instead of flashing back to the default.
  const [last, setLast] = useState<Mood | null>(null);

  useEffect(() => {
    if (!src || cache.has(src)) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // i.ytimg.com sends ACAO: *, so the pixels are readable
    img.decoding = 'async';
    img.onload = () => {
      const m = extractMood(img) ?? DEFAULT_MOOD;
      cache.set(src, m);
      if (alive) setLast(m);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  const mood = src ? (cache.get(src) ?? last ?? DEFAULT_MOOD) : DEFAULT_MOOD;
  const key = `${Math.round(mood.hue)}:${mood.vivid.toFixed(2)}`;

  useEffect(() => {
    const vars = moodVars(mood);
    const root = document.documentElement.style;
    for (const [name, value] of Object.entries(vars)) root.setProperty(name, value);
    // Mobile browser chrome follows the room colour too.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = meta?.content;
    if (meta) meta.content = vars['--color-dial'];
    return () => {
      for (const name of Object.keys(vars)) root.removeProperty(name);
      if (meta && previousTheme) meta.content = previousTheme;
    };
    // `key` captures the mood by value; the object identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
