'use client';

import type { VoteMeterProps } from '@/components/room/stage/useSkipVoteState';
import type { ThemeModule } from '../load';
import { LineDial } from '../stage/dials';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { exo2 } from './fonts';
import './theme.css';

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
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<Scene />}
      dial={<LineDial variant="neon" />}
      dialInInfo
      voteMeter={Led}
      voteMeterAt="start"
      voteText={(s) => `${s.asksLabel}. ${s.votes}/${s.required} đồng ý`}
    />
  );
}

const synthwave: ThemeModule = {
  Stage,
  fontClass: exo2.variable,
  Decor: () => <div className="synth-sky" aria-hidden />,
  HostDial: () => <LineDial variant="neon" className="synth-host" />,
  HostVoteMeter: Led,
};
export default synthwave;
