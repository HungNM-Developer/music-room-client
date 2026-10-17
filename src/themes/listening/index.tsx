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
import { LiveDial } from '@/components/room/TuningDial';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import type { HostSkin, ThemeModule } from '../load';
import { CoverImage, NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { fraunces } from './fonts';
import './theme.css';
import './host.css';

function Cover() {
  return (
    <div className="listening-cover relative h-full w-full">
      <span className="rec" aria-hidden />
      <NowCover />
    </div>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  return <StageLayout openAdd={openAdd} cover={<Cover />} dial={<LiveDial size="large" />} />;
}

/* ---- Speaker screen: the listening bar ---- */

function HostBarNow() {
  const { np } = useHost();
  return (
    <div className="hl-now">
      <div className="hl-song">
        <div className="listening-cover hl-cover" aria-hidden>
          <span className="rec" />
          <CoverImage url={np?.item.track.thumbnailUrl} />
        </div>
        <div className="hl-info">
          <HostLamp />
          <HostTitle />
          <HostMeta />
        </div>
      </div>
      {np && <HostLyrics trackId={np.item.track.id} />}
      {np && <LiveDial size="large" />}
    </div>
  );
}

/** The coaster (QR), the menu of what plays next, the people at the bar. */
function HostBarSide() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hl-side">
      <div className="hl-qr">
        <div className="hl-coaster">
          <HostQr />
        </div>
        <div className="min-w-0">
          <p className="hl-scan">{t.host.scan}</p>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <section className="hl-menu" aria-label={t.host.next}>
        <h2>{t.host.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q) => (
              <li key={q.id}>
                <span className="t">{q.track.title}</span>
                <i aria-hidden />
                <span className="p">{addedByLabel(q)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <HostWish withFrom className="hl-wish" />
      <div className="hl-people">
        <HostListeners max={4} />
        <HostChatLines n={2} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-listening', Below: HostBarNow, Side: HostBarSide };

const listening: ThemeModule = {
  Stage,
  fontClass: fraunces.variable,
  host,
};
export default listening;
