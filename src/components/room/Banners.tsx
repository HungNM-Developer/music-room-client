'use client';

import { Hourglass, RefreshCw, Speaker, Trash2, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useOrigin } from '@/hooks/useOrigin';
import { useSlow } from '@/hooks/useSlow';
import { useT } from '@/i18n';
import { useMe, useRoom, useVersionSkew } from '@/state/hooks';

/** Connection / version / player banners (TC-123, TC-192, TC-200). */
export function Banners() {
  const t = useT();
  const connection = useRoom((s) => s.connection);
  const kind = useRoom((s) => s.kind);
  const code = useRoom((s) => s.code);
  const player = useRoom((s) => s.snapshot?.player ?? null);
  // The player's page is still connected but holds no lease: it was reloaded (or the
  // browser discarded the tab) and waits for a first tap on that device.
  const playerPageOpen = useRoom((s) => {
    const id = s.snapshot?.player.memberId;
    return Boolean(id && s.snapshot?.members.some((m) => m.id === id && m.online));
  });
  const skew = useVersionSkew();
  const toast = useToast();
  // A room nobody signed in for is deleted after 30 days unused: tell its admins how to keep it.
  const me = useMe();
  const orphan = useRoom((s) => Boolean(s.snapshot && s.snapshot.room.ownerUserId === null));
  const [orphanSeen, setOrphanSeen] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable in the browser
      setOrphanSeen(sessionStorage.getItem(`orphan-notice:${code}`) === '1');
    } catch {
      setOrphanSeen(false);
    }
  }, [code]);
  const origin = useOrigin();
  // A first connection that takes this long usually means a free-tier server waking up.
  const waking = useSlow(connection === 'connecting', 2500);
  const items: { key: string; icon: React.ReactNode; text: string; action?: React.ReactNode }[] = [];

  if (skew === 'serverOlder') {
    items.push({ key: 'version', icon: <Hourglass className="h-4 w-4" aria-hidden />, text: t.banners.serverUpdating });
  }
  if (skew === 'serverNewer') {
    items.push({
      key: 'version',
      icon: <RefreshCw className="h-4 w-4" aria-hidden />,
      text: t.banners.newVersion,
      action: (
        <button type="button" className="font-semibold text-amber underline-offset-2 hover:underline" onClick={() => window.location.reload()}>
          {t.banners.reload}
        </button>
      ),
    });
  }
  if (waking) {
    items.push({ key: 'waking', icon: <Hourglass className="h-4 w-4" aria-hidden />, text: t.banners.waking });
  }
  if (connection === 'reconnecting') {
    items.push({ key: 'conn', icon: <WifiOff className="h-4 w-4" aria-hidden />, text: t.banners.reconnecting });
  }
  const hostUrl = `${origin}/r/${code}/host`;
  if (player && kind === 'member' && connection === 'connected' && !player.online) {
    items.push({
      key: 'player',
      icon: <Speaker className="h-4 w-4" aria-hidden />,
      // Only the admin sets up the speaker: the link is for them, a short line for everyone else.
      text: !player.memberId
        ? me?.role === 'ADMIN'
          ? t.banners.noPlayer(hostUrl)
          : t.banners.noPlayerMember
        : playerPageOpen
          ? t.banners.playerWaiting
          : t.banners.playerOffline,
      action:
        !player.memberId && me?.role === 'ADMIN' ? (
          <button
            type="button"
            className="shrink-0 font-semibold text-amber underline-offset-2 hover:underline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(hostUrl);
                toast(t.banners.hostLinkCopied, 'success');
              } catch {
                toast(hostUrl);
              }
            }}
          >
            {t.banners.copyHostLink}
          </button>
        ) : undefined,
    });
  }
  if (orphan && me?.role === 'ADMIN' && kind === 'member' && !orphanSeen) {
    items.push({
      key: 'orphan',
      icon: <Trash2 className="h-4 w-4" aria-hidden />,
      text: t.banners.orphanNotice,
      action: (
        <button
          type="button"
          className="shrink-0 font-semibold text-amber underline-offset-2 hover:underline"
          onClick={() => {
            setOrphanSeen(true);
            try {
              sessionStorage.setItem(`orphan-notice:${code}`, '1');
            } catch {
              // Private mode: the notice simply comes back next time.
            }
          }}
        >
          {t.banners.dismiss}
        </button>
      ),
    });
  }
  if (!items.length) return null;
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {items.map((b) => (
        <div key={b.key} className="flex items-center gap-3 rounded-box border border-amber/35 bg-amber/10 px-4 py-3 text-[14px]">
          <span className="text-amber">{b.icon}</span>
          {/* min-w-0 + anywhere-wrap: long URLs must not widen the page on phones */}
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{b.text}</span>
          {b.action}
        </div>
      ))}
    </div>
  );
}
