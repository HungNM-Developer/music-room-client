'use client';

import { HostLyrics } from '@/components/room/Lyrics';
import { LiveDial } from '@/components/room/TuningDial';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import type { HostSkin } from '@/themes/load';
import { CoverImage } from '@/themes/stage/parts';
import { useHost } from './HostContext';
import { HostChatLines, HostCode, HostControls, HostLamp, HostLink, HostListeners, HostMeta, HostNextEmpty, HostQr, HostTitle, HostWish } from './parts';

/** The default theme's speaker screen: the room-mood backdrop, the tuning dial, the paper QR card. */
function Below() {
  const { np } = useHost();
  return (
    <div className="hd-now">
      <div className="hd-song">
        <HostLamp />
        <HostTitle />
        <HostMeta />
      </div>
      {np && <LiveDial size="large" />}
      {np && <HostLyrics trackId={np.item.track.id} />}
      <HostWish withFrom className="hd-wish host-wish-1" />
      <HostControls />
    </div>
  );
}

function Side() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hd-side">
      <div className="hd-qr">
        <p className="hd-scan">{t.host.scan}</p>
        <HostQr />
        <HostCode />
        <HostLink />
      </div>
      <HostListeners max={5} />
      <section className="hd-next" aria-label={t.host.next}>
        <h2>{t.host.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q) => (
              <li key={q.id}>
                <CoverImage url={q.track.thumbnailUrl} className="hd-thumb" />
                <span className="hd-q">
                  <span className="t">{q.track.title}</span>
                  <span className="p">{addedByLabel(q)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="hd-chat-box">
        <h2>{t.chat.title}</h2>
        <HostChatLines n={3} />
      </section>
    </div>
  );
}

export const defaultSkin: HostSkin = { className: 'host-default', Below, Side };
