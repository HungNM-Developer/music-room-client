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
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import type { HostSkin, ThemeModule } from '../load';
import { LineDial } from '../stage/dials';
import { CoverImage, NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { archivo } from './fonts';
import './theme.css';
import './host.css';

/** Round artwork on a yellow sun with an orange ring crossing it. */
function Cover() {
  return (
    <div className="mc-cover relative h-full w-full">
      <span className="sun" aria-hidden />
      <span className="ring" aria-hidden />
      <NowCover className="mc-art" />
    </div>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<Cover />}
      dial={<LineDial layout="beside" variant="mc" />}
      voteMeterAt="middle"
      queueVariant="round"
    />
  );
}

/* ---- Speaker screen: a mid-century poster (sun and ring drawn by host.css) ---- */

function HostPosterNow() {
  const { np } = useHost();
  return (
    <div className="hm-now">
      <div className="hm-row">
        <HostLamp />
        <HostMeta />
      </div>
      <HostTitle />
      {np && <LineDial layout="beside" variant="mc" />}
      {np && <HostLyrics trackId={np.item.track.id} />}
      <HostWish withFrom className="hm-wish host-wish-1" />
    </div>
  );
}

function HostPosterSide() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hm-side">
      <div className="hm-qr">
        <HostQr />
        <div className="min-w-0">
          <p className="hm-scan">{t.host.scan}</p>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <section className="hm-next" aria-label={t.host.next}>
        <h2>{t.host.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q) => (
              <li key={q.id}>
                <CoverImage url={q.track.thumbnailUrl} className="hm-round" />
                <span className="t">{q.track.title}</span>
                <span className="p">{addedByLabel(q)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="hm-people">
        <HostListeners max={4} />
        <HostChatLines n={2} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-midcentury', videoClass: 'hm-video', Below: HostPosterNow, Side: HostPosterSide };

const midcentury: ThemeModule = {
  Stage,
  fontClass: archivo.variable,
  host,
};
export default midcentury;
