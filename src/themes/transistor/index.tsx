'use client';

import { MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { ListenAlong, ListenersStrip } from '@/components/player/ListenAlong';
import { InlineLyrics, LyricsButton } from '@/components/room/Lyrics';
import { HeartButton, hasItemMenu, useQueueView } from '@/components/room/QueueList';
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { useNowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useSkipVoteState } from '@/components/room/stage/useSkipVoteState';
import { Suggestions } from '@/components/room/Suggestions';
import { IconButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { vi } from '@/i18n/vi';
import { addedByLabel } from '@/lib/added-by';
import { formatDuration } from '@/lib/time';
import type { ThemeModule } from '../load';
import { NowCover, StageIdle, WishBlock } from '../stage/parts';
import { StageControls } from '../stage/StageControls';
import { StageVote } from '../stage/StageVote';
import '../stage/stage.css';
import './theme.css';

/** The tuning band: amber glass with a minute scale; the red needle is the time. */
function Band({ large = false }: { large?: boolean }) {
  const { ref, timeRef, info } = useLiveProgress();
  const minutes = info ? Math.floor(info.durationSec / 60) : 0;
  // A few minute marks between the ends (as many as fit).
  const step = Math.max(1, Math.ceil(minutes / 5));
  const marks = info ? Array.from({ length: Math.floor((minutes - 0.5) / step) }, (_, i) => (i + 1) * step).filter((m) => m * 60 < info.durationSec - 20) : [];
  return (
    <div ref={ref} className="tr-band" data-large={large || undefined}>
      <div className="sc" aria-hidden />
      <div className="needle" aria-hidden />
      <div className="num">
        <span ref={timeRef}>0:00</span>
        {marks.map((m) => (
          <span key={m} className="mark" style={{ left: `${((m * 60) / (info?.durationSec ?? 1)) * 100}%` }} aria-hidden>
            {m}
          </span>
        ))}
        <span>{info ? (info.known ? formatDuration(info.durationSec) : vi.nowPlaying.unknownDuration) : ''}</span>
      </div>
    </div>
  );
}

/** "Phím đài · Tiếp theo": each song a preset key; the last key opens suggestions. */
function Presets({ openAdd }: { openAdd: () => void }) {
  const { items, adding, me, openMenu, menus } = useQueueView();
  const [suggest, setSuggest] = useState(false);
  const empty = items.length === 0 && adding.length === 0;
  return (
    <section aria-labelledby="queue-title" className="tr-presets">
      <h3 id="queue-title" aria-label={vi.queue.title} className="stage-h3">
        Phím đài · Tiếp theo
        {!empty && <span className="stage-count">{items.length + adding.length}</span>}
      </h3>
      <ol className="keys">
        {items.map((q) => (
          <li key={q.id} className="key">
            <b title={q.track.title}>{q.track.title}</b>
            <span className="who">{addedByLabel(q)}</span>
            <span className="acts">
              <HeartButton item={q} me={me} />
              {hasItemMenu(q, me) && (
                <IconButton label={vi.queue.actions(q.track.title)} onClick={() => openMenu(q)}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </IconButton>
              )}
            </span>
          </li>
        ))}
        {adding.map((op) => (
          <li key={op.id} className="key opacity-70" aria-busy="true">
            <b>{op.title ?? vi.queue.addingTitle}</b>
            <span className="who">{vi.add.adding}</span>
          </li>
        ))}
        {!me?.isDevice && (
          <li>
            <button type="button" className="key add" onClick={() => setSuggest(true)}>
              <b>
                <Plus className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden />
                {vi.queue.addFirst}
              </b>
              <span className="who">hoặc gợi ý</span>
            </button>
          </li>
        )}
      </ol>
      {empty && <p className="mt-2 text-[14px] opacity-80">{vi.queue.empty}</p>}
      {suggest && (
        <Dialog open onClose={() => setSuggest(false)} title={vi.suggest.title}>
          <div className="space-y-3">
            <button
              type="button"
              className="stage-btn w-full"
              data-primary
              onClick={() => {
                setSuggest(false);
                openAdd();
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {vi.add.title}
            </button>
            <Suggestions />
          </div>
        </Dialog>
      )}
      {menus}
    </section>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const a = useNowPlayingActions();
  const vote = useSkipVoteState();
  if (!a) {
    return (
      <div className="stage transistor">
        <div className="tr-dial">
          <StageIdle openAdd={openAdd} />
        </div>
        <Presets openAdd={openAdd} />
        <Suggestions />
      </div>
    );
  }
  const { track, playing } = a;
  return (
    <div className="stage transistor">
      <section aria-label={vi.nowPlaying.title} className="tr-dial">
        <Band />
        <div className="tr-np">
          <NowCover className="art" />
          <div className="min-w-0">
            <h2 className="stage-title" title={track.title}>
              {track.title}
            </h2>
            <p className="tr-who">
              {a.pickerLabel}
              {track.channel && ` · ${track.channel}`} · {playing ? 'đang phát' : vi.nowPlaying.paused.toLowerCase()}
            </p>
            <LyricsButton trackId={track.id} />
          </div>
        </div>
        <WishBlock className="tr-wish" />
        <InlineLyrics trackId={track.id} size="stage" storageKey="mr:room-lyrics" className="max-lg:hidden" />
        <StageVote s={vote} meterAt="middle" className="max-lg:hidden" />
        <StageControls a={a} variant="knobs" />
        <div className="stage-listeners empty:hidden">
          <ListenersStrip />
        </div>
        {a.blockMenu}
      </section>
      <ListenAlong />
      <Presets openAdd={openAdd} />
      <Suggestions />
    </div>
  );
}

const transistor: ThemeModule = {
  Stage,
  fontClass: '', // Big Shoulders is declared in theme.css
  header: { variant: 'chrome' },
  chat: { title: 'Thư thính giả', placeholder: 'Gửi thư cho cả phòng…', variant: 'transistor' },
  HostDial: () => <Band large />,
};
export default transistor;
