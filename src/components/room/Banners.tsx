'use client';

import { RefreshCw, WifiOff, Speaker } from 'lucide-react';
import { useRoom } from '@/context/RoomContext';
import { useOrigin } from '@/hooks/useOrigin';
import { vi } from '@/i18n/vi';

/** Connection / version / player banners (TC-123, TC-192, TC-200). */
export function Banners() {
  const { connection, versionMismatch, snapshot, code, kind } = useRoom();
  const origin = useOrigin();
  const items: { key: string; icon: React.ReactNode; text: string; action?: React.ReactNode }[] = [];

  if (versionMismatch) {
    items.push({
      key: 'version',
      icon: <RefreshCw className="w-4 h-4" aria-hidden />,
      text: vi.banners.newVersion,
      action: (
        <button className="underline font-bold" onClick={() => window.location.reload()}>
          {vi.banners.reload}
        </button>
      ),
    });
  }
  if (connection === 'reconnecting') {
    items.push({ key: 'conn', icon: <WifiOff className="w-4 h-4" aria-hidden />, text: vi.banners.reconnecting });
  }
  if (snapshot && kind === 'member' && connection === 'connected' && !snapshot.player.online) {
    items.push({
      key: 'player',
      icon: <Speaker className="w-4 h-4" aria-hidden />,
      text: snapshot.player.memberId
        ? vi.banners.playerOffline
        : vi.banners.noPlayer(`${origin}/r/${code}/host`),
    });
  }
  if (!items.length) return null;
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {items.map((b) => (
        <div
          key={b.key}
          data-testid={`banner-${b.key}`}
          className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50"
        >
          {b.icon}
          {/* min-w-0 + anywhere-wrap: long URLs must not widen the page on phones */}
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{b.text}</span>
          {b.action}
        </div>
      ))}
    </div>
  );
}
