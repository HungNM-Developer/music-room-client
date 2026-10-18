'use client';

import { MoreHorizontal } from 'lucide-react';
import { useHost } from '@/components/host/HostContext';
import {
  HostChatLines,
  HostCode,
  HostControls,
  HostLamp,
  HostLink,
  HostMeta,
  HostNextEmpty,
  HostQr,
  HostTitle,
  HostWish,
} from '@/components/host/parts';
import { HostLyrics } from '@/components/room/Lyrics';
import { useState } from 'react';
import { HeartButton, hasItemMenu, useQueueView } from '@/components/room/QueueList';
import { Dialog } from '@/components/ui/Dialog';
import type { QueueItemView } from '@/contracts';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { ytThumb } from '@/lib/thumbs';
import { formatDuration } from '@/lib/time';
import { useRoom } from '@/state/hooks';
import type { HostSkin, ThemeModule } from '../load';
import { ProgressBox, TimeText } from '../stage/dials';
import { CoverImage, NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { StageQueue } from '../stage/StageQueue';
import { spaceGrotesk } from './fonts';
import './theme.css';
import './host.css';

/** The ellipse every orbit is drawn on (rotated -18°). */
const ORBIT = 'M 2 130 A 128 40 0 1 0 258 130 A 128 40 0 1 0 2 130';

/** The cover as a planet; the satellite on the tilted orbit is the song's time. */
function Planet({ withCover = true }: { withCover?: boolean }) {
  return (
    <ProgressBox className="cosmos-planet relative h-full w-full">
      {withCover && <NowCover className="ball" />}
      <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <g transform="rotate(-18 130 130)">
          <path d={ORBIT} className="orbit" />
          <path d={ORBIT} pathLength={100} className="trail" />
          <circle r="6" className="moon" style={{ offsetPath: `path('${ORBIT}')` }} />
        </g>
      </svg>
    </ProgressBox>
  );
}

/** People listening along, drawn as stars. */
function Stars() {
  const t = useT();
  const members = useRoom((s) => s.snapshot?.members);
  const people = (members ?? []).filter((m) => m.listening && m.online);
  if (!people.length) return null;
  return (
    <p className="cosmos-stars" title={people.map((m) => m.displayName).join(', ')}>
      {people.slice(0, 8).map((m) => (
        <i key={m.id} aria-hidden />
      ))}
      {t.listen.count(people.length)}
    </p>
  );
}

/** "Quỹ đạo tiếp theo": the next songs as planets getting smaller, then the full list. */
function Orbits({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  const { items, me, openMenu, menus } = useQueueView();
  const [open, setOpen] = useState<QueueItemView | null>(null);
  // Keep the dialog on the live item (hearts change while it is open).
  const shown = open ? (items.find((q) => q.id === open.id) ?? null) : null;
  const sizes = [64, 54, 46, 40, 34, 30];
  const planets = items.length > 0 && (
    <div className="cosmos-orbitq" role="group" aria-label={t.queue.title}>
      {items.slice(0, sizes.length).map((q, i) => (
        <button
          key={q.id}
          type="button"
          className="p"
          style={{
            width: sizes[i],
            height: sizes[i],
            backgroundImage: `url(${ytThumb(q.track.thumbnailUrl) ?? ''})`,
          }}
          aria-label={`${i + 1}. ${q.track.title}, ${addedByLabel(q)}`}
          title={q.track.title}
          onClick={() => setOpen(q)}
        />
      ))}
      <span className="hint">{t.themeText.cosmos.hint}</span>
    </div>
  );
  return (
    <>
      <StageQueue openAdd={openAdd} title={t.themeText.cosmos.next} variant="cosmos" lead={planets} />
      {shown && (
        <Dialog open onClose={() => setOpen(null)} title={shown.track.title} description={addedByLabel(shown)}>
          <div className="flex flex-wrap items-center gap-3">
            {shown.track.durationSec ? <span className="text-sage tabular-nums">{formatDuration(shown.track.durationSec)}</span> : null}
            {shown.wishMessage && <p className="w-full whitespace-pre-wrap text-[15px] [overflow-wrap:anywhere]">{shown.wishMessage}</p>}
            <HeartButton item={shown} me={me} />
            {hasItemMenu(shown, me) && (
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-row border border-line px-3 text-[14px] hover:bg-panel-hi"
                data-guide="itemMenu"
                onClick={() => {
                  setOpen(null);
                  openMenu(shown);
                }}
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden />
                {t.queue.actions(shown.track.title)}
              </button>
            )}
          </div>
        </Dialog>
      )}
      {menus}
    </>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<Planet />}
      dial={<TimeText />}
      dialInInfo
      listeners={<Stars />}
      voteMeterAt="middle"
      queue={<Orbits openAdd={openAdd} />}
    />
  );
}

/* ---- Speaker screen: the view from a spaceship ---- */

function HostCockpit() {
  const { np } = useHost();
  return (
    <div className="hc2-now">
      <div className="hc2-song">
        {np && (
          <div className="hc2-planet">
            <Planet />
          </div>
        )}
        <div className="hc2-info">
          <HostLamp />
          <HostTitle />
          <HostMeta />
          {np && <TimeText />}
        </div>
      </div>
      {np && <HostLyrics trackId={np.item.track.id} />}
      <HostWish withFrom className="hc2-wish host-wish-1" />
    </div>
  );
}

/** Planet sizes for the next three songs: the farther away, the smaller. */
const ORBIT_SIZES = [5.6, 4.4, 3.4];

function HostStation() {
  const t = useT();
  const { next } = useHost();
  return (
    <div className="hc2-side">
      <div className="hc2-panel hc2-qr">
        <HostQr />
        <div className="min-w-0">
          <h2>{t.host.scan}</h2>
          <HostCode />
          <HostLink />
        </div>
      </div>
      <section className="hc2-panel hc2-orbits" aria-label={t.host.next}>
        <h2>{t.themeText.cosmos.next}</h2>
        {next.length === 0 ? (
          <HostNextEmpty />
        ) : (
          <ol>
            {next.map((q, i) => (
              <li key={q.id} style={{ ['--s' as string]: ORBIT_SIZES[i] }}>
                <CoverImage url={q.track.thumbnailUrl} className="hc2-world" />
                <span className="t">{q.track.title}</span>
                <span className="p">{addedByLabel(q)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="hc2-panel hc2-people">
        <Stars />
        <HostChatLines n={2} />
        <HostControls />
      </div>
    </div>
  );
}

const host: HostSkin = { className: 'host-cosmos', videoClass: 'hc2-port', Below: HostCockpit, Side: HostStation };

const cosmos: ThemeModule = {
  Stage,
  fontClass: spaceGrotesk.variable,
  chat: {
    title: (t) => t.themeText.cosmos.chat,
    placeholder: (t) => t.themeText.cosmos.chatPlaceholder,
    variant: 'cosmos',
  },
  Decor: () => <div className="cosmos-sky" aria-hidden />,
  host,
};
export default cosmos;
