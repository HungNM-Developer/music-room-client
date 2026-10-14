// Optimistic overlays: what the user just did, shown before the server confirms it.
//
// The server broadcasts room:update *before* it acks the command, on the same socket,
// so by the time the ack arrives the snapshot already contains the change. An overlay
// therefore lives exactly from the click until the ack: on success it is dropped
// without a flicker, on failure it is dropped (rolled back) and an error is shown.
import type { MemberView, NowPlayingView, QueueItemView } from '@/contracts';

type PermPatch = Partial<Pick<MemberView, 'canControl' | 'canDj' | 'canPlay' | 'role'>>;

export type PendingOp =
  | { kind: 'heart'; itemId: string; hearted: boolean }
  | { kind: 'remove'; itemId: string }
  | { kind: 'pin'; itemId: string; pinned: boolean }
  | { kind: 'wish'; itemId: string; message: string | null }
  | { kind: 'add'; key: string; title: string | null; thumbnailUrl: string | null }
  | { kind: 'vote'; itemId: string }
  | { kind: 'playback'; itemId: string; status: 'PLAYING' | 'PAUSED'; positionSec: number; positionAt: number }
  | { kind: 'perm'; memberId: string; patch: PermPatch }
  | { kind: 'kick'; memberId: string };

export type Pending = PendingOp & { id: number };
export type AddOp = Extract<Pending, { kind: 'add' }>;

/** Queue with pending hearts / removals / pins / wishes applied, plus the rows being added. */
export function applyQueue(
  queue: QueueItemView[],
  pending: Pending[],
  meId: string | null,
): { items: QueueItemView[]; adding: AddOp[] } {
  if (!pending.length) return { items: queue, adding: [] };
  const removed = new Set<string>();
  const patches = new Map<string, Pending[]>();
  const adding: AddOp[] = [];
  for (const op of pending) {
    if (op.kind === 'add') adding.push(op);
    else if (op.kind === 'remove') removed.add(op.itemId);
    else if (op.kind === 'heart' || op.kind === 'pin' || op.kind === 'wish') {
      patches.set(op.itemId, [...(patches.get(op.itemId) ?? []), op]);
    }
  }
  let items = queue.filter((q) => !removed.has(q.id));
  if (patches.size) {
    items = items.map((q) => {
      const ops = patches.get(q.id);
      if (!ops) return q;
      let next = q;
      for (const op of ops) {
        if (op.kind === 'heart' && meId) {
          const has = next.heartedBy.includes(meId);
          if (has !== op.hearted) {
            next = {
              ...next,
              hearts: next.hearts + (op.hearted ? 1 : -1),
              heartedBy: op.hearted ? [...next.heartedBy, meId] : next.heartedBy.filter((id) => id !== meId),
            };
          }
        } else if (op.kind === 'pin') {
          next = { ...next, pinned: op.pinned };
        } else if (op.kind === 'wish') {
          next = { ...next, wishMessage: op.message };
        }
      }
      return next;
    });
    // A freshly pinned item jumps to the front, like the server will order it.
    const pinnedNow = pending.filter((p) => p.kind === 'pin' && p.pinned).map((p) => (p as { itemId: string }).itemId);
    if (pinnedNow.length) {
      const front = items.filter((q) => pinnedNow.includes(q.id));
      items = [...front, ...items.filter((q) => !pinnedNow.includes(q.id))];
    }
  }
  return { items, adding };
}

/** Now-playing card with a pending vote or play/pause applied. */
export function applyNowPlaying(
  np: NowPlayingView | null,
  pending: Pending[],
  meId: string | null,
): NowPlayingView | null {
  if (!np || !pending.length) return np;
  let next = np;
  for (const op of pending) {
    if (!('itemId' in op) || op.itemId !== np.item.id) continue;
    if (op.kind === 'vote' && meId && !next.skip.voters.includes(meId)) {
      next = { ...next, skip: { ...next.skip, votes: next.skip.votes + 1, voters: [...next.skip.voters, meId] } };
    } else if (op.kind === 'playback') {
      next = { ...next, status: op.status, positionSec: op.positionSec, positionAt: op.positionAt };
    }
  }
  return next;
}

/** Member list with pending permission changes and kicks applied. */
export function applyMembers(members: MemberView[], pending: Pending[]): MemberView[] {
  if (!pending.length) return members;
  const kicked = new Set(pending.filter((p) => p.kind === 'kick').map((p) => (p as { memberId: string }).memberId));
  const perms = pending.filter((p): p is Extract<Pending, { kind: 'perm' }> => p.kind === 'perm');
  if (!kicked.size && !perms.length) return members;
  return members
    .filter((m) => !kicked.has(m.id))
    .map((m) =>
      perms
        .filter((p) => p.memberId === m.id)
        // The server grants control and DJ together with admin (R-13).
        .reduce((acc, p) => ({ ...acc, ...p.patch, ...(p.patch.role === 'ADMIN' ? { canControl: true, canDj: true } : {}) }), m),
    );
}
