'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import { useToast } from '@/components/ui/Toast';
import type { BlockedTrackView } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { useT } from '@/i18n';
import { formatAgo } from '@/lib/time';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/** Admin only: the videos blocked in this room, newest first, each with "Bỏ chặn". */
export function BlockedList() {
  const t = useT();
  const act = useAct();
  const toast = useToast();
  const [items, setItems] = useState<BlockedTrackView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // Blocking or unblocking anywhere (another tab, another admin) changes this: reload.
  const ids = useRoom((s) => s.snapshot?.room.blockedTrackIds.join() ?? '');

  useEffect(() => {
    let alive = true;
    void room.send('track:blocked', {}).then((r) => {
      if (!alive) return;
      setFailed(!r.ok);
      if (r.ok) setItems(r.data.items);
    });
    return () => {
      alive = false;
    };
  }, [ids]);

  if (failed) return <p className="px-1 text-sage">{t.library.loadFailed}</p>;
  if (!items)
    return (
      <p className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-amber" aria-hidden />
      </p>
    );
  if (!items.length) return <p className="px-1 text-sage">{t.block.empty}</p>;

  return (
    <ul aria-label={t.block.listLabel} className="divide-y divide-line/70 rounded-panel bg-panel px-1">
      {items.map((it) => (
        <li key={it.track.id} className="flex items-center gap-3 py-2.5 pl-2.5 pr-1">
          <Thumb url={it.track.thumbnailUrl} size={72} ratio="wide" className="opacity-60 grayscale" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[14px] font-medium leading-snug [unicode-bidi:plaintext]" title={it.track.title}>
              {it.track.title}
            </p>
            <p className="mt-0.5 text-[13px] sm:text-[12px] text-sage">{t.block.by(it.blockedByName, formatAgo(it.blockedAt))}</p>
          </div>
          <Button
            size="sm"
            disabled={busy === it.track.id}
            aria-label={t.block.unblockTrack(it.track.title)}
            onClick={async () => {
              setBusy(it.track.id);
              const ok = await act('track:unblock', { trackId: it.track.id });
              setBusy(null);
              if (ok) toast(t.block.undone(it.track.title), 'success');
            }}
          >
            {t.block.unblock}
          </Button>
        </li>
      ))}
    </ul>
  );
}
