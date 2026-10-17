import { useSyncExternalStore } from 'react';
import type { Lang } from '@/contracts';

export type { Lang };

const LANGS: readonly Lang[] = ['vi', 'en'];

/** This device's interface language, for every page and room. Nothing saved = Vietnamese. */
export const LANG_KEY = 'mr:lang';

export const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

const listeners = new Set<() => void>();

function readSaved(): Lang | null {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

let current: Lang | null = null;

/** The language now (also outside React). Server render: always Vietnamese. */
export function getLang(): Lang {
  if (typeof window === 'undefined') return 'vi';
  return (current ??= readSaved() ?? 'vi');
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== LANG_KEY) return;
    current = readSaved() ?? 'vi';
    fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

export const useLang = (): Lang => useSyncExternalStore(subscribe, getLang, () => 'vi');

export function setLang(v: Lang): void {
  current = v;
  try {
    window.localStorage.setItem(LANG_KEY, v);
  } catch {
    // storage blocked: the choice still holds for this page
  }
  for (const fn of listeners) fn();
}

/** A device that used Music Room before languages existed has been reading Vietnamese all along. */
function usedBefore(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith('mr:') && k !== LANG_KEY) return true;
    }
  } catch {
    // Storage blocked: nothing saved, nothing to protect.
  }
  return false;
}

/**
 * A shared link may say `?lang=en`: a brand-new device takes it; a device that already chose,
 * or already used the app (so it has been reading Vietnamese), keeps its own language.
 */
export function adoptLangFromUrl(search: string): void {
  const v = new URLSearchParams(search).get('lang');
  if (isLang(v) && readSaved() === null && !usedBefore()) setLang(v);
}
