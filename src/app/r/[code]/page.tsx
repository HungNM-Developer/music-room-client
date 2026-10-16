'use client';

import { useRoomDeleted } from '@/hooks/useRoomDeleted';
import { ListPlus, Radio, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddTrackPanel } from '@/components/room/AddTrackPanel';
import { Backdrop } from '@/components/room/Backdrop';
import { Banners } from '@/components/room/Banners';
import { ChatOverlay } from '@/components/room/Chat';
import { ListenAlong } from '@/components/player/ListenAlong';
import { HeartCanvas, triggerReaction } from '@/components/room/HeartCanvas';
import { MiniPlayerPortal } from '@/components/room/MiniPlayer';
import { SkipVote } from '@/components/room/SkipVote';
import { NowPlayingCard } from '@/components/room/NowPlayingCard';
import { PeoplePanel } from '@/components/room/PeoplePanel';
import { QueueList } from '@/components/room/QueueList';
import { RecapCard } from '@/components/room/RecapCard';
import { RoomHeader } from '@/components/room/RoomHeader';
import { RoomSkeleton } from '@/components/room/RoomSkeleton';
import { Suggestions } from '@/components/room/Suggestions';
import { panelId, tabId, TabList, type TabDef } from '@/components/ui/Tabs';
import { normalizeRoomCode } from '@/contracts/text';
import { useRoomMood } from '@/hooks/useRoomMood';
import { errorMessage, vi } from '@/i18n/vi';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

// Loaded only when used: most members never see these.
const PlayerEngine = dynamic(() => import('@/components/player/PlayerEngine').then((m) => m.PlayerEngine), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/room/SettingsPanel').then((m) => m.SettingsPanel), { ssr: false });
const ActivityLog = dynamic(() => import('@/components/room/ActivityLog').then((m) => m.ActivityLog), { ssr: false });
const JoinDialog = dynamic(() => import('@/components/room/JoinDialog').then((m) => m.JoinDialog), { ssr: false });

type TabKey = 'room' | 'add' | 'people';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? '');
  const memberId = useRoom((s) => s.memberId);
  const revoked = useRoom((s) => s.revoked);
  const connection = useRoom((s) => s.connection);
  const queueCount = useRoom((s) => s.snapshot?.queue.length ?? 0);
  const hasSnapshot = useRoom((s) => Boolean(s.snapshot));
  const me = useMe();
  const [tab, setTab] = useState<TabKey>('room');
  const [logOpen, setLogOpen] = useState(false);
  useRoomMood();
  useRoomDeleted();

  useEffect(() => room.enter(code, 'member'), [code]);

  // Floating reactions + a visual cue for DJ sounds (audio plays on the speaker only, R-34).
  useEffect(
    () =>
      room.onReaction((e) => {
        // My own reactions already floated up locally when I tapped them.
        if (e.memberId === room.getState().memberId) return;
        triggerReaction(window.innerWidth * (0.15 + Math.random() * 0.7), window.innerHeight - 120, e.emoji);
      }),
    [],
  );
  useEffect(() => room.onDj(() => triggerReaction(window.innerWidth / 2, window.innerHeight - 120, '🎧')), []);

  // Legacy path (TC-129): a member granted canPlay plays from this page; the engine claims the lease.
  const isPlayer = Boolean(me?.canPlay && !me.isDevice);
  const needsJoin = connection === 'connected' && !memberId;
  const canChat = Boolean(memberId && me && !me.isDevice);
  const notice = revoked === 'kicked' ? vi.banners.kicked : revoked === 'invalid' ? errorMessage('UNAUTHENTICATED') : null;

  const tabs: TabDef<TabKey>[] = [
    { key: 'room', label: vi.tabs.room, icon: <Radio className="h-[22px] w-[22px]" aria-hidden />, badge: queueCount },
    { key: 'add', label: vi.tabs.add, icon: <ListPlus className="h-[22px] w-[22px]" aria-hidden /> },
    { key: 'people', label: vi.tabs.people, icon: <Users className="h-[22px] w-[22px]" aria-hidden /> },
  ];
  // ≥1024 px: the room column is always visible; the side column switches add / people.
  const sideTab: TabKey = tab === 'people' ? 'people' : 'add';
  const panel = (key: TabKey) => ({
    id: panelId('room', key),
    role: 'tabpanel' as const,
    'aria-labelledby': tabId('room', key),
  });

  return (
    // Bottom padding clears the tab bar and the floating chat head.
    <div className="relative isolate min-h-dvh pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-28">
      <Backdrop />
      <HeartCanvas />
      <SkipVote variant="member" />
      <MiniPlayerPortal />
      <RoomHeader onOpenLog={() => setLogOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-8 lg:pt-6">
        <div className="mb-4 empty:hidden lg:col-span-full">
          <Banners />
        </div>

        <div {...panel('room')} className={`min-w-0 space-y-5 ${tab === 'room' ? '' : 'hidden lg:block'}`}>
          {isPlayer && (
            <div className="space-y-2">
              <p className="px-1 text-[13px] font-medium text-amber">{vi.host.thisDevicePlays}</p>
              <PlayerEngine />
            </div>
          )}
          {hasSnapshot ? (
            <>
              <NowPlayingCard />
              <ListenAlong />
              <Suggestions />
              <QueueList onAdd={() => setTab('add')} />
            </>
          ) : (
            <RoomSkeleton />
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <TabList
            variant="pill"
            idPrefix="room-side"
            panelPrefix="room"
            label={vi.tabs.label}
            tabs={tabs.slice(1)}
            value={sideTab}
            onChange={setTab}
            className="hidden lg:flex"
          />
          <div {...panel('add')} className={tab === 'add' ? '' : tab === 'room' ? 'hidden lg:block' : 'hidden'}>
            <AddTrackPanel />
          </div>
          <div {...panel('people')} className={`space-y-6 ${tab === 'people' ? '' : 'hidden'}`}>
            <PeoplePanel />
            <RecapCard />
            <SettingsPanel />
          </div>
        </div>
      </main>

      {canChat && <ChatOverlay />}

      <nav aria-label={vi.tabs.label} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-dial pb-[env(safe-area-inset-bottom)] lg:hidden">
        <TabList variant="bar" idPrefix="room" label={vi.tabs.label} tabs={tabs} value={tab} onChange={setTab} />
      </nav>

      {logOpen && <ActivityLog onClose={() => setLogOpen(false)} />}
      {needsJoin && <JoinDialog code={code} notice={notice} />}
    </div>
  );
}
