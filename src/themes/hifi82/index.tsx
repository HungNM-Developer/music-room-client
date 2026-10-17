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
import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { addedByLabel } from '@/lib/added-by';
import { useT } from '@/i18n';
import { formatDuration } from '@/lib/time';
import type { HostSkin, ThemeModule } from '../load';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { barlow, barlowCondensed } from './fonts';
import './theme.css';
import './host.css';

/** The amber LCD: elapsed time, a segment meter filling with --p, and the length. */
function Lcd({ large = false }: { large?: boolean }) {
  const t = useT();
  const { ref, timeRef, info } = useLiveProgress();
  return (
    <div ref={ref} className="hifi-lcd" data-large={large || undefined}>
      <span ref={timeRef}>0:00</span>
      <span className="meter" aria-hidden />
      <small>{info ? (info.known ? formatDuration(info.durationSec) : t.nowPlaying.unknownDuration) : ''}</small>
    </div>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<NowCover className="hifi-art" />}
      dial={<Lcd />}
      dialInInfo
      controls="keys"
      voteMeterAt="middle"
      voteText={(s) => t.themeText.voteSeconds(s.asksLabel, s.votes, s.required, s.seconds)}
      numbered
    />
  );
}

/* ---- Speaker screen: one brushed-aluminium deck ---- */

/** Beside the video: the brand plate with the signal lamp, the QR, the wish. */
function HostPanel() {
  const t = useT();
  const { roomName } = useHost();
  return (
    <div className="hh-side">
      <div className="hh-brand">
        <span>{roomName}</span>
        <HostLamp />
      </div>
      <div className="hh-qr">
        <HostQr />
        <div className="min-w-0">
          <p className="hh-scan">{t.host.scan}</p>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <HostWish withFrom className="hh-wish" />
    </div>
  );
}

/** The amber LCD across the deck: the song and the time on the left, the lyrics on the right. */
function HostLcdBand() {
  const { np } = useHost();
  return (
    <div className="hh-lcd">
      <div className="hh-lcd-song">
        <HostTitle />
        <HostMeta />
        {np && <Lcd large />}
      </div>
      {np && <HostLyrics trackId={np.item.track.id} className="hh-lcd-lyrics" />}
    </div>
  );
}

/** The numbered keys (next songs) and the people / chat panel. */
function HostKeys() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hh-bottom">
      <section className="hh-keys" aria-label={t.host.next}>
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
      <div className="hh-people">
        <HostListeners max={4} />
        <HostChatLines n={2} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-hifi82', videoClass: 'hh-video', Below: HostKeys, Side: HostPanel, Footer: HostLcdBand };

const hifi82: ThemeModule = {
  Stage,
  fontClass: `${barlow.variable} ${barlowCondensed.variable}`,
  host,
};
export default hifi82;
