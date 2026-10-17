'use client';

import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import type { VoteMeterProps } from '@/components/room/stage/useSkipVoteState';
import { useT } from '@/i18n';
import { formatDuration } from '@/lib/time';
import { useRoom } from '@/state/hooks';
import type { ThemeModule } from '../load';
import { NowCover } from '../stage/parts';
import { StageLayout } from '../stage/StageLayout';
import { vt323 } from './fonts';
import './theme.css';

const CELLS = 16;

/** Time as a health bar: 16 cells, lit up to the song's position. */
function HealthBar({ large = false }: { large?: boolean }) {
  const t = useT();
  const { ref, timeRef, info } = useLiveProgress();
  return (
    <div ref={ref} className="pix-hp" data-large={large || undefined}>
      <span ref={timeRef}>0:00</span>
      <span className="bar" aria-hidden>
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} style={{ ['--i' as string]: i }} />
        ))}
      </span>
      <span>{info ? (info.known ? formatDuration(info.durationSec) : t.nowPlaying.unknownDuration) : ''}</span>
    </div>
  );
}

/** The boss's health: one cell per vote needed, lit for each ✅. */
function BossBar({ votes, required, seconds }: VoteMeterProps) {
  return (
    <span className="pix-boss">
      <span className="bb" aria-hidden>
        {Array.from({ length: Math.max(1, required) }, (_, i) => (
          <i key={i} data-hit={i < votes || undefined} />
        ))}
      </span>
      <span className="hud">
        {votes}/{required}, {seconds}s
      </span>
    </span>
  );
}

/** "x 8 người": how many are in the room right now, like lives left. */
function Lives() {
  const t = useT();
  const n = useRoom((s) => s.snapshot?.members.filter((m) => m.online && !m.isDevice).length ?? 0);
  return (
    <span className="pix-lives" aria-label={t.themeText.pixel.lives(n)}>
      {t.themeText.pixel.livesShort(n)}
    </span>
  );
}

function Stage({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  return (
    <StageLayout
      openAdd={openAdd}
      cover={
        <div className="pix-screen h-full w-full">
          <NowCover />
        </div>
      }
      dial={<HealthBar />}
      dialInInfo
      kicker={t.themeText.pixel.stage}
      controls="pixel"
      voteMeter={BossBar}
      voteMeterAt="middle"
      voteText={(s) => `Boss: ${s.asksLabel}`}
      queueTitle={t.themeText.pixel.next}
    />
  );
}

const pixel: ThemeModule = {
  Stage,
  fontClass: vt323.variable,
  header: { extra: <Lives /> },
  HostDial: () => <HealthBar large />,
  HostVoteMeter: BossBar,
};
export default pixel;
