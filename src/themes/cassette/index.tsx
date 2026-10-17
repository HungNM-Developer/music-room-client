'use client';

import { Plus } from 'lucide-react';
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
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { useNowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useSkipVoteState } from '@/components/room/stage/useSkipVoteState';
import { Suggestions } from '@/components/room/Suggestions';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { formatDuration } from '@/lib/time';
import { barlowCondensed } from '../hifi82/fonts';
import type { HostSkin, ThemeModule } from '../load';
import { bungee, patrickHand } from '../saigon/fonts';
import { StageIdle, WishBlock } from '../stage/parts';
import { StageControls } from '../stage/StageControls';
import { StageQueue } from '../stage/StageQueue';
import { StageVote } from '../stage/StageVote';
import { useTopSuggestions } from '../stage/useTopSuggestions';
import '../stage/stage.css';
import './theme.css';
import './host.css';

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
  const t = useT();
  const top = useTopSuggestions(2);
  if (!top.items.length) return null;
  return (
    <p className="cs-suggest">
      {t.themeText.cassette.suggest}{' '}
      {top.items.map((s, i) => (
        <span key={s.track.id}>
          {i > 0 && ' · '}
          {s.track.title}{' '}
          <button type="button" disabled={top.isAdded(s.track)} onClick={() => top.add(s.track)} aria-label={t.library.addTrack(s.track.title)}>
            <Plus className="inline h-4 w-4 align-[-3px]" aria-hidden />
            {t.add.addResult}
          </button>
        </span>
      ))}
    </p>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  const a = useNowPlayingActions();
  const vote = useSkipVoteState();
  const queue = <StageQueue openAdd={openAdd} title={t.themeText.cassette.sideB} variant="jcard" numbered tail={<SuggestLine />} />;
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
      <section aria-label={t.nowPlaying.title} className="cs-tape">
        <div className="cs-label">
          <h2 className="stage-title" title={track.title}>
            {track.title}
          </h2>
          <div className="meta">
            <span>
              {t.themeText.cassette.sideA}
              {track.channel ? ` · ${track.channel}` : ''}
            </span>
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

/* ---- Speaker screen: a home-made mixtape ---- */

/** Side A: the handwritten label, the tape window, the lyrics. */
function HostSideA() {
  const t = useT();
  const { np, live } = useHost();
  return (
    <div className="hc-now">
      <div className="hc-shell">
        <div className="cs-label hc-label">
          <div className="hc-side">
            <span>{t.themeText.cassette.sideA}</span>
            <HostLamp />
          </div>
          <HostTitle />
          <HostMeta />
        </div>
        {np && <TapeWindow playing={live} large />}
      </div>
      {np && <HostLyrics trackId={np.item.track.id} />}
    </div>
  );
}

/** Side B: the QR sticker, the Dymo code, the wish note, the J-card, chat notes. */
function HostSideB() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hc-side-b">
      <div className="hc-top">
        <div className="hc-sticker">
          <HostQr />
          <p>{t.host.scan}</p>
        </div>
        <div className="hc-tags">
          <HostCode className="hc-dymo" />
          <HostLink />
          <HostWish withFrom className="hc-wish" />
        </div>
      </div>
      <section className="hc-jcard" aria-label={t.host.next}>
        <h2>{t.themeText.cassette.sideB}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q, i) => (
              <li key={q.id}>
                {i + 1}. {q.track.title} <span>({addedByLabel(q)})</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <HostChatLines n={3} className="hc-notes" />
      <div className="hc-foot">
        <HostListeners max={4} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-cassette', videoClass: 'hc-video', Below: HostSideA, Side: HostSideB };

const cassette: ThemeModule = {
  Stage,
  fontClass: `${bungee.variable} ${patrickHand.variable} ${barlowCondensed.variable}`,
  header: { variant: 'dymo' },
  chat: { placeholder: (t) => t.themeText.cassette.chatPlaceholder, variant: 'cassette' },
  Decor: () => <div className="cs-stripe" aria-hidden />,
  host,
};
export default cassette;
