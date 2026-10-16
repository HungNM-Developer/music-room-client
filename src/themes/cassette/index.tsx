'use client';

import { Plus } from 'lucide-react';
import { ListenAlong, ListenersStrip } from '@/components/player/ListenAlong';
import { InlineLyrics, LyricsButton } from '@/components/room/Lyrics';
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { useNowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useSkipVoteState } from '@/components/room/stage/useSkipVoteState';
import { Suggestions } from '@/components/room/Suggestions';
import { vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import { useNowPlaying } from '@/state/hooks';
import { barlowCondensed } from '../hifi82/fonts';
import type { ThemeModule } from '../load';
import { bungee, patrickHand } from '../saigon/fonts';
import { StageIdle, WishBlock } from '../stage/parts';
import { StageControls } from '../stage/StageControls';
import { StageQueue } from '../stage/StageQueue';
import { StageVote } from '../stage/StageVote';
import { useTopSuggestions } from '../stage/useTopSuggestions';
import '../stage/stage.css';
import './theme.css';

/** The cassette window: tape winds from the left reel to the right one as the song plays. */
function TapeWindow({ playing, large = false }: { playing: boolean; large?: boolean }) {
  const { ref, timeRef, info } = useLiveProgress();
  return (
    <div ref={ref} className="cs-window" data-playing={playing} data-large={large || undefined}>
      <span className="reel left" aria-hidden />
      <span className="prog">
        <span ref={timeRef}>0:00</span>
        <span className="line" aria-hidden>
          <i />
        </span>
        <span>{info ? (info.known ? formatDuration(info.durationSec) : '?') : ''}</span>
      </span>
      <span className="reel right" aria-hidden />
    </div>
  );
}

/** "Gợi ý: …  ＋ Thêm" written at the bottom of the J-card. */
function SuggestLine() {
  const top = useTopSuggestions(2);
  if (!top.items.length) return null;
  return (
    <p className="cs-suggest">
      Gợi ý:{' '}
      {top.items.map((s, i) => (
        <span key={s.track.id}>
          {i > 0 && ' · '}
          {s.track.title}{' '}
          <button type="button" disabled={top.isAdded(s.track)} onClick={() => top.add(s.track)} aria-label={vi.library.addTrack(s.track.title)}>
            <Plus className="inline h-4 w-4 align-[-3px]" aria-hidden />
            {vi.add.addResult}
          </button>
        </span>
      ))}
    </p>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const a = useNowPlayingActions();
  const vote = useSkipVoteState();
  const queue = <StageQueue openAdd={openAdd} title="Mặt B · Tiếp theo" variant="jcard" numbered tail={<SuggestLine />} />;
  if (!a) {
    return (
      <div className="stage cassette">
        <div className="cs-tape">
          <StageIdle openAdd={openAdd} />
        </div>
        {queue}
        <Suggestions />
      </div>
    );
  }
  const { track, playing } = a;
  return (
    <div className="stage cassette">
      <section aria-label={vi.nowPlaying.title} className="cs-tape">
        <div className="cs-label">
          <h2 className="stage-title" title={track.title}>
            {track.title}
          </h2>
          <div className="meta">
            <span>Mặt A{track.channel ? ` · ${track.channel}` : ''}</span>
            <span>{a.pickerLabel}</span>
          </div>
        </div>
        <TapeWindow playing={playing} />
        <StageControls a={a} variant="tape" />
        <StageVote s={vote} meterAt="middle" className="max-lg:hidden" />
        <div className="stage-listeners empty:hidden">
          <ListenersStrip />
        </div>
        {a.blockMenu}
      </section>
      <div className="cs-under">
        <LyricsButton trackId={track.id} />
        <WishBlock className="cs-note" />
        <InlineLyrics trackId={track.id} size="stage" storageKey="mr:room-lyrics" className="max-lg:hidden" />
      </div>
      <ListenAlong />
      {queue}
      <Suggestions />
    </div>
  );
}

function HostTape() {
  const playing = useNowPlaying()?.status === 'PLAYING';
  return <TapeWindow playing={playing} large />;
}

const cassette: ThemeModule = {
  Stage,
  fontClass: `${bungee.variable} ${patrickHand.variable} ${barlowCondensed.variable}`,
  header: { variant: 'dymo' },
  chat: { placeholder: 'Viết lời nhắn…', variant: 'cassette' },
  Decor: () => <div className="cs-stripe" aria-hidden />,
  HostDial: HostTape,
};
export default cassette;
