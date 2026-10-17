'use client';

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
import type { VoteMeterProps } from '@/components/room/stage/useSkipVoteState';
import { addedByLabel } from '@/lib/added-by';
import type { HostSkin, ThemeModule } from '../load';
import { LineDial } from '../stage/dials';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { exo2 } from './fonts';
import './theme.css';
import './host.css';
import { useT } from '@/i18n';

/** A striped sun over a perspective grid, the cover in a neon frame. */
function Scene() {
  return (
    <div className="synth-scene h-full w-full">
      <span className="sun" aria-hidden />
      <span className="grid" aria-hidden />
      <NowCover className="cv" />
    </div>
  );
}

/** The vote countdown as glowing LED digits. */
function Led({ seconds }: VoteMeterProps) {
  return (
    <span className="synth-led" aria-hidden>
      {seconds}
    </span>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<Scene />}
      dial={<LineDial variant="neon" />}
      dialInInfo
      voteMeter={Led}
      voteMeterAt="start"
      voteText={(s) => t.themeText.voteShort(s.asksLabel, s.votes, s.required)}
    />
  );
}

/* ---- Speaker screen: neon over the sunset grid (sun and grid drawn by host.css) ---- */

function HostNeonNow() {
  const { np } = useHost();
  return (
    <div className="hy-now">
      <HostLamp />
      <HostTitle />
      <HostMeta />
      {np && <LineDial variant="neon" layout="beside" />}
      {np && <HostLyrics trackId={np.item.track.id} />}
      <HostWish withFrom className="hy-wish host-wish-1" />
    </div>
  );
}

function HostNeonSide() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hy-side">
      <div className="hy-frame hy-qr">
        <HostQr />
        <div className="min-w-0">
          <h2>{t.host.scan}</h2>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <section className="hy-frame hy-next" aria-label={t.host.next}>
        <h2>{t.host.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q, i) => (
              <li key={q.id}>
                <b>{String(i + 1).padStart(2, '0')}</b>
                <span className="t">{q.track.title}</span>
                <span className="p">{addedByLabel(q)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="hy-frame hy-people">
        <HostListeners max={4} />
        <HostChatLines n={3} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-synthwave', videoClass: 'hy-video', Below: HostNeonNow, Side: HostNeonSide };

const synthwave: ThemeModule = {
  Stage,
  fontClass: exo2.variable,
  Decor: () => <div className="synth-sky" aria-hidden />,
  HostVoteMeter: Led,
  host,
};
export default synthwave;
