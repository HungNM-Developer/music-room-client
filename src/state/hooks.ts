'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { MemberView } from '@/contracts';
import { isVersionMismatch, versionSkew } from '@/lib/version';
import { applyNowPlaying } from './optimistic';
import { INITIAL_STATE, room, type RoomState } from './room-store';

/**
 * Subscribes to one slice of room state. The selector must return a value that is
 * stable between calls (a primitive or an object already in the state), otherwise
 * React re-renders forever.
 */
export function useRoom<T>(selector: (s: RoomState) => T): T {
  return useSyncExternalStore(
    room.subscribe,
    () => selector(room.getState()),
    () => selector(INITIAL_STATE),
  );
}

const selectMe = (s: RoomState): MemberView | null =>
  s.snapshot?.members.find((m) => m.id === s.memberId) ?? null;

/** Videos the admin blocked in this room (nobody can add them). */
export function useBlockedIds(): Set<string> {
  const joined = useRoom((s) => s.snapshot?.room.blockedTrackIds.join('|') ?? '');
  return useMemo(() => new Set(joined ? joined.split('|') : []), [joined]);
}

/** The current member's view (role, permissions), or null before joining. */
export const useMe = () => useRoom(selectMe);

/** The song on air with the user's pending vote / play / pause already applied. */
export function useNowPlaying() {
  const np = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const pending = useRoom((s) => s.pending);
  const meId = useRoom((s) => s.memberId);
  return useMemo(() => applyNowPlaying(np, pending, meId), [np, pending, meId]);
}

export const useVersionMismatch = () => useRoom((s) => isVersionMismatch(s.health));
export const useVersionSkew = () => useRoom((s) => versionSkew(s.health));

/** Mounted once in the root layout: opens the app-wide socket in the browser. */
export function RoomRuntime() {
  useEffect(() => room.start(), []);
  return null;
}

/** A /host page waiting on another speaker takes over this long after that one went offline. */
export const HOST_RECLAIM_MS = 15000;

/** Another member or device is the room's speaker and is online right now: its id, name and whether it is a device. */
export function useOtherLivePlayer(): { id: string; name: string; isDevice: boolean } | null {
  const id = useRoom((s) => {
    const p = s.snapshot?.player;
    return p?.online && p.memberId && p.memberId !== s.memberId ? p.memberId : null;
  });
  const name = useRoom((s) => (id ? (s.snapshot?.members.find((m) => m.id === id)?.displayName ?? '') : ''));
  const isDevice = useRoom((s) => Boolean(id && s.snapshot?.members.find((m) => m.id === id)?.isDevice));
  return id ? { id, name, isDevice } : null;
}
