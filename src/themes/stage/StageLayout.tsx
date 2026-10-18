'use client';

import { ListenAlong, ListenersStrip } from '@/components/player/ListenAlong';
import { InlineLyrics, LyricsButton } from '@/components/room/Lyrics';
import { useNowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useSkipVoteState, type VoteMeterProps } from '@/components/room/stage/useSkipVoteState';
import { Suggestions } from '@/components/room/Suggestions';
import { useT } from '@/i18n';
import { StageIdle, WishBlock } from './parts';
import { StageControls } from './StageControls';
import { StageQueue } from './StageQueue';
import { StageVote } from './StageVote';
import { trackArtist } from '@/lib/track-artist';
import './stage.css';

export interface StageProps {
  openAdd: () => void;
  /** The theme's artwork (vinyl peek, zodiac wheel, planet…). */
  cover: React.ReactNode;
  /** The theme's time indicator (ticks, LCD, health bar…). */
  dial: React.ReactNode;
  voteMeter?: React.ComponentType<VoteMeterProps>;
  voteMeterAt?: 'start' | 'middle' | 'bottom';
  voteText?: Parameters<typeof StageVote>[0]['text'];
  /** Replaces the plain "Tiếp theo" list (planets, chalkboard…). */
  queue?: React.ReactNode;
  /** Replaces "Đang phát" above the title ("Màn 1: đang phát"). */
  kicker?: string;
  /** Under the controls (e.g. listeners drawn as stars). */
  aside?: React.ReactNode;
  controls?: string;
  numbered?: boolean;
  queueTitle?: string;
  queueVariant?: string;
  /** The time indicator sits under the title instead of under the hero (hi-fi LCD). */
  dialInInfo?: boolean;
  /** Replaces the "N người đang nghe cùng" avatars (e.g. drawn as stars). */
  listeners?: React.ReactNode;
}

/**
 * The shared "stage" layout of eight themes: big artwork beside a big title, the time,
 * the buttons, the vote (≥1024 px), the wish, the lyrics, then "Tiếp theo" and
 * suggestions. Everything a theme changes comes in as a slot or through CSS.
 */
export function StageLayout(p: StageProps) {
  const t = useT();
  const a = useNowPlayingActions();
  const vote = useSkipVoteState();
  const queue = p.queue ?? <StageQueue openAdd={p.openAdd} numbered={p.numbered} title={p.queueTitle} variant={p.queueVariant} />;

  if (!a) {
    return (
      <div className="stage">
        <StageIdle openAdd={p.openAdd} />
        {queue}
        <Suggestions />
      </div>
    );
  }

  const { track, playing } = a;
  const artist = trackArtist(track);
  return (
    <div className="stage">
      <section aria-label={t.nowPlaying.title} data-guide="nowPlaying" className="stage-now">
        <div className="stage-hero">
          <div className="stage-cover">{p.cover}</div>
          <div className="stage-info">
            <p className="stage-state">
              <span className="stage-dot" data-live={playing} aria-hidden />
              {p.kicker ?? (playing ? t.nowPlaying.live : t.nowPlaying.paused)}
            </p>
            <h2 className="stage-title" title={track.title}>
              {track.title}
            </h2>
            <p className="stage-by">{a.pickerLabel}</p>
            {artist && <p className="stage-channel">{artist}</p>}
            <LyricsButton trackId={track.id} />
            {p.dialInInfo && <div className="stage-dial">{p.dial}</div>}
          </div>
        </div>
        {!p.dialInInfo && <div className="stage-dial">{p.dial}</div>}
        <StageControls a={a} variant={p.controls} />
        <StageVote s={vote} meter={p.voteMeter} meterAt={p.voteMeterAt} text={p.voteText} className="max-lg:!hidden" />
        <div className="stage-listeners empty:hidden">{p.listeners ?? <ListenersStrip />}</div>
        {p.aside}
        <WishBlock />
        <InlineLyrics trackId={track.id} size="stage" className="max-lg:hidden" />
        {a.blockMenu}
      </section>
      <ListenAlong />
      {queue}
      <Suggestions />
    </div>
  );
}
