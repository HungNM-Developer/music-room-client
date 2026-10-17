'use client';

import { Play } from 'lucide-react';
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
import { HostLyrics } from '@/components/room/Lyrics';
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import type { VoteMeterProps } from '@/components/room/stage/useSkipVoteState';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { formatDuration } from '@/lib/time';
import { useRoom } from '@/state/hooks';
import type { HostSkin, ThemeModule } from '../load';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { vt323 } from './fonts';
import './theme.css';
import './host.css';

const CELLS = 16;

/** Time as a health bar: 16 cells, lit up to the song's position. */
function HealthBar({ large = false }: { large?: boolean }) {
  const t = useT();
  const { ref, timeRef, info } = useLiveProgress();
  return (
    <div ref={ref} className="pix-hp" data-large={large || undefined}>
      <span ref={timeRef}>0:00</span>
      <span className="bar" aria-hidden>
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} style={{ ['--i' as string]: i }} />
        ))}
      </span>
      <span>{info ? (info.known ? formatDuration(info.durationSec) : t.nowPlaying.unknownDuration) : ''}</span>
    </div>
  );
}

/** The boss's health: one cell per vote needed, lit for each ✅. */
function BossBar({ votes, required, seconds }: VoteMeterProps) {
  return (
    <span className="pix-boss">
      <span className="bb" aria-hidden>
        {Array.from({ length: Math.max(1, required) }, (_, i) => (
          <i key={i} data-hit={i < votes || undefined} />
        ))}
      </span>
      <span className="hud">
        {votes}/{required}, {seconds}s
      </span>
    </span>
  );
}

/** "x 8 người": how many are in the room right now, like lives left. */
function Lives() {
  const t = useT();
  const n = useRoom((s) => s.snapshot?.members.filter((m) => m.online && !m.isDevice).length ?? 0);
  return (
    <span className="pix-lives" aria-label={t.themeText.pixel.lives(n)}>
      {t.themeText.pixel.livesShort(n)}
    </span>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  return (
    <StageLayout
      openAdd={openAdd}
      cover={
        <div className="pix-screen h-full w-full">
          <NowCover />
        </div>
      }
      dial={<HealthBar />}
      dialInInfo
      kicker={t.themeText.pixel.stage}
      controls="pixel"
      voteMeter={BossBar}
      voteMeterAt="middle"
      voteText={(s) => `Boss: ${s.asksLabel}`}
      queueTitle={t.themeText.pixel.next}
    />
  );
}

/* ---- Speaker screen: an 8-bit game screen ---- */

/** The HUD: the health bar is the time, then the players in the room and the stage. */
function HostHud() {
  const t = useT();
  const { np } = useHost();
  return (
    <div className="hp-hud">
      <span className="hp-label">HP</span>
      {np ? <HealthBar large /> : <span className="hp-grow" />}
      <Lives />
      {np && <span className="hp-stage">{t.themeText.pixel.stage}</span>}
    </div>
  );
}

function HostPlayer() {
  const { np } = useHost();
  return (
    <div className="hp-now">
      <div className="hp-row">
        <HostLamp />
        <HostMeta />
      </div>
      <HostTitle />
      {np && <HostLyrics trackId={np.item.track.id} />}
    </div>
  );
}

/** Dialog boxes: player 2 (QR), the next stages, the wish and chat (in the body font). */
function HostDialogs() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hp-side">
      <div className="hp-box hp-join" role="group" aria-label={t.host.scan}>
        <HostQr />
        <div className="min-w-0">
          <p className="hp-say">{t.themeText.pixel.join}</p>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <section className="hp-box hp-next" aria-label={t.host.next}>
        <h2>{t.themeText.pixel.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q, i) => (
              <li key={q.id}>
                {i === 0 ? <Play aria-hidden /> : <i aria-hidden />}
                <b>{t.themeText.pixel.level(i + 2)}</b>
                <span className="t">{q.track.title}</span>
                <span className="p">{addedByLabel(q)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="hp-box hp-talk">
        <HostWish withFrom className="host-wish-1" />
        <HostChatLines n={2} />
      </div>
      <div className="hp-foot">
        <HostListeners max={4} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-pixel', videoClass: 'hp-video', Header: HostHud, Below: HostPlayer, Side: HostDialogs };

const pixel: ThemeModule = {
  Stage,
  fontClass: vt323.variable,
  header: { extra: <Lives /> },
  HostVoteMeter: BossBar,
  host,
};
export default pixel;
