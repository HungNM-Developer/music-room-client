'use client';

import { Sparkle } from 'lucide-react';
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
import { ProgressBox, TimeText } from '../stage/dials';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { cormorant } from './fonts';
import './theme.css';
import './host.css';
import { useT } from '@/i18n';

/** Twelve house lines (every 30°) between the two rings. */
const HOUSES = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const [s, c] = [Math.sin(a), Math.cos(a)];
  return { x1: 130 + 122 * s, y1: 130 - 122 * c, x2: 130 + 104 * s, y2: 130 - 104 * c };
});

/** The zodiac wheel around the round cover; the gold arc (and its star) is the time. */
function Wheel({ size = 'stage' }: { size?: 'stage' | 'host' }) {
  return (
    <ProgressBox className={`astro-wheel relative h-full w-full`}>
      <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <circle cx="130" cy="130" r="122" className="ring" />
        <circle cx="130" cy="130" r="104" className="ring" />
        <g className="houses">
          {HOUSES.map((h, i) => (
            <line key={i} {...h} />
          ))}
        </g>
        <circle cx="130" cy="130" r="113" pathLength={100} className="arc" transform="rotate(-90 130 130)" />
        <g className="star">
          <circle cx="130" cy="17" r="4" />
        </g>
      </svg>
      {size === 'stage' && <NowCover className="astro-cv" />}
    </ProgressBox>
  );
}

/** The moon wanes as the vote runs out. */
function Moon({ leftMs, totalMs }: VoteMeterProps) {
  const left = Math.max(0, Math.min(1, leftMs / totalMs));
  return <span className="astro-moon" style={{ ['--left' as string]: left }} aria-hidden />;
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<Wheel />}
      dial={<TimeText icon={<Sparkle className="h-4 w-4 text-amber" aria-hidden />} />}
      dialInInfo
      voteMeter={Moon}
      voteMeterAt="start"
      voteText={(s) => t.themeText.voteMoon(s.asksLabel, s.votes, s.required, s.seconds)}
    />
  );
}

/* ---- Speaker screen: the night sky, the zodiac wheel around the QR ---- */

function HostSkyNow() {
  const { np } = useHost();
  return (
    <div className="ha-now">
      <div className="ha-row">
        <HostLamp />
        <HostMeta />
      </div>
      <HostTitle />
      {np && <HostLyrics trackId={np.item.track.id} />}
      <HostWish withFrom className="ha-wish host-wish-1" />
    </div>
  );
}

function HostSkySide() {
  const t = useT();
  const { next, np } = useHost();
  return (
    <div className="ha-side">
      <div className="ha-top">
        {/* The gold arc around the QR is the song's time; the QR keeps its white margin inside the inner ring. */}
        <div className="ha-wheel">
          {np ? <Wheel size="host" /> : <div className="astro-wheel ha-empty" aria-hidden />}
          <HostQr />
        </div>
        <div className="ha-code">
          <p className="ha-scan">{t.host.scan}</p>
          <HostCode />
          <HostLink />
          {np && <TimeText icon={<Sparkle aria-hidden />} />}
        </div>
      </div>
      <section className="ha-next" aria-label={t.host.next}>
        <h2>{t.themeText.astro.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q) => (
              <li key={q.id}>
                <Sparkle aria-hidden />
                <span className="t">{q.track.title}</span>
                <span className="p">{addedByLabel(q)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="ha-people">
        <HostListeners max={4} />
        <HostChatLines n={2} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-astro', videoClass: 'ha-video', Below: HostSkyNow, Side: HostSkySide };

const astro: ThemeModule = {
  Stage,
  fontClass: cormorant.variable,
  Decor: () => <div className="astro-sky" aria-hidden />,
  HostVoteMeter: Moon,
  host,
};
export default astro;
