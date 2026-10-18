'use client';

import { Mail, MoreHorizontal, Pin, Plus } from 'lucide-react';
import { ListenAlong, ListenersStrip } from '@/components/player/ListenAlong';
import { HostLyrics, InlineLyrics, LyricsButton } from '@/components/room/Lyrics';
import { HeartButton, hasItemMenu, useQueueView } from '@/components/room/QueueList';
import { chatText } from '@/components/room/DjMessage';
import { SaveButton } from '@/components/room/SaveButton';
import { useNow } from '@/components/room/SkipVote';
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { useNowPlayingActions } from '@/components/room/stage/useNowPlayingActions';
import { useSkipVoteState } from '@/components/room/stage/useSkipVoteState';
import { Suggestions } from '@/components/room/Suggestions';
import { IconButton } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { trackArtist } from '@/lib/track-artist';
import { estimatePosition, formatDuration } from '@/lib/time';
import { useNowPlaying, useRoom } from '@/state/hooks';
import { barlowCondensed } from '../hifi82/fonts';
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
  useHostChat,
  useListeners,
} from '@/components/host/parts';
import type { HostSkin, ThemeModule } from '../load';
import { NowCover, StageIdle, WishBlock } from '../stage/parts';
import { StageControls } from '../stage/StageControls';
import { StageVote } from '../stage/StageVote';
import { useTopSuggestions } from '../stage/useTopSuggestions';
import '../stage/stage.css';
import { etaTimes } from './eta';
import './theme.css';
import './host.css';
import { tr } from '@/i18n';

const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString(tr().time.locale, { hour: '2-digit', minute: '2-digit', hour12: false });

/** Split-flap letters: each character on its own flap; a new text flaps in letter by letter. */
export function FlipText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`st-flaps ${className}`} aria-label={text} role="img">
      {[...text].map((ch, i) => (
        // Keyed by the letter too, so a changed letter remounts and flaps again.
        <i key={`${i}-${ch}`} style={{ ['--d' as string]: `${i * 40}ms` }} aria-hidden>
          {ch === ' ' ? ' ' : ch}
        </i>
      ))}
    </span>
  );
}

function CodeFlaps() {
  const code = useRoom((s) => s.snapshot?.room.code ?? '');
  return <FlipText text={code} />;
}

/** The station clock, HH:mm. */
function Clock({ large = false }: { large?: boolean }) {
  const now = useNow(15_000, true);
  return (
    <span className="st-clock" data-large={large || undefined} suppressHydrationWarning>
      {hhmm(now)}
    </span>
  );
}

/** The platform line: amber fill and a white marker at the song's position. */
function Track({ large = false }: { large?: boolean }) {
  const t = useT();
  const { ref, timeRef, info } = useLiveProgress();
  return (
    <div ref={ref} className="st-track-wrap" data-large={large || undefined}>
      <div className="st-track" aria-hidden>
        <i />
        <b />
      </div>
      <div className="st-times">
        <span ref={timeRef}>0:00</span>
        <span>{info ? (info.known ? formatDuration(info.durationSec) : t.nowPlaying.unknownDuration) : ''}</span>
      </div>
    </div>
  );
}

