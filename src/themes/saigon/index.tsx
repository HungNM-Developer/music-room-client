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
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { StageQueue } from '../stage/StageQueue';
import { bungee, patrickHand } from './fonts';
import './theme.css';
import './host.css';

function Stage({ openAdd }: { openAdd: () => void }) {
  return (
    <StageLayout
      openAdd={openAdd}
      cover={
        <div className="saigon-frame h-full w-full">
          <NowCover />
        </div>
      }
      dial={<LineDial variant="tape" />}
      dialInInfo
      queue={<StageQueue openAdd={openAdd} variant="chalk" />}
    />
  );
}

/* ---- Speaker screen: an old Saigon shopfront inside a cement-tile border ---- */

function HostSign() {
  const { roomName } = useHost();
  return (
    <div className="hg-sign">
      <span className="hg-name">{roomName}</span>
      <HostLamp />
      <HostListeners max={3} />
    </div>
  );
}

function HostShopNow() {
  const { np } = useHost();
  return (
    <div className="hg-now">
      <HostTitle />
      <HostMeta />
      {np && <LineDial variant="tape" layout="beside" />}
      {np && <HostLyrics trackId={np.item.track.id} />}
    </div>
  );
}

function HostShopSide() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hg-side">
      <div className="hg-qr">
        <HostQr />
        <div className="min-w-0">
          <p className="hg-scan">{t.host.scan}</p>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <section className="hg-chalk" aria-label={t.host.next}>
        <h2>{t.host.next}</h2>
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
      <HostWish withFrom className="hg-card" />
      <div className="hg-people">
        <HostChatLines n={2} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-saigon', videoClass: 'hg-video', Header: HostSign, Below: HostShopNow, Side: HostShopSide };

const saigon: ThemeModule = {
  Stage,
  fontClass: `${bungee.variable} ${patrickHand.variable}`,
  Decor: () => <div className="saigon-tiles" aria-hidden />,
  host,
};
export default saigon;
