'use client';

import { MoreHorizontal, Plus } from 'lucide-react';
import { ListenAlong, ListenersStrip } from '@/components/player/ListenAlong';
import { useHost } from '@/components/host/HostContext';
import {
  HostChatLines,
  HostCode,
  HostControls,
  HostLamp,
  HostLink,
  HostListeners,
  HostMeta,
  HostNextEmpty,
  HostQr,
  HostTitle,
  HostWish,
} from '@/components/host/parts';
import { HostLyrics, InlineLyrics, LyricsButton } from '@/components/room/Lyrics';
import { HeartButton, hasItemMenu, useQueueView } from '@/components/room/QueueList';
import { SaveButton } from '@/components/room/SaveButton';
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { useNowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useSkipVoteState } from '@/components/room/stage/useSkipVoteState';
import { Suggestions } from '@/components/room/Suggestions';
import { IconButton } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { formatDuration } from '@/lib/time';
import { fraunces } from '../listening/fonts';
import type { HostSkin, ThemeModule } from '../load';
import { CoverImage, NowCover, StageIdle, WishBlock } from '../stage/parts';
import { StageControls } from '../stage/StageControls';
import { StageVote } from '../stage/StageVote';
import { useTopSuggestions } from '../stage/useTopSuggestions';
import '../stage/stage.css';
import './theme.css';
import './host.css';

/** The VU meter: its needle swings across the dial as the song plays. */
function Vu({ large = false }: { large?: boolean }) {
  const t = useT();
  const { ref, timeRef, info } = useLiveProgress();
  return (
    <div ref={ref} className="wal-vu" data-large={large || undefined}>
      <div className="scale" aria-hidden>
        <i className="needle" />
      </div>
      <div className="t">
        <span ref={timeRef}>0:00</span>
        <span>{info ? (info.known ? formatDuration(info.durationSec) : t.nowPlaying.unknownDuration) : ''}</span>
      </div>
    </div>
  );
}

/** "Chồng đĩa tiếp theo": the queue as record sleeves, the room's suggestion last. */
function Crate({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  const { items, adding, me, openMenu, menus } = useQueueView();
  const top = useTopSuggestions(1);
  const empty = items.length === 0 && adding.length === 0;
  return (
    <section aria-labelledby="queue-title" className="wal-crate-wrap">
      <h3 id="queue-title" aria-label={t.queue.title} className="stage-h3">
        {t.themeText.walnut.next}
        {!empty && <span className="stage-count">{items.length + adding.length}</span>}
      </h3>
      {empty && (
        <div className="stage-empty mb-3">
          <p>{t.queue.empty}</p>
          {!me?.isDevice && (
            <button type="button" className="stage-btn" data-primary onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden />
              {t.queue.addFirst}
            </button>
          )}
        </div>
      )}
      <ol className="wal-crate">
        {items.map((q) => (
          <li key={q.id} className="sleeve">
            <div className="c">
              <CoverImage url={q.track.thumbnailUrl} />
              {(q.pinned || q.wishMessage) && <span className="tag">{[q.pinned && t.queue.pinnedGroup, q.wishMessage && t.queue.hasWish].filter(Boolean).join(' · ')}</span>}
            </div>
            <b title={q.track.title}>{q.track.title}</b>
            <span className="who">{addedByLabel(q)}</span>
            <span className="acts">
              <HeartButton item={q} me={me} />
              <SaveButton track={q.track} />
              {hasItemMenu(q, me) && (
                <IconButton label={t.queue.actions(q.track.title)} onClick={() => openMenu(q)}>
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
            <b>{op.title ?? t.queue.addingTitle}</b>
            <span className="who">{t.add.adding}</span>
          </li>
        ))}
        {top.items.map((s) => (
          <li key={s.track.id} className="sleeve suggest">
            <div className="c">
              <CoverImage url={s.track.thumbnailUrl} />
              <span className="tag">{t.themeText.walnut.suggestTag}</span>
            </div>
            <b title={s.track.title}>{s.track.title}</b>
            <span className="who">{t.suggest.title}</span>
            <span className="acts">
              <button type="button" className="stage-btn stage-sb" disabled={top.isAdded(s.track)} onClick={() => top.add(s.track)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t.add.addResult}
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
  const t = useT();
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
      <section aria-label={t.nowPlaying.title} className="wal-deck">
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
              {playing ? t.nowPlaying.live : t.nowPlaying.paused}
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

/* ---- Speaker screen: the walnut cabinet ---- */

/** The deck under the TV: turntable, the song, the VU meter; lyrics and the wish below. */
function HostDeck() {
  const { np, live } = useHost();
  return (
    <div className="hw-now">
      <div className="hw-deck">
        <div className="wal-turntable hw-tt" aria-hidden>
          <span className="platter" data-playing={live}>
            {np && <CoverImage url={np.item.track.thumbnailUrl} className="label" />}
          </span>
          <span className="arm" data-playing={live} />
        </div>
        <div className="hw-info">
          <HostLamp />
          <HostTitle />
          <HostMeta />
        </div>
        {np && <Vu large />}
      </div>
      {np && <HostLyrics trackId={np.item.track.id} />}
      <HostWish withFrom className="hw-wish host-wish-1" />
    </div>
  );
}

/** The brass plate (QR), the stack of sleeves, the guest book. */
function HostShelf() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hw-side">
      <div className="hw-plate" role="group" aria-label={t.host.scan}>
        <HostQr />
        <div className="hw-plate-text">
          <p className="hw-scan">{t.themeText.walnut.scan}</p>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <section className="hw-crate" aria-label={t.host.next}>
        <h2>{t.themeText.walnut.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q) => (
              <li key={q.id}>
                <CoverImage url={q.track.thumbnailUrl} className="hw-sleeve" />
                <span className="hw-q">
                  <span className="t">{q.track.title}</span>
                  <span className="p">{addedByLabel(q)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="hw-book">
        <HostListeners max={4} />
        <HostChatLines n={3} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-walnut', videoClass: 'hw-bezel', Below: HostDeck, Side: HostShelf };

const walnut: ThemeModule = {
  Stage,
  fontClass: fraunces.variable,
  chat: { title: (t) => t.themeText.walnut.chat, variant: 'walnut' },
  host,
};
export default walnut;
