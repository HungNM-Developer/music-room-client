'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRoom } from '@/state/hooks';
import { usePersonalTheme } from './personal';
import { type ThemeId, themeMeta, toThemeId } from './registry';

/**
 * What we know of a room's theme before its snapshot arrives: the join dialog's peek, or
 * the theme this browser last saw in that room. Avoids showing the default palette first.
 */
const HINT_KEY = (code: string) => `mr:room-theme:${code}`;
let hint: { code: string; theme: ThemeId } | null = null;
const hintListeners = new Set<() => void>();

function readHint(code: string): ThemeId | null {
  if (hint?.code === code) return hint.theme;
  try {
    const v = window.localStorage.getItem(HINT_KEY(code));
    return v ? toThemeId(v) : null;
  } catch {
    return null;
  }
}

export function setRoomThemeHint(code: string, theme: ThemeId): void {
  if (hint?.code === code && hint.theme === theme) return;
  hint = { code, theme };
  try {
    window.localStorage.setItem(HINT_KEY(code), theme);
  } catch {
    // storage blocked: the hint still holds for this page
  }
  for (const fn of hintListeners) fn();
}

const subscribeHint = (fn: () => void) => {
  hintListeners.add(fn);
  return () => hintListeners.delete(fn);
};

/** The room's theme: everyone's default, until a browser picks its own for this room. */
export function useRoomTheme(): ThemeId {
  const code = useRoom((s) => s.code);
  const fromSnapshot = useRoom((s) => s.snapshot?.room.settings.theme ?? null);
  const hinted = useSyncExternalStore(
    subscribeHint,
    () => (code ? readHint(code) : null),
    () => null,
  );
  // Remember it for the next visit (first paint in the right colours).
  useEffect(() => {
    if (code && fromSnapshot) setRoomThemeHint(code, toThemeId(fromSnapshot));
  }, [code, fromSnapshot]);
  return toThemeId(fromSnapshot ?? hinted ?? 'default');
}

/** What this browser shows in this room (room page and speaker screen alike): its own choice for the room, else the room's. */
export function useEffectiveTheme(): ThemeId {
  const code = useRoom((s) => s.code);
  const personal = usePersonalTheme(code);
  const roomTheme = useRoomTheme();
  return personal === 'room' ? roomTheme : personal;
}

/**
 * Puts the theme on <html> (`data-theme`, colour scheme, browser bar colour, the theme's
 * font variables) so the page, dialogs, toasts and the mini player all follow it.
 * `default` leaves <html> as designed (the room mood tints it instead).
 */
export function useApplyTheme(id: ThemeId, fontClass?: string): void {
  useEffect(() => {
    if (id === 'default') return;
    const html = document.documentElement;
    const meta = themeMeta(id);
    html.dataset.theme = id;
    html.style.colorScheme = meta.scheme;
    const fonts = fontClass ? fontClass.split(/\s+/).filter(Boolean) : [];
    html.classList.add(...fonts);
    const bar = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousBar = bar?.content;
    if (bar) bar.content = meta.swatch.bg;
    return () => {
      delete html.dataset.theme;
      html.style.removeProperty('color-scheme');
      html.classList.remove(...fonts);
      if (bar && previousBar) bar.content = previousBar;
    };
  }, [id, fontClass]);
}
