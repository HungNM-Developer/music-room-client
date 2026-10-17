import type { SuggestionView } from '@/contracts';
import { room } from '@/state/room-store';

/** How long one answer serves every part of the page asking for the same thing. */
const FRESH_MS = 30_000;
let last: { key: string; at: number; items: Promise<SuggestionView[]> } | null = null;

/**
 * The room's suggestions (`suggest:next`), shared by the suggestions panel and the idle
 * speaker's "Phát ngay": one request per song on air (and per FRESH_MS), not one per part.
 * `onAir`: the item on air, or null when the room is idle.
 */
export function roomSuggestions(onAir: string | null): Promise<SuggestionView[]> {
  const key = `${room.getState().code ?? ''}|${onAir ?? ''}`;
  if (last && last.key === key && Date.now() - last.at < FRESH_MS) return last.items;
  const items = room.send('suggest:next', {}).then((r) => (r.ok ? r.data.items : []));
  last = { key, at: Date.now(), items };
  // A failed answer is not kept: the next asker tries again.
  void items.then((list) => {
    if (!list.length && last?.items === items) last = null;
  });
  return items;
}
