'use client';

import { useRoomDeleted } from '@/hooks/useRoomDeleted';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { Backdrop } from '@/components/room/Backdrop';
import { ListenAlong } from '@/components/player/ListenAlong';
import { NowPlayingCard } from '@/components/room/NowPlayingCard';
import { QueueList } from '@/components/room/QueueList';
import { RoomFrame } from '@/components/room/RoomFrame';
import { RoomSkeleton } from '@/components/room/RoomSkeleton';
import { Suggestions } from '@/components/room/Suggestions';
import { normalizeRoomCode } from '@/contracts/text';
import { useRoomMood } from '@/hooks/useRoomMood';
import { room } from '@/state/room-store';
import { useShownTheme } from '@/themes/load';
import { useApplyTheme, useEffectiveTheme } from '@/themes/useTheme';

/** The member room page; `page.tsx` adds the link-preview metadata around it. */
export function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? '');
  const { id: theme, mod } = useShownTheme(useEffectiveTheme());
  useApplyTheme(theme, mod?.fontClass);
  useRoomMood(theme === 'default');
  useRoomDeleted();

  useEffect(() => room.enter(code, 'member'), [code]);

  if (theme === 'default') {
    return (
      <RoomFrame
        code={code}
        inlineVote={false}
        decor={<Backdrop />}
        stage={(openAdd) => (
          <>
            <NowPlayingCard />
            <ListenAlong />
            {/* The real queue first; suggestions are extra. */}
            <QueueList onAdd={openAdd} />
            <Suggestions />
          </>
        )}
      />
    );
  }

  // While the theme's chunk loads, the frame (header, tabs, side column) is already usable.
  const Stage = mod?.Stage;
  const Decor = mod?.Decor;
  const SideTop = mod?.SideTop;
  return (
    <RoomFrame
      code={code}
      inlineVote
      header={mod?.header}
      chat={mod?.chat}
      decor={Decor && <Decor />}
      sideTop={SideTop && <SideTop />}
      stage={(openAdd) => (Stage ? <Stage openAdd={openAdd} /> : <RoomSkeleton />)}
    />
  );
}
