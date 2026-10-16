'use client';

import { Sparkle } from 'lucide-react';
import type { VoteMeterProps } from '@/components/room/stage/useSkipVoteState';
import type { ThemeModule } from '../load';
import { ProgressBox, TimeText } from '../stage/dials';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { cormorant } from './fonts';
import './theme.css';

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
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<Wheel />}
      dial={<TimeText icon={<Sparkle className="h-4 w-4 text-amber" aria-hidden />} />}
      dialInInfo
      voteMeter={Moon}
      voteMeterAt="start"
      voteText={(s) => `${s.asksLabel}. ${s.votes}/${s.required} đồng ý, trăng tắt sau ${s.seconds} giây`}
    />
  );
}

const astro: ThemeModule = {
  Stage,
  fontClass: cormorant.variable,
  Decor: () => <div className="astro-sky" aria-hidden />,
  HostDial: () => (
    <div className="astro-host">
      <div className="h-28 w-28">
        <Wheel size="host" />
      </div>
      <TimeText />
    </div>
  ),
  HostVoteMeter: Moon,
};
export default astro;
