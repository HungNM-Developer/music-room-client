'use client';

import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import type { ThemeModule } from '../load';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { barlow, barlowCondensed } from './fonts';
import './theme.css';

/** The amber LCD: elapsed time, a segment meter filling with --p, and the length. */
function Lcd({ large = false }: { large?: boolean }) {
  const { ref, timeRef, info } = useLiveProgress();
  return (
    <div ref={ref} className="hifi-lcd" data-large={large || undefined}>
      <span ref={timeRef}>0:00</span>
      <span className="meter" aria-hidden />
      <small>{info ? (info.known ? formatDuration(info.durationSec) : vi.nowPlaying.unknownDuration) : ''}</small>
    </div>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  return (
    <StageLayout
      openAdd={openAdd}
      cover={<NowCover className="hifi-art" />}
      dial={<Lcd />}
      dialInInfo
      controls="keys"
      voteMeterAt="middle"
      voteText={(s) => `${s.asksLabel}. ${s.votes}/${s.required} đồng ý · ${s.seconds}s`}
      numbered
    />
  );
}

const hifi82: ThemeModule = {
  Stage,
  fontClass: `${barlow.variable} ${barlowCondensed.variable}`,
  HostDial: () => <Lcd large />,
};
export default hifi82;
