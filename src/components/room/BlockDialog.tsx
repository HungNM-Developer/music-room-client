'use client';

import { Ban } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, SheetAction } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import type { TrackSummary } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { useRoom } from '@/state/hooks';

/**
 * Admin only: confirm blocking a video in the room. What happens right now is read from the
 * room: on air → skipped at once; waiting → taken out of the queue; else only "never again".
 */
export function BlockDialog({ track, onClose }: { track: TrackSummary; onClose: () => void }) {
  const onAir = useRoom((s) => s.snapshot?.nowPlaying?.item.track.id === track.id);
  const waiting = useRoom((s) => Boolean(s.snapshot?.queue.some((q) => q.track.id === track.id)));
  const act = useAct();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title={vi.block.title(track.title)}>
      <div className="space-y-1.5 text-sage">
        <p>
          {onAir ? `${vi.block.bodyPlaying} ` : waiting ? `${vi.block.bodyQueued} ` : ''}
          {vi.block.bodyRest}
        </p>
        <p className="text-[13px]">{vi.block.where}</p>
      </div>
      <div className="mt-5 flex gap-2">
        <Button className="flex-1" onClick={onClose}>
          {vi.block.cancel}
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          disabled={busy}
          aria-busy={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await act('track:block', { trackId: track.id });
            setBusy(false);
            onClose();
            if (ok) toast(vi.block.done(track.title), 'success');
          }}
        >
          <Ban className="h-4 w-4" aria-hidden />
          {vi.block.confirm}
        </Button>
      </div>
    </Dialog>
  );
}

/** The ⋯ menu of a song (on air, or in "Đã phát"): leads to BlockDialog. Admin only. */
export function BlockMenu({ track, onClose }: { track: TrackSummary; onClose: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return <BlockDialog track={track} onClose={onClose} />;
  return (
    <Dialog open onClose={onClose} title={track.title}>
      <div className="-mx-2 space-y-0.5">
        <SheetAction danger icon={<Ban className="h-5 w-5" />} onClick={() => setConfirm(true)}>
          {vi.block.menu}
        </SheetAction>
      </div>
    </Dialog>
  );
}
