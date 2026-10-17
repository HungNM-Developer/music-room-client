'use client';

import { MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
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
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { useNowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useSkipVoteState } from '@/components/room/stage/useSkipVoteState';
import { Suggestions } from '@/components/room/Suggestions';
import { IconButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { formatDuration } from '@/lib/time';
import type { HostSkin, ThemeModule } from '../load';
import { NowCover, StageIdle, WishBlock } from '../stage/parts';
import { StageControls } from '../stage/StageControls';
import { StageVote } from '../stage/StageVote';
import '../stage/stage.css';
import './theme.css';
import './host.css';

/** The tuning band: amber glass with a minute scale; the red needle is the time. */
function Band({ large = false }: { large?: boolean }) {
  const t = useT();
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
        <span>{info ? (info.known ? formatDuration(info.durationSec) : t.nowPlaying.unknownDuration) : ''}</span>
      </div>
    </div>
  );
}

/** "Phím đài · Tiếp theo": each song a preset key; the last key opens suggestions. */
function Presets({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  const { items, adding, me, openMenu, menus } = useQueueView();
  const [suggest, setSuggest] = useState(false);
  const empty = items.length === 0 && adding.length === 0;
  return (
    <section aria-labelledby="queue-title" className="tr-presets">
      <h3 id="queue-title" aria-label={t.queue.title} className="stage-h3">
        {t.themeText.transistor.next}
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
                <IconButton label={t.queue.actions(q.track.title)} onClick={() => openMenu(q)}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </IconButton>
              )}
            </span>
          </li>
        ))}
        {adding.map((op) => (
          <li key={op.id} className="key opacity-70" aria-busy="true">
            <b>{op.title ?? t.queue.addingTitle}</b>
            <span className="who">{t.add.adding}</span>
          </li>
        ))}
        {!me?.isDevice && (
          <li>
            <button type="button" className="key add" onClick={() => setSuggest(true)}>
              <b>
                <Plus className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden />
                {t.queue.addFirst}
              </b>
              <span className="who">{t.themeText.transistor.orSuggest}</span>
            </button>
          </li>
        )}
      </ol>
      {empty && <p className="mt-2 text-[14px] opacity-80">{t.queue.empty}</p>}
      {suggest && (
        <Dialog open onClose={() => setSuggest(false)} title={t.suggest.title}>
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
              {t.add.title}
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
  const t = useT();
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
      <section aria-label={t.nowPlaying.title} className="tr-dial">
        <Band />
        <div className="tr-np">
          <NowCover className="art" />
          <div className="min-w-0">
            <h2 className="stage-title" title={track.title}>
              {track.title}
            </h2>
            <p className="tr-who">
              {a.pickerLabel}
              {track.channel && ` · ${track.channel}`} · {playing ? t.themeText.transistor.playing : t.nowPlaying.paused.toLowerCase()}
            </p>
            <LyricsButton trackId={track.id} />
          </div>
        </div>
        <WishBlock className="tr-wish" />
        <InlineLyrics trackId={track.id} size="stage" className="max-lg:hidden" />
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

/* ---- Speaker screen: the whole screen is the radio ---- */

/** Inside the speaker grille, under the video: the song and its lyrics. */
function HostGrille() {
  const { np } = useHost();
  return (
    <div className="ht-now">
      <div className="ht-row">
        <HostLamp />
        <HostMeta />
      </div>
      <HostTitle />
      {np && <HostLyrics trackId={np.item.track.id} />}
    </div>
  );
}

/** The chrome badge (QR), the preset keys (next songs), the wish, the listeners' letters. */
function HostDialSide() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="ht-side">
      <div className="ht-badge">
        <HostQr />
        <div className="min-w-0">
          <p className="ht-scan">{t.host.scan}</p>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <section className="ht-presets" aria-label={t.host.next}>
        <h2>{t.themeText.transistor.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q, i) => (
              <li key={q.id}>
                <b>{i + 1}</b>
                <span className="t">{q.track.title}</span>
                <span className="p">{addedByLabel(q)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <HostWish withFrom className="ht-wish host-wish-1" />
      <div className="ht-letters">
        <h2>{t.themeText.transistor.chat}</h2>
        <HostListeners max={4} />
        <HostChatLines n={2} />
        <HostControls />
      </div>
    </div>
  );
}

/** The tuning glass across the bottom: the red needle is the time. */
function HostBand() {
  const { np } = useHost();
  return <div className="ht-band">{np ? <Band large /> : <div className="tr-band" data-large aria-hidden />}</div>;
}

const host: HostSkin = { className: 'host-transistor', videoClass: 'ht-video', Below: HostGrille, Side: HostDialSide, Footer: HostBand };

const transistor: ThemeModule = {
  Stage,
  fontClass: '', // Big Shoulders is declared in theme.css
  header: { variant: 'chrome' },
  chat: {
    title: (t) => t.themeText.transistor.chat,
    placeholder: (t) => t.themeText.transistor.chatPlaceholder,
    variant: 'transistor',
  },
  host,
};
export default transistor;
