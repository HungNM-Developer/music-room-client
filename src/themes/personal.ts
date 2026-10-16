import { useSyncExternalStore } from 'react';
import { type ThemeId, toThemeId } from './registry';

/** This browser's own theme for every room; `'room'` (or nothing) = follow the room. */
export const PERSONAL_THEME_KEY = 'mr:theme';

type Personal = ThemeId | 'room';
const listeners = new Set<() => void>();

function read(): Personal {
  try {
    const v = window.localStorage.getItem(PERSONAL_THEME_KEY);
    return v === null || v === 'room' ? 'room' : toThemeId(v);
  } catch {
    return 'room';
  }
}

let current: Personal | null = null;
const get = () => (current ??= read());

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== PERSONAL_THEME_KEY) return;
    current = read();
    fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

export const usePersonalTheme = (): Personal => useSyncExternalStore(subscribe, get, () => 'room');

export function setPersonalTheme(v: Personal): void {
  current = v;
  try {
    if (v === 'room') window.localStorage.removeItem(PERSONAL_THEME_KEY);
    else window.localStorage.setItem(PERSONAL_THEME_KEY, v);
  } catch {
    // storage blocked: the choice still holds for this page
  }
  for (const fn of listeners) fn();
}
