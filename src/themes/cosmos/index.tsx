'use client';

import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { HeartButton, hasItemMenu, useQueueView } from '@/components/room/QueueList';
import { Dialog } from '@/components/ui/Dialog';
import type { QueueItemView } from '@/contracts';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { ytThumb } from '@/lib/thumbs';
import { formatDuration } from '@/lib/time';
import { useRoom } from '@/state/hooks';
import type { ThemeModule } from '../load';
import { ProgressBox, TimeText } from '../stage/dials';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { StageQueue } from '../stage/StageQueue';
import { spaceGrotesk } from './fonts';
import './theme.css';

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

const cosmos: ThemeModule = {
  Stage,
  fontClass: spaceGrotesk.variable,
  chat: {
    title: (t) => t.themeText.cosmos.chat,
    placeholder: (t) => t.themeText.cosmos.chatPlaceholder,
    variant: 'cosmos',
  },
  Decor: () => <div className="cosmos-sky" aria-hidden />,
  HostDial: () => (
    <div className="cosmos-host">
      <div className="h-28 w-28">
        <Planet withCover={false} />
      </div>
      <TimeText />
    </div>
  ),
};
export default cosmos;
