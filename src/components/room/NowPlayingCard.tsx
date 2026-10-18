'use client';

import { Loader2, MoreHorizontal, Pause, Play, SkipForward, StepForward } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { OnAirLamp } from '@/components/ui/OnAirLamp';
import { Thumb } from '@/components/ui/Thumb';
import { trackArtist } from '@/lib/track-artist';
import { useT } from '@/i18n';
import { LyricsButton } from './Lyrics';
import { ListenButton, ListenersStrip } from '@/components/player/ListenAlong';
import { MiniPlayerButton } from './MiniPlayer';
import { SaveButton } from './SaveButton';
import { useNowPlayingActions } from './stage/useNowPlayingActions';
import { LiveDial } from './TuningDial';

/** The song on air: cover, who picked it, their wish, the dial and the controls. */
export function NowPlayingCard() {
  const t = useT();
  const a = useNowPlayingActions();

  if (!a) {
    return (
      <section aria-label={t.nowPlaying.title} data-guide="nowPlaying" className="rounded-panel bg-panel p-5">
        <OnAirLamp live={false}>{t.nowPlaying.paused}</OnAirLamp>
        <h2 className="type-display mt-3 text-[24px] font-bold leading-tight">{t.nowPlaying.idleTitle}</h2>
        <p className="mt-1 text-sage">{t.nowPlaying.idle}</p>
      </section>
    );
  }

  const { np, track: item, playing, picker, canVote, canControl } = a;
  const artist = trackArtist(item);

  return (
    <section aria-label={t.nowPlaying.title} data-guide="nowPlaying" className="np-card rounded-panel border border-paper/10 bg-panel/80 p-4 sm:p-5">
      <OnAirLamp live={playing}>{playing ? t.nowPlaying.live : t.nowPlaying.paused}</OnAirLamp>

      <div className="mt-3 flex gap-3.5">
        <Thumb url={item.thumbnailUrl} size={76} className="np-thumb rounded-row" />
        <div className="min-w-0 flex-1">
          <h2 className="np-title type-display line-clamp-2 text-[22px] font-bold leading-[1.1] [unicode-bidi:plaintext] lg:text-[28px]" title={item.title}>
            {item.title}
          </h2>
          <p className="mt-1 truncate text-[14px] text-sage">{a.pickerLabel}</p>
          {artist && <p className="truncate text-[13px] text-sage/80">{artist}</p>}
          <LyricsButton trackId={item.id} />
        </div>
        <div className="-mr-2 -mt-2 flex shrink-0 flex-col items-center">
          <SaveButton track={item} />
          <MiniPlayerButton />
        </div>
      </div>

      {np.item.wishMessage && picker && (
        <figure className="mt-4 border-l-[3px] border-amber pl-4">
          <figcaption className="text-[14px] text-sage">{t.nowPlaying.wishFrom(picker)}</figcaption>
          <blockquote className="mt-1 whitespace-pre-wrap text-[18px] leading-snug [overflow-wrap:anywhere] sm:text-[20px]">{np.item.wishMessage}</blockquote>
        </figure>
      )}

      <div className="mt-5">
        <LiveDial />
      </div>

      {(canVote || canControl) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canVote && (
            <Button size="sm" data-guide="skip" disabled={a.voteDisabled} aria-pressed={a.voted} onClick={a.voteSkip} className="flex-1 sm:flex-none">
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
                data-guide="pause"
                aria-label={playing ? t.nowPlaying.pause : t.nowPlaying.play}
                onClick={a.togglePlay}
                className="w-12 !px-0"
              >
                {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
              </Button>
              <IconButton label={t.nowPlaying.skipNow} data-guide="skipNow" disabled={a.skipping} aria-busy={a.skipping} onClick={a.skipNow}>
                {a.skipping ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <StepForward className="h-5 w-5" aria-hidden />}
              </IconButton>
              {a.isAdmin && (
                <IconButton label={t.block.more(item.title)} data-guide="block" onClick={a.openBlockMenu}>
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
