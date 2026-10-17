'use client';

import { createContext, useContext } from 'react';
import type { NowPlayingView, QueueItemView } from '@/contracts';
import type { ThemeId } from '@/themes/registry';

/** What every part of the speaker screen reads; gathered once by HostScreen. */
export interface HostData {
  code: string;
  roomName: string;
  /** '' until the origin is known (first render). */
  joinUrl: string;
  np: NowPlayingView | null;
  live: boolean;
  picker: string | null;
  artist: string | null;
  /** The next three songs. */
  next: QueueItemView[];
  volume: number;
  setVolume: (v: number) => void;
  theme: ThemeId;
}

const HostCtx = createContext<HostData | null>(null);

export function HostProvider({ value, children }: { value: HostData; children: React.ReactNode }) {
  return <HostCtx.Provider value={value}>{children}</HostCtx.Provider>;
}

export function useHost(): HostData {
  const v = useContext(HostCtx);
  if (!v) throw new Error('useHost outside HostProvider');
  return v;
}
