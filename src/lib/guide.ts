import type { GuideTarget } from '@/contracts';

/**
 * "Chỉ cho tôi" under a DJ answer (spec 2026-10-18-dj-chat): the room page dims itself and
 * lights up the button the member asked about. A tiny event bus, like find-songs.
 */
export interface GuideRequest {
  target: GuideTarget;
  /** add: the song name to put in the search box. */
  query?: string;
  /** myItem: the queue item to light up. */
  queueItemId?: string;
}

const listeners = new Set<(g: GuideRequest) => void>();

export function onGuide(fn: (g: GuideRequest) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function showGuide(g: GuideRequest): void {
  for (const fn of listeners) fn(g);
}
