'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PlayerEngine } from '@/components/player/PlayerEngine';
import { ActivityLogPopup } from '@/components/room/ActivityLogPopup';
import { AddTrackPanel } from '@/components/room/AddTrackPanel';
import { Banners } from '@/components/room/Banners';
import { BottomTabs, type TabKey } from '@/components/room/BottomTabs';
import { ChatPanel } from '@/components/room/ChatPanel';
import { DjSoundboard } from '@/components/room/DjSoundboard';
import { HeartCanvas, triggerReaction } from '@/components/room/HeartCanvas';
import { JoinDialog } from '@/components/room/JoinDialog';
import { NowPlayingCard, ReactionBar } from '@/components/room/NowPlayingCard';
import { PeoplePanel } from '@/components/room/PeoplePanel';
import { QueueList } from '@/components/room/QueueList';
import { RoomBackground } from '@/components/room/RoomBackground';
import { RoomHeader } from '@/components/room/RoomHeader';
import { SettingsPanel } from '@/components/room/SettingsPanel';
import { useRoom } from '@/context/RoomContext';
import { normalizeRoomCode } from '@/contracts';
import { errorMessage, vi } from '@/i18n/vi';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? '');
  const room = useRoom();
  const { enter, snapshot, memberId, revoked, me, connection, onReaction, onDj } = room;
  const [tab, setTab] = useState<TabKey>('room');
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    enter(code, 'member');
  }, [code, enter]);

  // Floating reactions + a visual cue for DJ sounds (audio plays on the speaker only, R-34).
  useEffect(
    () =>
      onReaction((e) =>
        triggerReaction(Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1, window.innerHeight - 120, e.emoji),
      ),
    [onReaction],
  );
  useEffect(
    () => onDj(() => triggerReaction(window.innerWidth / 2, window.innerHeight - 120, '🎧')),
    [onDj],
  );

  // Legacy path (TC-129): a member granted canPlay plays from this page; the engine claims the lease.
  const isPlayer = Boolean(me?.canPlay && !me.isDevice);

  const needsJoin = connection === 'connected' && !memberId;
  const notice =
    revoked === 'kicked' ? vi.banners.kicked : revoked === 'invalid' ? errorMessage('UNAUTHENTICATED') : null;

  return (
    <div className="min-h-dvh relative pb-28 lg:pb-10">
      <RoomBackground thumbnail={snapshot?.nowPlaying?.item.track.thumbnailUrl ?? undefined} />
      <HeartCanvas />
      <div className="relative z-10">
        <RoomHeader onOpenLog={() => setLogOpen(true)} />
        <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <Banners />
          {/* grid-cols-1 = minmax(0,1fr): long titles must not widen the column on phones */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className={`${tab === 'room' ? 'block' : 'hidden'} lg:block lg:col-span-7 min-w-0 space-y-4`}>
              {isPlayer && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">{vi.host.thisDevicePlays}</p>
                  <PlayerEngine />
                </div>
              )}
              <NowPlayingCard />
              <ReactionBar />
              <QueueList />
            </div>
            <div className="lg:col-span-5 min-w-0 space-y-4">
              <div className={`${tab === 'add' ? 'block' : 'hidden'} lg:block`}>
                <AddTrackPanel />
              </div>
              <div className={`${tab === 'people' ? 'block' : 'hidden'} lg:block space-y-4`}>
                <PeoplePanel />
                <SettingsPanel />
                <DjSoundboard />
                <ChatPanel />
              </div>
            </div>
          </div>
        </main>
      </div>
      <BottomTabs tab={tab} onChange={setTab} queueCount={snapshot?.queue.length ?? 0} />
      {logOpen && <ActivityLogPopup onClose={() => setLogOpen(false)} />}
      {needsJoin && <JoinDialog code={code} notice={notice} />}
    </div>
  );
}
