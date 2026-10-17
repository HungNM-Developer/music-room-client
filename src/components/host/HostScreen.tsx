'use client';

import { useEffect, useMemo, useState } from 'react';
import { Backdrop } from '@/components/room/Backdrop';
import { Banners } from '@/components/room/Banners';
import { HeartCanvas } from '@/components/room/HeartCanvas';
import { SkipVote } from '@/components/room/SkipVote';
import { useOrigin } from '@/hooks/useOrigin';
import { useRoomMood } from '@/hooks/useRoomMood';
import { HOST_RECLAIM_MS, useOtherLivePlayer, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { useShownTheme } from '@/themes/load';
import { useApplyTheme, useEffectiveTheme } from '@/themes/useTheme';
import { type HostData, HostProvider } from './HostContext';
import { defaultSkin } from './defaultSkin';
import { HostVideo } from './parts';
import './host.css';

/**
 * The speaker screen. The same slots in the same order for every theme (empty ones render
 * null): the video player stays put in the tree, so a theme change never reloads it. Themes
 * fill the slots (`ThemeModule.host`, the default theme `defaultSkin`) and place them with
 * their own CSS grid on the 16:9 canvas.
 */
export function HostScreen({ code }: { code: string }) {
  const np = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const queue = useRoom((s) => s.snapshot?.queue);
  const roomName = useRoom((s) => s.snapshot?.room.name ?? '');
  const playerRevoked = useRoom((s) => s.playerRevoked);
  const otherPlayer = useOtherLivePlayer();
  // The sound was moved to another device: once that one has been offline for a while, this
  // speaker takes the room back by itself (an office TV returns after someone's laptop leaves).
  useEffect(() => {
    if (!playerRevoked || otherPlayer) return;
    const t = setTimeout(() => room.clearPlayerRevoked(), HOST_RECLAIM_MS);
    return () => clearTimeout(t);
  }, [playerRevoked, otherPlayer]);
  const [volume, setVolume] = useState(100);
  // This browser's theme for the room (shared with the room page on this device), else the room's.
  const { id: theme, mod } = useShownTheme(useEffectiveTheme());
  useApplyTheme(theme, mod?.fontClass);
  useRoomMood(theme === 'default');
  const origin = useOrigin();

  const data = useMemo<HostData>(() => {
    const track = np?.item.track;
    return {
      code,
      roomName,
      joinUrl: origin ? `${origin}/r/${code}` : '',
      np,
      live: np?.status === 'PLAYING',
      picker: np?.item.addedBy?.displayName ?? null,
      artist: track ? (track.artist ?? track.channel) : null,
      next: (queue ?? []).slice(0, 3),
      volume,
      setVolume,
      theme,
    };
  }, [code, roomName, origin, np, queue, volume, theme]);

  const skin = mod?.host ?? defaultSkin;
  const { Header, Below, Side, Footer } = skin;
  const Decor = mod?.Decor;

  return (
    <HostProvider value={data}>
      <main className={`host-root relative isolate ${skin.className}`} data-layout="canvas">
        {theme === 'default' && <Backdrop height="h-dvh" />}
        {Decor && <Decor />}
        <HeartCanvas />
        <SkipVote variant="host" meter={mod?.HostVoteMeter} />
        <div className="host-frame">
          <div className="host-grid">
            <div className="host-header">{Header ? <Header /> : null}</div>
            <div className={`host-video ${skin.videoClass ?? ''}`}>
              <HostVideo />
            </div>
            <div className="host-below">
              <Below />
            </div>
            <div className="host-side">
              <Side />
            </div>
            <div className="host-footer">{Footer ? <Footer /> : null}</div>
          </div>
          {/* The banners float over the canvas. */}
          <div className="host-banners">
            <Banners />
          </div>
        </div>
      </main>
    </HostProvider>
  );
}
