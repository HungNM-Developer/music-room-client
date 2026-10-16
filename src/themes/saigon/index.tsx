'use client';

import type { ThemeModule } from '../load';
import { LineDial } from '../stage/dials';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { StageQueue } from '../stage/StageQueue';
import { bungee, patrickHand } from './fonts';
import './theme.css';

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

const saigon: ThemeModule = {
  Stage,
  fontClass: `${bungee.variable} ${patrickHand.variable}`,
  Decor: () => <div className="saigon-tiles" aria-hidden />,
  HostDial: () => <LineDial variant="tape" className="saigon-host" />,
};
export default saigon;
