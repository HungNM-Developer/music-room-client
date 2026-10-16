'use client';

import { MoreHorizontal, Plus } from 'lucide-react';
import { ListenAlong, ListenersStrip } from '@/components/player/ListenAlong';
import { InlineLyrics, LyricsButton } from '@/components/room/Lyrics';
import { HeartButton, hasItemMenu, useQueueView } from '@/components/room/QueueList';
import { SaveButton } from '@/components/room/SaveButton';
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { useNowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useSkipVoteState } from '@/components/room/stage/useSkipVoteState';
import { Suggestions } from '@/components/room/Suggestions';
import { IconButton } from '@/components/ui/Button';
import { vi } from '@/i18n/vi';
import { addedByLabel } from '@/lib/added-by';
import { formatDuration } from '@/lib/time';
import { fraunces } from '../listening/fonts';
import type { ThemeModule } from '../load';
import { CoverImage, NowCover, StageIdle, WishBlock } from '../stage/parts';
import { StageControls } from '../stage/StageControls';
import { StageVote } from '../stage/StageVote';
import { useTopSuggestions } from '../stage/useTopSuggestions';
import '../stage/stage.css';
import './theme.css';

/** The VU meter: its needle swings across the dial as the song plays. */
function Vu({ large = false }: { large?: boolean }) {
  const { ref, timeRef, info } = useLiveProgress();
  return (
    <div ref={ref} className="wal-vu" data-large={large || undefined}>
      <div className="scale" aria-hidden>
        <i className="needle" />
      </div>
      <div className="t">
        <span ref={timeRef}>0:00</span>
        <span>{info ? (info.known ? formatDuration(info.durationSec) : vi.nowPlaying.unknownDuration) : ''}</span>
      </div>
    </div>
  );
}

/** "Chồng đĩa tiếp theo": the queue as record sleeves, the room's suggestion last. */
function Crate({ openAdd }: { openAdd: () => void }) {
  const { items, adding, me, openMenu, menus } = useQueueView();
  const top = useTopSuggestions(1);
  const empty = items.length === 0 && adding.length === 0;
  return (
    <section aria-labelledby="queue-title" className="wal-crate-wrap">
      <h3 id="queue-title" aria-label={vi.queue.title} className="stage-h3">
        Chồng đĩa tiếp theo
        {!empty && <span className="stage-count">{items.length + adding.length}</span>}
      </h3>
      {empty && (
        <div className="stage-empty mb-3">
          <p>{vi.queue.empty}</p>
          {!me?.isDevice && (
            <button type="button" className="stage-btn" data-primary onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden />
              {vi.queue.addFirst}
            </button>
          )}
        </div>
      )}
      <ol className="wal-crate">
        {items.map((q) => (
          <li key={q.id} className="sleeve">
            <div className="c">
              <CoverImage url={q.track.thumbnailUrl} />
              {(q.pinned || q.wishMessage) && <span className="tag">{[q.pinned && vi.queue.pinnedGroup, q.wishMessage && vi.queue.hasWish].filter(Boolean).join(' · ')}</span>}
            </div>
            <b title={q.track.title}>{q.track.title}</b>
            <span className="who">{addedByLabel(q)}</span>
            <span className="acts">
              <HeartButton item={q} me={me} />
              <SaveButton track={q.track} />
              {hasItemMenu(q, me) && (
                <IconButton label={vi.queue.actions(q.track.title)} onClick={() => openMenu(q)}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </IconButton>
              )}
            </span>
          </li>
        ))}
        {adding.map((op) => (
          <li key={op.id} className="sleeve opacity-80" aria-busy="true">
            <div className="c">
              <CoverImage url={op.thumbnailUrl} />
            </div>
            <b>{op.title ?? vi.queue.addingTitle}</b>
            <span className="who">{vi.add.adding}</span>
          </li>
        ))}
        {top.items.map((s) => (
          <li key={s.track.id} className="sleeve suggest">
            <div className="c">
              <CoverImage url={s.track.thumbnailUrl} />
              <span className="tag">gợi ý</span>
            </div>
            <b title={s.track.title}>{s.track.title}</b>
            <span className="who">{vi.suggest.title}</span>
            <span className="acts">
              <button type="button" className="stage-btn stage-sb" disabled={top.isAdded(s.track)} onClick={() => top.add(s.track)}>
                <Plus className="h-4 w-4" aria-hidden />
                {vi.add.addResult}
              </button>
            </span>
          </li>
        ))}
      </ol>
      {menus}
    </section>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const a = useNowPlayingActions();
  const vote = useSkipVoteState();
  if (!a) {
    return (
      <div className="stage walnut">
        <div className="wal-deck">
          <StageIdle openAdd={openAdd} />
        </div>
        <Crate openAdd={openAdd} />
        <Suggestions />
      </div>
    );
  }
  const { track, playing } = a;
  return (
    <div className="stage walnut">
      <section aria-label={vi.nowPlaying.title} className="wal-deck">
        <div className="wal-tt">
          <div className="wal-turntable" aria-hidden>
            <span className="platter" data-playing={playing}>
              <NowCover className="label" />
            </span>
            <span className="arm" data-playing={playing} />
          </div>
          <div className="min-w-0">
            <p className="stage-state">
              <span className="stage-dot" data-live={playing} aria-hidden />
              {playing ? vi.nowPlaying.live : vi.nowPlaying.paused}
            </p>
            <h2 className="stage-title" title={track.title}>
              {track.title}
            </h2>
            <p className="wal-who">
              {a.pickerLabel}
              {track.channel && ` · ${track.channel}`}
            </p>
            <LyricsButton trackId={track.id} />
            <WishBlock className="wal-wish" />
            <Vu />
          </div>
        </div>
        <InlineLyrics trackId={track.id} size="stage" storageKey="mr:room-lyrics" className="max-lg:hidden" />
        <StageVote s={vote} meterAt="middle" className="max-lg:hidden" />
        <StageControls a={a} variant="brass" />
        <div className="stage-listeners empty:hidden">
          <ListenersStrip />
        </div>
        {a.blockMenu}
      </section>
      <ListenAlong />
      <Crate openAdd={openAdd} />
      <Suggestions />
    </div>
  );
}

const walnut: ThemeModule = {
  Stage,
  fontClass: fraunces.variable,
  chat: { title: 'Sổ lời nhắn', variant: 'walnut' },
  HostDial: () => <Vu large />,
};
export default walnut;
