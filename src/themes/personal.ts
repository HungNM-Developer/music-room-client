import { useSyncExternalStore } from 'react';
import { type ThemeId, toThemeId } from './registry';

/**
 * This browser's own theme for one room, shared by that room's page and its speaker screen;
 * `'room'` (or nothing) = follow the room's theme.
 */
export const personalThemeKey = (code: string) => `mr:theme:${code}`;

type Personal = ThemeId | 'room';
const listeners = new Set<() => void>();
const cache = new Map<string, Personal>();

function read(code: string): Personal {
  try {
    const v = window.localStorage.getItem(personalThemeKey(code));
    return v === null || v === 'room' ? 'room' : toThemeId(v);
  } catch {
    return 'room';
  }
}

function get(code: string): Personal {
  let v = cache.get(code);
  if (v === undefined) {
    v = read(code);
    cache.set(code, v);
  }
  return v;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  // Another tab (the room page beside the speaker screen) changed it.
  const onStorage = (e: StorageEvent) => {
    if (!e.key?.startsWith('mr:theme:')) return;
    cache.delete(e.key.slice('mr:theme:'.length));
    fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

/** This browser's choice for the room `code` (no room yet: follow the room). */
export function usePersonalTheme(code: string | null): Personal {
  return useSyncExternalStore(
    subscribe,
    () => (code ? get(code) : 'room'),
    () => 'room',
  );
}

export function setPersonalTheme(code: string, v: Personal): void {
  cache.set(code, v);
  try {
    if (v === 'room') window.localStorage.removeItem(personalThemeKey(code));
    else window.localStorage.setItem(personalThemeKey(code), v);
  } catch {
    // storage blocked: the choice still holds for this page
  }
  for (const fn of listeners) fn();
}
