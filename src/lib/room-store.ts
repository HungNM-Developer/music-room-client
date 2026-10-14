import type { RoomSnapshot } from '@/contracts';

/** R-49: only strictly newer snapshots replace the current one. */
export function applySnapshot(prev: RoomSnapshot | null, next: RoomSnapshot): RoomSnapshot {
  if (prev && prev.room.code === next.room.code && next.version <= prev.version) return prev;
  return next;
}
