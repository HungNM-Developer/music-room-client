// Songs saved on this device, across rooms (A2). Only YouTube video ids are kept:
// API data (titles, artwork) may not be stored longer than 30 days, so names come
// back from the server via tracks:lookup when the list is shown.

const KEY = 'mr:favorites';
const MAX = 300;

export interface LocalFavorite {
  videoId: string;
  savedAt: number;
}

export function readLocalFavorites(): LocalFavorite[] {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list.filter((f): f is LocalFavorite => typeof f?.videoId === 'string' && typeof f?.savedAt === 'number')
      : [];
  } catch {
    return [];
  }
}

/** Saves or removes `videoId`; newest first. Returns the new list. */
export function writeLocalFavorite(videoId: string, saved: boolean): LocalFavorite[] {
  const rest = readLocalFavorites().filter((f) => f.videoId !== videoId);
  const next = saved ? [{ videoId, savedAt: Date.now() }, ...rest].slice(0, MAX) : rest;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked or full: the server copy (this room) still works
  }
  return next;
}
