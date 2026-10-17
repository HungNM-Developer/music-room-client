/**
 * "Tìm bài khác" from anywhere (the idle speaker's cover, the listen-along player…): the room
 * page opens its add panel on the search box. A tiny event bus, so no theme has to pass it.
 */
const listeners = new Set<() => void>();

export function onFindSongs(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function findSongs(): void {
  for (const fn of listeners) fn();
}
