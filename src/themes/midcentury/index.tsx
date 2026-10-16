'use client';

import type { ThemeModule } from '../load';
import { LineDial } from '../stage/dials';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { archivo } from './fonts';
import './theme.css';

/** Round artwork on a yellow sun with an orange ring crossing it. */
function Cover() {
  return (
    <div className="mc-cover relative h-full w-full">
      <span className="sun" aria-hidden />
      <span className="ring" aria-hidden />
      <NowCover className="mc-art" />
    </div>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<Cover />}
      dial={<LineDial layout="beside" variant="mc" />}
      voteMeterAt="middle"
      queueVariant="round"
    />
  );
}

const midcentury: ThemeModule = {
  Stage,
  fontClass: archivo.variable,
  HostDial: () => <LineDial layout="beside" variant="mc" className="mc-host" />,
};
export default midcentury;
