'use client';

import { Loader2, MoreHorizontal, Pause, Play, SkipForward, StepForward } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { OnAirLamp } from '@/components/ui/OnAirLamp';
import { Thumb } from '@/components/ui/Thumb';
import { vi } from '@/i18n/vi';
import { LyricsButton } from './Lyrics';
import { ListenButton, ListenersStrip } from '@/components/player/ListenAlong';
import { MiniPlayerButton } from './MiniPlayer';
import { SaveButton } from './SaveButton';
import { useNowPlayingActions } from './stage/useNowPlayingActions';
import { LiveDial } from './TuningDial';

/** The song on air: cover, who picked it, their wish, the dial and the controls. */
export function NowPlayingCard() {
  const a = useNowPlayingActions();

  if (!a) {
    return (
      <section aria-label={vi.nowPlaying.title} className="rounded-panel bg-panel p-5">
        <OnAirLamp live={false}>{vi.nowPlaying.paused}</OnAirLamp>
        <h2 className="type-display mt-3 text-[24px] font-bold leading-tight">{vi.nowPlaying.idleTitle}</h2>
        <p className="mt-1 text-sage">{vi.nowPlaying.idle}</p>
      </section>
    );
  }

  const { np, track: t, playing, picker, canVote, canControl } = a;

  return (
    <section aria-label={vi.nowPlaying.title} className="rounded-panel border border-paper/10 bg-panel/80 p-4 sm:p-5">
      <OnAirLamp live={playing}>{playing ? vi.nowPlaying.live : vi.nowPlaying.paused}</OnAirLamp>

      <div className="mt-3 flex gap-3.5">
        <Thumb url={t.thumbnailUrl} size={76} className="rounded-row" />
        <div className="min-w-0 flex-1">
          <h2 className="type-display line-clamp-2 text-[22px] font-bold leading-[1.1] [unicode-bidi:plaintext] lg:text-[28px]" title={t.title}>
            {t.title}
          </h2>
          <p className="mt-1 truncate text-[14px] text-sage">{a.pickerLabel}</p>
          {t.channel && <p className="truncate text-[13px] text-sage/80">{t.channel}</p>}
          <LyricsButton trackId={t.id} />
        </div>
        <div className="-mr-2 -mt-2 flex shrink-0 flex-col items-center">
          <SaveButton track={t} />
          <MiniPlayerButton />
        </div>
      </div>

      {np.item.wishMessage && picker && (
        <figure className="mt-4 border-l-[3px] border-amber pl-4">
          <figcaption className="text-[14px] text-sage">{vi.nowPlaying.wishFrom(picker)}</figcaption>
          <blockquote className="mt-1 whitespace-pre-wrap text-[18px] leading-snug [overflow-wrap:anywhere] sm:text-[20px]">{np.item.wishMessage}</blockquote>
        </figure>
      )}

      <div className="mt-5">
        <LiveDial />
      </div>

      {(canVote || canControl) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canVote && (
            <Button size="sm" disabled={a.voteDisabled} aria-pressed={a.voted} onClick={a.voteSkip} className="flex-1 sm:flex-none">
              <SkipForward className="h-4 w-4" aria-hidden />
              {a.voteLabel}
            </Button>
          )}
          {a.canListen && <ListenButton />}
          {canControl && (
            <>
              <Button
                size="sm"
                variant="primary"
                aria-label={playing ? vi.nowPlaying.pause : vi.nowPlaying.play}
                onClick={a.togglePlay}
                className="w-12 !px-0"
              >
                {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
              </Button>
              <IconButton label={vi.nowPlaying.skipNow} disabled={a.skipping} aria-busy={a.skipping} onClick={a.skipNow}>
                {a.skipping ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <StepForward className="h-5 w-5" aria-hidden />}
              </IconButton>
              {a.isAdmin && (
                <IconButton label={vi.block.more(t.title)} onClick={a.openBlockMenu}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </IconButton>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-3 empty:hidden">
        <ListenersStrip />
      </div>
      {a.blockMenu}
    </section>
  );
}
