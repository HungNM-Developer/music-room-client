'use client';

import { ListPlus, Radio, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ListenAlong, useListening, useListenSession } from '@/components/player/ListenAlong';
import { AddTrackPanel } from '@/components/room/AddTrackPanel';
import { Banners } from '@/components/room/Banners';
import { ChatOverlay, InlineChat, type InlineChatSkin } from '@/components/room/Chat';
import { GuideSpotlight } from '@/components/room/GuideSpotlight';
import { HeartCanvas, triggerReaction } from '@/components/room/HeartCanvas';
import { MiniPlayerPortal } from '@/components/room/MiniPlayer';
import { PeoplePanel } from '@/components/room/PeoplePanel';
import { RecapCard } from '@/components/room/RecapCard';
import { RoomHeader, type RoomHeaderSlots } from '@/components/room/RoomHeader';
import { RoomSkeleton } from '@/components/room/RoomSkeleton';
import { SkipVote } from '@/components/room/SkipVote';
import { LangSwitch } from '@/components/ui/LangSwitch';
import { panelId, tabId, TabList, type TabDef } from '@/components/ui/Tabs';
import { onFindSongs } from '@/lib/find-songs';
import { errorMessage, useT } from '@/i18n';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import './room-frame.css';

// Loaded only when used: most members never see these.
const PlayerEngine = dynamic(() => import('@/components/player/PlayerEngine').then((m) => m.PlayerEngine), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/room/SettingsPanel').then((m) => m.SettingsPanel), { ssr: false });
const ActivityLog = dynamic(() => import('@/components/room/ActivityLog').then((m) => m.ActivityLog), { ssr: false });
const JoinDialog = dynamic(() => import('@/components/room/JoinDialog').then((m) => m.JoinDialog), { ssr: false });

type TabKey = 'room' | 'add' | 'people';

/**
 * Everything around the room column, the same in every theme: header, banners, the side
 * column (chat, add songs / people), phone tabs and floating chat, reactions, the vote
 * card, the mini player, the join form. `stage` is the room column (the theme's layout).
 */
export function RoomFrame({
  code,
  stage,
  header,
  chat,
  decor,
  sideTop,
  inlineVote,
  videoFrame,
}: {
  code: string;
  /** The room column; receives "open the add tab" for empty-queue buttons. */
  stage: (openAdd: () => void) => React.ReactNode;
  header?: RoomHeaderSlots;
  chat?: InlineChatSkin;
  /** Behind the page (decorative). */
  decor?: React.ReactNode;
  /** ≥1024 px, above the chat in the side column (e.g. a station announcement ticker). */
  sideTop?: React.ReactNode;
  /** ≥1024 px the stage shows the vote itself, so the floating card is for smaller screens. */
  inlineVote: boolean;
  /** This device plays: the theme's frame around the video (its speaker-screen frame). */
  videoFrame?: string;
}) {
  const t = useT();
  const memberId = useRoom((s) => s.memberId);
  const revoked = useRoom((s) => s.revoked);
  const connection = useRoom((s) => s.connection);
  const queueCount = useRoom((s) => s.snapshot?.queue.length ?? 0);
  const hasSnapshot = useRoom((s) => Boolean(s.snapshot));
  const me = useMe();
  const [tab, setTab] = useState<TabKey>('room');
  const [logOpen, setLogOpen] = useState(false);
  useListenSession();
  const listening = useListening();
  // "Tìm bài khác" (idle speaker cover): the add panel, on the search box.
  useEffect(
    () =>
      onFindSongs(() => {
        setTab('add');
        setTimeout(() => document.getElementById('add-input')?.focus(), 50);
      }),
    [],
  );

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
  // This device plays the room, for the room or for itself ("Nghe cùng"): the video leads the stage.
  const hasVideo = isPlayer || listening;
  const needsJoin = connection === 'connected' && !memberId;
  const canChat = Boolean(memberId && me && !me.isDevice);
  const notice = revoked === 'kicked' ? t.banners.kicked : revoked === 'invalid' ? errorMessage('UNAUTHENTICATED') : null;

  const tabs: TabDef<TabKey>[] = [
    { key: 'room', label: t.tabs.room, icon: <Radio className="h-[22px] w-[22px]" aria-hidden />, badge: queueCount },
    { key: 'add', label: t.tabs.add, icon: <ListPlus className="h-[22px] w-[22px]" aria-hidden /> },
    { key: 'people', label: t.tabs.people, icon: <Users className="h-[22px] w-[22px]" aria-hidden /> },
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
    <div className="room-frame relative isolate min-h-dvh pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-12">
      {decor}
      <HeartCanvas />
      {/* Same element either way, so switching themes keeps "Để sau" and the result. */}
      <div className={inlineVote ? 'lg:hidden' : undefined}>
        <SkipVote variant="member" />
      </div>
      <MiniPlayerPortal />
      <GuideSpotlight showTab={setTab} />
      <RoomHeader onOpenLog={() => setLogOpen(true)} {...header} />

      <main className="mx-auto max-w-[1360px] px-4 pt-4 md:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-11 lg:pt-6 min-[1600px]:max-w-[1840px] min-[1600px]:grid-cols-[minmax(0,1fr)_480px] min-[2000px]:max-w-[2400px] min-[2000px]:grid-cols-[minmax(0,1fr)_520px]">
        <div className="room-banners mb-4 empty:hidden lg:col-span-full">
          <Banners />
        </div>

        <div
          {...panel('room')}
          data-player={hasVideo || undefined}
          className={`room-stage min-w-0 space-y-5 ${tab === 'room' ? '' : 'hidden lg:block'}`}
        >
          {isPlayer ? (
            <PlayerEngine caption frameClass={videoFrame && `room-video-frame ${videoFrame}`} />
          ) : (
            <ListenAlong frameClass={videoFrame && `room-video-frame ${videoFrame}`} />
          )}
          {hasSnapshot ? stage(() => setTab('add')) : <RoomSkeleton />}
        </div>

        <div className="room-side min-w-0 space-y-5">
          {sideTop && <div className="hidden lg:block">{sideTop}</div>}
          {canChat && (
            <div className="hidden lg:block">
              <InlineChat {...chat} />
            </div>
          )}
          <TabList
            variant="pill"
            idPrefix="room-side"
            panelPrefix="room"
            label={t.tabs.label}
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
            <LangSwitch className="sm:hidden" />
          </div>
        </div>
      </main>

      {/* Phones / tablets: the floating chat; ≥1024 px the chat sits in the side column. */}
      {canChat && (
        <div className="lg:hidden">
          <ChatOverlay {...chat} />
        </div>
      )}

      <nav aria-label={t.tabs.label} className="room-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-dial pb-[env(safe-area-inset-bottom)] lg:hidden">
        <TabList variant="bar" idPrefix="room" label={t.tabs.label} tabs={tabs} value={tab} onChange={setTab} />
      </nav>

      {logOpen && <ActivityLog onClose={() => setLogOpen(false)} />}
      {needsJoin && <JoinDialog code={code} notice={notice} />}
    </div>
  );
}
