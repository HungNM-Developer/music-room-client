'use client';

import { LiveDial } from '@/components/room/TuningDial';
import type { ThemeModule } from '../load';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { fraunces } from './fonts';
import './theme.css';

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

const listening: ThemeModule = {
  Stage,
  fontClass: fraunces.variable,
  HostDial: () => <LiveDial size="large" />,
};
export default listening;
