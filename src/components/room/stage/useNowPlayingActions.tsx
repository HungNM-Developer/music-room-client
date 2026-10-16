'use client';

import { useState } from 'react';
import type { TrackSummary } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { addedByLabel } from '@/lib/added-by';
import { estimatePosition } from '@/lib/time';
import { useMe, useNowPlaying, useRoom } from '@/state/hooks';
import { BlockMenu } from '../BlockDialog';
import { useNow } from '../SkipVote';

/**
 * Everything the now-playing controls do, for any layout: vote to skip, pause / play,
 * skip now, the admin's ⋯ (block the song). `null` when nothing is on air.
 */
export function useNowPlayingActions() {
  const np = useNowPlaying();
  const offset = useRoom((s) => s.offset);
  const me = useMe();
  const act = useAct();
  const [skipping, setSkipping] = useState(false);
  // The song the ⋯ menu was opened for: a song change closes the menu, so the next song
  // can never be blocked by mistake.
  const [blockFor, setBlockFor] = useState<{ itemId: string; track: TrackSummary } | null>(null);
  const menuTrack = blockFor && blockFor.itemId === np?.item.id ? blockFor.track : null;
  const now = useNow(1000, Boolean(np?.skip.blockedUntil));
  if (!np) return null;

  const track = np.item.track;
  const playing = np.status === 'PLAYING';
  const isAdmin = me?.role === 'ADMIN';
  const canControl = Boolean(isAdmin || me?.canControl);
  const voted = Boolean(me && (np.skip.voters.includes(me.id) || np.skip.againstVoters.includes(me.id)));
  // V1: a song the room just voted to keep cannot be put to a vote again for a while.
  const keptSec = np.skip.blockedUntil ? Math.max(0, Math.ceil((np.skip.blockedUntil - (now + offset)) / 1000)) : 0;
  const canVote = Boolean(me && !me.isDevice);
  const picker = np.item.addedBy?.displayName ?? null;
  const voteLabel =
    keptSec > 0
      ? vi.nowPlaying.kept(keptSec)
      : np.skip.endsAt !== null && !voted
        ? vi.nowPlaying.voting
        : voted
          ? vi.nowPlaying.voted(np.skip.votes, np.skip.required)
          : vi.nowPlaying.voteSkip(np.skip.votes, np.skip.required);

  return {
    np,
    track,
    playing,
    picker,
    pickerLabel: picker ? vi.nowPlaying.pickedBy(picker) : addedByLabel(np.item),
    canVote,
    canControl,
    isAdmin,
    /** Members may listen along on their own device (the player itself does not). */
    canListen: canVote && !me?.canPlay,
    voted,
    keptSec,
    voteLabel,
    voteDisabled: voted || keptSec > 0,
    voteSkip: () => void act('queue:vote-skip', { queueItemId: np.item.id }, { optimistic: { kind: 'vote', itemId: np.item.id } }),
    togglePlay: () => {
      // Freeze / resume the dial right away, from where it is now.
      const serverNow = Date.now() + offset;
      const positionSec = estimatePosition({ ...np, durationSec: track.durationSec }, offset, Date.now());
      void act(
        'playback:control',
        { action: playing ? 'pause' : 'play', queueItemId: np.item.id },
        { optimistic: { kind: 'playback', itemId: np.item.id, status: playing ? 'PAUSED' : 'PLAYING', positionSec, positionAt: serverNow } },
      );
    },
    skipping,
    skipNow: async () => {
      // The next song is the server's call (fair queue, wishes): show progress, not a guess.
      setSkipping(true);
      await act('playback:control', { action: 'skip', queueItemId: np.item.id });
      setSkipping(false);
    },
    openBlockMenu: () => setBlockFor({ itemId: np.item.id, track }),
    blockMenu: menuTrack ? <BlockMenu track={menuTrack} onClose={() => setBlockFor(null)} /> : null,
  };
}

export type NowPlayingActions = NonNullable<ReturnType<typeof useNowPlayingActions>>;
