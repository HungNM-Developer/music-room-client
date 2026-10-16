'use client';

import { useEffect, useState } from 'react';
import type { SuggestionView, TrackSummary } from '@/contracts';
import { useAddTrack } from '@/hooks/useAddTrack';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

type TrackSuggestion = Extract<SuggestionView, { kind: 'track' }>;

/**
 * The room's top suggestions that are known songs (one-tap add), for themes that show
 * one at the end of their queue (a sleeve in the crate, a preset key, a line on the
 * board). The full "Gợi ý tiếp theo" section stays below with every option.
 */
export function useTopSuggestions(count = 1) {
  const me = useMe();
  const onAir = useRoom((s) => s.snapshot?.nowPlaying?.item.id ?? null);
  const [items, setItems] = useState<TrackSuggestion[]>([]);
  const { add, added } = useAddTrack();
  const canAdd = Boolean(me && !me.isDevice);

  useEffect(() => {
    if (!canAdd) return;
    let alive = true;
    void room.send('suggest:next', {}).then((r) => {
      if (alive && r.ok) setItems(r.data.items.filter((s): s is TrackSuggestion => s.kind === 'track').slice(0, count));
    });
    return () => {
      alive = false;
    };
  }, [onAir, count, canAdd]);

  return {
    items: canAdd ? items : [],
    isAdded: (t: TrackSummary) => added.has(t.id),
    add: (t: TrackSummary) => void add(t.id, t),
  };
}
