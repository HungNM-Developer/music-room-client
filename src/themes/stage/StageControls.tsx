'use client';

import { Loader2, MoreHorizontal, Pause, Play, SkipForward, StepForward } from 'lucide-react';
import { MiniPlayerButton } from '@/components/room/MiniPlayer';
import { SaveButton } from '@/components/room/SaveButton';
import type { NowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useT } from '@/i18n';
import { ListenToggle } from './parts';

/**
 * The now-playing buttons for themed layouts: vote to skip (the main button), listen
 * along, save, mini player, and for controllers pause / skip now / the admin's ⋯.
 * Themes style them through `.stage-controls[data-variant]` (pills, keys, game buttons…).
 */
export function StageControls({ a, variant, className = '' }: { a: NowPlayingActions; variant?: string; className?: string }) {
  const t = useT();
  const { playing, canVote, canControl } = a;
  return (
    <div className={`stage-controls ${className}`} data-variant={variant}>
      {canVote && (
        <button type="button" className="stage-btn" data-primary disabled={a.voteDisabled} aria-pressed={a.voted} onClick={a.voteSkip}>
          <SkipForward className="h-[18px] w-[18px]" aria-hidden />
          <span>{a.voteLabel}</span>
        </button>
      )}
      {a.canListen && <ListenToggle />}
      <SaveButton track={a.track} />
      <MiniPlayerButton />
      {canControl && (
        <>
          <button type="button" className="stage-btn stage-icon" aria-label={playing ? t.nowPlaying.pause : t.nowPlaying.play} title={playing ? t.nowPlaying.pause : t.nowPlaying.play} onClick={a.togglePlay}>
            {playing ? <Pause className="h-[18px] w-[18px]" aria-hidden /> : <Play className="h-[18px] w-[18px]" aria-hidden />}
          </button>
          <button
            type="button"
            className="stage-btn stage-icon"
            aria-label={t.nowPlaying.skipNow}
            title={t.nowPlaying.skipNow}
            disabled={a.skipping}
            aria-busy={a.skipping}
            onClick={() => void a.skipNow()}
          >
            {a.skipping ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : <StepForward className="h-[18px] w-[18px]" aria-hidden />}
          </button>
          {a.isAdmin && (
            <button type="button" className="stage-btn stage-icon" aria-label={t.block.more(a.track.title)} title={t.block.more(a.track.title)} onClick={a.openBlockMenu}>
              <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden />
            </button>
          )}
        </>
      )}
    </div>
  );
}