/** The departures board: Dự kiến / Bài / Người chọn / Ghi chú, the room's suggestion last. */
function Board({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  const { items, adding, me, openMenu, menus } = useQueueView();
  const np = useNowPlaying();
  const offset = useRoom((s) => s.offset);
  const now = useNow(30_000, true);
  const top = useTopSuggestions(1);
  const pos = np ? estimatePosition({ ...np, durationSec: np.item.track.durationSec }, offset, now) : 0;
  const etas = etaTimes(now, np ? { positionSec: pos, durationSec: np.item.track.durationSec ?? 0 } : null, items);
  const empty = items.length === 0 && adding.length === 0;
  return (
    <section aria-labelledby="queue-title" className="st-board-wrap">
      <h3 id="queue-title" aria-label={t.queue.title} className="stage-h3">
        {t.themeText.station.departures}
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
      <table className="st-board">
        <thead>
          <tr>
            <th scope="col">{t.themeText.station.eta}</th>
            <th scope="col">{t.themeText.station.song}</th>
            <th scope="col" className="max-md:hidden">
              {t.themeText.station.picker}
            </th>
            <th scope="col" className="max-md:hidden">
              {t.themeText.station.note}
            </th>
            <th scope="col">
              <span className="sr-only">{t.themeText.station.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((q, i) => (
            <tr key={q.id}>
              <td className="t">{etas[i] !== null ? hhmm(etas[i] as number) : '—'}</td>
              <td className="main">
                <span className="title" title={q.track.title}>
                  {q.track.title}
                </span>
                {trackArtist(q.track) && <span className="s">{trackArtist(q.track)}</span>}
                <span className="md:hidden s">{addedByLabel(q)}</span>
              </td>
              <td className="max-md:hidden">{addedByLabel(q)}</td>
              <td className="s max-md:hidden">
                {q.pinned && (
                  <span className="note">
                    <Pin className="h-3.5 w-3.5" aria-hidden /> Ghim
                  </span>
                )}
                {q.wishMessage && (
                  <span className="note">
                    <Mail className="h-3.5 w-3.5" aria-hidden /> {t.themeText.station.wish}
                  </span>
                )}
                {q.track.durationSec ? <span className="note">{formatDuration(q.track.durationSec)}</span> : null}
              </td>
              <td className="acts">
                <div className="flex items-center justify-end">
                  <HeartButton item={q} me={me} />
                  <SaveButton track={q.track} />
                  {hasItemMenu(q, me) && (
                    <IconButton label={t.queue.actions(q.track.title)} data-guide="itemMenu" onClick={() => openMenu(q)}>
                      <MoreHorizontal className="h-5 w-5" aria-hidden />
                    </IconButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {adding.map((op) => (
            <tr key={op.id} aria-busy="true" className="dim">
              <td className="t">…</td>
              <td className="main">
                <span className="title">{op.title ?? t.queue.addingTitle}</span>
              </td>
              <td className="max-md:hidden">{t.add.adding}</td>
              <td className="max-md:hidden" />
              <td />
            </tr>
          ))}
          {top.items.map((s) => (
            <tr key={s.track.id} className="dim">
              <td className="t">{t.themeText.station.suggestTag}</td>
              <td className="main">
                <span className="title">{s.track.title}</span>
              </td>
              <td className="max-md:hidden">{t.suggest.reasons[s.reason] ?? t.suggest.title}</td>
              <td className="max-md:hidden" />
              <td className="acts">
                <button type="button" className="stage-btn stage-sb" disabled={top.isAdded(s.track)} onClick={() => top.add(s.track)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {t.add.addResult}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {menus}
    </section>
  );
}

/** The station loudspeaker: the latest chat lines running across. */
function Ticker() {
  const t = useT();
  const chat = useRoom((s) => s.chat);
  const meId = useRoom((s) => s.memberId);
  const recent = chat.slice(-5);
  if (!recent.length) return null;
  const line = recent.map((m) => `${m.displayName}: ${chatText(t, m, meId)}`).join('   ·   ');
  return (
    <div className="st-ticker" aria-hidden>
      <span className="run">
        {line}
        <span className="gap" />
        {line}
      </span>
    </div>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  const a = useNowPlayingActions();
  const vote = useSkipVoteState();
  if (!a) {
    return (
      <div className="stage station">
        <StageIdle openAdd={openAdd} />
        <Board openAdd={openAdd} />
        <Suggestions />
      </div>
    );
  }
  const { track, playing } = a;
  return (
    <div className="stage station">
      <section aria-label={t.nowPlaying.title} data-guide="nowPlaying">
        <div className="st-now">
          <NowCover className="art" />
          <div className="min-w-0">
            <span className="st-tag">
              <span className="dot" data-live={playing} aria-hidden />
              {playing ? t.nowPlaying.live : t.nowPlaying.paused} · {t.themeText.station.platform}
            </span>
            {/* A new song flaps in. */}
            <h2 key={a.np.item.id} className="stage-title st-flip-in" title={track.title}>
              {track.title}
            </h2>
            <p className="st-who">
              {a.pickerLabel}
              {track.channel && ` · ${track.channel}`}
            </p>
            <LyricsButton trackId={track.id} />
            <Track />
          </div>
        </div>
        <WishBlock className="st-ann" />
        <InlineLyrics trackId={track.id} size="stage" className="max-lg:hidden" />
        <StageControls a={a} variant="station" />
        <StageVote s={vote} meterAt="middle" className="max-lg:hidden" />
        <div className="stage-listeners empty:hidden">
          <ListenersStrip />
        </div>
        {a.blockMenu}
      </section>
      <ListenAlong />
      <Board openAdd={openAdd} />
      <Suggestions />
    </div>
  );
}

/* ---- Speaker screen: the station hall ---- */

function HostHead() {
  const { roomName } = useHost();
  return (
    <div className="hs-head">
      <FlipText text={roomName.toLocaleUpperCase().slice(0, 28)} className="hs-name" />
      <span className="hs-grow" />
      <CodeFlaps />
      <Clock large />
    </div>
  );
}

function HostNow() {
  const t = useT();
  const { np } = useHost();
  return (
    <div className="hs-now">
      <div className="hs-row">
        <HostLamp />
        <span className="hs-platform">{t.themeText.station.platform}</span>
      </div>
      <HostTitle />
      <div className="hs-meta-row">
        <HostMeta />
        <HostWish className="hs-wish" />
      </div>
      {np && <Track large />}
      {np && <HostLyrics trackId={np.item.track.id} />}
    </div>
  );
}

/** "Dự kiến" times for the next songs, as on the room page's board. */
function HostBoard() {
  const t = useT();
  const { np, next } = useHost();
  const offset = useRoom((s) => s.offset);
  const now = useNow(30_000, true);
  const pos = np ? estimatePosition({ ...np, durationSec: np.item.track.durationSec }, offset, now) : 0;
  const etas = etaTimes(now, np ? { positionSec: pos, durationSec: np.item.track.durationSec ?? 0 } : null, next);
  return (
    <section className="hs-board" aria-label={t.host.next}>
      <h2>{t.themeText.station.departures}</h2>
      {next.length === 0 ? (
        <HostNextEmpty />
      ) : (
        <ol>
          {next.map((q, i) => (
            <li key={q.id}>
              <b>{etas[i] !== null ? hhmm(etas[i] as number) : '—'}</b>
              <span className="t">{q.track.title}</span>
              <span className="p">{addedByLabel(q)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function HostHall() {
  const t = useT();
  const listening = useListeners().length > 0;
  return (
    <div className="hs-side">
      <div className="hs-ticket">
        <HostQr />
        <div className="hs-ticket-text">
          <h2>{t.themeText.station.ticket}</h2>
          <p className="hs-scan">{t.host.scan}</p>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <HostBoard />
      {listening && (
        <div className="hs-pax">
          <span>{t.themeText.station.passengers}</span>
          <HostListeners />
        </div>
      )}
    </div>
  );
}

/** Chat as the station's running announcement; still lines when motion is reduced. */
function HostAnnounce() {
  const t = useT();
  const recent = useHostChat(5);
  const line = recent.map((m) => `${m.displayName}: ${chatText(t, m)}`).join('   ·   ');
  return (
    <div className="hs-foot">
      <div className="st-ticker hs-ticker" aria-hidden>
        {recent.length ? (
          <span className="run">
            {line}
            <span className="gap" />
            {line}
          </span>
        ) : (
          <span>{t.chat.hostEmpty}</span>
        )}
      </div>
      {/* Screen readers always; on screen instead of the running strip when motion is reduced. */}
      <HostChatLines n={3} className="hs-still" />
      <HostControls className="hs-ctl" />
    </div>
  );
}

const host: HostSkin = { className: 'host-station', Header: HostHead, Below: HostNow, Side: HostHall, Footer: HostAnnounce };

const station: ThemeModule = {
  Stage,
  fontClass: barlowCondensed.variable,
  header: { code: <CodeFlaps />, extra: <Clock />, variant: 'station' },
  chat: { variant: 'station' },
  SideTop: Ticker,
  host,
};
export default station;
