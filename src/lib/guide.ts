import type { GuideTarget } from '@/contracts';

/**
 * Lighting up part of the room page: the DJ's "Chỉ cho tôi" (spec 2026-10-18-dj-chat) and the
 * "Hướng dẫn" button / first-visit tour. A tiny event bus, like find-songs.
 */
export interface GuideRequest {
  target: GuideTarget;
  /** add: the song name to put in the search box. */
  query?: string;
  /** myItem: the queue item to light up. */
  queueItemId?: string;
}

/** Where a part of the page lives below 1024 px (the tab bar). */
export type GuideTab = 'room' | 'add' | 'people';

export interface GuideStep {
  title: string;
  body: string;
  /** The first visible match is lit; none = the note shows alone. */
  selectors: string[];
  /** The tab to switch to when nothing matches on screen yet (phones, or the side column). */
  tab?: GuideTab;
  /** Light the queue row around the match. */
  row?: boolean;
  /** Open the add panel with this song name in the box first. */
  findQuery?: string;
}

export interface GuideRun {
  steps: GuideStep[];
  /** A guided tour: Back / Next / Skip, steps that are not on screen are passed over. */
  tour?: boolean;
}

export type GuideEvent = { kind: 'dj'; request: GuideRequest } | { kind: 'run'; run: GuideRun };

const listeners = new Set<(e: GuideEvent) => void>();

export function onGuide(fn: (e: GuideEvent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(e: GuideEvent): void {
  for (const fn of listeners) fn(e);
}

/** The DJ's "Chỉ cho tôi". */
export function showGuide(request: GuideRequest): void {
  emit({ kind: 'dj', request });
}

/** One help item, or the tour. */
export function runGuide(run: GuideRun): void {
  if (run.steps.length) emit({ kind: 'run', run });
}
