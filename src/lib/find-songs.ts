/**
 * "Tìm bài khác" from anywhere (the idle speaker's cover, the listen-along player, the DJ's
 * "Chỉ cho tôi"…): the room page opens its add panel on the search box. A tiny event bus, so
 * no theme has to pass it.
 */
const listeners = new Set<() => void>();
/** A song name to put in the box; the search panel takes it when it is (or gets) on screen. */
let pendingQuery: string | null = null;

export function onFindSongs(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function findSongs(query?: string): void {
  pendingQuery = query?.trim() || null;
  for (const fn of listeners) fn();
}

/** The song name `findSongs` was given, once. */
export function takeFindQuery(): string | null {
  const q = pendingQuery;
  pendingQuery = null;
  return q;
}
