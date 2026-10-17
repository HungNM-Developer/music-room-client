'use client';

import { useEffect, useState } from 'react';
import type { InlineChatSkin } from '@/components/room/Chat';
import type { RoomHeaderSlots } from '@/components/room/RoomHeader';
import type { VoteMeterProps } from '@/components/room/stage/useSkipVoteState';
import type { ThemeId } from './registry';

/**
 * The speaker screen's layout for a theme. HostScreen always renders the same slots in the
 * same order (so the video player never remounts); the theme fills them and places them with
 * the CSS grid in its host.css.
 */
export interface HostSkin {
  /** On `.host-root`: picks the theme's grid in its host.css. */
  className: string;
  /** On the video slot's wrapper (a frame drawn around, never over, the 16:9 video). */
  videoClass?: string;
  Header?: React.ComponentType;
  Below: React.ComponentType;
  Side: React.ComponentType;
  Footer?: React.ComponentType;
}

/** What a theme brings to the room page and the speaker screen; logic stays shared. */
export interface ThemeModule {
  /** The room column (now playing, queue, suggestions); `openAdd` opens the add-songs tab. */
  Stage: React.ComponentType<{ openAdd: () => void }>;
  header?: RoomHeaderSlots;
  chat?: InlineChatSkin;
  /** Background / strips behind the page (decorative). */
  Decor?: React.ComponentType;
  /** Desktop side column, above the chat. */
  SideTop?: React.ComponentType;
  /** Speaker screen: the theme's own layout (16:9 canvas); without it, the default layout. */
  host?: HostSkin;
  /** Speaker screen: the theme's vote countdown inside the vote banner. */
  HostVoteMeter?: React.ComponentType<VoteMeterProps>;
  /** next/font variable classes, put on <html>. */
  fontClass: string;
}

type Themed = Exclude<ThemeId, 'default'>;

/** One chunk per theme: its layout, CSS and fonts load only when it is used. */
function importTheme(id: Themed): Promise<{ default: ThemeModule }> {
  switch (id) {
    case 'listening':
      return import('./listening');
    case 'hifi82':
      return import('./hifi82');
    case 'midcentury':
      return import('./midcentury');
    case 'astro':
      return import('./astro');
    case 'cosmos':
      return import('./cosmos');
    case 'saigon':
      return import('./saigon');
    case 'pixel':
      return import('./pixel');
    case 'synthwave':
      return import('./synthwave');
    case 'walnut':
      return import('./walnut');
    case 'transistor':
      return import('./transistor');
    case 'cassette':
      return import('./cassette');
    case 'station':
      return import('./station');
    default:
      return Promise.reject(new Error(`theme ${id} is not built yet`));
  }
}

const cache = new Map<Themed, ThemeModule>();
const loading = new Map<Themed, Promise<ThemeModule>>();
/** Chunks that failed to load on this page (e.g. an old tab after a redeploy). */
const failed = new Set<Themed>();

export function loadTheme(id: Themed): Promise<ThemeModule> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  let p = loading.get(id);
  if (!p) {
    p = importTheme(id).then((m) => {
      cache.set(id, m.default);
      return m.default;
    });
    p.catch(() => loading.delete(id));
    loading.set(id, p);
  }
  return p;
}

type Shown = { id: ThemeId; mod: ThemeModule | null };

/**
 * The theme to put on screen for `target`: the target once its chunk is loaded; while it
 * loads, whatever was already on screen (no flash of the default palette); `default` if
 * the chunk failed. On the page's very first theme, the target with an empty stage.
 */
export function useShownTheme(target: ThemeId): Shown {
  const [last, setLast] = useState<Shown & { settled: boolean }>({ id: 'default', mod: null, settled: false });
  const [, setTick] = useState(0);

  useEffect(() => {
    if (target === 'default' || cache.has(target) || failed.has(target)) return;
    let alive = true;
    loadTheme(target).then(
      () => alive && setTick((n) => n + 1),
      (err: unknown) => {
        console.error(err);
        failed.add(target);
        if (alive) setTick((n) => n + 1);
      },
    );
    return () => {
      alive = false;
    };
  }, [target]);

  const settled: Shown | null =
    target === 'default' || failed.has(target)
      ? { id: 'default', mod: null }
      : cache.has(target)
        ? { id: target, mod: cache.get(target) ?? null }
        : null;
  // Derived state: remember what is on screen once it is settled.
  if (settled && (!last.settled || settled.id !== last.id || settled.mod !== last.mod)) setLast({ ...settled, settled: true });
  if (settled) return settled;
  return last.settled ? { id: last.id, mod: last.mod } : { id: target, mod: null };
}
