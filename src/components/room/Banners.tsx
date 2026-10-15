'use client';

import { Hourglass, RefreshCw, Speaker, WifiOff } from 'lucide-react';
import { useOrigin } from '@/hooks/useOrigin';
import { useSlow } from '@/hooks/useSlow';
import { vi } from '@/i18n/vi';
import { useRoom, useVersionMismatch } from '@/state/hooks';

/** Connection / version / player banners (TC-123, TC-192, TC-200). */
export function Banners() {
  const connection = useRoom((s) => s.connection);
  const kind = useRoom((s) => s.kind);
  const code = useRoom((s) => s.code);
  const player = useRoom((s) => s.snapshot?.player ?? null);
  // The player's page is still connected but holds no lease: it was reloaded (or the
  // browser discarded the tab) and waits for someone to press "Bắt đầu phát".
  const playerPageOpen = useRoom((s) => {
    const id = s.snapshot?.player.memberId;
    return Boolean(id && s.snapshot?.members.some((m) => m.id === id && m.online));
  });
  const versionMismatch = useVersionMismatch();
  const origin = useOrigin();
  // A first connection that takes this long usually means a free-tier server waking up.
  const waking = useSlow(connection === 'connecting', 2500);
  const items: { key: string; icon: React.ReactNode; text: string; action?: React.ReactNode }[] = [];

  if (versionMismatch) {
    items.push({
      key: 'version',
      icon: <RefreshCw className="h-4 w-4" aria-hidden />,
      text: vi.banners.newVersion,
      action: (
        <button type="button" className="font-semibold text-amber underline-offset-2 hover:underline" onClick={() => window.location.reload()}>
          {vi.banners.reload}
        </button>
      ),
    });
  }
  if (waking) {
    items.push({ key: 'waking', icon: <Hourglass className="h-4 w-4" aria-hidden />, text: vi.banners.waking });
  }
  if (connection === 'reconnecting') {
    items.push({ key: 'conn', icon: <WifiOff className="h-4 w-4" aria-hidden />, text: vi.banners.reconnecting });
  }
  if (player && kind === 'member' && connection === 'connected' && !player.online) {
    items.push({
      key: 'player',
      icon: <Speaker className="h-4 w-4" aria-hidden />,
      text: !player.memberId
        ? vi.banners.noPlayer(`${origin}/r/${code}/host`)
        : playerPageOpen
          ? vi.banners.playerWaiting
          : vi.banners.playerOffline,
    });
  }
  if (!items.length) return null;
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {items.map((b) => (
        <div key={b.key} className="flex items-center gap-3 rounded-row border border-amber/35 bg-amber/10 px-4 py-3 text-[14px]">
          <span className="text-amber">{b.icon}</span>
          {/* min-w-0 + anywhere-wrap: long URLs must not widen the page on phones */}
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{b.text}</span>
          {b.action}
        </div>
      ))}
    </div>
  );
}
