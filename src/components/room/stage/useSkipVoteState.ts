'use client';

import { useEffect, useRef, useState } from 'react';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { useMe, useNowPlaying, useRoom } from '@/state/hooks';
import { useNow } from '../SkipVote';

/** A theme's skip-vote countdown (moon, LED digits, boss health…): what it gets to draw. */
export interface VoteMeterProps {
  leftMs: number;
  totalMs: number;
  votes: number;
  required: number;
  against: number;
  seconds: number;
}

type Result = { kind: 'skipped' | 'kept'; title: string };

/** "Đã qua bài" / "Cả phòng muốn nghe tiếp" for a moment after a vote closes. */
function useVoteResult(): Result | null {
  const np = useNowPlaying();
  const open = useRef<{ itemId: string; title: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const endsAt = np?.skip.endsAt ?? null;
  const itemId = np?.item.id ?? null;
  const title = np?.item.track.title ?? '';
  useEffect(() => {
    if (endsAt !== null && itemId) {
      open.current = { itemId, title };
      return;
    }
    const prev = open.current;
    if (!prev) return;
    open.current = null;
    setResult({ kind: itemId === prev.itemId ? 'kept' : 'skipped', title: prev.title });
    const t = setTimeout(() => setResult(null), 2500);
    return () => clearTimeout(t);
  }, [endsAt, itemId, title]);
  return result;
}

/**
 * V1 skip vote, for any layout: is a vote open, the countdown, the tally, my vote, and
 * casting ✅ / ❌. `readOnly` (the speaker screen) never offers the buttons.
 */
export function useSkipVoteState(readOnly = false) {
  const np = useNowPlaying();
  const me = useMe();
  const offset = useRoom((s) => s.offset);
  const windowSec = useRoom((s) => s.snapshot?.room.settings.skipVoteWindowSec ?? 20);
  const act = useAct();
  const result = useVoteResult();
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const endsAt = np?.skip.endsAt ?? null;
  const open = Boolean(np && endsAt !== null);
  const now = useNow(1000, open);
  if (!np || endsAt === null) return { open: false as const, result };

  const leftMs = Math.max(0, endsAt - (now + offset));
  const { votes, required, against, voters, againstVoters, openedBy } = np.skip;
  const mine: 'yes' | 'no' | null = me ? (voters.includes(me.id) ? 'yes' : againstVoters.includes(me.id) ? 'no' : null) : null;
  const canVote = !readOnly && Boolean(me && !me.isDevice);
  return {
    open: true as const,
    result,
    np,
    leftMs,
    totalMs: windowSec * 1000,
    seconds: Math.ceil(leftMs / 1000),
    votes,
    required,
    against,
    mine,
    canVote,
    asksLabel: openedBy ? vi.skipVote.asks(openedBy.id === me?.id ? vi.skipVote.you : openedBy.displayName) : vi.skipVote.asksAnon,
    /** Show ✅ / ❌: I can vote, have not yet, and did not choose "Để sau" for this vote. */
    offer: canVote && mine === null && dismissedAt !== endsAt,
    vote: (approve: boolean) =>
      void act('queue:vote-skip', { queueItemId: np.item.id, approve }, { optimistic: { kind: 'vote', itemId: np.item.id, approve } }),
    dismiss: () => setDismissedAt(endsAt),
  };
}

export type SkipVoteState = ReturnType<typeof useSkipVoteState>;
export type OpenSkipVote = Extract<SkipVoteState, { open: true }>;

/** The meter props for an open vote. */
export const meterProps = (s: OpenSkipVote): VoteMeterProps => ({
  leftMs: s.leftMs,
  totalMs: s.totalMs,
  votes: s.votes,
  required: s.required,
  against: s.against,
  seconds: s.seconds,
});
