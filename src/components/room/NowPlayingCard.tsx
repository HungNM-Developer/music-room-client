'use client';

import { Loader2, Pause, Play, SkipForward, StepForward } from 'lucide-react';
import { useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { OnAirLamp } from '@/components/ui/OnAirLamp';
import { Thumb } from '@/components/ui/Thumb';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { estimatePosition } from '@/lib/time';
import { useMe, useNowPlaying, useRoom } from '@/state/hooks';
import { LiveDial } from './TuningDial';

/** The song on air: cover, who picked it, their wish, the dial and the controls. */
export function NowPlayingCard() {
  const np = useNowPlaying();
  const offset = useRoom((s) => s.offset);
  const me = useMe();
  const act = useAct();
  const [skipping, setSkipping] = useState(false);

  if (!np) {
    return (
      <section aria-label={vi.nowPlaying.title} className="rounded-panel bg-panel p-5">
        <OnAirLamp live={false}>{vi.nowPlaying.paused}</OnAirLamp>
        <h2 className="type-display mt-3 text-[24px] font-bold leading-tight">{vi.nowPlaying.idleTitle}</h2>
        <p className="mt-1 text-sage">{vi.nowPlaying.idle}</p>
      </section>
    );
  }

  const t = np.item.track;
  const playing = np.status === 'PLAYING';
  const canControl = me?.role === 'ADMIN' || me?.canControl;
  const voted = Boolean(me && np.skip.voters.includes(me.id));
  const canVote = me && !me.isDevice;
  const picker = np.item.addedBy?.displayName;

  return (
    <section aria-label={vi.nowPlaying.title} className="rounded-panel border border-paper/10 bg-panel/80 p-4 sm:p-5">
      <OnAirLamp live={playing}>{playing ? vi.nowPlaying.live : vi.nowPlaying.paused}</OnAirLamp>

      <div className="mt-3 flex gap-3.5">
        <Thumb url={t.thumbnailUrl} size={76} className="rounded-row" />
        <div className="min-w-0 flex-1">
          <h2 className="type-display line-clamp-2 text-[22px] font-bold leading-[1.1] [unicode-bidi:plaintext]" title={t.title}>
            {t.title}
          </h2>
          <p className="mt-1 truncate text-[14px] text-sage">
            {picker ? vi.nowPlaying.pickedBy(picker) : vi.nowPlaying.fallback}
          </p>
          {t.channel && <p className="truncate text-[13px] text-sage/80">{t.channel}</p>}
        </div>
      </div>

      {np.item.wishMessage && picker && (
        <figure className="mt-4 border-l-2 border-amber pl-3">
          <figcaption className="text-[13px] text-sage">{vi.nowPlaying.wishFrom(picker)}</figcaption>
          <blockquote className="mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]">{np.item.wishMessage}</blockquote>
        </figure>
      )}

      <div className="mt-5">
        <LiveDial />
      </div>

      {(canVote || canControl) && (
        <div className="mt-4 flex items-center gap-2">
          {canVote && (
            <Button
              size="sm"
              disabled={voted}
              aria-pressed={voted}
              onClick={() => act('queue:vote-skip', { queueItemId: np.item.id }, { optimistic: { kind: 'vote', itemId: np.item.id } })}
              className="flex-1 sm:flex-none"
            >
              <SkipForward className="h-4 w-4" aria-hidden />
              {voted ? vi.nowPlaying.voted(np.skip.votes, np.skip.required) : vi.nowPlaying.voteSkip(np.skip.votes, np.skip.required)}
            </Button>
          )}
          {canControl && (
            <>
              <Button
                size="sm"
                variant="primary"
                aria-label={playing ? vi.nowPlaying.pause : vi.nowPlaying.play}
                onClick={() => {
                  // Freeze / resume the dial right away, from where it is now.
                  const serverNow = Date.now() + offset;
                  const positionSec = estimatePosition({ ...np, durationSec: t.durationSec }, offset, Date.now());
                  void act(
                    'playback:control',
                    { action: playing ? 'pause' : 'play', queueItemId: np.item.id },
                    {
                      optimistic: { kind: 'playback', itemId: np.item.id, status: playing ? 'PAUSED' : 'PLAYING', positionSec, positionAt: serverNow },
                    },
                  );
                }}
                className="w-12 !px-0"
              >
                {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
              </Button>
              <IconButton
                label={vi.nowPlaying.skipNow}
                disabled={skipping}
                aria-busy={skipping}
                onClick={async () => {
                  // The next song is the server's call (fair queue, wishes): show progress, not a guess.
                  setSkipping(true);
                  await act('playback:control', { action: 'skip', queueItemId: np.item.id });
                  setSkipping(false);
                }}
              >
                {skipping ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <StepForward className="h-5 w-5" aria-hidden />}
              </IconButton>
            </>
          )}
        </div>
      )}
    </section>
  );
}
